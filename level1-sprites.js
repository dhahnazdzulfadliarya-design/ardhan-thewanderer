/* Renderer sprite dari atlas (dist/assets/level1/*.png, dibuat oleh tools/build-sprites.ps1):
   ArDhan (tangan kosong, pedang, gerakan tambahan) dan prajurit kerajaan. */
(function(A){
 const G = A.game;
 const frames = {};   // nama frame -> { img, r: [x,y,w,h,ax,ay], sheet }
 let tint = null, tctx = null;

 // Muat semua sheet yang terdaftar. Sheet opsional yang filenya belum ada dilewati tanpa error.
 G.loadSprites = async function(retry){
  const atlas = A.spriteAtlas;
  const jobs = Object.keys(atlas).filter(k => atlas[k] && atlas[k].src).map(async key => {
   let img;
   try { img = await A.loadImage(atlas[key].src, retry); }
   catch (e) { if (atlas[key].optional) return; throw e; }
   for (const name in atlas[key].frames) frames[name] = { img, r: atlas[key].frames[name], sheet: atlas[key] };
  });
  await Promise.all(jobs);
 };
 G.loadHeroSprites = G.loadSprites;
 // Frame tersedia? (memakai data atlas, sehingga juga bisa dipakai tes tanpa browser)
 G.hasFrame = name => !!frames[name] || !!(A.spriteAtlas && Object.values(A.spriteAtlas).some(s => s && s.frames && s.frames[name] && !s.optional));
 G.frameRect = name => {
  if (frames[name]) return frames[name].r;
  for (const s of Object.values(A.spriteAtlas || {})) if (s && s.frames && s.frames[name]) return s.frames[name];
  return null;
 };

 // Gambar satu frame dengan jangkar di (x, y). flip = -1 mencerminkan gambar.
 G.drawFrame = function(ctx, name, x, y, flip, scale, alpha, flash, scaleY){
  const f = frames[name]; if (!f) return false;
  const [sx, sy, w, h, ax, ay] = f.r;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(flip * scale, scale * (scaleY || 1));
  if (flash > 0) {
   // Kilatan putih saat terkena: salin frame ke kanvas kecil lalu warnai.
   if (!tint) { tint = document.createElement('canvas'); tctx = tint.getContext('2d'); }
   if (tint.width < w || tint.height < h) { tint.width = Math.max(tint.width, w); tint.height = Math.max(tint.height, h); }
   tctx.clearRect(0, 0, w, h); tctx.globalCompositeOperation = 'source-over'; tctx.drawImage(f.img, sx, sy, w, h, 0, 0, w, h);
   tctx.globalCompositeOperation = 'source-atop'; tctx.fillStyle = 'rgba(255,248,235,' + Math.min(0.6, flash * 0.6) + ')'; tctx.fillRect(0, 0, w, h);
   ctx.drawImage(tint, 0, 0, w, h, -ax, -ay, w, h);
  } else ctx.drawImage(f.img, sx, sy, w, h, -ax, -ay, w, h);
  ctx.restore();
  return true;
 };

 // Posisi & frame elang pada waktu tertentu (null = sedang tidak melintas). Fungsi murni agar bisa diuji.
 G.eagleState = function(time){
  const c = G.cfg.eagle, t = time % c.period;
  if (t > c.cross) return null;
  const loop = c.flapTime + c.glideTime, p = t % loop, flapping = p < c.flapTime;
  let frame, bob = 0;
  if (flapping) {
   const i = Math.floor(p * c.flapFps);
   frame = c.frames[i % c.frames.length];
   bob = -Math.sin(p * c.flapFps / c.frames.length * Math.PI * 2) * 3;   // badan sedikit terangkat saat sayap mengayun turun
  } else {
   frame = c.glideFrame;
   bob = (p - c.flapTime) / c.glideTime * c.glideSink;                   // melayang sambil turun pelan
  }
  return { x: c.startX + t * c.speed, y: c.y + Math.sin(t * 0.9) * c.sway + bob, frame, flip: -1, scale: c.scale, flapping };
 };

 G.drawShadow = function(ctx, x, y, w, z){
  const k = Math.max(0.35, 1 - z / 260);
  ctx.save(); ctx.globalAlpha = 0.32 * k; ctx.fillStyle = '#1d1608';
  ctx.beginPath(); ctx.ellipse(x, y + 2, w * k, 11 * k, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
 };

 G.drawHero = function(ctx, p, camX, time){
  const v = G.cfg.view, scale = v.heroHeight / A.spriteAtlas.standHeight;
  const x = Math.round(p.x - camX), y = v.ground - p.z;
  G.drawShadow(ctx, x, v.ground, p.state === 'down' || p.state === 'dead' ? 95 : 58, p.z);
  const name = p.frameName();
  // Bayangan sisa saat dodge/dash.
  for (const g of p.ghosts) G.drawFrame(ctx, name, g.x - camX, v.ground - g.z, p.facing, scale, g.life * 1.6, 0);
  // Napas halus saat diam (frame tunggal dibuat hidup tanpa mengubah desain).
  const breathe = p.state === 'idle' || p.state === 'block' ? 1 + Math.sin(time * 3.1) * 0.009 : 1;
  // Berkedip saat kebal setelah bangun.
  const blink = p.invuln > 0 && Math.floor(time * 18) % 2 === 0 ? 0.45 : 1;
  G.drawFrame(ctx, name, x, y, p.facing, scale, blink, p.flash > 0 ? p.flash / G.cfg.feel.flash : 0, breathe);
 };
})(ARDHAN);
