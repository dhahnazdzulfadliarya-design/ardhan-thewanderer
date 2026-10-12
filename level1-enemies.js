/* Musuh: AI prajurit (mendekat, mengepung, menyerang bergiliran, mundur, menangkis) dan komandan. Hanya logika. */
(function(A){
 const G = A.game, C = () => G.cfg;
 const GRAVITY = 1900;
 let uid = 0;

 G.Enemy = function(type, x, facing){
  const d = C().enemies[type];
  Object.assign(this, {
   kind: 'enemy', type, def: d, id: ++uid, x, z: 0, vx: 0, vz: 0, facing,
   hp: d.hp, maxHp: d.hp, state: 'enter', t: 0, think: 0, cd: G.rand(0.4, 1.0), targetX: x,
   atk: null, atkName: '', hitSet: new Set(), token: false, side: facing > 0 ? -1 : 1, slot: 0,
   flash: 0, stun: 0, poiseDmg: 0, alpha: 1, gone: false, walkT: 0, retreat: 0, seenAttack: 0, glint: 0,
   dropPending: false, fromFall: false, running: false, runT: 0
  });
 };
 const E = G.Enemy.prototype;
 const spriteSet = e => e.def.sprite ? C().enemySprites[e.def.sprite] : null;
 const dyingTime = set => set.dying.reduce((s, f) => s + f[1], 0);

 E.alive = function(){ return this.hp > 0 && !this.gone; };
 E.active = function(){ return this.alive() && this.state !== 'flee'; };
 E.setState = function(s){ this.state = s; this.t = 0; };
 E.isBlocking = function(){ return this.state === 'block'; };
 E.invulnerable = function(){ return ['down', 'getup', 'dying', 'dead', 'flee'].includes(this.state) || (this.state === 'fall' && this.hp <= 0) || this.state === 'enter' && this.t < 0.2; };
 E.armored = function(){ return this.atk && this.atk.armor && (this.state === 'windup' || this.state === 'active'); };
 E.height = function(){ return 222 * this.def.scale; };
 E.hurtbox = function(){
  if (this.state === 'down' || this.state === 'dead' || this.state === 'dying') return { x1: this.x - 90, x2: this.x + 90, y1: 0, y2: 46 };
  const w = 62 * this.def.scale; return { x1: this.x - w / 2, x2: this.x + w / 2, y1: this.z, y2: this.z + this.height() };
 };
 E.attackBox = function(){
  if (this.state !== 'active' || !this.atk) return null;
  const s = this.def.scale, b = this.atk.box, a = this.x + this.facing * b[0] * s, c = this.x + this.facing * b[1] * s;
  return { x1: Math.min(a, c), x2: Math.max(a, c), y1: b[2] * s, y2: b[3] * s };
 };
 E.releaseToken = function(){ this.token = false; };

 E.startAttack = function(name){
  this.atk = C().enemyAttacks[name]; this.atkName = name; this.hitSet.clear();
  this.setState('windup'); this.vx = 0; this.glint = 0;
 };

 // ---------- Menerima serangan ----------
 E.hurt = function(dir, knock, stun){
  if (this.armored()) { this.flash = C().feel.flash; return; }        // serangan berat komandan tidak terganggu
  if (this.def.poise) { if (this.poiseDmg < this.def.poise) { this.flash = C().feel.flash; this.vx = dir * knock * 0.25; return; } this.poiseDmg = 0; }
  this.releaseToken(); this.setState('hit'); this.stun = stun || C().ai.hitStun; this.vx = dir * knock; this.flash = C().feel.flash;
 };
 E.knockDown = function(dir, knock){
  if (this.def.poise && this.hp > 0 && this.poiseDmg < this.def.poise * 1.6) { this.hurt(dir, knock * 0.6, 0.4); return; }
  this.poiseDmg = 0; this.releaseToken(); this.setState('fall'); this.vx = dir * knock * 0.75; this.vz = 480; this.z = 1; this.flash = C().feel.flash;
 };
 // launch = serangan menjatuhkan (terlempar). Prajurit bersprite yang kalah tanpa terlempar
 // memainkan urutan roboh di tempat: terhuyung → membungkuk → berlutut → bertumpu tangan → tergeletak.
 E.die = function(dir, knock, launch){
  this.hp = 0; this.releaseToken(); this.flash = C().feel.flash * 1.5;
  if (spriteSet(this) && !launch) { this.setState('dying'); this.vx = dir * Math.max(knock, 200) * 0.6; return; }
  this.setState('fall'); this.vx = dir * Math.max(knock, 240) * 0.8; this.vz = 520; this.z = 1;
 };
 E.stagger = function(){ this.releaseToken(); this.setState('stagger'); this.vx = -this.facing * 160; this.cd = Math.max(this.cd, 0.6); };

 // ---------- AI ----------
 E.update = function(dt, world){
  const ai = C().ai, p = world.player, dx = p.x - this.x, dist = Math.abs(dx), sp = this.def.speed;
  this.t += dt; if (this.flash > 0) this.flash -= dt; if (this.cd > 0) this.cd -= dt;
  const face = () => { if (dist > 6) this.facing = dx > 0 ? 1 : -1; };
  // Bergerak ke x. Bila tujuan jauh dan searah hadap, prajurit berlari (runSpeed) alih-alih melangkah.
  const walkTo = (x, speed) => {
   const d = x - this.x;
   if (Math.abs(d) < 8) { this.vx = G.approach(this.vx, 0, 1600 * dt); return true; }
   const run = this.def.runSpeed && Math.abs(d) > ai.runDist && Math.sign(d) === this.facing;
   if (run) this.running = true;
   this.vx = G.approach(this.vx, Math.sign(d) * (run ? this.def.runSpeed : speed), (run ? 1100 : 1400) * dt); return false;
  };
  this.running = false;
  const playerAttackable = p.alive() && !['down', 'dead', 'getup'].includes(p.state);

  switch (this.state) {
   case 'enter': {
    face(); walkTo(this.targetX, sp * 1.1);
    if (Math.abs(this.targetX - this.x) < 12 || this.t > 4) this.setState('move');
    break;
   }
   case 'move': {
    face();
    this.think -= dt;
    if (this.think <= 0) {
     this.think = G.rand(ai.think[0], ai.think[1]);
     if (!this.token && this.cd <= 0 && playerAttackable) this.token = world.requestToken(this);
    }
    if (this.retreat > 0) { this.retreat -= dt; this.vx = G.approach(this.vx, -this.facing * sp * 0.8, 1400 * dt); }
    else {
     const ring = this.token ? this.def.reach * 0.82 : ai.ring[0] + this.slot * 70 + (this.def.weapon === 'spear' ? 30 : 0);
     const lim = world.enemyBounds();
     walkTo(G.clamp(p.x + this.side * Math.min(ring, ai.ring[1] + 60), lim[0], lim[1]), this.token ? sp : sp * 0.75);
    }
    // Prajurit pedang/komandan menangkis jika ArDhan memulai serangan di depannya.
    if (this.def.blockChance > 0 && p.state === 'attack' && p.attackId !== this.seenAttack && dist < 280 && p.facing === -this.facing) {
     this.seenAttack = p.attackId;
     if (p.move && p.t < p.move.active[0] + 0.02 && Math.random() < this.def.blockChance) { this.releaseToken(); this.setState('block'); this.vx = 0; break; }
    }
    if (this.token && this.cd <= 0 && playerAttackable) {
     // Pilih serangan yang cocok dengan jarak (serangan menerjang butuh jarak minimum).
     const inReach = dist <= this.def.reach * this.def.scale + 12;
     const options = this.def.attacks.filter(n => { const a = C().enemyAttacks[n]; return a.minDist ? dist >= a.minDist && dist < 420 && Math.random() < 0.35 : inReach; });
     if (options.length) { this.startAttack(G.pick(options)); break; }
    }
    break;
   }
   case 'windup': {
    this.vx = G.approach(this.vx, 0, 1600 * dt);
    if (this.t > this.atk.windup - 0.22) this.glint = Math.min(1, this.glint + dt * 6);  // tanda serangan datang
    if (this.t < this.atk.windup * 0.5) face();
    if (this.t >= this.atk.windup) { this.setState('active'); this.hitSet.clear(); this.vx = this.facing * (this.atk.lunge || (this.atk.step || 0) / Math.max(this.atk.active, 0.1)); G.sfx(this.def.weapon === 'fist' ? 'swing' : 'whoosh'); }
    break;
   }
   case 'active': {
    if (!this.atk.lunge) this.vx = G.approach(this.vx, 0, 900 * dt);
    if (this.t >= this.atk.active) {
     if (this.atk.next) { this.startAttack(this.atk.next); break; }
     this.setState('recover');
    }
    break;
   }
   case 'recover': {
    this.vx = G.approach(this.vx, 0, 1800 * dt);
    if (this.t >= this.atk.recover) {
     this.releaseToken(); this.cd = G.rand(this.def.cooldown[0], this.def.cooldown[1]);
     this.retreat = Math.random() < 0.55 ? G.rand(0.25, 0.55) : 0;   // mundur sejenak setelah menyerang
     this.atk = null; this.setState('move');
    }
    break;
   }
   case 'block': { face(); this.vx = G.approach(this.vx, 0, 1600 * dt); if (this.t >= ai.blockTime) { this.setState('move'); this.cd = Math.min(this.cd, 0.25); } break; }
   case 'hit': { this.vx = G.approach(this.vx, 0, 1400 * dt); if (this.t >= this.stun) this.setState('move'); break; }
   case 'stagger': { this.vx = G.approach(this.vx, 0, 900 * dt); if (this.t >= ai.staggerTime) this.setState('move'); break; }
   case 'fall': {
    this.vz -= GRAVITY * dt; this.z += this.vz * dt;
    if (this.z <= 0 && this.t > 0.1) {
     this.z = 0; this.vx *= 0.35; G.sfx('down'); world.particles.burst(this.x, 8, 'dust');
     if (this.hp <= 0) { this.fromFall = true; this.setState('dead'); world.onEnemyDefeated(this); } else this.setState('down');
    }
    break;
   }
   case 'dying': {
    this.vx = G.approach(this.vx, 0, 900 * dt);
    if (this.t >= dyingTime(spriteSet(this))) { G.sfx('down'); world.particles.burst(this.x, 8, 'dust'); this.setState('dead'); world.onEnemyDefeated(this); }
    break;
   }
   case 'down': { this.vx = G.approach(this.vx, 0, 1200 * dt); if (this.t >= 0.85) this.setState('getup'); break; }
   case 'getup': { this.vx = 0; if (this.t >= 0.45) { this.setState('move'); this.cd = Math.max(this.cd, 0.5); } break; }
   case 'dead': {
    this.vx = G.approach(this.vx, 0, 1200 * dt);
    // Prajurit bersprite: pedang yang tergeletak di sprite berganti menjadi pedang yang bisa diambil
    // tepat di tempatnya, lalu tubuh memudar. Prosedural: pedang sudah dijatuhkan saat kalah.
    const fadeAt = spriteSet(this) ? 0.8 : 1.3, fadeLen = 0.7;
    if (this.dropPending && this.t >= fadeAt) { this.dropPending = false; world.dropWeapon(this); }
    if (this.t > fadeAt) this.alpha = Math.max(0, 1 - (this.t - fadeAt) / fadeLen);
    if (this.t > fadeAt + fadeLen) this.gone = true;
    break;
   }
   case 'flee': {
    this.facing = this.x < p.x ? -1 : 1; this.vx = this.facing * (this.def.runSpeed || sp * 1.6); this.running = true;
    if (this.x < world.cam.x - 200 || this.x > world.cam.x + G.viewW() + 200) this.gone = true;
    break;
   }
  }
  if (!['fall', 'dying', 'dead', 'flee'].includes(this.state)) {
   // Hindari menumpuk: dorong sesama musuh yang terlalu dekat.
   for (const o of world.enemies) {
    if (o === this || !o.active() || o.state === 'fall' || o.state === 'down') continue;
    const d = this.x - o.x;
    if (Math.abs(d) < 46) this.x += Math.sign(d || this.id - o.id) * 60 * dt;
   }
  }
  this.x += this.vx * dt;
  this.walkT += dt * (this.vx * this.facing) / 125;   // mundur = siklus langkah terbalik
  if (this.running) this.runT += dt * Math.abs(this.vx); else this.runT = 0;
 };

 // ---------- Frame sprite untuk renderer (hanya tipe bersprite) ----------
 E.frameName = function(){
  const s = spriteSet(this); if (!s) return null;
  const at = (list, t, dur) => list[Math.min(list.length - 1, Math.floor(t / dur * list.length))];
  switch (this.state) {
   case 'windup': return this.atk.anim.windup;
   case 'active': return this.atk.anim.hit;
   case 'recover': return this.t < this.atk.recover * 0.4 ? this.atk.anim.hit : this.atk.anim.recover;
   case 'block': return s.block;
   case 'hit': return this.t < 0.1 || this.stun < 0.33 ? s.hit[0] : s.hit[1];
   case 'stagger': return this.t < 0.3 ? s.stagger[0] : s.stagger[1];
   case 'fall': return this.t < 0.12 ? s.fall[0] : s.fall[1];
   case 'down': return s.down;
   case 'getup': return at(s.getup, this.t, 0.45);
   case 'dying': { let acc = 0; for (const [f, d] of s.dying) { acc += d; if (this.t < acc) return f; } return s.dying[s.dying.length - 1][0]; }
   case 'dead': return this.fromFall && this.t < 0.22 ? s.down : s.dead;
   default: {
    // Berlari: siklus 8 frame mengikuti jarak tempuh, supaya kaki tidak tergelincir di tanah.
    if (this.running && s.run && Math.abs(this.vx) > 60) return s.run[Math.floor(this.runT / s.runStride * s.run.length) % s.run.length];
    if (Math.abs(this.vx) < 20) return s.idle;
    const n = s.walk.length, i = Math.floor(this.walkT * s.walkFps / 1.2);
    return s.walk[((i % n) + n) % n];
   }
  }
 };
})(ARDHAN);
