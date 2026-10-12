/* UI Level 1 (DOM): HUD, tombol sentuh, panel Kertas Jurus, jeda, Level Selesai, Game Over. */
(function(A){
 const G = A.game, T = (k, v) => G.T(k, v), esc = s => A.escape(s);
 const svg = (body, cls = '') => `<svg class="gicon ${cls}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
 G.icons = {
  scroll: svg('<path d="M12 9h24a4 4 0 0 1 4 4v1H16v21a4 4 0 0 1-8 0V13a4 4 0 0 1 4-4Z"/><path d="M16 14v24a4 4 0 0 1-4 4h22a4 4 0 0 0 4-4V14"/><path d="M21 21h12M21 27h12M21 33h8"/>'),
  pause: svg('<path d="M17 12v24M31 12v24" stroke-width="5"/>'),
  fist: svg('<path d="M14 22v-5a3 3 0 0 1 6 0v3m0-4a3 3 0 0 1 6 0v4m0-3a3 3 0 0 1 6 0v4m0-1a3 3 0 0 1 6 0v8c0 7-5 12-12 12h-2c-6 0-10-5-10-10v-6a3 3 0 0 1 6 0"/>'),
  boot: svg('<path d="M15 7h12v17l9 4c3 1 5 4 5 7v4H9V30l6-4Z"/><path d="M9 34h32M27 15h-6M27 20h-6"/>'),
  shield: svg('<path d="M24 6 38 11v11c0 9-6 16-14 20-8-4-14-11-14-20V11Z"/><path d="M24 13v22M17 21h14"/>'),
  dodge: svg('<path d="M30 9a5 5 0 1 1-1 0"/><path d="M14 40c3-6 6-9 11-10l5-6-9-3-6 6"/><path d="M30 24l6 8h7M6 30h6M4 36h7"/>'),
  sword: svg('<path d="M38 6 21 23l4 4L42 10l1-5Z"/><path d="m15 25 8 8M19 29l-9 9M8 36l4 4"/>'),
  left: svg('<path d="M30 10 16 24l14 14" stroke-width="5"/>'),
  right: svg('<path d="m18 10 14 14-14 14" stroke-width="5"/>'),
  up: svg('<path d="M10 30 24 16l14 14" stroke-width="5"/>'),
  close: svg('<path d="M13 13l22 22M35 13 13 35" stroke-width="4"/>')
 };
 const I = G.icons;

 G.gameMarkup = function(){
  const dir = A.direction();
  return `<section class="screen game-screen" data-input="${G.detectInputMode()}">
 <div class="game-stage">
  <canvas class="game-canvas" aria-label="ArDhan The Wanderer · Level 1"></canvas>
  <div class="hud" dir="${dir}">
   <div class="hud-hero">
    <div class="hud-name" dir="ltr">ArDhan</div>
    <div class="bar bar-hp" role="meter" aria-label="${esc(T('hp'))}"><span></span></div>
    <div class="bar bar-st" role="meter" aria-label="${esc(T('stamina'))}"><span></span></div>
    <div class="hud-weapon">${I.fist}<b></b><i></i></div>
   </div>
   <div class="hud-wave"><span class="wave-label"></span><strong class="wave-title"></strong></div>
   <div class="hud-tools" dir="ltr">
    <button class="tool-btn" data-game="guide" aria-label="${esc(T('guide'))}" title="${esc(T('guide'))} (${G.keysFor('guide')[0]})">${I.scroll}</button>
    <button class="tool-btn" data-game="pause" aria-label="${esc(T('pause'))}" title="${esc(T('pause'))} (${G.keysFor('pause')[0]})">${I.pause}</button>
   </div>
   <div class="hud-boss" hidden><span>${esc(T('commander'))}</span><div class="bar bar-boss"><span></span></div></div>
   <div class="hud-combo" aria-live="off"></div>
   <div class="toast-zone" aria-live="polite"></div>
   <div class="banner" hidden></div>
   <div class="go-arrow" hidden><span>${esc(T('go'))}</span>${I.right}</div>
  </div>
 </div>
 <div class="touch-controls" aria-hidden="true" dir="ltr">
  <div class="dpad"><button tabindex="-1" class="ctl ctl-dir" data-ctl="left">${I.left}</button><button tabindex="-1" class="ctl ctl-jump" data-ctl="jump">${I.up}<span>${esc(T('jump'))}</span></button><button tabindex="-1" class="ctl ctl-dir" data-ctl="right">${I.right}</button></div>
  <div class="action-pad">
   <button tabindex="-1" class="ctl ctl-weapon" data-ctl="weapon">${I.sword}<span>${esc(T('weapon'))}</span></button>
   <button tabindex="-1" class="ctl ctl-hand" data-ctl="hand">${I.fist}<span>${esc(T('hand'))}</span></button>
   <button tabindex="-1" class="ctl ctl-foot" data-ctl="foot">${I.boot}<span>${esc(T('foot'))}</span></button>
   <button tabindex="-1" class="ctl ctl-block" data-ctl="block">${I.shield}<span>${esc(T('block'))}</span></button>
   <button tabindex="-1" class="ctl ctl-dodge" data-ctl="dodge">${I.dodge}<span>${esc(T('dodge'))}</span></button>
  </div>
 </div>
 <div class="game-overlay" hidden></div>
 <div class="game-loading" role="status">${A.icon('compass', 'loading-seal')}<p>${esc(T('loading'))}</p></div>
</section>`;
 };

 G.UI = function(session, root){
  this.s = session; this.root = root;
  const q = sel => root.querySelector(sel);
  this.el = { hp: q('.bar-hp span'), st: q('.bar-st span'), weapon: q('.hud-weapon'), wLabel: q('.hud-weapon b'), wDur: q('.hud-weapon i'), waveLabel: q('.wave-label'), waveTitle: q('.wave-title'), boss: q('.hud-boss'), bossBar: q('.bar-boss span'), combo: q('.hud-combo'), toasts: q('.toast-zone'), banner: q('.banner'), go: q('.go-arrow'), overlay: q('.game-overlay'), loading: q('.game-loading'), weaponBtn: q('.ctl-weapon') };
  this.last = {}; this.panel = null;
  root.addEventListener('click', e => {
   const b = e.target.closest('[data-game]'); if (!b || b.disabled) return;
   G.audioUnlock(); G.sfx('ui');
   this.s.command(b.dataset.game);
  });
 };
 const U = G.UI.prototype;
 // Kembalikan HUD ke keadaan awal dan daftarkan pendengar peristiwa game (dipanggil tiap mulai/ulang level).
 U.reset = function(){
  this.last = {}; this.bossRef = null; this.el.boss.hidden = true; this.el.go.hidden = true; this.el.banner.hidden = true;
  this.el.combo.textContent = ''; this.el.toasts.innerHTML = ''; this.closePanel();
  G.on('toast', d => this.toast(T(d.key, { key: G.keysFor('weapon')[0] }), d.tone));
  G.on('wave', d => { this.el.waveLabel.textContent = T('wave', { n: d.index + 1, t: d.total }); this.el.waveTitle.textContent = T(d.title); this.el.go.hidden = true; if (d.index > 0) this.banner(T('wave', { n: d.index + 1, t: d.total }), T(d.title)); G.sfx('horn'); });
  G.on('intro', () => this.banner(T('commander') + ':', '“' + T('shout') + '”', T('objective'), 3.6));
  G.on('clear', () => { this.el.go.hidden = false; });
  G.on('boss', e => { this.bossRef = e; this.el.boss.hidden = false; });
  G.on('combo', n => { this.el.combo.textContent = n + ' HIT'; this.el.combo.classList.remove('pop'); void this.el.combo.offsetWidth; this.el.combo.classList.add('pop'); clearTimeout(this.comboTO); this.comboTO = setTimeout(() => this.el.combo.textContent = '', 1300); });
  G.on('hurt', () => { this.root.classList.remove('hurt-flash'); void this.root.offsetWidth; this.root.classList.add('hurt-flash'); });
  G.on('victory', () => { this.el.boss.hidden = true; this.banner(T('victoryLine'), '', '', 2.4); });
 };
 U.setLoading = function(state){
  const l = this.el.loading;
  if (state === 'done') { l.hidden = true; return; }
  l.hidden = false;
  l.innerHTML = state === 'error' ? `<p>${esc(T('loadError'))}</p><button class="button" data-game="retry-load">${esc(T('retry'))}</button>` : `${A.icon('compass', 'loading-seal')}<p>${esc(T('loading'))}</p>`;
 };
 U.toast = function(text, tone){
  const t = document.createElement('div'); t.className = 'toast ' + (tone || ''); t.textContent = text;
  this.el.toasts.appendChild(t); while (this.el.toasts.children.length > 3) this.el.toasts.firstChild.remove();
  setTimeout(() => t.remove(), 1700);
 };
 U.banner = function(a, b, c, time){
  const el = this.el.banner;
  el.innerHTML = `<span class="b1">${esc(a)}</span>${b ? `<strong class="b2">${esc(b)}</strong>` : ''}${c ? `<span class="b3">${esc(c)}</span>` : ''}`;
  el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(this.bannerTO); this.bannerTO = setTimeout(() => { el.hidden = true; }, (time || 2.2) * 1000);
 };
 // Hanya menulis ke DOM saat nilai berubah agar ringan di HP.
 U.update = function(world){
  const p = world.player, L = this.last;
  const hp = Math.max(0, p.hp / p.maxHp), st = p.stamina / p.maxStamina;
  if (L.hp !== hp) { this.el.hp.style.transform = `scaleX(${hp})`; this.el.hp.parentNode.classList.toggle('low', hp < 0.3); L.hp = hp; }
  const sq = Math.round(st * 50) / 50; if (L.st !== sq) { this.el.st.style.transform = `scaleX(${sq})`; L.st = sq; }
  const wkey = (p.armed ? 'a' : 'u') + (p.weapon ? p.weapon.dur : '-');
  if (L.w !== wkey) {
   L.w = wkey;
   this.el.weapon.querySelector('svg').outerHTML = p.armed ? G.icons.sword : G.icons.fist;
   this.el.wLabel.textContent = T(p.armed ? 'sword' : 'unarmed');
   this.el.wDur.textContent = p.weapon && G.cfg.useDurability ? `${p.weapon.dur}/${p.weapon.max}` : '';
   this.el.weapon.classList.toggle('carrying', !!p.weapon && !p.armed);
   this.el.weaponBtn.classList.toggle('disabled', !p.weapon && !world.pickupNear(p));
   this.el.weaponBtn.classList.toggle('active', p.armed);
  }
  const near = !!(p.weapon && world.pickupNear(p));
  if (L.near !== near) { L.near = near; if (near) this.toast(T('swapHint', { key: this.s.input.mode === 'touch' ? T('weapon') : G.keysFor('weapon')[0] })); this.el.weaponBtn.classList.toggle('disabled', !p.weapon && !near); }
  if (this.bossRef) { const b = Math.max(0, this.bossRef.hp / this.bossRef.maxHp); if (L.boss !== b) { this.el.bossBar.style.transform = `scaleX(${b})`; L.boss = b; } }
 };

 // ---------- Panel ----------
 U.closePanel = function(){ this.el.overlay.hidden = true; this.el.overlay.innerHTML = ''; this.panel = null; this.root.classList.remove('panel-open'); };
 U.openPanel = function(kind, html){ this.panel = kind; this.root.classList.add('panel-open'); this.el.overlay.hidden = false; this.el.overlay.innerHTML = html; const f = this.el.overlay.querySelector('[data-focus]') || this.el.overlay.querySelector('button'); if (f) f.focus({ preventScroll: true }); };
 const btn = (label, cmd, cls = 'button', extra = '') => `<button class="${cls}" data-game="${cmd}" ${extra}>${esc(label)}</button>`;

 U.showPause = function(){
  this.openPanel('pause', `<div class="parchment game-panel pause-panel" dir="${A.direction()}" role="dialog" aria-modal="true" aria-label="${esc(T('paused'))}">
   <h2>${esc(T('paused'))}</h2>${A.rule()}
   <div class="panel-actions">${btn(T('resume'), 'resume', 'button button-primary', 'data-focus')}${btn(T('guide'), 'guide', 'button button-secondary')}${btn(T('restart'), 'restart', 'button button-secondary')}${btn(T('quit'), 'quit', 'button button-secondary')}</div></div>`);
 };
 U.showEnd = function(win, stats){
  const best = A.state.level1Best;
  const rows = win ? `<dl class="stats"><div><dt>${esc(T('time'))}</dt><dd dir="ltr">${G.formatTime(stats.time)}</dd></div><div><dt>${esc(T('defeated'))}</dt><dd dir="ltr">${stats.kills}</dd></div><div><dt>${esc(T('hpLeft'))}</dt><dd dir="ltr">${stats.hpLeft}/${G.cfg.player.hp}</dd></div>${best ? `<div><dt>${esc(T('best'))}</dt><dd dir="ltr">${G.formatTime(best)}</dd></div>` : ''}</dl>` : `<p class="end-detail">${esc(T('gameOverDetail'))}</p>`;
  const next = win ? `<button class="button button-primary" data-game="next" disabled aria-disabled="true">${esc(T('next'))}<small>${esc(T('soon'))}</small></button>` : '';
  this.openPanel(win ? 'complete' : 'gameover', `<div class="parchment game-panel end-panel ${win ? 'win' : 'lose'}" dir="${A.direction()}" role="dialog" aria-modal="true">
   <p class="eyebrow" dir="ltr">ArDhan The Wanderer · Level 1</p><h2>${esc(T(win ? 'complete' : 'gameOver'))}</h2>${A.rule()}${rows}
   <div class="panel-actions">${next}${btn(T('restart'), 'restart', win ? 'button button-secondary' : 'button button-primary', 'data-focus')}${btn(T('quit'), 'quit', 'button button-secondary')}</div></div>`);
 };

 // ---------- Kertas Jurus: isi mengikuti perangkat aktif dan config ----------
 U.showGuide = function(){
  const touch = this.s.input.mode === 'touch', cfg = G.cfg;
  const key = a => touch ? `<span class="chip">${esc(T(a))}</span>` : G.keysFor(a).map(k => `<kbd>${esc(k)}</kbd>`).join(' ');
  const dirKey = a => `<kbd>${esc(G.keysFor(a)[G.keysFor(a).length > 1 ? 1 : 0])}</kbd>`;   // mis. A / D
  const seq = s => s.split('').map(c => key(c === 'J' ? 'hand' : 'foot')).join('<span class="arrow">→</span>');
  const moveRow = (name, input) => `<li><span class="mv">${esc(T(name))}</span><span class="in">${input}</span></li>`;
  const comboList = set => cfg.guideCombos[set].map(([s, nm]) => `<li><span class="mv"><b>${esc(T(nm))}</b><small>${s.split('').map((c, i) => esc(T(cfg.combos[set][s.slice(0, i + 1)] || ''))).join(' → ')}</small></span><span class="in">${seq(s)}</span></li>`).join('');
  const run = (set, k) => `<small>${esc(T('runAttack'))}</small> + ${key(k)}`;
  const basics = touch
   ? `<ul class="plain"><li>${esc(T('touch1'))}</li><li>${esc(T('touch2'))}</li><li>${esc(T('touch3'))}</li><li>${esc(T('touch4'))}</li><li>${esc(T('touch5'))}</li></ul>`
   : `<p>${esc(T('keysIntro'))}</p><ul class="keys">${[['actMove', 'left'], ['actJump', 'jump'], ['actHand', 'hand'], ['actFoot', 'foot'], ['actBlock', 'block'], ['actDodge', 'dodge'], ['actWeapon', 'weapon'], ['actGuide', 'guide'], ['actPause', 'pause'], ['actClose', 'close']].map(([lbl, a]) => `<li><span>${esc(T(lbl))}</span><span>${a === 'left' ? G.keysFor('left').concat(G.keysFor('right')).map(k => `<kbd>${esc(k)}</kbd>`).join(' ') : G.keysFor(a).map(k => `<kbd>${esc(k)}</kbd>`).join(' ')}</span></li>`).join('')}</ul>`;
  const dur = cfg.useDurability ? T('swordDur', { n: cfg.weapons.sword.durability }) : T('swordDurOff');
  const html = `<div class="scroll-panel" dir="${A.direction()}" role="dialog" aria-modal="true" aria-labelledby="guide-title">
   <div class="scroll-rod top" aria-hidden="true"></div>
   <div class="scroll-paper">
    <header><h2 id="guide-title">${I.scroll}${esc(T('guideTitle'))}</h2><span class="mode-chip">${esc(T(touch ? 'modeTouch' : 'modeKeys'))}</span>
     <button class="close-btn" data-game="close-guide" aria-label="${esc(T('close'))}" data-focus>${I.close}<span>${esc(T('close'))}</span></button></header>
    <div class="scroll-body" tabindex="0">
     <section><h3>1 · ${esc(T('basics'))}</h3><p class="lead">${esc(T('tapRun'))}</p>${basics}
      <h4>${esc(T('moveSection'))}</h4><ul class="moves">
       <li><span class="mv">${esc(T('jump'))}<small>${esc(T('btnJump'))}</small></span><span class="in">${key('jump')}</span></li>
       <li><span class="mv">${esc(T('jumpKick'))}</span><span class="in">${key('jump')}<span class="arrow">→</span>${key('foot')}<small>(${esc(T('inAir'))})</small></span></li>
       <li><span class="mv">${esc(T('dash'))}<small>${esc(T('btnDash'))}</small></span><span class="in">${touch ? `<span class="chip">◀ ◀</span> / <span class="chip">▶ ▶</span>` : `${dirKey('left')} ${dirKey('left')} / ${dirKey('right')} ${dirKey('right')}`}</span></li>
      </ul></section>
     <section><h3>2 · ${esc(T('fists'))}</h3>
      <ul class="moves"><li><span class="mv">${esc(T('hand'))}<small>${esc(T('btnHandBare'))}</small></span><span class="in">${key('hand')}</span></li><li><span class="mv">${esc(T('foot'))}<small>${esc(T('btnFootBare'))}</small></span><span class="in">${key('foot')}</span></li>
      <li><span class="mv">${esc(T('block'))}<small>${esc(T('btnBlock'))}</small></span><span class="in">${key('block')}</span></li><li><span class="mv">${esc(T('dodge'))}<small>${esc(T('btnDodge'))}</small></span><span class="in">${key('dodge')}</span></li>
      ${moveRow('dashKick', run('unarmed', 'foot'))}</ul>
      <h4>${esc(T('combos'))}</h4><ul class="moves combos">${comboList('unarmed')}</ul></section>
     <section><h3>3 · ${esc(T('blade'))}</h3>
      <ul class="plain"><li>${esc(T('swordGet'))}</li><li>${esc(T('swordSwap'))}</li><li>${esc(T('swordSwitch', { key: touch ? T('weapon') : G.keysFor('weapon')[0] }))}</li><li>${esc(dur)}</li></ul>
      <ul class="moves"><li><span class="mv">${esc(T('hand'))}<small>${esc(T('btnHandSword'))}</small></span><span class="in">${key('hand')}</span></li><li><span class="mv">${esc(T('foot'))}<small>${esc(T('btnFootSword'))}</small></span><span class="in">${key('foot')}</span></li>
      <li><span class="mv">${esc(T('block'))}<small>${esc(T('btnBlockSword'))}</small></span><span class="in">${key('block')}</span></li><li><span class="mv">${esc(T('dodge'))}<small>${esc(T('btnDodge'))}</small></span><span class="in">${key('dodge')}</span></li>
      ${moveRow('dashSlash', run('sword', 'hand'))}${moveRow('dashKick', run('sword', 'foot'))}
      <li><span class="mv">${esc(T('cleave'))}</span><span class="in">${key('jump')}<span class="arrow">→</span>${key('hand')}<small>(${esc(T('inAir'))})</small></span></li>
      <li><span class="mv">${esc(T('jumpKick'))}</span><span class="in">${key('jump')}<span class="arrow">→</span>${key('foot')}<small>(${esc(T('inAir'))})</small></span></li></ul>
      <h4>${esc(T('combos'))}</h4><ul class="moves combos">${comboList('sword')}</ul></section>
     <section><h3>4 · ${esc(T('tips'))}</h3><ul class="plain tips">${['tip1', 'tip2', 'tip3', 'tip4', 'tip5', 'tip6'].map(k => `<li>${esc(T(k, { n: cfg.ai.maxAttackers }))}</li>`).join('')}</ul></section>
    </div>
   </div>
   <div class="scroll-rod bottom" aria-hidden="true"></div>
  </div>`;
  this.openPanel('guide', html);
 };
})(ARDHAN);
