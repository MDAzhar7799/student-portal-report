"""
=============================================================
enrollment_routes.py — Enrollment Management REST API
=============================================================
Technology: Flask REST API + PyMongo (MongoDB)
Endpoints:
  GET    /api/enrollments             - List all enrollments
  POST   /api/enrollments             - Enroll student in course
  DELETE /api/enrollments/:id         - Drop enrollment
  GET    /api/enrollments/student/:id - Get student's courses
  GET    /api/enrollments/course/:id  - Get course's students
=============================================================
"""

from flask import Blueprint, request, jsonify
from database.mongodb import enrollments_col, students_col, courses_col
from utils.auth import token_required, admin_required
from utils.validators import validate_required_fields
from datetime import datetime
from bson import ObjectId

enrollment_bp = Blueprint("enrollments", __name__)


def _serialize_enrollment(enrollment: dict) -> dict:
    return {
        "id": str(enrollment["_id"]),
        "student_id": enrollment.get("student_id"),
        "course_id": enrollment.get("course_id"),
        "student_name": enrollment.get("student_name", ""),
        "student_code": enrollment.get("student_code", ""),
        "course_name": enrollment.get("course_name", ""),
        "course_code": enrollment.get("course_code", ""),
        "semester": enrollment.get("semester", ""),
        "status": enrollment.get("status", "enrolled"),
        "enrolled_at": enrollment.get("enrolled_at", datetime.utcnow()).isoformat(),
    }


@enrollment_bp.route("/", methods=["GET"])
@token_required
def get_enrollments():
    """GET /api/enrollments — List all enrollments with pagination."""
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))
    skip = (page - 1) * limit

    enrollments = list(enrollments_col().find({}).skip(skip).limit(limit))
    total = enrollments_col().count_documents({})

    return jsonify({
        "enrollments": [_serialize_enrollment(e) for e in enrollments],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }), 200


@enrollment_bp.route("/", methods=["POST"])
@token_required
def enroll_student():
    """
    POST /api/enrollments
    Body: { student_id, course_id, semester }
    PyMongo: insert_one() + update enrolled_count
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    is_valid, missing = validate_required_fields(data, ["student_id", "course_id"])
    if not is_valid:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    student_id = data["student_id"]
    course_id = data["course_id"]

    # PyMongo: Validate student exists
    try:
        student = students_col().find_one({"_id": ObjectId(student_id)})
    except Exception:
        student = students_col().find_one({"student_id": student_id})
    if not student:
        return jsonify({"error": "Student not found"}), 404

    # PyMongo: Validate course exists
    try:
        course = courses_col().find_one({"_id": ObjectId(course_id)})
    except Exception:
        course = courses_col().find_one({"course_code": course_id.upper()})
    if not course:
        return jsonify({"error": "Course not found"}), 404

    # Check capacity
    enrolled_count = enrollments_col().count_documents({"course_id": str(course["_id"])})
    if enrolled_count >= course.get("max_students", 30):
        return jsonify({"error": "Course is at maximum capacity"}), 409

    # PyMongo: Check duplicate enrollment
    existing = enrollments_col().find_one({
        "student_id": str(student["_id"]),
        "course_id": str(course["_id"])
    })
    if existing:
        return jsonify({"error": "Student already enrolled in this course"}), 409

    enrollment = {
        "student_id": str(student["_id"]),
        "course_id": str(course["_id"]),
        "student_name": student.get("name"),
        "student_code": student.get("student_id"),
        "course_name": course.get("name"),
        "course_code": course.get("course_code"),
        "semester": data.get("semester", ""),
        "status": "enrolled",
        "enrolled_at": datetime.utcnow(),
    }

    result = enrollments_col().insert_one(enrollment)
    enrollment["_id"] = result.inserted_id

    # PyMongo: Update course enrolled_count with $inc
    courses_col().update_one(
        {"_id": course["_id"]},
        {"$inc": {"enrolled_count": 1}}
    )

    return jsonify({"message": "Student enrolled successfully", "enrollment": _serialize_enrollment(enrollment)}), 201


@enrollment_bp.route("/<enrollment_id>", methods=["DELETE"])
@token_required
def drop_enrollment(enrollment_id):
    """DELETE /api/enrollments/:id — Drop a student from a course."""
    try:
        query = {"_id": ObjectId(enrollment_id)}
    except Exception:
        return jsonify({"error": "Invalid enrollment ID"}), 400

    enrollment = enrollments_col().find_one(query)
    if not enrollment:
        return jsonify({"error": "Enrollment not found"}), 404

    enrollments_col().delete_one(query)

    # PyMongo: Decrement course enrolled_count
    try:
        courses_col().update_one(
            {"_id": ObjectId(enrollment["course_id"])},
            {"$inc": {"enrolled_count": -1}}
        )
    except Exception:
        pass

    return jsonify({"message": "Enrollment dropped successfully"}), 200


@enrollment_bp.route("/student/<student_id>", methods=["GET"])
@token_required
def get_student_enrollments(student_id):
    """GET /api/enrollments/student/:id — All courses for a student."""
    enrollments = list(enrollments_col().find({"student_id": student_id}))
    return jsonify({
        "enrollments": [_serialize_enrollment(e) for e in enrollments],
        "count": len(enrollments)
    }), 200


@enrollment_bp.route("/course/<course_id>", methods=["GET"])
@token_required
def get_course_students(course_id):
    """GET /api/enrollments/course/:id — All students in a course."""
    enrollments = list(enrollments_col().find({"course_id": course_id}))
    return jsonify({
        "enrollments": [_serialize_enrollment(e) for e in enrollments],
        "count": len(enrollments)
    }), 200
