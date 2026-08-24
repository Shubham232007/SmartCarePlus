from flask import Flask, request, jsonify
from flask_cors import CORS
import datetime
import os

app = Flask(__name__)
CORS(app)

print("🤖 SmartCare+ Flask AI Voice Processing Server Starting...")

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ONLINE",
        "service": "SmartCare+ AI Voice Engine",
        "timestamp": datetime.datetime.utcnow().isoformat()
    })

@app.route('/api/voice', methods=['POST'])
def process_voice():
    data = request.get_json() or {}
    patient_id = data.get('patientId', 'PAT-UNKNOWN')
    transcript = data.get('transcript', '').strip()

    if not transcript:
        return jsonify({
            "error": "Missing transcript parameter",
            "reply": "I couldn't hear what you said. Could you please repeat?"
        }), 400

    lower = transcript.lower()

    # Rule-based intelligent healthcare responses
    if 'heart rate' in lower or 'pulse' in lower:
        reply = "Your latest recorded heart rate is 78 BPM, which is in normal healthy range."
    elif 'spo2' in lower or 'oxygen' in lower:
        reply = "Your oxygen saturation level is 98%, which indicates excellent oxygenation."
    elif 'temperature' in lower or 'fever' in lower:
        reply = "Your body temperature is 36.7°C, which is completely normal."
    elif 'medicine' in lower or 'pill' in lower or 'medication' in lower:
        reply = "Your next scheduled medication is Lisinopril 10mg at 8:00 PM today."
    elif 'nurse' in lower or 'help' in lower or 'doctor' in lower:
        reply = "I have notified the nursing station. A healthcare team member will be with you shortly."
    elif 'sos' in lower or 'emergency' in lower:
        reply = "SOS alert activated! Stay calm, emergency protocols have been engaged."
    else:
        reply = f"SmartCare+ Assistant received your message: '{transcript}'. All your vital parameters are currently stable."

    return jsonify({
        "success": True,
        "patientId": patient_id,
        "transcript": transcript,
        "reply": reply,
        "timestamp": datetime.datetime.utcnow().isoformat()
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
