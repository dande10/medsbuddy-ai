import json
import logging
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

load_dotenv()

APP_DIR = Path(__file__).resolve().parent
DEFAULT_QWEN_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./medsbuddy.db").strip()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("medsbuddy-alibaba-ecs")


def sqlite_path() -> Path:
    if DATABASE_URL.startswith("sqlite:///"):
        configured = DATABASE_URL.replace("sqlite:///", "", 1)
        path = Path(configured)
        return path if path.is_absolute() else APP_DIR / path
    return APP_DIR / "medsbuddy.db"


DB_PATH = sqlite_path()


@contextmanager
def db() -> Any:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def init_db() -> None:
    with db() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS visit_memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id TEXT NOT NULL,
                visit_summary TEXT NOT NULL,
                diagnosis TEXT DEFAULT '',
                medications TEXT DEFAULT '',
                allergies TEXT DEFAULT '',
                follow_up TEXT DEFAULT '',
                warning_signs TEXT DEFAULT '',
                approved_by_patient INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_visit_memories_patient ON visit_memories(patient_id, created_at DESC)"
        )


class VisitMemoryIn(BaseModel):
    patientId: str = Field(..., min_length=1)
    visitSummary: str = Field(..., min_length=1)
    diagnosis: str = ""
    medications: str = ""
    allergies: str = ""
    followUp: str = ""
    warningSigns: str = ""
    approvedByPatient: bool = True


class ReasonRequest(BaseModel):
    patientId: str = Field(..., min_length=1)
    transcript: str = Field(..., min_length=1)
    patientContext: str = ""
    medicationHistory: str = ""


class GenerateSummaryRequest(BaseModel):
    patientId: str = Field(..., min_length=1)
    transcript: str = Field(..., min_length=1)
    patientContext: str = ""
    medicationHistory: str = ""


class HumanizePreVisitSummaryRequest(BaseModel):
    patientId: str = Field(..., min_length=1)
    rawPatientContext: str = Field(..., min_length=1)


class AskMemoryRequest(BaseModel):
    patientId: str = Field(..., min_length=1)
    question: str = Field(..., min_length=1)
    currentTranscript: str = ""
    patientContext: str = ""
    medicationHistory: str = ""


class ClarificationCheckRequest(BaseModel):
    patientId: str = Field(..., min_length=1)
    transcript: str = Field(..., min_length=1)
    patientContext: str = ""
    medicationHistory: str = ""
    alreadyAskedTopics: list[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    messages: list[dict[str, str]] = Field(..., min_length=1)


class TtsRequest(BaseModel):
    text: str = Field(..., min_length=1)
    voiceId: str = "EXAVITQu4vr4xnSDxMaL"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_qwen_config(model: Optional[str] = None) -> dict[str, Any]:
    return {
        "api_key": (os.getenv("DASHSCOPE_API_KEY") or os.getenv("QWEN_API_KEY") or "").strip(),
        "base_url": os.getenv("QWEN_API_BASE_URL", DEFAULT_QWEN_BASE_URL).strip().rstrip("/"),
        "model": (model or os.getenv("QWEN_MODEL", "qwen-plus")).strip() or "qwen-plus",
    }


def visit_memory_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "patientId": row["patient_id"],
        "visitSummary": row["visit_summary"],
        "diagnosis": row["diagnosis"],
        "medications": row["medications"],
        "allergies": row["allergies"],
        "followUp": row["follow_up"],
        "warningSigns": row["warning_signs"],
        "approvedByPatient": bool(row["approved_by_patient"]),
        "createdAt": row["created_at"],
    }


def get_patient_memories(patient_id: str, limit: int = 10) -> list[dict[str, Any]]:
    with db() as connection:
        rows = connection.execute(
            """
            SELECT * FROM visit_memories
            WHERE patient_id = ? AND approved_by_patient = 1
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (patient_id, limit),
        ).fetchall()
    return [visit_memory_to_dict(row) for row in rows]


def memory_context(patient_id: str) -> str:
    memories = get_patient_memories(patient_id)
    if not memories:
        return "No approved previous visit memories found."
    lines: list[str] = []
    for memory in memories:
        parts = [
            f"Date: {memory['createdAt']}",
            f"Summary: {memory['visitSummary']}",
            f"Diagnosis: {memory['diagnosis'] or 'Not recorded'}",
            f"Medications: {memory['medications'] or 'Not recorded'}",
            f"Allergies: {memory['allergies'] or 'Not recorded'}",
            f"Follow-up: {memory['followUp'] or 'Not recorded'}",
            f"Warning signs: {memory['warningSigns'] or 'Not recorded'}",
        ]
        lines.append("\n".join(parts))
    return "\n\n---\n\n".join(lines)


async def qwen_chat(
    messages: list[dict[str, str]],
    max_tokens: int = 350,
    model: Optional[str] = None,
) -> str:
    qwen = get_qwen_config(model)
    if not qwen["api_key"]:
        raise HTTPException(status_code=500, detail="Missing DASHSCOPE_API_KEY")

    logger.info("Calling Qwen Cloud")
    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(
            f"{qwen['base_url']}/chat/completions",
            headers={
                "Authorization": f"Bearer {qwen['api_key']}",
                "Content-Type": "application/json",
            },
            json={
                "model": qwen["model"],
                "messages": messages,
                "temperature": 0.2,
                "max_tokens": max_tokens,
            },
        )
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=response.text[:500])
    data = response.json()
    return data.get("choices", [{}])[0].get("message", {}).get("content", "")


def parse_qwen_json(reply: str, fallback_intent: str = "qwen_response") -> dict[str, Any]:
    try:
        parsed = json.loads(reply)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass
    return {
        "shouldRespond": True,
        "intent": fallback_intent,
        "response": reply,
        "memoryUsed": True,
    }


def cors_origins() -> list[str]:
    configured = os.getenv("CORS_ORIGINS", "*").strip()
    if configured == "*":
        return ["*"]
    return [origin.strip() for origin in configured.split(",") if origin.strip()]


app = FastAPI(title="MedsBuddy Alibaba Cloud Backend", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/health")
@app.get("/api/health")
def health() -> dict[str, Any]:
    logger.info("Alibaba ECS API called: health")
    qwen = get_qwen_config()
    return {
        "ok": True,
        "service": "medsbuddy-alibaba-fastapi-backend",
        "deploymentTarget": "Alibaba Cloud ECS",
        "qwen": {
            "configured": bool(qwen["api_key"]),
            "model": qwen["model"],
            "baseUrl": qwen["base_url"],
        },
        "elevenLabs": {"configured": bool(os.getenv("ELEVENLABS_API_KEY", "").strip())},
        "database": {"provider": "sqlite", "path": str(DB_PATH)},
    }


@app.post("/memory/save")
@app.post("/api/medsbuddy/save-memory")
def save_memory(memory: VisitMemoryIn) -> dict[str, Any]:
    logger.info("Alibaba ECS API called: save-memory")
    with db() as connection:
        cursor = connection.execute(
            """
            INSERT INTO visit_memories (
                patient_id, visit_summary, diagnosis, medications, allergies,
                follow_up, warning_signs, approved_by_patient, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                memory.patientId,
                memory.visitSummary,
                memory.diagnosis,
                memory.medications,
                memory.allergies,
                memory.followUp,
                memory.warningSigns,
                1 if memory.approvedByPatient else 0,
                now_iso(),
            ),
        )
        row = connection.execute(
            "SELECT * FROM visit_memories WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()
    logger.info("Visit memory saved")
    return {"saved": True, "memory": visit_memory_to_dict(row)}


@app.get("/memory/{patientId}")
@app.get("/api/medsbuddy/memory/{patientId}")
def get_memory(patientId: str) -> dict[str, Any]:
    logger.info("Alibaba ECS API called: memory")
    logger.info("Visit memory retrieved")
    return {"patientId": patientId, "memories": get_patient_memories(patientId)}


@app.post("/reason")
@app.post("/api/medsbuddy/analyze-transcript")
async def reason(req: ReasonRequest) -> dict[str, Any]:
    logger.info("Alibaba ECS API called: analyze-transcript")
    memories = memory_context(req.patientId)
    reply = await qwen_chat(
        [
            {
                "role": "system",
                "content": (
                    "You are MedsBuddy, an AI Patient Advocate in a doctor visit. "
                    "Analyze the latest transcript semantically. Detect speaker, intent, "
                    "confidence, whether MedsBuddy should respond, and a short response if needed. "
                    "Use approved visit memory only when relevant. Return JSON only with keys "
                    "speaker, intent, confidence, shouldRespond, response, memoryUsed."
                ),
            },
            {
                "role": "user",
                "content": "\n\n".join(
                    [
                        f"Patient ID: {req.patientId}",
                        f"Approved previous visit memory:\n{memories}",
                        f"Patient context:\n{req.patientContext or 'Not provided.'}",
                        f"Medication history:\n{req.medicationHistory or 'Not provided.'}",
                        f"Current transcript:\n{req.transcript}",
                    ]
                ),
            },
        ]
    )
    parsed = parse_qwen_json(reply, "analyze_transcript")
    return {"patientId": req.patientId, "qwen": get_qwen_config()["model"], "result": parsed}


@app.post("/api/medsbuddy/humanize-previsit-summary")
async def humanize_previsit_summary(req: HumanizePreVisitSummaryRequest) -> dict[str, Any]:
    logger.info("Alibaba ECS API called: humanize-previsit-summary")
    reply = await qwen_chat(
        [
            {
                "role": "system",
                "content": (
                    "Rewrite this raw patient context into a clean, patient-friendly pre-visit summary. "
                    "Remove unclear transcription artifacts, duplicates, filler words, and confusing phrases. "
                    "Do not invent medical facts. Keep only clear facts. Use sections: Current Medications, "
                    "Current Symptoms, Medication History, Allergies, Conditions. Convert severity numbers into "
                    "mild/moderate/severe. Return only clean text."
                ),
            },
            {
                "role": "user",
                "content": req.rawPatientContext,
            },
        ],
        max_tokens=420,
    )
    return {"patientId": req.patientId, "qwen": get_qwen_config()["model"], "summary": reply.strip()}


@app.post("/api/medsbuddy/generate-summary")
async def generate_summary(req: GenerateSummaryRequest) -> dict[str, Any]:
    logger.info("Alibaba ECS API called: generate-summary")
    memories = memory_context(req.patientId)
    reply = await qwen_chat(
        [
            {
                "role": "system",
                "content": (
                    "You generate structured doctor visit summaries for MedsBuddy. "
                    "Use the transcript as the source of truth. Include only discussed facts. "
                    "Return JSON only with keys visitSummary, diagnosis, medications, allergies, "
                    "followUp, warningSigns, patientFriendlyExplanation, caregiverShareSummary."
                ),
            },
            {
                "role": "user",
                "content": "\n\n".join(
                    [
                        f"Patient ID: {req.patientId}",
                        f"Previous approved visit memory:\n{memories}",
                        f"Patient context:\n{req.patientContext or 'Not provided.'}",
                        f"Medication history:\n{req.medicationHistory or 'Not provided.'}",
                        f"Full visit transcript:\n{req.transcript}",
                    ]
                ),
            },
        ],
        max_tokens=700,
    )
    return {
        "patientId": req.patientId,
        "qwen": get_qwen_config()["model"],
        "summary": parse_qwen_json(reply, "generate_summary"),
    }


@app.post("/api/medsbuddy/ask-memory")
async def ask_memory(req: AskMemoryRequest) -> dict[str, Any]:
    logger.info("Alibaba ECS API called: ask-memory")
    memories = memory_context(req.patientId)
    logger.info("Visit memory retrieved")
    reply = await qwen_chat(
        [
            {
                "role": "system",
                "content": (
                    "You are MedsBuddy answering a doctor's question during a visit. "
                    "Answer using approved patient visit memory and medication context. "
                    "Be concise and clinically cautious. Return JSON only with keys "
                    "intent, response, memoryUsed, citations."
                ),
            },
            {
                "role": "user",
                "content": "\n\n".join(
                    [
                        f"Patient ID: {req.patientId}",
                        f"Doctor question:\n{req.question}",
                        f"Approved previous visit memory:\n{memories}",
                        f"Current transcript:\n{req.currentTranscript or 'Not provided.'}",
                        f"Patient context:\n{req.patientContext or 'Not provided.'}",
                        f"Medication history:\n{req.medicationHistory or 'Not provided.'}",
                    ]
                ),
            },
        ],
        max_tokens=450,
    )
    return {
        "patientId": req.patientId,
        "qwen": get_qwen_config()["model"],
        "result": parse_qwen_json(reply, "ask_memory"),
    }


@app.post("/api/medsbuddy/clarification-check")
async def clarification_check(req: ClarificationCheckRequest) -> dict[str, Any]:
    logger.info("Alibaba ECS API called: clarification-check")
    memories = memory_context(req.patientId)
    reply = await qwen_chat(
        [
            {
                "role": "system",
                "content": (
                    "You decide whether MedsBuddy should briefly ask the doctor a clarification question. "
                    "Do not interrupt for normal conversation. Ask only for clinically useful gaps: "
                    "medication side effects, missed doses, warning signs, follow-up timing, diagnosis explanation, "
                    "or unclear care plan. Avoid repeated topics. Return JSON only with keys shouldAsk, topic, question, reason."
                ),
            },
            {
                "role": "user",
                "content": "\n\n".join(
                    [
                        f"Patient ID: {req.patientId}",
                        f"Approved previous visit memory:\n{memories}",
                        f"Patient context:\n{req.patientContext or 'Not provided.'}",
                        f"Medication history:\n{req.medicationHistory or 'Not provided.'}",
                        f"Already asked topics: {', '.join(req.alreadyAskedTopics) or 'None'}",
                        f"Current visit transcript:\n{req.transcript}",
                    ]
                ),
            },
        ],
        max_tokens=300,
    )
    return {
        "patientId": req.patientId,
        "qwen": get_qwen_config()["model"],
        "result": parse_qwen_json(reply, "clarification_check"),
    }


@app.post("/api/medsbuddy/chat")
async def medsbuddy_chat(req: ChatRequest) -> dict[str, Any]:
    logger.info("Alibaba ECS API called: chat")
    chat_model = os.getenv("QWEN_CHAT_MODEL", "qwen-plus").strip() or "qwen-plus"
    reply = await qwen_chat(req.messages, max_tokens=180, model=chat_model)
    return {"reply": reply, "qwen": chat_model}


@app.get("/api/qwen-proof")
def qwen_proof_get() -> dict[str, Any]:
    qwen = get_qwen_config()
    return {
        "purpose": "Proof endpoint for Alibaba Cloud ECS backend and Qwen Cloud API usage.",
        "provider": "Alibaba Cloud Model Studio / Qwen Cloud",
        "deploymentTarget": "Alibaba Cloud ECS",
        "endpoint": f"{qwen['base_url']}/chat/completions",
        "model": qwen["model"],
        "apiKeyEnv": "DASHSCOPE_API_KEY",
        "architecture": "MedsBuddy App -> Alibaba ECS Backend APIs -> Qwen Cloud -> Visit Memory DB -> Response",
        "medsBuddyEndpoints": [
            "POST /api/medsbuddy/analyze-transcript",
            "POST /api/medsbuddy/generate-summary",
            "POST /api/medsbuddy/save-memory",
            "GET /api/medsbuddy/memory/{patientId}",
            "POST /api/medsbuddy/ask-memory",
            "POST /api/medsbuddy/clarification-check",
            "POST /api/medsbuddy/chat",
        ],
    }


@app.post("/api/qwen-proof")
async def qwen_proof_post(body: dict[str, Any]) -> dict[str, Any]:
    prompt = str(body.get("prompt") or "Explain MedsBuddy in one sentence.").strip()
    reply = await qwen_chat(
        [
            {
                "role": "system",
                "content": "You are MedsBuddy. Mention this response is powered by Qwen Cloud.",
            },
            {"role": "user", "content": prompt},
        ],
        max_tokens=180,
    )
    return {
        "provider": "Alibaba Cloud Model Studio / Qwen Cloud",
        "deploymentTarget": "Alibaba Cloud ECS",
        "model": get_qwen_config()["model"],
        "prompt": prompt,
        "reply": reply,
    }


@app.post("/api/stt")
async def elevenlabs_stt(audio: UploadFile = File(...)) -> dict[str, str]:
    key = os.getenv("ELEVENLABS_API_KEY", "").strip()
    if not key:
        raise HTTPException(status_code=500, detail="Missing ELEVENLABS_API_KEY")

    files = {"file": (audio.filename or "doctor-visit.webm", await audio.read(), audio.content_type)}
    data = {
        "model_id": "scribe_v2",
        "tag_audio_events": "false",
        "diarize": "true",
        "num_speakers": "2",
    }
    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(
            "https://api.elevenlabs.io/v1/speech-to-text",
            headers={"xi-api-key": key},
            data=data,
            files=files,
        )
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=response.text[:500])
    data = response.json()
    return {"text": data.get("text", "").strip(), "rawText": data.get("text", "").strip()}


@app.post("/api/tts")
async def elevenlabs_tts(req: TtsRequest) -> Response:
    key = os.getenv("ELEVENLABS_API_KEY", "").strip()
    if not key:
        raise HTTPException(status_code=500, detail="Missing ELEVENLABS_API_KEY")

    async with httpx.AsyncClient(timeout=90) as client:
        response = await client.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{req.voiceId}/stream?output_format=mp3_44100_128",
            headers={"xi-api-key": key, "Content-Type": "application/json"},
            json={
                "text": req.text,
                "model_id": "eleven_turbo_v2_5",
                "voice_settings": {
                    "stability": 0.55,
                    "similarity_boost": 0.8,
                    "style": 0.3,
                    "use_speaker_boost": True,
                },
            },
        )

    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=response.text[:500])
    return Response(
        content=response.content,
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-store"},
    )


@app.options("/{path:path}")
def options_handler(path: str) -> Response:
    return Response(status_code=204)
