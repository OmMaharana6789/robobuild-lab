/* =====================================================================
   CAR LINK ENGINE  -  Desk Buddy Part 2: the 4WD car with an ESP32 brain,
   driven by the M5Stack Dial over ESP-NOW. Used by desk-buddy.html.
   Needs three.js r128 + OrbitControls loaded first.
   Units are centimetres. The car drives in a small simulated room and
   follows the same rules as smart_car_esp32.ino: failsafe after 0.6 s
   without a message, slow below 45 cm, no forward driving below 22 cm.
   ===================================================================== */
(function () {
  'use strict';

  var COLORS = { RED: '#e5383b', BLACK: '#30343b', ORANGE: '#ff8c1a', YELLOW: '#ffd21f', GREEN: '#2fbf5b', BLUE: '#3b82f6', PURPLE: '#a855f7', WHITE: '#eef2f7', CYAN: '#5ad8ff', PINK: '#ff7eb6', BROWN: '#8b5a2b' };
  var COLOR_NAMES = { RED: 'red', BLACK: 'black', ORANGE: 'orange', YELLOW: 'yellow', GREEN: 'green', BLUE: 'blue', PURPLE: 'purple', WHITE: 'white', CYAN: 'light-blue', PINK: 'pink', BROWN: 'brown' };

  // ---------------------------------------------------------------------
  //  STEPS   wires: [from, to, COLOUR]   act: what the scene does
  //  act: park | swap | air | remote | drive | failsafe | brake
  // ---------------------------------------------------------------------
  var STEPS = [
    // ---------------- Swap the brain ----------------
    { phase: 'Swap the brain', title: 'The plan: the Dial talks to the car', act: 'remote', follow: true, dist: 110, glow: ['esp', 'dial'],
      kid: 'Same car as Part 1. Only the brain changes: the Arduino Uno goes out, an ESP32 goes in. Then the Dial can talk to the car by radio.',
      doNow: 'Look at the waves going from the Dial to the car. The orange dots are the car answering.',
      grown: 'ESP-NOW: one ESP32 talks straight to another, with no Wi-Fi router, about 10 messages a second. The Dial sends steer, speed and GO/STOP. The car sends back its distance reading.', learn: 'cl-espnow' },
    { phase: 'Swap the brain', title: 'Uno out, ESP32 in', act: 'swap', focus: [-0.5, 4, -4.5], dist: 34, glow: ['esp'], tags: [['ESP32 DevKit', -3.2, 6.6, -5]],
      kid: 'Take out the blue Arduino Uno and its jumper wires. Put the ESP32 board on the breadboard, across the middle gap.',
      doNow: 'Unplug every jumper wire from the Uno. Lift it out. Press the ESP32 into the breadboard.',
      grown: 'ESP32 DevKit, 30 pins (ESP32-WROOM-32), about ₹350–550. Its pins work at 3.3 V, not 5 V like the Uno. The motors, wheels, L298N, battery, servo and sensor all stay.' },
    // ---------------- Wiring ----------------
    { phase: 'Wiring', title: 'Motor wires stay the same', act: 'park', focus: [0, 3, 3], dist: 36, glow: ['motors', 'l298n'], motorGlow: true, tags: [['OUT1 OUT2', -3.4, 6.2, 7], ['OUT3 OUT4', 3.4, 6.2, 7]],
      kid: 'The four motor wires do not change. Left motors go on OUT1 and OUT2. Right motors go on OUT3 and OUT4.',
      doNow: 'Check that every motor wire is still tight in its screw.',
      grown: 'Keep the ENA and ENB jumper caps OFF, like in Part 1. The ESP32 sets the speed with PWM on those two pins.' },
    { phase: 'Wiring', title: 'Control wires: ESP32 to L298N', act: 'park', focus: [-1.5, 4, 0], dist: 34, glow: ['esp', 'l298n'],
      wires: [['E:25', 'L:ENA', 'ORANGE'], ['E:26', 'L:IN1', 'YELLOW'], ['E:27', 'L:IN2', 'GREEN'], ['E:16', 'L:IN3', 'BLUE'], ['E:17', 'L:IN4', 'PURPLE'], ['E:33', 'L:ENB', 'WHITE']],
      tags: [['ENA IN1 IN2 IN3 IN4 ENB', 0, 6.4, 4.4]],
      kid: 'Six jumper wires tell the motor driver what to do. The colours are the same as in Part 1.',
      doNow: 'ENA → 25, IN1 → 26, IN2 → 27, IN3 → 16, IN4 → 17, ENB → 33.',
      grown: 'On the ESP32 board the pins are printed D25, D26, D27, D16 (or RX2), D17 (or TX2) and D33. ENA and ENB get PWM (speed). IN1–IN4 set the direction, same as with the Uno.' },
    { phase: 'Wiring', title: 'Sensor: power and Trig', act: 'park', focus: [0, 4.5, -5], dist: 30, glow: ['sonar'],
      wires: [['S:VCC', 'L:5V', 'RED'], ['S:GND', 'E:GND2', 'BLACK'], ['S:TRIG', 'E:18', 'CYAN']],
      tags: [['VCC Trig Echo Gnd', 2.2, 8.4, -8.6]],
      kid: 'The ultrasonic Eyes need 5 V power, ground, and one wire that starts each ping.',
      doNow: 'VCC → L298N 5V. GND → ESP32 GND. Trig → GPIO 18.',
      grown: 'Trig is an input on the sensor, so the 3.3 V signal from the ESP32 is enough to start a ping.' },
    { phase: 'Wiring', title: 'Echo through a divider (important!)', act: 'park', focus: [0, 4, -3], dist: 32, glow: ['divider', 'sonar'], warn: true,
      wires: [['S:ECHO', 'R1b', 'PINK'], ['R1a', 'E:19', 'PINK'], ['R2a', 'E:19b', 'PINK'], ['R2b', 'E:GND2b', 'BLACK']],
      tags: [['1 kΩ', 0.3, 4.6, -1.6], ['2 kΩ', 0.3, 4.6, -0.3]],
      kid: 'Echo sends back 5 V. The ESP32 only likes 3.3 V. Two resistors bring it down.',
      doNow: 'Echo → 1 kΩ → GPIO 19. Then GPIO 19 → 2 kΩ → GND.',
      grown: '5 V × 2 kΩ ÷ (1 kΩ + 2 kΩ) ≈ 3.3 V. Without the divider, the 5 V echo can damage the ESP32. No 2 kΩ? Use two 1 kΩ in series. Or use an HC-SR04P, which runs at 3.3 V: power it from the ESP32 3V3 pin and skip the divider.', learn: 'cl-divider' },
    { phase: 'Wiring', title: 'Servo wires', act: 'park', focus: [0.5, 4.5, -5], dist: 28, glow: ['servo'],
      wires: [['V:BROWN', 'E:GND', 'BROWN'], ['V:RED', 'L:5V', 'RED'], ['V:ORANGE', 'E:23', 'ORANGE']],
      kid: 'The servo Neck has 3 wires: brown, red and orange.',
      doNow: 'Brown → GND. Red → L298N 5V. Orange → GPIO 23.',
      grown: 'The servo motor takes its power from the L298N 5 V, not from the ESP32. Only the orange signal wire goes to the ESP32. No servo library is needed: the sketch makes the pulses with the ESP32’s own PWM (LEDC).' },
    { phase: 'Wiring', title: 'Power the ESP32 from the L298N', act: 'park', focus: [0, 4, 3.5], dist: 34, glow: ['l298n', 'battery', 'switch', 'esp'],
      wires: [['L:5V', 'E:VIN', 'RED']],
      kid: 'The battery wires stay as in Part 1. One new red wire feeds the ESP32.',
      doNow: 'L298N 5V → ESP32 VIN. Keep the 5V jumper on the L298N.',
      grown: 'Battery + → switch → L298N 12V. Battery − → L298N GND (unchanged). The L298N’s 5 V regulator powers the ESP32. If the ESP32 restarts when the motors start, add a 5 V 3 A buck converter (₹80–250) or charge the batteries.' },
    { phase: 'Wiring', title: 'Common ground', act: 'park', focus: [-1.5, 4, 2], dist: 34, glow: ['l298n', 'esp'], warn: true,
      wires: [['L:GND', 'E:GND', 'BLACK']],
      kid: 'All the GNDs must be joined: battery −, L298N GND and ESP32 GND. Without this the signals make no sense.',
      doNow: 'Black wire: L298N GND → ESP32 GND.',
      grown: 'Never power the ESP32 from USB and from the L298N 5V at the same time without this common ground. Simplest rule: unplug the USB before you switch the battery on, or keep the wheels in the air while testing on USB.', learn: 'cl-ground' },
    // ---------------- Upload ----------------
    { phase: 'Upload', title: 'Install the ESP32 boards', act: 'park', usb: true, focus: [-3, 4, -2], dist: 34,
      kid: 'Arduino IDE needs the ESP32 board pack, like it needed the M5Stack pack in Part 1.',
      doNow: 'Boards Manager: search “esp32”. Install “esp32 by Espressif Systems”, version 3.x.',
      grown: 'Version 3 is needed (the sketch uses <code>ledcAttach</code>). No extra libraries. If it does not show up, add <code>https://espressif.github.io/arduino-esp32/package_esp32_index.json</code> in Preferences.' },
    { phase: 'Upload', title: 'Upload the car sketch', act: 'park', usb: true, focus: [-3, 4, -2], dist: 30, glow: ['esp'],
      kid: 'Battery switch OFF. USB cable from the computer to the ESP32.',
      doNow: 'Board: ESP32 Dev Module. Pick the port. Open smart_car_esp32.ino and press Upload.',
      grown: 'Stuck at “Connecting…”? Hold the BOOT button on the ESP32 until it starts writing. Still failing? Set Upload Speed to 115200. Then open the Serial Monitor at 115200: it prints “searching ch 1, 2, 3…”.' },
    // ---------------- Test ----------------
    { phase: 'Test', title: 'Wheels-in-the-air test', act: 'air', focus: [0, 7, 0], dist: 46,
      kid: 'Put the car on a box so the wheels touch nothing.',
      doNow: 'Unplug USB. Switch the battery ON. On the Dial open Remote and tap GO. All four wheels must spin forward.',
      grown: 'One side spins backwards? Flip <code>LEFT_REVERSED</code> or <code>RIGHT_REVERSED</code> in the car sketch and upload again. Nothing spins? Check that the Dial says “cm ahead”, not “car: not heard”.' },
    { phase: 'Test', title: 'Open Remote mode on the Dial', act: 'remote', focus: [-46, 9, -36], dist: 42, glow: ['dial'], view: 'dial',
      kid: 'Hold the Dial knob, turn to Remote 🚗, press.',
      doNow: 'Watch the bottom of the Dial screen. “car: not heard” changes to “… cm ahead”.',
      grown: 'The car hops through Wi-Fi channels 1–13 until it hears the Dial, so this works whether the Dial is on your home Wi-Fi or not. The Serial Monitor changes from “searching ch” to “DIAL ch”.' },
    { phase: 'Test', title: 'Steer and GO', act: 'drive', follow: true, dist: 85,
      kid: 'Now drive! Turn the knob to steer. The Eyes look where you steer.',
      doNow: 'Tap the screen: GO. Turn to steer. Press to go straight. Tap again: STOP.',
      grown: 'Speed comes from <code>REMOTE_SPEED</code> in the Dial’s config.h (70% by default). Below 45 cm the car slows down. Steering the wrong way? Set <code>KNOB_REVERSE</code> to 1 in config.h.' },
    { phase: 'Test', title: 'Failsafe test', act: 'failsafe', follow: true, dist: 90,
      kid: 'What if the Dial switches off? The car must stop by itself.',
      doNow: 'Drive slowly. Then switch the Dial off (or walk far away). The car stops within a second.',
      grown: 'No message for 0.6 s → the car stops and starts searching again. That is the failsafe. In 3D, press “Dial on/off” or watch it happen by itself.' },
    { phase: 'Test', title: 'Auto-brake test', act: 'brake', focus: [0, 4, -22], dist: 80, view: 'behind', glow: ['sonar'],
      kid: 'Drive towards a box. The car stops by itself.',
      doNow: 'Tap GO and drive straight at a cardboard box. It slows down, then stops about 22 cm away.',
      grown: 'Two readings in a row closer than 22 cm → no driving. Steering only turns the Eyes. Move the box (or lift the car) to drive on. The Dial shows the distance the whole time.' },
    // ---------------- Finish ----------------
    { phase: 'Finish', title: 'Drive it anywhere!', act: 'drive', follow: true, dist: 95, finale: true,
      kid: 'Your Desk Buddy is now a car remote. Well done!',
      doNow: 'Make a slalom with chappals or books and drive through it.',
      grown: 'Set <code>AUTO_WHEN_ALONE = true</code> in the car sketch and the car drives by itself (like Part 1) whenever no Dial is heard. Note: any Dial nearby can drive any car (broadcast). That is fine at home.' }
  ];
  STEPS.forEach(function (s, i) { s.n = i + 1; s.id = 'c' + (i + 1); });

  // Wires that stay from Part 1 (always shown)
  var OLD_WIRES = [['M:LFr', 'L:OUT1', 'RED'], ['M:LFb', 'L:OUT2', 'BLACK'], ['M:LRr', 'L:OUT1b', 'RED'], ['M:LRb', 'L:OUT2b', 'BLACK'],
    ['M:RFr', 'L:OUT3', 'RED'], ['M:RFb', 'L:OUT4', 'BLACK'], ['M:RRr', 'L:OUT3b', 'RED'], ['M:RRb', 'L:OUT4b', 'BLACK'],
    ['BAT+', 'SWin', 'RED'], ['SWout', 'L:12V', 'RED'], ['BAT-', 'L:GNDb', 'BLACK']];

  // ESP32 DevKit 30-pin, antenna end first (front of the car)
  var ROW_L = ['EN', 'VP', 'VN', '34', '35', '32', '33', '25', '26', '27', '14', '12', '13', 'GND', 'VIN'];
  var ROW_R = ['23', '22', 'TX', 'RX', '21', '19', '18', '5', '17', '16', '4', '2', '15', 'GND2', '3V3'];
  var ESPX = -3.2, ESPZ0 = -7.4, ESPDZ = 4.6 / 14;
  function pinZ(i) { return ESPZ0 + i * ESPDZ; }
  var POINTS = (function () {
    var p = {};
    ROW_L.forEach(function (n, i) { p['E:' + n] = [ESPX - 2.05, 3.95, pinZ(i)]; });
    ROW_R.forEach(function (n, i) { p['E:' + n] = [ESPX + 2.05, 3.95, pinZ(i)]; });
    p['E:19b'] = [ESPX + 2.35, 3.95, pinZ(5)]; p['E:GND2b'] = [ESPX + 2.35, 3.95, pinZ(13)];
    var hx = { ENA: -1.5, IN1: -0.9, IN2: -0.3, IN3: 0.3, IN4: 0.9, ENB: 1.5 };
    Object.keys(hx).forEach(function (k) { p['L:' + k] = [hx[k], 3.8, 5.05]; });
    p['L:12V'] = [-1.1, 4.05, 9.0]; p['L:GND'] = [-0.1, 4.05, 9.0]; p['L:GNDb'] = [0.15, 4.05, 9.0]; p['L:5V'] = [1.1, 4.05, 9.0];
    p['L:OUT1'] = [-1.85, 4.05, 6.4]; p['L:OUT1b'] = [-1.7, 4.05, 6.5]; p['L:OUT2'] = [-1.85, 4.05, 7.6]; p['L:OUT2b'] = [-1.7, 4.05, 7.7];
    p['L:OUT3'] = [1.85, 4.05, 6.4]; p['L:OUT3b'] = [1.7, 4.05, 6.5]; p['L:OUT4'] = [1.85, 4.05, 7.6]; p['L:OUT4b'] = [1.7, 4.05, 7.7];
    [['LF', -1, -1], ['LR', -1, 1], ['RF', 1, -1], ['RR', 1, 1]].forEach(function (m) { p['M:' + m[0] + 'r'] = [m[1] * 2.9, 3.05, m[2] * 7 - 0.5]; p['M:' + m[0] + 'b'] = [m[1] * 2.9, 3.05, m[2] * 7 + 0.5]; });
    p['BAT+'] = [3.75, 4.0, 0.8]; p['BAT-'] = [3.75, 4.0, 2.2]; p['SWin'] = [5.25, 4.0, 4.4]; p['SWout'] = [5.95, 4.0, 4.4];
    p['S:VCC'] = [1.75, 5.5, -8.35]; p['S:TRIG'] = [2.05, 5.5, -8.35]; p['S:ECHO'] = [2.35, 5.5, -8.35]; p['S:GND'] = [2.65, 5.5, -8.35];
    p['V:BROWN'] = [1.9, 3.4, -7.35]; p['V:RED'] = [2.2, 3.4, -7.35]; p['V:ORANGE'] = [2.5, 3.4, -7.35];
    p['R1a'] = [-0.35, 3.3, -1.6]; p['R1b'] = [0.95, 3.3, -1.6]; p['R2a'] = [-0.35, 3.3, -0.3]; p['R2b'] = [0.95, 3.3, -0.3];
    return p;
  })();

  var ROOM_R = 55, DESK = [-52, 0, -44], DIAL_TOP = 10;

  function create(opts) {
    var canvas = opts.canvas, onStep = opts.onStep || function () {}, onSim = opts.onSim || function () {};
    var DISPLAY = '"Chakra Petch", "Segoe UI", sans-serif', MONO = '"JetBrains Mono", Consolas, monospace';
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    var MAXANISO = renderer.capabilities.getMaxAnisotropy();
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(36, 1, 0.1, 800);
    camera.position.set(40, 50, 70);
    var controls = new THREE.OrbitControls(camera, canvas);
    controls.enableDamping = true; controls.target.set(-10, 4, -10); controls.minDistance = 8; controls.maxDistance = 220;
    controls.screenSpacePanning = true; controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

    scene.add(new THREE.HemisphereLight(0xdbe9ff, 0x0b1220, 0.95));
    var sun = new THREE.DirectionalLight(0xffffff, 0.8); sun.position.set(20, 60, 30); scene.add(sun);
    var rim = new THREE.DirectionalLight(0x5ad8ff, 0.35); rim.position.set(-30, 20, -30); scene.add(rim);
    var floor = new THREE.Mesh(new THREE.CircleGeometry(160, 72), new THREE.MeshStandardMaterial({ color: 0x0c1424, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.02; scene.add(floor);
    var grid = new THREE.GridHelper(240, 48, 0x1d6f8f, 0x15283f); grid.position.y = -0.01; grid.material.transparent = true; grid.material.opacity = 0.4; scene.add(grid);
    // the "room": a faint wall the car measures distance to
    var wall = new THREE.Mesh(new THREE.CylinderGeometry(ROOM_R, ROOM_R, 5, 96, 1, true), new THREE.MeshBasicMaterial({ color: 0x38d7f5, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }));
    wall.position.y = 2.5; scene.add(wall);
    var wallLine = new THREE.Mesh(new THREE.RingGeometry(ROOM_R - 0.25, ROOM_R + 0.25, 128), new THREE.MeshBasicMaterial({ color: 0x38d7f5, transparent: true, opacity: 0.35 }));
    wallLine.rotation.x = -Math.PI / 2; wallLine.position.y = 0.02; scene.add(wallLine);

    function mat(c, extra) { var m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.05 }); if (extra) Object.keys(extra).forEach(function (k) { m[k] = extra[k]; }); return m; }
    function mesh(geo, m, x, y, z) { var o = new THREE.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); return o; }
    function box(w, h, d, c, x, y, z) { return mesh(new THREE.BoxGeometry(w, h, d), c && c.isMaterial ? c : (Array.isArray(c) ? c : mat(c)), x, y, z); }
    function cyl(r, h, c, x, y, z, axis, seg) { var m = mesh(new THREE.CylinderGeometry(r, r, h, seg || 28), c && c.isMaterial ? c : mat(c), x, y, z); if (axis === 'x') m.rotation.z = Math.PI / 2; if (axis === 'z') m.rotation.x = Math.PI / 2; return m; }
    function mkCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
    function rr(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    function label(s, scale) {
      var c = mkCanvas(10, 10), ctx = c.getContext('2d'), fs = 56; ctx.font = '700 ' + fs + 'px ' + DISPLAY;
      var w = Math.ceil(ctx.measureText(s).width) + 56, h = fs + 40; c.width = w; c.height = h;
      ctx.font = '700 ' + fs + 'px ' + DISPLAY; ctx.fillStyle = 'rgba(8,16,30,.92)'; ctx.strokeStyle = '#38d7f5'; ctx.lineWidth = 5;
      rr(ctx, 4, 4, w - 8, h - 8, 22); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e3ecf8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, w / 2, h / 2 + 3);
      var t = new THREE.CanvasTexture(c); t.anisotropy = MAXANISO;
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
      var sc = scale || 0.011; sp.scale.set(w * sc, h * sc, 1); sp.renderOrder = 10; sp.visible = false; return sp;
    }
    function textTex(lines, w, h, bg, fg) {
      var c = mkCanvas(w, h), x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
      lines.forEach(function (l) { x.font = l[3] || ('700 ' + l[2] + 'px ' + MONO); x.fillText(l[0], w / 2, l[1]); });
      var t = new THREE.CanvasTexture(c); t.anisotropy = MAXANISO; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 });
    }

    var PARTS = {};
    function part(key, parent) { var g = new THREE.Group(); PARTS[key] = g; parent.add(g); return g; }

    // ================= CAR (local: front = -z) =================
    var car = new THREE.Group(); scene.add(car);
    var body = new THREE.Group(); car.add(body);     // lifted for the wheels-in-the-air test
    var MDF = mat(0xc8a26a, { roughness: 0.8 });
    body.add(box(14, 0.35, 22, MDF, 0, 2.85, 0));
    var motors = part('motors', body), wheels = [];
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (m) {
      motors.add(box(6.0, 2.2, 2.2, 0xffd21f, m[0] * 4.2, 1.6, m[1] * 7));
      var w = new THREE.Group(); w.position.set(m[0] * 8.6, 3.3, m[1] * 7); body.add(w);
      w.add(cyl(3.3, 2.6, 0x15171b, 0, 0, 0, 'x', 32)); w.add(cyl(1.6, 2.7, 0xffd21f, 0, 0, 0, 'x', 6));
      wheels.push(w);
    });
    // L298N
    var l298 = part('l298n', body);
    l298.add(box(4.4, 0.16, 4.4, 0xc0262d, 0, 3.5, 7));
    l298.add(box(2.4, 2.2, 1.2, 0x1a1c20, 0, 4.7, 7));
    l298.add(box(0.7, 0.9, 1.9, 0x1f6fd1, -1.85, 3.95, 7)); l298.add(box(0.7, 0.9, 1.9, 0x1f6fd1, 1.85, 3.95, 7));
    l298.add(box(3.2, 0.9, 0.7, 0x1f6fd1, 0, 3.95, 8.85));
    l298.add(box(3.6, 0.5, 0.3, 0x111111, 0, 3.8, 5.05));
    // battery + switch
    var bat = part('battery', body);
    bat.add(box(7.4, 1.0, 3.6, 0x15171b, 0, 3.55, 1.5));
    bat.add(cyl(0.85, 6.6, 0x2b6fd6, 0, 4.0, 0.7, 'x')); bat.add(cyl(0.85, 6.6, 0x2b6fd6, 0, 4.0, 2.3, 'x'));
    var sw = part('switch', body); sw.add(box(1.4, 0.7, 0.8, 0x15171b, 5.6, 3.4, 4.4)); sw.add(box(0.3, 0.5, 0.3, 0xdddddd, 5.6, 3.95, 4.4));
    // breadboard + ESP32
    var bb = part('bb', body); bb.add(box(5.8, 0.9, 9, 0xf2f2ee, ESPX, 3.48, -4.6)); bb.add(box(0.25, 0.05, 9, 0xe23b3b, ESPX - 2.6, 3.94, -4.6)); bb.add(box(0.25, 0.05, 9, 0x3b6be2, ESPX + 2.6, 3.94, -4.6));
    var esp = part('esp', body);
    (function () {
      var top = textTex([['ESP32', 60, 40], ['DevKit', 110, 30]], 128, 200, '#14161b', '#cfd8e3');
      var side = mat(0x14161b);
      esp.add(box(2.8, 0.25, 5.0, [side, side, top, side, side, side], ESPX, 4.15, -5.1));
      esp.add(box(1.8, 0.28, 2.1, mat(0xb9c0c8, { metalness: 0.4, roughness: 0.35 }), ESPX, 4.4, -6.2));
      esp.add(box(0.8, 0.35, 0.6, 0x9aa3ad, ESPX, 4.35, -2.75));
      for (var i = 0; i < 15; i++) { esp.add(box(0.12, 0.3, 0.12, 0xd4af37, ESPX - 1.25, 4.0, pinZ(i))); esp.add(box(0.12, 0.3, 0.12, 0xd4af37, ESPX + 1.25, 4.0, pinZ(i))); }
    })();
    // the old Uno (only seen while it is taken out)
    var uno = part('uno', body);
    (function () {
      var top = textTex([['UNO', 90, 54]], 128, 160, '#1f6fb2', '#e8f2ff');
      var side = mat(0x1f6fb2);
      uno.add(box(5.3, 0.25, 6.8, [side, side, top, side, side, side], 3.6, 3.3, -2.8));
      uno.add(box(0.3, 0.6, 5.0, 0x111111, 5.9, 3.7, -2.8)); uno.add(box(0.3, 0.6, 5.0, 0x111111, 1.3, 3.7, -2.8));
    })();
    uno.visible = false;
    // divider resistors
    var div = part('divider', body);
    function resistor(z, bands) {
      div.add(cyl(0.24, 0.9, 0xe7d3a8, 0.3, 3.3, z, 'x', 16));
      bands.forEach(function (c, i) { div.add(cyl(0.26, 0.09, c, 0.0 + i * 0.22, 3.3, z, 'x', 16)); });
      div.add(cyl(0.04, 1.4, 0xbfc5cc, 0.3, 3.3, z, 'x', 6));
    }
    resistor(-1.6, [0x6b3d1a, 0x111111, 0xd02020]);     // 1 kΩ  brown-black-red
    resistor(-0.3, [0xd02020, 0x111111, 0xd02020]);     // 2 kΩ  red-black-red
    // servo + sensor
    var servo = part('servo', body); servo.add(box(1.25, 2.3, 2.3, 0x2b5fa8, 2.2, 4.2, -8.6)); servo.add(cyl(0.3, 0.3, 0xeeeeee, 2.2, 5.45, -8.6, null, 12));
    var sonarPivot = new THREE.Group(); sonarPivot.position.set(2.2, 5.55, -8.6); body.add(sonarPivot);
    var sonar = part('sonar', sonarPivot);
    sonar.add(box(4.5, 2.0, 0.16, 0x1f6fd1, 0, 1.1, -0.6));
    sonar.add(cyl(0.8, 1.0, 0xc8ccd2, -1.3, 1.1, -1.15, 'z', 24)); sonar.add(cyl(0.8, 1.0, 0xc8ccd2, 1.3, 1.1, -1.15, 'z', 24));
    sonar.add(cyl(0.55, 1.02, 0x2a2e35, -1.3, 1.1, -1.16, 'z', 24)); sonar.add(cyl(0.55, 1.02, 0x2a2e35, 1.3, 1.1, -1.16, 'z', 24));
    // USB cable for the upload steps
    var usb = new THREE.Group(); body.add(usb);
    usb.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(ESPX, 4.35, -2.4), new THREE.Vector3(ESPX, 4.6, 0), new THREE.Vector3(ESPX - 4, 3.2, 3), new THREE.Vector3(ESPX - 9, 0.4, 10), new THREE.Vector3(ESPX - 14, 0.3, 22)]), 60, 0.22, 10), mat(0x1d2129)));
    usb.add(box(0.9, 0.5, 1.4, 0x2a2e35, ESPX, 4.4, -1.8));
    usb.visible = false;

    // ---------- wires ----------
    var V = function (a) { return new THREE.Vector3(a[0], a[1], a[2]); };
    function makeWire(from, to, color) {
      var A = V(POINTS[from]), B = V(POINTS[to]), g = new THREE.Group();
      var mid = A.clone().lerp(B, 0.5); mid.y = Math.max(A.y, B.y) + 1.2 + A.distanceTo(B) * 0.07;
      var curve = new THREE.CatmullRomCurve3([A, A.clone().add(new THREE.Vector3(0, 0.7, 0)), mid, B.clone().add(new THREE.Vector3(0, 0.7, 0)), B]);
      var m = new THREE.MeshStandardMaterial({ color: COLORS[color], roughness: 0.5 });
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.11, 8), m));
      [A, B].forEach(function (p) { var d = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), m); d.position.copy(p); g.add(d); });
      g.userData.mat = m; body.add(g); return g;
    }
    var oldWires = OLD_WIRES.map(function (w) { return makeWire(w[0], w[1], w[2]); });
    STEPS.forEach(function (s) {
      s.wireObjs = (s.wires || []).map(function (w) { return makeWire(w[0], w[1], w[2]); });
      s.tagObjs = (s.tags || []).map(function (t) { var l = label(t[0]); l.position.set(t[1], t[2], t[3]); body.add(l); return l; });
    });

    // ================= DIAL on a desk =================
    var desk = new THREE.Group(); desk.position.set(DESK[0], 0, DESK[2]); scene.add(desk);
    desk.add(box(18, 0.8, 12, 0x6b4a2f, 0, DIAL_TOP - 0.4, 0));
    [[-8, -5], [8, -5], [-8, 5], [8, 5]].forEach(function (l) { desk.add(box(0.8, DIAL_TOP - 0.8, 0.8, 0x4a3320, l[0], (DIAL_TOP - 0.8) / 2, l[1])); });
    var dialG = part('dial', desk); dialG.position.y = DIAL_TOP; dialG.scale.setScalar(1.7);
    dialG.add(cyl(2.3, 1.4, 0x59606b, 0, 0.7, 0, null, 48));
    dialG.add(cyl(2.34, 0.18, 0xff7a1a, 0, 1.3, 0, null, 48));
    dialG.add(cyl(2.25, 1.0, mat(0xc9ced6, { metalness: 0.55, roughness: 0.28 }), 0, 1.9, 0, null, 64));
    var dCanvas = mkCanvas(256, 256), dctx = dCanvas.getContext('2d'), dtex = new THREE.CanvasTexture(dCanvas); dtex.anisotropy = MAXANISO;
    var dScreen = mesh(new THREE.CircleGeometry(1.65, 48), new THREE.MeshBasicMaterial({ map: dtex }), 0, 2.47, 0); dScreen.rotation.x = -Math.PI / 2; dialG.add(dScreen);
    dialG.add(mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.1, 48), mat(0x05070b), 0, 2.37, 0));
    var dialTag = label('M5Stack Dial (Remote mode)', 0.016); dialTag.position.set(DESK[0], DIAL_TOP + 8, DESK[2]); scene.add(dialTag);
    var DIAL_ANT = new THREE.Vector3(DESK[0], DIAL_TOP + 4.2, DESK[2]);

    // obstacle box for the auto-brake test
    var obst = new THREE.Group(); scene.add(obst);
    var cardboard = textTex([['BOX', 64, 46]], 256, 128, '#b0844f', '#5b3f1f');
    obst.add(box(16, 10, 5, [mat(0xb0844f), mat(0xb0844f), mat(0xc29660), mat(0xb0844f), cardboard, cardboard], 0, 5, -53.5));
    obst.visible = false;
    var OBST = { x0: -8, x1: 8, z0: -56, z1: -51 };
    // lift box for the wheels-in-the-air test
    var liftBox = box(8, 4.2, 10, 0x8a6a45, 0, 2.1, 0); scene.add(liftBox); liftBox.visible = false;

    // ---------- radio waves ----------
    var waves = [], replies = [];
    for (var wi = 0; wi < 10; wi++) {
      var ring = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.12, 8, 32), new THREE.MeshBasicMaterial({ color: 0x38d7f5, transparent: true, opacity: 0 }));
      ring.visible = false; scene.add(ring); waves.push({ m: ring, t: -1 });
    }
    for (var ri = 0; ri < 6; ri++) {
      var dot = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff9f43, transparent: true, opacity: 0 }));
      dot.visible = false; scene.add(dot); replies.push({ m: dot, t: -1 });
    }

    // ================= SIMULATION (same rules as smart_car_esp32.ino) =================
    var sim = { steer: 0, go: false, dialOn: true, linked: false, lastMsg: 0, dist: 999, near: 0, x: 0, z: 0, yaw: 0, v: 0, lastUser: -1e9, brakeStop: 0, lastWave: 0, lastReply: 0, failT0: 0, msg: '' };
    var REMOTE_SPEED = 70, MIN_SPEED = 110, STOP_CM = 22, SLOW_CM = 45, TRACK = 15, CM_PER_PWM = 0.12, SENSOR_AHEAD = 10;
    function forward() { return { x: -Math.sin(sim.yaw), z: -Math.cos(sim.yaw) }; }
    function measure() {
      var f = forward(), px = sim.x + f.x * SENSOR_AHEAD, pz = sim.z + f.z * SENSOR_AHEAD;
      var b = px * f.x + pz * f.z, c = px * px + pz * pz - ROOM_R * ROOM_R, d = b * b - c, best = 999;
      if (d >= 0) { var t = -b + Math.sqrt(d); if (t >= 0) best = t; }
      if (obst.visible) {   // ray vs the box (slab method in x/z)
        var tmin = -1e9, tmax = 1e9;
        [[px, f.x, OBST.x0, OBST.x1], [pz, f.z, OBST.z0, OBST.z1]].forEach(function (a) {
          if (Math.abs(a[1]) < 1e-6) { if (a[0] < a[2] || a[0] > a[3]) tmin = 1e9; return; }
          var t1 = (a[2] - a[0]) / a[1], t2 = (a[3] - a[0]) / a[1]; tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
        });
        if (tmax >= tmin && tmax > 0) best = Math.min(best, Math.max(0, tmin));
      }
      return best > 400 ? 999 : Math.round(best);
    }
    function resetCar(z) { sim.x = 0; sim.z = z || 0; sim.yaw = 0; sim.v = 0; sim.steer = 0; sim.near = 0; sim.brakeStop = 0; }
    function input(kind) {
      var now = performance.now(); sim.lastUser = now;
      if (kind === 'left') sim.steer = Math.max(-100, sim.steer - 10);
      if (kind === 'right') sim.steer = Math.min(100, sim.steer + 10);
      if (kind === 'press') sim.steer = 0;
      if (kind === 'tap') sim.go = !sim.go;
      if (kind === 'power') { sim.dialOn = !sim.dialOn; sim.failT0 = now; }
      if (kind === 'reset') { resetCar(cur && S[cur - 1].act === 'brake' ? 4 : 0); sim.go = false; }
      report();
    }
    function report() { onSim({ go: sim.go, steer: sim.steer, dialOn: sim.dialOn, linked: sim.linked, dist: sim.dist, braking: sim.near >= 2 && sim.go }); }

    function drawDial(now) {
      var c = dctx, C = 128; c.fillStyle = '#000'; c.fillRect(0, 0, 256, 256);
      if (!sim.dialOn) { dtex.needsUpdate = true; return; }
      c.save(); c.beginPath(); c.arc(C, C, 128, 0, 7); c.clip();
      var s = S[cur - 1], act = s ? s.act : 'remote';
      function t(str, y, px, col, fam) { c.font = '700 ' + px + 'px ' + (fam || DISPLAY); c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(str, C, y); }
      if (act === 'park' || act === 'swap') {
        var b = (now % 3500) < 160 ? 0.15 : 1;
        c.fillStyle = '#38D7F5'; rr(c, C - 66, 128 - 32 * b, 46, 64 * b, 18); c.fill(); rr(c, C + 20, 128 - 32 * b, 46, 64 * b, 18); c.fill();
      } else {
        t('REMOTE', 40, 18, '#3b82f6', MONO);
        c.save(); c.translate(C, 98); c.rotate(sim.steer / 100 * 0.9); c.fillStyle = sim.go ? '#34d399' : '#8b9cb8';
        c.beginPath(); c.moveTo(0, -36); c.lineTo(22, -6); c.lineTo(8, -6); c.lineTo(8, 24); c.lineTo(-8, 24); c.lineTo(-8, -6); c.lineTo(-22, -6); c.closePath(); c.fill(); c.restore();
        t(sim.go ? (sim.near >= 2 ? 'BRAKE' : 'GO') : 'STOP', 156, 34, sim.go ? (sim.near >= 2 ? '#fbbf24' : '#34d399') : '#f87171');
        t(sim.linked ? (sim.dist >= 999 ? '-- cm ahead' : sim.dist + ' cm ahead') : 'car: not heard', 200, 17, sim.linked ? '#e3ecf8' : '#8b9cb8', MONO);
      }
      c.restore(); dtex.needsUpdate = true;
    }

    // ================= STEPS + CAMERA =================
    var S = STEPS, cur = 0, camGoal = null, active = true, stepT0 = 0, swapT = 0;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var DIRS = { dial: new THREE.Vector3(0.35, 1, 0.75).normalize(), behind: new THREE.Vector3(0.45, 0.75, 1).normalize() };
    function camFor(s) {
      if (!s) return { follow: true, d: 110 };
      if (s.follow) return { follow: true, d: s.dist };
      return { t: s.focus, d: s.dist, view: s.view, local: !s.view };
    }
    function go(n) {
      cur = Math.max(0, Math.min(S.length, n)); var s = S[cur - 1], act = s ? s.act : 'remote';
      stepT0 = performance.now();
      resetCar(act === 'brake' ? 4 : 0);
      sim.go = act === 'drive' || act === 'failsafe' || act === 'brake';
      sim.dialOn = true; sim.failT0 = stepT0; sim.lastUser = -1e9;
      obst.visible = act === 'brake'; liftBox.visible = act === 'air';
      usb.visible = !!(s && s.usb);
      uno.visible = act === 'swap'; swapT = 0;
      waves.concat(replies).forEach(function (x) { x.t = -1; x.m.visible = false; });
      var showAll = !s || s.finale || s.n >= 12;
      S.forEach(function (st) { st.wireObjs.forEach(function (w) { w.visible = showAll || (s && st.n <= s.n); }); st.tagObjs.forEach(function (l) { l.visible = s === st; }); });
      esp.visible = true;
      dialTag.visible = !s || s.n === 1;
      camGoal = camFor(s);
      onStep(cur, s || null); report();
    }

    var dragging = false, lastTouch = 0;
    controls.addEventListener('start', function () { dragging = true; camGoal = null; });
    controls.addEventListener('end', function () { dragging = false; lastTouch = performance.now(); });
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

    var prevNow = performance.now();
    function tick(now) {
      requestAnimationFrame(tick);
      if (!active) return;
      var dt = Math.min(0.05, (now - prevNow) / 1000); prevNow = now;
      var s = S[cur - 1], act = s ? s.act : 'remote';
      if (Math.abs(ins.b - insGoal.b) > 0.5 || Math.abs(ins.l - insGoal.l) > 0.5) {
        var kk = reduce ? 1 : 0.2; ins.b += (insGoal.b - ins.b) * kk; ins.l += (insGoal.l - ins.l) * kk;
        if (Math.abs(ins.b - insGoal.b) <= 0.5 && Math.abs(ins.l - insGoal.l) <= 0.5) { ins.b = insGoal.b; ins.l = insGoal.l; }
        applyInset();
      }

      // ----- Uno out, ESP32 in -----
      if (act === 'swap') {
        swapT += dt; var k = reduce ? 1 : Math.min(1, swapT / 1.6), k2 = reduce ? 1 : Math.max(0, Math.min(1, (swapT - 1.2) / 1.0));
        uno.position.set(k * 6, k * 14, 0); uno.visible = k < 1;
        esp.position.y = (1 - (1 - Math.pow(1 - k2, 3))) * 9;
        if (swapT > 5 && !reduce) swapT = 0;
      } else { esp.position.y = 0; uno.visible = false; }

      // ----- link: the Dial sends 10 times a second while it is on -----
      var linkScene = act !== 'park' && act !== 'swap';
      if (act === 'failsafe' && now - sim.lastUser > 4000) { var ph = ((now - stepT0) / 1000) % 8; var want = ph < 4.5; if (sim.dialOn !== want) { sim.dialOn = want; report(); } }
      var sending = linkScene && sim.dialOn;
      if (sending) sim.lastMsg = now;
      var wasLinked = sim.linked; sim.linked = linkScene && now - sim.lastMsg < 600;
      if (wasLinked !== sim.linked) report();

      // ----- autopilot when nobody presses the buttons -----
      var auto = now - sim.lastUser > 4000;
      if (auto) {
        if (act === 'remote') { sim.go = false; sim.steer = Math.round(Math.sin((now - stepT0) / 900) * 60 / 10) * 10; }
        if (act === 'air') sim.go = ((now - stepT0) / 1000) % 5 < 3.2;
        if (act === 'drive' || act === 'failsafe') { sim.go = true; sim.steer = sim.dist < 32 ? 100 : Math.round(Math.sin((now - stepT0) / 2200) * 35); }
        if (act === 'brake') { sim.go = true; sim.steer = 0; }
      }

      // ----- the car's loop(): measure, decide, drive -----
      sim.dist = measure();
      sim.near = sim.dist < STOP_CM ? Math.min(5, sim.near + 1) : 0;
      var L = 0, R = 0;
      if (sim.linked && sim.go && sim.near < 2) {
        var base = REMOTE_SPEED / 100 * 255; if (base > 0 && base < MIN_SPEED) base = MIN_SPEED;
        if (sim.dist < SLOW_CM) base = Math.max(MIN_SPEED, base * 2 / 3);
        L = Math.max(-255, Math.min(255, base + base * sim.steer / 100)); R = Math.max(-255, Math.min(255, base - base * sim.steer / 100));
      }
      var v = (L + R) / 2 * CM_PER_PWM, w = (L - R) * CM_PER_PWM / TRACK;
      sim.v = v;
      if (act !== 'air') {
        sim.yaw -= w * dt;
        var f = forward(); sim.x += f.x * v * dt; sim.z += f.z * v * dt;
      }
      if (auto && v === 0 && sim.near >= 2 && sim.linked && sim.go) {
        sim.brakeStop += dt;
        if (act === 'brake' && sim.brakeStop > 2.5) resetCar(4);
        if ((act === 'drive' || act === 'failsafe') && sim.brakeStop > 1.5) { sim.yaw += Math.PI * 0.8; sim.brakeStop = 0; sim.near = 0; }   // demo only: as if you picked it up and turned it
      } else if (v !== 0) sim.brakeStop = 0;
      if (now - (sim.lastRep || 0) > 250) { sim.lastRep = now; report(); }

      car.position.set(sim.x, 0, sim.z); car.rotation.y = sim.yaw;
      body.position.y = act === 'air' ? 4.2 : 0;
      wheels.forEach(function (wh, i) { var side = i < 2 ? L : R; wh.rotation.x -= side * CM_PER_PWM / 3.3 * dt; });
      // eyes follow the steering (servo), like look(SERVO_CENTER - steer * 0.5)
      var lookGoal = sim.linked ? -sim.steer * 0.5 * Math.PI / 180 : 0;
      sonarPivot.rotation.y += (lookGoal - sonarPivot.rotation.y) * Math.min(1, dt * 8);

      // ----- waves (cyan: Dial → car, orange: car → Dial) -----
      var espW = car.localToWorld(new THREE.Vector3(ESPX, 5.5 + body.position.y, -6.2));
      if (sending && now - sim.lastWave > 260) { sim.lastWave = now; var fw = waves.find(function (x) { return x.t < 0; }); if (fw) fw.t = 0; }
      if (sim.linked && now - sim.lastReply > 420) { sim.lastReply = now; var fr = replies.find(function (x) { return x.t < 0; }); if (fr) fr.t = 0; }
      var dirW = espW.clone().sub(DIAL_ANT).normalize();
      waves.forEach(function (x) {
        if (x.t < 0) { x.m.visible = false; return; }
        x.t += dt / 0.9; if (x.t >= 1) { x.t = -1; x.m.visible = false; return; }
        x.m.visible = true; x.m.position.copy(DIAL_ANT).lerp(espW, x.t); x.m.position.y += Math.sin(x.t * Math.PI) * 6;
        x.m.lookAt(x.m.position.clone().add(dirW)); x.m.scale.setScalar(0.8 + x.t * 1.4); x.m.material.opacity = 0.9 * (1 - x.t * 0.6);
      });
      replies.forEach(function (x) {
        if (x.t < 0) { x.m.visible = false; return; }
        x.t += dt / 0.9; if (x.t >= 1) { x.t = -1; x.m.visible = false; return; }
        x.m.visible = true; x.m.position.copy(espW).lerp(DIAL_ANT, x.t); x.m.position.y += Math.sin(x.t * Math.PI) * 3; x.m.material.opacity = 0.85;
      });

      // ----- glow -----
      var pulse = 0.5 + 0.5 * Math.sin(now / 240), glow = (s && s.glow) || [];
      Object.keys(PARTS).forEach(function (k2) {
        var hot = glow.indexOf(k2) >= 0;
        if (!hot && PARTS[k2].userData.hotWas === false) return; PARTS[k2].userData.hotWas = hot;
        PARTS[k2].traverse(function (o) { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { if (m.emissive) m.emissive.setRGB(hot ? 0.05 * pulse : 0, hot ? 0.28 * pulse : 0, hot ? 0.38 * pulse : 0); }); });
      });
      S.forEach(function (st) { var hot = st === s; st.wireObjs.forEach(function (wo) { wo.userData.mat.emissive.setRGB(hot ? 0.12 * pulse : 0, hot ? 0.35 * pulse : 0, hot ? 0.45 * pulse : 0); }); });
      var mg = !!(s && s.motorGlow); oldWires.forEach(function (wo) { wo.userData.mat.emissive.setRGB(mg ? 0.12 * pulse : 0, mg ? 0.35 * pulse : 0, mg ? 0.45 * pulse : 0); });

      // ----- camera -----
      if (camGoal) {
        var tgt;
        if (camGoal.follow) tgt = new THREE.Vector3(sim.x, 4, sim.z).lerp(new THREE.Vector3(DESK[0], DIAL_TOP, DESK[2]), 0.42);
        else tgt = camGoal.local ? car.localToWorld(V(camGoal.t)) : V(camGoal.t);
        controls.target.lerp(tgt, reduce ? 1 : 0.08);
        var dir = camera.position.clone().sub(controls.target).normalize();
        var vdir = camGoal.view && DIRS[camGoal.view];
        if (vdir) dir.lerp(vdir, reduce ? 1 : 0.12).normalize();
        else if (dir.y < 0.45) { dir.y = 0.6; dir.normalize(); }
        var wantP = controls.target.clone().add(dir.multiplyScalar(camGoal.d * shapeScale()));
        camera.position.lerp(wantP, reduce ? 1 : 0.08);
        if (!camGoal.follow && (!vdir || dir.distanceTo(vdir) < 0.01) && camera.position.distanceTo(wantP) < 0.03 && controls.target.distanceTo(tgt) < 0.03) camGoal = null;
      }
      if (!dragging && !reduce && !camGoal && s && s.finale && now - lastTouch > 1500) {
        var off = camera.position.clone().sub(controls.target); off.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.003); camera.position.copy(controls.target.clone().add(off));
      }
      drawDial(now);
      controls.update();
      renderer.render(scene, camera);
    }
    requestAnimationFrame(tick);
    go(0);

    return {
      steps: S, go: go, cur: function () { return cur; },
      next: function () { go(cur + 1); }, prev: function () { go(cur - 1); },
      input: input, sim: sim, camera: camera, controls: controls,
      resetView: function () { camGoal = camFor(S[cur - 1]); },
      setActive: function (on) { active = on; if (on) { prevNow = performance.now(); resize(); } }, resize: resize,
      setViewInset: function (bottom, left) { insGoal.b = Math.max(0, bottom || 0); insGoal.l = Math.max(0, left || 0); }
    };
  }

  window.CarLinkEngine = { STEPS: STEPS, COLORS: COLORS, COLOR_NAMES: COLOR_NAMES, create: create };
})();
