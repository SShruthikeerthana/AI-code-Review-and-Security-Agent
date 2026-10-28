import logging
import threading
import time

import google.generativeai as genai

from app.config import settings

logger = logging.getLogger(__name__)

# Preference ladder of active Gemini models
MODEL_FALLBACK_LADDER = [
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
]

_cache_lock = threading.Lock()
_cached_model: str | None = None
_cache_ts: float = 0.0
_CACHE_TTL_SECONDS = 300


def _candidate_models() -> list[str]:
    configured = (settings.llm_model or "").strip()
    candidates = []
    if configured:
        candidates.append(configured)
    candidates.extend(MODEL_FALLBACK_LADDER)
    seen = set()
    unique = []
    for c in candidates:
        if c and c not in seen:
            seen.add(c)
            unique.append(c)
    return unique


def get_active_llm_model() -> str:
    """
    Returns a Gemini model name that is actually alive.

    Strategy:
    1. Serve from cache when fresh.
    2. Ask the Gemini API (list_models) which models support generateContent,
       then pick the first candidate present - this automatically skips any
       retired model names and survives Google's retirement cadence.
    3. If discovery fails (no key/network), fall back to the static ladder head
       so calls at least target a known-current model name.
    """
    global _cached_model, _cache_ts

    with _cache_lock:
        if _cached_model and (time.time() - _cache_ts) < _CACHE_TTL_SECONDS:
            return _cached_model

    chosen = MODEL_FALLBACK_LADDER[0]
    try:
        api_key = settings.gemini_api_key or __import__("os").getenv("GEMINI_API_KEY", "")
        if api_key:
            genai.configure(api_key=api_key)
            supported = set()
            for m in genai.list_models():
                if "generateContent" in getattr(m, "supported_generation_methods", []):
                    supported.add(m.name.replace("models/", ""))
            for candidate in _candidate_models():
                if candidate in supported:
                    chosen = candidate
                    break
            else:
                # Configured model retired/unavailable: pick best available flash model
                for m in sorted(supported):
                    if "flash" in m and "embed" not in m and "tts" not in m and "image" not in m and "live" not in m:
                        chosen = m
                        break
            logger.info(f"[ModelResolver] Active Gemini model resolved to '{chosen}'")
        else:
            logger.info(f"[ModelResolver] No GEMINI_API_KEY configured; defaulting model to '{chosen}'")
    except Exception as e:
        logger.warning(f"[ModelResolver] Model discovery failed ({e}); defaulting to '{chosen}'")

    with _cache_lock:
        _cached_model = chosen
        _cache_ts = time.time()
    return chosen


def invalidate_model_cache() -> None:
    global _cached_model, _cache_ts
    with _cache_lock:
        _cached_model = None
        _cache_ts = 0.0
