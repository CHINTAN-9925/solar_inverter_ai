"""SolarAI Flask Application factory."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from flask import Flask, jsonify

# from flask_cors import CORS
from config import Config


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)
    # CORS(app, origins=Config.CORS_ORIGINS, supports_credentials=True)

    from routes.inverters import bp as inv_bp
    from routes.explain import bp as exp_bp
    from routes.query import bp as qry_bp

    app.register_blueprint(inv_bp)
    app.register_blueprint(exp_bp)
    app.register_blueprint(qry_bp)

    @app.route("/health")
    def health():
        from db import ping, get_db

        mongo_ok = ping()
        doc_count = 0
        if mongo_ok:
            try:
                doc_count = get_db()["telemetry"].estimated_document_count()
            except Exception:
                pass
        return jsonify(
            {
                "status": "ok",
                "service": "SolarAI Backend",
                "mongodb": "connected" if mongo_ok else "unreachable — check MONGO_URI",
                "telemetry_docs": doc_count,
                "model": (
                    "ready"
                    if Config.MODEL_PATH.exists()
                    else "not trained — run: python models/train_model.py"
                ),
                "mode": "MODEL" if Config.MODEL_PATH.exists() else "DEMO",
            }
        )

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error", "detail": str(e)}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5001, debug=Config.DEBUG)
