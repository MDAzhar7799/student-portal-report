"""
=============================================================
app.py — Flask Application Entry Point
=============================================================
Technology: Python + Flask + Flask-CORS + PyMongo + JWT
REST API: All routes registered as Blueprints
=============================================================
"""

from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import sys

# Configure UTF-8 for Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Load environment variables
load_dotenv()

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import Config
from database.mongodb import get_db, ping_database, create_indexes

# ----------------------------
# Import Route Blueprints
# ----------------------------
from routes.auth_routes import auth_bp
from routes.student_routes import student_bp
from routes.course_routes import course_bp
from routes.enrollment_routes import enrollment_bp
from routes.result_routes import result_bp
from routes.analytics_routes import analytics_bp
from routes.ocr_routes import ocr_bp
from routes.mcq_routes import mcq_bp
from routes.cgpa_routes import cgpa_bp


def create_app(config_class=Config):
    """
    Flask Application Factory.
    Creates and configures the Flask app with:
    - CORS for React frontend
    - PyMongo connection to MongoDB (studentDB)
    - JWT Authentication
    - All REST API blueprints
    """
    app = Flask(__name__)
    app.config.from_object(config_class)

    # ----------------------------
    # Enable CORS (Flask-CORS)
    # ----------------------------
    CORS(
        app,
        resources={r"/api/*": {"origins": Config.CORS_ORIGINS}},
        supports_credentials=True,
    )

    # ----------------------------
    # Initialize MongoDB (PyMongo ⭐)
    # ----------------------------
    with app.app_context():
        success, message = ping_database()
        if success:
            print(f"🍃 {message}")
            create_indexes()
            _seed_admin_user()
        else:
            print(f"⚠️  {message}")
            print("   Server will start but database operations may fail.")

    # ----------------------------
    # Register REST API Blueprints
    # ----------------------------
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(student_bp, url_prefix="/api/students")
    app.register_blueprint(course_bp, url_prefix="/api/courses")
    app.register_blueprint(enrollment_bp, url_prefix="/api/enrollments")
    app.register_blueprint(result_bp, url_prefix="/api/results")
    app.register_blueprint(analytics_bp, url_prefix="/api/analytics")
    app.register_blueprint(ocr_bp, url_prefix="/api/ocr")
    app.register_blueprint(mcq_bp, url_prefix="/api/mcq")
    app.register_blueprint(cgpa_bp, url_prefix="/api/cgpa")

    # ----------------------------
    # Health Check Endpoint
    # ----------------------------
    @app.route("/api/health", methods=["GET"])
    def health_check():
        """Health check for the REST API + MongoDB connection."""
        db_ok, db_msg = ping_database()
        return jsonify(
            {
                "status": "healthy" if db_ok else "degraded",
                "api": "Student Records REST API v1.0",
                "database": db_msg,
                "technologies": {
                    "backend": "Flask (Python)",
                    "database": "MongoDB ⭐",
                    "driver": "PyMongo ⭐",
                    "auth": "JWT",
                    "ocr": "OpenCV + pytesseract",
                },
            }
        )

    @app.route("/api", methods=["GET"])
    def api_root():
        """API root — lists all available endpoints."""
        return jsonify(
            {
                "message": "Student Records & Course Management REST API",
                "version": "1.0.0",
                "endpoints": {
                    "auth": "/api/auth",
                    "students": "/api/students",
                    "courses": "/api/courses",
                    "enrollments": "/api/enrollments",
                    "results": "/api/results",
                    "analytics": "/api/analytics",
                    "ocr": "/api/ocr",
                    "mcq": "/api/mcq",
                    "health": "/api/health",
                },
            }
        )

    # ----------------------------
    # Global Error Handlers
    # ----------------------------
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Endpoint not found", "status": 404}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "Internal server error", "status": 500}), 500

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"error": "Bad request", "status": 400}), 400

    return app


def _seed_admin_user():
    """Seed default admin user into MongoDB users collection."""
    from database.mongodb import users_col
    import bcrypt

    existing = users_col().find_one({"username": Config.ADMIN_USERNAME})
    if not existing:
        hashed_pw = bcrypt.hashpw(
            Config.ADMIN_PASSWORD.encode("utf-8"), bcrypt.gensalt()
        )
        users_col().insert_one(
            {
                "username": Config.ADMIN_USERNAME,
                "email": Config.ADMIN_EMAIL,
                "password": hashed_pw.decode("utf-8"),
                "role": "admin",
                "created_at": __import__("datetime").datetime.utcnow(),
            }
        )
        print(
            f"✅ Default admin created: {Config.ADMIN_USERNAME} / {Config.ADMIN_PASSWORD}"
        )


# ----------------------------
# Run Flask Development Server
# ----------------------------
if __name__ == "__main__":
    app = create_app()
    print("=" * 60)
    print("  🎓 Student Records & Course Management System")
    print("  🍃 MongoDB + PyMongo | 🐍 Flask REST API")
    print(f"  🌐 Running at: http://localhost:{Config.PORT}")
    print("=" * 60)
    app.run(host="0.0.0.0", port=Config.PORT, debug=Config.DEBUG)
