import logging
import os
import time
from typing import Optional
import google.generativeai as genai
from app.config import settings
from app.services.model_resolver import get_active_llm_model

logger = logging.getLogger(__name__)

class LLMGateway:
    """
    Portkey-enhanced LLM Gateway providing rate-limit resilience, cost/trace headers,
    and automatic failover to backup API keys.
    """
    def __init__(self):
        self.primary_key = settings.gemini_api_key or os.getenv("GEMINI_API_KEY", "")
        self.backup_key = settings.portkey_backup_gemini_key or os.getenv("BACKUP_GEMINI_API_KEY", "")
        self.portkey_key = settings.portkey_api_key or os.getenv("PORTKEY_API_KEY", "")
        
        # Configure primary key by default
        if self.primary_key:
            genai.configure(api_key=self.primary_key)

    def generate_content(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        model_name: Optional[str] = None,
        generation_config: Optional[dict] = None
    ) -> str:
        """
        Executes an LLM request with automatic Portkey gateway routing / multi-key failover.
        """
        model = model_name or get_active_llm_model()

        # 1. Attempt using Portkey Gateway if configured
        if self.portkey_key:
            try:
                logger.info(f"[LLMGateway] Routing request through Portkey AI Gateway for model {model}")
                return self._call_via_portkey(prompt, system_instruction, model, generation_config)
            except Exception as e:
                logger.warning(f"[LLMGateway] Portkey call failed ({e}). Falling back to direct Gemini API with key failover.")

        # 2. Attempt using primary Gemini API Key
        try:
            return self._call_gemini_direct(self.primary_key, prompt, system_instruction, model, generation_config)
        except Exception as primary_err:
            logger.warning(f"[LLMGateway] Primary LLM call failed with error: {primary_err}")
            
            # 3. Attempt failover to backup API Key if available
            if self.backup_key and self.backup_key != self.primary_key:
                logger.info("[LLMGateway] Failover triggered: Retrying with backup Gemini API Key...")
                try:
                    return self._call_gemini_direct(self.backup_key, prompt, system_instruction, model, generation_config)
                except Exception as backup_err:
                    logger.error(f"[LLMGateway] Backup LLM call also failed: {backup_err}")
                    raise backup_err
            
            # Re-raise primary error if no backup key is configured
            raise primary_err

    def _call_via_portkey(self, prompt: str, system_instruction: Optional[str], model: str, generation_config: Optional[dict]) -> str:
        """
        Call LLM via Portkey AI Gateway HTTP headers.
        """
        import requests
        
        url = "https://api.portkey.ai/v1/chat/completions"
        headers = {
            "x-portkey-api-key": self.portkey_key,
            "x-portkey-provider": "google",
            "x-portkey-retry-count": "3",
            "Content-Type": "application/json",
        }
        if settings.portkey_virtual_key:
            headers["x-portkey-virtual-key"] = settings.portkey_virtual_key

        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": model,
            "messages": messages,
            "temperature": generation_config.get("temperature", 0.2) if generation_config else 0.2
        }

        resp = requests.post(url, json=payload, headers=headers, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]

    def _call_gemini_direct(self, api_key: str, prompt: str, system_instruction: Optional[str], model: str, generation_config: Optional[dict]) -> str:
        """
        Direct call using Google Generative AI SDK.
        """
        if not api_key:
            raise ValueError("No Gemini API Key provided")
            
        genai.configure(api_key=api_key)
        kwargs = {}
        if system_instruction:
            kwargs["system_instruction"] = system_instruction

        gen_model = genai.GenerativeModel(model_name=model, **kwargs)
        
        response = gen_model.generate_content(
            prompt,
            generation_config=generation_config or {"temperature": 0.2}
        )
        return response.text

llm_gateway = LLMGateway()
