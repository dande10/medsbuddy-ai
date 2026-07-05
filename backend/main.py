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
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
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


class DoctorHandoffRequest(BaseModel):
    patientId: str = Field(..., min_length=1)
    approvedPreVisitSummary: str = Field(..., min_length=1)
    patientContext: dict[str, Any] = Field(default_factory=dict)
    medicationHistory: str = ""


class PatientContextMessage(BaseModel):
    role: str
    content: str


class ExtractPatientContextRequest(BaseModel):
    patientId: str = Field(..., min_length=1)
    conversation: list[PatientContextMessage] = Field(..., min_length=1)


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


class CarePlanGapRequest(BaseModel):
    patientId: str = Field(..., min_length=1)
    carePlanText: str = Field(..., min_length=1)
    transcript: str = ""
    patientContext: str = ""
    medicationHistory: str = ""
    alreadyAskedFields: list[str] = Field(default_factory=list)
    localMedicationComplete: bool = False
    localMedicationNameComplete: bool = False
    localDosageComplete: bool = False
    localFrequencyComplete: bool = False
    localDurationComplete: bool = False
    localFollowUpComplete: bool = False
    localWarningSignsComplete: bool = False


class ChatRequest(BaseModel):
    messages: list[dict[str, str]] = Field(..., min_length=1)


class AgentRouterRequest(BaseModel):
    patientId: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    conversation: list[dict[str, str]] = Field(default_factory=list)
    currentState: dict[str, Any] = Field(default_factory=dict)


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


def normalize_patient_context(value: dict[str, Any]) -> dict[str, Any]:
    def string_list(key: str) -> list[str]:
        raw = value.get(key, [])
        if not isinstance(raw, list):
            return []
        seen: set[str] = set()
        output: list[str] = []
        for item in raw:
            text = str(item).strip()
            key_text = text.lower()
            if not text or key_text in seen:
                continue
            seen.add(key_text)
            output.append(text)
        return output

    return {
        "visitReason": str(value.get("visitReason", "") or "").strip(),
        "symptoms": string_list("symptoms"),
        "medications": string_list("medications"),
        "onset": str(value.get("onset", "") or "").strip(),
        "duration": str(value.get("duration", "") or "").strip(),
        "patientNotes": string_list("patientNotes"),
        "concerns": string_list("concerns"),
        "questionsForDoctor": string_list("questionsForDoctor"),
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
                    "If the doctor asks for patient details, symptoms, medications, history, or reason for visit, "
                    "summarize the approved patient context for a physician in less than 100 words. "
                    "If the doctor asks for patient context, identify requestedFields and missingFields using only "
                    "these exact field names: reason for visit, symptoms, medications, allergies, medical history, "
                    "duration, concerns, questions for doctor. missingFields must include only requested fields "
                    "that are absent from the approved patient context. If information is missing, write a brief "
                    "patientClarificationQuestion asking the patient for the most important missing item. "
                    "Set includePreviousVisitHistory true only when previous visit or medical history is requested. "
                    "Remove duplicates, normalize medication names, and present only clinically relevant facts. "
                    "Never dump raw JSON or database fields. Never say standard dose, prenatal one, "
                    "prenatal vitamin one tablet, or duplicate medication names. "
                    "Use approved visit memory only when relevant. Return JSON only with keys "
                    "speaker, intent, confidence, shouldRespond, response, requestedFields, missingFields, "
                    "patientClarificationQuestion, includePreviousVisitHistory, memoryUsed."
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
                    "Do not invent medical facts. Keep only clear facts. Use sections: Reason for Visit, "
                    "Current Symptoms, Current Medications, Patient Notes, Allergies, Conditions. "
                    "Use the patient name exactly as provided. If UTI or urinary discomfort appears, set Reason for Visit "
                    "to 'Possible urinary tract infection symptoms.' and Current Symptoms to 'Burning or discomfort while urinating.' "
                    "If Reason for Visit is blank but clear symptoms, concerns, onset, or duration exist, infer a concise "
                    "reason from those facts, for example 'Severe sore throat with difficulty speaking for four days.' "
                    "Never write 'Not clearly captured yet' when clear symptoms are available. "
                    "Deduplicate medications by normalized name. prenatal/prenatal vitamin/prenatal one means Prenatal vitamin. "
                    "vitamin B12/B12/vb12 means Vitamin B12. vitamin D/D3 means Vitamin D. "
                    "Show each medication only once. Never say standard dose. If dosage is unknown, omit dosage and write "
                    "'Vitamin B12 — once daily', not 'Vitamin B12 standard dose — once daily'. "
                    "Return only clean text."
                ),
            },
            {
                "role": "user",
                "content": req.rawPatientContext,
            },
        ],
        max_tokens=320,
        model=os.getenv("QWEN_CHAT_MODEL", "qwen-plus").strip() or "qwen-plus",
    )
    return {
        "patientId": req.patientId,
        "qwen": os.getenv("QWEN_CHAT_MODEL", "qwen-plus").strip() or "qwen-plus",
        "summary": reply.strip(),
    }


@app.post("/api/medsbuddy/doctor-handoff")
async def doctor_handoff(req: DoctorHandoffRequest) -> dict[str, Any]:
    logger.info("Alibaba ECS API called: doctor-handoff")
    chat_model = os.getenv("QWEN_CHAT_MODEL", "qwen-plus").strip() or "qwen-plus"
    reply = await qwen_chat(
        [
            {
                "role": "system",
                "content": (
                    "Summarize the approved patient context for a physician in less than 100 words. "
                    "Remove duplicates, normalize medication names, and present only clinically relevant facts. "
                    "Use concise section labels. Never dump raw JSON or database fields. "
                    "Never say standard dose, prenatal one, prenatal vitamin one tablet, or duplicate medication names. "
                    "Normalize prenatal/prenatal vitamin/prenatal one to Prenatal vitamin; "
                    "vitamin B12/B12/vb12 to Vitamin B12; vitamin D/D3 to Vitamin D. "
                    "If UTI, urinary discomfort, burning, or discomfort while urinating appears, say Reason for today's visit: "
                    "Possible urinary tract infection symptoms. If Reason for Visit is blank but symptoms or concerns exist, "
                    "infer a concise reason from those approved facts. Never say 'Not clearly captured yet'. "
                    "Return only the spoken handoff text."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "patientId": req.patientId,
                        "approvedPreVisitSummary": req.approvedPreVisitSummary,
                        "patientContext": req.patientContext,
                        "medicationHistory": req.medicationHistory,
                    }
                ),
            },
        ],
        max_tokens=180,
        model=chat_model,
    )
    return {"patientId": req.patientId, "qwen": chat_model, "handoff": reply.strip()}


@app.post("/api/medsbuddy/extract-patient-context")
async def extract_patient_context(req: ExtractPatientContextRequest) -> dict[str, Any]:
    logger.info("Alibaba ECS API called: extract-patient-context")
    conversation = [
        {
            "role": message.role if message.role in {"user", "assistant"} else "user",
            "content": message.content,
        }
        for message in req.conversation[-12:]
        if message.content.strip()
    ]
    reply = await qwen_chat(
        [
            {
                "role": "system",
                "content": (
                    "You extract structured patient context for MedsBuddy's doctor visit prep. "
                    "Use only facts stated in the conversation. Do not diagnose. Do not invent. "
                    "Focus on today's visit. Return JSON only with exact keys: visitReason, "
                    "symptoms, medications, onset, duration, patientNotes, concerns, questionsForDoctor. "
                    "All list fields must be arrays of short strings. Empty unknown fields must be empty "
                    "strings or empty arrays."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "patientId": req.patientId,
                        "conversation": conversation,
                    }
                ),
            },
        ],
        max_tokens=420,
        model=os.getenv("QWEN_CHAT_MODEL", "qwen-plus").strip() or "qwen-plus",
    )
    parsed = parse_qwen_json(reply, "extract_patient_context")
    return {
        "patientId": req.patientId,
        "qwen": os.getenv("QWEN_CHAT_MODEL", "qwen-plus").strip() or "qwen-plus",
        "patientContext": normalize_patient_context(parsed),
    }


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
                    "Use the cleaned clinical transcript and approved patient context as the source of truth. "
                    "Do not include raw STT artifacts, wake words, commands, or consent/introduction messages. "
                    "Exclude phrases like please be quiet, stop talking, do not speak, Miss buddy, MedsBuddy wake words, "
                    "Ariana Grande, and repeated duplicate instructions. "
                    "If the doctor gave medication instructions, extract them into patient-friendly medication guidance. "
                    "For example, 'use those tablets for one week, morning one tablet and evening one tablet' means "
                    "'Take one tablet in the morning and one tablet in the evening for one week.' "
                    "Do not say no medication changes if medication instructions exist. "
                    "Do not put raw transcript under follow-up instructions. "
                    "Include only clinically relevant discussed facts and keep wording natural, professional, and patient-friendly. "
                    "Organize the content as a healthcare assistant would: reason for visit, patient symptoms, "
                    "doctor assessment, diagnosis status as confirmed/possible/not confirmed, medication instructions, "
                    "follow-up plan, warning signs, MedsBuddy clarification questions, summarized doctor responses, "
                    "plain-language explanation, and caregiver summary. "
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


@app.post("/api/medsbuddy/care-plan-gap")
async def care_plan_gap(req: CarePlanGapRequest) -> dict[str, Any]:
    logger.info("Alibaba ECS API called: care-plan-gap")
    reply = await qwen_chat(
        [
            {
                "role": "system",
                "content": (
                    "You are MedsBuddy, an AI Patient Advocate. Identify what is still missing "
                    "from the doctor's care plan. Check only these fields: medication name, dosage, "
                    "frequency, duration, follow-up, warning signs. Do not ask about a medication "
                    "field that is already complete. If medication name, dosage, frequency, and "
                    "duration are complete, ask about warning signs or follow-up timing instead. "
                    "If the doctor said antibiotics without a medication name, ask exactly: "
                    "'Doctor, could you confirm the antibiotic name?' Ask only one useful question. "
                    "If all fields are complete, acknowledge that the care plan is updated. "
                    "Return JSON only with keys missingFields, nextField, question, allComplete, reason."
                ),
            },
            {
                "role": "user",
                "content": "\n\n".join(
                    [
                        f"Patient ID: {req.patientId}",
                        f"Care plan text:\n{req.carePlanText}",
                        f"Current visit transcript:\n{req.transcript or 'Not provided.'}",
                        f"Patient context:\n{req.patientContext or 'Not provided.'}",
                        f"Medication history:\n{req.medicationHistory or 'Not provided.'}",
                        f"Already asked fields: {', '.join(req.alreadyAskedFields) or 'None'}",
                        "Local field detection:",
                        f"- medication complete: {req.localMedicationComplete}",
                        f"- medication name complete: {req.localMedicationNameComplete}",
                        f"- dosage complete: {req.localDosageComplete}",
                        f"- frequency complete: {req.localFrequencyComplete}",
                        f"- duration complete: {req.localDurationComplete}",
                        f"- follow-up complete: {req.localFollowUpComplete}",
                        f"- warning signs complete: {req.localWarningSignsComplete}",
                    ]
                ),
            },
        ],
        max_tokens=260,
    )
    return {
        "patientId": req.patientId,
        "qwen": get_qwen_config()["model"],
        "result": parse_qwen_json(reply, "care_plan_gap"),
    }


@app.post("/api/medsbuddy/chat")
async def medsbuddy_chat(req: ChatRequest) -> dict[str, Any]:
    logger.info("Alibaba ECS API called: chat")
    chat_model = os.getenv("QWEN_CHAT_MODEL", "qwen-plus").strip() or "qwen-plus"
    reply = await qwen_chat(req.messages, max_tokens=180, model=chat_model)
    return {"reply": reply, "qwen": chat_model}


@app.post("/api/medsbuddy/agent-router")
async def medsbuddy_agent_router(req: AgentRouterRequest) -> dict[str, Any]:
    logger.info("Alibaba ECS API called: agent-router")
    chat_model = os.getenv("QWEN_CHAT_MODEL", "qwen-plus").strip() or "qwen-plus"
    reply = await qwen_chat(
        [
            {
                "role": "system",
                "content": (
                    "You are MedsBuddy's AI Agent Router inside the MedsBuddy app. "
                    "Classify the user's message into one app action. You are allowed to navigate app pages, "
                    "save health data, prepare doctor visit context, generate QR flow, create chats, and answer normally. "
                    "Never say you cannot navigate pages. Return JSON only with exact keys: "
                    "intent, action, data, needsSave, navigateTo, response. "
                    "Allowed actions: update_profile, add_symptom, remove_symptom, add_medication, log_dose, doctor_visit_prep, navigate, "
                    "generate_qr, new_chat, open_previous_chat, generate_doctor_visit_summary, answer, ask_follow_up. "
                    "Allowed navigateTo values: /doctor, /reminders, /memory, /emergency, /talk, /profile, /. "
                    "For profile data, data may include name, dob, bloodGroup, allergies, conditions, "
                    "emergencyContacts, primaryPhysician. "
                    "For symptoms, data may include symptoms array with name, severity, notes, onset, duration, "
                    "and visitReason. "
                    "If the user asks to remove/delete/clear a symptom, use action remove_symptom with data.keyword. "
                    "For UTI removal, keyword should be UTI. "
                    "When adding UTI symptoms, create one clean symptom unless the user clearly gives separate symptoms: "
                    "name 'Possible urinary tract infection symptoms' and notes 'Burning or discomfort while urinating'. "
                    "For medications, data may include medications array with name, dosage, frequency, timing. "
                    "If the user says they already took, have taken, took, or completed a medication dose, use action log_dose with data.medicationName and data.status='taken'. Do not add the medication again. "
                    "For doctor visit prep, data may include visitReason, symptoms, concerns, questionsForDoctor, "
                    "timeline, onset, duration, patientNotes. "
                    "If the user only says an acknowledgement like okay, awesome, great, thanks, got it, or sounds good, "
                    "use action answer, needsSave false, and do not repeat or re-save previous symptoms or visit prep. "
                    "If data is unclear, use action ask_follow_up, needsSave false, and ask one short question. "
                    "Keep response warm, simple, and human. Do not invent medical facts."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "patientId": req.patientId,
                        "message": req.message,
                        "recentConversation": req.conversation[-8:],
                        "currentState": req.currentState,
                    }
                ),
            },
        ],
        max_tokens=420,
        model=chat_model,
    )
    parsed = parse_qwen_json(reply, "agent_router")
    if not isinstance(parsed.get("data"), dict):
        parsed["data"] = {}
    parsed.setdefault("intent", "")
    parsed.setdefault("action", "answer")
    parsed.setdefault("needsSave", False)
    parsed.setdefault("navigateTo", "")
    parsed.setdefault("response", "")
    return {"patientId": req.patientId, "qwen": chat_model, "result": parsed}


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
            "POST /api/medsbuddy/extract-patient-context",
            "POST /api/medsbuddy/doctor-handoff",
            "POST /api/medsbuddy/agent-router",
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
async def elevenlabs_stt(
    request: Request,
    audio: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None),
) -> Response | dict[str, str]:
    key = os.getenv("ELEVENLABS_API_KEY", "").strip()
    if not key:
        raise HTTPException(status_code=500, detail="Missing ELEVENLABS_API_KEY")

    request_content_type = request.headers.get("content-type", "")
    upload = audio or file
    upload_field_name = "audio" if audio is not None else "file" if file is not None else ""

    if upload is None:
        logger.error(
            "[ElevenLabs STT] Missing audio upload: %s",
            {"request.content_type": request_content_type, "accepted_fields": ["audio", "file"]},
        )
        return JSONResponse(
            status_code=400,
            content={
                "error": "audio file required",
                "requestContentType": request_content_type,
                "acceptedFields": ["audio", "file"],
            },
        )

    audio_bytes = await upload.read()
    uploaded_filename = upload.filename or "doctor-visit.webm"
    uploaded_mime_type = upload.content_type or "application/octet-stream"
    uploaded_file_size = len(audio_bytes)
    first_20_bytes = audio_bytes[:20].hex()

    logger.info(
        "[ElevenLabs STT] Incoming upload: %s",
        {
            "request.content_type": request_content_type,
            "uploaded_field_name": upload_field_name,
            "uploaded_filename": uploaded_filename,
            "uploaded_mime_type": uploaded_mime_type,
            "uploaded_file_size": uploaded_file_size,
            "first_20_bytes": first_20_bytes,
        },
    )

    if uploaded_file_size == 0:
        return JSONResponse(
            status_code=400,
            content={
                "error": "uploaded audio file is empty",
                "requestContentType": request_content_type,
                "uploadedFieldName": upload_field_name,
                "uploadedFilename": uploaded_filename,
                "uploadedMimeType": uploaded_mime_type,
                "uploadedFileSize": uploaded_file_size,
                "first20Bytes": first_20_bytes,
            },
        )

    files = {"file": (uploaded_filename, audio_bytes, uploaded_mime_type)}
    data = {
        "model_id": "scribe_v2",
        "tag_audio_events": "false",
        "diarize": "true",
        "num_speakers": "2",
    }

    logger.info(
        "[ElevenLabs STT] Request payload: %s",
        {
            "url": "https://api.elevenlabs.io/v1/speech-to-text",
            "method": "POST",
            "data": data,
            "files": {
                "file": {
                    "filename": uploaded_filename,
                    "incoming_field_name": upload_field_name,
                    "content_type": uploaded_mime_type,
                    "size": uploaded_file_size,
                    "first_20_bytes": first_20_bytes,
                }
            },
        },
    )

    async with httpx.AsyncClient(timeout=90) as client:
        try:
            response = await client.post(
                "https://api.elevenlabs.io/v1/speech-to-text",
                headers={"xi-api-key": key},
                data=data,
                files=files,
            )
        except httpx.HTTPError as exc:
            logger.exception("[ElevenLabs STT] Request failed before response")
            return JSONResponse(
                status_code=502,
                content={
                    "error": "ElevenLabs STT request failed",
                    "backendError": str(exc),
                    "requestContentType": request_content_type,
                    "uploadedFieldName": upload_field_name,
                    "uploadedFilename": uploaded_filename,
                    "uploadedMimeType": uploaded_mime_type,
                    "uploadedFileSize": uploaded_file_size,
                    "first20Bytes": first_20_bytes,
                },
            )

    response_body = response.text
    logger.info(
        "[ElevenLabs STT] Response: %s",
        {"status_code": response.status_code, "body": response_body},
    )

    if response.status_code >= 400:
        return JSONResponse(
            status_code=response.status_code,
            content={
                "error": "ElevenLabs STT failed",
                "status": response.status_code,
                "elevenLabsResponseBody": response_body,
                "requestContentType": request_content_type,
                "uploadedFieldName": upload_field_name,
                "uploadedFilename": uploaded_filename,
                "uploadedMimeType": uploaded_mime_type,
                "uploadedFileSize": uploaded_file_size,
                "first20Bytes": first_20_bytes,
            },
        )

    try:
        data = response.json()
    except ValueError:
        return JSONResponse(
            status_code=502,
            content={
                "error": "ElevenLabs STT returned invalid JSON",
                "status": response.status_code,
                "elevenLabsResponseBody": response_body,
            },
        )

    transcript = str(data.get("text") or "").strip()
    return {"text": transcript, "rawText": transcript}


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
