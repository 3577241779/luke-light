/* test_dual.mjs — 双装/重复加载的让位（V0.79）
 *
 * 要证明的事：
 *   1) 复用别人已装好的 fetch 钩子时，hooked 也置真 —— 否则横幅会误报「钩子未挂上」
 *   2) 同页已有活实例时，第二个实例在 boot 阶段直接让位（不挂界面/钩子/魔法棒）
 *   3) 让位判据是「租约 + 心跳 + 30 秒窗口」，不是无条件的；对方退场后能接管
 *   4) dispose 只释放自己的租约，不会误伤另一个实例
 *
 * 跑法：node test_dual.mjs [bundle.js]
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TARGET = process.argv[2] || path.join(HERE, 'antiroute-v8-desktop.js');
const SRC = fs.readFileSync(TARGET, 'utf8');
const NET = fs.readFileSync(path.join(HERE, '_src', '3_net.js'), 'utf8');
const UI = fs.readFileSync(path.join(HERE, '_src', '4_ui.js'), 'utf8');

let pass = 0, fail = 0;
function ok(name, cond, expect, actual) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + '\n         期望：' + String(expect == null ? '' : expect) + '\n         实际：' + String(actual == null ? '' : actual)); }
}
function group(t) { console.log('\n' + t); }

/* ---------------- 一、源码结构 ---------------- */
group('一、复用钩子时也要算「挂上了」');
const REUSE = /if \(HOST\.fetch\.__ar6 && !HOST\.fetch\.__ar6dead\) \{ exposedFetch = HOST\.fetch; hooked = true; return true; \}/;
ok('★ 复用分支置 hooked = true', REUSE.test(NET), '命中', (NET.match(/HOST\.fetch\.__ar6 && !HOST\.fetch\.__ar6dead[^}]*\}/) || ['无'])[0]);
ok('★ 同一层已暴露时也置 hooked', /if \(HOST\.fetch === exposedFetch\) \{ hooked = true; return true; \}/.test(NET), '命中', '未命中');
ok('构建产物里同样存在', REUSE.test(SRC), '命中', '未命中');
ok('★ 没有「无条件把别人标死」的写法', !/__AR6__\.__dead = true/.test(UI), '不应出现', '仍存在');
ok('dispose 只释放自己的租约', /HOST\.__AR6HOLD\.token === BOOT_TOKEN\) HOST\.__AR6HOLD\.alive = false/.test(UI), '有', '无');

/* ---------------- 二、假宿主 ---------------- */
function makeEl(tag) {
  const el = {
    tagName: String(tag || 'div').toUpperCase(), id: '', className: '', textContent: '',
    style: {}, children: [], parentNode: null, attrs: {},
    appendChild(c) { if (c) { c.parentNode = el; el.children.push(c); } return c; },
    removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); return c; },
    insertBefore(c) { if (c) { c.parentNode = el; el.children.unshift(c); } return c; },
    setAttribute(k, v) { el.attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(el.attrs, k) ? el.attrs[k] : null; },
    removeAttribute(k) { delete el.attrs[k]; },
    addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }; },
    focus() {}, blur() {}, click() {}, closest() { return null; }, contains() { return false; },
    getContext() { return null; }
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return ''; },
    set(v) { el.children.length = 0; el.textContent = String(v == null ? '' : v); }
  });
  Object.defineProperty(el, 'firstChild', { get() { return el.children.length ? el.children[0] : null; } });
  Object.defineProperty(el, 'childNodes', { get() { return el.children; } });
  return el;
}

function makeWin(logs) {
  const store = {};
  const win = {
    console: {
      log() {}, warn() {}, error() {},
      info(m) { logs.push(String(m)); }
    },
    setTimeout(f) { try { if (typeof f === 'function') f(); } catch (e) {} return 1; },
    clearTimeout() {}, setInterval() { return 1; }, clearInterval() {},
    requestAnimationFrame(f) { try { if (typeof f === 'function') f(); } catch (e) {} return 1; },
    cancelAnimationFrame() {},
    innerWidth: 504, innerHeight: 805, devicePixelRatio: 2,
    visualViewport: { width: 504, height: 805, addEventListener() {}, removeEventListener() {} },
    addEventListener() {}, removeEventListener() {},
    matchMedia() { return { matches: false, addListener() {}, removeListener() {} }; },
    getComputedStyle() { return { height: '0px', maxHeight: '0px', overflow: 'hidden', flexBasis: '0px' }; },
    localStorage: {
      getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem(k, v) { store[k] = String(v); },
      removeItem(k) { delete store[k]; }, key() { return null; }, length: 0
    },
    btoa: globalThis.btoa, atob: globalThis.atob,
    location: { href: 'http://127.0.0.1/' },
    navigator: { userAgent: 'node' },
    fetch() { return Promise.reject(new Error('no-net')); },
    MutationObserver: class { observe() {} disconnect() {} },
    ResizeObserver: class { observe() {} disconnect() {} },
    SillyTavern: {
      getContext() { return { chat: [], chatId: 'c1', name1: '阿明', characters: [], this_chid: undefined, loadWorldInfo() { return { entries: {} }; } }; },
      libs: {}, getRequestHeaders() { return {}; },
      eventSource: { on() {}, removeListener() {} }, event_types: {}, extensionSettings: {}
    }
  };
  win.document = {
    body: makeEl('body'), documentElement: makeEl('html'), head: makeEl('head'), title: '',
    createElement(t) { return makeEl(t); },
    createTextNode(t) { return { nodeValue: String(t) }; },
    getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {}
  };
  win.window = win; win.self = win; win.globalThis = win; win.top = win; win.parent = win;
  vm.createContext(win);
  return win;
}

/* ---------------- 三、真启动两次 ---------------- */
group('二、真启动：第二个实例让位');
const logs = [];
const win = makeWin(logs);
let firstErr = null;
try { vm.runInContext(SRC, win, { filename: 'antiroute-1.js' }); } catch (e) { firstErr = e; }
ok('第一次启动无异常', firstErr === null, '无异常', firstErr && firstErr.message);
const hold1 = win.__AR6HOLD;
ok('★ 启动后写下租约', !!hold1 && typeof hold1.token === 'string', '有 token', JSON.stringify(hold1));
ok('★ 租约为活', !!hold1 && hold1.alive === true, 'alive=true', hold1 && String(hold1.alive));

const token1 = hold1 && hold1.token;
let secondErr = null;
try { vm.runInContext(SRC, win, { filename: 'antiroute-2.js' }); } catch (e) { secondErr = e; }
ok('第二次启动无异常', secondErr === null, '无异常', secondErr && secondErr.message);
ok('★ 第二个实例让位（有日志）', logs.some(m => m.indexOf('已有实例在运行') >= 0), '有让位日志', JSON.stringify(logs));
ok('★ 租约没被第二个实例抢走', win.__AR6HOLD && win.__AR6HOLD.token === token1, token1, win.__AR6HOLD && win.__AR6HOLD.token);

group('三、对方退场后能接管');
win.__AR6HOLD.alive = false;
logs.length = 0;
let thirdErr = null;
try { vm.runInContext(SRC, win, { filename: 'antiroute-3.js' }); } catch (e) { thirdErr = e; }
ok('第三次启动无异常', thirdErr === null, '无异常', thirdErr && thirdErr.message);
ok('★ 旧实例已退场 → 新实例接管', win.__AR6HOLD && win.__AR6HOLD.token !== token1, 'token 变了', win.__AR6HOLD && win.__AR6HOLD.token);
ok('接管时不再打印让位日志', !logs.some(m => m.indexOf('已有实例在运行') >= 0), '无让位日志', JSON.stringify(logs));

group('四、心跳窗口：超过 30 秒视为对方已死');
const win2 = makeWin([]);
vm.runInContext(SRC, win2, { filename: 'antiroute-4.js' });
const t2 = win2.__AR6HOLD.token;
win2.__AR6HOLD.at = Date.now() - 31000;
try { vm.runInContext(SRC, win2, { filename: 'antiroute-5.js' }); } catch (e) {}
ok('★ 心跳过期 → 允许接管', win2.__AR6HOLD && win2.__AR6HOLD.token !== t2, 'token 变了', win2.__AR6HOLD && win2.__AR6HOLD.token);

console.log('\n合计：' + pass + ' 通过 / ' + fail + ' 失败');
process.exit(fail ? 1 : 0);
