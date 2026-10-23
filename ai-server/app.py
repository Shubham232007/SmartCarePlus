"""
SmartCare+ Flask AI Voice Server
Real OpenAI GPT-4o-mini Integration with Patient Context

Architecture:
  Browser/ESP32 → Node.js Backend → This Flask Server → OpenAI API
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import datetime
import os
import re

load_dotenv()

app = Flask(__name__)
CORS(app)

BLUETOOTH_SPEAKER_NAME = os.environ.get("BLUETOOTH_SPEAKER_NAME", "Mini boost 4")
PLAY_ON_SPEAKER = os.environ.get("PLAY_ON_SPEAKER", "true").lower() == "true"

def play_to_bluetooth_speaker(pcm_bytes: bytes, sample_rate: int = 16000):
    """
    Directly routes audio output to the Bluetooth speaker ('Mini boost 4') / host audio device.
    Uses asynchronous background thread with Windows winsound so it does not block the HTTP API.
    """
    if not pcm_bytes or not PLAY_ON_SPEAKER:
        return

    import threading
    def _play_worker():
        try:
            import tempfile, wave, winsound
            wav_path = os.path.join(tempfile.gettempdir(), "smartcare_speaker_output.wav")
            with wave.open(wav_path, "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)  # 16-bit
                wf.setframerate(sample_rate)
                wf.writeframes(pcm_bytes)

            print(f"[BLUETOOTH AUDIO] 🔊 Broadcasting voice response to Bluetooth Speaker '{BLUETOOTH_SPEAKER_NAME}'...")
            winsound.PlaySound(wav_path, winsound.SND_FILENAME)
            print(f"[BLUETOOTH AUDIO] ✅ Voice response completed on '{BLUETOOTH_SPEAKER_NAME}'")
        except Exception as e:
            print(f"[BLUETOOTH AUDIO ERROR] Playback error: {e}")

    t = threading.Thread(target=_play_worker, daemon=True)
    t.start()

def get_openai_client():
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key or api_key == "OPENAI_API_KEY":
        return None
    try:
        from openai import OpenAI
        return OpenAI(api_key=api_key)
    except Exception as e:
        print(f"Failed to initialize OpenAI client: {e}")
        return None

def call_gemini_ai(system_prompt: str, user_prompt: str):
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not gemini_key or gemini_key == "GEMINI_API_KEY":
        return None
    try:
        import requests
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": f"SYSTEM INSTRUCTIONS:\n{system_prompt}\n\nUSER REQUEST:\n{user_prompt}"}]
                }
            ],
            "generationConfig": {
                "maxOutputTokens": 150,
                "temperature": 0.4
            }
        }
        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        else:
            print(f"[GEMINI API ERROR] HTTP {resp.status_code}: {resp.text[:120]}")
    except Exception as e:
        print(f"[GEMINI EXCEPTION] {e}")
    return None

# ─── SmartCare+ System Prompt ───────────────────────────────────────────────
SMARTCARE_SYSTEM_PROMPT = """You are SmartCare+, an AI bedside healthcare assistant deployed in a hospital ward.

Your purpose is to assist patients with simple healthcare-related questions, medicine reminders, vital-sign information, and requests for assistance.

CRITICAL RULE — STRICTLY ANSWER ONLY WHAT IS ASKED:
1. When the patient asks about HEART RATE or PULSE:
   - State ONLY the heart rate in beats per minute (e.g. "Your latest heart rate is 72 beats per minute.").
   - Do NOT mention temperature, oxygen, or medicines.
2. When the patient asks about TEMPERATURE or FEVER:
   - State ONLY the body temperature in degrees Celsius (e.g. "Your body temperature is 36.6 degrees Celsius.").
   - Do NOT mention heart rate, oxygen, or medicines.
3. When the patient asks about MEDICINES, PILLS, or SCHEDULE:
   - State ONLY the next scheduled medicine name and dose time (e.g. "Your next medicine is Paracetamol 500mg, scheduled for 2:00 PM.").
   - Do NOT mention vitals, heart rate, or temperature.
4. When the patient asks about OXYGEN or SPO2:
   - State ONLY the oxygen saturation level (e.g. "Your oxygen saturation level is 98 percent.").
   - Do NOT mention other vitals.
5. ONLY combine multiple vitals if the patient explicitly asks for "all vitals", "overall status", or "everything".

STRICT RULES:
1. Speak clearly and simply in 1-2 short sentences. Responses are spoken aloud via text-to-speech.
2. Use patient-specific data ONLY when it is explicitly provided in the context below.
3. NEVER invent or estimate patient vital signs, medicines, or schedules.
4. NEVER diagnose a disease or medical condition.
5. If abnormal vitals or emergency information is provided, advise the patient to contact a doctor or nurse immediately.
6. If the patient asks for a nurse or help, confirm the request has been sent.
7. Do not use bullet points, markdown, or special formatting in your response.
"""

# ─── Nurse-Call Intent Keywords ──────────────────────────────────────────────
NURSE_CALL_PATTERNS = [
    r"\b(nurse|nursing)\b",
    r"\bhelp\s*(me)?\b",
    r"\bcall\s+(a\s+)?nurse\b",
    r"\bneed\s+(a\s+)?nurse\b",
    r"\bsend\s+(a\s+)?nurse\b",
    r"\bemergency\b",
    r"\bi\s+need\s+help\b",
    r"\bsomebody\s+help\b",
    r"\bplease\s+come\b",
    r"\bcan't\s+breathe\b",
    r"\bchest\s+pain\b",
    r"\bfalling\b",
]


def detect_nurse_call(text: str) -> bool:
    """Rule-based nurse-call intent detection (not relying on LLM)."""
    lower = text.lower()
    for pattern in NURSE_CALL_PATTERNS:
        if re.search(pattern, lower):
            return True
    return False


def build_context_prompt(patient_context: dict) -> str:
    """Build a context block from patient data to prepend to user message."""
    lines = []

    vitals = patient_context.get("vitals")
    if vitals:
        lines.append("=== CURRENT PATIENT VITALS (from medical sensor) ===")
        if vitals.get("heartRate") is not None:
            lines.append(f"Heart Rate: {vitals['heartRate']} BPM")
        if vitals.get("spo2") is not None:
            lines.append(f"SpO2 (Oxygen Saturation): {vitals['spo2']}%")
        if vitals.get("temperature") is not None:
            lines.append(f"Body Temperature: {vitals['temperature']}°C")
        recorded_at = vitals.get("recordedAt")
        if recorded_at:
            lines.append(f"Reading Recorded At: {recorded_at}")
        lines.append("")

    medicines = patient_context.get("medicines", [])
    if medicines:
        lines.append("=== ACTIVE MEDICINE SCHEDULE ===")
        for med in medicines[:5]:  # Limit to 5 medicines
            if isinstance(med, str):
                lines.append(f"- {med}")
                continue
            if isinstance(med, dict):
                name = med.get("name", "Unknown")
                dosage = med.get("dosage", "")
                freq = med.get("frequency", "")
                instructions = med.get("instructions", "")
                next_dose = med.get("nextDoseTime", "")
                pending_status = med.get("pendingStatus", "")
                med_line = f"- {name} {dosage} ({freq})"
                if instructions:
                    med_line += f" — {instructions}"
                if next_dose:
                    med_line += f" | Next dose: {next_dose}"
                if pending_status:
                    med_line += f" | Status: {pending_status}"
                lines.append(med_line)
        lines.append("")

    patient_name = patient_context.get("patientName")
    if patient_name:
        lines.append(f"Patient Name: {patient_name}")

    if lines:
        return "\n".join(lines) + "\n\n=== PATIENT QUESTION ===\n"
    return ""


@app.route("/health", methods=["GET"])
def health():
    client = get_openai_client()
    return jsonify(
        {
            "status": "ONLINE",
            "service": "SmartCare+ AI Voice Engine",
            "bluetoothSpeaker": BLUETOOTH_SPEAKER_NAME,
            "speakerPlaybackEnabled": PLAY_ON_SPEAKER,
            "openaiConfigured": client is not None,
            "timestamp": datetime.datetime.utcnow().isoformat(),
        }
    )


@app.route("/api/voice/test-speaker", methods=["GET", "POST"])
def test_speaker():
    """Test voice output directly to the Bluetooth speaker ('Mini boost 4')."""
    test_msg = f"SmartCare+ voice assistance is now connected to your Bluetooth speaker {BLUETOOTH_SPEAKER_NAME}. Audio output is working properly."
    tts_data = generate_tts_audio_pcm_s16le(test_msg)
    return jsonify({
        "success": True,
        "speaker": BLUETOOTH_SPEAKER_NAME,
        "message": test_msg,
        "audioGenerated": bool(tts_data.get("audioBase64")),
    })


def trim_pcm_silence(pcm_data: bytes, threshold: int = 150) -> bytes:
    """Trim leading and trailing silence from 16-bit signed PCM audio."""
    if not pcm_data or len(pcm_data) < 4:
        return pcm_data

    import struct
    num_samples = len(pcm_data) // 2
    samples = struct.unpack(f"<{num_samples}h", pcm_data[:num_samples * 2])

    start = 0
    while start < num_samples and abs(samples[start]) < threshold:
        start += 1

    end = num_samples - 1
    while end > start and abs(samples[end]) < threshold:
        end -= 1

    if start >= end:
        return pcm_data

    start = max(0, start - 400)
    end = min(num_samples - 1, end + 400)

    trimmed_samples = samples[start:end + 1]
    return struct.pack(f"<{len(trimmed_samples)}h", *trimmed_samples)


def generate_tts_audio_pcm_s16le(text: str) -> dict:
    """
    Generate ultra-realistic, natural human-like voice PCM payload (pcm_s16le, 16000Hz, Mono).
    Uses Microsoft Neural TTS (edge-tts) for studio-grade human voice, with fallback to OpenAI/pyttsx3.
    """
    if not text:
        return {"audioBase64": "", "audioFormat": "pcm_s16le", "sampleRate": 16000, "channels": 1, "error": "Empty text"}

    raw_pcm = None
    error_msg = None

    # 1. Primary: Microsoft Edge Neural TTS (Ultra-realistic, warm, human-like voice)
    try:
        import asyncio, edge_tts, miniaudio
        async def _synth_edge():
            # en-US-JennyNeural is warm, professional, hospital-assistant style
            comm = edge_tts.Communicate(text, voice="en-US-JennyNeural", rate="+0%", volume="+0%")
            mp3_buf = bytearray()
            async for chunk in comm.stream():
                if chunk["type"] == "audio":
                    mp3_buf.extend(chunk["data"])
            return bytes(mp3_buf)

        mp3_bytes = asyncio.run(_synth_edge())
        if mp3_bytes and len(mp3_bytes) > 0:
            decoded = miniaudio.decode(mp3_bytes, output_format=miniaudio.SampleFormat.SIGNED16, nchannels=1, sample_rate=16000)
            raw_pcm = bytes(decoded.samples)
            print(f"[TTS NEURAL] Generated {len(raw_pcm)} bytes of 16kHz human-like neural audio via edge-tts")
    except Exception as e:
        print(f"[TTS DEBUG] edge-tts error: {e}")
        error_msg = f"edge-tts error: {e}"

    # 2. Secondary: OpenAI TTS API
    if raw_pcm is None:
        client = get_openai_client()
        if client is not None:
            try:
                response = client.audio.speech.create(
                    model="tts-1",
                    voice="alloy",
                    input=text,
                    response_format="pcm" # 24kHz 16-bit mono
                )
                openai_pcm = response.content
                if openai_pcm and len(openai_pcm) > 0:
                    import miniaudio
                    # Resample 24kHz to 16kHz
                    raw_pcm = b"".join(openai_pcm[i:i+2] for i in range(0, len(openai_pcm) - 1, 3))
            except Exception as e:
                error_msg = f"OpenAI TTS error: {e}"
                print(f"[TTS DEBUG] OpenAI TTS Exception: {e}")

    # 3. Tertiary: Offline pyttsx3 fallback
    if raw_pcm is None:
        try:
            import pyttsx3, tempfile, os, wave, miniaudio
            engine = pyttsx3.init()
            engine.setProperty('rate', 145)

            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
                wav_path = f.name

            engine.save_to_file(text, wav_path)
            engine.runAndWait()

            if os.path.exists(wav_path):
                decoded = miniaudio.decode_file(wav_path, output_format=miniaudio.SampleFormat.SIGNED16, nchannels=1, sample_rate=16000)
                os.remove(wav_path)
                raw_pcm = bytes(decoded.samples)
        except Exception as e:
            error_msg = f"pyttsx3 TTS error: {e}"
            print(f"[TTS DEBUG] pyttsx3 TTS Exception: {e}")

    if raw_pcm and len(raw_pcm) > 0:
        raw_pcm = trim_pcm_silence(raw_pcm)

        # Cap raw PCM bytes to max 128KB (~64,000 samples = ~4 seconds of 16kHz 16-bit mono audio)
        if len(raw_pcm) > 128000:
            cutoff = 128000 - (128000 % 2)
            raw_pcm = raw_pcm[:cutoff]

        import base64
        b64_str = base64.b64encode(raw_pcm).decode('utf-8')

        print(f"\n[TTS DEBUG] Reply text: {text[:60]}")
        print(f"[TTS DEBUG] Human Voice Generated: YES (16kHz S16LE Mono)")
        print(f"[TTS DEBUG] Audio bytes: {len(raw_pcm)} | Base64 length: {len(b64_str)}")

        # Automatically stream voice to Bluetooth Speaker ("Mini boost 4") / host audio
        play_to_bluetooth_speaker(raw_pcm, 16000)

        return {
            "audioBase64": b64_str,
            "audioFormat": "pcm_s16le",
            "sampleRate": 16000,
            "channels": 1,
            "error": None,
        }

    return {
        "audioBase64": "",
        "audioFormat": "pcm_s16le",
        "sampleRate": 16000,
        "channels": 1,
        "error": error_msg or "TTS generation failed",
    }


@app.route("/api/voice", methods=["POST"])
def process_voice():
    data = request.get_json() or {}
    patient_id = data.get("patientId", "PAT-UNKNOWN")
    transcript = (data.get("transcript") or "").strip()
    patient_context = data.get("patientContext", {})

    # ── Validate transcript ──────────────────────────────────────────────────
    if not transcript:
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Missing transcript parameter",
                    "reply": "I couldn't hear your question. Please try again.",
                    "audioBase64": "",
                    "audioFormat": "pcm_s16le",
                    "sampleRate": 8000,
                    "channels": 1,
                    "intent": "UNKNOWN",
                }
            ),
            400,
        )

    # ── Server-side nurse-call intent detection ──────────────────────────────
    is_nurse_call = detect_nurse_call(transcript)
    intent = "NURSE_CALL" if is_nurse_call else "GENERAL"

    client = get_openai_client()

    # ── Context block ─────────────────────────────────────────────────────────
    context_block = build_context_prompt(patient_context)
    full_user_message = f"{context_block}{transcript}"
    nurse_call_prefix = (
        "Okay. I have notified the nursing station and sent an alert. " if is_nurse_call else ""
    )

    # ── If no OpenAI key, try Gemini fallback first ──────────────────────────
    if client is None:
        gemini_text = call_gemini_ai(SMARTCARE_SYSTEM_PROMPT, full_user_message)
        if gemini_text:
            final_reply = nurse_call_prefix + gemini_text
            tts_data = generate_tts_audio_pcm_s16le(final_reply)
            return jsonify(
                {
                    "success": True,
                    "patientId": patient_id,
                    "transcript": transcript,
                    "reply": final_reply,
                    "audioBase64": tts_data["audioBase64"],
                    "audioFormat": tts_data["audioFormat"],
                    "sampleRate": tts_data["sampleRate"],
                    "channels": tts_data["channels"],
                    "intent": intent,
                    "mode": "GEMINI_1_5_FLASH",
                }
            )

        fallback_reply = _rule_based_fallback(transcript, patient_context, is_nurse_call)
        tts_data = generate_tts_audio_pcm_s16le(fallback_reply)
        return jsonify(
            {
                "success": True,
                "patientId": patient_id,
                "transcript": transcript,
                "reply": fallback_reply,
                "audioBase64": tts_data["audioBase64"],
                "audioFormat": tts_data["audioFormat"],
                "sampleRate": tts_data["sampleRate"],
                "channels": tts_data["channels"],
                "intent": intent,
                "mode": "FALLBACK_NO_API_KEY",
            }
        )

    # ── Build context block ──────────────────────────────────────────────────
    context_block = build_context_prompt(patient_context)
    full_user_message = f"{context_block}{transcript}"

    # ── Nurse-call reply prefix ──────────────────────────────────────────────
    nurse_call_prefix = (
        "Okay. I have notified the nursing station and sent an alert. " if is_nurse_call else ""
    )

    # ── Call OpenAI API ──────────────────────────────────────────────────────
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SMARTCARE_SYSTEM_PROMPT},
                {"role": "user", "content": full_user_message},
            ],
            max_tokens=150,
            temperature=0.4,
            timeout=12,
        )

        ai_text = response.choices[0].message.content.strip()
        final_reply = nurse_call_prefix + ai_text
        tts_data = generate_tts_audio_pcm_s16le(final_reply)

        return jsonify(
            {
                "success": True,
                "patientId": patient_id,
                "transcript": transcript,
                "reply": final_reply,
                "audioBase64": tts_data["audioBase64"],
                "audioFormat": tts_data["audioFormat"],
                "sampleRate": tts_data["sampleRate"],
                "channels": tts_data["channels"],
                "intent": intent,
                "mode": "OPENAI_GPT4O_MINI",
            }
        )

    except Exception as e:
        print(f"[OPENAI ERROR] {type(e).__name__}: {e}")
        # Try Gemini fallback when OpenAI has error (e.g., quota exceeded / network)
        gemini_text = call_gemini_ai(SMARTCARE_SYSTEM_PROMPT, full_user_message)
        if gemini_text:
            final_reply = nurse_call_prefix + gemini_text
            tts_data = generate_tts_audio_pcm_s16le(final_reply)
            return jsonify(
                {
                    "success": True,
                    "patientId": patient_id,
                    "transcript": transcript,
                    "reply": final_reply,
                    "audioBase64": tts_data["audioBase64"],
                    "audioFormat": tts_data["audioFormat"],
                    "sampleRate": tts_data["sampleRate"],
                    "channels": tts_data["channels"],
                    "intent": intent,
                    "mode": "GEMINI_1_5_FLASH",
                }
            )

        fallback_reply = _rule_based_fallback(transcript, patient_context, is_nurse_call)
        tts_data = generate_tts_audio_pcm_s16le(fallback_reply)
        return jsonify(
            {
                "success": True,
                "patientId": patient_id,
                "transcript": transcript,
                "reply": fallback_reply,
                "audioBase64": tts_data["audioBase64"],
                "audioFormat": tts_data["audioFormat"],
                "sampleRate": tts_data["sampleRate"],
                "channels": tts_data["channels"],
                "intent": intent,
                "mode": "FALLBACK_OPENAI_ERROR",
            }
        )


def _rule_based_fallback(transcript: str, patient_context: dict, is_nurse_call: bool) -> str:
    """Safe, strictly topic-focused rule-based engine: answers only what is asked."""
    if is_nurse_call:
        return "Okay. I have notified the nursing station. A healthcare team member will be with you shortly."

    lower = transcript.lower()
    vitals = patient_context.get("vitals", {}) or {}
    medicines = patient_context.get("medicines", [])

    # 1. SPECIFIC: Heart Rate / Pulse
    if any(w in lower for w in ["heart rate", "pulse", "bpm", "heartbeat", "heart"]):
        hr = vitals.get("heartRate")
        if hr:
            return f"Your latest heart rate is {int(round(float(hr)))} beats per minute."
        return "Your heart rate reading is currently not detected. Please keep your finger on the sensor."

    # 2. SPECIFIC: Temperature / Fever
    if any(w in lower for w in ["temperature", "temp", "fever", "feverish", "body temp"]):
        temp = vitals.get("temperature")
        if temp:
            return f"Your body temperature is {round(float(temp), 1)} degrees Celsius."
        return "Your body temperature reading is currently not available."

    # 3. SPECIFIC: Medicine / Medication schedule
    if any(w in lower for w in ["medicine", "medication", "pill", "pills", "drug", "drugs", "dose", "dosage", "tablet", "tablets", "prescription", "schedule"]):
        if medicines:
            first = medicines[0]
            if isinstance(first, dict):
                name = first.get("name", "scheduled medication")
                dosage = first.get("dosage", "")
                time_str = first.get("nextDoseTime") or first.get("frequency") or "as scheduled"
                return f"Your next medicine is {name} {dosage}, scheduled for {time_str}."
            return f"Your next scheduled medicine is {first}."
        return "You have no pending medicines scheduled for today."

    # 4. SPECIFIC: Oxygen Saturation / SpO2
    if any(w in lower for w in ["oxygen", "spo2", "spo", "saturation", "o2"]):
        spo2 = vitals.get("spo2")
        if spo2:
            return f"Your oxygen saturation level is {int(round(float(spo2)))} percent."
        return "Your oxygen saturation reading is currently not available."

    # 5. Greeting / Intro
    if any(w in lower for w in ["hello", "hi", "hey", "who are you", "what can you do"]):
        return "Hello! I am SmartCare+. You can ask me for your heart rate, body temperature, or medicine schedule."

    # 6. Combined summary ONLY when explicitly asking for all vitals or complete summary
    if any(w in lower for w in ["all vitals", "full status", "summary", "everything", "all vital", "overall"]):
        parts = []
        hr = vitals.get("heartRate")
        spo2 = vitals.get("spo2")
        temp = vitals.get("temperature")

        if hr: parts.append(f"Heart rate is {int(round(float(hr)))} BPM")
        if spo2: parts.append(f"Oxygen is {int(round(float(spo2)))}%")
        if temp: parts.append(f"Temperature is {round(float(temp), 1)}°C")

        if parts:
            return "Your current vitals: " + ", ".join(parts) + "."
        return "Your bedside sensors are active."

    # 7. General fallback
    hr = vitals.get("heartRate")
    if hr:
        return f"Your latest heart rate is {int(round(float(hr)))} beats per minute."
    return "I am monitoring your bedside vitals. Please ask for your heart rate, temperature, or next medicine."


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)
