"""
=============================================================
student_routes.py — Student Management REST API
=============================================================
Technology: Flask REST API + PyMongo (MongoDB)
Endpoints:
  GET    /api/students          - List all students
  POST   /api/students          - Create student
  GET    /api/students/:id      - Get student by ID
  PUT    /api/students/:id      - Update student
  DELETE /api/students/:id      - Delete student
  GET    /api/students/search   - Search students
=============================================================
"""

from flask import Blueprint, request, jsonify
from database.mongodb import students_col, enrollments_col, results_col
from utils.auth import token_required, admin_required
from utils.validators import validate_email, validate_required_fields, sanitize_string, calculate_letter_grade
from datetime import datetime
from bson import ObjectId
import re

student_bp = Blueprint("students", __name__)


def _serialize_student(student: dict) -> dict:
    """Convert MongoDB student document to JSON-safe dict."""
    return {
        "id": str(student["_id"]),
        "student_id": student.get("student_id"),
        "name": student.get("name"),
        "email": student.get("email"),
        "phone": student.get("phone"),
        "date_of_birth": student.get("date_of_birth"),
        "gender": student.get("gender"),
        "address": student.get("address"),
        "department": student.get("department"),
        "year": student.get("year"),
        "cgpa": student.get("cgpa", 0.0),
        "status": student.get("status", "active"),
        "created_at": student.get("created_at", datetime.utcnow()).isoformat(),
        "updated_at": student.get("updated_at", datetime.utcnow()).isoformat(),
    }


@student_bp.route("/", methods=["GET"])
@token_required
def get_students():
    """
    GET /api/students
    Query params: page, limit, department, status, search
    Returns paginated list of students from MongoDB.
    PyMongo: find(), skip(), limit(), sort()
    """
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 10))
    department = request.args.get("department")
    status = request.args.get("status", "active")
    search = request.args.get("search")

    # Build MongoDB query filter
    query = {}
    if status:
        query["status"] = status
    if department:
        query["department"] = department
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"student_id": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]

    skip = (page - 1) * limit

    # PyMongo: Find with filter, sort, skip, limit
    students = list(
        students_col().find(query).sort("name", 1).skip(skip).limit(limit)
    )
    total = students_col().count_documents(query)

    return jsonify({
        "students": [_serialize_student(s) for s in students],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }), 200


@student_bp.route("/", methods=["POST"])
@token_required
def create_student():
    """
    POST /api/students
    Body: { student_id, name, email, phone, department, year, ... }
    PyMongo: insert_one()
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    required = ["student_id", "name", "email", "department"]
    is_valid, missing = validate_required_fields(data, required)
    if not is_valid:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    if not validate_email(data["email"]):
        return jsonify({"error": "Invalid email format"}), 400

    student_id = data["student_id"].upper()

    # Check uniqueness via PyMongo
    if students_col().find_one({"$or": [
        {"student_id": student_id},
        {"email": data["email"]}
    ]}):
        return jsonify({"error": "Student ID or email already exists"}), 409

    now = datetime.utcnow()
    new_student = {
        "student_id": student_id,
        "name": sanitize_string(data["name"]),
        "email": sanitize_string(data["email"]),
        "phone": data.get("phone", ""),
        "date_of_birth": data.get("date_of_birth", ""),
        "gender": data.get("gender", ""),
        "address": data.get("address", ""),
        "department": sanitize_string(data["department"]),
        "year": data.get("year", 1),
        "cgpa": 0.0,
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }

    # PyMongo: Insert into students collection
    result = students_col().insert_one(new_student)
    new_student["_id"] = result.inserted_id

    return jsonify({
        "message": "Student created successfully",
        "student": _serialize_student(new_student)
    }), 201


@student_bp.route("/<student_id>", methods=["GET"])
@token_required
def get_student(student_id):
    """
    GET /api/students/:id
    PyMongo: find_one() by _id or student_id
    """
    try:
        query = {"_id": ObjectId(student_id)}
    except Exception:
        query = {"student_id": student_id.upper()}

    student = students_col().find_one(query)
    if not student:
        return jsonify({"error": "Student not found"}), 404

    return jsonify({"student": _serialize_student(student)}), 200


@student_bp.route("/<student_id>", methods=["PUT"])
@token_required
def update_student(student_id):
    """
    PUT /api/students/:id
    PyMongo: update_one() with $set
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        query = {"_id": ObjectId(student_id)}
    except Exception:
        query = {"student_id": student_id.upper()}

    # Build update document
    update_fields = {}
    updatable = ["name", "email", "phone", "date_of_birth", "gender", "address", "department", "year", "status"]
    for field in updatable:
        if field in data:
            update_fields[field] = sanitize_string(str(data[field])) if isinstance(data[field], str) else data[field]

    update_fields["updated_at"] = datetime.utcnow()

    # PyMongo: update_one with $set operator
    result = students_col().update_one(query, {"$set": update_fields})
    if result.matched_count == 0:
        return jsonify({"error": "Student not found"}), 404

    updated = students_col().find_one(query)
    return jsonify({"message": "Student updated", "student": _serialize_student(updated)}), 200


@student_bp.route("/<student_id>", methods=["DELETE"])
@admin_required
def delete_student(student_id):
    """
    DELETE /api/students/:id
    PyMongo: delete_one()
    Also removes related enrollments and results.
    """
    try:
        query = {"_id": ObjectId(student_id)}
    except Exception:
        query = {"student_id": student_id.upper()}

    student = students_col().find_one(query)
    if not student:
        return jsonify({"error": "Student not found"}), 404

    sid = str(student["_id"])

    # PyMongo: Cascade delete related records
    enrollments_col().delete_many({"student_id": sid})
    results_col().delete_many({"student_id": sid})
    students_col().delete_one(query)

    return jsonify({"message": f"Student {student.get('student_id')} deleted"}), 200


@student_bp.route("/search/advanced", methods=["GET"])
@token_required
def search_students():
    """
    GET /api/students/search/advanced
    Advanced search with multiple filters.
    PyMongo: $regex, $gte, $lte operators
    """
    name = request.args.get("name")
    department = request.args.get("department")
    year = request.args.get("year")
    min_cgpa = request.args.get("min_cgpa")
    max_cgpa = request.args.get("max_cgpa")

    query = {}
    if name:
        query["name"] = {"$regex": name, "$options": "i"}
    if department:
        query["department"] = {"$regex": department, "$options": "i"}
    if year:
        query["year"] = int(year)
    if min_cgpa or max_cgpa:
        cgpa_filter = {}
        if min_cgpa:
            cgpa_filter["$gte"] = float(min_cgpa)
        if max_cgpa:
            cgpa_filter["$lte"] = float(max_cgpa)
        query["cgpa"] = cgpa_filter

    students = list(students_col().find(query).sort("name", 1).limit(50))
    return jsonify({
        "students": [_serialize_student(s) for s in students],
        "count": len(students)
    }), 200
