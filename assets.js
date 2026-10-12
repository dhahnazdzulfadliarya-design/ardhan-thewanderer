window.ARDHAN = window.ARDHAN || {};
(function(A){
 const assets=new Map();
 A.loadImage=function(src,retry=false){
  if(retry)assets.delete(src);
  if(assets.has(src))return assets.get(src);
  const promise=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>{assets.delete(src);reject(new Error('Artwork unavailable'));};image.src=src;});
  assets.set(src,promise);return promise;
 };
 let preloadRunning=false;
 A.preloadComics=async function(){if(preloadRunning)return;preloadRunning=true;for(const page of A.pages){try{await A.loadImage(page.src);}catch{/* Retry is offered on the affected page. */}}preloadRunning=false;};
 A.loadMenu=async function(retry=false){
  const jobs=[A.loadImage('menu-clean.png',retry)];
  if(document.fonts){jobs.push(document.fonts.load('16px "Noto Serif"'));jobs.push(document.fonts.load('18px "Noto Arabic"'));}
  await Promise.all(jobs);
 };
})(ARDHAN);
