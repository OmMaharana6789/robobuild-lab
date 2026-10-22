/* =====================================================================
   ROBOT ENGINE  -  the 3D model and step-by-step build logic for the
   4WD sensor robot (Arduino Uno + L298N + 4 TT motors + HC-SR04 on an MG90S servo).
   Shared by the learning app (index.html) and the cinematic assembly video
   (WN-Arduino/Explanation video & Script/source/cinematic_assembly.html).
   Needs three.js r128 + OrbitControls loaded first.
   ===================================================================== */
(function () {
  'use strict';

  // ---------------------------------------------------------------------
  //  BUILD STEPS (one physical action per step)
  //  wires: [from, to, colour, holeInPlate?]   marks: [x, y, z, text, bg, fg]
  //  beacons: extra glowing points   glow: parts to light up   learn: component key
  // ---------------------------------------------------------------------
  var STEPS = [
    // ---------------- Chassis ----------------
    { phase: 'Chassis', title: 'Meet the car body', kid: 'This is your car. One wooden plate. 4 yellow motors and 4 wheels hang under it.', doNow: 'Look at the car. Spin it with your finger.', grown: 'Your 4WD kit: one plate with the 4 TT motors and wheels mounted underneath, silver motor ends facing the middle. Everything else goes on top.', parts: ['body'], learn: 'motor', focus: [0, 2, 0], dist: 30 },
    { phase: 'Chassis', title: 'Red wire on every top leg', under: true, kid: 'Look under the car. Each motor has 2 tiny copper legs. Find the TOP leg.', doNow: 'A grown-up solders a red wire to the TOP leg of all 4 motors.', grown: 'Motors have no + or −; the wire order only sets the spin direction. Cut 8 pieces of rainbow flat cable (about 15 cm). Tin the wire, heat the tab for only 2–3 s, keep the white clip on.', marks: [[-4.4, 2.75, -0.85, 'top leg', '#e5383b'], [4.4, 2.75, -0.85, 'top leg', '#e5383b'], [-4.4, 2.75, 0.85, 'top leg', '#e5383b'], [4.4, 2.75, 0.85, 'top leg', '#e5383b']], beacons: [[-4.4, 2.3, -0.85], [4.4, 2.3, -0.85], [-4.4, 2.3, 0.85], [4.4, 2.3, 0.85]], learn: 'motor', focus: [0, 1.8, 0], dist: 16 },
    { phase: 'Chassis', title: 'Black wire on every bottom leg', under: true, kid: 'Now find the BOTTOM leg of each motor.', doNow: 'A grown-up solders a black wire to the BOTTOM leg of all 4 motors.', grown: 'Same colour on the same tab for all four motors, so “red” always means the same side.', marks: [[-4.4, 0.75, -0.85, 'bottom leg', '#262626'], [4.4, 0.75, -0.85, 'bottom leg', '#262626'], [-4.4, 0.75, 0.85, 'bottom leg', '#262626'], [4.4, 0.75, 0.85, 'bottom leg', '#262626']], beacons: [[-4.4, 1.2, -0.85], [4.4, 1.2, -0.85], [-4.4, 1.2, 0.85], [4.4, 1.2, 0.85]], learn: 'motor', focus: [0, 1.8, 0], dist: 16 },
    // ---------------- Motor driver ----------------
    { phase: 'Motor driver', title: 'Take the L298N', kid: 'This red board is the Motor Boss. It gives the wheels their power.', doNow: 'Put the L298N at the back of the car, black heatsink up.', grown: 'L298N dual H-bridge module. Its screw terminals face the motors.', parts: ['boss', 'caps'], learn: 'l298n', focus: [0, 3.8, 3.9], dist: 12 },
    { phase: 'Motor driver', title: 'Find OUT1 and OUT2', kid: 'Look at the blue screw block on the left. It says OUT1 and OUT2.', doNow: 'Find OUT1 and OUT2. Loosen both screws a little.', grown: 'OUT1/OUT2 are channel A outputs: the LEFT motors.', marks: [[-1.85, 4.75, 3.3, 'OUT1'], [-1.85, 4.75, 4.3, 'OUT2']], beacons: [[-1.85, 4.3, 3.3], [-1.85, 4.3, 4.3]], glow: ['boss'], learn: 'l298n', focus: [-1.5, 4, 3.8], dist: 6 },
    { phase: 'Motor driver', title: 'Front-left red wire', kid: 'Take the red wire from the front-left motor.', doNow: 'Push it up through the middle hole. Put it in OUT1. Tighten the screw.', grown: 'Left-front motor “red” → <code>OUT1</code>.', wires: [['LF+', 'L:OUT1', 'RED', 'LF']], why: 'OUT1 and OUT2 carry the power for the left side. The L298N switches them so the motor can spin forward or backward.', learn: 'l298n', focus: [-3.4, 3.4, 1.0], dist: 10 },
    { phase: 'Motor driver', title: 'Front-left black wire', kid: 'Take the black wire from the same motor.', doNow: 'Put it in OUT2. Tighten the screw.', grown: 'Left-front motor “black” → <code>OUT2</code>.', wires: [['LF-', 'L:OUT2', 'BLACK', 'LF']], why: 'A motor needs two wires: current goes in one and out the other. Which way it flows decides which way the wheel turns.', learn: 'motor', focus: [-3.4, 3.4, 1.0], dist: 10 },
    { phase: 'Motor driver', title: 'Back-left red wire', kid: 'Now the back-left motor. Take its red wire.', doNow: 'Put it in OUT1 too, next to the first red wire. Tighten.', grown: 'Left-rear motor “red” → <code>OUT1</code> (same screw).', wires: [['LR+', 'L:OUT1', 'RED', 'LR']], why: 'Both left motors share OUT1/OUT2, so the left side always turns together, like one tank track.', learn: 'l298n', focus: [-3.4, 3.4, 1.5], dist: 10 },
    { phase: 'Motor driver', title: 'Back-left black wire', kid: 'Take the black wire of the back-left motor.', doNow: 'Put it in OUT2 with the other black wire. Tighten.', grown: 'Left-rear motor “black” → <code>OUT2</code>.', wires: [['LR-', 'L:OUT2', 'BLACK', 'LR']], why: 'Two wires in one screw: both must be clamped. Tug them gently to check.', learn: 'motor', focus: [-3.4, 3.4, 1.5], dist: 10 },
    { phase: 'Motor driver', title: 'Find OUT3 and OUT4', kid: 'Look at the blue screw block on the right. It says OUT3 and OUT4.', doNow: 'Find OUT3 and OUT4. Loosen both screws a little.', grown: 'OUT3/OUT4 are channel B outputs: the RIGHT motors.', marks: [[1.85, 4.75, 3.3, 'OUT3'], [1.85, 4.75, 4.3, 'OUT4']], beacons: [[1.85, 4.3, 3.3], [1.85, 4.3, 4.3]], glow: ['boss'], learn: 'l298n', focus: [1.5, 4, 3.8], dist: 6 },
    { phase: 'Motor driver', title: 'Front-right red wire', kid: 'Take the red wire from the front-right motor.', doNow: 'Push it up through the right middle hole. Put it in OUT3.', grown: 'Right-front motor “red” → <code>OUT3</code>.', wires: [['RF+', 'L:OUT3', 'RED', 'RF']], why: 'OUT3 and OUT4 power the right side, separately from the left. That is how the robot can turn.', learn: 'l298n', focus: [3.4, 3.4, 1.0], dist: 10 },
    { phase: 'Motor driver', title: 'Front-right black wire', kid: 'Take the black wire of the same motor.', doNow: 'Put it in OUT4. Tighten the screw.', grown: 'Right-front motor “black” → <code>OUT4</code>.', wires: [['RF-', 'L:OUT4', 'BLACK', 'RF']], why: 'Same idea as the left side: two wires, one motor channel.', learn: 'motor', focus: [3.4, 3.4, 1.0], dist: 10 },
    { phase: 'Motor driver', title: 'Back-right red wire', kid: 'Now the back-right motor. Take its red wire.', doNow: 'Put it in OUT3 next to the other red wire. Tighten.', grown: 'Right-rear motor “red” → <code>OUT3</code>.', wires: [['RR+', 'L:OUT3', 'RED', 'RR']], why: 'Both right motors share OUT3/OUT4 so the right side turns together.', learn: 'l298n', focus: [3.4, 3.4, 1.5], dist: 10 },
    { phase: 'Motor driver', title: 'Back-right black wire', kid: 'Last motor wire! Take the black wire of the back-right motor.', doNow: 'Put it in OUT4. Tighten. Tug every motor wire gently.', grown: 'Right-rear motor “black” → <code>OUT4</code>.', wires: [['RR-', 'L:OUT4', 'BLACK', 'RR']], why: 'All 8 motor wires are now in. Loose wires are the most common reason a wheel does not turn.', learn: 'motor', focus: [3.4, 3.4, 1.5], dist: 10 },
    { phase: 'Motor driver', title: 'Pull off two tiny caps', kid: 'Look at the front of the Motor Boss. There are two tiny black caps.', doNow: 'A grown-up pulls off the caps on ENA and ENB. Keep them safe.', grown: 'Remove the jumper caps on <code>ENA</code> and <code>ENB</code> so the Arduino can control speed with PWM. Keep the <code>5V-EN</code> jumper ON.', marks: [[-0.635, 4.75, 2.05, 'ENA cap'], [0.635, 4.75, 2.05, 'ENB cap']], beacons: [[-0.635, 4.1, 2.05], [0.635, 4.1, 2.05]], glow: ['caps'], learn: 'l298n', focus: [0, 3.9, 2.2], dist: 6 },
    // ---------------- Power ----------------
    { phase: 'Power', title: 'Take the battery box', kid: 'This is the battery box and the on/off switch. The switch has 3 little legs.', doNow: 'Put the battery box at the back. Keep the batteries OUT for now.', grown: '2 × 18650 holder (7.4 V). The 3-pin switch: the middle leg is the common one.', parts: ['battery'], marks: [[4.6, 4.2, 11.4, 'leg 1'], [5.0, 4.6, 11.4, 'middle leg'], [5.4, 4.2, 11.4, 'leg 3']], learn: 'battery', focus: [2.5, 4, 10], dist: 11 },
    { phase: 'Power', title: 'Battery black wire', kid: 'Take the BLACK battery wire. Black always goes to GND.', doNow: 'Put it in the L298N screw that says GND. Never in 12V!', grown: 'Battery − → L298N <code>GND</code>. <b>Swapping red and black shorts the battery: sparks and heat.</b>', wires: [['BAT-', 'L:GND', 'BLACK']], why: 'GND is the “return path” for all current. Every part must share the same GND or signals mean nothing.', learn: 'battery', focus: [-0.5, 4, 6.5], dist: 9 },
    { phase: 'Power', title: 'Battery red wire to the switch', kid: 'Take the RED battery wire.', doNow: 'Solder it to the MIDDLE leg of the switch.', grown: 'Battery + → switch middle (common) pin. Cover the joint with heat-shrink or tape.', wires: [['BAT+', 'SWin', 'RED']], why: 'The switch sits in the + wire. When it is OFF, no power can reach the robot.', learn: 'switch', focus: [3.5, 4, 9.5], dist: 9 },
    { phase: 'Power', title: 'Switch to 12V', kid: 'Take a new red wire.', doNow: 'Solder one end to an END leg of the switch. Put the other end in 12V on the L298N.', grown: 'One outer switch pin → L298N <code>12V</code>. The other outer pin stays empty.', wires: [['SWout', 'L:12V', 'RED']], marks: [[4.6, 4.2, 11.4, 'leave empty', '#ffe27a', '#1d2a3a']], why: 'The L298N “12V” input takes battery voltage (here 7.4 V) and feeds the motors.', learn: 'switch', focus: [3, 4, 8.5], dist: 11 },
    { phase: 'Power', title: 'Find which way is ON', kid: 'A grown-up puts the batteries in. Slide the switch.', doNow: 'When the little red light on the L298N comes on, that is ON. Mark it. Switch OFF again.', grown: 'Cells in, + to +. After 30 s the heatsink and the small regulator must be cool. Light stays dark: switch OFF, check red → 12V and black → GND.', marks: [[1.6, 4.6, 2.6, 'red light', '#ff9b9b'], [4.8, 4.6, 10.6, 'slide me', '#ffe27a']], beacons: [[1.6, 3.6, 2.6], [4.8, 3.95, 10.6]], learn: 'switch', focus: [2.5, 4, 6.5], dist: 13 },
    // ---------------- Brain + breadboard ----------------
    { phase: 'Brain & breadboard', title: 'Take the Arduino', kid: 'The blue board is the Brain. It has numbers 0 to 13 and A0 to A5.', doNow: 'Put the Arduino on the front-right of the plate, USB socket to the back.', grown: 'Arduino Uno, pins 0–13 facing the breadboard.', parts: ['brain'], learn: 'arduino', focus: [2.75, 4, -4.2], dist: 11 },
    { phase: 'Brain & breadboard', title: 'Take the breadboard', kid: 'The white board is the breadboard. It has letters a to j and numbers 1 to 30.', doNow: 'Put it on the front-left of the plate. Find the red line and the blue line on the outer edge.', grown: 'Half-size 400-hole breadboard, column 1 at the rear. Only the outer-edge rails are used: + row (red line) and − row (blue line).', parts: ['bb'], learn: 'breadboard', focus: [-2.9, 4, -4.5], dist: 11 },
    { phase: 'Brain & breadboard', title: 'L298N 5V to the red row', kid: 'Take a red jumper wire.', doNow: 'One end in the L298N 5V screw. Other end in the red-line row at number 3.', grown: 'L298N <code>5V</code> → + rail column 3 (male-to-male; the pin goes into the screw terminal).', wires: [['L:5V', 'B:+3', 'RED']], why: 'The L298N has a small 5 V regulator. Its 5 V powers the Arduino and every sensor through the red row.', learn: 'breadboard', focus: [-2.5, 4, 1.2], dist: 12 },
    { phase: 'Brain & breadboard', title: 'L298N GND to the blue row', kid: 'Take a black jumper wire.', doNow: 'One end in the L298N GND screw. Other end in the blue-line row at number 2.', grown: 'L298N <code>GND</code> → − rail column 2. This screw also holds the battery black wire.', wires: [['L:GND', 'B:-2', 'BLACK']], why: 'This joins the battery ground to the breadboard ground: one shared GND for everything.', learn: 'breadboard', focus: [-2.5, 4, 1.2], dist: 12 },
    { phase: 'Brain & breadboard', title: 'Arduino 5V to the red row', kid: 'Take a red jumper wire.', doNow: 'One end in the Arduino pin 5V. Other end in the red-line row at number 5.', grown: 'Uno <code>5V</code> (power header) → + rail column 5.', wires: [['U:5V', 'B:+5', 'RED']], why: 'The Arduino gets its power from the red row, so it runs from the battery when USB is unplugged.', learn: 'arduino', focus: [0.5, 4.5, -2.5], dist: 13 },
    { phase: 'Brain & breadboard', title: 'Arduino GND to the blue row', kid: 'Take a black jumper wire.', doNow: 'One end in an Arduino GND pin. Other end in the blue-line row at number 4.', grown: 'Uno <code>GND</code> (power header) → − rail column 4.', wires: [['U:GND1', 'B:-4', 'BLACK']], why: 'Common ground: the Arduino’s HIGH/LOW signals only make sense to the L298N if both share GND.', learn: 'arduino', focus: [0.5, 4.5, -2.5], dist: 13 },
    // ---------------- Control wires ----------------
    { phase: 'Control wires', title: 'Orange: pin 5 to ENA', kid: 'Take an orange wire with a socket on one end.', doNow: 'Pin end in Arduino ~5. Socket end on the L298N pin ENA.', grown: 'Uno <code>D5</code> → L298N <code>ENA</code> (left speed, PWM).', wires: [['U:5', 'L:ENA', 'ORANGE']], why: 'ENA sets how FAST the left side turns. Pin 5 can make PWM (very fast on/off) to set speed.', learn: 'l298n', focus: [1, 4.5, -1.5], dist: 12 },
    { phase: 'Control wires', title: 'Yellow: pin 7 to IN1', kid: 'Take a yellow wire.', doNow: 'Pin end in Arduino 7. Socket end on IN1.', grown: 'Uno <code>D7</code> → L298N <code>IN1</code>.', wires: [['U:7', 'L:IN1', 'YELLOW']], why: 'IN1 and IN2 choose the DIRECTION of the left motors.', learn: 'l298n', focus: [1, 4.5, -1.5], dist: 12 },
    { phase: 'Control wires', title: 'Green: pin 8 to IN2', kid: 'Take a green wire.', doNow: 'Pin end in Arduino 8. Socket end on IN2.', grown: 'Uno <code>D8</code> → L298N <code>IN2</code>.', wires: [['U:8', 'L:IN2', 'GREEN']], why: 'IN1 HIGH + IN2 LOW = forward. IN1 LOW + IN2 HIGH = backward. Both LOW = stop.', learn: 'l298n', focus: [1, 4.5, -1.5], dist: 12 },
    { phase: 'Control wires', title: 'Blue: pin 12 to IN3', kid: 'Take a blue wire.', doNow: 'Pin end in Arduino 12. Socket end on IN3.', grown: 'Uno <code>D12</code> → L298N <code>IN3</code>.', wires: [['U:12', 'L:IN3', 'BLUE']], why: 'IN3 and IN4 choose the direction of the right motors.', learn: 'l298n', focus: [1, 4.5, -1], dist: 12 },
    { phase: 'Control wires', title: 'Purple: pin 13 to IN4', kid: 'Take a purple wire.', doNow: 'Pin end in Arduino 13. Socket end on IN4.', grown: 'Uno <code>D13</code> → L298N <code>IN4</code>.', wires: [['U:13', 'L:IN4', 'PURPLE']], why: 'Right side direction, same rule as IN1/IN2.', learn: 'l298n', focus: [1, 4.5, -1], dist: 12 },
    { phase: 'Control wires', title: 'White: pin 6 to ENB', kid: 'Take a white wire.', doNow: 'Pin end in Arduino ~6. Socket end on ENB. The Motor Boss is done!', grown: 'Uno <code>D6</code> → L298N <code>ENB</code> (right speed, PWM).', wires: [['U:6', 'L:ENB', 'WHITE']], why: 'ENB sets the speed of the right side. Different speeds left and right make the robot turn.', learn: 'l298n', focus: [1, 4.5, -1.5], dist: 12 },
    // ---------------- Neck ----------------
    { phase: 'Neck (MG90S servo)', title: 'Take the MG90S servo', kid: 'This is the robot’s Neck. It turns the Eyes left and right.', doNow: 'Stand the servo at the very front, in the middle, shaft on top. Screw it down by its two ears.', grown: 'MG90S micro servo (metal gears, 4.8–6 V). It turns to any angle from 0° to 180° that the Arduino asks for. Mount it upright with the output shaft on top, in the middle of the front edge.', parts: ['servo'], learn: 'mg90s', focus: [0, 4.6, -11.3], dist: 9 },
    { phase: 'Neck (MG90S servo)', title: 'Brown: servo GND to the blue row', kid: 'The servo has 3 coloured wires. Find the brown one.', doNow: 'Brown wire into the blue-line row at number 27.', grown: 'MG90S <code>brown</code> (GND) → − rail column 27. Use a male-to-male jumper in the servo plug if the lead is too short.', wires: [['SV:GND', 'B:-27', 'BROWN']], why: 'Brown is the servo’s ground. It shares ground with the Arduino, so the signal means the same thing to both.', learn: 'mg90s', focus: [-1.5, 4.6, -9.6], dist: 10 },
    { phase: 'Neck (MG90S servo)', title: 'Red: servo power to the red row', kid: 'Now the red servo wire.', doNow: 'Red wire into the red-line row at number 27.', grown: 'MG90S <code>red</code> (+5 V) → + rail column 27.', wires: [['SV:5V', 'B:+27', 'RED']], why: 'The servo’s little motor runs on 5 V. If the Arduino restarts every time the servo moves, the 5 V supply is too weak: add a 470 µF capacitor across the red and blue rows, or give the servo its own 5 V supply.', learn: 'mg90s', focus: [-1.5, 4.6, -9.6], dist: 10 },
    { phase: 'Neck (MG90S servo)', title: 'Orange: servo signal to pin 3', kid: 'Last servo wire: the orange one.', doNow: 'Orange wire into Arduino pin ~3.', grown: 'MG90S <code>orange</code> (signal) → Uno <code>D3</code>.', wires: [['SV:SIGNAL', 'U:3', 'ORANGE']], why: 'Every 20 ms the Arduino sends a pulse 0.5–2.5 ms long. The length of the pulse tells the servo which angle to turn to.', learn: 'mg90s', focus: [1.2, 4.8, -8], dist: 12 },
    // ---------------- Eyes ----------------
    { phase: 'Eyes (HC-SR04)', title: 'Put the Eyes on the Neck', kid: 'These are the robot’s Eyes. They measure how far away things are.', doNow: 'Screw the HC-SR04 bracket onto the servo horn, eyes looking straight forward.', grown: 'HC-SR04 on a small bracket fixed to the MG90S horn, pins Vcc / Trig / Echo / Gnd facing back. At power-on the code turns the servo to 90° (straight ahead). If the eyes are not straight then, move the horn one tooth or change <code>SERVO_CENTER</code>.', parts: ['eyes'], learn: 'hcsr04', focus: [0, 6.6, -11.6], dist: 10 },
    { phase: 'Eyes (HC-SR04)', title: 'Eyes Vcc to the red row', kid: 'Take a red wire with a socket.', doNow: 'Socket on Vcc. Pin end in the red-line row at number 29.', grown: 'HC-SR04 <code>Vcc</code> → + rail column 29. Leave a little slack so the Neck can turn.', wires: [['S:VCC', 'B:+29', 'RED']], why: 'Vcc is the sensor’s 5 V power.', learn: 'hcsr04', focus: [-2.2, 5.6, -9.8], dist: 11 },
    { phase: 'Eyes (HC-SR04)', title: 'Eyes Gnd to the blue row', kid: 'Take a black wire with a socket.', doNow: 'Socket on Gnd. Pin end in the blue-line row at number 29.', grown: 'HC-SR04 <code>Gnd</code> → − rail column 29.', wires: [['S:GND', 'B:-29', 'BLACK']], why: 'Ground completes the sensor’s power circuit.', learn: 'hcsr04', focus: [-2.2, 5.6, -9.8], dist: 11 },
    { phase: 'Eyes (HC-SR04)', title: 'Light-blue: Trig to pin 9', kid: 'Take a light-blue wire.', doNow: 'Socket on Trig. Pin end in Arduino ~9.', grown: 'HC-SR04 <code>Trig</code> → Uno <code>D9</code>.', wires: [['S:TRIG', 'U:9', 'CYAN']], why: 'The Arduino sends a 10 µs pulse on Trig to say “shout now!”.', learn: 'hcsr04', focus: [1, 5.6, -8], dist: 13 },
    { phase: 'Eyes (HC-SR04)', title: 'Pink: Echo to pin 10', kid: 'Take a pink wire.', doNow: 'Socket on Echo. Pin end in Arduino ~10. All wires done!', grown: 'HC-SR04 <code>Echo</code> → Uno <code>D10</code>.', wires: [['S:ECHO', 'U:10', 'PINK']], why: 'Echo stays HIGH as long as the sound takes to come back. Longer time = farther away.', learn: 'hcsr04', focus: [1, 5.6, -8], dist: 13 },
    // ---------------- Finish ----------------
    { phase: 'Finish', title: 'Check every wire', kid: 'Follow every wire with your finger, from one end to the other.', doNow: 'Check each wire matches this picture. Tug each one gently.', grown: 'Use the Wiring page checklist. No bare copper touching a neighbour; ENA/ENB caps off; battery wires only at the switch and the L298N.', focus: [0, 3, 0], dist: 30 },
    { phase: 'Finish', title: 'Upload the code', kid: 'Plug the USB cable into the Arduino. Battery switch stays OFF.', doNow: 'A grown-up uploads rc_robot_4wd.ino to the Arduino.', grown: 'Arduino IDE or arduino-cli, board “Arduino Uno”. The code uses the built-in Servo library. It turns the Eyes to the front, then waits 3 s before moving.', glow: ['brain'], learn: 'arduino', focus: [2.75, 4, -4.2], dist: 12 },
    { phase: 'Finish', title: 'Wheels-in-the-air test', kid: 'Put the robot on a box so the wheels do not touch anything.', doNow: 'Switch ON. The Eyes turn to the front, and after 3 seconds all four wheels spin forward. Hand in front: it backs up, and the Eyes look right, then left.', grown: 'Serial Monitor 9600 baud shows what it measured and decided; S stops, G goes. A wheel backwards: swap that motor’s two wires. A whole side backwards: set LEFT_REVERSED / RIGHT_REVERSED.', glow: ['body'], learn: 'motor', focus: [0, 2, 0], dist: 24 },
    { phase: 'Finish', title: 'Let it drive!', kid: 'Unplug the USB. Put the robot on the floor. Switch ON.', doNow: 'Wait 3 seconds. Watch it look around and turn to the free side!', grown: 'It slows below 45 cm. Below 22 cm it stops, backs up, looks right and left with the servo, and turns to the side with more space. If both sides are blocked it turns round.', focus: [0, 3, 0], dist: 34, finale: true }
  ];
  STEPS.forEach(function (s, i) { s.n = i + 1; s.id = 's' + (i + 1); });

  // Human names for both ends of each wire (used by the Wiring page)
  var COMP = { U: 'Arduino', B: 'Breadboard', L: 'L298N', S: 'HC-SR04', SV: 'MG90S servo' };
  var SERVO_WIRE = { GND: 'brown wire (GND)', '5V': 'red wire (+5 V)', SIGNAL: 'orange wire (signal)' };
  var MOTORN = { LF: 'Front-left motor', LR: 'Back-left motor', RF: 'Front-right motor', RR: 'Back-right motor' };
  function endName(e) {
    if (e === 'BAT+') return ['Battery', '+ (red)'];
    if (e === 'BAT-') return ['Battery', '− (black)'];
    if (e === 'SWin') return ['Switch', 'middle leg'];
    if (e === 'SWout') return ['Switch', 'end leg'];
    if (MOTORN[e.slice(0, 2)] && (e[2] === '+' || e[2] === '-')) return [MOTORN[e.slice(0, 2)], e[2] === '+' ? 'top tab (“red”)' : 'bottom tab (“black”)'];
    var k = e.split(':')[0], v = e.split(':')[1];
    if (k === 'U') return ['Arduino', /^\d+$/.test(v) ? 'pin ' + v : v.replace('GND1', 'GND')];
    if (k === 'B') return ['Breadboard', v[0] === '+' ? '+ row (red line), column ' + v.slice(1) : v[0] === '-' ? '− row (blue line), column ' + v.slice(1) : v];
    if (k === 'SV') return [COMP.SV, SERVO_WIRE[v]];
    return [COMP[k], v];
  }
  var COLORS = { RED: '#e5383b', BLACK: '#3a3a3a', ORANGE: '#ff8c1a', YELLOW: '#ffd21f', GREEN: '#2fb562', BLUE: '#2f7de1', PURPLE: '#9b51e0', WHITE: '#f2f2f2', CYAN: '#1fc8db', PINK: '#ff5fae', BROWN: '#9a6233', GREY: '#9aa3a8', TEAL: '#12a090' };
  var COLOR_NAMES = { RED: 'red', BLACK: 'black', ORANGE: 'orange', YELLOW: 'yellow', GREEN: 'green', BLUE: 'blue', PURPLE: 'purple', WHITE: 'white', CYAN: 'light-blue', PINK: 'pink', BROWN: 'brown', GREY: 'grey', TEAL: 'sea-green' };
  var CONNECTIONS = [];
  STEPS.forEach(function (s) { (s.wires || []).forEach(function (w) { CONNECTIONS.push({ step: s.n, phase: s.phase, title: s.title, from: endName(w[0]), to: endName(w[1]), color: w[2], why: s.why || '' }); }); });

  // =====================================================================
  //  create(): build the scene in a canvas
  // =====================================================================
  function create(opts) {
    var canvas = opts.canvas, onStep = opts.onStep || function () {}, onMode = opts.onMode || function () {};
    var LABEL_FONT = opts.labelFont || '"Chakra Petch", "Trebuchet MS", sans-serif';
    var MONO = opts.monoFont || '"JetBrains Mono", Consolas, monospace';
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, preserveDrawingBuffer: !!opts.preserveDrawingBuffer });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    var MAXANISO = renderer.capabilities.getMaxAnisotropy();
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(38, 1, 0.05, 500);
    camera.position.set(22, 22, 28);
    var controls = new THREE.OrbitControls(camera, canvas);
    controls.enableDamping = true; controls.target.set(0, 3, 0); controls.minDistance = 2; controls.maxDistance = 70; controls.maxPolarAngle = Math.PI;
    controls.enablePan = true; controls.screenSpacePanning = true; controls.panSpeed = 1.2;
    controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

    scene.add(new THREE.HemisphereLight(0xdbe9ff, 0x0b1220, 0.95));
    var sun = new THREE.DirectionalLight(0xffffff, 0.75); sun.position.set(8, 30, 14); scene.add(sun);
    var hemi = scene.children[scene.children.length - 2];
    var rim = new THREE.DirectionalLight(0x5ad8ff, 0.35); rim.position.set(-14, 8, -12); scene.add(rim);
    // dark engineering floor with a faint circuit-style grid
    var floor = new THREE.Mesh(new THREE.CircleGeometry(48, 64), new THREE.MeshStandardMaterial({ color: 0x0c1424, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -1.55; scene.add(floor);
    var grid = new THREE.GridHelper(80, 40, 0x1d6f8f, 0x15283f); floor.userData.isFloor = true; grid.userData.isFloor = true; grid.position.y = -1.54; grid.material.transparent = true; grid.material.opacity = 0.45; scene.add(grid);

    // ---------- helpers ----------
    function mat(c, extra) { var m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.05 }); if (extra) Object.assign(m, extra); return m; }
    function box(w, h, d, c, x, y, z) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), Array.isArray(c) ? c : mat(c)); m.position.set(x, y, z); return m; }
    function cyl(r, h, c, x, y, z, axis, seg) { var m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 28), mat(c)); m.position.set(x, y, z); if (axis === 'x') m.rotation.z = Math.PI / 2; if (axis === 'z') m.rotation.x = Math.PI / 2; return m; }
    function texMat(cv) { var t = new THREE.CanvasTexture(cv); t.anisotropy = MAXANISO; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }); }
    function faces(side, overrides) { var m = [side, side, side, side, side, side]; Object.keys(overrides).forEach(function (k) { m[+k] = overrides[k]; }); return m; }
    function mkCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
    function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); }
    function text(ctx, s, x, y, size, color, rot, weight, align) {
      ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
      ctx.font = (weight || 700) + ' ' + size + 'px ' + MONO; ctx.fillStyle = color; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(s, 0, 0); ctx.restore();
    }
    // Label sprite: dark chip with a cyan edge, always on top so it shows through the plate
    function label(s, bg, fg, scale) {
      var c = mkCanvas(10, 10), ctx = c.getContext('2d'), fs = 60; ctx.font = '700 ' + fs + 'px ' + LABEL_FONT;
      var w = Math.ceil(ctx.measureText(s).width) + 56, h = fs + 40; c.width = w; c.height = h;
      ctx.font = '700 ' + fs + 'px ' + LABEL_FONT;
      ctx.fillStyle = bg || 'rgba(8,16,30,.92)'; ctx.strokeStyle = bg ? 'rgba(0,0,0,.35)' : '#38d7f5'; ctx.lineWidth = 5;
      rr(ctx, 3, 3, w - 6, h - 6, 16); ctx.fill(); ctx.stroke();
      ctx.fillStyle = fg || '#e8f6ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, w / 2, h / 2 + 2);
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
      var k = scale || 1; sp.scale.set(k * w / h * 0.9, k * 0.9, 1); sp.renderOrder = 10; return sp;
    }
    var PARTS = {};
    function part(name, friendly, labelPos) {
      var g = new THREE.Group(); scene.add(g); g.visible = false; PARTS[name] = g;
      if (friendly) { var l = label(friendly, null, null, 1.0); l.position.set(labelPos[0], labelPos[1], labelPos[2]); g.add(l); g.userData.label = l; }
      g.userData.center = labelPos ? new THREE.Vector3(labelPos[0], 3.6, labelPos[2]) : new THREE.Vector3();
      return g;
    }

    // =====================================================================
    //  CAR BODY: your 4WD kit. One wood-colour plate, 4 TT motors hanging underneath it.
    // =====================================================================
    var HOLE = { LF: [-4.4, 0], LR: [-4.4, 0], RF: [4.4, 0], RR: [4.4, 0] };
    var MDF = mat(0xa9773f, { roughness: 0.9 });
    function plateMesh(y) {
      var sh = new THREE.Shape();
      function P(x, z) { return [x, -z]; }
      var o = [[4.6, -12.5], [6.4, -11.2], [6.4, -9.3], [5.1, -9.3], [5.1, -2.0], [7.3, -2.0], [7.3, 2.0], [5.1, 2.0], [5.1, 9.3], [6.4, 9.3], [6.4, 11.2], [4.6, 12.5]];
      sh.moveTo.apply(sh, P(-4.6, -12.5));
      sh.quadraticCurveTo(0, 12.95, 4.6, 12.5);
      o.slice(1).forEach(function (q) { sh.lineTo.apply(sh, P(q[0], q[1])); });
      sh.quadraticCurveTo(0, -12.95, -4.6, -12.5);
      o.slice(0, -1).reverse().forEach(function (q) { sh.lineTo.apply(sh, P(-q[0], q[1])); });
      function circ(x, z, r) { var h = new THREE.Path(); h.absarc(x, -z, r, 0, Math.PI * 2, true); sh.holes.push(h); }
      function rect(x, z, w, d) { var h = new THREE.Path(), X = x - w / 2, Y = -z - d / 2; h.moveTo(X, Y); h.lineTo(X + w, Y); h.lineTo(X + w, Y + d); h.lineTo(X, Y + d); h.lineTo(X, Y); sh.holes.push(h); }
      function cross(x, z, L, w) {
        var h = new THREE.Path(), a = L / 2, b = w / 2, Y = -z;
        var pts = [[-b, -a], [b, -a], [b, -b], [a, -b], [a, b], [b, b], [b, a], [-b, a], [-b, b], [-a, b], [-a, -b], [-b, -b]];
        h.moveTo(x + pts[0][0], Y + pts[0][1]); pts.slice(1).forEach(function (q) { h.lineTo(x + q[0], Y + q[1]); }); h.lineTo(x + pts[0][0], Y + pts[0][1]); sh.holes.push(h);
      }
      circ(0, -10.1, 1.1); circ(0, 10.1, 1.1);
      [-1, 1].forEach(function (s) {
        for (var k = 0; k < 3; k++) { rect(s * (2.2 + k * 0.6), -10.1, 0.3, 0.9); rect(s * (2.2 + k * 0.6), 10.1, 0.3, 0.9); }
        rect(s * 3.0, -11.75, 2.4, 0.22); rect(s * 3.0, 11.75, 2.4, 0.22);
        rect(s * 5.75, -10.2, 0.22, 1.3); rect(s * 5.75, 10.2, 0.22, 1.3);
        cross(s * 3.0, -6.1, 1.4, 0.4); cross(s * 3.0, 6.1, 1.4, 0.4);
        rect(s * 6.25, -1.0, 0.5, 0.5); rect(s * 6.25, 1.0, 0.5, 0.5);
        circ(s * 4.4, 0, 0.45);
        [-8.4, -4.0, 4.0, 8.4].forEach(function (z) { circ(s * 4.55, z, 0.16); });
        [-6, -4, 4, 6].forEach(function (z) { rect(s * 0.9, z, 0.3, 0.7); });
        circ(s * 2.0, -2.6, 0.16); circ(s * 2.0, 2.6, 0.16); circ(s * 5.0, -10.9, 0.16); circ(s * 5.0, 10.9, 0.16);
      });
      circ(0, -1.0, 0.18); circ(-0.6, 0.25, 0.18); circ(0.6, 0.25, 0.18); circ(0, 1.3, 0.18);
      var m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false, curveSegments: 28 }), MDF);
      m.rotation.x = -Math.PI / 2; m.position.y = y; return m;
    }
    var body = part('body', 'Car body', [0, 7.8, 0]);
    var plate = plateMesh(2.9); body.add(plate);
    var SUB = { plate: plate, motors: [], wheels: [] };
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) {
      var s = q[0], f = q[1], wz = f * 6.1, gz = wz - f * 0.65, key = (s < 0 ? 'L' : 'R') + (f < 0 ? 'F' : 'R');
      var mg = new THREE.Group(); body.add(mg);
      mg.add(box(2.2, 1.9, 3.7, 0xf4c20d, s * 4.5, 1.75, gz));
      [-1.2, 1.2].forEach(function (dz) { mg.add(box(0.3, 2.2, 1.1, 0xa9773f, s * 3.25, 1.85, gz + dz)); });
      mg.add(cyl(0.95, 2.6, 0xc9ced2, s * 4.4, 1.75, f * 2.3, 'z'));
      mg.add(cyl(0.8, 0.12, 0xf2f2f2, s * 4.4, 1.75, f * 1.0, 'z'));
      mg.add(box(0.22, 0.32, 0.25, 0xd9d9d9, s * 4.4, 2.3, f * 0.85));
      mg.add(box(0.22, 0.32, 0.25, 0xd9d9d9, s * 4.4, 1.2, f * 0.85));
      [-1.2, 1.2].forEach(function (dz) { mg.add(cyl(0.12, 2.9, 0xb5b9bc, s * 4.5, 1.75, gz + dz, 'x')); mg.add(cyl(0.24, 0.2, 0x9ea3a6, s * 3.3, 1.75, gz + dz, 'x', 6)); });
      mg.add(cyl(0.28, 3.6, 0xf2f2f2, s * 5.0, 1.75, wz, 'x'));
      mg.add(cyl(1.15, 0.12, 0x151515, s * 3.25, 1.75, wz, 'x'));
      var wg = new THREE.Group(); wg.position.set(s * 6.9, 1.75, wz); body.add(wg);
      wg.add(cyl(3.3, 2.6, 0x161616, 0, 0, 0, 'x', 40));
      for (var i = 0; i < 28; i++) { var th = i / 28 * Math.PI * 2, tb = box(2.5, 0.14, 0.5, 0x0a0a0a, 0, 3.32 * Math.cos(th), 3.32 * Math.sin(th)); tb.rotation.x = -th; wg.add(tb); }
      wg.add(cyl(2.1, 2.66, 0xf4c20d, 0, 0, 0, 'x', 32));
      for (var k2 = 0; k2 < 6; k2++) { var sp = box(0.3, 3.9, 0.45, 0xd9a800, s * 1.36, 0, 0); sp.rotation.x = k2 * Math.PI / 6; wg.add(sp); }
      wg.add(cyl(0.45, 2.75, 0xf2f2f2, 0, 0, 0, 'x'));
      SUB.motors.push({ key: key, side: s, front: f, g: mg, center: new THREE.Vector3(s * 4.5, 1.75, gz) });
      SUB.wheels.push({ key: key, side: s, front: f, g: wg, rest: wg.position.clone() });
    });

    // =====================================================================
    //  ARDUINO UNO (real layout in millimetres; group scaled 0.1 = cm)
    // =====================================================================
    var UNO = { w: 68.58, d: 53.34 };
    var brain = part('brain', 'Arduino Uno', [2.75, 8.6, -4.2]);
    var unoG = new THREE.Group(); unoG.position.set(2.75, 3.5, -4.2); unoG.rotation.y = Math.PI / 2; unoG.scale.setScalar(0.1); brain.add(unoG);
    function ul(x, y) { return [x - UNO.w / 2, UNO.d / 2 - y]; }
    var DIG = {}; for (var p = 0; p <= 7; p++) DIG[p] = 66.04 - p * 2.54; for (p = 8; p <= 13; p++) DIG[p] = 44.196 - (p - 8) * 2.54;
    DIG.GND = 44.196 - 6 * 2.54; DIG.AREF = DIG.GND - 2.54; DIG.SDA = DIG.AREF - 2.54; DIG.SCL = DIG.SDA - 2.54;
    var PWR = { NC: 27.94, IOREF: 30.48, RESET: 33.02, '3.3V': 35.56, '5V': 38.1, GND1: 40.64, GND2: 43.18, VIN: 45.72 };
    var ANA = { A0: 50.8, A1: 53.34, A2: 55.88, A3: 58.42, A4: 60.96, A5: 63.5 };
    (function buildUno() {
      var s = 44.8, W = Math.round(UNO.w * s), H = Math.round(UNO.d * s), cv = mkCanvas(W, H), c = cv.getContext('2d');
      var X = function (mm) { return mm * s; }, Y = function (mm) { return (UNO.d - mm) * s; };
      c.fillStyle = '#1b6cb3'; rr(c, 0, 0, W, H, 60); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.07)'; c.lineWidth = 6;
      for (var i = 0; i < 26; i++) { c.beginPath(); c.moveTo(X(18 + i * 1.9), Y(14)); c.lineTo(X(18 + i * 1.9), Y(28)); c.lineTo(X(24 + i * 1.6), Y(31)); c.stroke(); }
      [[14, 2.54], [15.24, 50.8], [66.04, 7.62], [66.04, 35.56]].forEach(function (h) { c.fillStyle = '#e8eef3'; c.beginPath(); c.arc(X(h[0]), Y(h[1]), 1.6 * s, 0, 7); c.fill(); c.fillStyle = '#1b6cb3'; c.beginPath(); c.arc(X(h[0]), Y(h[1]), 1.0 * s, 0, 7); c.fill(); });
      var wht = '#f4f8fb', fs = 1.25 * s;
      var dl = { 0: 'RX◂0', 1: 'TX▸1', 2: '2', 3: '~3', 4: '4', 5: '~5', 6: '~6', 7: '7', 8: '8', 9: '~9', 10: '~10', 11: '~11', 12: '12', 13: '13', GND: 'GND', AREF: 'AREF', SDA: 'SDA', SCL: 'SCL' };
      Object.keys(dl).forEach(function (k) { text(c, dl[k], X(DIG[k]), Y(46.2), fs, wht, -Math.PI / 2); });
      text(c, 'DIGITAL (PWM~)', X(49), Y(41.2), 1.6 * s, wht);
      c.strokeStyle = wht; c.lineWidth = 0.25 * s; c.beginPath(); c.moveTo(X(19.5), Y(43)); c.lineTo(X(67.5), Y(43)); c.stroke();
      var pl = { IOREF: 'IOREF', RESET: 'RESET', '3.3V': '3.3V', '5V': '5V', GND1: 'GND', GND2: 'GND', VIN: 'VIN' };
      Object.keys(pl).forEach(function (k) { text(c, pl[k], X(PWR[k]), Y(7.6), fs, wht, -Math.PI / 2); });
      Object.keys(ANA).forEach(function (k) { text(c, k, X(ANA[k]), Y(6.4), fs, wht, -Math.PI / 2); });
      text(c, 'POWER', X(36.8), Y(12.6), 1.6 * s, wht); text(c, 'ANALOG IN', X(57.2), Y(12.6), 1.6 * s, wht);
      c.beginPath(); c.moveTo(X(27), Y(11)); c.lineTo(X(46.7), Y(11)); c.moveTo(X(49.8), Y(11)); c.lineTo(X(64.5), Y(11)); c.stroke();
      c.lineWidth = 0.7 * s; c.beginPath(); c.arc(X(36.2), Y(33.5), 2.6 * s, 0, 7); c.stroke(); c.beginPath(); c.arc(X(42.0), Y(33.5), 2.6 * s, 0, 7); c.stroke();
      text(c, '−', X(36.2), Y(33.6), 2.8 * s, wht); text(c, '+', X(42.0), Y(33.6), 2.8 * s, wht);
      text(c, 'UNO', X(53.5), Y(33.3), 4.2 * s, wht, 0, 700);
      text(c, 'ARDUINO', X(41.5), Y(28.7), 2.1 * s, wht);
      text(c, 'V173', X(61.5), Y(30), 1.3 * s, wht);
      text(c, 'L', X(28.5), Y(40.1), fs, wht); text(c, 'TX', X(28.5), Y(37.2), fs, wht); text(c, 'RX', X(28.5), Y(35.4), fs, wht);
      text(c, 'ON', X(64.2), Y(23.9), fs, wht); text(c, 'ICSP', X(63.9), Y(32.4), fs, wht); text(c, 'RESET', X(8.3), Y(45.5), fs, wht);
      text(c, 'ICSP', X(19.6), Y(48.1), fs * 0.9, wht); text(c, '7-12V', X(6.5), Y(14.2), fs, wht);
      var pcb = new THREE.Mesh(new THREE.BoxGeometry(UNO.w, 1.6, UNO.d), faces(mat(0x15548c), { 2: texMat(cv) })); pcb.position.y = 0.8; unoG.add(pcb);
      [[14, 2.54], [15.24, 50.8], [66.04, 7.62], [66.04, 35.56]].forEach(function (h) { var q = ul(h[0], h[1]); unoG.add(cyl(1.6, 3, 0xdddddd, q[0], -1.5, q[1])); });
      function header(x0, x1, y) { var q0 = ul(x0, y), q1 = ul(x1, y), len = Math.abs(q1[0] - q0[0]) + 2.54; unoG.add(box(len, 8.5, 2.54, 0x161616, (q0[0] + q1[0]) / 2, 1.6 + 4.25, q0[1])); }
      header(DIG[7], DIG[0], 50.8); header(DIG.SCL, DIG[8], 50.8); header(PWR.NC, PWR.VIN, 2.54); header(ANA.A0, ANA.A5, 2.54);
      var holeMat = mat(0x000000);
      function hole(x, y) { var q = ul(x, y); var m = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 1.0), holeMat); m.position.set(q[0], 10.15, q[1]); unoG.add(m); }
      Object.keys(DIG).forEach(function (k) { hole(DIG[k], 50.8); }); Object.keys(PWR).forEach(function (k) { hole(PWR[k], 2.54); }); Object.keys(ANA).forEach(function (k) { hole(ANA[k], 2.54); });
      var cc = mkCanvas(1024, 220), cx = cc.getContext('2d'); cx.fillStyle = '#1b1b1b'; cx.fillRect(0, 0, 1024, 220);
      text(cx, 'ATMEGA328P-PU', 512, 80, 64, '#cfd3d6'); text(cx, 'AVR', 512, 150, 44, '#9aa0a5');
      cx.fillStyle = '#2c2c2c'; cx.beginPath(); cx.arc(40, 110, 22, 0, 7); cx.fill();
      var q = ul(46.9, 19.2); unoG.add(box(35.6, 3.6, 7.4, faces(mat(0x1b1b1b), { 2: texMat(cc) }), q[0], 3.4, q[1]));
      for (i = 0; i < 14; i++) { var qa = ul(30.4 + i * 2.54, 15.1), qb = ul(30.4 + i * 2.54, 23.3); unoG.add(box(0.6, 2, 1.2, 0xc9ced2, qa[0], 2.4, qa[1])); unoG.add(box(0.6, 2, 1.2, 0xc9ced2, qb[0], 2.4, qb[1])); }
      q = ul(5.7, 38); unoG.add(box(16, 10.9, 12.2, 0xbfc5ca, q[0] - 3, 1.6 + 5.45, q[1]));
      q = ul(5.0, 7.8); unoG.add(box(14, 11, 9, 0x111111, q[0] - 2, 1.6 + 5.5, q[1]));
      q = ul(22.5, 38.5); unoG.add(box(5, 1, 5, 0x1b1b1b, q[0], 2.1, q[1]));
      q = ul(31.5, 32.5); var xt = cyl(1.8, 1.4, 0xd6dbde, q[0], 2.3, q[1]); xt.scale.set(2.2, 1, 1); unoG.add(xt);
      q = ul(8.3, 49.2); unoG.add(box(6, 3, 6, 0xd9d9d9, q[0], 3.1, q[1])); unoG.add(cyl(1.6, 1.2, 0xc0392b, q[0], 5.0, q[1]));
      [[13.5, 17.5], [17.5, 17.5]].forEach(function (cp) { q = ul(cp[0], cp[1]); unoG.add(cyl(3.1, 7, 0x9aa4ab, q[0], 5.1, q[1])); });
      for (var a = 0; a < 3; a++) for (var b2 = 0; b2 < 2; b2++) { q = ul(63.6 + b2 * 2.54, 27.9 - a * 2.54); unoG.add(box(0.64, 6, 0.64, 0xd4af37, q[0], 4.6, q[1])); }
      [[31.3, 40.1, 0xffb000], [31.3, 37.2, 0xffb000], [31.3, 35.4, 0xffb000], [66.2, 26.2, 0x2ee86b]].forEach(function (l) { q = ul(l[0], l[1]); unoG.add(box(1.6, 0.6, 0.8, l[2], q[0], 1.9, q[1])); });
    })();
    function unoPin(name) {
      var x, y;
      if (DIG[name] !== undefined) { x = DIG[name]; y = 50.8; } else if (PWR[name] !== undefined) { x = PWR[name]; y = 2.54; } else { x = ANA[name]; y = 2.54; }
      var q = ul(x, y); unoG.updateMatrixWorld(true); return unoG.localToWorld(new THREE.Vector3(q[0], 10.1, q[1]));
    }

    // =====================================================================
    //  BREADBOARD (half-size, 400 holes: columns 1-30, rows a-j, 2 rails each side)
    // =====================================================================
    var BB = { w: 82.5, d: 54.5, h: 8.5 };
    var ROWZ = { j: -13.97, i: -11.43, h: -8.89, g: -6.35, f: -3.81, e: 3.81, d: 6.35, c: 8.89, b: 11.43, a: 13.97 };
    var RAILZ = { 'top+': -24.13, 'top-': -21.59, 'bot-': 21.59, 'bot+': 24.13 };
    var RAILCOLS = []; [2, 8, 14, 20, 26].forEach(function (g0) { for (var k = 0; k < 5; k++) RAILCOLS.push(g0 + k); });
    function colX(c) { return (c - 15.5) * 2.54; }
    var bbPart = part('bb', 'Breadboard', [-2.9, 7.2, -4.5]);
    var bbG = new THREE.Group(); bbG.position.set(-2.9, 3.2, -4.5); bbG.rotation.y = Math.PI / 2; bbG.scale.setScalar(0.1); bbPart.add(bbG);
    (function buildBB() {
      var s = 37.2, W = Math.round(BB.w * s), H = Math.round(BB.d * s), cv = mkCanvas(W, H), c = cv.getContext('2d');
      var X = function (lx) { return (lx + BB.w / 2) * s; }, Y = function (lz) { return (lz + BB.d / 2) * s; };
      c.fillStyle = '#f5f4ef'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#e2e0d7'; c.fillRect(0, Y(-1.6), W, 3.2 * s);
      c.fillStyle = '#ebe9e1'; c.fillRect(0, Y(-17.6), W, 0.5 * s); c.fillRect(0, Y(17.1), W, 0.5 * s);
      function sq(x, y) { var hs = 0.55 * s; c.fillStyle = '#b9b7ae'; c.fillRect(x - hs - 4, y - hs - 4, 2 * hs + 8, 2 * hs + 8); c.fillStyle = '#2f2f2f'; c.fillRect(x - hs, y - hs, 2 * hs, 2 * hs); }
      for (var col = 1; col <= 30; col++) Object.keys(ROWZ).forEach(function (r) { sq(X(colX(col)), Y(ROWZ[r])); });
      Object.keys(RAILZ).forEach(function (k) { RAILCOLS.forEach(function (col) { sq(X(colX(col)), Y(RAILZ[k])); }); });
      c.lineWidth = 0.35 * s;
      [['#d62f2f', -26.1], ['#2563c9', -19.6], ['#2563c9', 19.6], ['#d62f2f', 26.1]].forEach(function (l) { c.strokeStyle = l[0]; c.beginPath(); c.moveTo(X(-38), Y(l[1])); c.lineTo(X(38), Y(l[1])); c.stroke(); });
      [[-24.13, '+', '#d62f2f'], [-21.59, '−', '#2563c9'], [21.59, '−', '#2563c9'], [24.13, '+', '#d62f2f']].forEach(function (r) { text(c, r[1], X(-39.3), Y(r[0]), 2.4 * s, r[2]); text(c, r[1], X(39.3), Y(r[0]), 2.4 * s, r[2]); });
      for (col = 1; col <= 30; col++) { text(c, String(col), X(colX(col)), Y(-16.6), 1.45 * s, '#6f6c62'); text(c, String(col), X(colX(col)), Y(16.6), 1.45 * s, '#6f6c62'); }
      Object.keys(ROWZ).forEach(function (r) { text(c, r, X(-39.3), Y(ROWZ[r]), 1.7 * s, '#6f6c62'); text(c, r, X(39.3), Y(ROWZ[r]), 1.7 * s, '#6f6c62'); });
      var bodyM = new THREE.Mesh(new THREE.BoxGeometry(BB.w, BB.h, BB.d), faces(mat(0xe9e7df), { 2: texMat(cv) })); bodyM.position.y = BB.h / 2; bbG.add(bodyM);
    })();
    function bbLocal(id) {
      if (id[0] === '+' || id[0] === '-') return [colX(+id.slice(1)), RAILZ[id[0] === '+' ? 'top+' : 'top-']];
      return [colX(+id.slice(1)), ROWZ[id[0]]];
    }
    function bbHole(id) { var q = bbLocal(id); bbG.updateMatrixWorld(true); return bbG.localToWorld(new THREE.Vector3(q[0], BB.h, q[1])); }

    // =====================================================================
    //  L298N MOTOR DRIVER
    // =====================================================================
    var boss = part('boss', 'L298N motor driver', [0, 8.4, 3.9]);
    var L = { x: 0, y: 3.4, z: 3.9 };
    var LP = {
      OUT1: [-1.85, 3.3], OUT2: [-1.85, 4.3], OUT3: [1.85, 3.3], OUT4: [1.85, 4.3], '12V': [-0.55, 5.55], GND: [0, 5.55], '5V': [0.55, 5.55],
      ENA: [-0.635, 2.05], IN1: [-0.381, 2.05], IN2: [-0.127, 2.05], IN3: [0.127, 2.05], IN4: [0.381, 2.05], ENB: [0.635, 2.05]
    };
    (function buildBoss() {
      var cv = mkCanvas(1024, 1024), c = cv.getContext('2d'), s = 1024 / 4.3;
      var X = function (x) { return (x + 2.15) * s; }, Y = function (z) { return (z - L.z + 2.15) * s; };
      c.fillStyle = '#c4212b'; c.fillRect(0, 0, 1024, 1024);
      text(c, 'L298N', X(0), Y(2.75), 64, '#ffffff');
      ['ENA', 'IN1', 'IN2', 'IN3', 'IN4', 'ENB'].forEach(function (k) { text(c, k, X(LP[k][0]), Y(2.5), 22, '#ffffff', -Math.PI / 2); });
      text(c, 'OUT1', X(-1.2), Y(3.3), 30, '#fff'); text(c, 'OUT2', X(-1.2), Y(4.3), 30, '#fff');
      text(c, 'OUT3', X(1.2), Y(3.3), 30, '#fff'); text(c, 'OUT4', X(1.2), Y(4.3), 30, '#fff');
      text(c, '12V', X(-0.55), Y(5.05), 30, '#fff'); text(c, 'GND', X(0), Y(5.05), 30, '#fff'); text(c, '5V', X(0.55), Y(5.05), 30, '#fff');
      text(c, '5V-EN', X(1.45), Y(5.95), 24, '#fff');
      boss.add(box(4.3, 0.16, 4.3, faces(mat(0xa61a23), { 2: texMat(cv) }), L.x, L.y, L.z));
      boss.add(box(2.4, 2.3, 0.5, 0x2a2a2a, 0, 4.65, 4.1)); for (var f = 0; f < 7; f++) boss.add(box(0.12, 2.0, 1.5, 0x3a3a3a, -1.05 + f * 0.35, 4.6, 4.75));
      boss.add(box(2.0, 0.9, 0.35, 0x1b1b1b, 0, 3.9, 3.75));
      boss.add(box(0.75, 0.75, 1.9, 0x1f63c2, -1.85, 3.85, 3.8)); boss.add(box(0.75, 0.75, 1.9, 0x1f63c2, 1.85, 3.85, 3.8));
      boss.add(box(1.85, 0.75, 0.75, 0x1f63c2, 0, 3.85, 5.55));
      ['OUT1', 'OUT2', 'OUT3', 'OUT4', '12V', 'GND', '5V'].forEach(function (k) { boss.add(cyl(0.16, 0.1, 0xc9ced2, LP[k][0], 4.25, LP[k][1])); });
      ['ENA', 'IN1', 'IN2', 'IN3', 'IN4', 'ENB'].forEach(function (k) { boss.add(box(0.064, 0.6, 0.064, 0xd4af37, LP[k][0], 3.78, LP[k][1])); });
      boss.add(box(1.55, 0.25, 0.25, 0x1b1b1b, 0, 3.6, 2.05));
      boss.add(box(0.25, 0.3, 0.5, 0x111111, 1.45, 3.65, 5.55));
      boss.add(box(0.22, 0.12, 0.3, 0xff2a2a, 1.6, 3.53, 2.6));   // power light
    })();
    var caps = part('caps', null);
    caps.add(box(0.3, 0.45, 0.55, 0x111111, LP.ENA[0], 4.0, 2.05)); caps.add(box(0.3, 0.45, 0.55, 0x111111, LP.ENB[0], 4.0, 2.05));
    caps.userData.center = new THREE.Vector3(0, 4, 2.05);

    // =====================================================================
    //  BATTERY + SWITCH
    // =====================================================================
    var bat = part('battery', 'Battery (2 × 18650)', [0, 7.4, 9.5]);
    bat.add(box(7.7, 1.5, 4.0, 0x1c1c1c, 0, 3.95, 9.5));
    bat.add(cyl(0.9, 6.5, 0x2f7de1, 0, 4.55, 8.6, 'x')); bat.add(cyl(0.9, 6.5, 0x2f7de1, 0, 4.55, 10.4, 'x'));
    bat.add(box(1.4, 0.6, 0.55, 0x2b2b2b, 5.0, 3.5, 10.6)); bat.add(box(0.3, 0.35, 0.3, 0xeeeeee, 4.8, 3.95, 10.6));
    [4.6, 5.0, 5.4].forEach(function (x) { bat.add(box(0.08, 0.2, 0.45, 0xd4af37, x, 3.5, 11.08)); });

    // =====================================================================
    //  SENSORS
    // =====================================================================
    // MG90S servo standing at the front; its shaft is at x = 0, z = NECK_Z. The eyes sit on a
    // "head" group that pivots on that shaft, so the servo can turn them left and right.
    var NECK_Z = -11.3, BASE_Y = 3.18;
    var servo = part('servo', 'MG90S (Neck)', [0, 6.4, -9.6]);
    (function () {
      var cv = mkCanvas(512, 520), c = cv.getContext('2d'); c.fillStyle = '#161616'; c.fillRect(0, 0, 512, 520);
      text(c, 'TowerPro', 256, 150, 58, '#d8d8d8'); text(c, 'MG90S', 256, 260, 92, '#ffffff'); text(c, 'METAL GEAR', 256, 360, 44, '#c9a227'); text(c, '9g  4.8–6V', 256, 440, 40, '#aaaaaa');
      var bx = -0.55;                                                          // body is offset: the shaft sits near one end
      servo.add(box(2.28, 2.25, 1.22, faces(mat(0x161616), { 5: texMat(cv) }), bx, BASE_Y + 1.125, NECK_Z));
      servo.add(box(3.3, 0.2, 1.22, 0x161616, bx, BASE_Y + 1.75, NECK_Z));    // mounting ears
      [-1.45, 1.45].forEach(function (dx) { servo.add(cyl(0.12, 0.24, 0x8a8f94, bx + dx, BASE_Y + 1.88, NECK_Z)); }); // ear screws
      servo.add(cyl(0.62, 0.42, 0x161616, 0, BASE_Y + 2.46, NECK_Z));          // gear dome
      servo.add(cyl(0.34, 0.3, 0x161616, -0.75, BASE_Y + 2.4, NECK_Z));
      servo.add(cyl(0.18, 0.24, 0xc9a227, 0, BASE_Y + 2.78, NECK_Z));          // brass output spline
      // lead: brown, red, orange, into a black plug lying on the plate behind the servo
      [['BROWN', -0.12], ['RED', 0], ['ORANGE', 0.12]].forEach(function (w) { servo.add(box(0.1, 0.1, 1.4, COLORS[w[0]], bx - 0.8 + w[1], BASE_Y + 0.15, NECK_Z + 1.3)); });
      servo.add(box(0.5, 0.26, 0.55, 0x101010, bx - 0.8, BASE_Y + 0.15, NECK_Z + 2.2));
    })();
    var eyes = part('eyes', 'HC-SR04 (Eyes)', [0, 10.0, -12]);
    var head = new THREE.Group(); head.position.set(0, 0, NECK_Z); eyes.add(head);
    (function () {
      var Y = 7.25, Z = -0.6;                                                  // board centre, relative to the shaft
      var cv = mkCanvas(1024, 460), c = cv.getContext('2d'); c.fillStyle = '#1f63c2'; c.fillRect(0, 0, 1024, 460);
      text(c, 'HC-SR04', 512, 70, 64, '#fff'); text(c, 'T', 220, 400, 40, '#fff'); text(c, 'R', 804, 400, 40, '#fff');
      var back = mkCanvas(1024, 460), b = back.getContext('2d'); b.fillStyle = '#1f63c2'; b.fillRect(0, 0, 1024, 460);
      ['Gnd', 'Echo', 'Trig', 'Vcc'].forEach(function (s, i) { text(b, s, 512 - 0.381 * 227 + i * 0.254 * 227, 385, 34, '#fff', -Math.PI / 2); });
      head.add(box(1.9, 0.12, 0.42, 0xf2f2f2, 0, BASE_Y + 2.96, 0));           // servo horn
      head.add(box(2.4, 0.12, 1.3, 0x1b1b1b, 0, BASE_Y + 3.08, -0.15));        // bracket: flat part on the horn
      head.add(box(2.4, 1.1, 0.12, 0x1b1b1b, 0, BASE_Y + 3.6, Z + 0.14));      // bracket: upright part behind the board
      head.add(box(4.5, 2.0, 0.16, faces(mat(0x1f63c2), { 5: texMat(cv), 4: texMat(back) }), 0, Y, Z));
      head.add(cyl(0.8, 1.2, 0xd0d6da, -1.3, Y + 0.05, Z - 0.6, 'z')); head.add(cyl(0.8, 1.2, 0xd0d6da, 1.3, Y + 0.05, Z - 0.6, 'z'));
      head.add(cyl(0.55, 1.22, 0x3a3a3a, -1.3, Y + 0.05, Z - 0.6, 'z')); head.add(cyl(0.55, 1.22, 0x3a3a3a, 1.3, Y + 0.05, Z - 0.6, 'z'));
      [-0.381, -0.127, 0.127, 0.381].forEach(function (x) { head.add(box(0.064, 0.064, 0.6, 0xd4af37, x, Y - 0.85, Z + 0.35)); });
    })();

    // =====================================================================
    //  CONNECTION POINTS
    // =====================================================================
    function V(a) { return new THREE.Vector3(a[0], a[1], a[2]); }
    var UP = [0, 1, 0];
    function EP(name) {
      if (name.indexOf('U:') === 0) { var n = name.slice(2); return { p: unoPin(n), d: UP, plug: true, lab: /^\d+$/.test(n) ? 'pin ' + n : n.replace('GND1', 'GND') }; }
      if (name.indexOf('B:') === 0) { var id = name.slice(2); return { p: bbHole(id), d: UP, plug: true, lab: id[0] === '+' ? '+ row, ' + id.slice(1) : id[0] === '-' ? '− row, ' + id.slice(1) : id }; }
      if (name.indexOf('L:') === 0) { var k = name.slice(2), q = LP[k], hdr = ['ENA', 'IN1', 'IN2', 'IN3', 'IN4', 'ENB'].indexOf(k) >= 0; return { p: V([q[0], hdr ? 4.08 : 4.3, q[1]]), d: UP, plug: hdr, lab: k }; }
      var M = {
        'LF+': [[-4.4, 2.3, -0.75], [0, 0, 1]], 'LF-': [[-4.4, 1.2, -0.75], [0, 0, 1]], 'RF+': [[4.4, 2.3, -0.75], [0, 0, 1]], 'RF-': [[4.4, 1.2, -0.75], [0, 0, 1]],
        'LR+': [[-4.4, 2.3, 0.75], [0, 0, -1]], 'LR-': [[-4.4, 1.2, 0.75], [0, 0, -1]], 'RR+': [[4.4, 2.3, 0.75], [0, 0, -1]], 'RR-': [[4.4, 1.2, 0.75], [0, 0, -1]],
        'BAT-': [[-3.0, 4.2, 7.5], [0, 0, -1]], 'BAT+': [[3.0, 4.2, 7.5], [0, 0, -1]], 'SWin': [[5.0, 3.5, 11.3], [0, 0, 1], 'middle leg'], 'SWout': [[5.4, 3.5, 11.3], [0, 0, 1], 'end leg'],
        'S:VCC': [[-0.381, 6.4, -11.25], [0, 0, 1], 'Vcc'], 'S:TRIG': [[-0.127, 6.4, -11.25], [0, 0, 1], 'Trig'], 'S:ECHO': [[0.127, 6.4, -11.25], [0, 0, 1], 'Echo'], 'S:GND': [[0.381, 6.4, -11.25], [0, 0, 1], 'Gnd'],
        'SV:GND': [[-1.47, 3.33, -8.83], [0, 0, 1], 'GND'], 'SV:5V': [[-1.35, 3.33, -8.83], [0, 0, 1], '+5V'], 'SV:SIGNAL': [[-1.23, 3.33, -8.83], [0, 0, 1], 'signal']
      };
      var m = M[name], sensor = name.indexOf(':') > 0;
      return { p: V(m[0]), d: m[1], plug: sensor, lab: m[2] || (name.indexOf('BAT') === 0 ? 'battery ' + name.slice(3) : name.indexOf('SW') === 0 ? 'switch' : 'motor ' + name.slice(2)) };
    }

    // =====================================================================
    //  JUMPER WIRES
    // =====================================================================
    var housingMat = mat(0x141414);
    var lastPlug = null;
    function plug(g, e) {
      var dir = V(e.d).normalize(), len = 1.3;
      var hb = new THREE.Mesh(new THREE.BoxGeometry(0.25, len, 0.25), housingMat);
      hb.position.copy(e.p).add(dir.clone().multiplyScalar(len / 2));
      hb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); g.add(hb); lastPlug = hb;
      return e.p.clone().add(dir.clone().multiplyScalar(len));
    }
    function makeWire(a, b, color, hole) {
      var A = EP(a), B = EP(b), g = new THREE.Group();
      lastPlug = null; var a1 = A.plug ? plug(g, A) : A.p.clone().add(V(A.d).multiplyScalar(0.35)); var plugA = lastPlug;
      lastPlug = null; var b1 = B.plug ? plug(g, B) : B.p.clone().add(V(B.d).multiplyScalar(0.35)); var plugB = lastPlug;
      var pts = [A.p.clone(), a1, a1.clone().add(V(A.d).multiplyScalar(0.6))];
      if (hole) { pts.push(V([hole[0], 2.3, hole[1]]), V([hole[0], 4.2, hole[1]])); }
      var last = pts[pts.length - 1], b2 = b1.clone().add(V(B.d).multiplyScalar(0.6)), dist = last.distanceTo(b2);
      var mid = last.clone().add(b2).multiplyScalar(0.5); mid.y = Math.max(last.y, b2.y) + 0.4 + dist * 0.12;
      pts.push(mid, b2, b1, B.p.clone());
      var curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      var segs = 120, radial = 10, wmat = mat(COLORS[color], { emissive: new THREE.Color(0x000000) });
      var tube = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, 0.07, radial, false), wmat);
      tube.userData = { segs: segs, radial: radial, grow: 1 }; g.add(tube);
      var dots = [];
      [A.p, B.p].forEach(function (pp) {
        var dot = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.07, 10, 32), mat(COLORS[color], { emissive: new THREE.Color(COLORS[color]), emissiveIntensity: 0.6 }));
        dot.position.copy(pp).add(new THREE.Vector3(0, 0.05, 0)); dot.rotation.x = Math.PI / 2; g.add(dot); dots.push(dot);
      });
      g.userData = { tube: tube, dots: dots, A: A, B: B, color: color, plugA: plugA, plugB: plugB }; g.visible = false; scene.add(g);
      return g;
    }
    // Glowing "look here" beacon: a soft cyan sphere + ring that blinks
    var beaconGeo = new THREE.SphereGeometry(0.42, 20, 14), ringGeo = new THREE.RingGeometry(0.55, 0.68, 40);
    function makeBeacon(p) {
      var g = new THREE.Group(); g.position.copy(p);
      var s = new THREE.Mesh(beaconGeo, new THREE.MeshBasicMaterial({ color: 0x38d7f5, transparent: true, opacity: 0.35, depthTest: false }));
      var r = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x7ef0ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthTest: false }));
      s.renderOrder = 8; r.renderOrder = 9; g.add(s); g.add(r); g.userData = { s: s, r: r }; g.visible = false; scene.add(g); return g;
    }

    // ---------- performance: merge look-alike meshes ----------
    // Hundreds of tiny meshes (tyre treads, header pins, breadboard holes) each cost a draw call, which is what
    // makes phones stutter. Inside every group, meshes with identical materials are baked into one mesh.
    // Every triangle, texture and colour stays exactly the same, and groups that move (parts, motors, wheels)
    // are never merged across, so all animations keep working.
    function matKey(m) {
      function u(t) { return t ? t.uuid : ''; }
      return [m === MDF ? 'MDF' : m.type, m.color.getHex(), m.emissive.getHex(), m.emissiveIntensity, u(m.map), u(m.normalMap), u(m.emissiveMap), u(m.alphaMap), u(m.roughnessMap),
        m.roughness, m.metalness, m.transparent, m.opacity, m.alphaTest, m.side, m.depthTest, m.depthWrite, m.flatShading, m.wireframe, m.vertexColors, m.blending, m.polygonOffset].join('|');
    }
    function mergeGroup(node, keep) {
      var buckets = {};
      node.children.forEach(function (m) {
        if (!m.isMesh || Array.isArray(m.material) || m.children.length || keep.indexOf(m) >= 0 || !m.visible || m.renderOrder) return;
        var g = m.geometry, a = m.material;
        if (a.type !== 'MeshStandardMaterial' || !g.index || !g.attributes.normal || !g.attributes.uv || Object.keys(g.attributes).length !== 3) return;   // face groups are ignored with a single material
        m.updateMatrix(); if (m.matrix.determinant() <= 0) return;
        (buckets[matKey(a)] = buckets[matKey(a)] || []).push(m);
      });
      Object.keys(buckets).forEach(function (k) {
        var list = buckets[k]; if (list.length < 2) return;
        var nv = 0, ni = 0; list.forEach(function (m) { nv += m.geometry.attributes.position.count; ni += m.geometry.index.count; });
        var pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni), ov = 0, oi = 0;
        list.forEach(function (m) {
          var g = m.geometry.clone(); g.applyMatrix4(m.matrix);
          pos.set(g.attributes.position.array, ov * 3); nor.set(g.attributes.normal.array, ov * 3); uv.set(g.attributes.uv.array, ov * 2);
          var src = g.index.array; for (var i = 0; i < src.length; i++) idx[oi + i] = src[i] + ov;
          ov += g.attributes.position.count; oi += src.length; g.dispose(); node.remove(m);
        });
        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.computeBoundingSphere(); geo.computeBoundingBox();
        node.add(new THREE.Mesh(geo, list[0].material));
      });
    }
    if (opts.merge !== false) Object.keys(PARTS).forEach(function (k) {
      var groups = []; PARTS[k].traverse(function (o) { if (!o.isMesh && !o.isSprite) groups.push(o); });
      groups.forEach(function (g) { mergeGroup(g, [SUB.plate]); });
    });

    // ---------- attach 3D objects to steps ----------
    var S = STEPS.map(function (d) { return Object.assign({}, d); });
    S.forEach(function (s, i) {
      s.wireObjs = (s.wires || []).map(function (w) { return { g: makeWire(w[0], w[1], w[2], w[3] ? HOLE[w[3]] : null), color: w[2] }; });
      s.pinObjs = [];
      (s.marks || []).forEach(function (m) { var l = label(m[3], m[4] || null, m[5] || null, 0.45); l.position.set(m[0], m[1], m[2]); l.visible = false; scene.add(l); s.pinObjs.push(l); });
      s.beaconObjs = [];
      s.wireObjs.forEach(function (w) {
        [w.g.userData.A, w.g.userData.B].forEach(function (e) { var l = label(e.lab, null, null, 0.42); l.position.copy(e.p).add(new THREE.Vector3(0, 1.9, 0)); l.visible = false; scene.add(l); s.pinObjs.push(l); });
        s.beaconObjs.push(makeBeacon(w.g.userData.B.p));            // the destination blinks
      });
      (s.beacons || []).forEach(function (b) { s.beaconObjs.push(makeBeacon(V(b))); });
      (s.parts || []).forEach(function (n) { PARTS[n].userData.step = i + 1; });
    });
    PARTS.caps.userData.hideAt = S.findIndex(function (s) { return s.title === 'Pull off two tiny caps'; }) + 1;

    // =====================================================================
    //  CAMERA, MODES, STEPS
    // =====================================================================
    var cur = 0, drop = {}, camGoal = null, active = true, inspect = false;
    var DIST = opts.distScale || 1.25;   // how far the camera sits from each step (a closer value frames parts tighter)
    var ZOOMS = {
      brain: { t: [2.75, 4.2, -4.2], d: 7.5, top: true }, bb: { t: [-2.9, 4.1, -4.5], d: 7.5, top: true }, boss: { t: [0, 4, 3.9], d: 5.5, top: true },
      battery: { t: [1.5, 4, 9.8], d: 9 }, eyes: { t: [0, 6.8, -12], d: 9 }, servo: { t: [0, 5.0, -11.3], d: 9 }, body: { t: [0, 2, 0], d: 28 },
      under: { t: [0, 1.6, 0], d: 24, under: true }, home: { t: [0, 3, 0], d: 36 }
    };
    function setStepVisibility() {
      var s = S[cur - 1];
      Object.keys(PARTS).forEach(function (k) {
        var p = PARTS[k], st = p.userData.step || 1, show = cur === 0 ? true : st <= cur;
        if (p.userData.hideAt && (cur === 0 || cur >= p.userData.hideAt)) show = false;
        if (show && !p.visible && cur > 0) drop[k] = performance.now();
        p.visible = show;
        if (p.userData.label) p.userData.label.visible = !inspect && (cur === 0 || (s && s.finale) || st === cur);
      });
      S.forEach(function (st, i) {
        var vis = !inspect && (cur === 0 || i + 1 <= cur);
        st.wireObjs.forEach(function (w) { w.g.visible = vis; w.g.userData.tube.userData.grow = i + 1 === cur ? 0 : 1; w.g.userData.dots.forEach(function (d) { d.visible = i + 1 === cur; }); });
        st.pinObjs.forEach(function (l) { l.visible = !inspect && i + 1 === cur; });
        st.beaconObjs.forEach(function (b) { b.visible = !inspect && i + 1 === cur; b.userData.t0 = performance.now(); });
      });
    }
    function go(n) {
      cur = Math.max(0, Math.min(S.length, n)); inspect = false;
      setStepVisibility();
      var s = S[cur - 1];
      camGoal = cur === 0 ? { t: [0, 3, 0], d: 36 } : { t: s.focus, d: s.dist * DIST, under: !!s.under };
      onStep(cur, s || null);
    }
    function zoom(key, opts2) {
      var z = ZOOMS[key]; if (!z) return;
      inspect = !!(opts2 && opts2.hideWires); setStepVisibility();
      camGoal = { t: z.t, d: z.d, top: !!z.top, under: !!z.under };
    }
    function showPart(key) {            // Components page: show everything, fly to one part, glow it
      cur = 0; inspect = false; setStepVisibility(); spotlight = key;
      zoom(ZOOMS[key] ? key : 'home'); onStep(0, null);
    }
    var spotlight = null;
    // drag modes: base mode (button) and SHIFT held (temporary swap). OrbitControls already swaps
    // rotate/pan while Shift is held, so the base mode just sets the left button.
    var baseMode = 'spin', shiftHeld = false;
    function applyMode() {
      controls.mouseButtons.LEFT = baseMode === 'move' ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
      controls.mouseButtons.RIGHT = baseMode === 'move' ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN;
      controls.touches.ONE = baseMode === 'move' ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
      var eff = shiftHeld ? (baseMode === 'move' ? 'spin' : 'move') : baseMode;
      onMode({ base: baseMode, shift: shiftHeld, effective: eff });
    }
    function setMode(m) { baseMode = m; applyMode(); }
    function setShift(on) { if (shiftHeld === on) return; shiftHeld = on; applyMode(); }

    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, dragging = false, lastTouch = 0;
    controls.addEventListener('start', function () { dragging = true; camGoal = null; });
    controls.addEventListener('end', function () { dragging = false; lastTouch = performance.now(); });
    // View inset: on phones a sheet covers the bottom (or left) of the canvas. The picture is shifted and
    // widened a little so the robot stays centred in the part that is still visible. Same render resolution.
    var insGoal = { b: 0, l: 0 }, ins = { b: 0, l: 0 };
    function applyInset() {
      var r = canvas.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
      if (ins.b < 0.5 && ins.l < 0.5) { camera.zoom = 1; if (camera.view && camera.view.enabled) camera.clearViewOffset(); else camera.updateProjectionMatrix(); return; }
      camera.zoom = Math.max(0.65, 1 - 0.55 * Math.max(ins.b / r.height, ins.l / r.width));
      camera.setViewOffset(r.width, r.height, -ins.l / 2, ins.b / 2, r.width, r.height);
    }
    // Step distances were composed for wide screens. Tall, narrow screens (phones held upright) see less
    // sideways, so the camera stands further back in proportion to the screen shape.
    function shapeScale() { return Math.min(1.8, Math.max(1, Math.sqrt(1.3 / Math.max(0.3, camera.aspect)))); }
    function resize() {
      var r = canvas.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
      renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); applyInset();
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas); else window.addEventListener('resize', resize);
    resize();

    function tick(now) {
      if (!opts.manual) requestAnimationFrame(tick);
      if (!active) return;
      if (opts.cinematic) { renderer.render(scene, camera); return; }
      if (Math.abs(ins.b - insGoal.b) > 0.5 || Math.abs(ins.l - insGoal.l) > 0.5) {
        var kk = reduce ? 1 : 0.2; ins.b += (insGoal.b - ins.b) * kk; ins.l += (insGoal.l - ins.l) * kk;
        if (Math.abs(ins.b - insGoal.b) <= 0.5 && Math.abs(ins.l - insGoal.l) <= 0.5) { ins.b = insGoal.b; ins.l = insGoal.l; }
        applyInset();
      }
      if (camGoal) {
        var tgt = V(camGoal.t);
        controls.target.lerp(tgt, reduce ? 1 : 0.08);
        var dir = camera.position.clone().sub(controls.target).normalize();
        if (camGoal.under) dir.lerp(new THREE.Vector3(0.35, -0.9, 0.5).normalize(), 0.12).normalize();
        else if (camGoal.top) dir.lerp(new THREE.Vector3(0.18, 1, 0.35).normalize(), 0.1).normalize();
        else if (dir.y < 0.4) { dir.y = 0.6; dir.normalize(); }
        var want = controls.target.clone().add(dir.multiplyScalar(camGoal.d * shapeScale()));
        camera.position.lerp(want, reduce ? 1 : 0.08);
        if (camera.position.distanceTo(want) < 0.03 && controls.target.distanceTo(tgt) < 0.03) camGoal = null;
      }
      if (opts.autoSpin !== false && !dragging && !reduce && !camGoal && (cur === 0 || (S[cur - 1] && S[cur - 1].finale)) && !spotlight && now - lastTouch > 1500) {
        var off = camera.position.clone().sub(controls.target); off.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.0035); camera.position.copy(controls.target.clone().add(off));
      }
      Object.keys(drop).forEach(function (k) {
        var t = Math.min(1, (now - drop[k]) / (reduce ? 1 : 650)), e = 1 - Math.pow(1 - t, 3);
        PARTS[k].position.y = (1 - e) * 6; if (t >= 1) { PARTS[k].position.y = 0; delete drop[k]; }
      });
      var pulse = 0.5 + 0.5 * Math.sin(now / 240), s = S[cur - 1];
      S.forEach(function (st, i) {
        var hotStep = i + 1 === cur;
        st.wireObjs.forEach(function (w) {
          var tube = w.g.userData.tube, u = tube.userData;
          if (u.grow < 1) u.grow = Math.min(1, u.grow + (reduce ? 1 : 0.018));
          tube.geometry.setDrawRange(0, Math.floor(u.grow * u.segs) * u.radial * 6);
          tube.material.emissive.setRGB(hotStep ? 0.12 * pulse : 0, hotStep ? 0.35 * pulse : 0, hotStep ? 0.45 * pulse : 0);   // current wire glows
          w.g.userData.dots.forEach(function (d) { d.scale.setScalar(1 + pulse * 0.6); });
        });
        st.beaconObjs.forEach(function (b) {
          if (!b.visible) return;
          var age = (now - (b.userData.t0 || now)) / 1000;
          var blink = age < 1.6 ? (Math.sin(age * 12) > 0 ? 1 : 0.25) : pulse;                         // quick blinks first, then a calm pulse
          b.userData.s.material.opacity = 0.15 + 0.35 * blink; b.userData.r.material.opacity = 0.3 + 0.6 * blink;
          b.userData.r.scale.setScalar(1 + (age % 1.2) * 0.6); b.userData.r.lookAt(camera.position);
        });
      });
      Object.keys(PARTS).forEach(function (k) {
        var p = PARTS[k], hot = (cur > 0 && (p.userData.step === cur || (s && s.glow && s.glow.indexOf(k) >= 0))) || spotlight === k;
        if (!hot && p.userData.hotWas === false) return; p.userData.hotWas = hot;
        p.traverse(function (o) { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { if (m.emissive && m !== MDF) m.emissive.setRGB(hot ? 0.05 * pulse : 0, hot ? 0.28 * pulse : 0, hot ? 0.38 * pulse : 0); }); });
      });
      controls.update();
      renderer.render(scene, camera);
    }
    if (opts.cinematic) {
      // Video mode: nothing visible yet, no labels, rings or step logic; the caller places the camera.
      controls.enabled = false;
      Object.keys(PARTS).forEach(function (k) { PARTS[k].visible = false; if (PARTS[k].userData.label) PARTS[k].userData.label.visible = false; });
      S.forEach(function (st) { st.wireObjs.forEach(function (w) { w.g.visible = false; w.g.userData.dots.forEach(function (d) { d.visible = false; }); }); });
    } else {
      if (!opts.manual) requestAnimationFrame(tick);
      go(0);
      applyMode();
    }

    var WIRES = [];
    S.forEach(function (st) { st.wireObjs.forEach(function (w) { WIRES.push({ g: w.g, color: w.color, step: st }); }); });
    return {
      scene: scene, parts: PARTS, sub: SUB, head: head, wires: WIRES, lights: { sun: sun, rim: rim, hemi: hemi }, floor: floor, grid: grid,
      renderFrame: function () { renderer.render(scene, camera); },
      steps: S, go: function (n) { spotlight = null; go(n); }, cur: function () { return cur; },
      next: function () { spotlight = null; go(cur + 1); }, prev: function () { spotlight = null; go(cur - 1); },
      zoom: function (k, o) { spotlight = null; zoom(k, o); }, showPart: showPart,
      resetView: function () { spotlight = null; inspect = false; setStepVisibility(); var s = S[cur - 1]; camGoal = cur === 0 ? { t: [0, 3, 0], d: 36 } : { t: s.focus, d: s.dist * DIST, under: !!s.under }; },
      setMode: setMode, setShift: setShift, mode: function () { return { base: baseMode, shift: shiftHeld }; },
      setActive: function (on) { active = on; if (on) resize(); }, resize: resize, renderer: renderer, camera: camera,
      setViewInset: function (bottom, left) { insGoal.b = Math.max(0, bottom || 0); insGoal.l = Math.max(0, left || 0); }
    };
  }

  window.RobotEngine = { STEPS: STEPS, CONNECTIONS: CONNECTIONS, COLORS: COLORS, COLOR_NAMES: COLOR_NAMES, create: create };
})();
