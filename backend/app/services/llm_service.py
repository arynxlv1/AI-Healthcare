import httpx
import json
from typing import AsyncGenerator, List, Optional
from ..core.config import settings

class LLMService:
    def __init__(self):
        self.base_url = f"{settings.OLLAMA_BASE_URL}/api/generate"
        self.model = settings.OLLAMA_MODEL

    async def stream_reasoning(
        self, 
        disease_label: str, 
        symptom_text: Optional[str], 
        context_docs: List[str]
    ) -> AsyncGenerator[str, None]:
        """
        Streams clinical reasoning via SSE.
        Handles three failure modes as per Phase 3 requirement.
        """
        
        prompt = self._construct_prompt(disease_label, symptom_text, context_docs)
        
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": True
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                async with client.stream("POST", self.base_url, json=payload) as response:
                    # Failure Mode 1: Ollama not running (Connection Refused is caught by try/except)
                    if response.status_code != 200:
                        yield "data: " + json.dumps({"error": "AI assistant temporarily unavailable", "type": "backend_error"}) + "\n\n"
                        return

                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        
                        try:
                            # Failure Mode 3: Malformed Response
                            data = json.loads(line)
                            token = data.get("response", "")
                            done = data.get("done", False)
                            
                            yield f"data: {json.dumps({'token': token, 'done': done})}\n\n"
                            
                        except json.JSONDecodeError:
                            # Fallback as per plan
                            yield "data: " + json.dumps({"error": "Malformed response from AI", "type": "parsing_error"}) + "\n\n"
                            return

        except httpx.ConnectError:
            # Failure Mode 1: Ollama not running
            yield "data: " + json.dumps({"error": "AI assistant temporarily unavailable (Connection Refused)", "type": "conn_error"}) + "\n\n"
        except httpx.ReadTimeout:
            # Failure Mode 2: Ollama slow
            yield "data: " + json.dumps({"error": "Response taking longer than expected — please try again", "type": "timeout"}) + "\n\n"
        except Exception as e:
            yield "data: " + json.dumps({"error": f"Unexpected error: {str(e)}", "type": "misc_error"}) + "\n\n"

    def _construct_prompt(self, label: str, symptoms: Optional[str], context: List[str]) -> str:
        context_str = "\n".join(context)
        return f"""
        [CONTEXT]
        {context_str}
        
        [PATIENT DATA]
        Symptoms: {symptoms if symptoms else "Not provided"}
        Probable Diagnosis: {label}
        
        [INSTRUCTION]
        Provide a concise clinical reasoning for why the patient might be suffering from {label}. 
        Focus on matching the reported symptoms with the provided medical context.
        Keep it professional and data-driven.
        """

llm_service = LLMService()
