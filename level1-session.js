/* Sesi Level 1: memasang layar, memuat aset, loop 60 Hz tetap, render kanvas (letterbox 16:9, tajam di retina),
   jeda (tombol, panduan, portrait, tab tersembunyi), dan menyimpan hasil. Dipanggil dari app.js. */
(function(A){
 const G = A.game;
 const STEP = 1 / 60;
 const S = G.session = { active: false };

 S.mount = function(root){
  if (S.active) S.unmount();
  S.active = true; S.root = root; S.pauses = new Set(); S.acc = 0; S.last = 0; S.time = 0; S.ready = false;
  S.input = new G.Input(root.dataset.input);
  S.input.onMode = mode => { root.dataset.input = mode; if (S.ui.panel === 'guide') S.ui.showGuide(); };
  S.input.onUI = action => S.command(action === 'close' ? 'escape' : action);
  S.input.attach(root);
  S.ui = new G.UI(S, root);
  S.canvas = root.querySelector('.game-canvas'); S.ctx = S.canvas.getContext('2d', { alpha: false });
  S.stage = root.querySelector('.game-stage');
  S.onResize = () => S.resize(); window.addEventListener('resize', S.onResize);
  S.onVisibility = () => { if (document.hidden) S.pause('hidden'); };
  document.addEventListener('visibilitychange', S.onVisibility);
  S.resize();
  S.load(false);
 };

 S.load = async function(retry){
  S.ui.setLoading('loading');
  try {
   const [menu] = await Promise.all([A.loadImage('menu-clean.png', retry), G.loadSprites(retry), G.loadBackground(retry)]);
   if (!S.active) return;
   G.buildWorldArt(menu);
   G.prepareBackground(S.scale);
   S.ui.setLoading('done');
   S.newGame();
   S.ready = true;
   S.onOrientation(window.matchMedia && matchMedia('(orientation: portrait)').matches);
   S.frame = requestAnimationFrame(S.loop);
  } catch (e) { console.error('Level 1 gagal dimuat:', e); if (S.active) S.ui.setLoading('error'); }
 };

 S.newGame = function(){
  ['toast', 'wave', 'intro', 'clear', 'boss', 'combo', 'hurt', 'victory', 'complete', 'gameover', 'weapon', 'move'].forEach(G.off);
  S.ui.reset();                     // HUD bersih + daftar ulang pendengar
  S.world = new G.World(S.input);
  G.on('complete', stats => S.finish(true, stats));
  G.on('gameover', stats => S.finish(false, stats));
  S.pauses.clear(); S.input.releaseAll();
  S.world.start();
 };

 S.finish = function(win, stats){
  if (win) {
   const best = A.state.level1Best ? Math.min(A.state.level1Best, stats.time) : stats.time;
   A.save({ level1Completed: true, level1Best: Math.round(best * 10) / 10 });
  }
  S.pause('end'); S.ui.showEnd(win, stats);
 };

 // ---------- Jeda ----------
 S.paused = () => S.pauses.size > 0;
 S.pause = function(reason){
  S.input.releaseAll();
  // Jeda pengguna / tab tersembunyi: tampilkan menu jeda, kecuali panel lain (panduan, hasil akhir) sedang terbuka.
  if (reason === 'user' || reason === 'hidden') { if (S.ui.panel) return; S.pauses.add('user'); S.ui.showPause(); return; }
  S.pauses.add(reason);
 };
 S.resume = function(reason){ S.pauses.delete(reason); };
 S.onOrientation = function(portrait){ if (!S.active) return; if (portrait) S.pause('portrait'); else { S.resume('portrait'); S.resize(); } };

 // Perintah dari tombol UI atau keyboard (H, P, Esc).
 S.command = function(cmd){
  const panel = S.ui.panel;
  if (!S.ready && cmd !== 'retry-load' && cmd !== 'quit') return;
  switch (cmd) {
   case 'guide':
    if (panel === 'guide') { S.command('close-guide'); break; }
    if (panel === 'complete' || panel === 'gameover') break;
    S.guideReturn = panel; S.pauses.add('guide'); S.input.releaseAll(); S.ui.showGuide(); break;
   case 'close-guide':
    S.pauses.delete('guide'); S.input.queue = []; S.ui.closePanel();
    if (S.guideReturn === 'pause') S.ui.showPause();
    S.guideReturn = null; break;
   case 'pause':
    if (panel === 'pause') S.command('resume'); else if (!panel) S.pause('user'); break;
   case 'escape':
    if (panel === 'guide') S.command('close-guide'); else if (panel === 'pause') S.command('resume'); break;
   case 'resume': S.input.queue = []; S.pauses.delete('user'); S.pauses.delete('hidden'); S.ui.closePanel(); break;
   case 'restart': S.newGame(); break;
   case 'quit': A.navigate('levels'); break;
   case 'retry-load': S.load(true); break;
  }
 };

 // ---------- Ukuran kanvas: rasio 16:9 tetap, letterbox, tajam di layar retina ----------
 S.resize = function(){
  const v = G.cfg.view, r = S.root.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const scale = Math.min(r.width / v.width, r.height / v.height);
  const cw = Math.floor(v.width * scale), ch = Math.floor(v.height * scale);
  S.stage.style.width = cw + 'px'; S.stage.style.height = ch + 'px';
  S.root.style.setProperty('--stage-w', cw + 'px'); S.root.style.setProperty('--stage-h', ch + 'px');
  const dpr = Math.min(v.maxDpr, window.devicePixelRatio || 1);
  S.canvas.width = Math.round(cw * dpr); S.canvas.height = Math.round(ch * dpr);
  S.canvas.style.width = cw + 'px'; S.canvas.style.height = ch + 'px';
  S.scale = S.canvas.width / v.width;
  if (S.ready && G.hasPanorama()) G.prepareBackground(S.scale);
 };

 // ---------- Loop ----------
 S.loop = function(now){
  if (!S.active) return;
  S.frame = requestAnimationFrame(S.loop);
  const dt = S.last ? Math.min(0.1, (now - S.last) / 1000) : STEP; S.last = now;
  if (!S.paused()) {
   S.time += dt; S.input.now += dt; S.acc += dt;
   let steps = 0;
   while (S.acc >= STEP && steps < 5) { S.world.update(STEP); S.acc -= STEP; steps++; }
   if (steps === 5) S.acc = 0;
  }
  S.render();
  S.ui.update(S.world);
 };

 S.render = function(){
  const c = S.ctx, w = S.world, v = G.cfg.view, t = S.time, Z = v.zoom;
  // Transformasi layar dasar. Alat bantu pengembang: ARDHAN.game.session.debugView = {x, y, k}
  // memperbesar titik (x, y) layar logis.
  let a = S.scale, e = 0, f = 0;
  const d = S.debugView;
  if (d) { a = S.scale * d.k; e = S.canvas.width / 2 - d.x * a; f = S.canvas.height / 2 - d.y * a; }
  const sh = w.shakeAmt, ox = sh ? (Math.random() - 0.5) * sh * 2 : 0, oy = sh ? (Math.random() - 0.5) * sh * 2 : 0;
  const screen = () => c.setTransform(a, 0, 0, a, e + ox * a, f + oy * a);
  screen();
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  // Kamera: posisi dunia dibulatkan ke piksel layar agar latar dan karakter tidak bergetar.
  const camS = Math.round(w.cam.x * Z), camX = camS / Z, gScreen = G.groundScreen();
  G.drawBackground(c, camS, t);
  // Dunia digambar dalam satuan karakter lalu diperkecil (kamera menjauh); garis tanah dunia jatuh tepat di jalan latar.
  c.setTransform(a * Z, 0, 0, a * Z, e + ox * a, f + oy * a + a * (gScreen - Z * v.ground));
  for (const k of w.pickups) G.drawPickup(c, k, camX, t);
  const down = w.enemies.filter(e => e.state === 'down' || e.state === 'dead'), up = w.enemies.filter(e => !down.includes(e));
  for (const e of down) G.drawSoldier(c, e, camX, t);
  // Musuh yang sedang menyerang digambar di atas agar telegraf terlihat.
  up.sort((a, b) => (a.state === 'active' || a.state === 'windup') - (b.state === 'active' || b.state === 'windup'));
  for (const e of up) G.drawSoldier(c, e, camX, t);
  G.drawHero(c, w.player, camX, t);
  drawTrail(c, w.player, camX);
  drawParticles(c, w.particles, camX);
  screen();
  G.drawForeground(c, camS, t);
  // Tepi merah saat HP rendah.
  const p = w.player;
  if (p.hp > 0 && p.hp / p.maxHp < 0.3) {
   const a = 0.18 + Math.sin(t * 6) * 0.08, g = c.createRadialGradient(v.width / 2, v.height / 2, v.height * 0.45, v.width / 2, v.height / 2, v.width * 0.7);
   g.addColorStop(0, 'rgba(120,0,0,0)'); g.addColorStop(1, 'rgba(140,10,10,' + a + ')'); c.fillStyle = g; c.fillRect(-20, -20, v.width + 40, v.height + 40);
  }
  if (S.paused() && S.pauses.has('portrait')) { c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(0, 0, v.width, v.height); }
 };

 // Jejak tebasan pedang (busur cahaya) mengikuti kotak serang aktif.
 function drawTrail(c, p, camX){
  const m = p.move; if (p.state !== 'attack' || !m || !m.trail || p.t < m.active[0] || p.t > m.active[1] + 0.06) return;
  const k = (p.t - m.active[0]) / (m.active[1] - m.active[0] + 0.06), v = G.cfg.view;
  const cx = p.x - camX + p.facing * 30, cy = v.ground - 128 - p.z, r = 132;
  const from = m.trail === 2 ? Math.PI * 0.5 : m.trail > 0 ? -Math.PI * 0.75 : Math.PI * 0.25, sweep = m.trail === 2 ? -Math.PI : m.trail > 0 ? Math.PI * 0.9 : -Math.PI * 0.9;
  c.save(); c.translate(cx, cy); c.scale(p.facing, 1); c.globalAlpha = Math.max(0, 1 - k) * 0.7; c.lineCap = 'round';
  c.beginPath(); c.arc(0, 0, r, from + sweep * Math.max(0, k - 0.7), from + sweep * Math.min(1, k + 0.1), sweep < 0);
  c.strokeStyle = 'rgba(190,220,255,0.35)'; c.lineWidth = 16; c.stroke(); c.strokeStyle = '#fffaf0'; c.lineWidth = 5; c.stroke();
  c.restore();
 }
 function drawParticles(c, ps, camX){
  for (const p of ps.list) {
   const a = 1 - p.life / p.max, x = p.x - camX, y = G.cfg.view.ground - p.y;
   if (p.kind === 'dust') { c.fillStyle = 'rgba(196,164,112,' + a * 0.45 + ')'; c.beginPath(); c.arc(x, y, p.size, 0, 7); c.fill(); }
   else if (p.kind === 'spark') { c.strokeStyle = 'rgba(255,236,170,' + a + ')'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x - p.vx * 0.03, y + p.vy * 0.03); c.stroke(); }
   else { c.fillStyle = 'rgba(255,250,235,' + a + ')'; c.beginPath(); c.arc(x, y, p.size * (1 + (1 - a) * 3), 0, 7); c.fill(); }
  }
 }

 S.unmount = function(){
  if (!S.active) return;
  S.active = false; cancelAnimationFrame(S.frame);
  S.input.detach(); window.removeEventListener('resize', S.onResize); document.removeEventListener('visibilitychange', S.onVisibility);
  ['toast', 'wave', 'intro', 'clear', 'boss', 'combo', 'hurt', 'victory', 'complete', 'gameover', 'weapon', 'move'].forEach(G.off);
 };

 // Rute layar untuk app.js.
 A.screens.level1 = () => G.gameMarkup();
})(ARDHAN);
