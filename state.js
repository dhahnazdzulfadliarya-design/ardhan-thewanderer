window.ARDHAN = window.ARDHAN || {};
(function(A){
 const KEY='ardhan-wanderer-v1';
 const defaults={language:'en',music:65,effects:75,panel:1,started:false,completed:false,level1Completed:false,level1Best:0};
 let data={},storageAvailable=true;
 try { data=JSON.parse(localStorage.getItem(KEY)||'{}')||{}; } catch {storageAvailable=false;}
 const volume=(v,f)=>Number.isFinite(v)?Math.min(100,Math.max(0,v)):f;
 const state={...defaults,language:['en','id','ar'].includes(data.language)?data.language:'en',music:volume(data.music,65),effects:volume(data.effects,75),panel:Number.isInteger(data.panel)?Math.min(36,Math.max(1,data.panel)):1,started:data.started===true,completed:data.completed===true,level1Completed:data.level1Completed===true,level1Best:Number.isFinite(data.level1Best)&&data.level1Best>0&&data.level1Best<36000?data.level1Best:0};
 A.state=state;A.storageAvailable=()=>storageAvailable;
 A.save=function(patch={}){Object.assign(state,patch);try{localStorage.setItem(KEY,JSON.stringify(state));storageAvailable=true;}catch{storageAvailable=false;}};
 // Level 1 terbuka setelah cerita selesai dibaca (tombol Selesai pada panel 36).
 A.levelOneUnlocked=()=>state.completed===true;
})(ARDHAN);
