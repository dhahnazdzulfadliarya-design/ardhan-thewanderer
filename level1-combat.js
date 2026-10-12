/* Resolusi pertarungan: hitbox vs hurtbox, tangkis, tangkisan sempurna, damage, knockback, hit-stop. */
(function(A){
 const G = A.game, C = () => G.cfg;
 const overlap = (a, b) => a && b && a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
 G.overlap = overlap;

 G.resolveHits = function(world){
  const p = world.player;
  const pb = p.attackBox();
  if (pb) for (const e of world.enemies) {
   if (!e.alive() || p.hitSet.has(e.id) || e.state === 'flee') continue;
   if (overlap(pb, e.hurtbox())) { p.hitSet.add(e.id); G.applyHit(world, p, e, p.state === 'jump' && p.airMove ? p.airMove : p.move); }
  }
  for (const e of world.enemies) {
   const eb = e.attackBox();
   if (eb && !e.hitSet.has('p') && overlap(eb, p.hurtbox())) { e.hitSet.add('p'); G.applyHit(world, e, p, e.atk); }
  }
 };

 // Mengembalikan 'miss' | 'parry' | 'blocked' | 'guardbreak' | 'hit' | 'kill'.
 G.applyHit = function(world, att, tgt, atk){
  if (tgt.invulnerable()) return 'miss';
  const feel = C().feel, isPlayerAtt = att.kind === 'player', isPlayerTgt = tgt.kind === 'player';
  const front = (att.x - tgt.x) * tgt.facing >= 0;
  const dir = Math.sign(tgt.x - att.x) || att.facing;
  const contactX = (att.x + tgt.x) / 2, contactY = Math.min(atk.box[3], 200) - 40;
  // Tendangan tetap tendangan walau ArDhan memegang pedang: tanpa bunyi logam dan tanpa memakai durabilitas.
  const metal = isPlayerAtt ? p_armed(att) && !atk.kick : att.def && (att.def.weapon === 'sword' || att.def.weapon === 'spear');
  const wearsBlade = isPlayerAtt && !atk.kick;
  let dmg = atk.dmg;

  if (tgt.isBlocking() && front && !(atk.unblockable)) {
   if (isPlayerTgt) {
    const wdef = tgt.weaponDef();
    // Tangkisan sempurna: tangkis ditekan tepat sebelum serangan kena.
    if (tgt.state === 'block' && tgt.blockT <= tgt.parryWindow()) {
     tgt.setState('parry'); att.stagger && att.stagger();
     world.hitstop(0.1); world.particles.burst(contactX, contactY, 'spark'); G.sfx(tgt.armed ? 'clang' : 'parry');
     G.emit('toast', { key: 'perfectParry', tone: 'good' }); tgt.useWeapon(world, 1);
     return 'parry';
    }
    const cost = wdef.blockStamina || C().player.block.stamina;
    tgt.spendStamina(atk.heavy ? cost * 1.8 : cost);
    if (tgt.stamina <= 0 || (atk.heavy && atk.down && !tgt.armed)) {
     tgt.hp -= dmg * 0.5; tgt.hurt(dir, atk.knock * 0.8, 0.6); world.shake(feel.shake.heavy);
     G.sfx('punchHeavy'); G.emit('toast', { key: 'guardBreak', tone: 'bad' }); G.emit('hurt');
     if (tgt.hp <= 0) tgt.die(dir, atk.knock, !!atk.down);
     return 'guardbreak';
    }
    tgt.hp -= dmg * (wdef.blockChip !== undefined ? wdef.blockChip : C().player.block.chip);
    tgt.vx = dir * atk.knock * 0.45; tgt.blockFx = 0.16; tgt.useWeapon(world, wdef.blockCost || 0);
    world.particles.burst(contactX, contactY, 'spark', dir); G.sfx(tgt.armed || metal ? 'clang' : 'block'); world.hitstop(feel.hitstop.light);
    if (tgt.hp <= 0) tgt.die(dir, atk.knock, !!atk.down);
    return 'blocked';
   }
   // Musuh menangkis: serangan berat memecah tangkisan.
   if (atk.heavy) { tgt.hp -= dmg * 0.5; tgt.stagger(); world.particles.burst(contactX, contactY, 'spark'); G.sfx('clang'); world.hitstop(feel.hitstop.heavy); world.shake(feel.shake.light); if (wearsBlade) att.useWeapon(world, 1); if (tgt.hp <= 0) tgt.die(dir, atk.knock, !!atk.down); return 'guardbreak'; }
   tgt.hp -= dmg * 0.15; tgt.vx = dir * atk.knock * 0.4; tgt.t = 0;
   world.particles.burst(contactX, contactY, 'spark', dir); G.sfx('clang'); world.hitstop(feel.hitstop.light);
   if (wearsBlade) att.useWeapon(world, 1);
   return 'blocked';
  }

  // ---- Kena ----
  tgt.hp -= dmg;
  if (tgt.poiseDmg !== undefined) tgt.poiseDmg += dmg;
  let result = 'hit';
  if (tgt.hp <= 0) { tgt.die(dir, atk.knock, !!atk.down); result = 'kill'; }
  else if (atk.down) tgt.knockDown(dir, atk.knock);
  else tgt.hurt(dir, atk.knock, atk.stun);
  tgt.flash = feel.flash;
  const heavy = atk.heavy || atk.down || result === 'kill';
  world.hitstop(result === 'kill' ? feel.hitstop.kill : heavy ? feel.hitstop.heavy : feel.hitstop.light);
  world.shake(atk.shake || (heavy ? feel.shake.heavy : feel.shake.light));
  world.particles.burst(contactX, contactY, metal ? 'spark' : 'impact', dir);
  if (metal) G.sfx('swordHit'); else G.sfx(atk.sfx === 'kick' ? 'kick' : heavy ? 'punchHeavy' : 'punch');
  if (isPlayerAtt) { if (wearsBlade) att.useWeapon(world, 1); world.addCombo(); }
  if (isPlayerTgt) { G.sfx('hurt'); G.emit('hurt'); world.combo = 0; }
  return result;
 };
 function p_armed(p){ return p.armed && !!p.weapon; }
})(ARDHAN);
