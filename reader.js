window.ARDHAN = window.ARDHAN || {};
(function(A){
 const R=A.reader={zoom:1,ready:new Set(),failed:new Set(),token:0};
 const pi=()=>Math.floor((A.state.panel-1)/4);
 const pos=b=>`left:${b[0]}px;top:${b[1]}px;width:${b[2]}px;height:${b[3]}px;`;
 let fitFrame;

 function overlay(id){
  const meta=A.panelMeta[id-1],data=A.story[A.state.language][id-1];
  const textBox=(box,text,type,speaker)=>`<div class="comic-text ${type}" style="${pos(box)}" dir="${A.direction()}"${speaker?` role="group" aria-label="${A.escape(A.t(speaker))}"`:''}><span class="overlay-copy">${A.rich(text)}</span></div>`;
  return `<section class="comic-panel" aria-label="${A.t('panel')} ${id}" data-panel="${id}">${textBox(meta.caption,data.narration,'caption')}${data.dialogue.map((d,i)=>textBox(meta.bubbles[i],d.text,'speech',d.speaker)).join('')}</section>`;
 }

 function art(){
  const page=A.pages[pi()],error=R.failed.has(pi());
  return `<div class="art-stage" tabindex="0" role="region" aria-label="${A.t('art')} · ${A.t('page')} ${pi()+1}"><div class="art-canvas"><div class="comic-viewport"><div class="comic-sheet" style="width:${page.w}px;height:${page.h}px"><img class="comic-image" src="${page.src}" alt="${A.t('art')} · ${A.t('page')} ${pi()+1}/9" draggable="false">${page.crops.map((_,i)=>overlay(pi()*4+i+1)).join('')}</div></div></div>${!R.ready.has(pi())?`<div class="art-status" role="status"><p>${A.t(error?'loadError':'loadingComic')}</p>${error?A.btn(A.t('retry'),'retry-comic','button'):A.icon('compass','loading-seal')}</div>`:''}</div>`;
 }

 R.render=function(){
  const current=pi()+1,last=current===A.pages.length;
  return `<section class="screen reader-screen"><header class="reader-toolbar"><div class="reader-heading" dir="${A.direction()}"><span class="eyebrow" dir="ltr">ArDhan The Wanderer</span><h1>${A.t('chapter')}</h1></div><div class="reader-tools">${A.btn(A.t('settings'),'settings','text-button reader-settings')}</div></header><div class="reader-content">${art()}</div><div class="reader-bottom"><div class="reader-navigation" dir="ltr">${A.btn(A.t('levelBack'),'levels','text-button exit-reader')}<div class="zoom-controls" role="group" aria-label="${A.t('zoom')}">${A.btn('−','zoom-out','zoom-button',`aria-label="${A.t('zoomOut')}" title="${A.t('zoomOut')}"${R.zoom===1?' disabled':''}`)}${A.btn(Math.round(R.zoom*100)+'%','zoom-reset','zoom-reset',`aria-label="${A.t('zoomReset')}" title="${A.t('zoomReset')}"`)}${A.btn('+','zoom-in','zoom-button',`aria-label="${A.t('zoomIn')}" title="${A.t('zoomIn')}"${R.zoom===4?' disabled':''}`)}</div><div class="page-controls">${A.btn(A.t('previous'),'previous','button button-secondary',current===1?'disabled':'')}<span class="page-counter"><span dir="${A.direction()}">${A.t('page')}</span><strong>${current}<span> / ${A.pages.length}</span></strong></span>${A.btn(A.t(last?'finish':'next'),last?'finish':'next','button button-primary',!R.ready.has(pi())?'disabled':'')}</div><span class="save-status" dir="${A.direction()}">${A.t(A.storageAvailable()?'saved':'storageError')}</span></div></div></section>`;
 };

 R.ensure=async function(retry=false){const p=pi(),token=++R.token;if(R.ready.has(p)&&!retry){R.fit();return;}if(retry){R.failed.delete(p);R.ready.delete(p);A.render();}try{await A.loadImage(A.pages[p].src,retry);R.ready.add(p);R.failed.delete(p);}catch{R.failed.add(p);}if(A.route==='reader'&&token===R.token)A.render();};
 R.go=function(delta){const next=(pi()+delta)*4+1;if(next<1||next>A.panelMeta.length)return;A.save({panel:next,started:true});A.render();R.ensure();};

 // Fit in source-image pixels, then scale the artwork and its text together.
 // No truncation, replacement links, or separate transcript is used.
 R.fit=function(){
  cancelAnimationFrame(fitFrame);
  fitFrame=requestAnimationFrame(()=>{
   const stage=document.querySelector('.art-stage'),sheet=document.querySelector('.comic-sheet');
   if(!stage||!sheet||!stage.clientWidth||!stage.clientHeight)return;
   sheet.querySelectorAll('.comic-text').forEach(el=>{
    if(el.dataset.fitted===A.state.language)return;
    const copy=el.querySelector('.overlay-copy');
    let low=1,high=el.classList.contains('speech')?24:26;
    while(high-low>.1){
     const size=(low+high)/2;el.style.fontSize=size+'px';
     if(copy.scrollHeight<=el.clientHeight&&copy.scrollWidth<=el.clientWidth)low=size;else high=size;
    }
    el.style.fontSize=(Math.floor(low*10)/10)+'px';
    el.dataset.fitted=A.state.language;
   });
   R.layout();
  });
 };

 R.layout=function(){
  const stage=document.querySelector('.art-stage'),sheet=document.querySelector('.comic-sheet'),viewport=document.querySelector('.comic-viewport');
  if(!stage||!sheet||!viewport)return;
  const page=A.pages[pi()];
  // offsetWidth avoids a zoom/scrollbar feedback loop on small viewports.
  const scale=Math.min(stage.offsetWidth/page.w,stage.offsetHeight/page.h)*R.zoom;
  viewport.style.width=page.w*scale+'px';viewport.style.height=page.h*scale+'px';
  sheet.style.transform=`scale(${scale})`;
  sheet.classList.add('fitted');
 };

 R.setZoom=function(value){
  if(!Number.isFinite(value))return;
  const stage=document.querySelector('.art-stage'),before=document.querySelector('.comic-viewport')?.getBoundingClientRect(),bounds=stage?.getBoundingClientRect();
  const anchor=before&&bounds?[(bounds.left+stage.clientWidth/2-before.left)/before.width,(bounds.top+stage.clientHeight/2-before.top)/before.height]:null;
  R.zoom=Math.min(4,Math.max(1,value));R.layout();
  if(anchor){const after=document.querySelector('.comic-viewport').getBoundingClientRect();stage.scrollLeft+=after.left+anchor[0]*after.width-bounds.left-stage.clientWidth/2;stage.scrollTop+=after.top+anchor[1]*after.height-bounds.top-stage.clientHeight/2;}
  const reset=document.querySelector('[data-action="zoom-reset"]');if(reset)reset.textContent=Math.round(R.zoom*100)+'%';
  const out=document.querySelector('[data-action="zoom-out"]'),into=document.querySelector('[data-action="zoom-in"]');
  if(out)out.disabled=R.zoom===1;if(into)into.disabled=R.zoom===4;
 };
 R.refit=function(){document.querySelectorAll('.comic-text').forEach(el=>delete el.dataset.fitted);R.fit();};
})(ARDHAN);
