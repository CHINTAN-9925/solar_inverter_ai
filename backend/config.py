import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

BASE_DIR = Path(__file__).parent

class Config:
    # ── MongoDB ────────────────────────────────────────────────────────────
    MONGO_URI  = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
    MONGO_DB   = os.getenv('MONGO_DB',  'solarai')

    # ── Model ─────────────────────────────────────────────────────────────
    MODEL_PATH = BASE_DIR / 'models' / 'model.pkl'

    # ── Flask ─────────────────────────────────────────────────────────────
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
    DEBUG        = os.getenv('FLASK_DEBUG', 'true').lower() == 'true'

    # ── LLM (not used yet — wire up when ready) ───────────────────────────
    # Uncomment and set these when connecting an LLM provider.
    # See routes/explain.py and routes/query.py for the LLM HOOK comments.
    #
    # OPENAI_API_KEY  = os.getenv('OPENAI_API_KEY', '')
    # OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', '')
    # OLLAMA_MODEL    = os.getenv('OLLAMA_MODEL', 'mistral')
    # LLM_MODEL       = os.getenv('LLM_MODEL', 'gpt-4o-mini')
