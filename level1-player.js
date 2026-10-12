/* ArDhan: mesin status gerak, lompat, dash, jurus, combo, tangkis, dodge, dan sistem senjata. Hanya logika. */
(function(A){
 const G = A.game, C = () => G.cfg, PC = () => G.cfg.player;
 const GRAVITY = 1900;

 G.Player = function(x){
  const c = PC();
  Object.assign(this, {
   kind: 'player', id: 'p', x, z: 0, vx: 0, vz: 0, facing: 1,
   hp: c.hp, maxHp: c.hp, stamina: c.stamina, maxStamina: c.stamina, staminaWait: 0,
   state: 'idle', t: 0, animT: 0, move: null, moveName: '', hitSet: new Set(), lungeT: 0,
   chain: '', chainTimer: 0, weapon: null, armed: false, invuln: 0, flash: 0, blockT: 0, stun: 0,
   dodgeDir: 0, dodgeKind: 'back', dashDir: 0, pendingPick: null, ghosts: [], attackId: 0, blockFx: 0,
   air: false, airMove: null, airT: 0, airUsed: false, cancelWalk: false, calmT: 0
  });
 };
 const P = G.Player.prototype;

 // ---------- Senjata ----------
 P.weaponId = function(){ return this.armed && this.weapon ? this.weapon.id : 'unarmed'; };
 P.weaponDef = function(){ return C().weapons[this.weaponId()]; };
 P.moveset = function(){ return this.weaponDef().moveset; };
 P.parryWindow = function(){ return this.weaponDef().parryWindow || PC().block.parryWindow; };
 P.useWeapon = function(world, n){
  if (!this.armed || !this.weapon || !C().useDurability) return;
  this.weapon.dur -= n;
  if (this.weapon.dur <= 0) {
   this.weapon = null; this.armed = false; G.sfx('break');
   world.particles.burst(this.x + this.facing * 60, 150, 'spark', this.facing);
   G.emit('toast', { key: 'swordBroken', tone: 'bad' });
  }
  G.emit('weapon', this);
 };
 P.equip = function(id){
  const def = C().weapons[id];
  this.weapon = { id, dur: def.durability || Infinity, max: def.durability || Infinity };
  this.armed = true; G.emit('weapon', this);
 };
 // Tombol Opsi Senjata: tukar dengan senjata di tanah, atau ganti tangan kosong <-> senjata.
 P.weaponButton = function(world){
  if (!this.canAct()) return;
  const pick = world.pickupNear(this);
  if (pick && this.weapon) { world.takePickup(pick); this.equip(pick.id); G.sfx('pickup'); G.emit('toast', { key: 'pickedSword' }); return; }
  if (!this.weapon) { G.emit('toast', { key: 'noWeapon', tone: 'muted' }); return; }
  this.armed = !this.armed; this.chain = ''; G.sfx('ui'); G.emit('weapon', this);
 };

 // ---------- Status ----------
 P.canAct = function(){ return ['idle', 'walk', 'run', 'block'].includes(this.state); };
 P.alive = function(){ return this.hp > 0; };
 P.isBlocking = function(){ return this.state === 'block' || this.state === 'parry'; };
 P.invulnerable = function(){
  if (this.invuln > 0 || ['fall', 'down', 'getup', 'dead'].includes(this.state)) return true;
  if (this.state === 'dodge') { const w = PC().dodge.iframes; return this.t >= w[0] && this.t <= w[1]; }
  return false;
 };
 P.setState = function(s){ this.state = s; this.t = 0; };
 P.spendStamina = function(n){ this.stamina = Math.max(0, this.stamina - n); this.staminaWait = PC().staminaDelay; };

 P.hurtbox = function(){
  const h = PC().hurt, low = this.state === 'dodge' || this.state === 'pickup' || this.state === 'land';
  if (this.state === 'down') return { x1: this.x - 90, x2: this.x + 90, y1: 0, y2: 50 };
  return { x1: this.x - h.w / 2, x2: this.x + h.w / 2, y1: this.z, y2: this.z + (low ? h.crouchH : h.h) };
 };
 // Frame jurus: pakai frame cadangan bila frame utama belum ada di atlas.
 P.framesOf = function(m){ return m.fallback && !G.hasFrame(m.frames[0][0]) ? m.fallback : m.frames; };
 P.attackBox = function(){
  let m, t;
  if (this.state === 'attack') { m = this.move; t = this.t; }
  else if (this.state === 'jump' && this.airMove) { m = this.airMove; t = this.airT; }
  if (!m || !m.box || t < m.active[0] || t > m.active[1]) return null;
  const a = this.x + this.facing * m.box[0], b = this.x + this.facing * m.box[1];
  return { x1: Math.min(a, b), x2: Math.max(a, b), y1: m.box[2] + this.z, y2: m.box[3] + this.z };
 };
 P.moveDuration = function(m){ return m.frames.reduce((s, f) => s + f[1], 0); };

 // ---------- Memulai jurus ----------
 P.startAttack = function(key, running){
  const set = this.moveset();
  let name = null;
  if (running && C().runAttacks[set] && C().runAttacks[set][key]) { name = C().runAttacks[set][key]; this.chain = ''; }
  else {
   let chain = (this.chainTimer > 0 ? this.chain : '') + key;
   name = C().combos[set][chain];
   if (!name) { chain = key; name = C().combos[set][key]; }
   this.chain = chain;
  }
  const m = C().moves[name]; if (!m) return;
  this.move = m; this.moveName = name; this.attackId++;
  this.setState('attack'); this.hitSet.clear(); this.lungeT = 0;
  this.chainTimer = this.moveDuration(m) + PC().comboWindow;
  // Combo selesai bila tidak ada lanjutan di tabel (mis. setelah J ke-5): tekan berikutnya mulai dari awal.
  const table = C().combos[set];
  if (!this.chain || !Object.keys(table).some(k => k.length > this.chain.length && k.startsWith(this.chain))) this.chain = '';
  G.sfx(m.whoosh || m.heavy ? 'whoosh' : 'swing');
  G.emit('move', name);
 };
 // Tendangan di udara (W lalu K), sekali per lompatan.
 P.startMove = function(name){
  const m = C().moves[name]; if (!m) return;
  this.move = m; this.moveName = name; this.attackId++;
  this.setState('attack'); this.hitSet.clear(); this.lungeT = 0; this.chain = '';
  G.sfx(m.sfx === 'slashHeavy' ? 'slashHeavy' : 'whoosh'); G.emit('move', name);
 };
 P.startAirAttack = function(key){
  const name = (C().airAttacks[this.moveset()] || {})[key];
  if (!name || this.airUsed) return false;
  this.airMove = C().moves[name]; this.moveName = name; this.airT = 0; this.airUsed = true;
  this.attackId++; this.hitSet.clear(); this.chain = '';
  if (this.airMove.dive) this.vz = Math.min(this.vz, 0) - this.airMove.dive;   // meluncur turun untuk membelah
  G.sfx('whoosh'); G.emit('move', name);
  return true;
 };
 P.startDodge = function(dir){
  const d = PC().dodge;
  if (this.stamina < d.cost) { G.emit('toast', { key: 'noStamina', tone: 'muted' }); return false; }
  this.spendStamina(d.cost);
  this.dodgeDir = dir || -this.facing;
  this.dodgeKind = Math.random() < d.duckChance ? 'duck' : 'back';   // acak: menunduk di tempat atau mengelak ke belakang
  this.setState('dodge'); this.chain = ''; G.sfx('dodge');
  return true;
 };
 P.startDash = function(dir){
  const d = PC().dash;
  if (this.stamina < d.cost) { G.emit('toast', { key: 'noStamina', tone: 'muted' }); return false; }
  this.spendStamina(d.cost);
  this.dashDir = dir || this.facing; this.facing = this.dashDir;
  this.setState('dash'); this.chain = ''; G.sfx('dodge');
  return true;
 };
 P.startJump = function(){
  this.setState('jump'); this.air = false; this.airMove = null; this.airUsed = false; this.vz = 0; this.chain = '';
 };

 // ---------- Menerima serangan (dipanggil dari combat.js) ----------
 P.hurt = function(dir, knock, stun){
  if (this.z > 0) { this.knockDown(dir, knock); return; }   // terkena saat melompat = jatuh
  this.setState('hit'); this.stun = stun || PC().hitStun; this.vx = dir * knock; this.flash = C().feel.flash; this.chain = '';
 };
 P.knockDown = function(dir, knock){
  this.setState('fall'); this.vx = dir * knock * 0.8; this.vz = 520; this.z = Math.max(this.z, 1); this.flash = C().feel.flash; this.chain = '';
  this.airMove = null; this.cancelWalk = true;
 };
 P.die = function(dir, knock){ this.hp = 0; this.knockDown(dir, Math.max(knock, 260)); };
 P.stagger = function(){ this.hurt(-this.facing, 120, 0.6); };

 // ---------- Pembaruan per langkah ----------
 P.update = function(dt, world){
  const c = PC(), inp = world.input;
  if (this.cancelWalk) { inp.stopWalk(); this.cancelWalk = false; }
  const it = inp.intent();
  this.t += dt; this.animT += dt;
  // Santai bila tidak ada musuh selama calmDelay detik; langsung siaga begitu musuh muncul.
  this.calmT = world.hasThreat() ? 0 : this.calmT + dt;
  if (this.invuln > 0) this.invuln -= dt;
  if (this.flash > 0) this.flash -= dt;
  if (this.blockFx > 0) this.blockFx -= dt;
  if (this.chainTimer > 0) { this.chainTimer -= dt; if (this.chainTimer <= 0) this.chain = ''; }
  if (this.staminaWait > 0) this.staminaWait -= dt;
  else this.stamina = Math.min(this.maxStamina, this.stamina + c.staminaRegen * dt);
  if ((this.state === 'dodge' && this.dodgeKind === 'back') || this.state === 'dash') this.ghosts.push({ x: this.x, z: this.z, life: 0.18 });
  this.ghosts = this.ghosts.filter(g => (g.life -= dt) > 0);

  const locomotion = () => {
   const target = it.dir * (it.run ? c.runSpeed : c.walkSpeed);
   this.vx = G.approach(this.vx, target, (it.dir ? c.accel : c.friction) * dt);
   if (it.dir) this.facing = it.dir;
   const next = !it.dir ? 'idle' : it.run ? 'run' : 'walk';
   if (next !== this.state) { this.state = next; this.t = 0; }
  };
  const running = () => this.state === 'run' || this.state === 'dash' || Math.abs(this.vx) > c.walkSpeed * 1.2;
  const tryActions = () => {
   if (inp.take(['dodge'])) { if (this.startDodge(it.dir)) return true; }
   if (inp.take(['dash'])) { if (this.startDash(inp.dashDir)) return true; }
   if (inp.take(['jump'])) { this.startJump(); return true; }
   const atk = inp.take(['hand', 'foot']);
   if (atk) { const run = running(); if (it.dir) this.facing = it.dir; this.startAttack(atk === 'hand' ? 'J' : 'K', run); return true; }
   if (inp.take(['weapon'])) { this.weaponButton(world); }
   return false;
  };

  switch (this.state) {
   case 'idle': case 'walk': case 'run': {
    if (tryActions()) break;
    if (inp.held.block) { if (it.dir) this.facing = it.dir; this.setState('block'); this.blockT = 0; break; }
    locomotion();
    // Ambil senjata otomatis bila belum membawa senjata.
    if (!this.weapon) { const pick = world.pickupNear(this); if (pick) { this.pendingPick = pick; world.takePickup(pick); this.vx = 0; this.setState('pickup'); } }
    break;
   }
   case 'block': {
    this.blockT += dt; this.vx = G.approach(this.vx, 0, c.friction * dt);
    if (it.dir) this.facing = it.dir;  // boleh berbalik arah sambil menangkis, tetapi tidak bergerak
    if (!inp.held.block) { this.setState('idle'); break; }
    tryActions();
    break;
   }
   case 'parry': {
    this.vx = G.approach(this.vx, 0, c.friction * dt);
    if (this.t >= 0.3) { this.setState(inp.held.block ? 'block' : 'idle'); this.blockT = 1; }
    else if (this.t > 0.12 && (inp.peek(['hand', 'foot']) || inp.peek(['dodge']))) { this.setState('idle'); tryActions(); }
    break;
   }
   case 'attack': {
    const m = this.move, dur = this.moveDuration(m);
    if (m.lunge && this.t <= m.lunge[1]) this.vx = this.facing * m.lunge[0];
    else this.vx = G.approach(this.vx, 0, c.friction * 1.5 * dt);
    if (m.lift) { const [a, b, h] = m.lift; this.z = this.t >= a && this.t <= b ? Math.sin((this.t - a) / (b - a) * Math.PI) * h : 0; }
    if (this.t >= m.cancel && inp.peek(['hand', 'foot'])) { const k = inp.take(['hand', 'foot']); if (it.dir) this.facing = it.dir; this.startAttack(k === 'hand' ? 'J' : 'K', false); break; }
    if (this.t >= m.active[1] && inp.peek(['dodge'])) { inp.take(['dodge']); if (this.startDodge(it.dir)) break; }
    if (this.t >= dur) { this.z = 0; this.setState('idle'); }
    break;
   }
   case 'jump': {
    const j = c.jump;
    if (!this.air) {
     // Ancang-ancang singkat di tanah, lalu melompat dengan kecepatan saat ini.
     this.vx = G.approach(this.vx, 0, c.friction * 0.5 * dt);
     if (this.t >= j.takeoff) { this.air = true; this.vz = j.vz; this.z = 1; }
     break;
    }
    this.vz -= j.gravity * dt; this.z += this.vz * dt;
    if (it.dir) this.vx = G.approach(this.vx, it.dir * Math.max(j.airSpeed, Math.abs(this.vx)), j.airControl * dt);
    if (this.airMove) this.airT += dt;
    else { const k = inp.take(['foot', 'hand']); if (k) { if (it.dir) this.facing = it.dir; this.startAirAttack(k === 'hand' ? 'J' : 'K'); } }
    if (this.z <= 0) {
     const landName = this.airMove && this.airMove.land;
     this.z = 0; this.vz = 0; this.air = false; this.airMove = null; this.vx *= 0.4;
     world.particles.burst(this.x, 6, 'dust');
     if (landName) { this.startMove(landName); world.shake(6); world.particles.burst(this.x + this.facing * 120, 4, 'dust'); }
     else this.setState('land');
    }
    break;
   }
   case 'land': { this.vx = G.approach(this.vx, 0, c.friction * dt); if (this.t >= c.jump.land) this.setState('idle'); else if (this.t > c.jump.land * 0.5) tryActions(); break; }
   case 'dash': {
    const d = c.dash, k = this.t / d.time;
    this.vx = this.dashDir * d.speed * (k < 0.15 ? 0.5 : k < 0.7 ? 1 : Math.max(0, (1 - k) / 0.3));
    if (this.t >= d.cancel && (inp.peek(['hand', 'foot']) || inp.peek(['jump']))) { if (tryActions()) break; }
    if (this.t >= d.time) this.setState('idle');
    break;
   }
   case 'dodge': {
    const d = c.dodge, k = 1 - this.t / d.time;
    this.vx = this.dodgeKind === 'duck' ? G.approach(this.vx, 0, c.friction * 2 * dt) : this.dodgeDir * d.speed * Math.max(0, k);
    if (this.t >= d.time) this.setState('idle');
    break;
   }
   case 'hit': {
    this.vx = G.approach(this.vx, 0, c.friction * 0.9 * dt);
    if (this.t >= this.stun) this.setState('idle');
    break;
   }
   case 'fall': {
    this.vz -= GRAVITY * dt; this.z += this.vz * dt; this.vx *= 0.985;
    if (this.z <= 0 && this.t > 0.1) { this.z = 0; this.vx *= 0.3; this.setState('down'); G.sfx('down'); world.particles.burst(this.x - this.facing * 40, 10, 'dust'); world.shake(5); }
    break;
   }
   case 'down': {
    this.vx = G.approach(this.vx, 0, c.friction * dt);
    if (this.t >= c.downTime) this.setState(this.hp > 0 ? 'getup' : 'dead');
    break;
   }
   case 'getup': { this.vx = 0; if (this.t >= c.getupTime) { this.setState('idle'); this.invuln = c.invulnAfterGetup; } break; }
   case 'pickup': {
    this.vx = 0;
    if (this.t >= c.pickupTime) {
     const p = this.pendingPick; this.pendingPick = null;
     if (p) { this.equip(p.id); G.sfx('pickup'); G.emit('toast', { key: 'pickedSword' }); world.particles.burst(this.x + this.facing * 30, 30, 'spark'); }
     this.setState('idle');
    }
    break;
   }
   case 'dead': case 'victory': this.vx = G.approach(this.vx, 0, c.friction * dt); break;
  }
  this.x += this.vx * dt;
  const b = world.playerBounds();
  this.x = G.clamp(this.x, b[0], b[1]);
 };

 // ---------- Frame animasi untuk renderer ----------
 P.frameName = function(){
  const anims = C().anims, set = anims[this.weaponDef().anims], c = PC();
  const cycle = (list, fps) => list[Math.floor(this.animT * fps) % list.length];
  // Daftar frame dengan cadangan bila frame utama belum dibangun.
  const listOf = key => (set[key] && G.hasFrame(set[key][0])) ? set[key] : anims.fallback[key];
  const timeline = (frames, t) => { let acc = 0; for (const f of frames) { acc += f[1]; if (t < acc) return f[0]; } return frames[frames.length - 1][0]; };
  switch (this.state) {
   case 'attack': return timeline(this.framesOf(this.move), this.t);
   case 'jump': {
    const l = listOf('jump');
    if (this.airMove) return timeline(this.framesOf(this.airMove), this.airT);
    if (!this.air) return l[0];
    return this.vz > 120 ? l[1] : l[2];
   }
   case 'land': return listOf('jump')[3];
   case 'dash': { const l = listOf('dash'), k = this.t / c.dash.time; return l[k < 0.15 ? 0 : k < 0.45 ? 1 : k < 0.8 ? 2 : 3]; }
   case 'walk': return cycle(set.walk, anims.fps.walk);
   case 'run': return cycle(set.run, anims.fps.run);
   case 'block': return this.blockFx > 0 ? set.blockHit[0] : set.block[0];
   case 'parry': return set.parry[this.t < 0.12 ? 0 : 1];
   case 'dodge': return this.dodgeKind === 'duck' ? set.dodgeDuck[0] : set.dodgeBack[0];
   case 'hit': return set.hit[this.t < 0.08 ? 0 : 1];
   case 'fall': return set.fall[this.t < 0.16 ? 0 : 1];
   case 'down': case 'dead': return set.down[0];
   case 'getup': return set.getup[this.t < c.getupTime / 2 ? 0 : 1];
   case 'pickup': return set.pickup[this.t < c.pickupTime / 2 ? 0 : 1];
   default: return set.idleCalm && this.calmT >= c.calmDelay ? set.idleCalm[0] : set.idle[0];
  }
 };
})(ARDHAN);
