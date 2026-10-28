/*
  DESK BUDDY  -  your settings
  ----------------------------
  Change these, then upload again.
  Everything works without Wi-Fi too (the time then comes from the
  built-in clock, and there is no weather).
*/
#pragma once

// ---- Wi-Fi (2.4 GHz only). Leave "" to run without Wi-Fi.
#define WIFI_SSID   ""
#define WIFI_PASS   ""

// ---- your place, for the weather (Open-Meteo, free, no key needed).
//      Find yours on maps: right-click a spot -> the two numbers.
#define WEATHER_LAT "28.61"      // New Delhi - change to your city
#define WEATHER_LON "77.21"
#define HOT_C       35           // at or above this, the buddy sweats

// ---- time zone (India). Format is POSIX: "IST-5:30" means UTC+5:30.
#define TZ_INFO     "IST-5:30"

// ---- daily life
#define WATER_EVERY_MIN   45     // "Pani piyo" reminder (0 = off)
#define NIGHT_FROM_HOUR   23     // sleeps by itself from 11 PM ...
#define NIGHT_TO_HOUR     7      // ... to 7 AM
#define HUNGER_EVERY_MIN  6      // pet gets 1% hungrier every 6 min

// ---- Pomodoro
#define WORK_MIN_DEFAULT  25
#define BREAK_MIN         5

// ---- knob. If one click of the knob moves 2 or 4 steps, set this to
//      1. If it turns the wrong way, set KNOB_REVERSE to 1.
#define ENC_PER_CLICK     4
#define KNOB_REVERSE      0

// ---- Robot remote (ESP-NOW). The car must be on the same Wi-Fi
//      channel; with no Wi-Fi above, both use channel 1.
#define REMOTE_SPEED      70     // 0-100 %

// ---- NFC magic cards. Tap a card once: its ID shows on screen
//      (like "Card 1A2B3C4D"). Put the 8 letters/numbers here.
#define CARD_STUDY  ""           // -> Pomodoro timer starts
#define CARD_ROBOT  ""           // -> Robot remote
#define CARD_PARTY  ""           // -> love face + tune
