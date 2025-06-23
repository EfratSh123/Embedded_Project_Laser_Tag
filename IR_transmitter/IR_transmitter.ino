#include <IRremote.h>

#define IR_LED_PIN 15      // הפין שמחובר ל-IR LED
#define BUTTON_PIN 2       // הפין של הלחצן

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  IrSender.begin(IR_LED_PIN);  // אתחול IR – רק עם הפין
    Serial.println("משדר מוכן");
}

void loop() {
  if (digitalRead(BUTTON_PIN) == HIGH) {
    IrSender.sendNEC(0xB9, 32); // שליחת קוד NEC לדוגמה
    Serial.println("send");
  } 
  delay(1000); // מניעת שידור כפול
}
