/* Prajurit kerajaan. Tipe bersprite digambar dari sheet pengguna (source-assets/sprites/soldier).
   Tipe tanpa sprite memakai cadangan prosedural: dengan kerangka (IK dua tulang) lalu
   dirender beresolusi rendah + garis tepi gelap agar serasi dengan gaya pixel-art ArDhan.
   Desain mengikuti panel 35–36: helm baja bertepi lebar, tabard biru tua berlambang emas,
   lengan zirah rantai, sabuk kulit, sepatu bot, jubah biru. Komandan: zirah dada, jubah bertepi emas, jambul merah. */
(function(A){
 const G = A.game;
 const SW = 500, SH = 340, OX = 250, OY = 312;   // kanvas lokal (unit logis) dan titik kaki
 let low, lctx, out, octx, ps = 0;

 const PALETTE = {
  soldier:   { tabard: '#2c4467', tabardDark: '#1d2f4d', trim: '#c9a24b', cape: '#22304b', capeIn: '#384d72', mail: '#848c95', mailDark: '#5b636c', steel: '#a8b2bc', steelDark: '#646d77', steelHi: '#e4eaee', skin: '#a56d46', skinDark: '#7a4c30', beard: '#2b1e16', pants: '#3d3429', boots: '#3a2719', leather: '#6b4628', belt: '#4b301b', shaft: '#7b5634' },
  commander: { tabard: '#273d61', tabardDark: '#1a2b47', trim: '#d8b25a', cape: '#1e2b45', capeIn: '#6e2329', mail: '#8b939c', mailDark: '#5f666f', steel: '#b5bec7', steelDark: '#6a737d', steelHi: '#f1f5f7', skin: '#9c6541', skinDark: '#734629', beard: '#241912', pants: '#352d24', boots: '#2f2016', leather: '#5f3c22', belt: '#3f2816', shaft: '#7b5634', plume: '#a3262b' }
 };
 const L = { thigh: 56, shin: 56, torso: 72, upper: 44, fore: 42 };

 function ensure(){
  const s = G.cfg.view.soldierPixelScale;
  if (low && ps === s) return;
  ps = s;
  low = document.createElement('canvas'); low.width = Math.ceil(SW * ps); low.height = Math.ceil(SH * ps); lctx = low.getContext('2d');
  out = document.createElement('canvas'); out.width = low.width + 2; out.height = low.height + 2; octx = out.getContext('2d');
 }

 // ---------- Matematika pose ----------
 const lerp = G.lerp;
 function ik(ax, ay, bx, by, l1, l2, bend){
  let dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy);
  d = G.clamp(d, Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.01);
  const a = Math.atan2(dy, dx), c = G.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1), j = a + bend * Math.acos(c);
  return [ax + Math.cos(j) * l1, ay + Math.sin(j) * l1];
 }
 function mix(a, b, k){
  const o = {};
  for (const key in a) {
   const va = a[key], vb = b[key] !== undefined ? b[key] : va;
   o[key] = Array.isArray(va) ? [lerp(va[0], vb[0], k), lerp(va[1], vb[1], k)] : lerp(va, vb, k);
  }
  return o;
 }

 // Pose dasar per jenis senjata. Koordinat lokal: x ke depan, y ke atas, kaki di (0,0).
 const BASE = {
  sword: { hip: [0, 108], lean: 0.08, head: 0, fN: [24, 8], fF: [-26, 8], hN: [34, 118], hF: [12, 112], wpn: 0.95, rot: 0 },
  spear: { hip: [0, 108], lean: 0.12, head: 0, fN: [30, 8], fF: [-30, 8], hN: [40, 128], hF: [0, 124], wpn: 0.08, rot: 0 },
  fist:  { hip: [0, 106], lean: 0.1, head: 0.04, fN: [24, 8], fF: [-24, 8], hN: [32, 164], hF: [20, 172], wpn: 0, rot: 0 }
 };
 const STRIKE = {
  slash:     { windup: { hN: [-6, 198], hF: [-12, 190], wpn: 2.35, lean: -0.08 }, hit: { hip: [10, 100], hN: [66, 108], hF: [52, 112], wpn: -0.5, lean: 0.3, fN: [46, 8] } },
  slashBack: { windup: { hN: [44, 74], hF: [30, 80], wpn: -0.7, lean: 0.15 }, hit: { hN: [58, 172], hF: [44, 168], wpn: 1.0, lean: 0.2, fN: [40, 8] } },
  overhead:  { windup: { hip: [0, 104], hN: [-12, 214], hF: [-16, 208], wpn: 2.05, lean: -0.16 }, hit: { hip: [10, 94], hN: [62, 88], hF: [50, 92], wpn: -0.95, lean: 0.38, fN: [52, 8] } },
  thrust:    { windup: { hN: [2, 124], lean: -0.05, fN: [34, 8], wpn: 0.06 }, hit: { hip: [12, 102], hN: [94, 130], lean: 0.32, fN: [50, 8], wpn: 0.02 } },
  punch:     { windup: { hN: [-4, 152], lean: -0.04 }, hit: { hN: [86, 166], hF: [24, 170], lean: 0.26, fN: [36, 8] } }
 };

 G.soldierPose = function(e, time){
  const w = e.def.weapon === 'spear' ? 'spear' : e.def.weapon === 'fist' ? 'fist' : 'sword';
  let p = mix(BASE[w], BASE[w], 0);
  // Napas dan langkah.
  p.hip[1] += Math.sin(time * 2.6 + e.id) * 1.4;
  const moving = Math.min(1, Math.abs(e.vx) / 60);
  if (moving > 0 && ['move', 'enter', 'flee', 'block'].includes(e.state)) {
   const ph = e.walkT * Math.PI * 2 * (e.state === 'flee' ? 1.3 : 1);
   p.fN[0] += Math.cos(ph) * 17 * moving; p.fN[1] += Math.max(0, Math.sin(ph)) * 15 * moving;
   p.fF[0] += Math.cos(ph + Math.PI) * 17 * moving; p.fF[1] += Math.max(0, Math.sin(ph + Math.PI)) * 15 * moving;
   p.hip[1] += Math.abs(Math.sin(ph)) * 3 * moving;
   if (e.state === 'flee') { p.lean += 0.25; p.hN = [26, 120]; p.hF = [-20, 116]; }
  }
  const pose = e.atk && STRIKE[e.atk.pose];
  switch (e.state) {
   case 'windup': { const k = G.smooth(Math.min(1, e.t / (e.atk.windup * 0.8))); p = mix(p, Object.assign({}, p, pose.windup), k); break; }
   case 'active': { const k = G.smooth(Math.min(1, e.t / Math.min(0.08, e.atk.active))); p = mix(Object.assign({}, p, pose.windup), Object.assign({}, p, pose.hit), k); break; }
   case 'recover': { const k = G.smooth(Math.min(1, e.t / e.atk.recover)); p = mix(Object.assign({}, p, pose.hit), p, k); break; }
   case 'block': {
    if (w === 'sword') Object.assign(p, { hN: [30, 150], hF: [18, 146], wpn: 1.45, lean: -0.02 });
    else if (w === 'spear') Object.assign(p, { hN: [36, 152], wpn: 1.2, lean: -0.04 });
    else Object.assign(p, { hN: [26, 182], hF: [22, 188], lean: -0.05 });
    break;
   }
   case 'hit': { const k = Math.max(0, 1 - e.t / (e.stun || 0.3)); p = mix(p, Object.assign({}, p, { hip: [-8, 104], lean: -0.38, head: -0.35, hN: [12, 150], hF: [-12, 142], wpn: p.wpn + 0.6 }), k); break; }
   case 'stagger': Object.assign(p, { hip: [-10, 104], lean: -0.45, head: -0.3, hN: [34, 184], hF: [-30, 172], wpn: 1.7 }); break;
   case 'fall': Object.assign(p, { lean: -0.2, head: -0.4, fN: [34, 36], fF: [6, 24], hN: [30, 170], hF: [-34, 160], wpn: 1.9, rot: -Math.min(1, e.t / 0.32) * 1.5 }); break;
   case 'down': case 'dead': Object.assign(p, { hip: [0, 104], lean: 0, head: -0.2, fN: [20, 8], fF: [-4, 10], hN: [30, 122], hF: [-26, 118], wpn: 1.3, rot: -1.5 }); break;
   case 'getup': { const k = G.smooth(Math.min(1, e.t / 0.45)); p = mix(Object.assign({}, p, { hip: [-14, 70], lean: 0.5, fN: [28, 8], fF: [-30, 8], rot: -1.5 }), p, k); break; }
  }
  if (w === 'spear') { const a = p.wpn; p.hF = [p.hN[0] - Math.cos(a) * 46, p.hN[1] - Math.sin(a) * 46]; }
  return p;
 };

 // ---------- Menggambar dalam koordinat lokal (canvas: y ke bawah, jadi y dibalik) ----------
 function limb(c, a, j, b, w1, w2, col, hi){
  c.strokeStyle = col; c.lineCap = 'round'; c.lineJoin = 'round';
  c.lineWidth = w1; c.beginPath(); c.moveTo(a[0], -a[1]); c.lineTo(j[0], -j[1]); c.stroke();
  c.lineWidth = w2; c.beginPath(); c.moveTo(j[0], -j[1]); c.lineTo(b[0], -b[1]); c.stroke();
  if (hi) { c.strokeStyle = hi; c.lineWidth = Math.max(2, w2 * 0.28); c.beginPath(); c.moveTo(a[0] + 2, -a[1] + 2); c.lineTo(j[0] + 2, -j[1] + 1); c.stroke(); }
 }
 function boot(c, ankle, col, trim){
  c.fillStyle = col; c.beginPath();
  c.moveTo(ankle[0] - 8, -ankle[1] - 10); c.lineTo(ankle[0] + 7, -ankle[1] - 10); c.lineTo(ankle[0] + 9, -ankle[1] + 2);
  c.lineTo(ankle[0] + 19, -ankle[1] + 4); c.lineTo(ankle[0] + 19, -ankle[1] + 9); c.lineTo(ankle[0] - 9, -ankle[1] + 9); c.closePath(); c.fill();
  c.fillStyle = trim; c.fillRect(ankle[0] - 9, -ankle[1] - 11, 17, 3);
 }
 // Pelindung tulang kering kulit di atas celana.
 function greave(c, knee, ankle, pal, far){
  const a = [lerp(knee[0], ankle[0], 0.25), lerp(knee[1], ankle[1], 0.25)];
  c.strokeStyle = far ? pal.belt : pal.leather; c.lineWidth = far ? 17 : 19; c.lineCap = 'butt';
  c.beginPath(); c.moveTo(a[0], -a[1]); c.lineTo(ankle[0], -ankle[1] - 8); c.stroke(); c.lineCap = 'round';
 }
 function drawWeapon(c, e, p, pal, hand){
  const a = p.wpn, cx = Math.cos(a), cy = Math.sin(a), big = e.def.look === 'commander';
  const at = t => [hand[0] + cx * t, hand[1] + cy * t];
  if (e.def.weapon === 'spear') {
   const back = at(-104), tip = at(120);
   c.strokeStyle = pal.shaft; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(back[0], -back[1]); c.lineTo(tip[0], -tip[1]); c.stroke();
   const t0 = at(118), t1 = at(150), nx = -cy, ny = cx;
   c.fillStyle = pal.steel; c.beginPath(); c.moveTo(t0[0] + nx * 6, -(t0[1] + ny * 6)); c.lineTo(t1[0], -t1[1]); c.lineTo(t0[0] - nx * 6, -(t0[1] - ny * 6)); c.closePath(); c.fill();
   c.strokeStyle = pal.steelHi; c.lineWidth = 1.5; c.beginPath(); c.moveTo(t0[0], -t0[1]); c.lineTo(t1[0], -t1[1]); c.stroke();
   const r = at(112); c.fillStyle = '#9b2b2b'; c.fillRect(r[0] - 3, -r[1] - 3, 6, 6);
   return t1;
  }
  if (e.def.weapon === 'sword') {
   const len = big ? 104 : 86, g0 = at(-16), tip = at(len), nx = -cy, ny = cx;
   c.strokeStyle = pal.leather; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(g0[0], -g0[1]); c.lineTo(hand[0], -hand[1]); c.stroke();
   const b0 = at(6);
   c.fillStyle = pal.steel; c.beginPath(); c.moveTo(b0[0] + nx * 4, -(b0[1] + ny * 4)); c.lineTo(tip[0] + nx * 1, -(tip[1] + ny * 1)); c.lineTo(tip[0] + cx * 6, -(tip[1] + cy * 6)); c.lineTo(b0[0] - nx * 4, -(b0[1] - ny * 4)); c.closePath(); c.fill();
   c.strokeStyle = pal.steelHi; c.lineWidth = 1.5; c.beginPath(); c.moveTo(b0[0] + nx * 1.5, -(b0[1] + ny * 1.5)); c.lineTo(tip[0], -tip[1]); c.stroke();
   const q = at(5); c.strokeStyle = pal.trim; c.lineWidth = 4; c.beginPath(); c.moveTo(q[0] + nx * 11, -(q[1] + ny * 11)); c.lineTo(q[0] - nx * 11, -(q[1] - ny * 11)); c.stroke();
   c.fillStyle = pal.trim; c.fillRect(g0[0] - 3, -g0[1] - 3, 6, 6);
   return at(len + 4);
  }
  return [hand[0] + 6, hand[1]];
 }

 function drawBody(c, e, p, pal, time){
  const cmd = e.def.look === 'commander', seed = e.id * 9301 % 7;
  const hip = p.hip, sh = [hip[0] + Math.sin(p.lean) * L.torso, hip[1] + Math.cos(p.lean) * L.torso];
  const shN = [sh[0] + 4, sh[1] - 4], shF = [sh[0] - 6, sh[1] - 2];
  const hipN = [hip[0] + 5, hip[1]], hipF = [hip[0] - 7, hip[1] + 1];
  const kneeN = ik(hipN[0], hipN[1], p.fN[0], p.fN[1], L.thigh, L.shin, 1), kneeF = ik(hipF[0], hipF[1], p.fF[0], p.fF[1], L.thigh, L.shin, 1);
  const elbowN = ik(shN[0], shN[1], p.hN[0], p.hN[1], L.upper, L.fore, -1), elbowF = ik(shF[0], shF[1], p.hF[0], p.hF[1], L.upper, L.fore, -1);
  const reachHand = (s, el, h) => { const d = Math.hypot(h[0] - el[0], h[1] - el[1]) || 1; return [el[0] + (h[0] - el[0]) / d * L.fore, el[1] + (h[1] - el[1]) / d * L.fore]; };
  const handN = reachHand(shN, elbowN, p.hN), handF = reachHand(shF, elbowF, p.hF);
  const sway = Math.sin(time * 3 + e.id) * 4 - Math.sign(e.vx * e.facing) * Math.min(18, Math.abs(e.vx) / 12);

  // Jubah di belakang badan.
  const capeLen = cmd ? 150 : 108;
  c.fillStyle = pal.cape; c.beginPath();
  c.moveTo(sh[0] + 6, -sh[1] - 2);
  c.quadraticCurveTo(sh[0] - 30 + sway * 0.5, -(sh[1] - capeLen * 0.45), hip[0] - 34 + sway, -(sh[1] - capeLen));
  c.lineTo(hip[0] - 4 + sway * 0.3, -(sh[1] - capeLen + 10));
  c.quadraticCurveTo(hip[0] + 4, -(hip[1] + 10), sh[0] - 8, -sh[1] + 2); c.closePath(); c.fill();
  c.fillStyle = cmd ? pal.capeIn : pal.capeIn; c.beginPath();
  c.moveTo(sh[0] - 4, -sh[1] + 6); c.quadraticCurveTo(sh[0] - 22 + sway * 0.4, -(sh[1] - capeLen * 0.5), hip[0] - 26 + sway, -(sh[1] - capeLen + 4));
  c.lineTo(hip[0] - 20 + sway, -(sh[1] - capeLen + 4)); c.quadraticCurveTo(sh[0] - 12, -(sh[1] - capeLen * 0.5), sh[0] - 2, -sh[1] + 8); c.closePath(); c.fill();
  if (cmd) { c.strokeStyle = pal.trim; c.lineWidth = 3; c.beginPath(); c.moveTo(hip[0] - 34 + sway, -(sh[1] - capeLen)); c.lineTo(hip[0] - 4 + sway * 0.3, -(sh[1] - capeLen + 10)); c.stroke(); }

  // Lengan dan kaki jauh (lebih gelap).
  limb(c, shF, elbowF, handF, 16, 13, pal.mailDark);
  c.fillStyle = pal.leather; c.beginPath(); c.arc(handF[0], -handF[1], 7.5, 0, 7); c.fill();
  limb(c, hipF, kneeF, [p.fF[0], p.fF[1] + 10], 22, 18, pal.pants);
  boot(c, p.fF, pal.boots, pal.leather);
  greave(c, kneeF, p.fF, pal, true);
  limb(c, hipN, kneeN, [p.fN[0], p.fN[1] + 10], 23, 19, pal.pants, 'rgba(255,255,255,0.1)');
  greave(c, kneeN, p.fN, pal);
  boot(c, p.fN, pal.boots, pal.leather);

  // Badan: tabard dengan rok hingga paha.
  const ax = Math.cos(p.lean), ay = -Math.sin(p.lean);  // arah tegak lurus badan (ke depan)
  const P = (base, f, up) => [base[0] + ax * f + Math.sin(p.lean) * up, base[1] + ay * f + Math.cos(p.lean) * up];
  const quad = pts => { c.beginPath(); pts.forEach((q, i) => i ? c.lineTo(q[0], -q[1]) : c.moveTo(q[0], -q[1])); c.closePath(); c.fill(); };
  c.fillStyle = pal.mail; quad([P(sh, 20, 4), P(sh, -21, 4), P(hip, -19, 0), P(hip, 18, 0)]);
  c.fillStyle = pal.mailDark; for (let i = 0; i < 5; i++) { const a = P(sh, 18, -6 - i * 9), b = P(sh, -18, -6 - i * 9); c.fillRect(Math.min(a[0], b[0]), -a[1], Math.abs(a[0] - b[0]), 1.5); }
  c.fillStyle = pal.tabard; quad([P(sh, 15, -3), P(sh, -15, -3), P(hip, -21, -27), P(hip, 22, -27)]);
  c.fillStyle = pal.tabardDark; quad([P(sh, -7, -3), P(sh, -15, -3), P(hip, -21, -27), P(hip, -10, -27)]);
  c.fillStyle = 'rgba(255,255,255,0.12)'; quad([P(sh, 15, -3), P(sh, 9, -3), P(hip, 15, -27), P(hip, 22, -27)]);
  c.fillStyle = pal.trim; quad([P(hip, -21, -24), P(hip, 22, -24), P(hip, 22, -28), P(hip, -21, -28)]); quad([P(sh, 3, -4), P(sh, 0, -4), P(hip, 0, -24), P(hip, 3, -24)]);
  if (cmd) { c.fillStyle = pal.steel; quad([P(sh, 13, -4), P(sh, -13, -4), P(sh, -12, -34), P(sh, 14, -34)]); c.fillStyle = pal.steelHi; quad([P(sh, 9, -8), P(sh, 4, -8), P(sh, 4, -28), P(sh, 9, -28)]); }
  // Lambang emas di dada.
  const em = P(sh, 3, cmd ? -46 : -30);
  c.fillStyle = pal.trim; c.beginPath(); c.moveTo(em[0], -em[1] - 9); c.lineTo(em[0] + 6, -em[1]); c.lineTo(em[0], -em[1] + 9); c.lineTo(em[0] - 6, -em[1]); c.closePath(); c.fill();
  c.fillRect(em[0] - 9, -em[1] - 1, 18, 2);
  // Sabuk.
  const b1 = P(hip, -17, 6), b2 = P(hip, 18, 6);
  c.strokeStyle = pal.belt; c.lineWidth = 6; c.beginPath(); c.moveTo(b1[0], -b1[1]); c.lineTo(b2[0], -b2[1]); c.stroke();
  const bk = P(hip, 8, 6); c.fillStyle = pal.trim; c.fillRect(bk[0] - 3, -bk[1] - 3, 6, 6);

  // Kepala: wajah, janggut, helm baja bertepi lebar.
  const hc = [sh[0] + Math.sin(p.lean + p.head) * 24, sh[1] + Math.cos(p.lean + p.head) * 24];
  c.strokeStyle = pal.skinDark; c.lineWidth = 8; c.beginPath(); c.moveTo(sh[0], -sh[1]); c.lineTo(hc[0], -hc[1] + 6); c.stroke();
  c.fillStyle = pal.skin; c.beginPath(); c.arc(hc[0] + 3, -hc[1], 13, 0, 7); c.fill();
  c.fillStyle = pal.skinDark; c.beginPath(); c.arc(hc[0] - 2, -hc[1] + 2, 9, 0, 7); c.fill();
  c.fillStyle = pal.skin; c.fillRect(hc[0] + 6, -hc[1] - 1, 9, 6);  // hidung/pipi
  if (cmd || seed % 3 !== 0) { c.fillStyle = pal.beard; c.beginPath(); c.moveTo(hc[0] - 6, -hc[1] + 3); c.lineTo(hc[0] + 14, -hc[1] + 5); c.lineTo(hc[0] + 10, -hc[1] + 15); c.lineTo(hc[0] - 4, -hc[1] + 14); c.closePath(); c.fill(); }
  c.fillStyle = '#1a1210'; c.fillRect(hc[0] + 8, -hc[1] - 4, 3, 3);   // mata
  const hr = cmd ? 18 : 16;
  c.fillStyle = pal.steelDark; c.beginPath(); c.ellipse(hc[0] + 1, -hc[1] - 5, hr + 11, 5.5, -p.head * 0.5, 0, 7); c.fill();
  c.fillStyle = pal.steel; c.beginPath(); c.arc(hc[0], -hc[1] - 6, hr, Math.PI, 0); c.fill();
  c.fillStyle = pal.steelHi; c.fillRect(hc[0] - 6, -hc[1] - 18, 6, 4);
  c.strokeStyle = pal.steelDark; c.lineWidth = 2; c.beginPath(); c.moveTo(hc[0], -hc[1] - 6 - hr); c.lineTo(hc[0], -hc[1] - 6); c.stroke();
  if (cmd) {
   c.fillStyle = pal.trim; c.fillRect(hc[0] - hr, -hc[1] - 9, hr * 2, 3);
   c.fillStyle = pal.plume; c.beginPath(); c.moveTo(hc[0], -hc[1] - 6 - hr); c.quadraticCurveTo(hc[0] - 14, -hc[1] - 34, hc[0] - 34 + sway * 0.4, -hc[1] - 18);
   c.quadraticCurveTo(hc[0] - 18, -hc[1] - 22, hc[0] - 2, -hc[1] - 14); c.closePath(); c.fill();
  }
  // Senjata lalu lengan dekat (tangan menutupi gagang).
  // Pedang yang sudah jatuh ke tanah tidak lagi digambar di tangan prajurit yang kalah.
  const tip = e.state === 'dead' && e.def.drop ? handN : drawWeapon(c, e, p, pal, handN);
  limb(c, shN, elbowN, handN, 17, 14, pal.mail, 'rgba(255,255,255,0.28)');
  const br = [lerp(elbowN[0], handN[0], 0.35), lerp(elbowN[1], handN[1], 0.35)];
  c.strokeStyle = pal.leather; c.lineWidth = 15; c.beginPath(); c.moveTo(br[0], -br[1]); c.lineTo(handN[0], -handN[1]); c.stroke();
  c.fillStyle = pal.skinDark; c.beginPath(); c.arc(handN[0], -handN[1], 8, 0, 7); c.fill();
  c.fillStyle = pal.leather; c.beginPath(); c.arc(handN[0] - 1, -handN[1] + 1, 6, 0, 7); c.fill();
  // Pelindung bahu baja.
  c.fillStyle = pal.steelDark; c.beginPath(); c.ellipse(shN[0] - 1, -shN[1] + 6, cmd ? 20 : 16, cmd ? 15 : 12, -p.lean, 0, 7); c.fill();
  c.fillStyle = pal.steel; c.beginPath(); c.ellipse(shN[0] - 2, -shN[1] + 4, cmd ? 18 : 14, cmd ? 12 : 9.5, -p.lean, 0, 7); c.fill();
  c.fillStyle = pal.steelHi; c.fillRect(shN[0] - 8, -shN[1] - 1, 8, 3);
  return tip;
 }

 // ---------- Render ke layar ----------
 // Prajurit bersprite (sheet pengguna). Mengembalikan false bila frame belum termuat.
 function drawSpriteSoldier(ctx, e, camX, time){
  const v = G.cfg.view, spr = G.cfg.enemySprites[e.def.sprite], sheet = spr && A.spriteAtlas[spr.sheet];
  if (!sheet) return false;
  const k = v.soldierHeight / sheet.standHeight * e.def.scale, flip = e.facing * sheet.face;
  const x = e.x - camX, ground = v.ground, name = e.frameName(time), r = G.frameRect(name);
  if (!r) return false;
  const lying = ['down', 'dead'].includes(e.state) || (e.state === 'dying' && name === spr.dying[spr.dying.length - 1][0]);
  G.drawShadow(ctx, x, ground, (lying ? 104 : 56) * e.def.scale, e.z);
  const idle = (e.state === 'move' || e.state === 'enter') && Math.abs(e.vx) < 20;
  const breathe = idle ? 1 + Math.sin(time * 2.6 + e.id) * 0.01 : 1;
  if (!G.drawFrame(ctx, name, Math.round(x), ground - e.z, flip, k, e.alpha, e.flash > 0 ? e.flash / G.cfg.feel.flash : 0, breathe)) return false;
  // Kilatan tanda serangan (✦) tepat di ujung pedang pada frame ancang-ancang.
  const tip = spr.tips[name];
  if (e.state === 'windup' && e.glint > 0 && tip) drawGlint(ctx, x + (tip[0] - r[4]) * k * flip, ground - e.z - (r[5] - tip[1]) * k, e.glint, e.atk.heavy);
  return true;
 }
 function drawGlint(ctx, gx, gy, a, heavy){
  const r = 12 + a * 12;
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = heavy ? '#ff6a4a' : '#fff4c8';
  ctx.beginPath(); ctx.moveTo(gx, gy - r); ctx.lineTo(gx + 3, gy - 3); ctx.lineTo(gx + r, gy); ctx.lineTo(gx + 3, gy + 3); ctx.lineTo(gx, gy + r); ctx.lineTo(gx - 3, gy + 3); ctx.lineTo(gx - r, gy); ctx.lineTo(gx - 3, gy - 3); ctx.closePath(); ctx.fill();
  ctx.restore();
 }

 G.drawSoldier = function(ctx, e, camX, time){
  if (e.def.sprite && drawSpriteSoldier(ctx, e, camX, time)) return;
  // Cadangan: prajurit prosedural (dipakai tipe tanpa sprite, mis. 'tombak').
  ensure();
  const v = G.cfg.view, s = e.def.scale, pal = PALETTE[e.def.look] || PALETTE.soldier;
  const p = G.soldierPose(e, time);
  const x = e.x - camX, ground = v.ground;
  G.drawShadow(ctx, x, ground, (e.state === 'down' || e.state === 'dead' ? 96 : 54) * s, e.z);
  lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.clearRect(0, 0, low.width, low.height);
  lctx.setTransform(ps * e.facing, 0, 0, ps, OX * ps, OY * ps);
  if (p.rot) { lctx.rotate(p.rot); if (p.rot < -1) lctx.translate(0, -22 * Math.min(1, -p.rot / 1.5)); }
  const tip = drawBody(lctx, e, p, pal, time);
  // Garis tepi gelap 1 piksel seperti sprite pixel-art.
  octx.setTransform(1, 0, 0, 1, 0, 0); octx.globalCompositeOperation = 'source-over'; octx.clearRect(0, 0, out.width, out.height);
  octx.drawImage(low, 0, 1); octx.drawImage(low, 2, 1); octx.drawImage(low, 1, 0); octx.drawImage(low, 1, 2);
  octx.globalCompositeOperation = 'source-in'; octx.fillStyle = '#16111a'; octx.fillRect(0, 0, out.width, out.height);
  octx.globalCompositeOperation = 'source-over'; octx.drawImage(low, 1, 1);
  if (e.flash > 0) { octx.globalCompositeOperation = 'source-atop'; octx.fillStyle = 'rgba(255,250,240,' + Math.min(0.7, e.flash / G.cfg.feel.flash * 0.7) + ')'; octx.fillRect(0, 0, out.width, out.height); octx.globalCompositeOperation = 'source-over'; }
  const k = s / ps;
  ctx.save(); ctx.globalAlpha = e.alpha; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(out, Math.round(x - (OX * ps + 1) * k), Math.round(ground - e.z - (OY * ps + 1) * k), out.width * k, out.height * k);
  ctx.restore();
  if (e.state === 'windup' && e.glint > 0 && !p.rot) drawGlint(ctx, x + e.facing * tip[0] * s, ground - e.z - tip[1] * s, e.glint, e.atk.heavy);
 };

 // Pedang di tanah (bisa diambil): ukuran & warna sama dengan pedang prajurit di sprite
 // (bilah perak, pelindung dan pommel emas, gagang kulit gelap), plus penanda ▼ yang berdenyut.
 G.drawPickup = function(ctx, k, camX, time){
  const v = G.cfg.view, x = k.x - camX, y = v.ground - 7 - k.z, a = k.alpha === undefined ? 1 : k.alpha;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(k.dir || 1, 1);
  ctx.fillStyle = 'rgba(30,20,10,0.3)'; ctx.beginPath(); ctx.ellipse(0, 7 + k.z, 72, 6, 0, 0, 7); ctx.fill();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#1d1a1f'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-74, 0); ctx.lineTo(70, 1); ctx.stroke();
  ctx.fillStyle = '#c9cfd6'; ctx.beginPath(); ctx.moveTo(-54, -3); ctx.lineTo(62, -2); ctx.lineTo(74, 1); ctx.lineTo(62, 4); ctx.lineTo(-54, 3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#f2f5f7'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-52, -1); ctx.lineTo(64, -0.5); ctx.stroke();
  ctx.strokeStyle = '#4a3020'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-70, 0); ctx.lineTo(-58, 0); ctx.stroke();
  ctx.fillStyle = '#d2a64d'; ctx.fillRect(-59, -10, 5, 20); ctx.beginPath(); ctx.arc(-73, 0, 4.5, 0, 7); ctx.fill();
  ctx.restore();
  if (a < 0.6) return;
  const bob = Math.sin(time * 5) * 6, ia = (0.65 + Math.sin(time * 5) * 0.3) * a;
  ctx.save(); ctx.globalAlpha = ia; ctx.fillStyle = '#ffd772'; ctx.strokeStyle = '#3a2508'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 14, y - 74 + bob); ctx.lineTo(x + 14, y - 74 + bob); ctx.lineTo(x, y - 54 + bob); ctx.closePath(); ctx.stroke(); ctx.fill();
  ctx.restore();
 };
})(ARDHAN);
