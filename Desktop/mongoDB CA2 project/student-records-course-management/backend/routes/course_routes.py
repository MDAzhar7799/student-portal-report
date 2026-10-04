"""
=============================================================
course_routes.py — Course Management REST API
=============================================================
Technology: Flask REST API + PyMongo (MongoDB)
Endpoints:
  GET    /api/courses       - List all courses
  POST   /api/courses       - Create course
  GET    /api/courses/:id   - Get course
  PUT    /api/courses/:id   - Update course
  DELETE /api/courses/:id   - Delete course
=============================================================
"""

from flask import Blueprint, request, jsonify
from database.mongodb import courses_col, enrollments_col
from utils.auth import token_required, admin_required
from utils.validators import validate_required_fields, sanitize_string
from datetime import datetime
from bson import ObjectId

course_bp = Blueprint("courses", __name__)


def _serialize_course(course: dict) -> dict:
    return {
        "id": str(course["_id"]),
        "course_code": course.get("course_code"),
        "name": course.get("name"),
        "description": course.get("description", ""),
        "credits": course.get("credits", 3),
        "department": course.get("department"),
        "instructor": course.get("instructor", ""),
        "semester": course.get("semester", ""),
        "max_students": course.get("max_students", 30),
        "enrolled_count": course.get("enrolled_count", 0),
        "status": course.get("status", "active"),
        "created_at": course.get("created_at", datetime.utcnow()).isoformat(),
    }


@course_bp.route("/", methods=["GET"])
@token_required
def get_courses():
    """
    GET /api/courses
    PyMongo: find() with optional filters
    """
    department = request.args.get("department")
    status = request.args.get("status", "active")
    search = request.args.get("search")
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 10))

    query = {}
    if status:
        query["status"] = status
    if department:
        query["department"] = department
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"course_code": {"$regex": search, "$options": "i"}},
        ]

    skip = (page - 1) * limit
    courses = list(courses_col().find(query).sort("course_code", 1).skip(skip).limit(limit))
    total = courses_col().count_documents(query)

    return jsonify({
        "courses": [_serialize_course(c) for c in courses],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }), 200


@course_bp.route("/", methods=["POST"])
@token_required
def create_course():
    """
    POST /api/courses
    PyMongo: insert_one()
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    required = ["course_code", "name", "department", "credits"]
    is_valid, missing = validate_required_fields(data, required)
    if not is_valid:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    course_code = data["course_code"].upper()

    # PyMongo: Check uniqueness
    if courses_col().find_one({"course_code": course_code}):
        return jsonify({"error": "Course code already exists"}), 409

    now = datetime.utcnow()
    new_course = {
        "course_code": course_code,
        "name": sanitize_string(data["name"]),
        "description": data.get("description", ""),
        "credits": int(data["credits"]),
        "department": sanitize_string(data["department"]),
        "instructor": data.get("instructor", ""),
        "semester": data.get("semester", ""),
        "max_students": int(data.get("max_students", 30)),
        "enrolled_count": 0,
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }

    result = courses_col().insert_one(new_course)
    new_course["_id"] = result.inserted_id
    return jsonify({"message": "Course created", "course": _serialize_course(new_course)}), 201


@course_bp.route("/<course_id>", methods=["GET"])
@token_required
def get_course(course_id):
    """
    GET /api/courses/:id
    PyMongo: find_one()
    """
    try:
        query = {"_id": ObjectId(course_id)}
    except Exception:
        query = {"course_code": course_id.upper()}

    course = courses_col().find_one(query)
    if not course:
        return jsonify({"error": "Course not found"}), 404

    # Get enrollment count
    count = enrollments_col().count_documents({"course_id": str(course["_id"])})
    course["enrolled_count"] = count

    return jsonify({"course": _serialize_course(course)}), 200


@course_bp.route("/<course_id>", methods=["PUT"])
@token_required
def update_course(course_id):
    """PUT /api/courses/:id — PyMongo: update_one() $set"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        query = {"_id": ObjectId(course_id)}
    except Exception:
        query = {"course_code": course_id.upper()}

    updatable = ["name", "description", "credits", "instructor", "semester", "max_students", "status"]
    update_fields = {k: data[k] for k in updatable if k in data}
    update_fields["updated_at"] = datetime.utcnow()

    result = courses_col().update_one(query, {"$set": update_fields})
    if result.matched_count == 0:
        return jsonify({"error": "Course not found"}), 404

    updated = courses_col().find_one(query)
    return jsonify({"message": "Course updated", "course": _serialize_course(updated)}), 200


@course_bp.route("/<course_id>", methods=["DELETE"])
@admin_required
def delete_course(course_id):
    """DELETE /api/courses/:id — PyMongo: delete_one()"""
    try:
        query = {"_id": ObjectId(course_id)}
    except Exception:
        query = {"course_code": course_id.upper()}

    course = courses_col().find_one(query)
    if not course:
        return jsonify({"error": "Course not found"}), 404

    enrollments_col().delete_many({"course_id": str(course["_id"])})
    courses_col().delete_one(query)

    return jsonify({"message": f"Course {course.get('course_code')} deleted"}), 200
