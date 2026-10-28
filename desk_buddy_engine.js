/* =====================================================================
   DESK BUDDY ENGINE  -  the 3D M5Stack Dial and its step-by-step guide.
   Used by desk-buddy.html. Needs three.js r128 + OrbitControls loaded first.
   The round screen is a live canvas texture: a small simulator draws the
   same faces and modes as the real sketch, and the page buttons (turn,
   press, tap, hold) drive it.
   ===================================================================== */
(function () {
  'use strict';

  var CYAN = '#38D7F5';

  // ---------------------------------------------------------------------
  //  STEPS (one idea or action per step)
  //  screen: what the Dial's screen shows   explode: open the Dial up
  //  glow: parts that pulse   labels: parts that get a name tag
  //  view: 'top' | 'front' | null (camera direction)   learn: lesson key
  // ---------------------------------------------------------------------
  var STEPS = [
    // ---------------- Meet the Dial ----------------
    { phase: 'Meet the Dial', title: 'Meet the M5Stack Dial', screen: 'buddy', focus: [0, 2.8, 0], dist: 20,
      kid: 'This is the M5Stack Dial. It is a small round computer with a screen and a turning knob.',
      doNow: 'Spin it with your finger or mouse. Look at the eyes on the screen.',
      grown: 'M5Stack Dial: ESP32-S3 brain (M5Stamp S3, 8 MB flash), 1.28" round 240 × 240 touch screen, rotary encoder knob, 13.56 MHz NFC reader, RTC clock chip, buzzer and two Grove ports. About 45 mm across.', learn: 'dial' },
    { phase: 'Meet the Dial', title: 'The round touch screen', screen: 'buddy', focus: [0, 4.4, 1.5], dist: 22, view: 'top', glow: ['screen'], labels: ['screen'],
      kid: 'The screen is round, like a watch. It is also a touch screen.',
      doNow: 'Click the screen in 3D, or press “Tap screen”. The eyes smile.',
      grown: '1.28-inch round LCD, 240 × 240 pixels, with capacitive touch. The code redraws the face many times every second.', learn: 'touch' },
    { phase: 'Meet the Dial', title: 'The knob: turn it and press it', screen: 'buddy', focus: [0, 4.4, 0], dist: 15, glow: ['knob'], labels: ['knob'], knobDemo: true,
      kid: 'The silver ring turns. Click, click, click. Push the whole top down and it is a button too.',
      doNow: 'Press “◀ Turn” and “Turn ▶”. The eyes follow the knob.',
      grown: 'A rotary encoder sends two pulse signals (A and B). The order of the pulses tells left from right. Pressing the face clicks a push button under it. The M5Dial library reads both for you.', learn: 'encoder' },
    { phase: 'Meet the Dial', title: 'Look inside: the brain', screen: 'buddy', explode: true, focus: [0, 5.5, 0], dist: 30, view: 'low', glow: ['esp'], labels: ['esp', 'encoder', 'button'],
      kid: 'Inside is a tiny brain called ESP32-S3. Wi-Fi and Bluetooth are built in.',
      doNow: 'Find the silver box with the label. That is the brain.',
      grown: 'M5Stamp S3: ESP32-S3 dual-core, up to 240 MHz, 8 MB flash, 2.4 GHz Wi-Fi and Bluetooth LE. The gold ring is the encoder, and the small switch is the knob button.', learn: 'esp32' },
    { phase: 'Meet the Dial', title: 'The NFC reader under the screen', screen: 'buddy', explode: true, focus: [0, 7.2, 0], dist: 24, view: 'low', glow: ['nfc'], labels: ['nfc'],
      kid: 'Under the screen is a copper coil. It reads NFC cards, like a metro card.',
      doNow: 'Find the copper rings under the screen.',
      grown: '13.56 MHz NFC / RFID reader (WS1850S). It reads the ID number of MIFARE and NTAG cards held 1–3 cm above the screen.', learn: 'nfc' },
    { phase: 'Meet the Dial', title: 'Clock chip and buzzer', screen: 'buddy', explode: true, focus: [0.8, 3.2, 0], dist: 19, glow: ['rtc', 'buzzer'], labels: ['rtc', 'buzzer'],
      kid: 'A small clock chip keeps the time. A buzzer makes the beeps.',
      doNow: 'Find the black clock chip and the round buzzer.',
      grown: 'RTC (real-time clock, BM8563) keeps time with its own crystal. Our code sets it from the internet when Wi-Fi works. The buzzer plays tones with PWM.', learn: 'rtc' },
    { phase: 'Meet the Dial', title: 'Ports on the bottom edge', screen: 'buddy', focus: [0, 1.6, 4.8], dist: 17, view: 'front', glow: ['usb', 'groveA', 'groveB'], labels: ['usb', 'groveA', 'groveB'],
      kid: 'On the bottom edge: one USB-C port in the middle, and two Grove ports. Port A is red.',
      doNow: 'Find the USB-C hole in the middle.',
      grown: 'USB-C gives power and is used to upload code. Port A (red) is I2C, for sensors like the ENV temperature unit. Port B has two plain input/output pins.', learn: 'dial' },
    // ---------------- Set up ----------------
    { phase: 'Set up', title: 'Plug in a USB-C data cable', screen: 'usb', cable: true, focus: [1.2, 2.2, 5], dist: 25, view: 'side', glow: ['cable'], labels: ['cable'],
      kid: 'Take a USB-C cable that can send data. Some cheap cables can only charge.',
      doNow: 'Plug the cable into the Dial and into your computer.',
      grown: 'A charge-only cable has no data wires inside. If no COM port shows up in Arduino IDE, change the cable first. No other wiring is needed.' },
    { phase: 'Set up', title: 'Install Arduino IDE', screen: 'ide', cable: true, focus: [0, 2.8, 0], dist: 20,
      kid: 'Arduino IDE is the free app that sends code to the Dial.',
      doNow: 'Download Arduino IDE 2 from arduino.cc and install it.',
      grown: 'arduino.cc/en/software. Works on Windows, Mac and Linux. Open it once after installing.' },
    { phase: 'Set up', title: 'Add the M5Stack board and library', screen: 'ide', cable: true, focus: [0, 2.8, 0], dist: 20,
      kid: 'Arduino needs to learn about the Dial. You add a board pack and one library.',
      doNow: 'Paste the M5Stack board link in Preferences. Install “M5Stack” boards. Install the “M5Dial” library.',
      grown: 'File → Preferences → Additional boards manager URLs: <code>https://static-cdn.m5stack.com/resource/arduino/package_m5stack_index.json</code>. Boards Manager: search <code>M5Stack</code>, install. Library Manager: search <code>M5Dial</code>, install and choose “Install all” (it adds M5Unified and M5GFX).' },
    { phase: 'Set up', title: 'Put your Wi-Fi in config.h', screen: 'wifi', cable: true, focus: [0, 4.4, 1.5], dist: 22, view: 'top',
      kid: 'The Dial uses Wi-Fi to get the time and the weather.',
      doNow: 'Open config.h. Type your Wi-Fi name and password. Save.',
      grown: 'Use a 2.4 GHz network. The ESP32 cannot join 5 GHz Wi-Fi. A phone hotspot works too. NFC card IDs and other settings also live in config.h.', learn: 'ntp' },
    { phase: 'Set up', title: 'Choose the settings and upload', screen: 'upload', cable: true, focus: [0, 4.4, 1.5], dist: 22, view: 'top',
      kid: 'Pick the right board and settings, then press Upload.',
      doNow: 'Tools → Board: M5Dial. Flash Size: 8MB. Partition: 8M with spiffs. Pick the port. Press Upload (→).',
      grown: 'FQBN <code>m5stack:esp32:m5stack_dial</code>. Partition Scheme “8M with spiffs (3MB APP/1.5MB SPIFFS)”. The sketch folder must be called <code>desk_buddy_dial</code>, with <code>config.h</code> next to the .ino.' },
    // ---------------- Modes ----------------
    { phase: 'Modes', title: 'Hold the knob: the Mode menu', screen: 'menu', cable: true, focus: [0, 4.4, 1.5], dist: 22, view: 'top', glow: ['knob'], knobDemo: 'hold',
      kid: 'Hold the knob down for about 1 second. A ring of icons opens.',
      doNow: 'Press “Hold knob”. Turn to choose a mode. Press to open it.',
      grown: 'Hold again at any time to come back to the menu. Settings and pet stats are saved in flash memory, so they stay after power-off.' },
    { phase: 'Modes', title: 'Mode 1: Buddy', screen: 'buddy', cable: true, focus: [0, 4.4, 1.5], dist: 22, view: 'top',
      kid: 'Your buddy blinks and looks around. Play with it!',
      doNow: 'Turn the knob fast: dizzy. Tap: happy. Tap 5 times: angry. Press: clock.',
      grown: 'Hold the screen for love hearts. Double-press the knob to feed the pet. After 45 s alone it gets sleepy, after 90 s it sleeps. Wi-Fi sets the time, and the weather changes its mood.', learn: 'weather' },
    { phase: 'Modes', title: 'Mode 2: Timer (Pomodoro)', screen: 'timer', cable: true, focus: [0, 4.4, 1.5], dist: 22, view: 'top',
      kid: 'A study timer. Work for 25 minutes, then rest for 5.',
      doNow: 'Turn to set the minutes. Press to start. Press again to pause.',
      grown: 'The ring counts down. At the end it beeps and starts a 5-minute break. It counts your finished sessions. (In this 3D demo, 1 second = 1 minute.)' },
    { phase: 'Modes', title: 'Mode 3: Volume knob (Bluetooth)', screen: 'volume', cable: true, focus: [0, 4.4, 1.5], dist: 22, view: 'top',
      kid: 'The Dial becomes a volume knob for your PC or phone.',
      doNow: 'Pair “Desk Buddy” in Bluetooth settings. Turn to change the volume.',
      grown: 'It acts as a Bluetooth media keyboard (BLE HID). Turn = volume up/down, press = play/pause, double-press = next track, tap the screen = mute.', learn: 'ble' },
    { phase: 'Modes', title: 'Mode 4: Robot remote (ESP-NOW)', screen: 'remote', cable: true, focus: [0, 4.4, 1.5], dist: 22, view: 'top',
      kid: 'Drive your ESP32 robot car with the knob. No Wi-Fi router needed.',
      doNow: 'Turn to steer. Tap the screen to go or stop. Press to drive straight.',
      grown: 'ESP-NOW sends tiny messages straight from one ESP32 to another. The car’s distance reading shows here if the car sends it back. The car-side code is coming soon.', learn: 'espnow' },
    { phase: 'Modes', title: 'Mode 5: Safe cracker', screen: 'safe', cable: true, focus: [0, 4.4, 1.5], dist: 22, view: 'top',
      kid: 'Find the secret 3-number code, like a bank safe.',
      doNow: 'Turn slowly. When the clicks get faster, you are close. Press to lock in a number.',
      grown: 'Each number is 0 to 39. The beep gets higher near the right number. Find all three to open the safe.' },
    { phase: 'Modes', title: 'Mode 6: Reaction game', screen: 'reaction', cable: true, focus: [0, 4.4, 1.5], dist: 22, view: 'top',
      kid: 'How fast are you? Wait for green, then tap!',
      doNow: 'Tap to start. Wait. When it turns green, tap fast.',
      grown: 'It shows your time in milliseconds (ms) and keeps your best score. Tap too early and it says “Too soon!”.' },
    { phase: 'Modes', title: 'Mode 7: Counter', screen: 'counter', cable: true, focus: [0, 4.4, 1.5], dist: 22, view: 'top',
      kid: 'Count anything: pushups, chai cups, pages read.',
      doNow: 'Turn right: +1. Turn left: −1. Press to reset.',
      grown: 'A small guard ignores quick accidental bumps, so the count is not reset by mistake. The count is saved, even after power-off.' },
    { phase: 'Modes', title: 'NFC magic cards', screen: 'nfc', cable: true, card: true, focus: [0, 5.6, 0.5], dist: 27, glow: ['card'],
      kid: 'Hold a card over the screen and the Dial jumps to an action. It works in any mode.',
      doNow: 'Hold a blank NFC card over the screen. Read its ID. Put it in config.h.',
      grown: 'Example: study card → Timer starts, robot card → Remote, party card → love face + a tune. An unknown card shows a surprised face and its ID, so you can copy it into config.h.', learn: 'nfc' },
    // ---------------- Finish ----------------
    { phase: 'Finish', title: 'Your Desk Buddy is ready!', screen: 'buddy', cable: true, finale: true, focus: [0, 2.8, 0], dist: 21,
      kid: 'Well done! Your Dial is now a buddy, a timer, a volume knob, a remote and three games.',
      doNow: 'Hold the knob, pick a mode and have fun. Unplug and use a power bank to take it anywhere.',
      grown: 'Next on the roadmap: smart-switch relays over ESP-NOW, PC notifications on the Dial, and the receiver code for the robot car.' }
  ];
  STEPS.forEach(function (s, i) { s.n = i + 1; s.id = 'd' + (i + 1); });

  // Modes in the on-screen menu (same order as the real sketch's menu)
  var MODES = [['buddy', 'Buddy', '👀'], ['timer', 'Timer', '⏱️'], ['volume', 'Volume', '🔊'], ['remote', 'Remote', '🚗'], ['safe', 'Safe', '🔒'], ['reaction', 'Reaction', '⚡'], ['counter', 'Counter', '🔢']];

  // =====================================================================
  //  create(): build the scene in a canvas
  // =====================================================================
  function create(opts) {
    var canvas = opts.canvas, onStep = opts.onStep || function () {}, onSim = opts.onSim || function () {};
    var DISPLAY = '"Chakra Petch", "Segoe UI", sans-serif', MONO = '"JetBrains Mono", Consolas, monospace';
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    var MAXANISO = renderer.capabilities.getMaxAnisotropy();
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(36, 1, 0.05, 400);
    camera.position.set(14, 15, 20);
    var controls = new THREE.OrbitControls(camera, canvas);
    controls.enableDamping = true; controls.target.set(0, 2.8, 0); controls.minDistance = 5; controls.maxDistance = 60;
    controls.enablePan = true; controls.screenSpacePanning = true;
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

    scene.add(new THREE.HemisphereLight(0xdbe9ff, 0x0b1220, 0.95));
    var sun = new THREE.DirectionalLight(0xffffff, 0.8); sun.position.set(8, 30, 14); scene.add(sun);
    var rim = new THREE.DirectionalLight(0x5ad8ff, 0.4); rim.position.set(-14, 8, -12); scene.add(rim);
    var front = new THREE.DirectionalLight(0xffffff, 0.35); front.position.set(0, 6, 20); scene.add(front);
    var floor = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: 0x0c1424, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.02; scene.add(floor);
    var grid = new THREE.GridHelper(64, 32, 0x1d6f8f, 0x15283f); grid.position.y = -0.01; grid.material.transparent = true; grid.material.opacity = 0.45; scene.add(grid);

    // ---------- helpers ----------
    function mat(c, extra) { var m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.05 }); if (extra) Object.keys(extra).forEach(function (k) { m[k] = extra[k]; }); return m; }
    function mesh(geo, m, x, y, z) { var o = new THREE.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); return o; }
    function box(w, h, d, c, x, y, z) { return mesh(new THREE.BoxGeometry(w, h, d), c && c.isMaterial ? c : mat(c), x, y, z); }
    function cyl(r, h, c, x, y, z, seg) { return mesh(new THREE.CylinderGeometry(r, r, h, seg || 40), c && c.isMaterial ? c : mat(c), x, y, z); }
    function mkCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
    function rr(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function label(s) {
      var c = mkCanvas(10, 10), ctx = c.getContext('2d'), fs = 56; ctx.font = '700 ' + fs + 'px ' + DISPLAY;
      var w = Math.ceil(ctx.measureText(s).width) + 56, h = fs + 40; c.width = w; c.height = h;
      ctx.font = '700 ' + fs + 'px ' + DISPLAY;
      ctx.fillStyle = 'rgba(8,16,30,.92)'; ctx.strokeStyle = CYAN; ctx.lineWidth = 5;
      rr(ctx, 4, 4, w - 8, h - 8, 22); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e3ecf8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, w / 2, h / 2 + 3);
      var t = new THREE.CanvasTexture(c); t.anisotropy = MAXANISO;
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
      var sc = 0.0072; sp.scale.set(w * sc, h * sc, 1); sp.renderOrder = 10; sp.visible = false;
      return sp;
    }

    // PARTS: key -> group. Each part's meshes get their own materials so they can glow alone.
    var PARTS = {}, LABELS = {};
    function part(key, parent) { var g = new THREE.Group(); g.userData.key = key; PARTS[key] = g; (parent || root).add(g); return g; }
    function addLabel(key, text, x, y, z) { var l = label(text); l.position.set(x, y, z); PARTS[key].add(l); LABELS[key] = l; }

    var root = new THREE.Group(); scene.add(root);

    // ---------- lower body (grey plastic with an orange band) ----------
    var body = part('body');
    var GREY = 0x59606b, ORANGE = 0xff7a1a;
    var bodyMats = [];
    var prof = [[0, 0], [4.25, 0], [4.55, 0.12], [4.7, 0.45], [4.72, 2.6], [4.62, 3.0], [0, 3.0]].map(function (p) { return new THREE.Vector2(p[0], p[1]); });
    var shellMat = mat(GREY, { roughness: 0.7 }); bodyMats.push(shellMat);
    body.add(mesh(new THREE.LatheGeometry(prof, 72), shellMat));
    var bandMat = mat(ORANGE, { roughness: 0.6 }); bodyMats.push(bandMat);
    body.add(mesh(new THREE.CylinderGeometry(4.76, 4.76, 0.32, 72, 1, true), bandMat, 0, 2.62, 0));
    var tabMat = mat(GREY, { roughness: 0.7 }); bodyMats.push(tabMat);
    var tab = box(5.8, 1.9, 1.2, tabMat, 0, 1.05, 4.35); body.add(tab);
    var footMat = mat(0x1a1d22, { roughness: 0.9 }); bodyMats.push(footMat);
    body.add(mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.08, 48), footMat, 0, 0.03, 0));

    // ports on the front edge (+z = the bottom edge of the screen picture)
    var usb = part('usb', body);
    usb.add(box(1.75, 0.62, 0.08, 0x0b0d10, 0, 1.0, 4.96));
    usb.add(box(1.42, 0.36, 0.06, 0x9aa3ad, 0, 1.0, 4.99));
    usb.add(box(0.9, 0.1, 0.05, 0x111418, 0, 1.0, 5.02));
    addLabel('usb', 'USB-C', 0, 2.55, 6.2);
    var gA = part('groveA', body);
    gA.add(box(1.5, 0.9, 0.16, 0xd8322e, -2.05, 1.0, 4.98)); gA.add(box(1.15, 0.5, 0.05, 0x3a0d0c, -2.05, 1.02, 5.07));
    addLabel('groveA', 'Port A (red)', -4.9, 1.0, 5.6);
    var gB = part('groveB', body);
    gB.add(box(1.5, 0.9, 0.16, 0x23272e, 2.05, 1.0, 4.98)); gB.add(box(1.15, 0.5, 0.05, 0x0a0b0d, 2.05, 1.02, 5.07));
    addLabel('groveB', 'Port B', 4.4, 1.0, 5.6);

    // ---------- inside (seen when the Dial is opened up) ----------
    var inside = new THREE.Group(); root.add(inside);
    var pcb = part('pcb', inside); pcb.add(cyl(4.15, 0.12, 0x0f3b2c, 0, 2.3, 0, 56));
    var esp = part('esp', inside);
    (function () {
      var c = mkCanvas(256, 256), x = c.getContext('2d');
      x.fillStyle = '#b9c0c8'; x.fillRect(0, 0, 256, 256); x.strokeStyle = '#8c949e'; x.lineWidth = 8; x.strokeRect(8, 8, 240, 240);
      x.fillStyle = '#1b2230'; x.textAlign = 'center'; x.font = '700 44px ' + MONO; x.fillText('ESP32-S3', 128, 116); x.font = '600 28px ' + MONO; x.fillText('M5Stamp S3', 128, 160);
      var t = new THREE.CanvasTexture(c); t.anisotropy = MAXANISO;
      var side = mat(0xb9c0c8, { metalness: 0.4, roughness: 0.35 }), top = new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, metalness: 0.3 });
      esp.add(mesh(new THREE.BoxGeometry(2.5, 0.38, 2.5), [side, side, top, side, side, side], -0.9, 2.55, -0.7));
    })();
    addLabel('esp', 'ESP32-S3 brain', -0.9, 4.0, -0.7);
    var rtc = part('rtc', inside); rtc.add(box(0.75, 0.22, 0.55, 0x15171b, 1.7, 2.47, -1.3)); rtc.add(box(0.5, 0.14, 0.25, 0xc0c6cc, 2.5, 2.43, -1.3));
    addLabel('rtc', 'RTC clock chip', 2.4, 3.6, -2.0);
    var buz = part('buzzer', inside); buz.add(cyl(0.6, 0.5, 0x15171b, 1.6, 2.6, 1.0, 32)); buz.add(cyl(0.12, 0.52, 0x05060a, 1.6, 2.61, 1.0, 16));
    addLabel('buzzer', 'Buzzer', 2.4, 3.6, 1.6);
    var btn = part('button', inside); btn.add(box(0.7, 0.3, 0.7, 0xc0c6cc, 0.1, 2.5, 2.2)); btn.add(cyl(0.2, 0.18, 0x15171b, 0.1, 2.72, 2.2, 20));
    addLabel('button', 'Knob button', -1.4, 3.4, 3.0);
    var enc = part('encoder', inside);
    enc.add(mesh(new THREE.TorusGeometry(4.05, 0.13, 10, 72), mat(0xc9a24a, { metalness: 0.5, roughness: 0.35 }), 0, 2.9, 0));
    enc.children[0].rotation.x = Math.PI / 2;
    for (var ti = 0; ti < 40; ti++) { var a = ti / 40 * Math.PI * 2, tooth = box(0.12, 0.16, 0.3, 0xc9a24a, Math.cos(a) * 4.05, 3.05, Math.sin(a) * 4.05); tooth.rotation.y = -a; enc.add(tooth); }
    addLabel('encoder', 'Encoder ring', 4.6, 3.8, -2.6);

    // ---------- NFC coil (under the screen) ----------
    var nfcLayer = new THREE.Group(); root.add(nfcLayer);
    var nfc = part('nfc', nfcLayer);
    [2.45, 2.7, 2.95].forEach(function (r) { var t = mesh(new THREE.TorusGeometry(r, 0.055, 8, 72), mat(0xd98b3a, { metalness: 0.6, roughness: 0.35 }), 0, 4.95, 0); t.rotation.x = Math.PI / 2; nfc.add(t); });
    nfc.add(cyl(3.2, 0.05, 0x123a2c, 0, 4.9, 0, 56));
    nfc.add(box(0.7, 0.14, 0.7, 0xeeeeee, 0, 5.0, 0));
    addLabel('nfc', 'NFC reader coil', 0, 6.1, -3.4);

    // ---------- top: knob ring + bezel + screen ----------
    var top = new THREE.Group(); root.add(top);
    var knob = part('knob', top);
    var ringRot = new THREE.Group(); knob.add(ringRot);
    var rprof = [[3.62, 3.02], [4.5, 3.02], [4.6, 3.2], [4.6, 5.25], [4.48, 5.55], [3.62, 5.55]].map(function (p) { return new THREE.Vector2(p[0], p[1]); });
    ringRot.add(mesh(new THREE.LatheGeometry(rprof, 96), mat(0xc9ced6, { metalness: 0.55, roughness: 0.28 })));
    var knurlMat = mat(0xa9aeb7, { metalness: 0.5, roughness: 0.4 });
    var knurlGeo = new THREE.BoxGeometry(0.09, 1.7, 0.14);
    for (var k = 0; k < 90; k++) { var ka = k / 90 * Math.PI * 2, kr = mesh(knurlGeo, knurlMat, Math.cos(ka) * 4.62, 4.2, Math.sin(ka) * 4.62); kr.rotation.y = -ka; ringRot.add(kr); }
    ringRot.add(box(0.16, 0.03, 0.55, 0x2a2f37, 0, 5.565, -4.05));   // a small mark, so you can see the ring turn
    addLabel('knob', 'Knob = encoder + button', 5.4, 6.4, 0);
    var scr = part('screen', top);
    scr.add(cyl(3.63, 0.22, 0x05070b, 0, 5.36, 0, 72));
    var sCanvas = mkCanvas(512, 512), sctx = sCanvas.getContext('2d');
    var stex = new THREE.CanvasTexture(sCanvas); stex.anisotropy = MAXANISO;
    var screenMesh = mesh(new THREE.CircleGeometry(3.24, 72), new THREE.MeshBasicMaterial({ map: stex }), 0, 5.475, 0);
    screenMesh.rotation.x = -Math.PI / 2; scr.add(screenMesh);
    var halo = mesh(new THREE.TorusGeometry(3.45, 0.07, 8, 96), new THREE.MeshBasicMaterial({ color: 0x38d7f5, transparent: true, opacity: 0 }), 0, 5.5, 0);
    halo.rotation.x = Math.PI / 2; scr.add(halo);
    addLabel('screen', 'Round touch screen', 0, 7.2, -2.6);

    // ---------- USB-C data cable ----------
    var cable = part('cable');
    var cableIn = new THREE.Group(); cable.add(cableIn);
    cableIn.add(box(1.3, 0.3, 0.8, 0xb9c0c8, 0, 0, 0.35));
    var plugMat = mat(0x2a2e35, { roughness: 0.6 }); cableIn.add(box(2.1, 1.0, 1.9, plugMat, 0, 0, 1.7));
    var curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 2.6), new THREE.Vector3(0, -0.2, 4.2), new THREE.Vector3(0.6, -0.75, 7), new THREE.Vector3(3.5, -0.8, 11), new THREE.Vector3(8, -0.8, 14)]);
    cableIn.add(mesh(new THREE.TubeGeometry(curve, 60, 0.28, 12, false), mat(0x1d2129, { roughness: 0.8 })));
    cable.position.set(0, 1.0, 5.0);
    addLabel('cable', 'USB-C data cable', 5.5, 1.4, 9.5);

    // ---------- NFC card ----------
    var card = part('card');
    (function () {
      var c = mkCanvas(512, 324), x = c.getContext('2d');
      var g = x.createLinearGradient(0, 0, 512, 324); g.addColorStop(0, '#f4f7fb'); g.addColorStop(1, '#dfe7f2'); x.fillStyle = g; rr(x, 0, 0, 512, 324, 30); x.fill();
      x.fillStyle = '#0d1628'; x.font = '700 56px ' + DISPLAY; x.fillText('STUDY CARD', 34, 92);
      x.font = '600 30px ' + MONO; x.fillStyle = '#3b4a66'; x.fillText('NFC · 13.56 MHz', 36, 140);
      x.strokeStyle = '#1288b8'; x.lineWidth = 10; x.lineCap = 'round';
      [40, 70, 100].forEach(function (r) { x.beginPath(); x.arc(380, 250, r, -0.7, 0.7); x.stroke(); });
      x.fillStyle = '#1288b8'; x.beginPath(); x.arc(380, 250, 12, 0, 7); x.fill();
      var t = new THREE.CanvasTexture(c); t.anisotropy = MAXANISO;
      var edge = mat(0xe6ebf2), face = new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 });
      card.add(mesh(new THREE.BoxGeometry(7.4, 0.06, 4.7), [edge, edge, face, edge, edge, edge]));
    })();
    card.visible = false;

    // =====================================================================
    //  SCREEN SIMULATOR  (same faces and modes as the real sketch)
    // =====================================================================
    var T0 = performance.now();
    var sim = {
      mode: 'buddy', menuSel: 0, face: 'idle', faceUntil: 0, lookX: 0, lookY: 0, lookTX: 0, lookTY: 0, nextLook: 0, blinkAt: T0 + 1500,
      lastInput: T0, turns: [], taps: [], overlay: null, overlayUntil: 0, hunger: 35,
      timer: { min: 25, left: 25 * 60, running: false, brk: false, sessions: 0, beepUntil: 0 },
      vol: { level: 40, playing: true, muted: false, msg: '', msgUntil: 0 },
      remote: { steer: 0, go: false },
      safe: { code: [], idx: 0, pos: 0, flash: '', flashUntil: 0, open: false, lastClick: 0 },
      react: { phase: 'ready', goAt: 0, ms: 0, best: 0 },
      count: 0, countMsgUntil: 0, setupT: T0
    };
    function newSafe() { sim.safe.code = [rnd40(), rnd40(), rnd40()]; sim.safe.idx = 0; sim.safe.open = false; }
    function rnd40() { return Math.floor(Math.random() * 40); }
    newSafe();
    function modeName(m) { for (var i = 0; i < MODES.length; i++) if (MODES[i][0] === m) return MODES[i][1]; return m === 'menu' ? 'Mode menu' : m === 'nfc' ? 'NFC card' : 'Setup screen'; }
    function setMode(m) {
      sim.mode = m; sim.setupT = performance.now(); sim.overlay = null;
      if (m === 'safe') newSafe();
      if (m === 'reaction') sim.react.phase = 'ready';
      if (m === 'menu') { var i = MODES.map(function (x) { return x[0]; }).indexOf(sim.lastMode || 'buddy'); sim.menuSel = Math.max(0, i); }
      else if (MODES.some(function (x) { return x[0] === m; })) sim.lastMode = m;
      onSim({ mode: m, name: modeName(m) });
    }
    var ringGoal = 0, pressQueue = [];
    function input(kind) {
      var now = performance.now();
      sim.lastInput = now;
      if (kind === 'left' || kind === 'right') ringGoal += (kind === 'right' ? -1 : 1) * Math.PI * 2 / 40;
      if (kind === 'press') pressQueue.push([now, now + 170]);
      if (kind === 'double') { pressQueue.push([now, now + 140]); pressQueue.push([now + 220, now + 360]); }
      if (kind === 'hold') pressQueue.push([now, now + 1000]);
      if (kind === 'hold') { setMode('menu'); return; }
      if (['usb', 'ide', 'wifi', 'upload', 'nfc'].indexOf(sim.mode) >= 0) setMode('buddy');
      var m = sim.mode, d = kind === 'right' ? 1 : kind === 'left' ? -1 : 0;
      if (m === 'menu') {
        if (d) sim.menuSel = (sim.menuSel + d + MODES.length) % MODES.length;
        if (kind === 'press' || kind === 'tap') setMode(MODES[sim.menuSel][0]);
      } else if (m === 'buddy') {
        if (sim.face === 'asleep' || sim.face === 'sleepy') sim.face = 'idle';
        if (d) {
          sim.lookTX = Math.max(-1, Math.min(1, sim.lookTX + d * 0.35)); sim.nextLook = now + 3000;
          sim.turns.push(now); sim.turns = sim.turns.filter(function (t) { return now - t < 900; });
          if (sim.turns.length >= 6) { sim.face = 'dizzy'; sim.faceUntil = now + 2600; sim.turns = []; }
        } else if (kind === 'tap') {
          sim.taps.push(now); sim.taps = sim.taps.filter(function (t) { return now - t < 2500; });
          if (sim.taps.length >= 5) { sim.face = 'angry'; sim.faceUntil = now + 2500; sim.taps = []; } else { sim.face = 'happy'; sim.faceUntil = now + 1500; }
        } else if (kind === 'holdscreen') { sim.face = 'love'; sim.faceUntil = now + 3200; }
        else if (kind === 'press') { sim.overlay = 'clock'; sim.overlayUntil = now + 4000; }
        else if (kind === 'double') { sim.hunger = 0; sim.face = 'happy'; sim.faceUntil = now + 1800; sim.overlay = 'yum'; sim.overlayUntil = now + 1800; }
      } else if (m === 'timer') {
        var tm = sim.timer;
        if (d && !tm.running) { tm.min = Math.max(1, Math.min(90, tm.min + d)); tm.left = tm.min * 60; tm.brk = false; }
        if (kind === 'press') { if (tm.left <= 0) tm.left = tm.min * 60; tm.running = !tm.running; }
      } else if (m === 'volume') {
        var v = sim.vol;
        if (d) { v.level = Math.max(0, Math.min(100, v.level + d * 5)); v.muted = false; }
        if (kind === 'press') v.playing = !v.playing;
        if (kind === 'double') { v.msg = 'Next track ⏭'; v.msgUntil = now + 1400; v.playing = true; }
        if (kind === 'tap') v.muted = !v.muted;
      } else if (m === 'remote') {
        var r = sim.remote;
        if (d) r.steer = Math.max(-100, Math.min(100, r.steer + d * 10));
        if (kind === 'tap') r.go = !r.go;
        if (kind === 'press') r.steer = 0;
      } else if (m === 'safe') {
        var s = sim.safe;
        if (d) s.pos = (s.pos + d + 40) % 40;
        if (kind === 'press') {
          if (s.open) { newSafe(); s.flash = ''; }
          else if (s.pos === s.code[s.idx]) { s.idx++; s.flash = 'ok'; s.flashUntil = now + 700; if (s.idx === 3) s.open = true; }
          else { s.flash = 'no'; s.flashUntil = now + 700; }
        }
      } else if (m === 'reaction') {
        var rc = sim.react;
        if (kind === 'tap') {
          if (rc.phase === 'wait') rc.phase = 'soon';
          else if (rc.phase === 'go') { rc.ms = Math.round(now - rc.goAt); rc.best = rc.best ? Math.min(rc.best, rc.ms) : rc.ms; rc.phase = 'result'; }
          else { rc.phase = 'wait'; rc.goAt = now + 1500 + Math.random() * 2500; }
        }
      } else if (m === 'counter') {
        if (d) sim.count = Math.max(0, sim.count + d);
        if (kind === 'press') { sim.count = 0; sim.countMsgUntil = now + 1000; }
      }
    }

    // ----- drawing helpers for the round screen (512 × 512 canvas, centre 256) -----
    var C = 256;
    function font(w, px, fam) { return w + ' ' + px + 'px ' + (fam || DISPLAY); }
    function txt(c, s, x, y, f, col, align) { c.font = f; c.fillStyle = col; c.textAlign = align || 'center'; c.textBaseline = 'middle'; c.fillText(s, x, y); }
    function heart(c, x, y, s) { c.beginPath(); c.moveTo(x, y + s * 0.9); c.bezierCurveTo(x + s * 1.45, y + s * 0.05, x + s * 0.8, y - s * 1.05, x, y - s * 0.38); c.bezierCurveTo(x - s * 0.8, y - s * 1.05, x - s * 1.45, y + s * 0.05, x, y + s * 0.9); c.fill(); }
    function arcRing(c, frac, col, r, lw, start, span) {
      start = start === undefined ? -Math.PI / 2 : start; span = span || Math.PI * 2;
      c.lineCap = 'round'; c.lineWidth = lw || 18;
      c.strokeStyle = '#16233a'; c.beginPath(); c.arc(C, C, r || 222, start, start + span); c.stroke();
      if (frac > 0.001) { c.strokeStyle = col; c.beginPath(); c.arc(C, C, r || 222, start, start + span * Math.min(1, frac)); c.stroke(); }
    }
    function timeIST() {
      var d = new Date();
      try { return { t: d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }), d: d.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' }), h: +d.toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }) }; }
      catch (e) { return { t: ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2), d: d.toDateString().slice(0, 10), h: d.getHours() }; }
    }

    function drawEyes(c, now, face) {
      // blink every few seconds
      var b = 1;
      if (now >= sim.blinkAt) { var k = (now - sim.blinkAt) / 170; if (k < 1) b = Math.max(0.08, Math.abs(1 - 2 * k)); else sim.blinkAt = now + 1800 + Math.random() * 3200; }
      // look around by itself when nobody is playing
      if (now > sim.nextLook && now - sim.lastInput > 2500) { sim.lookTX = Math.random() * 1.6 - 0.8; sim.lookTY = Math.random() * 1.0 - 0.5; sim.nextLook = now + 1200 + Math.random() * 2600; }
      sim.lookX += (sim.lookTX - sim.lookX) * 0.15; sim.lookY += (sim.lookTY - sim.lookY) * 0.15;
      var col = face === 'angry' ? '#ff6b6b' : face === 'love' ? '#ff5d8f' : CYAN;
      c.fillStyle = col; c.strokeStyle = col;
      [-1, 1].forEach(function (side) {
        var ex = C + side * 84 + sim.lookX * 42, ey = 236 + sim.lookY * 32, w = 98, h = 134;
        if (face === 'happy') { c.lineWidth = 26; c.lineCap = 'round'; c.beginPath(); c.arc(ex, ey + 34, 46, Math.PI * 1.12, Math.PI * 1.88); c.stroke(); return; }
        if (face === 'love') { heart(c, ex, ey, 52 * (1 + 0.08 * Math.sin(now / 140))); return; }
        if (face === 'dizzy') { c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); for (var t = 0; t < 4 * Math.PI; t += 0.2) { var rr2 = 4 + t * 4.4, a = t * side + now / 180; var px = ex + Math.cos(a) * rr2, py = ey + Math.sin(a) * rr2; if (t === 0) c.moveTo(px, py); else c.lineTo(px, py); } c.stroke(); return; }
        if (face === 'surprised') { c.lineWidth = 18; c.beginPath(); c.arc(ex, ey, 56, 0, 7); c.stroke(); c.beginPath(); c.arc(ex, ey, 18, 0, 7); c.fill(); return; }
        if (face === 'asleep') { c.lineWidth = 14; c.lineCap = 'round'; c.beginPath(); c.moveTo(ex - 44, ey + 20); c.quadraticCurveTo(ex, ey + 44, ex + 44, ey + 20); c.stroke(); return; }
        var hh = h * b; rr(c, ex - w / 2, ey - hh / 2, w, hh, Math.min(40, hh / 2)); c.fill();
        c.fillStyle = '#000';
        if (face === 'sleepy') c.fillRect(ex - w / 2 - 4, ey - h / 2 - 4, w + 8, h * 0.55);
        if (face === 'angry') { c.beginPath(); c.moveTo(ex - side * (w / 2 + 6), ey - h / 2 - 6); c.lineTo(ex + side * (w / 2 + 6), ey - h / 2 - 6); c.lineTo(ex + side * (w / 2 + 6), ey - h / 2 + 58); c.closePath(); c.fill(); }
        if (face === 'sad') { c.beginPath(); c.moveTo(ex + side * (w / 2 + 6), ey - h / 2 - 6); c.lineTo(ex - side * (w / 2 + 6), ey - h / 2 - 6); c.lineTo(ex + side * (w / 2 + 6), ey - h / 2 + 52); c.closePath(); c.fill(); }
        c.fillStyle = col;
      });
      if (face === 'sad') { c.fillStyle = '#7cc7ff'; c.beginPath(); c.arc(C + 132, 322 + (now / 12) % 40, 10, 0, 7); c.fill(); }
      if (face === 'sleepy' || face === 'asleep') txt(c, face === 'asleep' ? 'Z z z' : 'z', 368 + Math.sin(now / 500) * 6, 132, font(700, face === 'asleep' ? 44 : 36), '#8b9cb8');
      if (face === 'love') { c.fillStyle = 'rgba(255,93,143,.7)'; for (var i = 0; i < 4; i++) { var t2 = ((now / 1600) + i / 4) % 1; heart(c, 120 + i * 90, 430 - t2 * 120, 12); } }
    }

    function drawBuddy(c, now) {
      var idle = now - sim.lastInput, face = sim.face;
      if (now > sim.faceUntil && ['happy', 'love', 'dizzy', 'angry', 'surprised'].indexOf(face) >= 0) face = sim.face = 'idle';
      if (face === 'idle' || face === 'sad' || face === 'sleepy' || face === 'asleep') face = sim.face = idle > 90000 ? 'asleep' : idle > 45000 ? 'sleepy' : sim.hunger > 80 ? 'sad' : 'idle';
      if (sim.overlay && now > sim.overlayUntil) sim.overlay = null;
      if (sim.overlay === 'clock') {
        var t = timeIST();
        txt(c, t.t, C, 206, font(700, 104), '#e3ecf8'); txt(c, t.d, C, 282, font(600, 32, MONO), '#8b9cb8');
        txt(c, '☂', 196, 352, font(400, 44), '#7cc7ff'); txt(c, '24°C rain', 290, 354, font(600, 32), '#7cc7ff');
        txt(c, 'demo weather', C, 410, font(600, 20, MONO), '#5d6e8a');
        return;
      }
      c.save(); if (face === 'asleep') c.globalAlpha = 0.45; drawEyes(c, now, face); c.restore();
      if (sim.overlay === 'yum') txt(c, 'Yum! 🍪', C, 400, font(700, 44), '#ffd166');
      else if (sim.hunger > 50) {
        txt(c, 'hungry', C - 20, 410, font(600, 24, MONO), '#ffb86b'); c.fillStyle = '#16233a'; rr(c, C - 90, 432, 180, 12, 6); c.fill();
        c.fillStyle = '#ffb86b'; rr(c, C - 90, 432, 180 * sim.hunger / 100, 12, 6); c.fill(); txt(c, '🍚', C + 78, 408, font(400, 28));
      }
    }
    function drawMenu(c, now) {
      for (var i = 0; i < MODES.length; i++) {
        var a = -Math.PI / 2 + i * Math.PI * 2 / MODES.length, x = C + Math.cos(a) * 180, y = C + Math.sin(a) * 180, on = i === sim.menuSel;
        c.lineWidth = on ? 6 : 3; c.strokeStyle = on ? CYAN : '#24385c'; c.fillStyle = on ? 'rgba(56,215,245,.22)' : '#0b1424';
        c.beginPath(); c.arc(x, y, on ? 48 : 40, 0, 7); c.fill(); c.stroke();
        txt(c, MODES[i][2], x, y + 2, font(400, on ? 44 : 34));
      }
      txt(c, MODES[sim.menuSel][1], C, 238, font(700, 56), '#e3ecf8');
      txt(c, 'turn · press', C, 292, font(600, 24, MONO), '#8b9cb8');
    }
    function fmtMS(sec) { sec = Math.max(0, Math.ceil(sec)); return ('0' + Math.floor(sec / 60)).slice(-2) + ':' + ('0' + sec % 60).slice(-2); }
    function drawTimer(c, now) {
      var tm = sim.timer, total = (tm.brk ? 5 : tm.min) * 60;
      arcRing(c, tm.left / total, tm.brk ? '#34d399' : CYAN);
      if (now < tm.beepUntil && Math.floor(now / 150) % 2) { c.fillStyle = 'rgba(56,215,245,.25)'; c.beginPath(); c.arc(C, C, 256, 0, 7); c.fill(); }
      txt(c, tm.brk ? 'BREAK' : tm.running ? 'FOCUS' : 'SET', C, 150, font(700, 30, MONO), tm.brk ? '#34d399' : '#8b9cb8');
      txt(c, fmtMS(tm.left), C, 250, font(700, 100), '#e3ecf8');
      txt(c, tm.running ? 'press: pause' : 'turn: minutes · press: start', C, 330, font(600, 22, MONO), '#8b9cb8');
      txt(c, '🍅 × ' + tm.sessions, C, 382, font(600, 30), '#ffb86b');
      txt(c, 'demo: 1 s = 1 min', C, 430, font(600, 18, MONO), '#5d6e8a');
    }
    function drawVolume(c, now) {
      var v = sim.vol;
      arcRing(c, v.muted ? 0 : v.level / 100, v.muted ? '#f87171' : CYAN, 214, 22, Math.PI * 0.75, Math.PI * 1.5);
      txt(c, v.muted ? 'MUTE' : String(v.level), C, 236, font(700, v.muted ? 80 : 110), v.muted ? '#f87171' : '#e3ecf8');
      txt(c, (v.playing ? '▶ playing' : '⏸ paused'), C, 318, font(600, 30), '#8b9cb8');
      if (now < v.msgUntil) txt(c, v.msg, C, 372, font(700, 30), '#ffd166');
      txt(c, 'BT · Desk Buddy', C, 430, font(600, 22, MONO), '#3b82f6');
    }
    function drawRemote(c) {
      var r = sim.remote;
      c.save(); c.translate(C, 200); c.rotate(r.steer / 100 * 0.9); c.fillStyle = r.go ? '#34d399' : '#8b9cb8';
      c.beginPath(); c.moveTo(0, -78); c.lineTo(46, -16); c.lineTo(18, -16); c.lineTo(18, 50); c.lineTo(-18, 50); c.lineTo(-18, -16); c.lineTo(-46, -16); c.closePath(); c.fill(); c.restore();
      txt(c, r.go ? 'GO' : 'STOP', C, 316, font(700, 64), r.go ? '#34d399' : '#f87171');
      txt(c, 'steer ' + (r.steer > 0 ? '+' : '') + r.steer, C, 370, font(600, 26, MONO), '#e3ecf8');
      txt(c, 'car: -- cm (no car yet)', C, 410, font(600, 20, MONO), '#5d6e8a');
      txt(c, 'ESP-NOW', C, 84, font(700, 22, MONO), '#3b82f6');
    }
    function drawSafe(c, now) {
      var s = sim.safe;
      for (var i = 0; i < 40; i++) {
        var a = -Math.PI / 2 + (i - s.pos) / 40 * Math.PI * 2, big = i % 5 === 0;
        c.strokeStyle = i === s.pos ? CYAN : '#3a4d6e'; c.lineWidth = big ? 5 : 3;
        c.beginPath(); c.moveTo(C + Math.cos(a) * (big ? 200 : 212), C + Math.sin(a) * (big ? 200 : 212)); c.lineTo(C + Math.cos(a) * 234, C + Math.sin(a) * 234); c.stroke();
        if (big) txt(c, String(i), C + Math.cos(a) * 172, C + Math.sin(a) * 172, font(600, 22, MONO), '#8b9cb8');
      }
      c.fillStyle = CYAN; c.beginPath(); c.moveTo(C, 30); c.lineTo(C - 12, 8); c.lineTo(C + 12, 8); c.fill();
      if (s.open) { txt(c, 'OPEN!', C, 236, font(700, 74), '#34d399'); txt(c, '🎉 press: new code', C, 300, font(600, 24), '#e3ecf8'); return; }
      // clicks: faster when close to the right number
      var dist = Math.abs(s.pos - s.code[s.idx]); dist = Math.min(dist, 40 - dist);
      var gap = 120 + dist * 60, flashOn = (now % gap) < 50;
      c.strokeStyle = flashOn ? 'rgba(255,209,102,.9)' : 'rgba(255,209,102,.15)'; c.lineWidth = 6; c.beginPath(); c.arc(C, C, 120, 0, 7); c.stroke();
      var col = now < s.flashUntil ? (s.flash === 'ok' ? '#34d399' : '#f87171') : '#e3ecf8';
      txt(c, String(s.pos), C, 236, font(700, 96), col);
      var slots = [0, 1, 2].map(function (i) { return i < s.idx ? ('0' + s.code[i]).slice(-2) : '__'; }).join('  ');
      txt(c, slots, C, 312, font(700, 30, MONO), '#ffd166');
    }
    function drawReaction(c, now) {
      var rc = sim.react;
      if (rc.phase === 'wait' && now >= rc.goAt) rc.phase = 'go';
      var bg = { ready: '#000', wait: '#7f1d1d', go: '#065f46', result: '#000', soon: '#000' }[rc.phase];
      c.fillStyle = bg; c.fillRect(0, 0, 512, 512);
      if (rc.phase === 'ready') { txt(c, '⚡', C, 180, font(400, 80)); txt(c, 'Tap to start', C, 280, font(700, 44), '#e3ecf8'); }
      if (rc.phase === 'wait') txt(c, 'Wait…', C, 256, font(700, 70), '#fecaca');
      if (rc.phase === 'go') txt(c, 'TAP!', C, 256, font(700, 110), '#d1fae5');
      if (rc.phase === 'soon') { txt(c, 'Too soon!', C, 236, font(700, 58), '#f87171'); txt(c, 'tap to try again', C, 300, font(600, 24, MONO), '#8b9cb8'); }
      if (rc.phase === 'result') { txt(c, rc.ms + ' ms', C, 230, font(700, 90), '#e3ecf8'); txt(c, 'best ' + rc.best + ' ms', C, 306, font(600, 30, MONO), '#34d399'); txt(c, 'tap: again', C, 356, font(600, 22, MONO), '#8b9cb8'); }
    }
    function drawCounter(c, now) {
      txt(c, 'COUNT', C, 140, font(700, 28, MONO), '#8b9cb8');
      txt(c, String(sim.count), C, 250, font(700, sim.count > 999 ? 96 : 140), now < sim.countMsgUntil ? '#ffd166' : '#e3ecf8');
      txt(c, now < sim.countMsgUntil ? 'Reset!' : 'turn: ±1 · press: reset', C, 350, font(600, 24, MONO), now < sim.countMsgUntil ? '#ffd166' : '#8b9cb8');
      txt(c, '💪 ☕ 📖', C, 404, font(400, 34));
    }
    function drawSetup(c, now) {
      var t = (now - sim.setupT) / 1000;
      if (sim.mode === 'usb') { txt(c, '⚡', C, 196, font(400, 96)); txt(c, 'USB connected', C, 290, font(700, 42), '#e3ecf8'); txt(c, 'power + data', C, 340, font(600, 24, MONO), '#8b9cb8'); }
      if (sim.mode === 'ide') { txt(c, '💻', C, 196, font(400, 90)); txt(c, 'Waiting for code', C, 290, font(700, 38), '#e3ecf8'); txt(c, '.'.repeat(1 + Math.floor(t * 2) % 3), C, 330, font(700, 40), CYAN); }
      if (sim.mode === 'wifi') {
        var ok = t % 6 > 2.5;
        c.lineWidth = 16; c.lineCap = 'round';
        [50, 90, 130].forEach(function (r, i) { c.strokeStyle = ok || (Math.floor(t * 3) % 4) > i ? CYAN : '#1b2a45'; c.beginPath(); c.arc(C, 250, r, Math.PI * 1.25, Math.PI * 1.75); c.stroke(); });
        c.fillStyle = CYAN; c.beginPath(); c.arc(C, 250, 14, 0, 7); c.fill();
        txt(c, ok ? 'Wi-Fi ✓  ' + timeIST().t + ' IST' : 'Connecting…', C, 320, font(700, 36), ok ? '#34d399' : '#e3ecf8');
        txt(c, ok ? 'time set from the internet' : 'MyHomeWiFi', C, 366, font(600, 22, MONO), '#8b9cb8');
      }
      if (sim.mode === 'upload') {
        var p = Math.min(1, (t % 7) / 5.5);
        arcRing(c, p, CYAN);
        txt(c, p >= 1 ? 'Done!' : 'Uploading', C, 224, font(700, 48), p >= 1 ? '#34d399' : '#e3ecf8');
        txt(c, Math.round(p * 100) + '%', C, 288, font(700, 44, MONO), CYAN);
        txt(c, p >= 1 ? 'restarting…' : 'keep the cable in', C, 340, font(600, 22, MONO), '#8b9cb8');
      }
      if (sim.mode === 'nfc') {
        var phase = t % 6;
        if (phase < 2) { drawEyes(c, now, 'surprised'); txt(c, 'card!', C, 410, font(700, 34), '#ffd166'); }
        else { txt(c, '📚', C, 170, font(400, 80)); txt(c, 'Study card', C, 260, font(700, 46), '#e3ecf8'); txt(c, '→ Timer starts', C, 316, font(600, 30), CYAN); txt(c, 'ID 04:A2:1F:7C', C, 372, font(600, 22, MONO), '#8b9cb8'); }
      }
    }
    var lastDraw = 0;
    function drawScreen(now) {
      if (now - lastDraw < 33) return; var dt = Math.min(200, now - (lastDraw || now)); lastDraw = now;
      sim.hunger = Math.min(100, sim.hunger + dt / 1500);   // demo: gets hungry fast
      var tm = sim.timer;
      if (tm.running) {
        tm.left -= dt / 1000 * 60;
        if (tm.left <= 0) { tm.beepUntil = now + 1500; if (!tm.brk) { tm.sessions++; tm.brk = true; tm.left = 5 * 60; } else { tm.brk = false; tm.left = tm.min * 60; tm.running = false; } }
      }
      var c = sctx; c.save(); c.fillStyle = '#000'; c.fillRect(0, 0, 512, 512);
      c.beginPath(); c.arc(C, C, 256, 0, Math.PI * 2); c.clip();
      var m = sim.mode;
      if (m === 'buddy') drawBuddy(c, now); else if (m === 'menu') drawMenu(c, now); else if (m === 'timer') drawTimer(c, now);
      else if (m === 'volume') drawVolume(c, now); else if (m === 'remote') drawRemote(c, now); else if (m === 'safe') drawSafe(c, now);
      else if (m === 'reaction') drawReaction(c, now); else if (m === 'counter') drawCounter(c, now); else drawSetup(c, now);
      c.restore(); stex.needsUpdate = true;
    }

    // =====================================================================
    //  STEP LOGIC + CAMERA
    // =====================================================================
    var S = STEPS, cur = 0, camGoal = null, active = true, explodeGoal = 0, explode = 0, cableT = 0, cableOn = false, stepT0 = 0;
    var V = function (a) { return new THREE.Vector3(a[0], a[1], a[2]); };
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function camFor(s) { return s ? { t: s.focus, d: s.dist, view: s.view } : { t: [0, 2.8, 0], d: 21 }; }
    function go(n) {
      cur = Math.max(0, Math.min(S.length, n)); var s = S[cur - 1];
      explodeGoal = s && s.explode ? 1 : 0;
      cableOn = !!(s && s.cable);
      if (!cableOn) cableT = 0;
      card.visible = !!(s && s.card);
      Object.keys(LABELS).forEach(function (k) { LABELS[k].visible = !!(s && s.labels && s.labels.indexOf(k) >= 0); });
      setMode(s ? s.screen : 'buddy');
      stepT0 = performance.now();
      camGoal = camFor(s);
      onStep(cur, s || null);
    }
    var ZOOMS = { top: { t: [0, 4.4, 1.5], d: 22, view: 'top' }, ports: { t: [0, 1.6, 4.8], d: 17, view: 'front' }, inside: { t: [0, 5.5, 0], d: 30, view: 'low', explode: true } };
    function zoom(key) { var z = ZOOMS[key]; if (!z) return; camGoal = { t: z.t, d: z.d, view: z.view }; explodeGoal = z.explode ? 1 : (S[cur - 1] && S[cur - 1].explode ? 1 : 0); }

    var dragging = false, lastTouch = 0;
    controls.addEventListener('start', function () { dragging = true; camGoal = null; });
    controls.addEventListener('end', function () { dragging = false; lastTouch = performance.now(); });

    // click / hold on the 3D screen = tap / hold screen; click on the ring = press
    var ray = new THREE.Raycaster(), ptr = null, holdTimer = null;
    function hitAt(e) {
      var r = canvas.getBoundingClientRect(), v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(v, camera);
      var h = ray.intersectObjects([screenMesh].concat(ringRot.children), false)[0];
      return h ? (h.object === screenMesh ? 'screen' : 'ring') : null;
    }
    canvas.addEventListener('pointerdown', function (e) {
      ptr = { x: e.clientX, y: e.clientY, t: performance.now(), hit: hitAt(e), held: false };
      if (ptr.hit === 'screen') { var p = ptr; holdTimer = setTimeout(function () { if (ptr === p) { p.held = true; input('holdscreen'); } }, 650); }
    });
    canvas.addEventListener('pointermove', function (e) { if (ptr && Math.hypot(e.clientX - ptr.x, e.clientY - ptr.y) > 6) { clearTimeout(holdTimer); ptr.moved = true; } });
    canvas.addEventListener('pointerup', function () {
      clearTimeout(holdTimer);
      if (ptr && !ptr.moved && !ptr.held && performance.now() - ptr.t < 500 && ptr.hit) input(ptr.hit === 'screen' ? 'tap' : 'press');
      ptr = null;
    });

    // phones: keep the Dial centred above the step sheet
    var insGoal = { b: 0, l: 0 }, ins = { b: 0, l: 0 };
    function applyInset() {
      var r = canvas.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
      if (ins.b < 0.5 && ins.l < 0.5) { camera.zoom = 1; if (camera.view && camera.view.enabled) camera.clearViewOffset(); else camera.updateProjectionMatrix(); return; }
      camera.zoom = Math.max(0.65, 1 - 0.55 * Math.max(ins.b / r.height, ins.l / r.width));
      camera.setViewOffset(r.width, r.height, -ins.l / 2, ins.b / 2, r.width, r.height);
    }
    function shapeScale() { return Math.min(1.8, Math.max(1, Math.sqrt(1.3 / Math.max(0.3, camera.aspect)))); }
    function resize() {
      var r = canvas.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
      renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); applyInset();
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas); else window.addEventListener('resize', resize);
    resize();

    var DIRS = { top: new THREE.Vector3(0.05, 1, 0.42).normalize(), front: new THREE.Vector3(0.25, 0.32, 1).normalize(), side: new THREE.Vector3(-0.75, 0.6, 0.55).normalize(), low: new THREE.Vector3(0.5, 0.42, 0.76).normalize() };
    var prevNow = performance.now();
    function tick(now) {
      requestAnimationFrame(tick);
      if (!active) return;
      var dt = Math.min(0.05, (now - prevNow) / 1000); prevNow = now;
      if (Math.abs(ins.b - insGoal.b) > 0.5 || Math.abs(ins.l - insGoal.l) > 0.5) {
        var kk = reduce ? 1 : 0.2; ins.b += (insGoal.b - ins.b) * kk; ins.l += (insGoal.l - ins.l) * kk;
        if (Math.abs(ins.b - insGoal.b) <= 0.5 && Math.abs(ins.l - insGoal.l) <= 0.5) { ins.b = insGoal.b; ins.l = insGoal.l; }
        applyInset();
      }
      if (camGoal) {
        var tgt = V(camGoal.t);
        controls.target.lerp(tgt, reduce ? 1 : 0.08);
        var dir = camera.position.clone().sub(controls.target).normalize();
        var vdir = camGoal.view && DIRS[camGoal.view];
        if (vdir) dir.lerp(vdir, reduce ? 1 : 0.12).normalize();
        else if (dir.y < 0.45) { dir.y = 0.6; dir.normalize(); }
        var dirOk = !vdir || dir.distanceTo(vdir) < 0.01;
        var want = controls.target.clone().add(dir.multiplyScalar(camGoal.d * shapeScale()));
        camera.position.lerp(want, reduce ? 1 : 0.08);
        if (dirOk && camera.position.distanceTo(want) < 0.03 && controls.target.distanceTo(tgt) < 0.03) camGoal = null;
      }
      var s = S[cur - 1];
      if (!dragging && !reduce && !camGoal && (cur === 0 || (s && s.finale)) && now - lastTouch > 1500) {
        var off = camera.position.clone().sub(controls.target); off.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.0035); camera.position.copy(controls.target.clone().add(off));
      }
      // open up / close the Dial
      explode += (explodeGoal - explode) * (reduce ? 1 : Math.min(1, dt * 5));
      top.position.y = explode * 6.6; nfcLayer.position.y = explode * 3.1;
      inside.visible = explode > 0.02;
      var see = 1 - 0.72 * explode;
      bodyMats.forEach(function (m) { m.transparent = see < 0.99; m.opacity = see; m.depthWrite = see > 0.99; });
      // knob: turn, press, demo
      var idleIn = now - sim.lastInput > 2500;
      if (s && s.knobDemo === true && idleIn && !reduce) { var ph = ((now - stepT0) / 1000) % 4; ringGoal = Math.sin(ph / 4 * Math.PI * 2) * 0.9; }
      if (s && s.knobDemo === 'hold' && idleIn && !reduce) { var ph2 = ((now - stepT0) / 1000) % 5; if (ph2 < 0.15) { if (!pressQueue.length) pressQueue.push([now, now + 1100]); } }
      ringRot.rotation.y += (ringGoal - ringRot.rotation.y) * (reduce ? 1 : Math.min(1, dt * 14));
      var down = 0; pressQueue = pressQueue.filter(function (p) { if (now >= p[0] && now <= p[1]) down = 1; return now <= p[1]; });
      knob.position.y += (-0.28 * down - knob.position.y) * (reduce ? 1 : 0.4); scr.position.y = knob.position.y;
      // cable slides in
      cable.visible = cableOn;
      if (cableOn) { cableT = Math.min(1, cableT + (reduce ? 1 : dt / 1.1)); var e3 = 1 - Math.pow(1 - cableT, 3); cableIn.position.z = (1 - e3) * 7; }
      // NFC card floats over the screen
      if (card.visible) { var ct = (now / 1000) % 6, near = ct < 2.5 ? ct / 2.5 : ct < 4.5 ? 1 : 1 - (ct - 4.5) / 1.5; card.position.set(0.4, 6.2 + explode * 6.6 + (1 - near) * 4, -0.2 + (1 - near) * -2); card.rotation.set(-0.12 + (1 - near) * -0.25, 0.25, 0.05); }
      // glow
      var pulse = 0.5 + 0.5 * Math.sin(now / 240), glow = (s && s.glow) || [];
      Object.keys(PARTS).forEach(function (k) {
        var hot = glow.indexOf(k) >= 0;
        if (!hot && PARTS[k].userData.hotWas === false) return; PARTS[k].userData.hotWas = hot;
        PARTS[k].traverse(function (o) { if (o.isMesh && !o.isSprite) (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { if (m.emissive) m.emissive.setRGB(hot ? 0.05 * pulse : 0, hot ? 0.28 * pulse : 0, hot ? 0.38 * pulse : 0); }); });
      });
      halo.material.opacity = glow.indexOf('screen') >= 0 ? 0.35 + 0.5 * pulse : 0;
      drawScreen(now);
      controls.update();
      renderer.render(scene, camera);
    }
    requestAnimationFrame(tick);
    go(0);

    return {
      steps: S, modes: MODES, go: go, cur: function () { return cur; },
      next: function () { go(cur + 1); }, prev: function () { go(cur - 1); },
      zoom: zoom, input: input, setMode: setMode, sim: sim, camera: camera, controls: controls, camGoal: function () { return camGoal; },
      resetView: function () { camGoal = camFor(S[cur - 1]); explodeGoal = S[cur - 1] && S[cur - 1].explode ? 1 : 0; },
      setActive: function (on) { active = on; if (on) { prevNow = performance.now(); resize(); } }, resize: resize,
      setViewInset: function (bottom, left) { insGoal.b = Math.max(0, bottom || 0); insGoal.l = Math.max(0, left || 0); }
    };
  }

  window.DeskBuddyEngine = { STEPS: STEPS, MODES: MODES, create: create };
})();
