/* Latar Level 1. Utama: panorama dari pengguna (lihat bagian "Latar panorama").
   Cadangan bila file panorama belum ada: lukisan "open world" dari menu (gunung, kastel, lembah) sebagai lapisan terjauh,
   lalu hutan pinus berkabut, pohon besar, dan jalan tanah hangat seperti panel 36. Semua lapisan dibuat sekali lalu di-cache. */
(function(A){
 const G = A.game;
 let layers = null;

 function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
 function canvas(w, h){ const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

 // ---------- Lapisan terjauh dari ilustrasi menu ----------
 function farLayer(menu){
  const c = canvas(1760, 560), x = c.getContext('2d');
  // Bagian kiri lukisan menu (tanpa ArDhan dan elang) diperbesar dan diberi kabut hangat.
  x.drawImage(menu, 0, 20, 1060, 520, 0, -40, 1760, 863);
  const g = x.createLinearGradient(0, 0, 0, 560);
  g.addColorStop(0, 'rgba(255,236,200,0.10)'); g.addColorStop(0.55, 'rgba(240,220,180,0.18)'); g.addColorStop(1, 'rgba(226,204,160,0.75)');
  x.fillStyle = g; x.fillRect(0, 0, 1760, 560);
  return c;
 }
 // ---------- Hutan pinus berkabut (parallax sedang) ----------
 function pineLayer(){
  const W = 2500, c = canvas(W, 360), x = c.getContext('2d'), r = rng(7);
  for (let row = 0; row < 2; row++) {
   const col = row ? '#3f5947' : '#6c816d', base = row ? 330 : 300;
   x.fillStyle = col;
   for (let px = -30; px < W + 30; px += 18 + r() * 26) {
    const h = (row ? 90 : 60) + r() * 70, w = h * (0.32 + r() * 0.08), top = base - h;
    x.beginPath(); x.moveTo(px, top);
    for (let i = 1; i <= 4; i++) { const yy = top + h * i / 4, ww = w * i / 4; x.lineTo(px + ww * 0.6, yy - h * 0.06); x.lineTo(px + ww * 0.42, yy - h * 0.04); }
    for (let i = 4; i >= 1; i--) { const yy = top + h * i / 4, ww = w * i / 4; x.lineTo(px - ww * 0.42, yy - h * 0.04); x.lineTo(px - ww * 0.6, yy - h * 0.06); }
    x.closePath(); x.fill();
   }
   x.fillRect(0, base - 6, W, 360 - base + 6);
  }
  const g = x.createLinearGradient(0, 120, 0, 360);
  g.addColorStop(0, 'rgba(232,214,176,0)'); g.addColorStop(0.75, 'rgba(232,214,176,0.35)'); g.addColorStop(1, 'rgba(214,190,140,0.6)');
  x.fillStyle = g; x.fillRect(0, 0, W, 360);
  return c;
 }
 // ---------- Pohon pinus/cemara (seperti panel 33 & 35), digambar beresolusi rendah agar berbutir piksel ----------
 function pineSprite(seed, h){
  const r = rng(seed), W = 260, k = 0.5, c = canvas(W * k, h * k), x = c.getContext('2d'), cx = W / 2;
  x.scale(k, k);
  x.fillStyle = '#4a3423'; x.fillRect(cx - 9, h * 0.15, 18, h * 0.85);
  x.fillStyle = '#6b4d32'; x.fillRect(cx + 1, h * 0.2, 6, h * 0.8);
  const tiers = 9 + Math.floor(r() * 3);
  for (let i = 0; i < tiers; i++) {
   const t = i / (tiers - 1), y = h * 0.02 + t * h * 0.74, w = 18 + t * (W * 0.46), th = h * 0.13;
   const tier = (col, shrink, dx) => {
    x.fillStyle = col; x.beginPath(); x.moveTo(cx + dx, y);
    x.lineTo(cx + w * shrink + dx, y + th * 0.95); x.lineTo(cx + w * shrink * 0.55 + dx, y + th * 0.8);
    x.lineTo(cx + w * shrink * 0.3 + dx, y + th); x.lineTo(cx - w * shrink * 0.3 + dx, y + th);
    x.lineTo(cx - w * shrink * 0.6 + dx, y + th * 0.82); x.lineTo(cx - w * shrink + dx, y + th * 0.95); x.closePath(); x.fill();
   };
   tier('#22351f', 1, 0); tier('#33502c', 0.82, 4); tier('#5d7f3c', 0.42, w * 0.32);
  }
  return c;
 }
 // Batang besar yang tajuknya di luar layar (seperti pohon tepi pada panel 36).
 function trunkSprite(seed, h){
  const r = rng(seed), W = 220, k = 0.5, c = canvas(W * k, h * k), x = c.getContext('2d'), cx = W / 2, tw = 44 + r() * 20;
  x.scale(k, k);
  x.fillStyle = '#3f2e1f'; x.beginPath(); x.moveTo(cx - tw, h); x.quadraticCurveTo(cx - tw * 0.5, h - 40, cx - tw * 0.5, h - 90); x.lineTo(cx - tw * 0.42, 0); x.lineTo(cx + tw * 0.42, 0); x.lineTo(cx + tw * 0.5, h - 90); x.quadraticCurveTo(cx + tw * 0.5, h - 40, cx + tw, h); x.closePath(); x.fill();
  x.fillStyle = '#6a4e33'; x.fillRect(cx + tw * 0.08, 0, tw * 0.22, h - 60);
  x.fillStyle = '#2a1e14'; for (let i = 0; i < 14; i++) x.fillRect(cx - tw * 0.36 + r() * tw * 0.6, r() * (h - 80), 4, 18 + r() * 30);
  // Daun menggantung dari atas.
  for (let i = 0; i < 16; i++) { x.fillStyle = r() < 0.5 ? '#2f4a26' : '#56763a'; x.beginPath(); x.arc(cx + (r() - 0.5) * W * 1.1, r() * 70, 22 + r() * 26, 0, 7); x.fill(); }
  return c;
 }
 // ---------- Tanah: jalan tanah hangat dengan kerikil dan rumput tepi ----------
 function groundTile(){
  const W = 1024, H = 200, c = canvas(W, H), x = c.getContext('2d'), r = rng(3);
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#8a6a3c'); g.addColorStop(0.18, '#b98f57'); g.addColorStop(0.6, '#c99d62'); g.addColorStop(1, '#a87d47');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) { x.fillStyle = r() < 0.5 ? 'rgba(90,62,30,0.35)' : 'rgba(236,206,150,0.35)'; x.fillRect(r() * W, 20 + r() * (H - 20), 2 + r() * 3, 2); }
  for (let i = 0; i < 60; i++) { const px = r() * W, py = 30 + r() * (H - 40), s = 3 + r() * 6; x.fillStyle = '#7d6a55'; x.beginPath(); x.ellipse(px, py, s, s * 0.7, 0, 0, 7); x.fill(); x.fillStyle = '#b8a487'; x.fillRect(px - s * 0.4, py - s * 0.5, s * 0.6, 2); }
  // Rumput tepi atas.
  for (let px = 0; px < W; px += 4) {
   const hh = 6 + r() * 16; x.strokeStyle = r() < 0.5 ? '#56702f' : '#7a9440'; x.lineWidth = 2;
   x.beginPath(); x.moveTo(px, 14 + r() * 6); x.lineTo(px + (r() - 0.5) * 6, 14 - hh); x.stroke();
  }
  return c;
 }

 function build(menu){
  const r = rng(42), cfg = G.cfg, trees = [], bushes = [];
  for (let x = -200; x < cfg.worldWidth * 0.65 + 1600; x += 260 + r() * 340) trees.push({ x, trunk: r() < 0.28, v: Math.floor(r() * 3), s: 0.8 + r() * 0.35 });
  for (let x = -100; x < cfg.worldWidth * 1.25 + 1400; x += 260 + r() * 420) bushes.push({ x, s: 0.7 + r() * 0.6, f: r() });
  return { far: farLayer(menu), pines: pineLayer(), ground: groundTile(), pineImgs: [pineSprite(5, 560), pineSprite(9, 650), pineSprite(15, 500)], trunkImgs: [trunkSprite(3, 640), trunkSprite(8, 640), trunkSprite(21, 640)], trees, bushes, motes: Array.from({ length: 26 }, () => ({ x: r() * 1280, y: r() * 520, s: 1 + r() * 2, p: r() * 6 })) };
 }
 G.buildWorldArt = function(menu){ layers = build(menu); };

 // ---------- Burung elang ArDhan yang sesekali melintas ----------
 // Memakai 4 frame kepakan sayap dari pengguna (lihat G.eagleState); siluet lama hanya cadangan bila atlas belum termuat.
 function eagle(x, time){
  const s = G.eagleState(time); if (!s) return;
  if (G.drawFrame(x, s.frame, s.x, s.y, s.flip, s.scale, 1, 0)) return;
  const cycle = 22, t = time % cycle; if (t > 7) return;
  const ex = -120 + t * 220, ey = 120 + Math.sin(t * 1.3) * 26, f = Math.sin(time * 7);
  x.save(); x.translate(ex, ey); x.fillStyle = '#4b3420';
  x.beginPath(); x.moveTo(-26, 0); x.quadraticCurveTo(0, -6, 26, 2); x.quadraticCurveTo(0, 8, -26, 0); x.fill();
  x.beginPath(); x.moveTo(-4, -2); x.quadraticCurveTo(-30, -26 * f - 6, -66, -10 * f); x.lineTo(-10, 4); x.fill();
  x.beginPath(); x.moveTo(4, -2); x.quadraticCurveTo(-18, -20 * f - 4, -40, -8 * f); x.lineTo(8, 4); x.fill();
  x.fillStyle = '#e8dcc0'; x.beginPath(); x.arc(24, -1, 4, 0, 7); x.fill(); x.fillStyle = '#d8a030'; x.fillRect(27, -1, 5, 2);
  x.restore();
 }

 // ================= Latar panorama dari pengguna =================
 // Gambar dipotong mendatar di tepi atas jalan: lapisan "jalan" (jalan + semak depan) bergerak sama cepat
 // dengan karakter, lapisan "latar" (langit, gunung, hutan, pos penjaga) bergerak lebih lambat (parallax).
 // Ubin disusun bolak-balik dicerminkan sehingga sambungannya mulus.
 let pano = null;
 G.loadBackground = async function(retry){
  pano = null;
  for (const src of G.cfg.background.srcs) {
   try { const img = await A.loadImage(src, retry); pano = { img }; break; } catch (e) { /* coba format berikutnya */ }
  }
  if (!pano) { console.info('Latar panorama belum ada di dist/assets/level1/background.(webp|png|jpg); memakai latar cadangan.'); return false; }
  return true;
 };
 // Siapkan potongan lapisan pada resolusi layar saat ini (tanpa memperbesar melebihi gambar asli).
 G.prepareBackground = function(renderScale){
  if (!pano) return;
  const bg = G.cfg.background, img = pano.img, H = G.cfg.view.height;
  const s = H / img.height, prep = Math.min(renderScale || 1, img.height / H);
  const cut = Math.round(img.height * bg.roadTop), feather = Math.max(4, Math.round(img.height * 0.012));
  const mk = (sy, sh) => { const c = canvas(Math.round(img.width * s * prep), Math.round(sh * s * prep)); c.getContext('2d').drawImage(img, 0, sy, img.width, sh, 0, 0, c.width, c.height); return c; };
  const back = mk(0, cut + feather);
  // Tepi bawah lapisan latar dibuat memudar agar menyatu dengan jalan.
  // destination-in menghapus semua yang tidak tertutup isian, jadi gradasi harus menutupi seluruh kanvas:
  // buram penuh sampai sedikit di atas tepi jalan, lalu memudar ke transparan di dasar.
  const bx = back.getContext('2d'), fy = cut * s * prep, g = bx.createLinearGradient(0, 0, 0, back.height);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(Math.max(0, (fy - feather * s * prep) / back.height), 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  bx.globalCompositeOperation = 'destination-in'; bx.fillStyle = g; bx.fillRect(0, 0, back.width, back.height);
  bx.globalCompositeOperation = 'source-over';
  const road = mk(cut - feather, img.height - cut + feather);
  pano.prep = prep; pano.back = back; pano.road = road;
  pano.tileW = img.width * s; pano.roadY = (cut - feather) * s; pano.ground = img.height * bg.ground * s;
  // Geser fase lapisan latar agar pos penjaga (tepi kiri gambar) tepat di tengah layar pada arena postArena.
  const a = G.cfg.arenas[bg.postArena], camAt = a.x + a.w / 2 - G.viewW() / 2;
  pano.phase = 2 * pano.tileW - G.cfg.view.width / 2 - camAt * G.cfg.view.zoom * bg.parallax;
 };
 G.hasPanorama = () => !!(pano && pano.back);
 // Garis pijakan kaki di layar (px logis).
 G.groundScreen = () => G.hasPanorama() ? pano.ground : G.cfg.view.ground;

 function tiles(x, img, offset, y, w, h){
  const W = G.cfg.view.width, i0 = Math.floor(offset / w);
  for (let i = i0; i * w - offset < W; i++) {
   const px = Math.round(i * w - offset);
   if (((i % 2) + 2) % 2) { x.save(); x.translate(px + Math.round(w), y); x.scale(-1, 1); x.drawImage(img, 0, 0, w, h); x.restore(); }
   else x.drawImage(img, px, y, w, h);
  }
 }
 // camS = posisi kamera dalam piksel layar (kamera dunia × zoom).
 G.drawBackground = function(x, camS, time){
  if (!G.hasPanorama()) { drawFallbackBack(x, camS, time); return; }
  const P = pano, k = 1 / P.prep;
  tiles(x, P.road, camS, P.roadY, P.tileW, P.road.height * k);
  tiles(x, P.back, camS * G.cfg.background.parallax + P.phase, 0, P.tileW, P.back.height * k);
  eagle(x, time);
 };
 G.drawForeground = function(x, camS, time){ if (!G.hasPanorama()) drawFallbackFront(x, camS, time); };

 // ================= Latar cadangan (dipakai bila file panorama belum ada) =================
 function drawFallbackBack(x, camX, time){
  const v = G.cfg.view, L = layers; if (!L) return;
  x.fillStyle = '#e9dcc0'; x.fillRect(0, 0, v.width, v.height);
  x.drawImage(L.far, -camX * 0.1, 0);
  eagle(x, time);
  const po = (camX * 0.3) % L.pines.width;
  x.drawImage(L.pines, -po, 210); x.drawImage(L.pines, L.pines.width - po, 210);
  // Pohon lapisan tengah (parallax 0.65).
  for (const t of L.trees) {
   const sx = t.x - camX * 0.65; if (sx < -200 || sx > v.width + 200) continue;
   x.imageSmoothingEnabled = false;
   if (t.trunk) { const img = L.trunkImgs[t.v], w = img.width * 2 * t.s; x.drawImage(img, sx - w / 2, -10, w, v.ground - 40); }
   else { const img = L.pineImgs[t.v], w = img.width * 2 * t.s, h = img.height * 2 * t.s; x.drawImage(img, sx - w / 2, v.ground - 66 - h, w, h); }
   x.imageSmoothingEnabled = true;
  }
  const gy = v.ground - 64, off = ((camX % 1024) + 1024) % 1024;
  for (let px = -off; px < v.width; px += 1024) x.drawImage(L.ground, px, gy, 1024, v.height - gy);
 }
 function drawFallbackFront(x, camX, time){
  const v = G.cfg.view, L = layers; if (!L) return;
  for (const b of L.bushes) {
   const sx = b.x - camX * 1.25; if (sx < -200 || sx > v.width + 200) continue;
   x.fillStyle = b.f < 0.5 ? '#25331a' : '#2f4120';
   for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(sx + (i - 2) * 30 * b.s, v.height + 10 - Math.abs(i - 2) * -6, 44 * b.s - Math.abs(i - 2) * 6, 0, 7); x.fill(); }
  }
 }
})(ARDHAN);
