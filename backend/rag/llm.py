"""
rag/llm.py — LLM integration (NOT active yet).

This file is a placeholder for future LLM connectivity.
No LLM calls are made anywhere in the app right now.

When you are ready to connect an LLM:
  1. Uncomment the LLM config vars in config.py
  2. Add OPENAI_API_KEY (or OLLAMA_BASE_URL) to your .env file
  3. Find the "# ── LLM HOOK" comments in:
       - routes/explain.py  (POST /api/explain)
       - routes/query.py    (POST /api/query)
  4. Follow the replacement instructions in those comments

Supported providers (code ready, just needs activation):
  - OpenAI  (gpt-4o-mini recommended — fast + cheap)
  - Ollama  (local, free — run: ollama pull mistral)
"""

# LLM code preserved here for when you're ready to activate it.
# Nothing in the app imports from this file currently.

def call_llm(system: str, user: str) -> dict:
    """
    Placeholder — returns an error sentinel so any accidental caller
    falls through to the static fallback logic cleanly.

    Replace this entire function body with the real implementation
    when connecting an LLM (see module docstring above).
    """
    return {'_llm_error': 'LLM not configured — using static responses'}
