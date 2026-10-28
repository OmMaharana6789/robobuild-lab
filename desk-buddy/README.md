# Desk Buddy sketch files

This folder holds the Arduino sketch for the Desk Buddy (M5Stack Dial).
The Code page of `desk-buddy.html` loads these files from here:

- `desk_buddy_dial.ino`: the main sketch
- `config.h`: your settings (Wi-Fi name and password, NFC card IDs)

To use them in Arduino IDE, put both files in a folder named `desk_buddy_dial`.
Board: M5Dial (`m5stack:esp32:m5stack_dial`), Flash Size 8MB,
Partition Scheme "8M with spiffs (3MB APP/1.5MB SPIFFS)".
