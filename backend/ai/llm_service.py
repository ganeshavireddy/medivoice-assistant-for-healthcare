"""
MediVoice AI - LLM Service Module

Handles communication with Large Language Models (OpenAI GPT and Gemini).
Supports modern OpenAI SDK v1.0+ and Google Generative AI with graceful fallbacks.
"""

import os
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class LLMService:
    """Service for interacting with LLMs."""

    def __init__(self):
        self.default_provider = os.getenv("DEFAULT_LLM_PROVIDER", "openai")
        self.default_model = os.getenv("DEFAULT_MODEL_NAME", "gpt-4o-mini")

    async def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> Optional[str]:
        """Generate a response from the LLM if keys are configured."""
        provider = provider or self.default_provider
        model = model or self.default_model

        try:
            if provider == "gemini" and os.getenv("GEMINI_API_KEY"):
                return await self._generate_gemini(prompt, system_prompt, model, temperature, max_tokens)
            elif os.getenv("OPENAI_API_KEY"):
                return await self._generate_openai(prompt, system_prompt, model, temperature, max_tokens)
            elif os.getenv("GEMINI_API_KEY"):
                return await self._generate_gemini(prompt, system_prompt, "gemini-1.5-flash", temperature, max_tokens)
            else:
                logger.info("No LLM API keys configured. Using local medical intelligence engine.")
                return None
        except Exception as e:
            logger.warning(f"LLM generation failed: {e}. Falling back to medical knowledge engine.")
            return None

    async def _generate_openai(
        self,
        prompt: str,
        system_prompt: Optional[str],
        model: str,
        temperature: float,
        max_tokens: int,
    ) -> str:
        """Generate response using modern OpenAI SDK."""
        from openai import OpenAI
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("No OPENAI_API_KEY set")

        client = OpenAI(api_key=api_key)
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content.strip()

    async def _generate_gemini(
        self,
        prompt: str,
        system_prompt: Optional[str],
        model: str,
        temperature: float,
        max_tokens: int,
    ) -> str:
        """Generate response using Gemini API."""
        import google.generativeai as genai
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("No GEMINI_API_KEY set")

        genai.configure(api_key=api_key)
        gen_model = genai.GenerativeModel(model_name=model)

        full_prompt = (system_prompt + "\n\n" if system_prompt else "") + prompt
        response = gen_model.generate_content(
            full_prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            ),
        )
        return response.text.strip()

    def get_available_providers(self) -> list:
        """Get list of available LLM providers."""
        providers = []
        if os.getenv("OPENAI_API_KEY"):
            providers.append("openai")
        if os.getenv("GEMINI_API_KEY"):
            providers.append("gemini")
        return providers


llm_service = LLMService()
