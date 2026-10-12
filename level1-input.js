/* Input Level 1: deteksi perangkat, keyboard, tombol sentuh multi-touch.
   Gerak: tap arah sekali = jalan pelan terus, tap arah lagi = berhenti, tahan = lari (berhenti saat dilepas),
   tap arah yang sama dua kali cepat = dash. Logika (press/release/intent) terpisah dari DOM agar bisa diuji. */
(function(A){
 const G = A.game;
 const ACTIONS = ['left', 'right', 'jump', 'hand', 'foot', 'block', 'dodge', 'weapon'];
 const DIRS = { left: -1, right: 1 };

 // Deteksi awal: kombinasi media query, dukungan sentuh, dan ukuran layar.
 G.detectInputMode = function(){
  if (typeof window === 'undefined' || !window.matchMedia) return 'keyboard';
  const coarse = matchMedia('(pointer: coarse)').matches, noHover = matchMedia('(hover: none)').matches;
  const touch = (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
  const small = Math.min(screen.width || 9999, screen.height || 9999) <= 820;
  return touch && (coarse || noHover || small) ? 'touch' : 'keyboard';
 };

 G.Input = function(mode){
  this.mode = mode || 'keyboard';
  this.held = {}; ACTIONS.forEach(a => this.held[a] = false);
  this.queue = [];          // tekanan tombol yang menunggu diproses (buffer)
  this.dirOrder = [];       // arah yang sedang ditahan, urutan tekan
  this.pressT = {};         // waktu mulai tekan per arah
  this.autoDir = 0;         // arah jalan pelan otomatis (0 = berhenti)
  this.lastTap = { dir: 0, t: -9 };
  this.dashDir = 0;
  this.now = 0;             // detik, dimajukan oleh game
  this.onUI = null; this.onMode = null;
 };
 const P = G.Input.prototype;
 const holdSec = () => G.cfg.input.holdToRunMs / 1000;
 P.press = function(action){
  if (!ACTIONS.includes(action) || this.held[action]) return;
  this.held[action] = true;
  const d = DIRS[action];
  if (!d) { this.queue.push({ action, t: this.now }); return; }
  this.dirOrder = this.dirOrder.filter(a => a !== action); this.dirOrder.push(action);
  this.pressT[action] = this.now;
  if (this.lastTap.dir === d && this.now - this.lastTap.t <= G.cfg.input.dashWindowMs / 1000) {
   // Tap kedua yang cepat ke arah yang sama = dash.
   this.dashDir = d; this.autoDir = 0; this.lastTap = { dir: 0, t: -9 };
   this.queue.push({ action: 'dash', t: this.now });
   return;
  }
  this.lastTap = { dir: d, t: this.now };
  // Tap pertama mulai berjalan; tap berikutnya (arah mana pun) menghentikan.
  this.autoDir = this.autoDir ? 0 : d;
 };
 P.release = function(action){
  if (!this.held[action]) return;
  this.held[action] = false;
  if (!DIRS[action]) return;
  this.dirOrder = this.dirOrder.filter(a => a !== action);
  // Setelah lari (tombol ditahan), melepas tombol membuat ArDhan berhenti.
  if (this.now - (this.pressT[action] || 0) >= holdSec()) this.autoDir = 0;
 };
 P.stopWalk = function(){ this.autoDir = 0; };
 P.releaseAll = function(){ ACTIONS.forEach(a => this.release(a)); this.autoDir = 0; this.lastTap = { dir: 0, t: -9 }; };
 // Arah gerak saat ini: dir (-1/0/1) dan run (true jika tombol arah ditahan melewati ambang).
 P.intent = function(){
  const last = this.dirOrder[this.dirOrder.length - 1];
  if (last && this.now - this.pressT[last] >= holdSec()) return { dir: DIRS[last], run: true };
  if (this.autoDir) return { dir: this.autoDir, run: false };
  return { dir: 0, run: false };
 };
 // Ambil tekanan tertua untuk salah satu aksi (dalam jendela buffer).
 P.take = function(actions){
  const limit = G.cfg.input.bufferTime;
  this.queue = this.queue.filter(e => this.now - e.t <= limit);
  const i = this.queue.findIndex(e => actions.includes(e.action));
  if (i < 0) return null;
  return this.queue.splice(i, 1)[0].action;
 };
 P.peek = function(actions){ const limit = G.cfg.input.bufferTime; return this.queue.some(e => actions.includes(e.action) && this.now - e.t <= limit); };
 P.setMode = function(mode){ if (mode === this.mode) return; this.mode = mode; if (this.onMode) this.onMode(mode); };

 // ---------- Penghubung DOM ----------
 P.attach = function(root){
  const map = {};
  for (const action in G.cfg.keys) for (const code of G.cfg.keys[action]) map[code] = action;
  const uiActions = ['guide', 'pause', 'close'];
  this._keydown = e => {
   if (e.altKey || e.ctrlKey || e.metaKey) return;
   const action = map[e.code];
   this.setMode('keyboard');
   if (!action) return;
   e.preventDefault();
   G.audioUnlock();
   if (uiActions.includes(action)) { if (!e.repeat && this.onUI) this.onUI(action); return; }
   if (!e.repeat) this.press(action);
  };
  this._keyup = e => { const action = map[e.code]; if (action && !uiActions.includes(action)) this.release(action); };
  this._blur = () => this.releaseAll();
  window.addEventListener('keydown', this._keydown);
  window.addEventListener('keyup', this._keyup);
  window.addEventListener('blur', this._blur);

  // Tombol sentuh: satu lapisan menangani semua jari, sehingga jari bisa digeser antartombol.
  const pad = root.querySelector('.touch-controls');
  const owners = new Map();
  const ctlAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest ? el.closest('[data-ctl]') : null; };
  const setPressed = (el, on) => { if (el) el.classList.toggle('pressed', on); };
  const down = e => {
   if (e.pointerType === 'touch' || e.pointerType === 'pen') this.setMode('touch');
   const el = e.target.closest('[data-ctl]'); if (!el) return;
   e.preventDefault(); G.audioUnlock();
   try { pad.setPointerCapture(e.pointerId); } catch (err) { /* abaikan */ }
   owners.set(e.pointerId, el); setPressed(el, true); this.press(el.dataset.ctl);
   if (navigator.vibrate && !DIRS[el.dataset.ctl] && navigator.userActivation && navigator.userActivation.hasBeenActive) try { navigator.vibrate(8); } catch (err) { /* abaikan */ }
  };
  const move = e => {
   if (!owners.has(e.pointerId)) return;
   const old = owners.get(e.pointerId), el = ctlAt(e.clientX, e.clientY);
   if (el === old || !el) return;
   // Geser jari ke tombol lain: lepaskan yang lama hanya jika tidak ada jari lain di sana.
   owners.set(e.pointerId, el);
   if (![...owners.values()].includes(old)) { setPressed(old, false); this.release(old.dataset.ctl); }
   setPressed(el, true); this.press(el.dataset.ctl);
  };
  const up = e => {
   const el = owners.get(e.pointerId); if (!el) return;
   owners.delete(e.pointerId);
   if (![...owners.values()].includes(el)) { setPressed(el, false); this.release(el.dataset.ctl); }
  };
  pad.addEventListener('pointerdown', down); pad.addEventListener('pointermove', move);
  pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up); pad.addEventListener('lostpointercapture', up);
  // Sentuhan di mana pun pada layar game mengaktifkan mode sentuh (perangkat hybrid).
  this._anyPointer = e => { if (e.pointerType === 'touch' || e.pointerType === 'pen') this.setMode('touch'); };
  root.addEventListener('pointerdown', this._anyPointer, true);
  // Cegah zoom/scroll/seleksi tidak sengaja selama bermain.
  this._noGesture = e => e.preventDefault();
  root.addEventListener('gesturestart', this._noGesture);
  root.addEventListener('dblclick', this._noGesture);
  root.addEventListener('contextmenu', this._noGesture);
  this._root = root;
  this._mq = window.matchMedia ? matchMedia('(pointer: coarse)') : null;
  this._mqChange = () => this.setMode(G.detectInputMode());
  if (this._mq && this._mq.addEventListener) this._mq.addEventListener('change', this._mqChange);
 };
 P.detach = function(){
  window.removeEventListener('keydown', this._keydown);
  window.removeEventListener('keyup', this._keyup);
  window.removeEventListener('blur', this._blur);
  if (this._mq && this._mq.removeEventListener) this._mq.removeEventListener('change', this._mqChange);
  this.releaseAll();
 };
})(ARDHAN);
