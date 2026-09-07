import httpx
from fastapi import HTTPException
from app.config import settings


async def ask_ollama(prompt: str) -> str:
    """Send prompt to local Ollama / OpenAI-compatible endpoint and return generated answer."""
    url = f"{settings.LLM_BASE_URL}/chat/completions"
    payload = {
        "model": settings.LLM_MODEL,
        "messages": [{"role": "user", "content": prompt}]
    }
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail=f"Unable to connect to Ollama service at {settings.LLM_BASE_URL}. Ensure Docker / Ollama container is running."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ollama LLM service request failed: {str(e)}"
        )
