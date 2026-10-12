/* Dunia Level 1: kamera yang mengikuti ArDhan, arena tiap gelombang, gelombang musuh, senjata di tanah,
   statistik, menang/kalah. Hanya logika. Satuan dunia = satuan karakter; kamera memperkecil tampilan
   (view.zoom) sehingga karakter tampak lebih jauh dan area yang terlihat lebih luas (G.viewW()). */
(function(A){
 const G = A.game, C = () => G.cfg;

 G.World = function(input){
  const cfg = C();
  this.input = input;
  this.player = new G.Player(cfg.arenas[0].x + cfg.arenas[0].w / 2);
  this.enemies = []; this.pickups = []; this.pending = [];
  this.particles = new G.Particles();
  this.cam = { x: 0, locked: true };
  this.arena = 0; this.wave = -1; this.group = 0;
  this.phase = 'intro'; this.phaseT = 0; this.time = 0; this.clock = 0;
  this.stats = { kills: 0, time: 0, maxCombo: 0 };
  this.combo = 0; this.comboTimer = 0;
  this.hitstopT = 0; this.shakeAmt = 0; this.slowmo = 1;
  this.bossDown = false; this.ended = false;
  this.cam.x = this.cameraTarget();
 };
 const W = G.World.prototype;

 // ---------- Efek ----------
 W.hitstop = function(t){ this.hitstopT = Math.max(this.hitstopT, t); };
 W.shake = function(a){ this.shakeAmt = Math.max(this.shakeAmt, a); };
 W.addCombo = function(){ this.combo++; this.comboTimer = 1.3; this.stats.maxCombo = Math.max(this.stats.maxCombo, this.combo); if (this.combo >= 2) G.emit('combo', this.combo); };

 // ---------- Arena dan kamera ----------
 W.arenaX = function(i){ return C().arenas[i].x; };
 W.arenaW = function(i){ return C().arenas[i].w; };
 // Saat bertarung ArDhan tetap di dalam arena gelombang; saat "Maju" ia bebas ke kanan.
 W.playerBounds = function(){
  const ax = this.arenaX(this.arena);
  if (this.cam.locked) return [ax + 40, ax + this.arenaW(this.arena) - 40];
  return [Math.max(ax + 40, this.cam.x + 40), C().worldWidth - 40];
 };
 // Musuh bergerak di bagian arena yang sedang terlihat kamera.
 W.enemyBounds = function(){
  const b = this.playerBounds(), lo = Math.max(b[0], this.cam.x + 70), hi = Math.min(b[1], this.cam.x + G.viewW() - 70);
  return lo < hi ? [lo, hi] : [b[0], b[1]];
 };
 // Kamera mengikuti ArDhan (sedikit melihat ke arah hadapnya), dibatasi tepi arena/dunia.
 W.cameraTarget = function(){
  const vw = G.viewW(), p = this.player, ax = this.arenaX(this.arena);
  let t = p.x - vw / 2 + p.facing * vw * 0.08;
  const lo = ax - 150, hi = this.cam.locked ? ax + this.arenaW(this.arena) - vw + 150 : C().worldWidth - vw;
  return G.clamp(G.clamp(t, lo, Math.max(lo, hi)), 0, C().worldWidth - vw);
 };
 W.updateCamera = function(dt){
  const target = this.cameraTarget();
  this.cam.x += (target - this.cam.x) * Math.min(1, dt * 5);
  if (Math.abs(target - this.cam.x) < 0.5) this.cam.x = target;
 };

 // ---------- Token serangan: batasi musuh yang menyerang bersamaan ----------
 W.requestToken = function(e){
  const holders = this.enemies.filter(o => o.token && o.alive()).length;
  return holders < C().ai.maxAttackers || (e.def.boss && holders <= C().ai.maxAttackers);
 };
 // Bagi musuh ke kiri/kanan ArDhan agar mengepung, lalu beri urutan jarak (slot).
 W.assignSides = function(){
  const p = this.player, list = this.enemies.filter(e => e.active() && ['move', 'enter'].includes(e.state));
  if (!list.length) return;
  for (const e of list) if (!e.side) e.side = e.x < p.x ? -1 : 1;
  const left = list.filter(e => e.side < 0), right = list.filter(e => e.side > 0);
  if (Math.abs(left.length - right.length) >= 2) {
   const from = left.length > right.length ? left : right;
   const mover = from.filter(e => !e.token).sort((a, b) => Math.abs(b.x - p.x) - Math.abs(a.x - p.x))[0];
   if (mover) mover.side = -mover.side;
  }
  for (const side of [-1, 1]) this.enemies.filter(e => e.active() && e.side === side).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x)).forEach((e, i) => e.slot = i);
 };

 // ---------- Gelombang ----------
 W.start = function(){ this.startWave(0); this.phase = 'fight'; G.emit('intro'); G.sfx('horn'); };
 W.startWave = function(i){
  this.wave = i; this.group = 0; this.arena = C().waves[i].arena; this.cam.locked = true;
  this.spawnGroup(C().waves[i].groups[0]); this.group = 1; this.flushPending();
  G.emit('wave', { index: i, total: C().waves.length, title: C().waves[i].title });
 };
 W.spawnGroup = function(g){ for (const s of g.spawn) this.pending.push(s); };
 W.spawnOne = function(s){
  const [type, side, at] = s, vw = G.viewW(), cx = this.cam.x, p = this.player, lim = this.enemyBounds();
  let e;
  if (at !== undefined) { e = new G.Enemy(type, p.x + at, at > 0 ? -1 : 1); e.state = 'move'; e.cd = G.rand(1.8, 2.8); /* beri ArDhan waktu membaca situasi di awal */ }
  else {
   // Masuk dari luar tepi layar yang terlihat, lalu berjalan ke dalam arena.
   const fromLeft = side === 'L', x = fromLeft ? cx - 140 : cx + vw + 140;
   e = new G.Enemy(type, x, fromLeft ? 1 : -1);
   e.targetX = G.clamp(fromLeft ? cx + G.rand(160, 420) : cx + vw - G.rand(160, 420), lim[0], lim[1]);
  }
  e.side = e.x < p.x ? -1 : 1;
  this.enemies.push(e);
  if (e.def.boss) { this.boss = e; G.emit('boss', e); }
 };
 W.flushPending = function(){ while (this.pending.length && this.aliveCount() < C().maxOnScreen) this.spawnOne(this.pending.shift()); };
 W.aliveCount = function(){ return this.enemies.filter(e => e.active()).length; };
 // Ada musuh yang mengancam (masih bertarung atau akan segera muncul)?
 W.hasThreat = function(){ return this.pending.length > 0 || this.enemies.some(e => e.active()); };
 W.updateWaves = function(){
  const wave = C().waves[this.wave];
  // Grup berikutnya muncul saat syaratnya terpenuhi.
  if (this.group < wave.groups.length) {
   const g = wave.groups[this.group], w = g.when || {};
   const ready = (w.alive !== undefined && this.aliveCount() + this.pending.length <= w.alive) || (w.bossHp !== undefined && this.boss && this.boss.hp / this.boss.maxHp <= w.bossHp);
   if (ready) { this.spawnGroup(g); this.group++; if (w.bossHp !== undefined) { G.emit('toast', { key: 'reinforce', tone: 'bad' }); G.sfx('horn'); } }
  }
  this.flushPending();
  if (this.group >= wave.groups.length && !this.pending.length && this.aliveCount() === 0) this.waveCleared();
 };
 W.waveCleared = function(){
  if (this.wave >= C().waves.length - 1) { this.victory(); return; }
  this.phase = 'clear'; this.phaseT = 0; this.cam.locked = false;
  G.emit('clear');
 };
 W.onEnemyDefeated = function(e){
  this.stats.kills++;
  if (e.def.drop && (!e.def.dropChance || Math.random() < e.def.dropChance)) {
   if (e.def.sprite) e.dropPending = true;   // muncul saat tubuh mulai memudar (lihat enemies.js)
   else this.pickups.push({ id: e.def.drop, x: e.x - e.facing * 30, z: 60, vz: 260, t: 0, dir: -e.facing, alpha: 1 });
  }
  if (e === this.boss) {
   this.bossDown = true; this.pending = [];
   for (const o of this.enemies) if (o.active() && o !== e) { o.releaseToken(); o.setState('flee'); }
   this.victory();
  }
 };
 W.victory = function(){
  if (this.phase === 'victory') return;
  this.phase = 'victory'; this.phaseT = 0; this.slowmo = 0.35;
  this.stats.time = this.time; G.sfx('victory'); G.emit('victory');
 };

 // ---------- Senjata di tanah ----------
 // Pedang muncul tepat di posisi pedang yang tergeletak pada frame mati sprite prajurit.
 W.dropWeapon = function(e){
  const spr = C().enemySprites[e.def.sprite], sheet = A.spriteAtlas && A.spriteAtlas[spr.sheet], r = G.frameRect(spr.drop.frame);
  let x = e.x, dir = -e.facing;
  if (sheet && r) { const k = C().view.soldierHeight / sheet.standHeight * e.def.scale, flip = e.facing * sheet.face; x = e.x + (spr.drop.at[0] - r[4]) * k * flip; dir = flip; }
  this.pickups.push({ id: e.def.drop, x, z: 0, vz: 0, t: 0, dir, alpha: 0 });
 };
 W.pickupNear = function(p){ return this.pickups.find(k => k.z <= 0 && Math.abs(k.x - p.x) < 52) || null; };
 W.takePickup = function(k){ this.pickups = this.pickups.filter(o => o !== k); };

 // ---------- Langkah simulasi ----------
 W.update = function(dt){
  this.clock += dt;
  this.particles.update(dt);
  if (this.shakeAmt > 0) this.shakeAmt = Math.max(0, this.shakeAmt - dt * 30);
  if (this.hitstopT > 0) { this.hitstopT -= dt; return; }
  if (this.phase === 'victory') this.slowmo = Math.min(1, this.slowmo + dt * 0.5);
  dt *= this.slowmo;
  this.phaseT += dt;
  if (this.phase === 'fight' || this.phase === 'clear') this.time += dt;
  if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.combo = 0; }

  const p = this.player;
  p.update(dt, this);
  this.assignSides();
  for (const e of this.enemies) e.update(dt, this);
  this.enemies = this.enemies.filter(e => !e.gone);
  G.resolveHits(this);
  for (const k of this.pickups) { k.t += dt; k.alpha = Math.min(1, k.alpha + dt * 1.6); if (k.z > 0 || k.vz > 0) { k.vz -= 1500 * dt; k.z = Math.max(0, k.z + k.vz * dt); if (k.z === 0) k.vz = 0; } }

  if (this.phase === 'fight') this.updateWaves();
  if (this.phase === 'clear') {
   const next = C().waves[this.wave + 1], nx = this.arenaX(next.arena);
   if (p.x >= nx + C().arenaEntry) { this.phase = 'fight'; this.startWave(this.wave + 1); }
  }
  if (this.phase === 'victory' && this.phaseT > 2.4 && !this.ended) { this.ended = true; this.stats.hpLeft = Math.max(0, Math.ceil(p.hp)); G.emit('complete', this.stats); }
  if (!p.alive() && p.state === 'dead' && this.phase !== 'over') { this.phase = 'over'; this.phaseT = 0; G.sfx('defeat'); }
  if (this.phase === 'over' && this.phaseT > 1.2 && !this.ended) { this.ended = true; G.emit('gameover', this.stats); }
  this.updateCamera(dt);
 };
})(ARDHAN);
