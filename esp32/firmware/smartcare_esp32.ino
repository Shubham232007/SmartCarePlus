/*
 * ================================================================
 *  SMARTCARE+  -  ESP32 Bedside IoT Firmware  v2.0
 * ================================================================
 *
 *  Hardware:
 *   - ESP32 DevKit V1
 *   - MAX30100  Pulse Oximeter & Heart Rate  (I2C: SDA=21, SCL=22, addr=0x57)
 *   - MLX90614  IR Body Temperature          (I2C: SDA=21, SCL=22, addr=0x5A)
 *   - SSD1306   OLED 128x64                  (I2C: SDA=21, SCL=22, addr=0x3C)
 *   - INMP441   I2S MEMS Microphone          (I2S0: SCK=14, WS=15, SD=32)
 *   - MAX98357A I2S Audio Amplifier          (I2S1: BCLK=26, LRC=25, DIN=27)
 *   - SOS Button                             (GPIO 34, INPUT_PULLUP)
 *   - Voice Push-to-Talk Button              (GPIO 35, INPUT_PULLUP)
 *   - Status LED                             (GPIO 2)
 *   - Active Buzzer                          (GPIO 13)
 *
 *  Backend API (no AI API keys on device):
 *   POST /api/iot/readings   - vital telemetry  (X-Device-Key auth)
 *   POST /api/iot/heartbeat  - device heartbeat (X-Device-Key auth)
 *   POST /api/iot/sos        - SOS alert        (X-Device-Key auth)
 *   POST /api/iot/voice      - AI voice query   (X-Device-Key auth)
 *
 *  SECURITY: OpenAI key lives ONLY on the server. Never on this device.
 * ================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "MAX30100_PulseOximeter.h"
#include <Adafruit_MLX90614.h>
#include <driver/i2s.h>

// ==============================================================================
//  USER CONFIGURATION - Edit these before flashing
// ==============================================================================

const char* WIFI_SSID        = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD    = "YOUR_WIFI_PASSWORD";
const char* BACKEND_BASE_URL = "http://192.168.1.100:5000";
const char* DEVICE_ID        = "SC-ESP32-001";
const char* PATIENT_ID       = "PAT-1001";
const char* DEVICE_KEY       = "device_secret_PAT-1001";

// ==============================================================================
//  PIN DEFINITIONS
// ==============================================================================

// I2C shared bus
#define I2C_SDA 21
#define I2C_SCL 22

// INMP441 I2S Microphone (I2S port 0)
#define MIC_I2S_PORT  I2S_NUM_0
#define MIC_SCK       14
#define MIC_WS        15
#define MIC_SD        32

// MAX98357A I2S Amplifier (I2S port 1)
#define SPK_I2S_PORT  I2S_NUM_1
#define SPK_BCLK      26
#define SPK_LRC       25
#define SPK_DIN       27

// GPIO
#define SOS_BUTTON_PIN  34
#define PTT_BUTTON_PIN  35
#define LED_PIN          2
#define BUZZER_PIN      13

// ==============================================================================
//  OLED
// ==============================================================================

#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT  64
#define OLED_RESET     -1
#define OLED_ADDR    0x3C

Adafruit_SSD1306 oled(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
bool oledOK = false;

// ==============================================================================
//  SENSORS
// ==============================================================================

PulseOximeter     pox;
Adafruit_MLX90614 mlx;

bool  poxOK         = false;
bool  mlxOK         = false;
float currentHR     = 0;
float currentSpO2   = 0;
float currentTemp   = 0;
bool  fingerDetected = false;

// ==============================================================================
//  TIMING
// ==============================================================================

uint32_t lastTelemetryMs  = 0;
uint32_t lastHeartbeatMs  = 0;
uint32_t lastOledUpdateMs = 0;
uint32_t sosDebounceMs    = 0;

const uint32_t TELEMETRY_INTERVAL_MS  = 5000;
const uint32_t HEARTBEAT_INTERVAL_MS  = 30000;
const uint32_t OLED_REFRESH_MS        = 1000;
const uint32_t SOS_DEBOUNCE_MS        = 3000;

// ==============================================================================
//  AUDIO / VOICE
// ==============================================================================

#define MIC_SAMPLE_RATE    16000
#define MIC_BUFFER_SIZE    512
#define MAX_AUDIO_SAMPLES  (MIC_SAMPLE_RATE * 5)  // 5 s max recording

bool     micOK       = false;
bool     speakerOK   = false;
int16_t* audioBuffer = nullptr;
uint32_t audioCaptured = 0;

enum VoiceState { VS_IDLE, VS_LISTENING, VS_PROCESSING, VS_SPEAKING };
VoiceState voiceState = VS_IDLE;

// ==============================================================================
//  BEAT CALLBACK
// ==============================================================================

void IRAM_ATTR onBeatDetected() {
  fingerDetected = true;
  digitalWrite(LED_PIN, HIGH);
}

// ==============================================================================
//  FUNCTION DECLARATIONS
// ==============================================================================

void initDisplay();
void initSensors();
void initMicrophone();
void initSpeaker();
void connectWiFi();
void ensureWiFi();
void readMAX30100();
void readMLX90614();
void updateOLED_Vitals();
void updateOLED_State(const char* l1, const char* l2, const char* l3);
void sendTelemetry();
void sendHeartbeat();
void handleSOS();
void triggerSOSAlert();
void handleVoicePTT();
void sendVoiceTranscript(const String& transcript);
void playAudioCue();
void beep(int n, int ms);
String buildUrl(const char* path);
int   httpPost(const char* url, const String& body, String& resp);

// ==============================================================================
//  SETUP
// ==============================================================================

void setup() {
  Serial.begin(115200);
  Serial.println("[BOOT] SmartCare+ ESP32 v2.0 starting...");

  pinMode(LED_PIN,        OUTPUT);
  pinMode(BUZZER_PIN,     OUTPUT);
  pinMode(SOS_BUTTON_PIN, INPUT_PULLUP);
  pinMode(PTT_BUTTON_PIN, INPUT_PULLUP);
  digitalWrite(LED_PIN,    LOW);
  digitalWrite(BUZZER_PIN, LOW);

  Wire.begin(I2C_SDA, I2C_SCL);

  initDisplay();
  updateOLED_State("SMARTCARE+", "Booting...", "v2.0");

  initSensors();
  initMicrophone();
  initSpeaker();

  audioBuffer = (int16_t*)malloc(MAX_AUDIO_SAMPLES * sizeof(int16_t));
  if (!audioBuffer) {
    Serial.println("[MEM] Audio buffer alloc FAILED");
    micOK = false;
  }

  updateOLED_State("SMARTCARE+", "WiFi Connecting...", "");
  connectWiFi();

  Serial.println("[BOOT] SmartCare+ ready.");
  beep(2, 100);
  updateOLED_Vitals();
}

// ==============================================================================
//  MAIN LOOP - NON-BLOCKING
// ==============================================================================

void loop() {
  uint32_t now = millis();

  if (poxOK) readMAX30100();

  if (fingerDetected) {
    digitalWrite(LED_PIN, LOW);
    fingerDetected = false;
  }

  ensureWiFi();
  handleSOS();
  handleVoicePTT();

  if (now - lastTelemetryMs >= TELEMETRY_INTERVAL_MS) {
    readMLX90614();
    sendTelemetry();
    lastTelemetryMs = now;
  }

  if (now - lastHeartbeatMs >= HEARTBEAT_INTERVAL_MS) {
    sendHeartbeat();
    lastHeartbeatMs = now;
  }

  if (now - lastOledUpdateMs >= OLED_REFRESH_MS && voiceState == VS_IDLE) {
    updateOLED_Vitals();
    lastOledUpdateMs = now;
  }
}

// ==============================================================================
//  INIT DISPLAY
// ==============================================================================

void initDisplay() {
  if (oled.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    oledOK = true;
    oled.clearDisplay();
    oled.setTextSize(1);
    oled.setTextColor(SSD1306_WHITE);
    oled.display();
    Serial.println("[I2C] OLED found: 0x3C");
  } else {
    Serial.println("[I2C] OLED not found");
  }
}

// ==============================================================================
//  INIT SENSORS
// ==============================================================================

void initSensors() {
  if (pox.begin()) {
    poxOK = true;
    pox.setOnBeatDetectedCallback(onBeatDetected);
    pox.setIRLedCurrent(MAX30100_LED_CURR_7_6MA);
    Serial.println("[I2C] MAX30100 found: 0x57");
  } else {
    Serial.println("[I2C] MAX30100 FAILED");
  }

  if (mlx.begin()) {
    mlxOK = true;
    Serial.println("[I2C] MLX90614 found");
  } else {
    Serial.println("[I2C] MLX90614 not found");
  }
}

// ==============================================================================
//  INIT MICROPHONE (INMP441 I2S)
// ==============================================================================

void initMicrophone() {
  i2s_config_t cfg = {
    .mode                 = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate          = MIC_SAMPLE_RATE,
    .bits_per_sample      = I2S_BITS_PER_SAMPLE_32BIT,
    .channel_format       = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags     = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count        = 8,
    .dma_buf_len          = MIC_BUFFER_SIZE,
    .use_apll             = false,
    .tx_desc_auto_clear   = false,
    .fixed_mclk           = 0
  };
  i2s_pin_config_t pins = {
    .bck_io_num   = MIC_SCK,
    .ws_io_num    = MIC_WS,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num  = MIC_SD
  };
  if (i2s_driver_install(MIC_I2S_PORT, &cfg, 0, NULL) == ESP_OK &&
      i2s_set_pin(MIC_I2S_PORT, &pins) == ESP_OK) {
    micOK = true;
    Serial.println("[MIC] INMP441 ready");
  } else {
    Serial.println("[MIC] INMP441 FAILED");
  }
}

// ==============================================================================
//  INIT SPEAKER (MAX98357A I2S)
// ==============================================================================

void initSpeaker() {
  i2s_config_t cfg = {
    .mode                 = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate          = 22050,
    .bits_per_sample      = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format       = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags     = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count        = 8,
    .dma_buf_len          = 512,
    .use_apll             = false,
    .tx_desc_auto_clear   = true,
    .fixed_mclk           = 0
  };
  i2s_pin_config_t pins = {
    .bck_io_num   = SPK_BCLK,
    .ws_io_num    = SPK_LRC,
    .data_out_num = SPK_DIN,
    .data_in_num  = I2S_PIN_NO_CHANGE
  };
  if (i2s_driver_install(SPK_I2S_PORT, &cfg, 0, NULL) == ESP_OK &&
      i2s_set_pin(SPK_I2S_PORT, &pins) == ESP_OK) {
    speakerOK = true;
    Serial.println("[SPK] MAX98357A ready");
  } else {
    Serial.println("[SPK] MAX98357A FAILED");
  }
}

// ==============================================================================
//  WIFI
// ==============================================================================

void connectWiFi() {
  Serial.printf("[WIFI] Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(250);
    Serial.print('.');
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WIFI] Connected. IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WIFI] Timeout - will retry in loop");
  }
}

void ensureWiFi() {
  static uint32_t lastRetry = 0;
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - lastRetry < 10000) return;
  lastRetry = millis();
  Serial.println("[WIFI] Reconnecting...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

// ==============================================================================
//  SENSOR READS
// ==============================================================================

void readMAX30100() {
  pox.update();
  float hr   = pox.getHeartRate();
  float spo2 = pox.getSpO2();
  if (hr   > 30.0f  && hr   < 220.0f) currentHR   = hr;
  if (spo2 > 50.0f  && spo2 <= 100.0f) currentSpO2 = spo2;
}

void readMLX90614() {
  if (!mlxOK) return;
  float obj = mlx.readObjectTempC();
  if (!isnan(obj) && obj > 25.0f && obj < 42.0f) {
    currentTemp = obj;
    Serial.printf("[SENSOR] Temp: %.1f C\n", currentTemp);
  }
}

// ==============================================================================
//  OLED
// ==============================================================================

void updateOLED_Vitals() {
  if (!oledOK) return;
  oled.clearDisplay();
  oled.setTextSize(1);

  oled.setCursor(20, 0);
  oled.println("SMARTCARE+");
  oled.drawLine(0, 10, 127, 10, SSD1306_WHITE);

  oled.setCursor(0, 14);
  oled.print("HR  : ");
  if (currentHR > 0) { oled.print((int)currentHR); oled.println(" BPM"); }
  else oled.println("-- BPM");

  oled.setCursor(0, 26);
  oled.print("SpO2: ");
  if (currentSpO2 > 0) { oled.print((int)currentSpO2); oled.println("%"); }
  else oled.println("--%");

  oled.setCursor(0, 38);
  oled.print("Temp: ");
  if (currentTemp > 0) { oled.print(currentTemp, 1); oled.println(" C"); }
  else oled.println("-- C");

  oled.setCursor(0, 54);
  oled.print("WiFi: ");
  oled.println(WiFi.status() == WL_CONNECTED ? "OK" : "--");

  oled.display();
}

void updateOLED_State(const char* l1, const char* l2, const char* l3) {
  if (!oledOK) return;
  oled.clearDisplay();
  oled.setTextSize(1);
  oled.setCursor(20, 2);  oled.println(l1);
  oled.drawLine(0, 12, 127, 12, SSD1306_WHITE);
  oled.setCursor(0, 20);  oled.println(l2);
  if (l3 && strlen(l3) > 0) { oled.setCursor(0, 36); oled.println(l3); }
  oled.display();
}

// ==============================================================================
//  HTTP HELPERS
// ==============================================================================

String buildUrl(const char* path) {
  return String(BACKEND_BASE_URL) + path;
}

int httpPost(const char* url, const String& body, String& resp) {
  if (WiFi.status() != WL_CONNECTED) return -1;
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);
  http.setTimeout(8000);
  int code = http.POST(body);
  if (code > 0) resp = http.getString();
  else Serial.printf("[HTTP] Error: %s\n", http.errorToString(code).c_str());
  http.end();
  return code;
}

// ==============================================================================
//  TELEMETRY & HEARTBEAT
// ==============================================================================

void sendTelemetry() {
  if (WiFi.status() != WL_CONNECTED) return;

  Serial.printf("[SENSOR] HR: %.1f | SpO2: %.1f | Temp: %.1f\n",
                currentHR, currentSpO2, currentTemp);

  // Skip if no valid readings at all
  if (currentHR <= 0 && currentSpO2 <= 0 && currentTemp <= 0) {
    Serial.println("[API] No valid readings - skip telemetry");
    return;
  }

  StaticJsonDocument<256> doc;
  doc["deviceId"]    = DEVICE_ID;
  doc["patientId"]   = PATIENT_ID;
  doc["heartRate"]   = (currentHR   > 0) ? currentHR   : 0;
  doc["spo2"]        = (currentSpO2 > 0) ? currentSpO2 : 0;
  doc["temperature"] = (currentTemp > 0) ? currentTemp : 0;

  String payload, resp;
  serializeJson(doc, payload);

  String url = buildUrl("/api/iot/readings");
  int code = httpPost(url.c_str(), payload, resp);
  Serial.printf("[API] Telemetry HTTP %d\n", code);
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;
  StaticJsonDocument<128> doc;
  doc["deviceId"] = DEVICE_ID;
  String payload, resp;
  serializeJson(doc, payload);
  String url = buildUrl("/api/iot/heartbeat");
  int code = httpPost(url.c_str(), payload, resp);
  Serial.printf("[API] Heartbeat HTTP %d\n", code);
}

// ==============================================================================
//  SOS BUTTON
// ==============================================================================

void handleSOS() {
  if (digitalRead(SOS_BUTTON_PIN) != LOW) return;
  uint32_t now = millis();
  if (now - sosDebounceMs < SOS_DEBOUNCE_MS) return;
  sosDebounceMs = now;
  Serial.println("[SOS] Button pressed!");
  triggerSOSAlert();
}

void triggerSOSAlert() {
  beep(3, 200);
  updateOLED_State("SMARTCARE+", "!!! SOS !!!", "Nurse Notified");

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[SOS] WiFi offline - SOS cannot be sent");
    return;
  }

  StaticJsonDocument<256> doc;
  doc["deviceId"]    = DEVICE_ID;
  doc["patientId"]   = PATIENT_ID;
  doc["triggerType"] = "SOS_BUTTON";
  doc["description"] = "Physical bedside SOS button pressed by patient";

  String payload, resp;
  serializeJson(doc, payload);
  String url = buildUrl("/api/iot/sos");
  int code = httpPost(url.c_str(), payload, resp);
  Serial.printf("[SOS] Alert sent HTTP %d\n", code);
}

// ==============================================================================
//  VOICE PUSH-TO-TALK
// ==============================================================================

void handleVoicePTT() {
  if (!micOK || !audioBuffer) return;
  if (voiceState != VS_IDLE) return;
  if (digitalRead(PTT_BUTTON_PIN) != LOW) return;

  Serial.println("[VOICE] PTT pressed - listening...");
  voiceState = VS_LISTENING;
  updateOLED_State("SMARTCARE+", "> LISTENING...", "Speak now");

  audioCaptured = 0;
  memset(audioBuffer, 0, MAX_AUDIO_SAMPLES * sizeof(int16_t));

  uint32_t startMs = millis();
  while (digitalRead(PTT_BUTTON_PIN) == LOW && millis() - startMs < 5000) {
    int32_t raw32[MIC_BUFFER_SIZE];
    size_t bytesRead = 0;
    i2s_read(MIC_I2S_PORT, raw32, sizeof(raw32), &bytesRead, portMAX_DELAY);
    uint32_t samplesRead = bytesRead / sizeof(int32_t);
    for (uint32_t i = 0; i < samplesRead && audioCaptured < (uint32_t)MAX_AUDIO_SAMPLES; i++) {
      audioBuffer[audioCaptured++] = (int16_t)(raw32[i] >> 16);
    }
  }

  Serial.printf("[VOICE] Captured %u samples (%.1f s)\n",
                audioCaptured, (millis() - startMs) / 1000.0f);

  if (audioCaptured < 1000) {
    Serial.println("[VOICE] Too short - discarded");
    voiceState = VS_IDLE;
    return;
  }

  voiceState = VS_PROCESSING;
  updateOLED_State("SMARTCARE+", "AI PROCESSING...", "Please wait");

  /*
   * FUTURE: Implement real STT here.
   *   Option A: Upload raw PCM to backend /api/iot/stt endpoint
   *             Backend uses Whisper API and returns transcript text
   *   Option B: Use a lightweight on-device keyword/phrase recognizer
   *
   * For now: send a health-check transcript to demonstrate the full
   * backend pipeline (vitals retrieved from DB, AI responds with real data).
   */
  String transcript = "SmartCare check my current vitals";
  sendVoiceTranscript(transcript);
}

void sendVoiceTranscript(const String& transcript) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[VOICE] WiFi offline");
    voiceState = VS_IDLE;
    return;
  }

  Serial.printf("[VOICE] Sending transcript: %s\n", transcript.c_str());

  StaticJsonDocument<256> doc;
  doc["deviceId"]   = DEVICE_ID;
  doc["transcript"] = transcript;
  String payload, resp;
  serializeJson(doc, payload);

  String url = buildUrl("/api/iot/voice");
  int code = httpPost(url.c_str(), payload, resp);
  Serial.printf("[VOICE] AI query HTTP %d\n", code);

  if (code == 200) {
    StaticJsonDocument<512> respDoc;
    if (!deserializeJson(respDoc, resp) && respDoc["success"].as<bool>()) {
      const char* reply = respDoc["reply"];
      if (reply) {
        Serial.printf("[AI] Response: %s\n", reply);
        voiceState = VS_SPEAKING;
        updateOLED_State("SMARTCARE+", "> SPEAKING...", "Listen");
        playAudioCue();
        // TODO: stream TTS audio from backend and play through MAX98357A
      }
    }
  }

  voiceState = VS_IDLE;
  lastOledUpdateMs = 0; // Force OLED refresh
}

// ==============================================================================
//  AUDIO OUTPUT CUE (placeholder until backend TTS streaming is implemented)
// ==============================================================================

void playAudioCue() {
  if (!speakerOK) return;

  // Two-tone cue: 440 Hz then 880 Hz (300 ms each)
  const int SR = 22050;
  const int SAMPLES = (SR * 300) / 1000;
  int16_t* buf = (int16_t*)malloc(SAMPLES * sizeof(int16_t));
  if (!buf) return;

  size_t written = 0;

  for (int i = 0; i < SAMPLES; i++)
    buf[i] = (int16_t)(6000.0f * sinf(2.0f * PI * 440.0f * i / SR));
  i2s_write(SPK_I2S_PORT, buf, SAMPLES * sizeof(int16_t), &written, portMAX_DELAY);

  memset(buf, 0, SAMPLES * sizeof(int16_t));
  i2s_write(SPK_I2S_PORT, buf, SAMPLES * sizeof(int16_t), &written, portMAX_DELAY);

  for (int i = 0; i < SAMPLES; i++)
    buf[i] = (int16_t)(6000.0f * sinf(2.0f * PI * 880.0f * i / SR));
  i2s_write(SPK_I2S_PORT, buf, SAMPLES * sizeof(int16_t), &written, portMAX_DELAY);

  memset(buf, 0, SAMPLES * sizeof(int16_t));
  i2s_write(SPK_I2S_PORT, buf, SAMPLES * sizeof(int16_t), &written, portMAX_DELAY);

  free(buf);

  /*
   * TODO: Full TTS Audio Playback
   *
   * 1. Backend exposes: GET /api/iot/tts?text=<encoded_text>
   *    Returns: raw PCM (16-bit, 22050 Hz, mono)
   *    Uses: OpenAI TTS API (tts-1 model, alloy voice)
   *
   * 2. ESP32 streams audio chunks:
   *    HTTPClient http;
   *    http.begin(ttsUrl);
   *    http.addHeader("X-Device-Key", DEVICE_KEY);
   *    int code = http.GET();
   *    WiFiClient* stream = http.getStreamPtr();
   *    uint8_t chunk[512];
   *    while (http.connected()) {
   *      int len = stream->readBytes(chunk, sizeof(chunk));
   *      if (len > 0)
   *        i2s_write(SPK_I2S_PORT, chunk, len, &written, portMAX_DELAY);
   *    }
   *    http.end();
   */
}

// ==============================================================================
//  UTILITIES
// ==============================================================================

void beep(int n, int ms) {
  for (int i = 0; i < n; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(ms);
    digitalWrite(BUZZER_PIN, LOW);
    if (i < n - 1) delay(100);
  }
}
