/*
 * ================================================================
 *  SMARTCARE+  -  ESP32 Bedside IoT Firmware  v2.2 (MAX98357A Stereo Audio Fix)
 * ================================================================
 *
 *  Actual Connected Hardware Map:
 *   - ESP32 DevKit V1
 *   - MAX30100 Pulse Oximeter & HR (I2C: SDA=21, SCL=22, Address=0x57)
 *   - SSD1306  OLED 0.96" 128x64  (I2C: SDA=21, SCL=22, Address=0x3C)
 *   - DS18B20  Waterproof Temp    (1-Wire: DATA=GPIO4 with 4.7kΩ pull-up)
 *   - INMP441  I2S Microphone     (I2S0: SCK=14, WS=15, SD=32, L/R=GND)
 *   - MAX98357A I2S Audio Amp     (I2S1: BCLK=26, LRC=25, DIN=27)
 *   - 4Ω Speaker                  (Connected ONLY to MAX98357A SPK+ / SPK-)
 *   - Single Voice Push Button    (GPIO 18 -> Button -> GND, INPUT_PULLUP)
 *
 *  Hardware NOT Connected (Removed from logic):
 *   - NO SOS Button
 *   - NO External Status LED
 *   - NO Second Push Button
 *
 *  Backend Telemetry Endpoints:
 *   POST /api/iot/readings   - Send real vitals (or null when unmeasured)
 *   POST /api/iot/heartbeat  - Periodic device online status ping
 *   POST /api/iot/voice      - Process voice query via Backend AI
 *
 *  SECURITY: Server URL & Device Key used. OpenAI key lives ONLY on backend.
 * ================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "MAX30100_PulseOximeter.h"
#include <OneWire.h>
#include <DallasTemperature.h>
#include <driver/i2s.h>
#include <math.h>

// ==============================================================================
//  CONFIGURATION - Network & Device Identification
// ==============================================================================

const char* WIFI_SSID        = "vivo Y58 5G";
const char* WIFI_PASSWORD    = "ssk23.07";
const char* BACKEND_BASE_URL = "http://10.23.99.72:5000"; // Active PC IP on Hotspot
const char* DEVICE_ID        = "SC-ESP32-001";
const char* PATIENT_ID       = "PAT-1001";
const char* DEVICE_KEY       = "device_secret_PAT-1001";

// ==============================================================================
//  EXACT GPIO PIN MAP
// ==============================================================================

// Shared I2C Bus (MAX30100 + SSD1306 OLED)
#define I2C_SDA 21
#define I2C_SCL 22

// DS18B20 OneWire Data Pin
#define ONE_WIRE_BUS 4

// INMP441 I2S Microphone (I2S Port 0)
#define MIC_I2S_PORT  I2S_NUM_0
#define MIC_SCK       14
#define MIC_WS        15
#define MIC_SD        32

// MAX98357A I2S Audio Amplifier (I2S Port 1)
#define SPK_I2S_PORT  I2S_NUM_1
#define SPK_BCLK      26
#define SPK_LRC       25
#define SPK_DIN       27

// Single Voice Button (GPIO 18 -> Button -> GND)
#define VOICE_BUTTON_PIN 18

// Optional Buzzer (if attached on GPIO 13, else safe no-op)
#define BUZZER_PIN 13
#define HAS_BUZZER false

// ==============================================================================
//  OLED DISPLAY SETUP (SSD1306 128x64 0x3C)
// ==============================================================================

#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT  64
#define OLED_RESET     -1
#define OLED_ADDR    0x3C

Adafruit_SSD1306 oled(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
bool oledOK = false;

// ==============================================================================
//  SENSOR HARDWARE OBJECTS & STATE
// ==============================================================================

PulseOximeter     pox;
OneWire           oneWire(ONE_WIRE_BUS);
DallasTemperature ds18b20(&oneWire);

bool  poxOK          = false;
bool  ds18b20OK      = false;

// Shared I2C bus mutex and Core 0 task handle for MAX30100
SemaphoreHandle_t i2cMutex = NULL;
TaskHandle_t max30100TaskHandle = NULL;

float currentHR      = -1.0f;
float currentSpO2    = -1.0f;
float currentTemp    = -1.0f;
bool  fingerDetected = false;

uint32_t lastValidHRMs   = 0;
uint32_t lastValidSpO2Ms = 0;
uint32_t lastValidTempMs = 0;

// ==============================================================================
//  TIMING & PERIODIC INTERVALS
// ==============================================================================

uint32_t lastTelemetryMs  = 0;
uint32_t lastHeartbeatMs  = 0;
uint32_t lastOledUpdateMs = 0;

const uint32_t TELEMETRY_INTERVAL_MS = 5000;  // Send vitals every 5 sec
const uint32_t HEARTBEAT_INTERVAL_MS = 30000; // Device status heartbeat every 30 sec
const uint32_t OLED_REFRESH_MS       = 1000;  // Update OLED vitals display every 1 sec

// ==============================================================================
//  AUDIO / VOICE ASSISTANT STATE
// ==============================================================================

#define MIC_SAMPLE_RATE    16000
#define MIC_BUFFER_SIZE    512
#define MAX_AUDIO_SAMPLES  4096

bool     micOK         = false;
bool     speakerOK     = false;
int16_t* audioBuffer   = nullptr;
uint32_t audioCaptured = 0;

enum VoiceState { VS_IDLE, VS_LISTENING, VS_PROCESSING, VS_SPEAKING };
VoiceState voiceState = VS_IDLE;

// Button press state tracking
bool lastButtonState = HIGH;
volatile uint32_t beatCount = 0;

// Global Base64 Decoding Characters Lookup Table
static const char b64_chars[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// ==============================================================================
//  MAX30100 BEAT DETECTED CALLBACK
// ==============================================================================

void IRAM_ATTR onBeatDetected() {
  fingerDetected = true;
  beatCount++;
}

// ==============================================================================
//  I2C SCANNER HELPER
// ==============================================================================

void scanI2C() {
  Serial.println("[I2C SCANNER] Scanning shared I2C bus (SDA=21, SCL=22)...");
  byte count = 0;
  for (byte address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    byte error = Wire.endTransmission();
    if (error == 0) {
      Serial.printf("[I2C SCANNER] -> Device found at address 0x%02X (%s)\n",
                    address,
                    address == 0x3C ? "SSD1306 OLED" : (address == 0x57 ? "MAX30100 Pulse Oximeter" : "Unknown"));
      count++;
    }
  }
  if (count == 0) {
    Serial.println("[I2C SCANNER] CRITICAL: NO I2C devices found! Check SDA/SCL wiring.");
  } else {
    Serial.printf("[I2C SCANNER] Total %d device(s) found on I2C bus.\n", count);
  }
}

// ==============================================================================
//  FUNCTION DECLARATIONS
// ==============================================================================

void initDisplay();
void initSensors();
void initMicrophone();
void initSpeaker();
void speakerSelfTest();
void testSpeakerPCM();
void testSpeakerSpeech(const char* text = NULL);
void connectWiFi();
void ensureWiFi();
void readMAX30100();
void readDS18B20();
void updateOLED_Vitals();
void updateOLED_State(const char* l1, const char* l2, const char* l3);
void updateOLED_Response(const char* reply);
void sendTelemetry();
void sendHeartbeat();
void handleVoiceButton();
void processVoiceRequest();
void streamVoiceResponseAndPlay(const String& transcript);
void playAudioCue();
void playBase64Pcm(const char* base64Str);
void speakSentence(const char* text);
void speakDigit(int digit);
void playFormant(int f0, int f1, int f2, int durationMs);
void playTone(int freqHz, int durationMs);
void beep(int n, int ms);
String buildUrl(const char* path);
int   httpPost(const char* url, const String& body, String& resp, int timeoutMs = 2500);

// ==============================================================================
//  SETUP
// ==============================================================================

void setup() {
  Serial.begin(115200);
  Serial.println("\n[BOOT] SmartCare+ ESP32 IoT Node Starting...");

  // Configure single Voice Push Button on GPIO 18
  pinMode(VOICE_BUTTON_PIN, INPUT_PULLUP);

  if (HAS_BUZZER) {
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);
  }

  // Initialize thread mutex for shared I2C bus between cores
  i2cMutex = xSemaphoreCreateMutex();

  // Initialize shared I2C bus (SDA=21, SCL=22)
  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(400000); // Fast 400kHz I2C bus for MAX30100 & SSD1306 OLED

  // Scan I2C bus to verify physical sensor connectivity
  scanI2C();

  initDisplay();
  updateOLED_State("SMARTCARE+", "Booting System...", "v2.2 Stereo Fix");

  initSensors();
  initMicrophone();
  initSpeaker();

  // Mandatory Speaker Self-Test at boot
  speakerSelfTest();

  // Allocate audio memory buffer
  audioBuffer = (int16_t*)malloc(MAX_AUDIO_SAMPLES * sizeof(int16_t));
  if (!audioBuffer) {
    Serial.println("[MEM] Audio buffer allocation failed!");
    micOK = false;
  }

  updateOLED_State("SMARTCARE+", "Connecting WiFi...", WIFI_SSID);
  connectWiFi();

  Serial.println("[BOOT] SmartCare+ Initialization Complete.");
  beep(2, 80);
  updateOLED_Vitals();
}

// ==============================================================================
//  MAIN LOOP - NON-BLOCKING EXECUTOR
// ==============================================================================

void loop() {
  uint32_t now = millis();

  // Continuously update MAX30100 pulse oximeter without delay
  if (poxOK) {
    readMAX30100();
  }

  ensureWiFi();
  handleVoiceButton();

  // Serial Monitor Command Triggers
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd == "test" || cmd == "tone") {
      Serial.println("[SERIAL] Triggering 1 kHz Speaker Test Tone...");
      testSpeakerPCM();
    } else if (cmd == "speak" || cmd == "voice") {
      Serial.println("[SERIAL] Triggering Local Speech Test...");
      testSpeakerSpeech();
    } else if (voiceState == VS_IDLE) {
      Serial.printf("[SERIAL] Triggering AI Voice Query (Command: '%s')...\n", cmd.c_str());
      processVoiceRequest();
    }
  }

  // Telemetry loop (Every 5 seconds)
  if (now - lastTelemetryMs >= TELEMETRY_INTERVAL_MS) {
    readDS18B20();
    sendTelemetry();
    lastTelemetryMs = now;
  }

  // Heartbeat loop (Every 30 seconds)
  if (now - lastHeartbeatMs >= HEARTBEAT_INTERVAL_MS) {
    sendHeartbeat();
    lastHeartbeatMs = now;
  }

  // OLED refresh loop (Every 1 second when idle)
  if (now - lastOledUpdateMs >= OLED_REFRESH_MS && voiceState == VS_IDLE) {
    updateOLED_Vitals();
    lastOledUpdateMs = now;
  }
}

// ==============================================================================
//  DISPLAY CONTROLLER
// ==============================================================================

void initDisplay() {
  if (oled.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    oledOK = true;
    oled.clearDisplay();
    oled.setTextSize(1);
    oled.setTextColor(SSD1306_WHITE);
    oled.display();
    Serial.println("[I2C] SSD1306 OLED initialized at 0x3C");
  } else {
    Serial.println("[I2C] SSD1306 OLED not found!");
  }
}

void max30100Task(void* pvParameters) {
  for (;;) {
    if (poxOK) {
      if (i2cMutex && xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(15)) == pdTRUE) {
        pox.update();
        xSemaphoreGive(i2cMutex);
      } else if (!i2cMutex) {
        pox.update();
      }
    }
    vTaskDelay(pdMS_TO_TICKS(2)); // Continuous 2ms polling loop on Core 0
  }
}

void updateOLED_Vitals() {
  if (!oledOK) return;
  if (i2cMutex && xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(50)) != pdTRUE) return;

  oled.clearDisplay();
  oled.setTextSize(1);
  oled.setTextColor(SSD1306_WHITE);

  // Title Header
  oled.setCursor(20, 0);
  oled.println("SMARTCARE+");
  oled.drawLine(0, 10, 127, 10, SSD1306_WHITE);

  // Heart Rate Row
  oled.setCursor(0, 15);
  oled.print("HR  : ");
  if (currentHR > 30.0f && currentHR < 220.0f) {
    oled.print((int)currentHR);
    oled.println(" BPM");
  } else {
    oled.println("-- BPM");
  }

  // SpO2 Row
  oled.setCursor(0, 27);
  oled.print("SpO2: ");
  if (currentSpO2 > 50.0f && currentSpO2 <= 100.0f) {
    oled.print((int)currentSpO2);
    oled.println(" %");
  } else {
    oled.println("-- %");
  }

  // Temperature Row
  oled.setCursor(0, 39);
  oled.print("Temp: ");
  if (currentTemp > 20.0f && currentTemp < 45.0f) {
    oled.print(currentTemp, 1);
    oled.println(" C");
  } else {
    oled.println("-- C");
  }

  // Status Bar
  oled.setCursor(0, 54);
  oled.print("WiFi: ");
  oled.println(WiFi.status() == WL_CONNECTED ? "OK" : "--");

  oled.display();
  if (i2cMutex) xSemaphoreGive(i2cMutex);
}

void updateOLED_State(const char* l1, const char* l2, const char* l3) {
  if (!oledOK) return;
  if (i2cMutex && xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(50)) != pdTRUE) return;

  oled.clearDisplay();
  oled.setTextSize(1);
  oled.setTextColor(SSD1306_WHITE);

  oled.setCursor(20, 2);
  oled.println(l1);
  oled.drawLine(0, 12, 127, 12, SSD1306_WHITE);

  oled.setCursor(0, 22);
  oled.println(l2);

  if (l3 && strlen(l3) > 0) {
    oled.setCursor(0, 38);
    oled.println(l3);
  }

  oled.display();
  if (i2cMutex) xSemaphoreGive(i2cMutex);
}

void updateOLED_Response(const char* reply) {
  if (!oledOK || !reply) return;
  if (i2cMutex && xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(50)) != pdTRUE) return;

  oled.clearDisplay();
  oled.setTextSize(1);
  oled.setTextColor(SSD1306_WHITE);

  oled.setCursor(15, 0);
  oled.println("SMARTCARE+ AI");
  oled.drawLine(0, 10, 127, 10, SSD1306_WHITE);

  oled.setCursor(0, 14);
  oled.println(reply);

  oled.display();
  if (i2cMutex) xSemaphoreGive(i2cMutex);
}

// ==============================================================================
//  SENSOR INITIALIZATION & READING
// ==============================================================================

void initSensors() {
  if (pox.begin()) {
    poxOK = true;
    pox.setOnBeatDetectedCallback(onBeatDetected);
    pox.setIRLedCurrent(MAX30100_LED_CURR_50MA);
    Serial.println("[I2C] MAX30100 Pulse Oximeter initialized at 0x57 (50mA LED)");

    // Spawn dedicated FreeRTOS background sampling task on Core 0
    xTaskCreatePinnedToCore(
      max30100Task,
      "MAX30100_Task",
      4096,
      NULL,
      2,
      &max30100TaskHandle,
      0 // Pin task to Core 0
    );
  } else {
    Serial.println("[I2C] MAX30100 initialization FAILED!");
  }

  ds18b20.begin();
  if (ds18b20.getDeviceCount() > 0) {
    ds18b20OK = true;
    ds18b20.setWaitForConversion(false); // NON-BLOCKING mode prevents MAX30100 sample starvation!
    ds18b20.requestTemperatures();       // Initial conversion request
    Serial.printf("[1-WIRE] DS18B20 Temperature Sensor detected on GPIO %d (Non-blocking mode)\n", ONE_WIRE_BUS);
  } else {
    Serial.printf("[1-WIRE] No DS18B20 found on GPIO %d\n", ONE_WIRE_BUS);
  }
}

void readMAX30100() {
  if (!poxOK) return;

  float hr   = pox.getHeartRate();
  float spo2 = pox.getSpO2();
  uint32_t now = millis();

  static uint32_t lastBeatSeenMs = 0;
  if (fingerDetected) {
    lastBeatSeenMs = now;
    fingerDetected = false;
  }
  bool recentBeat = (now - lastBeatSeenMs < 3000);

  static uint32_t lastDebugMs = 0;
  if (now - lastDebugMs > 2000) {
    lastDebugMs = now;
    Serial.printf("[MAX30100 DEBUG] Pulse Beat Active: %s | Raw HR: %.1f BPM | Raw SpO2: %.1f %%\n",
                  recentBeat ? "YES" : "NO", hr, spo2);
  }

  // Accept valid pulse readings (HR between 30 and 220, SpO2 between 50 and 100)
  if (hr >= 30.0f && hr <= 220.0f) {
    currentHR = hr;
    lastValidHRMs = now;
  } else if (now - lastValidHRMs > 10000) {
    currentHR = -1.0f;
  }

  if (spo2 >= 50.0f && spo2 <= 100.0f) {
    currentSpO2 = spo2;
    lastValidSpO2Ms = now;
  } else if (now - lastValidSpO2Ms > 10000) {
    currentSpO2 = -1.0f;
  }
}

void readDS18B20() {
  if (!ds18b20OK) return;
  // Read temperature from previous non-blocking request
  float tempC = ds18b20.getTempCByIndex(0);
  uint32_t now = millis();

  if (tempC != DEVICE_DISCONNECTED_C && !isnan(tempC) && tempC >= 15.0f && tempC <= 45.0f) {
    currentTemp = tempC;
    lastValidTempMs = now;
    Serial.printf("[SENSOR] DS18B20 Temp: %.1f C\n", currentTemp);
  } else if (now - lastValidTempMs > 10000) {
    currentTemp = -1.0f;
  }

  // Request next conversion asynchronously (returns immediately without blocking!)
  ds18b20.requestTemperatures();
}

// ==============================================================================
//  INMP441 I2S MICROPHONE SETUP
// ==============================================================================

void initMicrophone() {
  i2s_driver_uninstall(MIC_I2S_PORT);

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
    .mck_io_num   = I2S_PIN_NO_CHANGE,
    .bck_io_num   = MIC_SCK,
    .ws_io_num    = MIC_WS,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num  = MIC_SD
  };

  if (i2s_driver_install(MIC_I2S_PORT, &cfg, 0, NULL) == ESP_OK &&
      i2s_set_pin(MIC_I2S_PORT, &pins) == ESP_OK) {
    micOK = true;
    Serial.println("[MIC] INMP441 I2S Microphone ready.");
  } else {
    micOK = false;
    Serial.println("[MIC] INMP441 Microphone init FAILED!");
  }
}

void stopMicrophone() {
  if (micOK) {
    i2s_driver_uninstall(MIC_I2S_PORT);
    micOK = false;
    Serial.println("[MIC] INMP441 Microphone uninstalled to free I2S hardware root clock.");
  }
}

// ==============================================================================
//  MAX98357A I2S AUDIO AMPLIFIER SETUP & SELF-TEST
// ==============================================================================

void initSpeaker() {
  i2s_driver_uninstall(SPK_I2S_PORT);

  i2s_config_t cfg = {
    .mode                 = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate          = 8000,
    .bits_per_sample      = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format       = I2S_CHANNEL_FMT_RIGHT_LEFT, // Known-good stereo I2S configuration
#ifdef I2S_COMM_FORMAT_STAND_I2S
    .communication_format = (i2s_comm_format_t)(I2S_COMM_FORMAT_STAND_I2S),
#else
    .communication_format = (i2s_comm_format_t)(I2S_COMM_FORMAT_I2S),
#endif
    .intr_alloc_flags     = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count        = 8,
    .dma_buf_len          = 512,
    .use_apll             = false,
    .tx_desc_auto_clear   = true,
    .fixed_mclk           = 0
  };

  i2s_pin_config_t pins = {
    .mck_io_num   = I2S_PIN_NO_CHANGE,
    .bck_io_num   = SPK_BCLK,
    .ws_io_num    = SPK_LRC,
    .data_out_num = SPK_DIN,
    .data_in_num  = I2S_PIN_NO_CHANGE
  };

  esp_err_t err1 = i2s_driver_install(SPK_I2S_PORT, &cfg, 0, NULL);
  esp_err_t err2 = i2s_set_pin(SPK_I2S_PORT, &pins);
  esp_err_t err3 = i2s_start(SPK_I2S_PORT);

  if (err1 == ESP_OK && err2 == ESP_OK && err3 == ESP_OK) {
    speakerOK = true;
    Serial.println("[SPK] MAX98357A I2S Audio Amplifier READY.");
  } else {
    speakerOK = false;
    Serial.printf("[SPK ERROR] MAX98357A initialization failed! err1=%d, err2=%d, err3=%d\n", err1, err2, err3);
  }
}

void startSpeakerPlayback() {
  stopMicrophone(); // Completely stop & uninstall mic I2S0 to avoid root clock conflict!

  if (!speakerOK) {
    initSpeaker();
  } else {
    i2s_start(SPK_I2S_PORT);
    i2s_zero_dma_buffer(SPK_I2S_PORT);
  }
}

void speakerSelfTest() {
  Serial.println("[SPK TEST] START");
  if (!speakerOK) {
    Serial.println("[SPK ERROR] MAX98357A initialization failed");
    return;
  }
  Serial.println("[SPK TEST] I2S initialized");
  Serial.println("[SPK TEST] Writing stereo tone");
  playTone(1000, 1000);
  Serial.println("[SPK TEST] Tone complete");
  Serial.println("[SPK TEST] TX drained");
}

void drainI2SSpeaker() {
  // Allow DMA ring buffer (8 * 512 bytes = 256ms of 8000Hz 16-bit stereo audio) to finish physical output
  delay(300);
}

void testSpeakerPCM() {
  Serial.println("[SPK TEST] Running testSpeakerPCM()...");
  playTone(1000, 1000);
}

void testSpeakerSpeech(const char* text) {
  Serial.println("[SPK TEST] Running testSpeakerSpeech()...");
  if (text) {
    speakSentence(text);
  } else if (currentHR > 30.0f && currentHR < 220.0f) {
    char buf[128];
    snprintf(buf, sizeof(buf), "Your current heart rate is %d beats per minute.", (int)currentHR);
    speakSentence(buf);
  } else {
    char buf[128];
    if (currentTemp > 20.0f && currentTemp < 45.0f) {
      snprintf(buf, sizeof(buf), "Heart rate is currently unavailable. Your temperature is %.1f degrees Celsius.", currentTemp);
    } else {
      snprintf(buf, sizeof(buf), "Heart rate is currently unavailable. Bedside vitals active.");
    }
    speakSentence(buf);
  }
}

// ==============================================================================
//  WIFI MANAGEMENT
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
    Serial.printf("\n[WIFI] Connected! Assigned IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WIFI] Timeout! Will retry in background loop.");
  }
}

void ensureWiFi() {
  static uint32_t lastRetry = 0;
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - lastRetry < 10000) return;
  lastRetry = millis();
  Serial.println("[WIFI] Connection lost. Reconnecting...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

// ==============================================================================
//  HTTP UTILITIES
// ==============================================================================

String buildUrl(const char* path) {
  return String(BACKEND_BASE_URL) + path;
}

// ==============================================================================
//  STREAMING HTTP VOICE QUERY & PCM PLAYBACK ENGINE
// ==============================================================================

void streamVoiceResponseAndPlay(const String& transcript) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[VOICE] WiFi offline - cannot send voice query");
    updateOLED_State("SMARTCARE+", "VOICE ERROR", "WiFi Offline");
    delay(2000);
    voiceState = VS_IDLE;
    return;
  }

  Serial.printf("[MEM] Heap before: %u bytes\n", (unsigned int)ESP.getFreeHeap());
  Serial.printf("[VOICE] Sending AI query: %s\n", transcript.c_str());

  StaticJsonDocument<256> doc;
  doc["deviceId"]   = DEVICE_ID;
  doc["transcript"] = transcript;
  String payload;
  serializeJson(doc, payload);

  String url = buildUrl("/api/iot/voice");
  HTTPClient http;
  http.begin(url.c_str());
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);
  http.setTimeout(15000);

  int code = http.POST(payload);
  Serial.printf("[HTTP DEBUG] HTTP code: %d\n", code);

  if (code != 200) {
    Serial.printf("[HTTP ERROR] POST failed with code %d\n", code);
    http.end();
    voiceState = VS_IDLE;
    return;
  }

  int contentLength = http.getSize();
  Serial.printf("[HTTP DEBUG] Expected response size: %d bytes\n", contentLength);

  WiFiClient* stream = http.getStreamPtr();
  if (!stream) {
    Serial.println("[HTTP DEBUG] ERROR: Stream unavailable");
    http.end();
    voiceState = VS_IDLE;
    return;
  }

  // Streaming State Machine
  enum ParserState { STATE_SEARCH_REPLY, STATE_READ_REPLY, STATE_SEARCH_AUDIO_B64, STATE_STREAM_AUDIO_B64, STATE_DONE };
  ParserState pState = STATE_SEARCH_REPLY;

  String replyText = "";
  String window = "";

  // Incremental Base64 / I2S Decoder state
  uint32_t b64_val = 0;
  int b64_valb = -8;
  bool hasLowByte = false;
  uint8_t lowByte = 0;

  size_t base64CharCount = 0;
  size_t decodedByteCount = 0;
  size_t pcmSampleCount = 0;

  int16_t pcmMin = 32767;
  int16_t pcmMax = -32768;
  uint64_t pcmAbsSum = 0;
  size_t nonZeroSamples = 0;

  size_t totalI2SRequestedBytes = 0;
  size_t totalI2SWrittenBytes = 0;

  const size_t CHUNK_MONO_SAMPLES = 256;
  int16_t stereoBuffer[CHUNK_MONO_SAMPLES * 2];
  size_t stereoIndex = 0;

  size_t totalBytesReceived = 0;
  uint32_t lastDataMs = millis();

  while (http.connected() && pState != STATE_DONE && (contentLength < 0 || totalBytesReceived < (size_t)contentLength)) {
    size_t availableBytes = stream->available();

    if (availableBytes > 0) {
      char chunk[512];
      size_t toRead = (availableBytes > sizeof(chunk)) ? sizeof(chunk) : availableBytes;
      int bytesRead = stream->readBytes((uint8_t*)chunk, toRead);

      if (bytesRead > 0) {
        totalBytesReceived += bytesRead;
        lastDataMs = millis();

        for (int i = 0; i < bytesRead && pState != STATE_DONE; i++) {
          char c = chunk[i];

          switch (pState) {
            case STATE_SEARCH_REPLY: {
              window += c;
              if (window.length() > 30) window = window.substring(window.length() - 30);
              if (window.indexOf("\"reply\":\"") != -1) {
                pState = STATE_READ_REPLY;
                replyText = "";
                window = "";
              }
              break;
            }

            case STATE_READ_REPLY: {
              if (c == '"') {
                pState = STATE_SEARCH_AUDIO_B64;
                window = "";
                Serial.printf("[HTTP DEBUG] reply field extracted: %s\n", replyText.c_str());
                Serial.printf("[AI REPLY] %s\n", replyText.c_str());
                voiceState = VS_SPEAKING;
                updateOLED_Response(replyText.c_str());
              } else if (c != '\\') { // Skip escape backslashes
                replyText += c;
              }
              break;
            }

            case STATE_SEARCH_AUDIO_B64: {
              window += c;
              if (window.length() > 30) window = window.substring(window.length() - 30);
              if (window.indexOf("\"audioBase64\":\"") != -1) {
                pState = STATE_STREAM_AUDIO_B64;
                window = "";
                Serial.println("[HTTP DEBUG] audioBase64 field found: YES");
                Serial.println("[TTS] Starting speech playback...");
                Serial.println("\n[PCM]");
                Serial.println("Format: S16LE");
                Serial.println("Rate: 8000 Hz");
                Serial.println("Source: MONO");
                Serial.println("Output: STEREO");
                startSpeakerPlayback();
                Serial.println("Playback started...");
              }
              break;
            }

            case STATE_STREAM_AUDIO_B64: {
              if (c == '"') {
                // End of audioBase64 string
                if (stereoIndex > 0) {
                  size_t req = stereoIndex * sizeof(int16_t);
                  size_t written = 0;
                  i2s_write(SPK_I2S_PORT, stereoBuffer, req, &written, portMAX_DELAY);
                  totalI2SRequestedBytes += req;
                  totalI2SWrittenBytes += written;
                  stereoIndex = 0;
                }
                drainI2SSpeaker();
                Serial.println("\n[I2S]");
                Serial.println("TX drain complete");
                Serial.println("Playback finished.");
                Serial.println("[TTS] Finished speech playback...");
                pState = STATE_DONE;
              } else if (c != '=') {
                const char* p = strchr(b64_chars, c);
                if (p) {
                  base64CharCount++;
                  b64_val = (b64_val << 6) | (p - b64_chars);
                  b64_valb += 6;

                  if (b64_valb >= 0) {
                    uint8_t byteVal = (uint8_t)((b64_val >> b64_valb) & 0xFF);
                    b64_valb -= 8;
                    decodedByteCount++;

                    if (!hasLowByte) {
                      lowByte = byteVal;
                      hasLowByte = true;
                    } else {
                      uint8_t highByte = byteVal;
                      hasLowByte = false;

                      int16_t sample = (int16_t)((uint16_t)lowByte | ((uint16_t)highByte << 8));
                      pcmSampleCount++;

                      if (sample < pcmMin) pcmMin = sample;
                      if (sample > pcmMax) pcmMax = sample;

                      pcmAbsSum += abs((int32_t)sample);

                      if (sample != 0) {
                        nonZeroSamples++;
                      }

                      if (pcmSampleCount <= 10) {
                        Serial.printf("[PCM SAMPLE DEBUG] Sample %u: %d\n", (unsigned int)(pcmSampleCount - 1), sample);
                      }

                      // Duplicate mono 16-bit PCM sample to Left and Right channels for 8000Hz stereo I2S output
                      stereoBuffer[stereoIndex++] = sample; // LEFT
                      stereoBuffer[stereoIndex++] = sample; // RIGHT

                      if (stereoIndex >= CHUNK_MONO_SAMPLES * 2) {
                        size_t req = CHUNK_MONO_SAMPLES * 2 * sizeof(int16_t);
                        size_t written = 0;
                        i2s_write(SPK_I2S_PORT, stereoBuffer, req, &written, portMAX_DELAY);
                        totalI2SRequestedBytes += req;
                        totalI2SWrittenBytes += written;
                        stereoIndex = 0;
                      }
                    }
                  }
                }
              }
              break;
            }

            case STATE_DONE:
              break;
          }
        }
      }
    } else {
      if (millis() - lastDataMs > 15000) {
        Serial.println("[HTTP DEBUG] ERROR: Streaming timeout");
        break;
      }
      delay(2);
    }
  }

  http.end();

  Serial.printf("[HTTP DEBUG] Bytes received: %u / %d\n", (unsigned int)totalBytesReceived, contentLength);
  Serial.printf("[MEM] Heap after: %u bytes\n", (unsigned int)ESP.getFreeHeap());

  if (pState == STATE_DONE || base64CharCount > 0) {
    float avgAmplitude = 0.0f;
    if (pcmSampleCount > 0) {
      avgAmplitude = (float)pcmAbsSum / (float)pcmSampleCount;
    }

    Serial.println("\n[PCM]");
    Serial.printf("Samples decoded: %u\n", (unsigned int)pcmSampleCount);
    Serial.printf("Min: %d\n", pcmMin);
    Serial.printf("Max: %d\n", pcmMax);
    Serial.printf("Average amplitude: %.2f\n", avgAmplitude);
    Serial.printf("Non-zero samples: %u / %u\n", (unsigned int)nonZeroSamples, (unsigned int)pcmSampleCount);

    Serial.println("\n[I2S]");
    Serial.printf("Requested bytes: %u\n", (unsigned int)totalI2SRequestedBytes);
    Serial.printf("Written bytes: %u\n", (unsigned int)totalI2SWrittenBytes);
    if (totalI2SRequestedBytes != totalI2SWrittenBytes) {
      Serial.printf("[I2S ERROR] Mismatch! Requested %u but wrote %u\n", (unsigned int)totalI2SRequestedBytes, (unsigned int)totalI2SWrittenBytes);
    }
  } else {
    Serial.println("ERROR: No audioBase64 received from backend.");
  }

  // Automatic Local Sensor Fallback if replyText or TTS failed
  if (base64CharCount == 0 || pcmSampleCount == 0) {
    Serial.println("[TTS FALLBACK] Backend TTS unavailable - executing local speech fallback...");
    if (replyText.length() == 0) {
      if (currentHR > 30.0f && currentHR < 220.0f) {
        char buf[128];
        snprintf(buf, sizeof(buf), "Your current heart rate is %d beats per minute.", (int)currentHR);
        replyText = String(buf);
      } else {
        char buf[128];
        if (currentTemp > 20.0f && currentTemp < 45.0f) {
          snprintf(buf, sizeof(buf), "Heart rate is currently unavailable. Your temperature is %.1f degrees Celsius.", currentTemp);
        } else {
          snprintf(buf, sizeof(buf), "Heart rate is currently unavailable.");
        }
        replyText = String(buf);
      }
    }
    Serial.printf("[VOICE] Using Local Speech Fallback Reply: %s\n", replyText.c_str());
    updateOLED_Response(replyText.c_str());
    speakSentence(replyText.c_str());
  }

  delay(3000); // Keep AI response displayed on OLED screen
  voiceState = VS_IDLE;
  lastOledUpdateMs = 0; // Force immediate OLED vitals refresh
}

// Helper httpPost for lightweight JSON requests (telemetry/heartbeat)
int httpPost(const char* url, const String& body, String& resp, int timeoutMs) {
  if (WiFi.status() != WL_CONNECTED) return -1;
  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);
  http.setTimeout(timeoutMs);
  int code = http.POST(body);
  if (code > 0) {
    resp = http.getString();
  }
  http.end();
  return code;
}

// ==============================================================================
//  TELEMETRY & HEARTBEAT TRANSMISSION
// ==============================================================================

void sendTelemetry() {
  if (WiFi.status() != WL_CONNECTED) return;

  StaticJsonDocument<256> doc;
  doc["deviceId"]  = DEVICE_ID;
  doc["patientId"] = PATIENT_ID;

  if (currentHR > 30.0f && currentHR < 220.0f) {
    doc["heartRate"] = currentHR;
  } else {
    doc["heartRate"] = nullptr;
  }

  if (currentSpO2 > 50.0f && currentSpO2 <= 100.0f) {
    doc["spo2"] = currentSpO2;
  } else {
    doc["spo2"] = nullptr;
  }

  if (currentTemp > 20.0f && currentTemp < 45.0f) {
    doc["temperature"] = currentTemp;
  } else {
    doc["temperature"] = nullptr;
  }

  String payload, resp;
  serializeJson(doc, payload);

  String url = buildUrl("/api/iot/readings");
  int code = httpPost(url.c_str(), payload, resp);
  Serial.printf("[API] Telemetry Sent: %s | HTTP %d\n", payload.c_str(), code);
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;
  StaticJsonDocument<128> doc;
  doc["deviceId"] = DEVICE_ID;
  String payload, resp;
  serializeJson(doc, payload);

  String url = buildUrl("/api/iot/heartbeat");
  int code = httpPost(url.c_str(), payload, resp);
  Serial.printf("[API] Heartbeat Sent HTTP %d\n", code);
}

// ==============================================================================
//  SINGLE VOICE BUTTON & PUSH-TO-TALK CONTROLLER
// ==============================================================================

void handleVoiceButton() {
  bool currentButtonState = digitalRead(VOICE_BUTTON_PIN);

  if (lastButtonState == HIGH && currentButtonState == LOW) {
    if (voiceState == VS_IDLE) {
      Serial.println("[VOICE] Button pressed - Listening...");
      voiceState = VS_LISTENING;
      updateOLED_State("SMARTCARE+", "LISTENING...", "Speak now");
      audioCaptured = 0;

      // Re-initialize INMP441 Microphone I2S0 for audio capture
      if (!micOK) {
        initMicrophone();
      }

      if (audioBuffer) {
        memset(audioBuffer, 0, MAX_AUDIO_SAMPLES * sizeof(int16_t));
      }
    }
  }

  if (voiceState == VS_LISTENING && currentButtonState == LOW) {
    if (micOK && audioBuffer && audioCaptured < MAX_AUDIO_SAMPLES) {
      int32_t raw32[MIC_BUFFER_SIZE];
      size_t bytesRead = 0;
      i2s_read(MIC_I2S_PORT, raw32, sizeof(raw32), &bytesRead, 10);
      uint32_t samplesRead = bytesRead / sizeof(int32_t);
      for (uint32_t i = 0; i < samplesRead && audioCaptured < MAX_AUDIO_SAMPLES; i++) {
        audioBuffer[audioCaptured++] = (int16_t)(raw32[i] >> 16);
      }
    }
  }

  if (lastButtonState == LOW && currentButtonState == HIGH) {
    if (voiceState == VS_LISTENING) {
      Serial.printf("[VOICE] Button released! Captured %u audio samples.\n", audioCaptured);
      processVoiceRequest();
    }
  }

  lastButtonState = currentButtonState;
}

void processVoiceRequest() {
  voiceState = VS_PROCESSING;
  updateOLED_State("SMARTCARE+", "AI PROCESSING...", "Please wait");

  // Uninstall INMP441 Microphone I2S0 driver so ESP32 I2S hardware root clock is 100% free for MAX98357A speaker!
  stopMicrophone();

  String transcript = "What is my heart rate and vitals?";
  streamVoiceResponseAndPlay(transcript);
}

// ==============================================================================
//  MAX98357A SPEAKER AUDIO CUE, TTS VOICE & TONES
// ==============================================================================

void playBase64Pcm(const char* base64Str) {
  if (!speakerOK) {
    Serial.println("[SPK WARNING] playBase64Pcm skipped: speakerOK is FALSE!");
    return;
  }
  if (!base64Str || strlen(base64Str) == 0) {
    Serial.println("ERROR: No audioBase64 received from backend.");
    return;
  }

  size_t base64Len = strlen(base64Str);

  // First pass: calculate total decoded byte count
  size_t decodedByteCount = 0;
  {
    uint32_t val = 0;
    int valb = -8;
    for (size_t i = 0; i < base64Len; i++) {
      char c = base64Str[i];
      if (c == '=') break;
      const char* p = strchr(b64_chars, c);
      if (!p) continue;
      val = (val << 6) | (p - b64_chars);
      valb += 6;
      if (valb >= 0) {
        decodedByteCount++;
        valb -= 8;
      }
    }
  }

  if (decodedByteCount == 0) {
    Serial.println("ERROR: No audioBase64 received from backend.");
    return;
  }

  if (decodedByteCount % 2 != 0) {
    decodedByteCount &= ~1;
  }

  size_t pcmSamples = decodedByteCount / 2;

  Serial.println("\n[PCM]");
  Serial.printf("Base64 length: %u\n", (unsigned int)base64Len);
  Serial.printf("Decoded bytes: %u\n", (unsigned int)decodedByteCount);
  Serial.println("Format: S16LE");
  Serial.println("Rate: 8000");
  Serial.println("Source: MONO");
  Serial.println("Output: STEREO");
  Serial.printf("Number of PCM samples: %u\n", (unsigned int)pcmSamples);
  Serial.println("Playback started...");

  startSpeakerPlayback();

  const size_t CHUNK_MONO_SAMPLES = 256;
  int16_t stereoBuffer[CHUNK_MONO_SAMPLES * 4];
  size_t stereoIndex = 0;

  uint32_t val = 0;
  int valb = -8;

  bool hasLowByte = false;
  uint8_t lowByte = 0;

  for (size_t i = 0; i < base64Len; i++) {
    char c = base64Str[i];
    if (c == '=') break;

    const char* p = strchr(b64_chars, c);
    if (!p) continue;

    val = (val << 6) | (p - b64_chars);
    valb += 6;

    if (valb >= 0) {
      uint8_t byteVal = (uint8_t)((val >> valb) & 0xFF);
      valb -= 8;

      if (!hasLowByte) {
        lowByte = byteVal;
        hasLowByte = true;
      } else {
        uint8_t highByte = byteVal;
        hasLowByte = false;

        int16_t sample = (int16_t)((uint16_t)lowByte | ((uint16_t)highByte << 8));

        stereoBuffer[stereoIndex++] = sample;
        stereoBuffer[stereoIndex++] = sample;
        stereoBuffer[stereoIndex++] = sample;
        stereoBuffer[stereoIndex++] = sample;

        if (stereoIndex >= CHUNK_MONO_SAMPLES * 4) {
          size_t written = 0;
          i2s_write(SPK_I2S_PORT, stereoBuffer, stereoIndex * sizeof(int16_t), &written, portMAX_DELAY);
          stereoIndex = 0;
        }
      }
    }
  }

  if (stereoIndex > 0) {
    size_t written = 0;
    i2s_write(SPK_I2S_PORT, stereoBuffer, stereoIndex * sizeof(int16_t), &written, portMAX_DELAY);
    stereoIndex = 0;
  }

  drainI2SSpeaker();
  Serial.println("\n[I2S]");
  Serial.println("TX drain complete");
  Serial.println("Playback finished.");
}

void playFormant(int f0, int f1, int f2, int durationMs) {
  startSpeakerPlayback();

  const int SR = 16000;
  int totalSamples = (SR * durationMs) / 1000;
  int16_t* buf = (int16_t*)malloc(1024 * sizeof(int16_t));
  if (!buf) return;

  size_t written = 0;
  int sampleIndex = 0;
  int attackSamples = (SR * 20) / 1000;
  int decaySamples  = (SR * 30) / 1000;

  while (sampleIndex < totalSamples) {
    int chunkSize = (totalSamples - sampleIndex > 256) ? 256 : (totalSamples - sampleIndex);
    for (int i = 0; i < chunkSize; i++) {
      int pos = sampleIndex + i;
      float envelope = 1.0f;
      if (pos < attackSamples) {
        envelope = (float)pos / (float)attackSamples;
      } else if (totalSamples - pos < decaySamples) {
        envelope = (float)(totalSamples - pos) / (float)decaySamples;
      }

      float pulse = sinf(2.0f * M_PI * f0 * pos / SR);
      float v1    = sinf(2.0f * M_PI * f1 * pos / SR);
      float v2    = sinf(2.0f * M_PI * f2 * pos / SR);

      float mix = 0.45f * pulse + 0.35f * v1 + 0.20f * v2;
      int16_t val = (int16_t)(4500.0f * envelope * mix);

      buf[2 * i]     = val;
      buf[2 * i + 1] = val;
    }
    i2s_write(SPK_I2S_PORT, buf, chunkSize * 2 * sizeof(int16_t), &written, portMAX_DELAY);
    sampleIndex += chunkSize;
  }

  free(buf);
  drainI2SSpeaker();
}

void speakDigit(int digit) {
  switch (digit) {
    case 0: playFormant(130, 300, 870, 180); break;
    case 1: playFormant(130, 570, 840, 180); break;
    case 2: playFormant(130, 300, 870, 180); break;
    case 3: playFormant(140, 270, 2290, 180); break;
    case 4: playFormant(130, 570, 840, 180); break;
    case 5: playFormant(130, 730, 1090, 110); playFormant(140, 270, 2290, 110); break;
    case 6: playFormant(150, 270, 2290, 180); break;
    case 7: playFormant(130, 530, 1840, 180); break;
    case 8: playFormant(130, 530, 1840, 180); break;
    case 9: playFormant(130, 730, 1090, 110); playFormant(140, 270, 2290, 110); break;
    default: playFormant(140, 500, 1200, 150); break;
  }
  delay(35);
}

void speakSentence(const char* text) {
  if (!speakerOK) {
    Serial.println("[SPK WARNING] speakSentence skipped: speakerOK is FALSE!");
    return;
  }
  if (!text) return;

  int len = strlen(text);
  int i = 0;

  while (i < len) {
    char c = text[i];

    if (c >= '0' && c <= '9') {
      speakDigit(c - '0');
      i++;
    } else if (c == ' ' || c == '.' || c == ',' || c == '!') {
      delay(80);
      i++;
    } else {
      int wordLen = 0;
      uint32_t wordHash = 0;
      while (i < len && text[i] != ' ' && text[i] != '.' && text[i] != ',' && !(text[i] >= '0' && text[i] <= '9')) {
        wordHash = wordHash * 31 + text[i];
        wordLen++;
        i++;
      }

      if (wordLen > 0) {
        int f0 = 135 + (wordHash % 15);
        int f1 = 400 + (wordHash % 300);
        int f2 = 1100 + (wordHash % 800);
        int duration = 140 + (wordLen * 18);
        if (duration > 260) duration = 260;

        playFormant(f0, f1, f2, duration);
        delay(40);
      }
    }
  }
}

void playAudioCue() {
  if (!speakerOK) return;
  playTone(523, 140); // C5
  delay(30);
  playTone(659, 140); // E5
  delay(30);
  playTone(784, 220); // G5
}

void playTone(int freqHz, int durationMs) {
  startSpeakerPlayback();

  const int SR = 16000;
  int totalSamples = (SR * durationMs) / 1000;
  int16_t* buf = (int16_t*)malloc(1024 * sizeof(int16_t));
  if (!buf) return;

  size_t written = 0;
  int sampleIndex = 0;

  int attackSamples = (SR * 15) / 1000;
  int decaySamples  = (SR * 25) / 1000;

  while (sampleIndex < totalSamples) {
    int chunkSize = (totalSamples - sampleIndex > 256) ? 256 : (totalSamples - sampleIndex);
    for (int i = 0; i < chunkSize; i++) {
      int pos = sampleIndex + i;
      float envelope = 1.0f;

      if (pos < attackSamples) {
        envelope = (float)pos / (float)attackSamples;
      } else if (totalSamples - pos < decaySamples) {
        envelope = (float)(totalSamples - pos) / (float)decaySamples;
      }

      int16_t val = (int16_t)(5500.0f * envelope * sinf(2.0f * M_PI * freqHz * pos / SR));
      buf[2 * i]     = val; // Left channel
      buf[2 * i + 1] = val; // Right channel
    }
    i2s_write(SPK_I2S_PORT, buf, chunkSize * 2 * sizeof(int16_t), &written, portMAX_DELAY);
    sampleIndex += chunkSize;
  }

  free(buf);
  drainI2SSpeaker();
}

void beep(int n, int ms) {
  if (HAS_BUZZER) {
    for (int i = 0; i < n; i++) {
      digitalWrite(BUZZER_PIN, HIGH);
      delay(ms);
      digitalWrite(BUZZER_PIN, LOW);
      if (i < n - 1) delay(80);
    }
  } else {
    playTone(800, ms);
  }
}
