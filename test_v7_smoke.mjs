import fs from 'node:fs'; import vm from 'node:vm';
const D = fs.readFileSync('antiroute-v8-desktop.js','utf8');
const errors=[];
function el(){return{style:{},dataset:{},className:'',innerHTML:'',textContent:'',firstChild:null,children:[],parentNode:null,id:'',
 setAttribute(k,v){this['_'+k]=v;},getAttribute(k){return this['_'+k]||null;},
 appendChild(c){c.parentNode=this;this.children.push(c);if(!this.firstChild)this.firstChild=c;return c;},
 removeChild(c){const i=this.children.indexOf(c);if(i>=0)this.children.splice(i,1);if(this.firstChild===c)this.firstChild=this.children[0]||null;return c;},
 remove(){if(this.parentNode)this.parentNode.removeChild(this);},
 addEventListener(){},removeEventListener(){},setPointerCapture(){},querySelector(){return null;},querySelectorAll(){return[];},
 getBoundingClientRect(){return{width:400,height:300,top:10,left:10,right:410,bottom:310};},
 classList:{add(){},remove(){},toggle(){},contains(){return false;}}};}
const body=el(),head=el();
const doc={readyState:'complete',documentElement:{},body,head,createElement:()=>el(),getElementById:()=>null,
 querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},removeEventListener(){}};
const store={};
const g={console:{log(){},warn(...a){errors.push('warn:'+a.join(' '))},error(...a){errors.push('error:'+a.join(' '))}},
 setTimeout:(f)=>setTimeout(f,0),clearTimeout:(i)=>clearTimeout(i),setInterval:()=>1,clearInterval:()=>{},
 localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}},
 navigator:{userAgent:'Mozilla/5.0'},innerWidth:390,innerHeight:844,
 SillyTavern:{getContext:()=>({chat:[],name1:'U',characters:[]})},
 fetch:async()=>({ok:true,status:200,headers:{get:()=>null},clone(){return this}}),addEventListener(){},removeEventListener(){}};
g.window=g; g.document=doc; g.URL=URL; vm.createContext(g);
g.addEventListener('error',()=>{});
try { vm.runInContext(D,g); } catch(e){ errors.push('boot-throw:'+e.message); }
const api=g.__AR6__;
try { api.setMinimized(true); } catch(e){ errors.push('min-throw:'+e.message); }
try { api.setCfg('floatMode','hidden'); api.setMinimized(true); } catch(e){ errors.push('hidden-throw:'+e.message); }
try { api.setCfg('floatMode','dock'); api.setMinimized(false); } catch(e){ errors.push('expand-throw:'+e.message); }
try { api.render(); } catch(e){ errors.push('render-throw:'+e.message); }
console.log('errors='+errors.length); errors.slice(0,5).forEach(e=>console.log(' ',e));
console.log('api='+!!api+' version='+(api&&api.VERSION));

// 渲染内容检查
try {
  api.setMinimized(false); api.render();
  const rootEl = doc.body.children[doc.body.children.length-1];
  const html = rootEl && rootEl.innerHTML || '';
  const has = (s)=>html.indexOf(s)>=0;
  console.log('panel-html-len='+html.length,
    '路由率='+has('路由率'), '验渠道='+has('🔭 验渠道'), '扫别名='+has('🏷 扫别名'),
    '档位检查='+has('🧠 档位检查'), '瘦身='+has('🪶 瘦身报告'), '悬浮设置='+has('悬浮球'));
} catch(e){ console.log('check-throw:'+e.message); }

// 破甲区渲染
try {
  const htmlNow = () => { const r = doc.body.children[doc.body.children.length-1]; return (r && r.innerHTML) || ''; };
  api.setCfg('jail','off'); api.render();
  let h = htmlNow();
  console.log('破甲关='+(h.indexOf('🩹 破甲:关')>=0), '子项隐藏='+(h.indexOf('保底token')<0));
  api.setCfg('jail','strong'); api.render();
  h = htmlNow();
  console.log('破甲强力='+(h.indexOf('🩹 破甲:强力')>=0), '保底token='+(h.indexOf('保底token')>=0),
    '解安全='+(h.indexOf('解安全')>=0), '预审框='+(h.indexOf('预审框')>=0), '就绪='+(h.indexOf('就绪')>=0));
  api.setCfg('observe', false); api.render();
  h = htmlNow();
  console.log('失效提示='+(h.indexOf('补救不会触发')>=0));
  api.setCfg('observe', true); api.setCfg('jail','off'); api.render();
} catch(e){ console.log('jail-check-throw:'+e.message); }
