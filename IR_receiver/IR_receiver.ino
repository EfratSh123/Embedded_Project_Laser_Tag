#include <WiFi.h>
#include <WebSocketsServer.h>
#include <IRremote.h>

#define IR_RECEIVE_PIN 15
#define BUZZER_PIN 2

// // פרטי הרשת שלך
const char* ssid = "XXX";
const char* password = "XXX";

WebSocketsServer webSocket = WebSocketsServer(81); // פורט 81

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);
  IrReceiver.begin(IR_RECEIVE_PIN, ENABLE_LED_FEEDBACK);

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi...");
  while (WiFi.status() != WL_CONNECTED) {
  delay(500);
  //Serial.print(".");
  //Serial.print(" status: ");
  //Serial.println(WiFi.status());
}

  Serial.println("\nConnected to WiFi. IP address: ");
  Serial.println(WiFi.localIP());

  webSocket.begin();
  webSocket.onEvent([](uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
    // לא נדרש עיבוד קלט
  });

  Serial.println("WebSocket server started");
}

void loop() {
  webSocket.loop();
  if (IrReceiver.decode()) {
    unsigned long irCode = IrReceiver.decodedIRData.decodedRawData;

    Serial.print("Code received: 0x");
    Serial.println(irCode, HEX);

    tone(BUZZER_PIN, 1000, 100);

    // יצירת JSON
    String msg = "{\"senderId\":" + String(irCode) + "}";
    webSocket.broadcastTXT(msg);

    IrReceiver.resume();
  }
  delay(1000);
}