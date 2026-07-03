# Alibaba Cloud ECS FastAPI Deployment

This deploys the MedsBuddy backend on Alibaba Cloud ECS using:

- FastAPI
- Uvicorn
- Nginx reverse proxy
- systemd auto-start
- SQLite visit memory
- Qwen Cloud reasoning
- ElevenLabs STT/TTS

## Backend Architecture

```txt
MedsBuddy App
        |
        v
Alibaba ECS Backend APIs
        |
        v
Qwen Cloud
        |
        v
Visit Memory DB
        |
        v
Response
```

ElevenLabs STT/TTS is available through the backend endpoints `/api/stt` and `/api/tts`.
For the hackathon demo, transcript text can also be sent directly to the MedsBuddy Qwen endpoints.

## ECS Security Group

Allow inbound:

- `22/tcp` from your IP for SSH
- `80/tcp` from the internet for Nginx
- `443/tcp` if you add HTTPS later
- `8000/tcp` only for temporary testing, not required for production

Production traffic should use Nginx on port `80`, which proxies to Uvicorn on `127.0.0.1:8000`.

## Environment Variables

On ECS, the backend uses `/opt/medsbuddy-backend/.env`:

```bash
DASHSCOPE_API_KEY=your_qwen_or_dashscope_key
QWEN_API_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen3.7-max
ELEVENLABS_API_KEY=your_elevenlabs_key
CORS_ORIGINS=*
DATABASE_URL=sqlite:///./medsbuddy.db
```

In the MedsBuddy app/frontend `.env`, point the app to this ECS backend:

```bash
VITE_MEDSBUDDY_API_BASE_URL=http://YOUR_ALIBABA_ECS_PUBLIC_IP
```

After setting it locally, restart the app dev server or rebuild the deployed frontend.

For React Native, `CORS_ORIGINS=*` is acceptable for a hackathon demo. For production web origins, set:

```bash
CORS_ORIGINS=https://yourdomain.com,http://localhost:8080
```

## Deploy From Your Mac

Replace these values:

```bash
ECS_IP=YOUR_ALIBABA_ECS_PUBLIC_IP
ECS_USER=root
```

Copy the backend to ECS:

```bash
rsync -avz backend/ ${ECS_USER}@${ECS_IP}:/tmp/medsbuddy-backend/
```

SSH into ECS:

```bash
ssh ${ECS_USER}@${ECS_IP}
```

Run deployment:

```bash
cd /tmp/medsbuddy-backend
sudo bash deploy.sh
```

Edit environment variables:

```bash
sudo nano /opt/medsbuddy-backend/.env
```

Restart after editing:

```bash
sudo systemctl restart medsbuddy-backend
sudo systemctl status medsbuddy-backend --no-pager
```

## Test Endpoints

From your Mac:

```bash
curl http://${ECS_IP}/health
curl http://${ECS_IP}/api/qwen-proof
```

Analyze live transcript with Qwen:

```bash
curl -X POST http://${ECS_IP}/api/medsbuddy/analyze-transcript \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "vasanthi-demo",
    "patientContext": "Vasanthi has fever, dizziness, fatigue, leg and back pain.",
    "medicationHistory": "Antibiotic and blood pressure medication discussed.",
    "transcript": "Doctor: What has been happening with the patient?"
  }'
```

Generate structured visit summary:

```bash
curl -X POST http://${ECS_IP}/api/medsbuddy/generate-summary \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "vasanthi-demo",
    "patientContext": "Vasanthi is the patient.",
    "medicationHistory": "Antibiotic and blood pressure medication discussed.",
    "transcript": "Patient reported fever around 101.3, dizziness after medication, fatigue, and leg/back pain. Doctor advised hydration, monitoring, and urgent care for severe symptoms."
  }'
```

Save patient-approved visit memory:

```bash
curl -X POST http://${ECS_IP}/api/medsbuddy/save-memory \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "vasanthi-demo",
    "visitSummary": "Patient reported fever, dizziness after medication, fatigue, and leg/back pain.",
    "diagnosis": "Discussed possible medication timing or blood pressure changes.",
    "medications": "Continue medication as prescribed unless doctor changes plan.",
    "allergies": "No allergies recorded.",
    "followUp": "Follow up if symptoms continue.",
    "warningSigns": "Fever above 103, chest pain, shortness of breath, severe dizziness, confusion, or fainting.",
    "approvedByPatient": true
  }'
```

Retrieve visit memory:

```bash
curl http://${ECS_IP}/api/medsbuddy/memory/vasanthi-demo
```

Ask Qwen using previous visit memory:

```bash
curl -X POST http://${ECS_IP}/api/medsbuddy/ask-memory \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "vasanthi-demo",
    "question": "What happened last visit and what medications were discussed?",
    "patientContext": "Vasanthi is preparing for a doctor visit.",
    "medicationHistory": "Recent antibiotic and blood pressure medication discussed.",
    "currentTranscript": "Doctor asks for previous visit context."
  }'
```

Check whether MedsBuddy should ask a clarification:

```bash
curl -X POST http://${ECS_IP}/api/medsbuddy/clarification-check \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "vasanthi-demo",
    "patientContext": "Vasanthi has fever and dizziness after medication.",
    "medicationHistory": "Antibiotic and blood pressure medication discussed.",
    "alreadyAskedTopics": [],
    "transcript": "Doctor: Continue the medicine and follow up later."
  }'
```

General MedsBuddy Talk page chat:

```bash
curl -X POST http://${ECS_IP}/api/medsbuddy/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "system",
        "content": "You are MedsBuddy, an AI Patient Advocate. Keep answers brief."
      },
      {
        "role": "user",
        "content": "Help me prepare questions for my doctor visit."
      }
    ]
  }'
```

Compatibility aliases are also available:

- `POST /memory/save`
- `GET /memory/{patientId}`
- `POST /reason`

## Backend Logs

The FastAPI service logs these proof messages:

- `Alibaba ECS API called`
- `Calling Qwen Cloud`
- `Visit memory saved`
- `Visit memory retrieved`

## Useful Server Commands

View logs:

```bash
sudo journalctl -u medsbuddy-backend -f
```

Restart backend:

```bash
sudo systemctl restart medsbuddy-backend
```

Check Nginx:

```bash
sudo nginx -t
sudo systemctl status nginx --no-pager
```

## Hackathon Proof Checklist

Capture screenshots of:

- Alibaba Cloud ECS instance running
- ECS public IP
- `http://ECS_IP/health`
- `http://ECS_IP/api/qwen-proof`
- `POST /api/medsbuddy/analyze-transcript` showing Qwen speaker/intent reasoning
- `POST /api/medsbuddy/generate-summary` showing Qwen structured summary generation
- `POST /api/medsbuddy/save-memory` returning saved memory
- `GET /api/medsbuddy/memory/{patientId}` returning approved visit memory
- `POST /api/medsbuddy/ask-memory` showing Qwen response using previous memory
- `POST /api/medsbuddy/clarification-check` showing Qwen clarification decision
- `POST /api/medsbuddy/chat` showing the Talk page uses Alibaba ECS and Qwen Cloud

Do not show API keys in screenshots.
