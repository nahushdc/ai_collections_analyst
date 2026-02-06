from typing import Optional

from openai import OpenAI

from backend.config import settings

_client: Optional[OpenAI] = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


def query_llm(user_query: str, system_prompt: str) -> str:
    client = _get_client()
    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_query},
        ],
        temperature=0,
        max_tokens=10000,
    )
    return response.choices[0].message.content.strip()
