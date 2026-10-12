/* =====================================================================
   KONFIGURASI LEVEL 1 — semua angka keseimbangan ada di sini.
   Ubah nilai di file ini saja; panduan "Kertas Jurus" ikut menyesuaikan.
   Satuan: waktu = detik, jarak = piksel logis (layar 1280 × 720),
   kecepatan = piksel/detik. Kotak serang [x1, x2, y1, y2]:
   x diukur ke arah hadap dari tengah badan, y = tinggi dari tanah.
   ===================================================================== */
window.ARDHAN = window.ARDHAN || {};
ARDHAN.L1CONFIG = {
 // ---------- Kontrol keyboard (pakai KeyboardEvent.code, tidak terpengaruh layout) ----------
 keys: {
  left:   ['ArrowLeft', 'KeyA'],
  right:  ['ArrowRight', 'KeyD'],
  jump:   ['KeyW', 'ArrowUp'],
  hand:   ['KeyJ'],
  foot:   ['KeyK'],
  block:  ['KeyL'],
  dodge:  ['Space', 'ArrowDown', 'KeyS'],
  weapon: ['KeyQ'],
  guide:  ['KeyH'],
  pause:  ['KeyP'],
  close:  ['Escape']
 },
 // Gerak: tap A/D sekali = jalan pelan terus; tap A/D lagi = berhenti; tahan = lari; tap dua kali cepat = dash.
 input: {
  holdToRunMs: 230,   // tahan arah lebih lama dari ini = lari (berhenti saat dilepas)
  dashWindowMs: 260,  // dua tap arah yang sama dalam waktu ini = dash
  bufferTime: 0.2     // tombol serang yang ditekan sedikit lebih awal tetap tercatat
 },
 // zoom < 1 = kamera menjauh: semua karakter tampak lebih kecil dan area yang terlihat lebih luas.
 // Semua jarak/kecepatan/kotak serang tetap dalam satuan karakter, jadi keseimbangan tidak berubah.
 view: { width: 1280, height: 720, ground: 594, zoom: 0.62, maxDpr: 2, heroHeight: 236, soldierHeight: 234, soldierPixelScale: 0.55 },
 // Latar panorama (dist/assets/level1/background.png; .webp/.jpg juga diterima).
 // roadTop/ground = posisi tepi atas jalan dan garis pijakan kaki, sebagai pecahan tinggi gambar.
 // Bagian di atas jalan bergeser lebih lambat (parallax) agar terasa berkedalaman; pos penjaga muncul di arena postArena.
 background: { srcs: ['background.png', 'background.webp', 'background.jpg'], roadTop: 0.703, ground: 0.765, parallax: 0.5, postArena: 1 },

 // ---------- ArDhan ----------
 player: {
  hp: 100, stamina: 100, staminaRegen: 30, staminaDelay: 0.7,
  walkSpeed: 150, runSpeed: 345, accel: 2400, friction: 2000,
  hurt: { w: 60, h: 214, crouchH: 128 },
  dodge: { time: 0.42, iframes: [0.02, 0.32], speed: 430, cost: 20, duckChance: 0.5 },   // duckChance = peluang menunduk (sisanya mengelak ke belakang)
  jump: { vz: 880, gravity: 2500, takeoff: 0.06, land: 0.1, airSpeed: 260, airControl: 900 },
  dash: { speed: 760, time: 0.32, cost: 8, cancel: 0.12 },
  block: { parryWindow: 0.18, chip: 0.25, stamina: 14 },
  calmDelay: 0.8,   // detik tanpa musuh sebelum ArDhan berdiri santai
  hitStun: 0.34, downTime: 0.7, getupTime: 0.4, invulnAfterGetup: 0.9,
  comboWindow: 0.45, pickupTime: 0.28
 },

 // ---------- Jurus ----------
 // frames: [namaFrame, durasi]; active: jendela kotak serang aktif; cancel: kapan jurus berikutnya boleh mulai.
 // lunge: [kecepatan, durasi] maju; heavy: memecah tangkisan; down: menjatuhkan lawan.
 moves: {
  // Tombol J tangan kosong: tiap tekan memunculkan gambar berikutnya (j1 → j5), lalu kembali ke j1.
  // Kotak serang mengikuti jangkauan kepalan/siku pada gambar (diukur dari atlas, + sedikit kelonggaran).
  j1:       { frames: [['j1', .16], ['ready', .06]], active: [.03, .12], cancel: .1,  dmg: 6,  box: [0, 110, 135, 215], knock: 130, stun: .32, lunge: [70, .08], sfx: 'punch' },
  j2:       { frames: [['j2', .15], ['ready', .06]], active: [.03, .11], cancel: .1,  dmg: 6,  box: [0, 130, 135, 215], knock: 130, stun: .32, lunge: [60, .08], sfx: 'punch' },
  j3:       { frames: [['j3', .17], ['ready', .07]], active: [.04, .13], cancel: .12, dmg: 8,  box: [0, 130, 135, 215], knock: 170, stun: .34, lunge: [90, .1], sfx: 'punch' },
  j4:       { frames: [['j4', .2], ['ready', .08]],  active: [.05, .15], cancel: .15, dmg: 10, box: [-10, 90, 145, 232], knock: 240, stun: .42, heavy: true, lunge: [110, .1], sfx: 'punchHeavy' },
  j5:       { frames: [['j5', .26], ['ready', .1]],  active: [.05, .18], cancel: .3,  dmg: 14, box: [0, 110, 115, 250], knock: 360, stun: .5, down: true, heavy: true, lunge: [80, .1], sfx: 'punchHeavy' },
  // Tombol K tangan kosong: K ×5 = Tendangan Rendah → Lutut → Tendangan Tinggi → Tendangan Putar → Tendangan Badan.
  // Kotak serang mengikuti jangkauan kaki/lutut pada gambar (diukur dari atlas, + sedikit kelonggaran).
  kickLow:  { frames: [['kneeUp', .06], ['kickLow', .16], ['ready', .08]], active: [.07, .17], cancel: .16, dmg: 7,  box: [10, 145, 30, 120], knock: 150, stun: .32, sfx: 'kick', kick: true },
  knee:     { frames: [['kneeUp', .08], ['knee', .16], ['ready', .08]], active: [.08, .18], cancel: .17, dmg: 10, box: [0, 110, 95, 180], knock: 130, stun: .42, lunge: [110, .1], sfx: 'kick', kick: true },
  kickHigh: { frames: [['kneeUp', .08], ['kickHigh', .22], ['ready', .1]], active: [.09, .22], cancel: .2, dmg: 12, box: [10, 155, 135, 220], knock: 220, stun: .45, heavy: true, sfx: 'kick', kick: true },
  kickSpin: { frames: [['kneeUp', .07], ['kickSpin', .2], ['ready', .08]], active: [.08, .22], cancel: .2, dmg: 12, box: [0, 130, 140, 230], knock: 240, stun: .45, heavy: true, sfx: 'punchHeavy', whoosh: true, kick: true },
  kickBody: { frames: [['kneeUp', .07], ['kickBody', .24], ['ready', .1]], active: [.08, .25], cancel: .32, dmg: 16, box: [10, 165, 100, 185], knock: 380, stun: .5, down: true, heavy: true, sfx: 'punchHeavy', kick: true },
  dashKick: { frames: [['kneeUp', .05], ['kickLow', .24], ['ready', .08]], active: [.06, .25], cancel: .3, dmg: 11, box: [10, 150, 30, 125], knock: 310, stun: .5, down: true, lunge: [430, .2], sfx: 'kick', kick: true },
  // --- pedang ---
  slash1:   { frames: [['swBlock', .06], ['swSlashR', .18], ['swStance', .07]], active: [.06, .18], cancel: .15, dmg: 14, box: [0, 218, 60, 232], knock: 180, stun: .36, sfx: 'slash', trail: 1 },
  slash2:   { frames: [['swSlashL', .2], ['swStance', .08]], active: [.02, .14], cancel: .14, dmg: 14, box: [-20, 205, 60, 232], knock: 200, stun: .36, sfx: 'slash', trail: -1 },
  slash3:   { frames: [['swCrouch', .08], ['swSlashUp', .24], ['swStance', .1]], active: [.08, .22], cancel: .3, dmg: 20, box: [0, 195, 30, 262], knock: 260, stun: .5, heavy: true, sfx: 'slash', trail: 2 },
  // Tusukan = J ke-4 pedang (penutup rantai, menjatuhkan lawan).
  thrust:   { frames: [['swStance', .07], ['swThrust', .22], ['swStance', .1]], active: [.08, .2], cancel: .3, dmg: 18, box: [30, 252, 110, 178], knock: 360, stun: .5, down: true, heavy: true, lunge: [130, .12], sfx: 'slash' },
  // Belah Lompat = W lalu J (pedang): di udara pedang diangkat (cleaveAir, meluncur turun), saat mendarat membelah (cleave).
  cleaveAir:{ frames: [['swLeap', 9]], air: true, dive: 450, land: 'cleave', sfx: 'whoosh' },
  cleave:   { frames: [['swCleave', .3], ['swStance', .12]], active: [0, .12], cancel: .34, dmg: 26, box: [-10, 145, 0, 170], knock: 390, stun: .6, down: true, heavy: true, lunge: [120, .08], sfx: 'slashHeavy', shake: 10 },
  dashSlash:{ frames: [['swRun', .06], ['swSlashR', .2], ['swStance', .07]], active: [.06, .2], cancel: .22, dmg: 16, box: [0, 225, 60, 232], knock: 270, stun: .45, lunge: [380, .16], sfx: 'slash', trail: 1 },
  // --- di udara (W lalu K). fallback = frame cadangan bila sheet gerakan tambahan belum dibangun ---
  // Tendangan Lompat (W lalu K): sama untuk tangan kosong dan pedang, memakai frame sheet gerakan tambahan.
  jumpKick:      { frames: [['mvKick1', .05], ['mvKick2', .07], ['mvKick3', .2], ['mvKick4', .4]], fallback: [['kneeUp', .12], ['kickHigh', .6]], active: [.1, .32], dmg: 14, box: [10, 160, 40, 140], knock: 330, stun: .5, down: true, heavy: true, sfx: 'kick', air: true, kick: true }
 },
 // Urutan tombol -> jurus. J = TANGAN, K = KAKI. Urutan yang tidak ada di tabel dimulai ulang dari tombol terakhir.
 combos: {
  unarmed: { J: 'j1', JJ: 'j2', JJJ: 'j3', JJJJ: 'j4', JJJJJ: 'j5', K: 'kickLow', KK: 'knee', KKK: 'kickHigh', KKKK: 'kickSpin', KKKKK: 'kickBody' },
  sword:   { J: 'slash1', JJ: 'slash2', JJJ: 'slash3', JJJJ: 'thrust', K: 'kickLow', KK: 'knee', KKK: 'kickHigh', KKKK: 'kickSpin', KKKKK: 'kickBody' }
 },
 runAttacks: { unarmed: { K: 'dashKick' }, sword: { J: 'dashSlash', K: 'dashKick' } },
 airAttacks: { unarmed: { K: 'jumpKick' }, sword: { K: 'jumpKick', J: 'cleaveAir' } },
 // Combo yang ditampilkan di panduan (diambil dari tabel di atas).
 guideCombos: {
  unarmed: [['JJJJJ', 'comboFists'], ['KKKKK', 'comboKicks']],
  sword:   [['JJJJ', 'comboBlade'], ['KKKKK', 'comboKicks']]
 },

 // ---------- Senjata (modular: tambahkan entri baru, misalnya 'spear' atau 'staff') ----------
 useDurability: true,      // false = pedang tidak pernah patah
 weapons: {
  unarmed: { moveset: 'unarmed', anims: 'unarmed' },
  sword:   { moveset: 'sword', anims: 'sword', durability: 30, blockChip: 0.08, blockStamina: 7, parryWindow: 0.22, blockCost: 1, icon: 'sword' }
 },

 // ---------- Animasi non-serangan ArDhan (nama frame dari atlas) ----------
 // Posisi diam (tangan kosong): 'calm' = berdiri santai saat tidak ada musuh; 'ready' = sikap siaga saat ada musuh.
 // Kembali santai setelah tidak ada musuh selama player.calmDelay detik. 'ready' juga pose netral di akhir jurus.
 // Tangkis (L) tangan kosong: blockUp saat ditahan, palmB sekejap saat serangan tertangkis (blockHit) / tangkisan sempurna (parry).
 // Dodge (S): tiap tekan dipilih acak SALAH SATU: dodgeBack (mengelak ke belakang, bergerak) atau dodgeDuck (menunduk di tempat).
 anims: {
  unarmed: { idle: ['ready'], idleCalm: ['calm'], walk: ['walk1', 'walk2', 'walk3', 'walk4'], run: ['run1', 'run2', 'run3', 'run4'], block: ['blockUp'], blockHit: ['palmB'], parry: ['palmB', 'blockUp'], dodgeBack: ['guard'], dodgeDuck: ['crouch'], hit: ['genHit1', 'genHit2'], fall: ['genFall1', 'genFall2'], down: ['genDown'], getup: ['genFall2', 'crouch'], pickup: ['crouch', 'crouch'], jump: ['crouch', 'kneeUp', 'knee', 'crouch'], dash: ['crouch', 'run2', 'run4', 'ready'] },
  sword:   { idle: ['swStance'], walk: ['genSwWalk1', 'genSwWalk2', 'genSwWalk3', 'genSwWalk4'], run: ['genSwRun1', 'genSwRun2', 'genSwRun3', 'genSwRun4'], block: ['swBlock'], blockHit: ['swBlock'], parry: ['swBlock', 'swStance'], dodgeBack: ['swCrouch'], dodgeDuck: ['swCrouch'], hit: ['genSwHit1', 'genSwHit2'], fall: ['genFall1', 'genFall2'], down: ['genDown'], getup: ['genFall2', 'swCrouch'], pickup: ['crouch', 'swCrouch'],
           jump: ['mvJump1', 'mvJump2', 'mvJump3', 'mvJump4'], dash: ['mvDash1', 'mvDash2', 'mvDash3', 'mvDash4'] },
  // Cadangan bila sheet gerakan tambahan (source-assets/sprites/ardhan/moves-12.png) belum dibangun.
  fallback: { jump: ['swCrouch', 'swJump', 'swLeap', 'swCrouch'], dash: ['swCrouch', 'swRun', 'swRun', 'swStance'] },
  fps: { walk: 7, run: 11 }
 },

 // ---------- Musuh ----------
 // sprite: nama set animasi di enemySprites (sprite sheet pengguna). Tanpa sprite = digambar prosedural ("level1-soldiers.js").
 // Semua tipe yang dipakai gelombang memakai sprite prajurit; 'tombak' disimpan sebagai cadangan sampai ada sprite tombak.
 enemies: {
  prajurit: { hp: 42,  speed: 118, runSpeed: 250, weapon: 'sword', sprite: 'soldier', reach: 185, attacks: ['slashLight'], cooldown: [1.1, 1.9], blockChance: 0,    poise: 0,  scale: 1,    drop: 'sword', dropChance: 0.35 },
  pedang:   { hp: 72,  speed: 136, runSpeed: 270, weapon: 'sword', sprite: 'soldier', reach: 185, attacks: ['slash', 'thrust'], cooldown: [0.8, 1.5], blockChance: 0.35, poise: 0,  scale: 1,    drop: 'sword' },
  // Komandan: sprite sendiri (desain merah, tongkat komando). Tidak menjatuhkan senjata (tongkat tidak bisa dipakai ArDhan).
  komandan: { hp: 290, speed: 148, runSpeed: 280, weapon: 'staff', sprite: 'commander', reach: 120, attacks: ['cmdSlash', 'cmdHeavy', 'cmdLunge'], cooldown: [0.55, 1.1], blockChance: 0.45, poise: 26, scale: 1.15, boss: true },
  tombak:   { hp: 50,  speed: 105, weapon: 'spear', reach: 195, attacks: ['spearThrust'], cooldown: [1.3, 2.1], blockChance: 0, poise: 0, scale: 1.07, look: 'soldier' }
 },
 // Animasi sprite prajurit (frame sd00–sd15 dari source-assets/sprites/soldier/soldier-16.png, menghadap kiri).
 // tips = ujung pedang pada frame ancang-ancang (untuk kilatan ✦); drop = letak pedang di frame mati (sd15).
 enemySprites: {
  soldier: {
   sheet: 'soldier', idle: 'sd04', walk: ['sd04', 'sd05', 'sd06', 'sd07'], walkFps: 6, block: 'sd06',
   // Lari (sheet soldier-run-8): runStride = jarak (satuan dunia) untuk satu siklus 8 frame.
   run: ['sr1', 'sr2', 'sr3', 'sr4', 'sr5', 'sr6', 'sr7', 'sr8'], runStride: 300,
   hit: ['sd08', 'sd09'], stagger: ['sd09', 'sd10'], fall: ['sd08', 'sd09'], down: 'sd14', getup: ['sd13', 'sd12', 'sd10'],
   dying: [['sd09', 0.12], ['sd11', 0.18], ['sd12', 0.18], ['sd13', 0.18], ['sd14', 0.2]], dead: 'sd15',
   tips: { sd01: [230, 52], sd00: [5, 68], sd03: [5, 170] },
   drop: { frame: 'sd15', at: [202, 102] }
  },
  // Komandan (source-assets/sprites/commander/commander-20.png, menghadap kiri). cm01-04 lari, cm05/09/12/16 kuda-kuda,
  // cm06 angkat tongkat, cm07 tusuk, cm08 hantam rendah, cm10/11 tongkat melintang (tangkis / ancang-ancang berat),
  // cm13-15 terkena & terhuyung, cm17-18 berlutut, cm19-20 tergeletak.
  commander: {
   sheet: 'commander', idle: 'cm05', walk: ['cm05', 'cm09', 'cm12', 'cm16'], walkFps: 6, block: 'cm10',
   run: ['cm01', 'cm02', 'cm03', 'cm04'], runStride: 260,
   hit: ['cm13', 'cm14'], stagger: ['cm14', 'cm15'], fall: ['cm13', 'cm14'], down: 'cm19', getup: ['cm18', 'cm17', 'cm16'],
   dying: [['cm14', 0.14], ['cm17', 0.2], ['cm18', 0.2], ['cm19', 0.22]], dead: 'cm20',
   tips: { cm06: [10, 55], cm11: [10, 30], cm05: [10, 28], cm09: [30, 8] }
  }
 },
 // anim: frame sprite tiap fase; pose: pose cadangan untuk prajurit prosedural.
 enemyAttacks: {
  slashLight:  { windup: .6,  active: .14, recover: .5,  dmg: 8,  box: [10, 205, 30, 215], knock: 180, stun: .32, step: 50, pose: 'slash', anim: { windup: 'sd01', hit: 'sd03', recover: 'sd00' } },
  slash:       { windup: .48, active: .14, recover: .45, dmg: 11, box: [10, 205, 30, 215], knock: 200, stun: .34, step: 60, pose: 'slash', anim: { windup: 'sd01', hit: 'sd03', recover: 'sd00' } },
  thrust:      { windup: .55, active: .16, recover: .5,  dmg: 12, box: [60, 210, 95, 175], knock: 240, stun: .36, step: 90, pose: 'thrust', anim: { windup: 'sd00', hit: 'sd02', recover: 'sd00' } },
  // Komandan (tongkat). Kotak serang diukur dari jangkauan tongkat di gambar: hantam rendah ±95 px, tusuk ±140 px di depan helm.
  // Damage Komandan = 85% dari nilai awal (13 / 13 / 22 / 16).
  cmdSlash:    { windup: .45, active: .14, recover: .22, dmg: 11.05, box: [0, 90, 20, 230], knock: 220, stun: .34, step: 80, pose: 'overhead', next: 'cmdSlash2', anim: { windup: 'cm06', hit: 'cm08', recover: 'cm08' } },
  cmdSlash2:   { windup: .18, active: .13, recover: .5,  dmg: 11.05, box: [30, 130, 130, 185], knock: 260, stun: .36, step: 60, pose: 'thrust', anim: { windup: 'cm09', hit: 'cm07', recover: 'cm05' } },
  cmdHeavy:    { windup: .75, active: .16, recover: .7,  dmg: 18.7, box: [0, 95, 0, 240], knock: 380, stun: .5, step: 80, pose: 'overhead', down: true, heavy: true, armor: true, anim: { windup: 'cm11', hit: 'cm08', recover: 'cm15' } },
  cmdLunge:    { windup: .6,  active: .3,  recover: .6,  dmg: 13.6, box: [30, 130, 130, 185], knock: 300, stun: .4, pose: 'thrust', lunge: 640, minDist: 230, anim: { windup: 'cm05', hit: 'cm07', recover: 'cm12' } },
  // Cadangan untuk prajurit prosedural (tanpa sprite).
  punch:       { windup: .42, active: .12, recover: .42, dmg: 6,  box: [10, 108, 130, 202], knock: 150, stun: .28, step: 50, pose: 'punch' },
  spearThrust: { windup: .62, active: .16, recover: .55, dmg: 9,  box: [40, 205, 105, 165], knock: 220, stun: .32, step: 70, pose: 'thrust' }
 },
 // runDist: prajurit berlari bila titik tujuannya lebih jauh dari ini (dan bergerak ke arah hadapnya).
 ai: { runDist: 260, maxAttackers: 2, ring: [235, 340], think: [0.22, 0.45], blockTime: 0.55, staggerTime: 0.7, hitStun: 0.36 },

 // ---------- Arena dan gelombang ----------
 // side: 'L'/'R' masuk dari tepi layar; at = posisi awal relatif ArDhan (sudah di layar, seperti panel 36).
 // Arena (satuan dunia) lebih lebar dari layar, sehingga kamera ikut bergerak bersama ArDhan saat bertarung.
 arenas: [ { x: 0, w: 2700, theme: 'trail' }, { x: 3300, w: 2700, theme: 'post' }, { x: 6600, w: 2700, theme: 'gate' } ],
 arenaEntry: 500,     // gelombang berikutnya dimulai saat ArDhan melewati x arena + nilai ini
 worldWidth: 9300,
 waves: [
  { arena: 0, title: 'wave1', groups: [
   { spawn: [['prajurit', 'R', 330], ['prajurit', 'L', -360]] },
   { when: { alive: 1 }, spawn: [['prajurit', 'L'], ['prajurit', 'R'], ['prajurit', 'R'], ['prajurit', 'L']] }
  ]},
  { arena: 1, title: 'wave2', groups: [
   { spawn: [['pedang', 'R'], ['prajurit', 'L']] },
   { when: { alive: 1 }, spawn: [['pedang', 'L'], ['prajurit', 'R'], ['pedang', 'R'], ['pedang', 'L']] }
  ]},
  { arena: 2, title: 'wave3', boss: true, groups: [
   // Komandan hanya ditemani 2 prajurit (bala bantuan dihapus; kedua prajuritnya pindah ke gelombang 1 & 2).
   { spawn: [['komandan', 'R'], ['pedang', 'L'], ['prajurit', 'R']] }
  ]}
 ],
 maxOnScreen: 4,

 // ---------- Elang ArDhan di langit (layar, piksel logis) ----------
 // Melintas ke kanan setiap 'period' detik selama 'cross' detik. Pola terbang: mengepak (eg1→eg2→eg3→eg4) selama
 // flapTime detik pada flapFps, lalu melayang (eg2, sayap terbentang) selama glideTime detik, berulang.
 eagle: { period: 22, cross: 7, startX: -140, speed: 220, y: 118, sway: 22, flapFps: 10, flapTime: 1.2, glideTime: 1.4, glideSink: 10, scale: 0.47,
          frames: ['eg1', 'eg2', 'eg3', 'eg4'], glideFrame: 'eg2' },

 // ---------- Umpan balik ----------
 feel: { hitstop: { light: 0.05, heavy: 0.09, kill: 0.13 }, shake: { light: 3, heavy: 8 }, flash: 0.12 }
};
