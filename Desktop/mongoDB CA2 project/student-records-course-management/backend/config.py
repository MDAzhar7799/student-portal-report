"""
=============================================================
config.py — Configuration for Student Records System
=============================================================
Technology: Python + Flask
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration class"""

    # ----------------------------
    # MongoDB Configuration ⭐
    # ----------------------------
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "studentDB")

    # ----------------------------
    # JWT Configuration
    # ----------------------------
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "default-secret-key")
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 3600))

    # ----------------------------
    # Flask Configuration
    # ----------------------------
    DEBUG = os.getenv("FLASK_DEBUG", "True") == "True"
    PORT = int(os.getenv("FLASK_PORT", 5000))

    # ----------------------------
    # Upload Configuration
    # ----------------------------
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "../uploads")
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 16 * 1024 * 1024))
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "bmp", "tiff", "pdf"}

    # ----------------------------
    # Tesseract OCR Path
    # ----------------------------
    TESSERACT_CMD = os.getenv(
        "TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    )

    # ----------------------------
    # Default Admin Credentials
    # ----------------------------
    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@studentdb.com")

    # ----------------------------
    # CORS Settings
    # ----------------------------
    CORS_ORIGINS = [
        "http://localhost:5173",
        "http://localhost:3000",
        # Vercel deployed frontend URLs
        "https://frontend-mu-teal-82.vercel.app",
        "https://student-portal-report.vercel.app",
        "https://frontend-lo87yxmz2-mdazhar7799s-projects.vercel.app",
        # Allow all vercel.app subdomains
        "https://*.vercel.app",
    ]

    # ----------------------------
    # Gemini AI Configuration
    # ----------------------------
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
