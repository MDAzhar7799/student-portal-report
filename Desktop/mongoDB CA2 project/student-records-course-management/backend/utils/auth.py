"""
=============================================================
auth.py — JWT Authentication Utilities
=============================================================
Technology: Python + PyJWT + bcrypt
=============================================================
"""

import jwt
import bcrypt
from functools import wraps
from flask import request, jsonify, current_app
from datetime import datetime, timedelta
from database.mongodb import users_col
from bson import ObjectId


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against bcrypt hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )


def generate_token(user_id: str, username: str, role: str) -> str:
    """
    Generate JWT access token.
    Payload includes: user_id, username, role, exp
    """
    secret = current_app.config.get("JWT_SECRET_KEY", "default-secret")
    expires = current_app.config.get("JWT_ACCESS_TOKEN_EXPIRES", 3600)

    payload = {
        "user_id": str(user_id),
        "username": username,
        "role": role,
        "exp": datetime.utcnow() + timedelta(seconds=expires),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def decode_token(token: str) -> dict:
    """Decode and validate JWT token."""
    secret = current_app.config.get("JWT_SECRET_KEY", "default-secret")
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return {"valid": True, "payload": payload}
    except jwt.ExpiredSignatureError:
        return {"valid": False, "error": "Token has expired"}
    except jwt.InvalidTokenError as e:
        return {"valid": False, "error": f"Invalid token: {str(e)}"}


def token_required(f):
    """
    Decorator: Requires valid JWT token in Authorization header.
    Usage: @token_required on any protected route.
    """

    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        token = auth_header.split(" ")[1]
        result = decode_token(token)

        if not result["valid"]:
            return jsonify({"error": result["error"]}), 401

        request.current_user = result["payload"]
        return f(*args, **kwargs)

    return decorated


def admin_required(f):
    """Decorator: Requires admin role JWT token."""

    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing Authorization header"}), 401

        token = auth_header.split(" ")[1]
        result = decode_token(token)

        if not result["valid"]:
            return jsonify({"error": result["error"]}), 401

        if result["payload"].get("role") != "admin":
            return jsonify({"error": "Admin access required"}), 403

        request.current_user = result["payload"]
        return f(*args, **kwargs)

    return decorated
