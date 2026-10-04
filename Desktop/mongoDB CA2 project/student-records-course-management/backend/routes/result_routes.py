"""
=============================================================
result_routes.py — Results Management REST API
=============================================================
Technology: Flask REST API + PyMongo (MongoDB)
Endpoints:
  GET    /api/results                 - List results
  POST   /api/results                 - Add result
  PUT    /api/results/:id             - Update result
  DELETE /api/results/:id             - Delete result
  GET    /api/results/student/:id     - Student's results
  GET    /api/results/course/:id      - Course results
=============================================================
"""

from flask import Blueprint, request, jsonify
from database.mongodb import results_col, students_col, courses_col
from utils.auth import token_required, admin_required
from utils.validators import validate_required_fields, validate_grade, calculate_letter_grade, calculate_gpa_points
from datetime import datetime
from bson import ObjectId

result_bp = Blueprint("results", __name__)


def _serialize_result(result: dict) -> dict:
    return {
        "id": str(result["_id"]),
        "student_id": result.get("student_id"),
        "course_id": result.get("course_id"),
        "student_name": result.get("student_name", ""),
        "student_code": result.get("student_code", ""),
        "course_name": result.get("course_name", ""),
        "course_code": result.get("course_code", ""),
        "score": result.get("score", 0),
        "letter_grade": result.get("letter_grade", ""),
        "gpa_points": result.get("gpa_points", 0.0),
        "credits": result.get("credits", 3),
        "semester": result.get("semester", ""),
        "exam_type": result.get("exam_type", "final"),
        "remarks": result.get("remarks", ""),
        "created_at": result.get("created_at", datetime.utcnow()).isoformat(),
        "updated_at": result.get("updated_at", datetime.utcnow()).isoformat(),
    }


@result_bp.route("/", methods=["GET"])
@token_required
def get_results():
    """GET /api/results — List results with pagination."""
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))
    semester = request.args.get("semester")
    exam_type = request.args.get("exam_type")

    query = {}
    if semester:
        query["semester"] = semester
    if exam_type:
        query["exam_type"] = exam_type

    skip = (page - 1) * limit
    results = list(results_col().find(query).skip(skip).limit(limit))
    total = results_col().count_documents(query)

    return jsonify({
        "results": [_serialize_result(r) for r in results],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }), 200


@result_bp.route("/", methods=["POST"])
@token_required
def add_result():
    """
    POST /api/results
    PyMongo: insert_one() + update student CGPA
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    required = ["student_id", "course_id", "score", "semester"]
    is_valid, missing = validate_required_fields(data, required)
    if not is_valid:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    score = float(data["score"])
    if not validate_grade(score):
        return jsonify({"error": "Score must be between 0 and 100"}), 400

    student_id = data["student_id"]
    course_id = data["course_id"]

    # PyMongo: Fetch related records
    try:
        student = students_col().find_one({"_id": ObjectId(student_id)})
    except Exception:
        student = students_col().find_one({"student_id": student_id})

    try:
        course = courses_col().find_one({"_id": ObjectId(course_id)})
    except Exception:
        course = courses_col().find_one({"course_code": course_id.upper()})

    if not student:
        return jsonify({"error": "Student not found"}), 404
    if not course:
        return jsonify({"error": "Course not found"}), 404

    letter_grade = calculate_letter_grade(score)
    gpa_points = calculate_gpa_points(letter_grade)
    credits = course.get("credits", 3)

    now = datetime.utcnow()
    new_result = {
        "student_id": str(student["_id"]),
        "course_id": str(course["_id"]),
        "student_name": student.get("name"),
        "student_code": student.get("student_id"),
        "course_name": course.get("name"),
        "course_code": course.get("course_code"),
        "score": score,
        "letter_grade": letter_grade,
        "gpa_points": gpa_points,
        "credits": credits,
        "semester": data["semester"],
        "exam_type": data.get("exam_type", "final"),
        "remarks": data.get("remarks", ""),
        "created_at": now,
        "updated_at": now,
    }

    results_col().insert_one(new_result)
    new_result["_id"] = new_result.pop("_id", None)

    # Recalculate student CGPA using PyMongo aggregation
    _update_student_cgpa(str(student["_id"]))

    return jsonify({"message": "Result added", "result": _serialize_result(new_result)}), 201


@result_bp.route("/<result_id>", methods=["PUT"])
@token_required
def update_result(result_id):
    """PUT /api/results/:id — Update score and recalculate CGPA."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        query = {"_id": ObjectId(result_id)}
    except Exception:
        return jsonify({"error": "Invalid result ID"}), 400

    existing = results_col().find_one(query)
    if not existing:
        return jsonify({"error": "Result not found"}), 404

    update_fields = {}
    if "score" in data:
        score = float(data["score"])
        if not validate_grade(score):
            return jsonify({"error": "Score must be between 0 and 100"}), 400
        letter_grade = calculate_letter_grade(score)
        update_fields["score"] = score
        update_fields["letter_grade"] = letter_grade
        update_fields["gpa_points"] = calculate_gpa_points(letter_grade)

    if "remarks" in data:
        update_fields["remarks"] = data["remarks"]
    if "exam_type" in data:
        update_fields["exam_type"] = data["exam_type"]

    update_fields["updated_at"] = datetime.utcnow()

    results_col().update_one(query, {"$set": update_fields})
    _update_student_cgpa(existing["student_id"])

    updated = results_col().find_one(query)
    return jsonify({"message": "Result updated", "result": _serialize_result(updated)}), 200


@result_bp.route("/<result_id>", methods=["DELETE"])
@admin_required
def delete_result(result_id):
    """DELETE /api/results/:id"""
    try:
        query = {"_id": ObjectId(result_id)}
    except Exception:
        return jsonify({"error": "Invalid result ID"}), 400

    result = results_col().find_one(query)
    if not result:
        return jsonify({"error": "Result not found"}), 404

    results_col().delete_one(query)
    _update_student_cgpa(result["student_id"])

    return jsonify({"message": "Result deleted"}), 200


@result_bp.route("/student/<student_id>", methods=["GET"])
@token_required
def get_student_results(student_id):
    """GET /api/results/student/:id — All results for a student."""
    results = list(results_col().find({"student_id": student_id}).sort("created_at", -1))
    total_score = sum(r.get("score", 0) for r in results)
    avg = total_score / len(results) if results else 0

    return jsonify({
        "results": [_serialize_result(r) for r in results],
        "count": len(results),
        "average_score": round(avg, 2),
    }), 200


@result_bp.route("/course/<course_id>", methods=["GET"])
@token_required
def get_course_results(course_id):
    """GET /api/results/course/:id — All results for a course."""
    results = list(results_col().find({"course_id": course_id}).sort("score", -1))
    scores = [r.get("score", 0) for r in results]
    avg = sum(scores) / len(scores) if scores else 0

    return jsonify({
        "results": [_serialize_result(r) for r in results],
        "count": len(results),
        "average_score": round(avg, 2),
        "highest": max(scores) if scores else 0,
        "lowest": min(scores) if scores else 0,
    }), 200


def _update_student_cgpa(student_id: str):
    """
    Recalculate and update student CGPA.
    Uses weighted average: sum(gpa_points * credits) / sum(credits)
    PyMongo: find() all results for student.
    """
    all_results = list(results_col().find({"student_id": student_id}))
    if not all_results:
        return

    total_credit_points = sum(r.get("gpa_points", 0) * r.get("credits", 3) for r in all_results)
    total_credits = sum(r.get("credits", 3) for r in all_results)
    cgpa = round(total_credit_points / total_credits, 2) if total_credits > 0 else 0.0

    try:
        students_col().update_one(
            {"_id": ObjectId(student_id)},
            {"$set": {"cgpa": cgpa, "updated_at": datetime.utcnow()}}
        )
    except Exception:
        pass
