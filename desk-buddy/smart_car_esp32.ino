// =====================================================================
//  4WD SMART CAR  -  ESP32 brain, driven by the M5Stack Dial (ESP-NOW)
//  ESP32 DevKit + L298N motor driver + 4 TT gear motors
//  + HC-SR04 ultrasonic sensor mounted on an MG90S servo
// =====================================================================
//
//  What it does
//  ------------
//  The Dial (REMOTE mode) sends a small message 10 times a second:
//  steer (-100..100), speed (0..100 %) and go/stop. This car:
//    * drives with that steer and speed while GO is on;
//    * turns its servo "eyes" the way you steer (it looks where it goes);
//    * brakes by itself if something is closer than 22 cm in front;
//    * sends its distance reading back, so the Dial can show "35 cm ahead";
//    * STOPS if it hears nothing from the Dial for 0.6 s (failsafe);
//    * finds the Dial's Wi-Fi channel by itself (it hops channels 1-13
//      until it hears the Dial).
//
//  No Dial? Set AUTO_WHEN_ALONE = true and it drives on its own and avoids
//  obstacles, like the Uno version did.
//
//  Serial Monitor (115200 baud) shows the link, the channel and what it does.
//  Board: "ESP32 Dev Module" (esp32 by Espressif, version 3.x).
//  No extra libraries: the servo uses the ESP32's own PWM (LEDC).
// =====================================================================

#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>

// ---------------- PINS (ESP32 DevKit) ---------------------------------
const int LEFT_EN   = 25;   // L298N ENA (PWM speed, ENA jumper removed)
const int LEFT_IN1  = 26;   // L298N IN1
const int LEFT_IN2  = 27;   // L298N IN2
const int RIGHT_EN  = 33;   // L298N ENB (PWM speed, ENB jumper removed)
const int RIGHT_IN1 = 16;   // L298N IN3
const int RIGHT_IN2 = 17;   // L298N IN4

const int SONAR_TRIG = 18;  // HC-SR04 Trig
const int SONAR_ECHO = 19;  // HC-SR04 Echo  -- through a divider! (1 kΩ + 2 kΩ, see tutorial)

const int SERVO_PIN  = 23;  // MG90S signal (orange wire)

// ---------------- SETTINGS -------------------------------------------
const bool LEFT_REVERSED  = true;    // same as the Uno version: left motors wired the other way round
const bool RIGHT_REVERSED = false;
const bool AUTO_WHEN_ALONE = false;  // true = drive by itself when no Dial is heard

const int  MIN_SPEED  = 110;         // TT motors stall below about this (0-255)
const int  BACK_SPEED = 140;
const int  TURN_SPEED = 170;
const int  CRUISE_SPEED = 160;       // auto mode only
const int  SLOW_SPEED   = 110;       // auto mode only
const int  SLOW_CM = 45;             // auto mode: slow down below this
const int  STOP_CM = 22;             // brake below this, in every mode

const int  SERVO_CENTER = 90;        // eyes straight ahead (try 85 or 95 if crooked)
const int  LOOK_RIGHT   = 20;
const int  LOOK_LEFT    = 160;
const float STEER_LOOK  = 0.5f;      // how far the eyes follow the steering (0 = never)

const unsigned long LINK_LOST_MS  = 600;   // no Dial message for this long -> stop
const unsigned long HOP_EVERY_MS  = 250;   // channel search speed
const unsigned long REPLY_EVERY_MS = 100;  // distance back to the Dial
// ---------------------------------------------------------------------

// The same two messages as in desk_buddy_dial.ino. Keep them identical.
struct CarCmd    { char magic[2]; int8_t steer; int8_t speed; uint8_t go; };  // Dial -> car
struct CarStatus { char magic[2]; uint16_t distCm; };                          // car -> Dial

const uint8_t BROADCAST[6] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};

volatile int8_t  cmdSteer = 0, cmdSpeed = 0;
volatile bool    cmdGo = false;
volatile unsigned long lastCmdAt = 0;
volatile bool    gotCmd = false;

int  distanceCm = 999;
byte nearPings = 0;
int  channel = 1;
unsigned long lastPing = 0, lastReply = 0, lastHop = 0, lastStatus = 0;
bool linked = false;

// =====================================================================
//  RADIO (ESP-NOW)
// =====================================================================
void onDialData(const esp_now_recv_info_t *, const uint8_t *data, int len) {
  if (len < (int)sizeof(CarCmd) || data[0] != 'D' || data[1] != 'B') return;
  CarCmd c; memcpy(&c, data, sizeof c);
  cmdSteer = constrain(c.steer, -100, 100);
  cmdSpeed = constrain(c.speed, 0, 100);
  cmdGo = c.go;
  lastCmdAt = millis();
  gotCmd = true;
}

void setChannel(int ch) {
  channel = ch;
  esp_wifi_set_channel(ch, WIFI_SECOND_CHAN_NONE);
}

void radioStart() {
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  setChannel(1);
  if (esp_now_init() != ESP_OK) { Serial.println("ESP-NOW failed to start"); return; }
  esp_now_peer_info_t peer = {};
  memcpy(peer.peer_addr, BROADCAST, 6);
  peer.channel = 0;                        // = whatever channel we are on
  peer.encrypt = false;
  esp_now_add_peer(&peer);
  esp_now_register_recv_cb(onDialData);
  Serial.print("Car MAC: "); Serial.println(WiFi.macAddress());
}

void sendStatus() {
  CarStatus s = {{'C', 'R'}, (uint16_t)min(distanceCm, 999)};
  esp_now_send(BROADCAST, (const uint8_t *)&s, sizeof s);
}

// =====================================================================
//  SETUP + LOOP
// =====================================================================
void setup() {
  Serial.begin(115200);
  pinMode(LEFT_IN1, OUTPUT);  pinMode(LEFT_IN2, OUTPUT);
  pinMode(RIGHT_IN1, OUTPUT); pinMode(RIGHT_IN2, OUTPUT);
  ledcAttach(LEFT_EN, 1000, 8);            // motor speed PWM, 0-255
  ledcAttach(RIGHT_EN, 1000, 8);
  ledcAttach(SERVO_PIN, 50, 14);           // servo: 50 Hz
  drive(0, 0);
  pinMode(SONAR_TRIG, OUTPUT); digitalWrite(SONAR_TRIG, LOW);
  pinMode(SONAR_ECHO, INPUT);
  look(SERVO_CENTER);
  radioStart();
  Serial.println("SMART CAR ready. Waiting for the Dial (REMOTE mode)...");
}

void loop() {
  unsigned long now = millis();

  // Look ahead every 60 ms (the HC-SR04 needs ~60 ms between pings).
  if (now - lastPing >= 60) {
    lastPing = now;
    distanceCm = measureCm();
    nearPings = distanceCm < STOP_CM ? nearPings + 1 : 0;
  }

  linked = gotCmd && (now - lastCmdAt < LINK_LOST_MS);

  if (linked) {
    remoteDrive();
    if (now - lastReply >= REPLY_EVERY_MS) { lastReply = now; sendStatus(); }
  } else {
    // search: hop to the next channel until the Dial is heard
    if (now - lastHop >= HOP_EVERY_MS) { lastHop = now; setChannel(channel % 13 + 1); }
    if (AUTO_WHEN_ALONE) autoDrive();
    else { drive(0, 0); look(SERVO_CENTER); }
  }
  printStatus();
}

// =====================================================================
//  DRIVING
// =====================================================================
// Dial control: steer -100 (left) .. 100 (right). At full steer one side
// stops, so the car turns sharply. Forward is blocked near an obstacle.
void remoteDrive() {
  int steer = cmdSteer;
  look(SERVO_CENTER - steer * STEER_LOOK);   // eyes look where you steer

  if (!cmdGo) { drive(0, 0); return; }
  if (nearPings >= 2) {                      // auto-brake
    drive(0, 0);
    return;
  }
  int base = map(cmdSpeed, 0, 100, 0, 255);
  if (base > 0 && base < MIN_SPEED) base = MIN_SPEED;
  if (distanceCm < SLOW_CM) base = max(MIN_SPEED, base * 2 / 3);
  int left  = base + base * steer / 100;
  int right = base - base * steer / 100;
  drive(left, right);
}

// Old Uno behaviour, for when no Dial is around (AUTO_WHEN_ALONE = true).
void autoDrive() {
  if (nearPings >= 2) { avoid(); nearPings = 0; return; }
  look(SERVO_CENTER);
  int speed = distanceCm < SLOW_CM ? SLOW_SPEED : CRUISE_SPEED;
  drive(speed, speed);
}

void avoid() {
  drive(0, 0);                       delay(150);
  drive(-BACK_SPEED, -BACK_SPEED);   delay(350);
  drive(0, 0);
  int right = lookAt(LOOK_RIGHT);
  int left  = lookAt(LOOK_LEFT);
  look(SERVO_CENTER);                delay(350);
  if (right < STOP_CM && left < STOP_CM) { drive(TURN_SPEED, -TURN_SPEED); delay(900); }
  else if (right >= left)                { drive(TURN_SPEED, -TURN_SPEED); delay(450); }
  else                                   { drive(-TURN_SPEED, TURN_SPEED); delay(450); }
  drive(0, 0);
}

int lookAt(int angle) {
  look(angle);
  delay(350);
  int a = measureCm(); delay(60);
  int b = measureCm(); delay(60);
  int c = measureCm();
  return max(min(a, b), min(max(a, b), c));   // the median of a, b, c
}

// =====================================================================
//  MOTORS
// =====================================================================
// One speed per side, from -255 (full reverse) to 255 (full forward).
void drive(int leftSpeed, int rightSpeed) {
  setSide(LEFT_EN,  LEFT_IN1,  LEFT_IN2,  LEFT_REVERSED  ? -leftSpeed  : leftSpeed);
  setSide(RIGHT_EN, RIGHT_IN1, RIGHT_IN2, RIGHT_REVERSED ? -rightSpeed : rightSpeed);
}

void setSide(int en, int in1, int in2, int speed) {
  speed = constrain(speed, -255, 255);
  if (speed > 0)      { digitalWrite(in1, HIGH); digitalWrite(in2, LOW);  }
  else if (speed < 0) { digitalWrite(in1, LOW);  digitalWrite(in2, HIGH); }
  else                { digitalWrite(in1, LOW);  digitalWrite(in2, LOW);  }
  ledcWrite(en, abs(speed));
}

// =====================================================================
//  SERVO + EYES
// =====================================================================
// 0-180 degrees -> a 0.5-2.5 ms pulse every 20 ms.
int lastAngle = -1;
void look(int angle) {
  angle = constrain(angle, 0, 180);
  if (angle == lastAngle) return;
  lastAngle = angle;
  uint32_t us = map(angle, 0, 180, 500, 2500);
  ledcWrite(SERVO_PIN, us * 16383UL / 20000UL);
}

int measureCm() {
  digitalWrite(SONAR_TRIG, HIGH); delayMicroseconds(10); digitalWrite(SONAR_TRIG, LOW);
  unsigned long us = pulseIn(SONAR_ECHO, HIGH, 25000UL);   // 25 ms = about 4 m
  return (us == 0) ? 999 : (int)(us / 58);
}

void printStatus() {
  if (millis() - lastStatus < 500) return;
  lastStatus = millis();
  Serial.print(linked ? "DIAL ch " : "searching ch "); Serial.print(channel);
  Serial.print(" | ahead "); if (distanceCm >= 999) Serial.print("--"); else Serial.print(distanceCm);
  Serial.print(" cm");
  if (linked) {
    Serial.print(" | steer "); Serial.print(cmdSteer);
    Serial.print(" speed "); Serial.print(cmdSpeed);
    Serial.print(cmdGo ? (nearPings >= 2 ? " | BRAKE" : " | GO") : " | STOP");
  }
  Serial.println();
}
