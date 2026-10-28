/*
  DESK BUDDY  -  M5Stack Dial
  ---------------------------
  A little face that lives on your desk, plus a few handy tools.

  HOLD THE KNOB (1 s)  -> mode menu. Turn to choose, press to open.

  1. BUDDY   - animated eyes.
       Turn knob -> eyes follow.  Spin fast -> DIZZY.
       Tap screen -> HAPPY.  Hold screen -> LOVE.  5 quick taps -> ANGRY.
       Press knob -> clock + weather.  Double-press -> FEED the pet.
       Idle 45 s -> sleepy, 90 s -> asleep. Sleeps by itself at night.
       Wi-Fi time, weather mood, "Good morning", "Pani piyo" reminder,
       and a hungry pet that gets sad if you forget it.
  2. TIMER   - Pomodoro. Turn = minutes, press = start/pause,
               tap = reset (when paused). Break starts by itself.
  3. VOLUME  - Bluetooth media knob ("Desk Buddy").
               Turn = volume, press = play/pause, double = next, tap = mute.
  4. REMOTE  - drives the ESP32 car over ESP-NOW.
               Turn = steer, tap = go/stop, press = straight.
  5. SAFE    - find the 3-number code (0-39). Pitch rises near it.
               Press to try a number.
  6. REACT   - tap when it turns green. Best score is saved.
  7. COUNT   - each click +1 / -1. Double-press = reset.

  NFC cards (any mode): see CARD_* in config.h.

  Board: M5Dial (m5stack:esp32:m5stack_dial)
         Flash Size 8MB, Partition "8M with spiffs (3MB APP/1.5MB SPIFFS)"
  Library: M5Dial (brings M5Unified + M5GFX).
*/

#include <M5Dial.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEHIDDevice.h>
#include "config.h"

// (declared up here because Arduino puts function prototypes above the first function)
struct Note { uint16_t f, ms; };

// ---------------------------------------------------------------- settings
const uint32_t EYE_COLOR   = 0x38D7F5;   // cyan (RGB)
const uint32_t LOVE_COLOR  = 0xFF3B6B;   // pink-red
const uint32_t ANGRY_COLOR = 0xFF5A2A;   // orange-red
const uint32_t GOOD_COLOR  = 0x4ADE80;   // green
const uint32_t DIM_COLOR   = 0x1A2A3A;
const uint32_t TEXT_DIM    = 0x9FB3C8;
const uint32_t BG          = 0x000000;
const uint32_t SLEEPY_AFTER_MS = 45000;
const uint32_t ASLEEP_AFTER_MS = 90000;
const uint32_t BACK_TO_BUDDY_MS = 300000; // idle 5 min in a tool -> buddy
const uint8_t  BRIGHT = 160, DIM = 25;

// ---------------------------------------------------------------- modes
enum Mode { M_MENU, M_BUDDY, M_TIMER, M_VOLUME, M_REMOTE, M_SAFE, M_REACT, M_COUNT };
const char *MODE_NAME[] = {"MENU", "BUDDY", "TIMER", "VOLUME", "REMOTE", "SAFE", "REACT", "COUNT"};
const char *MODE_HINT[] = {"", "your desk pet", "pomodoro focus", "bluetooth knob",
                           "drive the car", "crack the code", "how fast are you?", "tally counter"};
const uint8_t MODE_COUNT = 7;            // menu items: M_BUDDY .. M_COUNT
Mode mode = M_BUDDY;
int menuSel = 1;

// ---------------------------------------------------------------- buddy state
enum Mood { NORMAL, HAPPY, LOVE, ANGRY, DIZZY, SURPRISED, SLEEPY, ASLEEP, SAD };
Mood mood = NORMAL;
uint32_t moodUntil = 0;          // temporary moods end at this time (0 = stays)
uint32_t lastActivity = 0;
bool clockMode = false;
uint32_t clockUntil = 0;
bool dimmed = false;

M5Canvas canvas(&M5Dial.Display);

// eye animation (current values ease toward targets)
float gx = 0, gy = 0, tgx = 0, tgy = 0;   // gaze offset
float ew = 56, eh = 70, tew = 56, teh = 70; // eye size
uint32_t nextBlink = 0, blinkStart = 0;
uint32_t nextLook = 0, gazeHoldUntil = 0;

// knob
long lastEnc = 0, encAcc = 0;
float spinEnergy = 0;

// taps for ANGRY
uint32_t tapTimes[5] = {0};
uint8_t tapIdx = 0;

// pet + daily life
int hunger = 20;                 // 0 = full, 100 = starving
uint32_t nextHungerTick = 0;
uint32_t feedAnimUntil = 0;
bool waterDue = false;
uint32_t nextWater = 0;
int lastGreetDay = -1;
uint32_t greetUntil = 0;

// a short message at the bottom of any screen
char toast[28] = "";
uint32_t toastUntil = 0, nextRfid = 0;
void showToast(const char *s, uint32_t ms) { strncpy(toast, s, sizeof toast - 1); toastUntil = millis() + ms; }

// ---------------------------------------------------------------- saved settings
Preferences prefs;
int countValue = 0, reactBest = 0, timerSessions = 0, workMin = WORK_MIN_DEFAULT;
bool saveDirty = false;
uint32_t saveAt = 0;
void markDirty() { saveDirty = true; saveAt = millis() + 5000; }
void saveTick() {
  if (!saveDirty || millis() < saveAt) return;
  prefs.putInt("hunger", hunger);
  prefs.putInt("count", countValue);
  prefs.putInt("best", reactBest);
  prefs.putInt("sessions", timerSessions);
  prefs.putInt("workMin", workMin);
  saveDirty = false;
}

// ---------------------------------------------------------------- tiny sound queue
Note sq[12]; uint8_t sqLen = 0, sqPos = 0; uint32_t sqNext = 0;
void play(const Note *n, uint8_t len) {
  sqLen = len > 12 ? 12 : len; memcpy(sq, n, sqLen * sizeof(Note)); sqPos = 0; sqNext = 0;
}
void soundTick() {
  if (sqPos >= sqLen || millis() < sqNext) return;
  if (sq[sqPos].f) M5Dial.Speaker.tone(sq[sqPos].f, sq[sqPos].ms);
  sqNext = millis() + sq[sqPos].ms + 15; sqPos++;
}
bool soundIdle() { return sqPos >= sqLen; }
const Note S_CHIRP[] = {{1800, 40}, {2400, 60}};
const Note S_WAKE[]  = {{900, 50}, {1400, 50}, {2000, 70}};
const Note S_LOVE[]  = {{1319, 120}, {1568, 120}, {2093, 220}};
const Note S_ANGRY[] = {{220, 120}, {0, 40}, {196, 200}};
const Note S_DIZZY[] = {{1600, 60}, {1300, 60}, {1000, 60}, {800, 60}, {600, 120}};
const Note S_CARD[]  = {{2600, 50}, {0, 40}, {2600, 50}};
const Note S_CLICK[] = {{3000, 8}};
const Note S_YUM[]   = {{700, 60}, {0, 30}, {900, 60}, {0, 30}, {1200, 120}};
const Note S_SAD[]   = {{700, 160}, {560, 260}};
const Note S_WATER[] = {{1568, 80}, {0, 60}, {1568, 80}, {0, 60}, {2093, 160}};
const Note S_DONE[]  = {{1047, 150}, {1319, 150}, {1568, 150}, {2093, 300}};
const Note S_BREAK[] = {{2093, 150}, {1568, 150}, {1047, 300}};
const Note S_WRONG[] = {{180, 220}};
const Note S_OPEN[]  = {{1047, 90}, {1319, 90}, {1568, 90}, {2093, 90}, {2637, 250}};
const Note S_MENU[]  = {{1200, 30}, {1800, 50}};

// ---------------------------------------------------------------- time helpers
m5::rtc_datetime_t nowDT() { return M5Dial.Rtc.getDateTime(); }
bool isNight() {
  int h = nowDT().time.hours;
  return NIGHT_FROM_HOUR > NIGHT_TO_HOUR ? (h >= NIGHT_FROM_HOUR || h < NIGHT_TO_HOUR)
                                         : (h >= NIGHT_FROM_HOUR && h < NIGHT_TO_HOUR);
}

// ---------------------------------------------------------------- Wi-Fi, time, weather
bool wifiWanted = sizeof(WIFI_SSID) > 1;
uint32_t nextTimeSync = 0, nextWeather = 0;
float weatherTemp = NAN;
int weatherCode = -1;
bool isRainy() {
  int c = weatherCode;
  return (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95;
}
bool isHot() { return !isnan(weatherTemp) && weatherTemp >= HOT_C; }

void timeTick() {
  if (!wifiWanted || WiFi.status() != WL_CONNECTED || millis() < nextTimeSync) return;
  struct tm ti;
  if (getLocalTime(&ti, 0) && ti.tm_year + 1900 >= 2025) {
    m5::rtc_datetime_t t;
    t.date.year = ti.tm_year + 1900; t.date.month = ti.tm_mon + 1; t.date.date = ti.tm_mday;
    t.date.weekDay = ti.tm_wday;
    t.time.hours = ti.tm_hour; t.time.minutes = ti.tm_min; t.time.seconds = ti.tm_sec;
    M5Dial.Rtc.setDateTime(t);
    nextTimeSync = millis() + 6UL * 3600 * 1000;      // again in 6 hours
  } else {
    nextTimeSync = millis() + 3000;                   // NTP not ready yet
  }
}

// Reads one number that follows `key` inside the "current":{...} part.
bool jsonNumber(const String &body, const char *key, float &out) {
  int cur = body.indexOf("\"current\":{");
  if (cur < 0) return false;
  int k = body.indexOf(key, cur);
  if (k < 0) return false;
  out = body.substring(k + strlen(key)).toFloat();
  return true;
}

void weatherTick() {
  if (!wifiWanted || WiFi.status() != WL_CONNECTED || millis() < nextWeather) return;
  if (mode == M_REACT || mode == M_REMOTE) return;    // the request blocks ~1 s
  nextWeather = millis() + 20UL * 60 * 1000;           // every 20 minutes
  HTTPClient http;
  http.setTimeout(4000);
  String url = String("http://api.open-meteo.com/v1/forecast?latitude=") + WEATHER_LAT +
               "&longitude=" + WEATHER_LON + "&current=temperature_2m,weather_code";
  if (!http.begin(url)) return;
  if (http.GET() == 200) {
    String body = http.getString();
    float t, c;
    if (jsonNumber(body, "\"temperature_2m\":", t)) weatherTemp = t;
    if (jsonNumber(body, "\"weather_code\":", c)) weatherCode = (int)c;
  } else {
    nextWeather = millis() + 60000;                    // try again in a minute
  }
  http.end();
}

// ---------------------------------------------------------------- Bluetooth media knob
BLEHIDDevice *hid = nullptr;
BLECharacteristic *mediaInput = nullptr;
bool bleStarted = false, bleConnected = false;
char volLast[16] = "";
uint32_t volLastUntil = 0;

class BuddyServerCb : public BLEServerCallbacks {
  void onConnect(BLEServer *) override { bleConnected = true; }
  void onDisconnect(BLEServer *s) override { bleConnected = false; s->getAdvertising()->start(); }
};

// One "consumer control" report: a single 16-bit media key code.
const uint8_t MEDIA_REPORT_MAP[] = {
  0x05, 0x0C,        // Usage Page (Consumer)
  0x09, 0x01,        // Usage (Consumer Control)
  0xA1, 0x01,        // Collection (Application)
  0x85, 0x01,        //   Report ID 1
  0x15, 0x00,        //   Logical Min 0
  0x26, 0xFF, 0x03,  //   Logical Max 0x3FF
  0x19, 0x00,        //   Usage Min 0
  0x2A, 0xFF, 0x03,  //   Usage Max 0x3FF
  0x75, 0x10,        //   Report Size 16
  0x95, 0x01,        //   Report Count 1
  0x81, 0x00,        //   Input (Data, Array)
  0xC0               // End Collection
};
const uint16_t KEY_VOL_UP = 0xE9, KEY_VOL_DOWN = 0xEA, KEY_MUTE = 0xE2,
               KEY_PLAY = 0xCD, KEY_NEXT = 0xB5;

void bleStart() {
  if (bleStarted) return;
  bleStarted = true;
  BLEDevice::init("Desk Buddy");
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new BuddyServerCb());
  hid = new BLEHIDDevice(server);
  mediaInput = hid->inputReport(1);
  hid->manufacturer()->setValue("WN Labs");
  hid->pnp(0x02, 0xE502, 0xA111, 0x0210);
  hid->hidInfo(0x00, 0x01);
  hid->reportMap((uint8_t *)MEDIA_REPORT_MAP, sizeof MEDIA_REPORT_MAP);
  hid->startServices();
  hid->setBatteryLevel(100);
  BLESecurity *sec = new BLESecurity();
  sec->setAuthenticationMode(ESP_LE_AUTH_BOND);
  BLEAdvertising *adv = server->getAdvertising();
  adv->setAppearance(0x03C1);                          // HID keyboard
  adv->addServiceUUID(hid->hidService()->getUUID());
  adv->start();
}

void mediaKey(uint16_t key, const char *label) {
  strncpy(volLast, label, sizeof volLast - 1);
  volLastUntil = millis() + 900;
  if (!bleConnected || !mediaInput) return;
  uint8_t down[2] = {(uint8_t)(key & 0xFF), (uint8_t)(key >> 8)};
  uint8_t up[2] = {0, 0};
  mediaInput->setValue(down, 2); mediaInput->notify();
  delay(8);
  mediaInput->setValue(up, 2); mediaInput->notify();
}

// ---------------------------------------------------------------- ESP-NOW robot remote
struct CarCmd    { char magic[2]; int8_t steer; int8_t speed; uint8_t go; };  // Dial -> car
struct CarStatus { char magic[2]; uint16_t distCm; };                          // car -> Dial
const uint8_t BROADCAST[6] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
bool nowStarted = false, carGo = false;
int carSteer = 0;
volatile uint16_t carDist = 0;
volatile uint32_t carHeardAt = 0;
uint32_t nextCarSend = 0;

void onCarData(const esp_now_recv_info_t *, const uint8_t *data, int len) {
  if (len < (int)sizeof(CarStatus) || data[0] != 'C' || data[1] != 'R') return;
  CarStatus s; memcpy(&s, data, sizeof s);
  carDist = s.distCm; carHeardAt = millis();
}

void nowStart() {
  if (nowStarted) return;
  if (!wifiWanted) { WiFi.mode(WIFI_STA); esp_wifi_set_channel(1, WIFI_SECOND_CHAN_NONE); }
  if (esp_now_init() != ESP_OK) { showToast("ESP-NOW failed", 2000); return; }
  esp_now_peer_info_t peer = {};
  memcpy(peer.peer_addr, BROADCAST, 6);
  peer.channel = 0;                                    // = current channel
  peer.encrypt = false;
  esp_now_add_peer(&peer);
  esp_now_register_recv_cb(onCarData);
  nowStarted = true;
}

void carSend() {
  if (!nowStarted) return;
  CarCmd c = {{'D', 'B'}, (int8_t)carSteer, (int8_t)REMOTE_SPEED, (uint8_t)carGo};
  esp_now_send(BROADCAST, (const uint8_t *)&c, sizeof c);
}

// ---------------------------------------------------------------- timer state
enum TimerState { T_IDLE, T_RUN, T_PAUSE };
TimerState tState = T_IDLE;
bool onBreak = false;
uint32_t tEndAt = 0, tLeftMs = 0, tTotalMs = 0;

void timerStart(uint32_t ms, bool brk) {
  onBreak = brk; tTotalMs = ms; tEndAt = millis() + ms; tState = T_RUN;
}
void timerTick() {
  if (tState != T_RUN || millis() < tEndAt) return;
  if (!onBreak) {
    timerSessions++; markDirty();
    play(S_DONE, 4); showToast("Break time!", 3000);
    timerStart(BREAK_MIN * 60000UL, true);
  } else {
    play(S_BREAK, 3); showToast("Back to work", 3000);
    tState = T_IDLE; onBreak = false;
  }
  lastActivity = millis();
}

// ---------------------------------------------------------------- game state
int safeCode[3], safeIdx = 0, safePos = 0, safeTries = 0;
bool safeOpen = false;
void safeNew() {
  for (int i = 0; i < 3; i++) safeCode[i] = random(40);
  safeIdx = 0; safeTries = 0; safeOpen = false;
}

enum ReactState { R_WAIT, R_READY, R_GO, R_RESULT, R_EARLY };
ReactState rState = R_WAIT;
uint32_t rGoAt = 0, rResult = 0;

// ---------------------------------------------------------------- helpers
void setMood(Mood m, uint32_t forMs) { mood = m; moodUntil = forMs ? millis() + forMs : 0; }

void wake() {
  bool wasSleeping = (mood == SLEEPY || mood == ASLEEP);
  lastActivity = millis();
  if (dimmed) { M5Dial.Display.setBrightness(BRIGHT); dimmed = false; }
  if (wasSleeping && mode == M_BUDDY) {
    setMood(SURPRISED, 700);
    play(S_WAKE, 3);
  }
}

// Gives whole knob clicks (positive = clockwise).
int knobClicks(long raw) {
  encAcc += raw;
  int steps = encAcc / ENC_PER_CLICK;
  encAcc -= steps * ENC_PER_CLICK;
  return KNOB_REVERSE ? -steps : steps;
}

void enterMode(Mode m) {
  if (mode == M_REMOTE && m != M_REMOTE) { carGo = false; carSend(); }
  mode = m;
  clockMode = false;
  encAcc = 0;
  if (m == M_BUDDY)  { setMood(HAPPY, 1200); }
  if (m == M_VOLUME) bleStart();
  if (m == M_REMOTE) { nowStart(); carGo = false; carSteer = 0; }
  if (m == M_SAFE)   safeNew();
  if (m == M_REACT)  rState = R_WAIT;
}

// ---------------------------------------------------------------- drawing: buddy
void drawHeart(float cx, float cy, float s, uint32_t c) {
  canvas.fillCircle(cx - s * 0.5f, cy - s * 0.25f, s * 0.55f, c);
  canvas.fillCircle(cx + s * 0.5f, cy - s * 0.25f, s * 0.55f, c);
  canvas.fillTriangle(cx - s * 1.03f, cy - s * 0.05f, cx + s * 1.03f, cy - s * 0.05f, cx, cy + s * 1.1f, c);
}

void drawSpiral(float cx, float cy, float rot, uint32_t c) {
  for (float a = 0; a < 4 * PI; a += 0.22f) {
    float r = 2 + a * 2.6f;
    canvas.fillCircle(cx + r * cosf(a + rot), cy + r * sinf(a + rot), 3, c);
  }
}

void drawUmbrella(float cx, float cy, uint32_t c) {
  canvas.fillArc(cx, cy, 0, 16, 180, 360, c);
  canvas.drawFastVLine(cx, cy, 16, c);
  canvas.drawArc(cx - 4, cy + 16, 4, 3, 0, 180, c);
  float t = (millis() % 900) / 900.0f;                  // falling drops
  for (int i = -1; i <= 1; i++) canvas.fillCircle(cx + i * 22, cy - 8 + t * 30, 2, 0x5AA9FF);
}

// side = -1 left eye, +1 right eye
void drawEye(int side, float blink) {
  float cx = 120 + side * 48 + gx, cy = 116 + gy;
  // looking sideways: the far eye gets a little smaller (feels 3D)
  float persp = 1.0f + side * gx / 160.0f;
  float w = ew, h = eh * persp * blink;
  if (h < 6) h = 6;

  switch (mood) {
    case LOVE: {
      float beat = 1.0f + 0.08f * sinf(millis() / 110.0f);
      drawHeart(cx, cy, 26 * beat, LOVE_COLOR);
      return;
    }
    case DIZZY:
      drawSpiral(cx, cy, millis() / 90.0f * side, EYE_COLOR);
      return;
    case ASLEEP:
      canvas.fillRoundRect(cx - w / 2, cy + 8, w, 7, 3, EYE_COLOR);
      return;
    case SURPRISED:
      canvas.fillCircle(cx, cy, 34 * (blink < 1 ? blink : 1), EYE_COLOR);
      canvas.fillCircle(cx, cy, 13 * (blink < 1 ? blink : 1), BG);
      return;
    default: break;
  }

  uint32_t col = (mood == ANGRY) ? ANGRY_COLOR : EYE_COLOR;
  canvas.fillRoundRect(cx - w / 2, cy - h / 2, w, h, h / 2 < 18 ? h / 2 : 18, col);

  float x0 = cx - w / 2 - 3, x1 = cx + w / 2 + 3, top = cy - h / 2 - 3;
  if (mood == HAPPY) {           // cut the bottom away -> a ^ shaped eye
    canvas.fillEllipse(cx, cy + h * 0.55f, w * 0.8f, h * 0.6f, BG);
  } else if (mood == SLEEPY) {   // heavy eyelid
    canvas.fillRect(cx - w / 2 - 2, cy - h / 2 - 2, w + 4, h * 0.55f, BG);
  } else if (mood == ANGRY) {    // eyebrows slanting down to the middle
    if (side < 0) canvas.fillTriangle(x0, top, x1, top, x1, cy + 2, BG);
    else          canvas.fillTriangle(x0, top, x1, top, x0, cy + 2, BG);
  } else if (mood == SAD) {      // eyebrows slanting down to the outside
    if (side < 0) canvas.fillTriangle(x0, top, x1, top, x0, cy, BG);
    else          canvas.fillTriangle(x0, top, x1, top, x1, cy, BG);
  }
}

void drawFace() {
  canvas.fillScreen(BG);

  // blink: 160 ms close-and-open
  float blink = 1;
  uint32_t now = millis();
  if (blinkStart && now - blinkStart < 160) blink = 1 - 0.92f * sinf(PI * (now - blinkStart) / 160.0f);

  drawEye(-1, blink);
  drawEye(+1, blink);

  canvas.setTextDatum(middle_center);
  if (mood == ASLEEP || mood == SLEEPY) {      // floating Zzz
    float t = (now % 3000) / 3000.0f;
    canvas.setTextColor(EYE_COLOR);
    canvas.setFont(&fonts::FreeSansBold12pt7b);
    canvas.drawString("z", 176 + t * 18, 70 - t * 30);
    if (mood == ASLEEP) { canvas.setFont(&fonts::FreeSansBold9pt7b); canvas.drawString("z", 160 + t * 12, 84 - t * 20); }
  }
  if (mood == LOVE) {                           // small floating heart
    float t = (now % 1500) / 1500.0f;
    drawHeart(120, 190 - t * 25, 7, LOVE_COLOR);
  }
  if (mood == SAD) {                            // a tear
    float t = (now % 2000) / 2000.0f;
    canvas.fillCircle(170 + gx, 150 + gy + t * 30, 4, 0x5AA9FF);
  }

  // weather mood (only while awake)
  if (mood != ASLEEP) {
    if (isRainy()) drawUmbrella(120, 30, TEXT_DIM);
    else if (isHot()) {                         // sweat drop
      float t = (now % 1600) / 1600.0f;
      canvas.fillCircle(196 + gx, 70 + gy + t * 18, 5, 0x5AA9FF);
      canvas.fillTriangle(191 + gx, 68 + gy + t * 18, 201 + gx, 68 + gy + t * 18, 196 + gx, 58 + gy + t * 18, 0x5AA9FF);
    }
  }

  // feeding: a snack flies into the mouth
  if (now < feedAnimUntil) {
    float t = 1 - (feedAnimUntil - now) / 1200.0f;
    float y = 225 - t * 50;
    canvas.fillCircle(120, y, 11 * (1 - t * 0.6f), 0xF5B041);
    canvas.fillCircle(120, y, 4 * (1 - t * 0.6f), 0x8B4513);
    canvas.setFont(&fonts::FreeSansBold9pt7b); canvas.setTextColor(GOOD_COLOR);
    canvas.drawString("Yum!", 120, 40);
  }

  // speech bubbles
  canvas.setFont(&fonts::FreeSansBold9pt7b);
  if (waterDue && mood != ASLEEP) {
    canvas.fillRoundRect(52, 172, 136, 30, 14, 0x0E3A5A);
    canvas.setTextColor(0xBFE6FF);
    canvas.drawString("Pani piyo!", 120, 187);
  } else if (now < greetUntil) {
    canvas.setTextColor(GOOD_COLOR);
    canvas.drawString("Good morning!", 120, 192);
  } else if (hunger >= 70 && mood == SAD) {
    canvas.setTextColor(TEXT_DIM);
    canvas.drawString("I'm hungry...", 120, 192);
  }
}

void drawClock() {
  auto dt = nowDT();
  canvas.fillScreen(BG);
  // seconds ring
  for (int s = 0; s < 60; s++) {
    float a = (s / 60.0f) * 2 * PI - PI / 2;
    uint32_t c = s <= dt.time.seconds ? EYE_COLOR : DIM_COLOR;
    canvas.fillCircle(120 + 110 * cosf(a), 120 + 110 * sinf(a), s % 5 ? 2 : 3, c);
  }
  char buf[24];
  canvas.setTextDatum(middle_center);
  canvas.setTextColor(EYE_COLOR);
  canvas.setFont(&fonts::Font7);
  snprintf(buf, sizeof buf, "%02d:%02d", dt.time.hours, dt.time.minutes);
  canvas.drawString(buf, 120, 106);
  static const char *DAYS[] = {"SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"};
  canvas.setFont(&fonts::FreeSansBold9pt7b);
  canvas.setTextColor(TEXT_DIM);
  snprintf(buf, sizeof buf, "%s %02d/%02d", DAYS[dt.date.weekDay % 7], dt.date.date, dt.date.month);
  canvas.drawString(buf, 120, 152);
  if (!isnan(weatherTemp)) {
    snprintf(buf, sizeof buf, "%.0f C %s", weatherTemp, isRainy() ? "rain" : (isHot() ? "hot" : ""));
    canvas.setTextColor(EYE_COLOR);
    canvas.drawString(buf, 120, 178);
  }
  snprintf(buf, sizeof buf, "food %d%%", 100 - hunger);
  canvas.setTextColor(hunger >= 70 ? ANGRY_COLOR : TEXT_DIM);
  canvas.drawString(buf, 120, 200);
}

// ---------------------------------------------------------------- drawing: menu + tools
void drawMenu() {
  canvas.fillScreen(BG);
  for (int i = 1; i <= MODE_COUNT; i++) {
    float a = ((i - 1) / (float)MODE_COUNT) * 2 * PI - PI / 2;
    float x = 120 + 92 * cosf(a), y = 120 + 92 * sinf(a);
    bool sel = (i == menuSel);
    canvas.fillCircle(x, y, sel ? 18 : 13, sel ? EYE_COLOR : DIM_COLOR);
    canvas.setTextDatum(middle_center);
    canvas.setFont(&fonts::FreeSansBold9pt7b);
    canvas.setTextColor(sel ? BG : TEXT_DIM);
    char n[2] = {MODE_NAME[i][0], 0};
    canvas.drawString(n, x, y + 1);
  }
  canvas.setTextColor(EYE_COLOR);
  canvas.setFont(&fonts::FreeSansBold12pt7b);
  canvas.drawString(MODE_NAME[menuSel], 120, 110);
  canvas.setFont(&fonts::FreeSans9pt7b);
  canvas.setTextColor(TEXT_DIM);
  canvas.drawString(MODE_HINT[menuSel], 120, 138);
}

void drawTimer() {
  canvas.fillScreen(BG);
  uint32_t left = tState == T_RUN ? (tEndAt > millis() ? tEndAt - millis() : 0)
                : tState == T_PAUSE ? tLeftMs : workMin * 60000UL;
  uint32_t total = tState == T_IDLE ? workMin * 60000UL : tTotalMs;
  float frac = total ? left / (float)total : 0;
  uint32_t col = onBreak ? GOOD_COLOR : EYE_COLOR;
  canvas.fillArc(120, 120, 104, 116, 0, 360, DIM_COLOR);
  if (frac > 0.001f) canvas.fillArc(120, 120, 104, 116, 270, 270 + 360 * frac, col);
  char buf[16];
  uint32_t s = (left + 999) / 1000;
  snprintf(buf, sizeof buf, "%02lu:%02lu", (unsigned long)(s / 60), (unsigned long)(s % 60));
  canvas.setTextDatum(middle_center);
  canvas.setTextColor(col);
  canvas.setFont(&fonts::Font7);
  canvas.drawString(buf, 120, 112);
  canvas.setFont(&fonts::FreeSansBold9pt7b);
  canvas.setTextColor(TEXT_DIM);
  const char *label = tState == T_IDLE ? "turn = minutes" : tState == T_PAUSE ? "PAUSED - tap = reset"
                    : onBreak ? "BREAK" : "FOCUS";
  canvas.drawString(label, 120, 60);
  snprintf(buf, sizeof buf, "done: %d", timerSessions);
  canvas.drawString(buf, 120, 165);
}

void drawVolume() {
  canvas.fillScreen(BG);
  uint32_t c = bleConnected ? EYE_COLOR : TEXT_DIM;
  // speaker icon
  canvas.fillRect(84, 98, 18, 26, c);
  canvas.fillTriangle(100, 111, 126, 84, 126, 138, c);
  canvas.fillTriangle(100, 98, 126, 84, 100, 111, c);
  canvas.fillTriangle(100, 124, 126, 138, 100, 111, c);
  canvas.drawArc(130, 111, 16, 14, 300, 60, c);
  canvas.drawArc(130, 111, 26, 24, 300, 60, c);
  canvas.setTextDatum(middle_center);
  canvas.setFont(&fonts::FreeSansBold9pt7b);
  canvas.setTextColor(c);
  canvas.drawString(bleConnected ? "Connected" : "Pair: Desk Buddy", 120, 60);
  if (millis() < volLastUntil) {
    canvas.setFont(&fonts::FreeSansBold12pt7b);
    canvas.setTextColor(GOOD_COLOR);
    canvas.drawString(volLast, 120, 168);
  } else {
    canvas.setFont(&fonts::FreeSans9pt7b);
    canvas.setTextColor(TEXT_DIM);
    canvas.drawString("press play | 2x next", 120, 168);
    canvas.drawString("tap = mute", 120, 188);
  }
}

void drawRemote() {
  canvas.fillScreen(BG);
  // steering arc: -100..100 maps to -60..+60 degrees around the top
  canvas.fillArc(120, 120, 100, 112, 210, 330, DIM_COLOR);
  float a = 270 + carSteer * 0.6f;
  canvas.fillArc(120, 120, 96, 116, a - 4, a + 4, EYE_COLOR);
  canvas.setTextDatum(middle_center);
  canvas.setFont(&fonts::FreeSansBold24pt7b);
  canvas.setTextColor(carGo ? GOOD_COLOR : ANGRY_COLOR);
  canvas.drawString(carGo ? "GO" : "STOP", 120, 112);
  canvas.setFont(&fonts::FreeSansBold9pt7b);
  char buf[24];
  if (millis() - carHeardAt < 2000 && carHeardAt) {
    snprintf(buf, sizeof buf, "%u cm ahead", (unsigned)carDist);
    canvas.setTextColor(carDist < 20 ? ANGRY_COLOR : EYE_COLOR);
  } else {
    snprintf(buf, sizeof buf, "car: not heard");
    canvas.setTextColor(TEXT_DIM);
  }
  canvas.drawString(buf, 120, 160);
  canvas.setTextColor(TEXT_DIM);
  canvas.setFont(&fonts::FreeSans9pt7b);
  canvas.drawString("tap = go/stop", 120, 186);
}

int circDist(int a, int b) { int d = abs(a - b) % 40; return d > 20 ? 40 - d : d; }

void drawSafe() {
  canvas.fillScreen(BG);
  int near = safeOpen ? 0 : circDist(safePos, safeCode[safeIdx]);
  for (int i = 0; i < 40; i++) {
    float a = ((i - safePos) / 40.0f) * 2 * PI - PI / 2;     // the dial turns, mark stays on top
    canvas.fillCircle(120 + 106 * cosf(a), 120 + 106 * sinf(a), i % 5 ? 2 : 4, i % 5 ? DIM_COLOR : TEXT_DIM);
  }
  canvas.fillTriangle(112, 4, 128, 4, 120, 16, ANGRY_COLOR);
  canvas.setTextDatum(middle_center);
  char buf[24];
  if (safeOpen) {
    canvas.setFont(&fonts::FreeSansBold12pt7b); canvas.setTextColor(GOOD_COLOR);
    canvas.drawString("UNLOCKED!", 120, 100);
    canvas.setFont(&fonts::FreeSansBold9pt7b); canvas.setTextColor(TEXT_DIM);
    snprintf(buf, sizeof buf, "%d tries - tap again", safeTries);
    canvas.drawString(buf, 120, 140);
    return;
  }
  // warm glow when close
  uint32_t glow = near == 0 ? GOOD_COLOR : near <= 3 ? 0xF5B041 : DIM_COLOR;
  canvas.fillCircle(120, 112, 44, glow);
  canvas.fillCircle(120, 112, 38, BG);
  canvas.setFont(&fonts::Font7); canvas.setTextColor(EYE_COLOR);
  snprintf(buf, sizeof buf, "%02d", safePos);
  canvas.drawString(buf, 120, 112);
  canvas.setFont(&fonts::FreeSansBold9pt7b);
  for (int i = 0; i < 3; i++) {
    uint32_t c = i < safeIdx ? GOOD_COLOR : (i == safeIdx ? EYE_COLOR : DIM_COLOR);
    canvas.fillCircle(96 + i * 24, 180, 7, c);
  }
}

void drawReact() {
  uint32_t bgc = rState == R_READY ? 0x5A0E0E : rState == R_GO ? 0x0E5A2A : BG;
  canvas.fillScreen(bgc);
  canvas.setTextDatum(middle_center);
  canvas.setFont(&fonts::FreeSansBold12pt7b);
  char buf[24];
  switch (rState) {
    case R_WAIT:   canvas.setTextColor(EYE_COLOR);  canvas.drawString("Tap to start", 120, 110); break;
    case R_READY:  canvas.setTextColor(0xFFB3B3);   canvas.drawString("wait...", 120, 110); break;
    case R_GO:     canvas.setTextColor(0xFFFFFF);   canvas.drawString("TAP!", 120, 110); break;
    case R_EARLY:  canvas.setTextColor(ANGRY_COLOR); canvas.drawString("Too soon!", 120, 110); break;
    case R_RESULT:
      canvas.setFont(&fonts::Font7); canvas.setTextColor(GOOD_COLOR);
      snprintf(buf, sizeof buf, "%lu", (unsigned long)rResult);
      canvas.drawString(buf, 120, 104);
      canvas.setFont(&fonts::FreeSansBold9pt7b); canvas.setTextColor(TEXT_DIM);
      canvas.drawString("ms - tap again", 120, 148);
      break;
  }
  if (reactBest) {
    canvas.setFont(&fonts::FreeSansBold9pt7b); canvas.setTextColor(TEXT_DIM);
    snprintf(buf, sizeof buf, "best %d ms", reactBest);
    canvas.drawString(buf, 120, 60);
  }
}

void drawCount() {
  canvas.fillScreen(BG);
  char buf[16];
  snprintf(buf, sizeof buf, "%d", countValue);
  canvas.setTextDatum(middle_center);
  canvas.setFont(&fonts::Font7);
  canvas.setTextColor(EYE_COLOR);
  canvas.drawString(buf, 120, 112);
  canvas.setFont(&fonts::FreeSans9pt7b);
  canvas.setTextColor(TEXT_DIM);
  canvas.drawString("turn = +1 / -1", 120, 166);
  canvas.drawString("2x press = reset", 120, 186);
}

void drawToast() {
  if (!toast[0] || millis() > toastUntil) return;
  canvas.fillRoundRect(40, 196, 160, 26, 12, 0x14324A);
  canvas.setTextDatum(middle_center);
  canvas.setFont(&fonts::FreeSansBold9pt7b);
  canvas.setTextColor(0xFFFFFF);
  canvas.drawString(toast, 120, 209);
}

// ---------------------------------------------------------------- setup
// Sets the clock from the time this sketch was compiled, if the clock was never set.
void setClockIfNeeded() {
  auto dt = nowDT();
  if (dt.date.year >= 2025) return;
  static const char *MON = "JanFebMarAprMayJunJulAugSepOctNovDec";
  char m[4]; int d, y, hh, mm, ss;
  sscanf(__DATE__, "%3s %d %d", m, &d, &y);
  sscanf(__TIME__, "%d:%d:%d", &hh, &mm, &ss);
  m5::rtc_datetime_t t;
  t.date.year = y; t.date.month = (strstr(MON, m) - MON) / 3 + 1; t.date.date = d;
  // weekday (Sakamoto's method)
  static const int tt[] = {0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4};
  int yy = y - (t.date.month < 3);
  t.date.weekDay = (yy + yy / 4 - yy / 100 + yy / 400 + tt[t.date.month - 1] + d) % 7;
  t.time.hours = hh; t.time.minutes = mm; t.time.seconds = ss;
  M5Dial.Rtc.setDateTime(t);
}

void setup() {
  auto cfg = M5.config();
  M5Dial.begin(cfg, true, true);          // knob on, NFC reader on
  M5Dial.Display.setBrightness(BRIGHT);
  M5Dial.Speaker.setVolume(110);
  M5Dial.BtnA.setHoldThresh(900);         // hold the knob ~1 s -> menu
  canvas.setColorDepth(16);
  canvas.createSprite(240, 240);
  setClockIfNeeded();

  prefs.begin("buddy", false);
  hunger        = prefs.getInt("hunger", 20);
  countValue    = prefs.getInt("count", 0);
  reactBest     = prefs.getInt("best", 0);
  timerSessions = prefs.getInt("sessions", 0);
  workMin       = prefs.getInt("workMin", WORK_MIN_DEFAULT);

  if (wifiWanted) {
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASS);      // connects in the background
    configTzTime(TZ_INFO, "pool.ntp.org", "time.google.com");
  }

  randomSeed(esp_random());
  lastEnc = M5Dial.Encoder.read();
  lastActivity = millis();
  nextBlink = millis() + 1500;
  nextHungerTick = millis() + HUNGER_EVERY_MIN * 60000UL;
  nextWater = millis() + WATER_EVERY_MIN * 60000UL;
  play(S_WAKE, 3);
  setMood(SURPRISED, 800);
}

// ---------------------------------------------------------------- per-mode input
void buddyInput(long rawD, int clicks, bool single, bool dbl, m5::touch_detail_t &t, uint32_t now) {
  if (rawD && !clockMode) {
    tgx += rawD * 3.0f;
    if (tgx > 32) tgx = 32;
    if (tgx < -32) tgx = -32;
    gazeHoldUntil = now + 1500;
    spinEnergy += abs(rawD);
    if (spinEnergy > 70 && mood != DIZZY) { setMood(DIZZY, 2500); play(S_DIZZY, 5); spinEnergy = 0; }
    else if (clicks && soundIdle()) play(S_CLICK, 1);
  }
  if (single) { clockMode = !clockMode; clockUntil = now + 10000; play(S_CHIRP, 2); }
  if (dbl) {                                            // feed the pet
    clockMode = false;
    hunger = hunger > 35 ? hunger - 35 : 0; markDirty();
    feedAnimUntil = now + 1200;
    setMood(HAPPY, 1800); play(S_YUM, 5);
  }
  if (clockMode && now > clockUntil) clockMode = false;

  if (t.wasPressed()) {
    if (clockMode) clockMode = false;
    if (waterDue) { waterDue = false; setMood(HAPPY, 1500); play(S_CHIRP, 2); return; }
    tgx = (t.x - 120) / 4.0f; tgy = (t.y - 120) / 5.0f; gazeHoldUntil = now + 1200;
    tapTimes[tapIdx] = now; tapIdx = (tapIdx + 1) % 5;
    if (now - tapTimes[tapIdx] < 2000) { setMood(ANGRY, 2500); play(S_ANGRY, 3); memset(tapTimes, 0, sizeof tapTimes); }
  }
  if (t.wasHold() && mood != ANGRY) { setMood(LOVE, 3000); play(S_LOVE, 3); }
  else if (t.wasClicked() && mood != ANGRY && mood != LOVE) { setMood(HAPPY, 1500); play(S_CHIRP, 2); }
}

void buddyLife(uint32_t now) {
  // pet gets hungry over time
  if (now > nextHungerTick) {
    nextHungerTick = now + HUNGER_EVERY_MIN * 60000UL;
    if (hunger < 100) { hunger++; markDirty(); }
    if (hunger == 70) play(S_SAD, 2);
  }
  // water reminder (not at night)
  if (WATER_EVERY_MIN && now > nextWater) {
    nextWater = now + WATER_EVERY_MIN * 60000UL;
    if (!isNight()) { waterDue = true; if (mode == M_BUDDY) { wake(); play(S_WATER, 5); } }
  }
  if (mode != M_BUDDY) return;

  // good morning, once a day, when you first wake it up between 5 and 11
  auto dt = nowDT();
  if (dt.time.hours >= 5 && dt.time.hours < 11 && dt.date.date != lastGreetDay &&
      (mood == SURPRISED || mood == HAPPY)) {
    lastGreetDay = dt.date.date; greetUntil = now + 4000; play(S_LOVE, 3);
  }

  // temporary moods end; idle -> sleepy -> asleep (faster at night)
  if (moodUntil && now > moodUntil) setMood(NORMAL, 0);
  uint32_t idle = now - lastActivity;
  uint32_t sleepyAt = isNight() ? 10000 : SLEEPY_AFTER_MS;
  uint32_t asleepAt = isNight() ? 20000 : ASLEEP_AFTER_MS;
  if (!moodUntil) {
    if (idle > asleepAt && mood != ASLEEP) { setMood(ASLEEP, 0); M5Dial.Display.setBrightness(DIM); dimmed = true; }
    else if (idle > sleepyAt && idle <= asleepAt && mood != SLEEPY) setMood(SLEEPY, 0);
    else if (idle <= sleepyAt) {
      Mood base = hunger >= 70 ? SAD : NORMAL;
      if (mood != base) setMood(base, 0);
    }
  }

  // eyes look around by themselves
  if (now > gazeHoldUntil) {
    if (now > nextLook && (mood == NORMAL || mood == SLEEPY || mood == SAD)) {
      tgx = random(-26, 27); tgy = random(-10, 11);
      nextLook = now + random(1200, 4200);
      if (random(4) == 0) { tgx = 0; tgy = 0; }
    }
    if (mood == ASLEEP) { tgx = 0; tgy = 6; }
  }

  // blink
  if (now > nextBlink && mood != ASLEEP && mood != DIZZY && mood != LOVE) {
    blinkStart = now;
    nextBlink = now + random(1800, 5500);
    if (random(5) == 0) nextBlink = now + 260;   // sometimes a double blink
  }

  // ease toward targets
  tew = (mood == SURPRISED) ? 62 : 56;
  teh = (mood == SURPRISED) ? 80 : (mood == SAD ? 60 : 70);
  gx += (tgx - gx) * 0.25f; gy += (tgy - gy) * 0.25f;
  ew += (tew - ew) * 0.3f;  eh += (teh - eh) * 0.3f;
}

void timerInput(int clicks, bool click, m5::touch_detail_t &t) {
  if (tState == T_IDLE && clicks) {
    workMin = constrain(workMin + clicks, 1, 90); markDirty();
    if (soundIdle()) play(S_CLICK, 1);
  }
  if (click) {
    if (tState == T_IDLE)       { timerStart(workMin * 60000UL, false); play(S_CHIRP, 2); }
    else if (tState == T_RUN)   { tLeftMs = tEndAt > millis() ? tEndAt - millis() : 0; tState = T_PAUSE; }
    else                        { tEndAt = millis() + tLeftMs; tState = T_RUN; }
  }
  if (t.wasClicked() && tState == T_PAUSE) { tState = T_IDLE; onBreak = false; }
}

void volumeInput(int clicks, bool single, bool dbl, m5::touch_detail_t &t) {
  for (int i = 0; i < abs(clicks); i++) mediaKey(clicks > 0 ? KEY_VOL_UP : KEY_VOL_DOWN, clicks > 0 ? "Vol +" : "Vol -");
  if (single) mediaKey(KEY_PLAY, "Play/Pause");
  if (dbl)    mediaKey(KEY_NEXT, "Next");
  if (t.wasClicked()) mediaKey(KEY_MUTE, "Mute");
}

void remoteInput(int clicks, bool click, m5::touch_detail_t &t, uint32_t now) {
  if (clicks) carSteer = constrain(carSteer + clicks * 10, -100, 100);
  if (click) carSteer = 0;
  if (t.wasClicked()) { carGo = !carGo; play(S_CHIRP, 2); }
  if (now > nextCarSend) { nextCarSend = now + 100; carSend(); }
}

void safeInput(int clicks, bool click, m5::touch_detail_t &t) {
  if (safeOpen) { if (t.wasClicked() || click) safeNew(); return; }
  if (clicks) {
    safePos = ((safePos + clicks) % 40 + 40) % 40;
    int near = circDist(safePos, safeCode[safeIdx]);
    Note n = {(uint16_t)(near == 0 ? 3600 : near <= 3 ? 2600 - near * 300 : 1200), 10};
    play(&n, 1);
  }
  if (click) {
    safeTries++;
    if (safePos == safeCode[safeIdx]) {
      safeIdx++;
      if (safeIdx == 3) { safeOpen = true; play(S_OPEN, 5); }
      else play(S_CHIRP, 2);
    } else play(S_WRONG, 1);
  }
}

void reactInput(m5::touch_detail_t &t, uint32_t now) {
  bool tap = t.wasPressed();
  switch (rState) {
    case R_WAIT: case R_RESULT: case R_EARLY:
      if (tap) { rState = R_READY; rGoAt = now + random(1500, 4000); }
      break;
    case R_READY:
      if (tap) { rState = R_EARLY; play(S_WRONG, 1); }
      else if (now >= rGoAt) { rState = R_GO; rGoAt = now; play(S_CLICK, 1); }
      break;
    case R_GO:
      if (tap) {
        rResult = now - rGoAt; rState = R_RESULT;
        if (!reactBest || (int)rResult < reactBest) { reactBest = rResult; markDirty(); play(S_OPEN, 5); }
        else play(S_CHIRP, 2);
      }
      break;
  }
}

void countInput(int clicks, bool dbl) {
  if (clicks) { countValue += clicks; markDirty(); if (soundIdle()) play(S_CLICK, 1); }
  if (dbl)    { countValue = 0; markDirty(); play(S_WRONG, 1); }
}

// ---------------------------------------------------------------- NFC
void nfcTick(uint32_t now) {
  if (now < nextRfid) return;
  nextRfid = now + 300;
  if (!(M5Dial.Rfid.PICC_IsNewCardPresent() && M5Dial.Rfid.PICC_ReadCardSerial())) return;
  wake();
  char id[12] = "", *p = id;
  for (byte i = 0; i < M5Dial.Rfid.uid.size && i < 4; i++) p += sprintf(p, "%02X", M5Dial.Rfid.uid.uidByte[i]);
  M5Dial.Rfid.PICC_HaltA();
  play(S_CARD, 3);

  if (sizeof(CARD_STUDY) > 1 && !strcasecmp(id, CARD_STUDY)) {
    enterMode(M_TIMER); timerStart(workMin * 60000UL, false); showToast("Study time!", 2000);
  } else if (sizeof(CARD_ROBOT) > 1 && !strcasecmp(id, CARD_ROBOT)) {
    enterMode(M_REMOTE); showToast("Robot remote", 2000);
  } else if (sizeof(CARD_PARTY) > 1 && !strcasecmp(id, CARD_PARTY)) {
    enterMode(M_BUDDY); setMood(LOVE, 4000); play(S_OPEN, 5);
  } else {
    char msg[20]; snprintf(msg, sizeof msg, "Card %s", id);
    showToast(msg, 3000);
    if (mode == M_BUDDY) { clockMode = false; setMood(SURPRISED, 900); }
  }
}

// ---------------------------------------------------------------- loop
void loop() {
  M5Dial.update();
  uint32_t now = millis();
  soundTick();
  timeTick();
  weatherTick();
  timerTick();
  saveTick();

  // ---- read the knob, its button and the screen once
  long enc = M5Dial.Encoder.read();
  long rawD = enc - lastEnc;
  lastEnc = enc;
  int clicks = rawD ? knobClicks(rawD) : 0;
  bool held   = M5Dial.BtnA.wasHold();
  bool click  = M5Dial.BtnA.wasClicked();          // any short press
  bool single = M5Dial.BtnA.wasSingleClicked();    // short press, not part of a double
  bool dbl    = M5Dial.BtnA.wasDoubleClicked();
  auto t = M5Dial.Touch.getDetail();
  if (rawD || held || click || t.wasPressed()) wake();
  spinEnergy *= 0.94f;                    // energy fades, so only FAST spinning counts

  // ---- hold the knob -> menu (from anywhere)
  if (held) {
    if (mode == M_MENU) enterMode((Mode)menuSel);
    else { if (mode == M_REMOTE) { carGo = false; carSend(); } menuSel = mode; mode = M_MENU; }
    play(S_MENU, 2);
  } else if (mode == M_MENU) {
    if (clicks) { menuSel = ((menuSel - 1 + clicks) % MODE_COUNT + MODE_COUNT) % MODE_COUNT + 1; play(S_CLICK, 1); }
    if (click) { enterMode((Mode)menuSel); play(S_CHIRP, 2); }
  } else {
    switch (mode) {
      case M_BUDDY:  buddyInput(rawD, clicks, single, dbl, t, now); break;
      case M_TIMER:  timerInput(clicks, click, t); break;
      case M_VOLUME: volumeInput(clicks, single, dbl, t); break;
      case M_REMOTE: remoteInput(clicks, click, t, now); break;
      case M_SAFE:   safeInput(clicks, click, t); break;
      case M_REACT:  reactInput(t, now); break;
      case M_COUNT:  countInput(clicks, dbl); break;
      default: break;
    }
  }

  nfcTick(now);
  buddyLife(now);

  // ---- tools go back to the buddy after a long idle (not while a timer runs or car drives)
  if (mode != M_BUDDY && now - lastActivity > BACK_TO_BUDDY_MS && tState != T_RUN && !carGo) enterMode(M_BUDDY);

  // ---- draw (about 40 frames a second)
  static uint32_t nextFrame = 0;
  if (now >= nextFrame) {
    nextFrame = now + 25;
    switch (mode) {
      case M_MENU:   drawMenu(); break;
      case M_BUDDY:  if (clockMode) drawClock(); else drawFace(); break;
      case M_TIMER:  drawTimer(); break;
      case M_VOLUME: drawVolume(); break;
      case M_REMOTE: drawRemote(); break;
      case M_SAFE:   drawSafe(); break;
      case M_REACT:  drawReact(); break;
      case M_COUNT:  drawCount(); break;
    }
    drawToast();
    canvas.pushSprite(0, 0);
  }
}
