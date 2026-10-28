# RoboBuild Lab

Interactive 3D build guides for beginners. Two tutorials so far:

## 1. 4WD sensor robot (`index.html`)

An interactive 3D guide for building a 4WD obstacle-avoiding robot with an Arduino Uno, an L298N motor driver, four TT gear motors, and an HC-SR04 ultrasonic sensor that an MG90S servo turns to look left and right.

- **3D Tutorial:** build the robot step by step, one action at a time. Rotate, zoom and pan it on desktop or phone.
- **Wiring:** every connection, with a diagram and the reason it goes there.
- **Components and Learn Electronics:** what each part does, from simple to technical.
- **Video Tutorial:** the whole build as a 3D film, with chapters that jump to the matching 3D step.
- **Code:** the Arduino sketch, explained block by block.
- **Quick Revision and Progress:** exam-style questions, and progress saved in your browser.

## 2. Desk Buddy on the M5Stack Dial (`desk-buddy.html`)

Turn an M5Stack Dial into a desk gadget: animated eyes, a Pomodoro timer, a Bluetooth volume knob, an ESP-NOW robot remote, a safe-cracker game, a reaction game, a counter, and NFC magic cards.

- **3D Tutorial:** a 3D Dial with a live screen. Look inside (ESP32-S3, NFC coil, RTC, buzzer, encoder), plug in the cable, and try every mode with on-screen Turn / Press / Tap buttons.
- **Setup:** no wiring. USB-C data cable, Arduino IDE, M5Stack board pack, M5Dial library, and the upload settings.
- **Modes Guide:** every mode and every control.
- **Learn the Parts:** rotary encoder, capacitive touch, NFC, RTC, BLE HID, ESP-NOW, Wi-Fi time (NTP), weather API.
- **Code:** loads `desk-buddy/desk_buddy_dial.ino` and `desk-buddy/config.h`, with copy and download buttons.
- **Quick Revision and Progress:** questions, and its own progress saved in your browser.
- **Part 2 · Car link:** drive the 4WD car with the Dial. Swap the Uno for an ESP32, wire it (pin table + diagram, Echo voltage divider, common ground), upload `desk-buddy/smart_car_esp32.ino`, and test the link, failsafe and auto-brake in a 3D simulation of the Dial and the car.

Open it here: https://ommaharana6789.github.io/robobuild-lab/ (Desk Buddy: `desk-buddy.html`)

It's a static site: `index.html` + `robot_engine.js` and `desk-buddy.html` + `desk_buddy_engine.js` + `car_link_engine.js`, with three.js loaded from a CDN. To run it locally, serve the folder (e.g. `python -m http.server`) and open `index.html`. The Desk Buddy Code page needs a server to load the sketch files.
