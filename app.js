(function(A){
 const app=document.querySelector('#app'),rotate=document.querySelector('#rotate-screen');
 A.route='language';A.returnTo='menu';A.menuReady=false;A.loadingFailed=false;
 let loading=false;
 A.render=function(){
  // Sesi Level 1 tidak dirender ulang selama dimainkan; dilepas saat pindah layar.
  const session=A.game&&A.game.session;
  if(session&&session.active){if(A.route==='level1')return;session.unmount();}
  document.documentElement.lang=A.state.language;
  document.documentElement.dataset.language=A.state.language;
  app.innerHTML=A.route==='reader'?A.reader.render():A.screens[A.route]();
  A.orientation();
  if(A.route==='reader')A.reader.fit();
  if(A.route==='level1'&&session)session.mount(app.querySelector('.game-screen'));
 };
 A.orientation=function(){const portrait=matchMedia('(orientation: portrait)').matches;app.inert=portrait;app.setAttribute('aria-hidden',String(portrait));rotate.hidden=!portrait;A.game?.session?.onOrientation(portrait);if(portrait)rotate.innerHTML=`<div class="rotate-content" dir="${A.direction()}">${A.icon('rotate','rotate-icon')}<h2>${A.t('rotate')}</h2><p>${A.t('rotateDetail')}</p><span class="rotate-brand" dir="ltr">ArDhan The Wanderer</span></div>`;};
 A.navigate=function(route){if(!A.screens[route]&&route!=='reader')return;if(route==='settings'||route==='credits')A.returnTo=A.route==='reader'?'reader':'menu';A.route=route;A.render();if(route==='reader')A.reader.ensure();else app.querySelector('h1,h2')?.setAttribute('tabindex','-1');};
 async function enterMenu(retry=false){if(loading)return;loading=true;A.loadingFailed=false;A.route='loading';A.render();try{await A.loadMenu(retry);A.menuReady=true;A.navigate('menu');A.preloadComics();}catch{A.loadingFailed=true;A.render();}finally{loading=false;}}
 function changeLanguage(language){if(!A.languages.some(l=>l.code===language))return;A.save({language});A.render();if(A.route==='reader')A.reader.ensure();}
 app.addEventListener('change',event=>{if(event.target.name==='language'||event.target.name==='settings-language'){const settings=event.target.name==='settings-language';changeLanguage(event.target.value);if(settings)document.querySelector('#settings-language')?.focus();}});
 app.addEventListener('input',event=>{const key=event.target.name;if(key==='music'||key==='effects'){const value=Number(event.target.value);A.save({[key]:value});document.getElementById(key+'-value').textContent=value+'%';event.target.setAttribute('aria-valuetext',value+' '+A.t('audioUnit'));}});
 app.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
  const action=button.dataset.action;
  if(['levels','menu','settings','credits'].includes(action)){A.navigate(action);return;}
  switch(action){
   case 'continue':A.save();enterMenu();break;
   case 'retry-menu':enterMenu(true);break;
   case 'back':A.navigate(A.returnTo);break;
   case 'play-level1':if(A.levelOneUnlocked()&&A.screens.level1)A.navigate('level1');break;
   case 'open-story':if(A.state.completed&&A.state.panel===36)A.save({panel:1});A.save({started:true});A.navigate('reader');break;
   case 'previous':A.reader.go(-1);break;
   case 'next':A.reader.go(1);break;
   case 'zoom-in':A.reader.setZoom(A.reader.zoom+.5);break;
   case 'zoom-out':A.reader.setZoom(A.reader.zoom-.5);break;
   case 'zoom-reset':A.reader.setZoom(1);break;
   case 'retry-comic':A.reader.ensure(true);break;
   case 'finish':{
    const last=Math.floor((A.state.panel-1)/4)===A.pages.length-1;
    // Tombol "Mulai bertarung" di halaman terakhir: tandai cerita selesai (membuka Level 1) lalu langsung masuk Level 1.
    if(A.route==='reader'&&last&&A.reader.ready.has(8)){A.save({panel:36,completed:true});A.navigate(A.screens.level1?'level1':'levels');document.querySelector('#announcer').textContent=A.t('storyFinished');}break;
   }
  }
 });
 document.addEventListener('keydown',event=>{if(A.route!=='reader'||app.inert||event.altKey||event.ctrlKey||event.metaKey||event.target.matches('select,input,textarea'))return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();A.reader.go(event.key==='ArrowRight'?1:-1);}});
 let resizeFrame;window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{A.orientation();if(A.route==='reader')A.reader.fit();});});
 document.fonts?.ready.then(()=>{if(A.route==='reader')A.reader.refit();});
 document.fonts?.addEventListener('loadingdone',()=>{if(A.route==='reader')A.reader.refit();});
 A.render();
})(ARDHAN);
