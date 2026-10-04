"""
=============================================================
auth_routes.py — Authentication REST API Endpoints
=============================================================
Technology: Flask REST API + PyMongo + JWT + bcrypt
Endpoints:
  POST /api/auth/login
  POST /api/auth/register
  POST /api/auth/logout
  GET  /api/auth/me
=============================================================
"""

from flask import Blueprint, request, jsonify
from database.mongodb import users_col
from utils.auth import hash_password, verify_password, generate_token, token_required
from utils.validators import validate_email, validate_required_fields, sanitize_string
from datetime import datetime
from bson import ObjectId

auth_bp = Blueprint("auth", __name__)


def _serialize_user(user: dict) -> dict:
    """Serialize MongoDB user document to JSON-safe dict."""
    return {
        "id": str(user["_id"]),
        "username": user.get("username"),
        "email": user.get("email"),
        "role": user.get("role", "user"),
        "created_at": user.get("created_at", datetime.utcnow()).isoformat(),
    }


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    POST /api/auth/login
    Body: { username, password }
    Returns: { token, user }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    is_valid, missing = validate_required_fields(data, ["username", "password"])
    if not is_valid:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    username = sanitize_string(data["username"])
    password = data["password"]

    # PyMongo: Find user in MongoDB users collection
    user = users_col().find_one({"username": username})
    if not user:
        return jsonify({"error": "Invalid username or password"}), 401

    if not verify_password(password, user["password"]):
        return jsonify({"error": "Invalid username or password"}), 401

    # Generate JWT token
    token = generate_token(str(user["_id"]), user["username"], user.get("role", "user"))

    return jsonify({"message": "Login successful", "token": token, "user": _serialize_user(user)}), 200


@auth_bp.route("/register", methods=["POST"])
def register():
    """
    POST /api/auth/register
    Body: { username, email, password, role }
    Returns: { message, user }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    is_valid, missing = validate_required_fields(data, ["username", "email", "password"])
    if not is_valid:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    username = sanitize_string(data["username"])
    email = sanitize_string(data["email"])
    password = data["password"]
    role = data.get("role", "user")

    if not validate_email(email):
        return jsonify({"error": "Invalid email format"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    # PyMongo: Check if username/email exists
    if users_col().find_one({"$or": [{"username": username}, {"email": email}]}):
        return jsonify({"error": "Username or email already exists"}), 409

    hashed_pw = hash_password(password)
    new_user = {
        "username": username,
        "email": email,
        "password": hashed_pw,
        "role": role,
        "created_at": datetime.utcnow(),
    }

    # PyMongo: Insert into users collection
    result = users_col().insert_one(new_user)
    new_user["_id"] = result.inserted_id

    return jsonify({"message": "User registered successfully", "user": _serialize_user(new_user)}), 201


@auth_bp.route("/logout", methods=["POST"])
@token_required
def logout():
    """POST /api/auth/logout — Invalidate JWT (client-side)."""
    return jsonify({"message": "Logged out successfully"}), 200


@auth_bp.route("/me", methods=["GET"])
@token_required
def get_current_user():
    """GET /api/auth/me — Get current authenticated user."""
    user_id = request.current_user.get("user_id")
    user = users_col().find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": _serialize_user(user)}), 200
