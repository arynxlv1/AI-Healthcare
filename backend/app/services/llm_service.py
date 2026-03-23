import httpx
import json
from typing import AsyncGenerator, List, Optional, Tuple
from ..core.config import settings

_NURSE_SYSTEM = """You are Nurse AI, a compassionate and knowledgeable medical assistant chatbot. 
You help patients understand their symptoms, medications, and general health questions.
You are warm, clear, and always remind patients to consult a real doctor for diagnosis or treatment.
Keep responses concise (2-4 sentences unless more detail is needed). Never diagnose definitively."""

_DIAGNOSTIC_SYSTEM = """You are a clinical diagnostic AI nurse conducting a structured medical interview.
Your job is to ask targeted multiple-choice questions to identify the patient's condition.

RULES:
- Ask ONE question at a time. Never ask multiple questions at once.
- Each question must have exactly 4 options labeled A, B, C, D.
- Questions should progressively narrow down the diagnosis.
- After 20-25 questions (or when confident), output the final diagnosis block.
- Cover: primary complaint, duration, severity, associated symptoms, triggers, medical history, medications.

QUESTION FORMAT (use exactly):
QUESTION: <question text>
A) <option>
B) <option>
C) <option>
D) <option>

FINAL DIAGNOSIS FORMAT (use exactly when ready):
DIAGNOSIS_COMPLETE
PRIMARY: <disease name>
RISK: <low|medium|high|critical>
CONFIDENCE: <0-100>%
ALTERNATIVES: <disease2> (<pct>%), <disease3> (<pct>%)
STEPS:
- <step 1>
- <step 2>
- <step 3>
- <step 4>
SUMMARY: <2-3 sentence clinical summary explaining the diagnosis based on the patient's answers>"""


class LLMService:
    def __init__(self):
        self.base_url = f"{settings.OLLAMA_BASE_URL}/api/generate"
        self.chat_url = f"{settings.OLLAMA_BASE_URL}/api/chat"
        self.model = settings.OLLAMA_MODEL

    async def stream_reasoning(
        self,
        disease_label: str,
        symptom_text: Optional[str],
        context_docs: List[str],
        risk_level: str = "low",
        immediate_steps: Optional[List[str]] = None,
        top_predictions: Optional[List[dict]] = None,
    ) -> AsyncGenerator[str, None]:
        prompt = self._construct_prompt(
            disease_label, symptom_text, context_docs,
            risk_level, immediate_steps or [], top_predictions or []
        )

        payload = {"model": self.model, "prompt": prompt, "stream": True}

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", self.base_url, json=payload) as response:
                    if response.status_code != 200:
                        yield json.dumps({"error": "AI assistant temporarily unavailable", "type": "backend_error", "done": True})
                        return

                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                            yield json.dumps({"token": data.get("response", ""), "done": data.get("done", False)})
                        except json.JSONDecodeError:
                            yield json.dumps({"error": "Malformed AI response", "type": "parsing_error", "done": True})
                            return

        except httpx.ConnectError:
            yield json.dumps({"error": "AI assistant offline — is Ollama running?", "type": "conn_error", "done": True})
        except httpx.ReadTimeout:
            yield json.dumps({"error": "AI response timed out — try again", "type": "timeout", "done": True})
        except Exception as e:
            yield json.dumps({"error": str(e), "type": "misc_error", "done": True})

    def _construct_prompt(
        self,
        label: str,
        symptoms: Optional[str],
        context: List[str],
        risk_level: str,
        steps: List[str],
        predictions: List[dict],
    ) -> str:
        context_str = "\n".join(context) if context else "No additional context available."
        steps_str = "\n".join(f"- {s}" for s in steps)
        alt_str = "\n".join(
            f"- {p['label']}: {p['percentage']}%" for p in predictions[1:4]
        ) if len(predictions) > 1 else "None"

        return f"""You are a clinical AI assistant providing a structured medical assessment. Be concise, professional, and empathetic.

PATIENT SYMPTOMS: {symptoms or "Not provided"}
PRIMARY DIAGNOSIS: {label}
RISK LEVEL: {risk_level.upper()}
CONFIDENCE: {predictions[0]['percentage'] if predictions else 'N/A'}%

ALTERNATIVE DIAGNOSES:
{alt_str}

MEDICAL CONTEXT:
{context_str}

IMMEDIATE RECOMMENDED STEPS:
{steps_str}

Provide a structured clinical reasoning in this exact format:

## Clinical Assessment

**Primary Diagnosis:** {label}
**Risk Level:** {risk_level.upper()}
**Confidence:** {predictions[0]['percentage'] if predictions else 'N/A'}%

## Why This Diagnosis

[2-3 sentences explaining how the reported symptoms match {label}. Be specific about which symptoms are most indicative.]

## Risk Explanation

[1-2 sentences explaining what the {risk_level} risk level means for this patient and what could happen if untreated.]

## Immediate Steps

{steps_str}

## When to Seek Emergency Care

[1 sentence describing specific warning signs that require immediate emergency attention for {label}.]

---
*This AI assessment is for informational purposes only and does not replace professional medical advice.*"""


    async def stream_chat(
        self,
        message: str,
        history: Optional[List[Tuple[str, str]]] = None,
    ) -> AsyncGenerator[str, None]:
        """Free-form nurse chatbot using Ollama /api/chat with message history."""
        messages = [{"role": "system", "content": _NURSE_SYSTEM}]
        for role, content in (history or []):
            messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": message})

        payload = {"model": self.model, "messages": messages, "stream": True}

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", self.chat_url, json=payload) as response:
                    if response.status_code != 200:
                        yield json.dumps({"error": "AI nurse temporarily unavailable", "done": True})
                        return
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                            token = data.get("message", {}).get("content", "")
                            done = data.get("done", False)
                            yield json.dumps({"token": token, "done": done})
                        except json.JSONDecodeError:
                            continue
        except httpx.ConnectError:
            yield json.dumps({"error": "Ollama is not running. Start it with `ollama serve`.", "type": "conn_error", "done": True})
        except httpx.ReadTimeout:
            yield json.dumps({"error": "Response timed out — try again.", "type": "timeout", "done": True})
        except Exception as e:
            yield json.dumps({"error": str(e), "done": True})


    async def stream_diagnostic(
        self,
        history: List[Tuple[str, str]],  # (role, content) pairs
    ) -> AsyncGenerator[str, None]:
        """Drives the MCQ diagnostic interview. Each call advances the conversation by one turn."""
        messages = [{"role": "system", "content": _DIAGNOSTIC_SYSTEM}]
        for role, content in history:
            messages.append({"role": role, "content": content})

        payload = {"model": self.model, "messages": messages, "stream": True}

        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                async with client.stream("POST", self.chat_url, json=payload) as response:
                    if response.status_code != 200:
                        yield json.dumps({"error": "AI unavailable", "done": True})
                        return
                    full = ""
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                            token = data.get("message", {}).get("content", "")
                            full += token
                            done = data.get("done", False)
                            yield json.dumps({"token": token, "done": done, "full": full if done else ""})
                        except json.JSONDecodeError:
                            continue
        except httpx.ConnectError:
            yield json.dumps({"error": "Ollama is not running.", "type": "conn_error", "done": True})
        except httpx.ReadTimeout:
            yield json.dumps({"error": "Response timed out.", "type": "timeout", "done": True})
        except Exception as e:
            yield json.dumps({"error": str(e), "done": True})


llm_service = LLMService()
