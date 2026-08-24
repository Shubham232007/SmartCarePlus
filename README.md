# SMARTCARE+ 🏥
**An Intelligent IoT-Based Smart Bedside Assistant with AI Voice Interaction for Continuous Patient Monitoring**

---

## 🌟 Overview

**SmartCare+** is an end-to-end, production-style IoT & AI healthcare platform. It provides continuous patient vital sign tracking, automated software alert threshold evaluation, medicine schedule adherence logging, emergency SOS triggers, and intelligent AI voice interactions for bedside hospital care.

---

## 🏗 System Architecture

```
[ ESP32 Bedside Prototype ] (MAX30100, DS18B20, SOS Button, I2S Audio)
           │
           │ HTTP POST (with X-Device-Key)
           ▼
┌─────────────────────────────────────────────────────────────┐
│                 Node.js / Express Backend                   │
│  - JWT Authentication & Role-Based Access Control (RBAC)    │
│  - IoT Data Processing & Alert Threshold Evaluator Engine   │
│  - Prisma ORM Data Access Layer                             │
│  - Socket.IO Real-Time Event Publisher                      │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
    ┌────────────────────┐          ┌────────────────────┐
    │  PostgreSQL DB     │          │  Flask AI Server   │
    │  - 15 Core Tables  │          │  - Speech/Voice AI │
    └────────────────────┘          └────────────────────┘
               ▲
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│               React + Vite + TypeScript Frontend            │
│  - Patient Dashboard (Vitals, Graphs, Medicines, SOS, AI)   │
│  - Doctor Dashboard (Assigned Patients, Alerts, Notes)     │
│  - Admin Dashboard (Users, Devices, Thresholds, Audit Logs) │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚡ Technology Stack

### Frontend
- **Framework**: React + Vite + TypeScript
- **Styling**: Tailwind CSS + Glassmorphism UX
- **Data Visualization**: Recharts (Interactive line charts with 1h, 6h, 24h, 7d, 30d range filters)
- **Real-Time**: Socket.IO Client
- **Icons**: Lucide React

### Backend
- **Core**: Node.js + Express.js + TypeScript
- **Database & ORM**: PostgreSQL / SQLite + Prisma ORM
- **Security**: JWT Authentication, Bcrypt password hashing, Helmet, CORS, Rate Limiting, Audit Logging
- **Real-Time**: Socket.IO Server (Room-based isolation for patients, doctors, and admins)

### AI Server
- **Framework**: Python Flask API
- **Capabilities**: Natural language healthcare speech interaction, vital parameter queries, medication reminders

### Bedside IoT Hardware Prototype
- **Microcontroller**: ESP32 DevKit V1
- **Pulse Oximeter & Heart Rate**: MAX30100 (I2C: SDA=21, SCL=22)
- **Body Temperature**: MLX90614 Non-Contact IR Sensor (I2C: SDA=21, SCL=22)
- **Display**: 0.96 inch OLED SSD1306 (I2C 0x3C)
- **Microphone**: INMP441 MEMS Microphone (I2S)
- **Speaker & Amplifier**: MAX98357A 3W Class-D Amplifier (I2S)
- **Buttons**: Physical Emergency SOS (Pin 34) & Push-to-Talk Voice (Pin 35)

---

## 🎙️ AI Voice Assistant Architecture

```
Patient Speaks (Microphone / Browser)
              ↓
    Speech-to-Text (STT)
              ↓
      Node.js / Express Backend (Enriches with Live Vitals & Medicine Context)
              ↓
       Flask AI Server
              ↓
       OpenAI GPT-4o-mini (Medical System Prompt & Intent Classifier)
              ↓
    AI Clinical Response Text
              ↓
    Text-to-Speech (TTS)
              ↓
Patient Hears Response (Speaker / Laptop Audio)
```

---

## 🔑 Pre-Configured Demo Credentials

| Role | Email Address | Password | Account Details |
| :--- | :--- | :--- | :--- |
| **Patient** | `patient@smartcare.local` | `Patient@123456` | Rahul Sharma (PAT-1001), Bedside SC-ESP32-001 |
| **Doctor** | `dr.smith@smartcare.local` | `Doctor@123456` | Dr. Alexander Smith (DOC-1001), Cardiology |
| **Admin** | `admin@smartcare.local` | `Admin@123456` | System Administrator |

---

## 📂 Monorepo Folder Structure

```
smartcare-plus/
├── backend/
│   ├── src/
│   │   ├── config/          # Prisma & environment settings
│   │   ├── controllers/     # API request handlers (including voice & IoT)
│   │   ├── middleware/      # Auth, RBAC, DeviceKey, AuditLogger
│   │   ├── routes/          # Express route definitions
│   │   ├── services/        # Alert evaluator, AI proxy bridge with patient context
│   │   ├── sockets/         # Socket.IO connection & event emitters
│   │   └── server.ts        # Express entry point
│   ├── prisma/
│   │   ├── schema.prisma    # Relational schema (15 core models)
│   │   └── seed.ts          # Demo seed script
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Vitals, Charts, Modals, Navbar, Sidebar
│   │   ├── context/         # AuthContext & SocketContext
│   │   ├── hooks/           # useVoiceAssistant (SpeechRecognition & SpeechSynthesis)
│   │   ├── pages/           # Patient, Doctor, & Admin Dashboards + PatientAIPage
│   │   ├── services/        # Axios API client
│   │   ├── types/           # TypeScript interfaces
│   │   └── App.tsx          # Protected Router layout
│   └── package.json
│
├── ai-server/
│   ├── app.py               # Flask AI Voice processing server (OpenAI GPT-4o-mini)
│   ├── .env                 # Server-side OpenAI API Key
│   └── requirements.txt
│
├── esp32/
│   └── firmware/
│       └── smartcare_esp32.ino # ESP32 DevKit C++ Sketch (MAX30100, MLX90614, I2S)
│
├── docker-compose.yml       # PostgreSQL database container configuration
├── .env.example
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Flask AI Voice Server Setup
```bash
cd ai-server
pip install -r requirements.txt
python app.py
```
*AI server runs on `http://localhost:5001`*

### 2. Backend Setup & Seeding
```bash
cd backend
npm install
npx prisma db push
npx prisma db seed
npm run dev
```
*Backend runs on `http://localhost:5000`*

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Frontend opens on `http://localhost:5173`*

---

## 🧪 Testing the Voice Assistant

1. Open `http://localhost:5173` in **Google Chrome** or **Microsoft Edge**.
2. Log in as patient: `patient@smartcare.local` / `Patient@123456`.
3. Navigate to **AI Assistant** in the sidebar.
4. Click the **Microphone** button (allow microphone permissions if prompted).
5. Speak your question, for example:
   - *"What is my heart rate?"* → Assistant answers with live DB vital: *"Your latest recorded heart rate is 78.5 beats per minute."*
   - *"When is my next medicine?"* → Assistant consults active medicine schedule.
   - *"I need a nurse."* → Nurse-call intent is triggered, an emergency event & warning alert are broadcast to doctor/nurse dashboards in real-time, and the AI announces that the nurse has been notified.
6. The AI response is displayed on screen and automatically spoken aloud through your laptop speakers via the Text-to-Speech engine.

---

## 🔮 Hardware Integration (ESP32 Bedside Assistant)

Tomorrow, the browser voice pipeline transitions to dedicated hardware:
```
INMP441 I2S Microphone → ESP32 → SmartCare+ Backend → Flask AI Server → OpenAI
SmartCare+ Backend → ESP32 → MAX98357A I2S Amplifier → 3W Bedside Speaker
```
The firmware in `esp32/firmware/smartcare_esp32.ino` is already prepared with I2S audio pin assignments, device key authentication, and non-blocking sensor loops.

---

## 📡 IoT Telemetry Ingestion Payload

ESP32 sends sensor telemetry via `POST /api/iot/readings` with `X-Device-Key` header:

```http
POST /api/iot/readings HTTP/1.1
Host: localhost:5000
Content-Type: application/json
X-Device-Key: device_secret_PAT1001

{
  "deviceId": "SC-ESP32-001",
  "patientId": "PAT-1001",
  "heartRate": 78.5,
  "spo2": 98.0,
  "temperature": 36.7,
  "timestamp": "2026-08-24T18:30:00Z"
}
```

**Successful Response**:
```json
{
  "success": true,
  "message": "Reading stored",
  "readingId": "uuid-v4-reading-id",
  "recordedAt": "2026-08-24T18:30:00.000Z"
}
```

---

## 🧪 Automated Testing

Run Jest unit and integration tests:
```bash
cd backend
npm test
```

---

## ⚖️ Healthcare Prototype Disclaimer
> **Disclaimer:** SmartCare+ is an assistive IoT monitoring prototype intended for continuous telemetry visualization. It does not replace professional medical diagnosis, clinical judgment, or immediate emergency service dispatch.
