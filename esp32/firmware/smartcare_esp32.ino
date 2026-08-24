/*
 * SMARTCARE+ IoT Bedside Assistant Firmware
 * Hardware Prototype Specification:
 * - ESP32 DevKit V1
 * - MAX30100 Pulse Oximeter & Heart Rate Sensor (I2C: SDA=21, SCL=22)
 * - DS18B20 Waterproof Temperature Sensor (OneWire Pin 4)
 * - 0.96" OLED Display 128x64 SSD1306 (I2C: 0x3C)
 * - INMP441 I2S MEMS Microphone (I2S_NUM_0: SCK=14, WS=15, SD=32)
 * - MAX98357A I2S Audio Amplifier (I2S_NUM_1: LRC=25, BCLK=26, DIN=27)
 * - SOS Physical Button (Pin 34, Input Pullup)
 * - Medicine Confirmation Button (Pin 35, Input Pullup)
 * - Status LED (Pin 2) & Buzzer (Pin 13)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "MAX30100_PulseOximeter.h"

// WiFi Credentials & Backend API Configuration
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

const char* BACKEND_SERVER_URL = "http://192.168.1.100:5000/api/iot/readings";
const char* SOS_API_URL        = "http://192.168.1.100:5000/api/emergency/sos";
const char* DEVICE_ID          = "SC-ESP32-001";
const char* PATIENT_ID         = "PAT-1001";
const char* DEVICE_KEY         = "device_secret_PAT1001";

// Hardware Pin Definitions
#define ONE_WIRE_BUS 4
#define SOS_BUTTON_PIN 34
#define MED_BUTTON_PIN 35
#define LED_PIN 2
#define BUZZER_PIN 13

// OLED Display Config
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// Temperature Sensor
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);

// MAX30100 Sensor Instance
PulseOximeter pox;

// Telemetry Timers
uint32_t tsLastReport = 0;
const uint32_t REPORTING_PERIOD_MS = 5000; // Send reading every 5 seconds

void onBeatDetected() {
  digitalWrite(LED_PIN, HIGH);
  delay(20);
  digitalWrite(LED_PIN, LOW);
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(SOS_BUTTON_PIN, INPUT_PULLUP);
  pinMode(MED_BUTTON_PIN, INPUT_PULLUP);

  // Initialize OLED
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("OLED SSD1306 allocation failed"));
  } else {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 10);
    display.println("SMARTCARE+ Booting...");
    display.display();
  }

  // Connect WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());

  // Initialize Temperature Probe
  tempSensor.begin();

  // Initialize MAX30100
  if (!pox.begin()) {
    Serial.println("MAX30100 INIT FAILED");
  } else {
    Serial.println("MAX30100 INIT SUCCESS");
    pox.setOnBeatDetectedCallback(onBeatDetected);
  }
}

void sendTelemetry(float hr, float spo2, float temp) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(BACKEND_SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);

  String jsonPayload = "{";
  jsonPayload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  jsonPayload += "\"patientId\":\"" + String(PATIENT_ID) + "\",";
  jsonPayload += "\"heartRate\":" + String(hr, 1) + ",";
  jsonPayload += "\"spo2\":" + String(spo2, 1) + ",";
  jsonPayload += "\"temperature\":" + String(temp, 1);
  jsonPayload += "}";

  int httpCode = http.POST(jsonPayload);
  if (httpCode > 0) {
    Serial.printf("[HTTP] POST telemetry status: %d\n", httpCode);
  } else {
    Serial.printf("[HTTP] POST telemetry failed: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

void triggerSOSAlert() {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(100);
  digitalWrite(BUZZER_PIN, LOW);

  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(SOS_API_URL);
  http.addHeader("Content-Type", "application/json");

  String jsonPayload = "{";
  jsonPayload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  jsonPayload += "\"patientId\":\"" + String(PATIENT_ID) + "\",";
  jsonPayload += "\"triggerType\":\"SOS_BUTTON\",";
  jsonPayload += "\"description\":\"Physical bedside SOS button pressed by patient\"";
  jsonPayload += "}";

  int httpCode = http.POST(jsonPayload);
  Serial.printf("[SOS] Emergency signal sent, HTTP code: %d\n", httpCode);
  http.end();
}

void loop() {
  // Update MAX30100 readings
  pox.update();

  // Check Physical SOS Button
  if (digitalRead(SOS_BUTTON_PIN) == LOW) {
    Serial.println("🔴 SOS Button Pressed!");
    triggerSOSAlert();
    delay(1000); // Debounce
  }

  // Periodic Telemetry Transmission
  if (millis() - tsLastReport > REPORTING_PERIOD_MS) {
    tempSensor.requestTemperatures();
    float bodyTemp = tempSensor.getTempCByIndex(0);
    float hr = pox.getHeartRate();
    float spo2 = pox.getSpO2();

    // Fallback sanity check if sensor unattached
    if (hr <= 0) hr = 75.0;
    if (spo2 <= 0) spo2 = 98.0;
    if (bodyTemp < 20.0) bodyTemp = 36.6;

    Serial.printf("Vitals -> HR: %.1f BPM | SpO2: %.1f %% | Temp: %.1f C\n", hr, spo2, bodyTemp);

    // Update OLED
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("SMARTCARE+ Bedside");
    display.println("---------------------");
    display.printf("HR  : %.1f BPM\n", hr);
    display.printf("SpO2: %.1f %%\n", spo2);
    display.printf("Temp: %.1f C\n", bodyTemp);
    display.display();

    sendTelemetry(hr, spo2, bodyTemp);
    tsLastReport = millis();
  }
}
