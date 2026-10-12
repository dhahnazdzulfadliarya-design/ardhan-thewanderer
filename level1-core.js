/* Inti Level 1: utilitas, teks, efek suara sintetis, dan partikel.
   Modul game memakai namespace ARDHAN.game (G). Tidak ada akses DOM saat file dimuat,
   sehingga logika pertarungan bisa diuji tanpa browser (lihat tests/level1-logic.cjs). */
window.ARDHAN = window.ARDHAN || {};
(function(A){
 const G = A.game = A.game || {};
 G.cfg = A.L1CONFIG;

 // ---------- Utilitas ----------
 G.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
 G.lerp = (a, b, t) => a + (b - a) * t;
 G.approach = (v, target, step) => v < target ? Math.min(target, v + step) : Math.max(target, v - step);
 G.rand = (a, b) => a + Math.random() * (b - a);
 G.pick = list => list[Math.floor(Math.random() * list.length)];
 G.smooth = t => t * t * (3 - 2 * t);
 // Lebar dunia yang terlihat kamera (satuan karakter). zoom < 1 = kamera menjauh, karakter tampak lebih kecil.
 G.viewW = () => G.cfg.view.width / G.cfg.view.zoom;
 G.formatTime = s => { const m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ':' + String(r).padStart(2, '0'); };

 // ---------- Teks ----------
 G.lang = () => (A.state && A.L1TEXT[A.state.language]) ? A.state.language : 'id';
 G.T = (key, vars) => {
  let s = (A.L1TEXT[G.lang()] || A.L1TEXT.id)[key];
  if (s === undefined) s = A.L1TEXT.id[key] !== undefined ? A.L1TEXT.id[key] : key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
 };
 // Nama tombol keyboard yang mudah dibaca, diambil dari config.keys.
 G.keyLabel = code => {
  const named = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: G.T('space'), Escape: G.T('esc'), Enter: 'Enter', ShiftLeft: 'Shift', ShiftRight: 'Shift' };
  if (named[code]) return named[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
 };
 G.keysFor = action => (G.cfg.keys[action] || []).map(G.keyLabel);

 // ---------- Pesan ke UI (HUD mendengarkan lewat G.on) ----------
 const listeners = {};
 G.on = (name, fn) => { (listeners[name] = listeners[name] || []).push(fn); };
 G.off = name => { delete listeners[name]; };
 G.emit = (name, data) => { (listeners[name] || []).forEach(fn => fn(data)); };

 // ---------- Efek suara sintetis (WebAudio, tanpa file) ----------
 // Volume mengikuti "Volume efek suara" di Pengaturan. AudioContext baru dibuat setelah sentuhan/tombol pertama.
 let ac = null, master = null, noise = null;
 G.audioUnlock = () => {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  try {
   ac = new AC(); master = ac.createGain(); master.connect(ac.destination);
   noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
   const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { ac = null; }
 };
 function env(node, t, peak, attack, decay) {
  node.gain.setValueAtTime(0.0001, t); node.gain.exponentialRampToValueAtTime(peak, t + attack);
  node.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
 }
 function tone(type, f0, f1, dur, peak, delay = 0) {
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  env(g, t, peak, 0.005, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
 }
 function hiss(filterType, f0, f1, dur, peak, q = 1, delay = 0) {
  const t = ac.currentTime + delay, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noise; f.type = filterType; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
  env(g, t, peak, 0.004, dur); s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
 }
 const SFX = {
  swing: () => hiss('bandpass', 1400, 380, 0.13, 0.22, 1.2),
  whoosh: () => hiss('bandpass', 900, 260, 0.24, 0.3, 0.9),
  slash: () => { hiss('highpass', 5200, 1800, 0.16, 0.26, 0.8); hiss('bandpass', 2400, 900, 0.1, 0.12, 2); },
  slashHeavy: () => { hiss('highpass', 4200, 900, 0.26, 0.34, 0.7); tone('sawtooth', 160, 50, 0.22, 0.12); },
  punch: () => { tone('sine', 150, 55, 0.12, 0.55); hiss('lowpass', 2400, 400, 0.05, 0.28); },
  kick: () => { tone('sine', 120, 45, 0.15, 0.6); hiss('lowpass', 1800, 300, 0.06, 0.3); },
  punchHeavy: () => { tone('sine', 110, 38, 0.2, 0.7); hiss('lowpass', 1600, 200, 0.12, 0.36); },
  swordHit: () => { [620, 931, 1393].forEach((f, i) => tone('square', f, f * 0.97, 0.18 - i * 0.03, 0.06)); hiss('highpass', 6000, 3000, 0.08, 0.2); tone('sine', 140, 60, 0.1, 0.35); },
  block: () => { tone('triangle', 240, 110, 0.09, 0.4); hiss('bandpass', 1200, 600, 0.05, 0.2, 3); },
  clang: () => { [880, 1320, 1975].forEach((f, i) => tone('triangle', f, f * 0.99, 0.35 - i * 0.07, 0.11)); hiss('highpass', 7000, 4000, 0.06, 0.18); },
  parry: () => { tone('sine', 1500, 1450, 0.4, 0.22); tone('sine', 2250, 2200, 0.32, 0.12); hiss('highpass', 8000, 5000, 0.06, 0.14); },
  hurt: () => { tone('square', 280, 110, 0.14, 0.07); tone('sine', 180, 70, 0.16, 0.4); },
  down: () => { hiss('lowpass', 900, 120, 0.3, 0.5); tone('sine', 90, 40, 0.25, 0.5); },
  pickup: () => [660, 880, 1320].forEach((f, i) => tone('sine', f, f, 0.12, 0.18, i * 0.06)),
  break: () => { hiss('highpass', 5000, 800, 0.35, 0.4); tone('square', 900, 200, 0.3, 0.08); },
  dodge: () => hiss('bandpass', 700, 1600, 0.14, 0.18, 1),
  horn: () => { tone('sawtooth', 110, 112, 0.7, 0.07); tone('sawtooth', 165, 166, 0.7, 0.05); },
  victory: () => [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.32, 0.16, i * 0.12)),
  defeat: () => [392, 330, 262, 196].forEach((f, i) => tone('triangle', f, f * 0.98, 0.3, 0.14, i * 0.16)),
  eagle: () => { tone('sine', 2100, 1500, 0.35, 0.07); tone('sine', 2300, 1700, 0.25, 0.04, 0.12); },
  ui: () => tone('sine', 880, 880, 0.05, 0.1)
 };
 G.sfx = name => {
  if (!ac || !SFX[name]) return;
  const vol = A.state ? A.state.effects / 100 : 0.75;
  if (vol <= 0) return;
  master.gain.value = vol * 0.8;
  try { SFX[name](); } catch (e) { /* audio tidak wajib */ }
 };

 // ---------- Partikel ringan (array tetap kecil) ----------
 G.Particles = function(){ this.list = []; };
 G.Particles.prototype.add = function(p){ if (this.list.length < 140) this.list.push(p); };
 G.Particles.prototype.burst = function(x, y, kind, dir){
  const n = kind === 'spark' ? 9 : kind === 'dust' ? 7 : 6;
  for (let i = 0; i < n; i++) {
   const a = kind === 'dust' ? G.rand(Math.PI * 0.95, Math.PI * 2.05) : G.rand(0, Math.PI * 2);
   const sp = kind === 'spark' ? G.rand(220, 520) : kind === 'dust' ? G.rand(40, 140) : G.rand(120, 320);
   this.add({ kind, x, y, vx: Math.cos(a) * sp + (dir || 0) * 80, vy: Math.sin(a) * sp * (kind === 'dust' ? 0.35 : 1), life: 0, max: kind === 'dust' ? G.rand(0.4, 0.7) : G.rand(0.18, 0.34), size: kind === 'dust' ? G.rand(10, 22) : G.rand(2, 4) });
  }
 };
 G.Particles.prototype.update = function(dt){
  const out = [];
  for (const p of this.list) {
   p.life += dt; if (p.life >= p.max) continue;
   p.x += p.vx * dt; p.y += p.vy * dt;
   if (p.kind === 'dust') { p.vx *= 0.92; p.vy *= 0.92; p.size += 20 * dt; } else if (p.kind !== 'text') p.vy += 600 * dt; else p.y -= 40 * dt;
   out.push(p);
  }
  this.list = out;
 };
})(ARDHAN);
