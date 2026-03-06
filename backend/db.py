"""MongoDB connection singleton — import `get_db()` anywhere in the app."""
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.database import Database
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from config import Config

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(Config.MONGO_URI, serverSelectionTimeoutMS=5000)
    return _client


def get_db() -> Database:
    return get_client()[Config.MONGO_DB]


def ping() -> bool:
    """Return True if MongoDB is reachable."""
    try:
        get_client().admin.command('ping')
        return True
    except Exception:
        return False


def ensure_indexes():
    """Create indexes for efficient queries — safe to call multiple times."""
    db = get_db()
    col = db['telemetry']
    col.create_index([('inverter_id', ASCENDING), ('timestamp', DESCENDING)])
    col.create_index([('inverter_id', ASCENDING)])
    col.create_index([('timestamp',   DESCENDING)])
    print('MongoDB indexes ensured.')
