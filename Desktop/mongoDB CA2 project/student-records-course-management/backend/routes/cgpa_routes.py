"""
=============================================================
cgpa_routes.py — CGPA Calculator & Dataset Upload REST API
=============================================================
Technology: Flask REST API + PyMongo (MongoDB) + scikit-learn ML
Endpoints:
  POST   /api/cgpa/calculate          - Calculate CGPA for given subjects
  POST   /api/cgpa/upload-dataset     - Upload CSV/Excel student result dataset
  GET    /api/cgpa/datasets           - List uploaded datasets
  GET    /api/cgpa/datasets/:id       - Get dataset details
  DELETE /api/cgpa/datasets/:id       - Delete a dataset
  GET    /api/cgpa/history            - Student CGPA calculation history
  POST   /api/cgpa/predict            - ML-based grade prediction
=============================================================
"""

from flask import Blueprint, request, jsonify
from database.mongodb import get_db
from utils.auth import token_required
from utils.validators import calculate_letter_grade, calculate_gpa_points
from datetime import datetime
from bson import ObjectId
import io, json, traceback

cgpa_bp = Blueprint("cgpa", __name__)


# ─── Helpers ─────────────────────────────────────────────────

def _grade_color(letter: str) -> str:
    colors = {
        "A+": "#4ade80", "A": "#4ade80", "A-": "#86efac",
        "B+": "#86efac", "B": "#60a5fa", "B-": "#60a5fa",
        "C+": "#fbbf24", "C": "#fbbf24", "C-": "#fb923c",
        "D": "#fb923c", "F": "#f87171", "RA": "#f87171",
    }
    return colors.get(letter, "#94a3b8")


def _score_to_grade_10(score: float) -> tuple:
    """Return (letter_grade, gpa_10_scale) for 10-point scale."""
    if score >= 90:
        return "O", 10.0
    elif score >= 80:
        return "A+", 9.0
    elif score >= 70:
        return "A", 8.0
    elif score >= 60:
        return "B+", 7.0
    elif score >= 55:
        return "B", 6.0
    elif score >= 50:
        return "C", 5.0
    else:
        return "F", 0.0


def _cgpa_col():
    return get_db()["cgpa_calculations"]


def _dataset_col():
    return get_db()["cgpa_datasets"]


# ─── CGPA Calculation ────────────────────────────────────────

@cgpa_bp.route("/calculate", methods=["POST"])
@token_required
def calculate_cgpa():
    """
    POST /api/cgpa/calculate
    Body: {
      student_name: str,
      student_id: str,
      semester: str,
      subjects: [
        { subject_name, credits, total_marks, obtained_marks, is_reappear }
      ]
    }
    Returns CGPA, TCGPA, per-subject grades, overall stats.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    student_name = data.get("student_name", "Unknown")
    student_id_str = data.get("student_id", "")
    semester = data.get("semester", "N/A")
    subjects = data.get("subjects", [])

    if not subjects:
        return jsonify({"error": "At least one subject is required"}), 400

    results = []
    total_credit_points = 0.0
    total_credits = 0
    reappear_credits = 0
    tc_credit_points = 0.0  # TCGPA ignores reappear subjects

    for subj in subjects:
        name = subj.get("subject_name", "Unknown")
        credits = float(subj.get("credits", 3))
        total_marks = float(subj.get("total_marks", 100))
        obtained = float(subj.get("obtained_marks", 0))
        is_reappear = bool(subj.get("is_reappear", False))

        if total_marks <= 0:
            total_marks = 100

        # Percentage score normalized to 100
        score_pct = (obtained / total_marks) * 100

        if is_reappear:
            letter = "RA"
            gpa_pts = 0.0
            grade_10 = "RA"
            gpa_10 = 0.0
        else:
            letter = calculate_letter_grade(score_pct)
            gpa_pts = calculate_gpa_points(letter)
            grade_10, gpa_10 = _score_to_grade_10(score_pct)

        credit_points = gpa_pts * credits
        total_credit_points += credit_points
        total_credits += credits

        if not is_reappear:
            tc_credit_points += credit_points
        else:
            reappear_credits += credits

        results.append({
            "subject_name": name,
            "credits": credits,
            "total_marks": total_marks,
            "obtained_marks": obtained,
            "percentage": round(score_pct, 2),
            "letter_grade": letter,
            "gpa_points": gpa_pts,
            "grade_10": grade_10,
            "gpa_10": gpa_10,
            "credit_points": round(credit_points, 3),
            "is_reappear": is_reappear,
            "grade_color": _grade_color(letter),
            "status": "Reappear" if is_reappear else ("Pass" if gpa_pts > 0 else "Fail"),
        })

    # CGPA (all subjects including reappear)
    cgpa = round(total_credit_points / total_credits, 3) if total_credits > 0 else 0.0

    # TCGPA (total CGPA excluding reappear subjects)
    valid_credits = total_credits - reappear_credits
    tcgpa = round(tc_credit_points / valid_credits, 3) if valid_credits > 0 else 0.0

    # 10-point CGPA
    cgpa_10_total = sum(r["gpa_10"] * r["credits"] for r in results if not r["is_reappear"])
    cgpa_10 = round(cgpa_10_total / valid_credits, 3) if valid_credits > 0 else 0.0

    overall_letter = calculate_letter_grade(cgpa * 25)  # scale 4.0 → 100

    summary = {
        "student_name": student_name,
        "student_id": student_id_str,
        "semester": semester,
        "subjects": results,
        "total_credits": total_credits,
        "valid_credits": valid_credits,
        "reappear_count": sum(1 for r in results if r["is_reappear"]),
        "total_credit_points": round(total_credit_points, 3),
        "cgpa": cgpa,
        "tcgpa": tcgpa,
        "cgpa_10": cgpa_10,
        "overall_letter": overall_letter,
        "overall_percentage": round(cgpa * 25, 2),
        "pass_count": sum(1 for r in results if r["status"] == "Pass"),
        "fail_count": sum(1 for r in results if r["status"] == "Fail"),
        "calculated_at": datetime.utcnow().isoformat(),
    }

    # Persist to MongoDB
    try:
        record = {**summary, "created_at": datetime.utcnow()}
        # Convert non-serializable items
        result_id = _cgpa_col().insert_one(record).inserted_id
        summary["record_id"] = str(result_id)
    except Exception:
        pass

    return jsonify(summary), 200


# ─── Dataset Upload ──────────────────────────────────────────

@cgpa_bp.route("/upload-dataset", methods=["POST"])
@token_required
def upload_dataset():
    """
    POST /api/cgpa/upload-dataset
    Accepts CSV or JSON file with student results for a year/batch.
    Columns expected: student_name, student_id, subject_name, credits,
                      total_marks, obtained_marks, semester, is_reappear
    """
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    batch_name = request.form.get("batch_name", "Unnamed Batch")
    academic_year = request.form.get("academic_year", "2024-25")

    filename = file.filename.lower()
    records = []

    try:
        content = file.read().decode("utf-8", errors="replace")

        if filename.endswith(".csv"):
            import csv
            reader = csv.DictReader(io.StringIO(content))
            for row in reader:
                records.append(dict(row))
        elif filename.endswith(".json"):
            records = json.loads(content)
        else:
            return jsonify({"error": "Only CSV or JSON files are supported"}), 400

    except Exception as e:
        return jsonify({"error": f"Failed to parse file: {str(e)}"}), 400

    if not records:
        return jsonify({"error": "File is empty or has no valid rows"}), 400

    # Group by student
    from collections import defaultdict
    student_subjects = defaultdict(list)

    for row in records:
        sid = str(row.get("student_id", row.get("Student ID", ""))).strip()
        if not sid:
            continue
        student_subjects[sid].append({
            "student_name": str(row.get("student_name", row.get("Student Name", "Unknown"))).strip(),
            "subject_name": str(row.get("subject_name", row.get("Subject", "Unknown"))).strip(),
            "credits": float(row.get("credits", row.get("Credits", 3)) or 3),
            "total_marks": float(row.get("total_marks", row.get("Total Marks", 100)) or 100),
            "obtained_marks": float(row.get("obtained_marks", row.get("Obtained Marks", 0)) or 0),
            "semester": str(row.get("semester", row.get("Semester", "1"))).strip(),
            "is_reappear": str(row.get("is_reappear", row.get("Reappear", "false"))).lower() in ["true", "1", "yes"],
        })

    # Calculate CGPA per student
    student_results = []
    for sid, subj_list in student_subjects.items():
        sname = subj_list[0]["student_name"]
        total_cp = 0.0
        total_cr = 0
        valid_cp = 0.0
        valid_cr = 0
        subj_details = []

        for s in subj_list:
            pct = (s["obtained_marks"] / s["total_marks"]) * 100 if s["total_marks"] > 0 else 0
            if s["is_reappear"]:
                letter, gpa_pts = "RA", 0.0
            else:
                letter = calculate_letter_grade(pct)
                gpa_pts = calculate_gpa_points(letter)

            cp = gpa_pts * s["credits"]
            total_cp += cp
            total_cr += s["credits"]
            if not s["is_reappear"]:
                valid_cp += cp
                valid_cr += s["credits"]

            subj_details.append({**s, "letter_grade": letter, "gpa_points": gpa_pts,
                                  "percentage": round(pct, 2), "grade_color": _grade_color(letter)})

        cgpa = round(total_cp / total_cr, 3) if total_cr > 0 else 0.0
        tcgpa = round(valid_cp / valid_cr, 3) if valid_cr > 0 else 0.0

        sem = subj_list[0].get("semester", "N/A") if subj_list else "N/A"
        reapp_cnt = sum(1 for s in subj_list if s["is_reappear"])
        letter_ovr = calculate_letter_grade(cgpa * 25)

        student_results.append({
            "student_id": sid,
            "student_name": sname,
            "semester": sem,
            "subjects": subj_details,
            "cgpa": cgpa,
            "tcgpa": tcgpa,
            "total_credits": total_cr,
            "valid_credits": valid_cr,
            "reappear_count": reapp_cnt,
            "overall_letter": letter_ovr,
            "status": "Reappear" if reapp_cnt > 0 else ("Pass" if cgpa > 0 else "Fail"),
        })

    # Save dataset to MongoDB
    dataset_doc = {
        "batch_name": batch_name,
        "academic_year": academic_year,
        "filename": file.filename,
        "total_students": len(student_results),
        "student_results": student_results,
        "avg_cgpa": round(sum(s["cgpa"] for s in student_results) / len(student_results), 3) if student_results else 0,
        "uploaded_at": datetime.utcnow(),
    }

    inserted = _dataset_col().insert_one(dataset_doc)
    dataset_doc["_id"] = str(inserted.inserted_id)
    dataset_doc["uploaded_at"] = dataset_doc["uploaded_at"].isoformat()

    return jsonify({
        "message": f"Dataset uploaded successfully. {len(student_results)} students processed.",
        "dataset_id": str(inserted.inserted_id),
        "total_students": len(student_results),
        "avg_cgpa": dataset_doc["avg_cgpa"],
        "batch_name": batch_name,
        "academic_year": academic_year,
    }), 201


@cgpa_bp.route("/datasets", methods=["GET"])
@token_required
def get_datasets():
    """GET /api/cgpa/datasets — List all uploaded datasets."""
    datasets = list(_dataset_col().find({}, {
        "batch_name": 1, "academic_year": 1, "filename": 1,
        "total_students": 1, "avg_cgpa": 1, "uploaded_at": 1
    }).sort("uploaded_at", -1).limit(50))

    for d in datasets:
        d["id"] = str(d.pop("_id"))
        if isinstance(d.get("uploaded_at"), datetime):
            d["uploaded_at"] = d["uploaded_at"].isoformat()

    return jsonify({"datasets": datasets, "count": len(datasets)}), 200


@cgpa_bp.route("/datasets/<dataset_id>", methods=["GET"])
@token_required
def get_dataset(dataset_id):
    """GET /api/cgpa/datasets/:id — Full dataset with all student results."""
    try:
        doc = _dataset_col().find_one({"_id": ObjectId(dataset_id)})
    except Exception:
        return jsonify({"error": "Invalid dataset ID"}), 400

    if not doc:
        return jsonify({"error": "Dataset not found"}), 404

    doc["id"] = str(doc.pop("_id"))
    if isinstance(doc.get("uploaded_at"), datetime):
        doc["uploaded_at"] = doc["uploaded_at"].isoformat()

    return jsonify(doc), 200


@cgpa_bp.route("/datasets/<dataset_id>", methods=["DELETE"])
@token_required
def delete_dataset(dataset_id):
    """DELETE /api/cgpa/datasets/:id"""
    try:
        result = _dataset_col().delete_one({"_id": ObjectId(dataset_id)})
    except Exception:
        return jsonify({"error": "Invalid dataset ID"}), 400

    if result.deleted_count == 0:
        return jsonify({"error": "Dataset not found"}), 404

    return jsonify({"message": "Dataset deleted"}), 200


@cgpa_bp.route("/history", methods=["GET"])
@token_required
def get_history():
    """GET /api/cgpa/history — Recent CGPA calculations."""
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))
    skip = (page - 1) * limit

    records = list(_cgpa_col().find({}, {
        "student_name": 1, "student_id": 1, "semester": 1,
        "cgpa": 1, "tcgpa": 1, "cgpa_10": 1, "overall_letter": 1,
        "total_credits": 1, "reappear_count": 1, "created_at": 1,
    }).sort("created_at", -1).skip(skip).limit(limit))

    total = _cgpa_col().count_documents({})

    for r in records:
        r["id"] = str(r.pop("_id"))
        if isinstance(r.get("created_at"), datetime):
            r["created_at"] = r["created_at"].isoformat()

    return jsonify({
        "history": records,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }), 200


@cgpa_bp.route("/predict", methods=["POST"])
@token_required
def predict_grade():
    """
    POST /api/cgpa/predict
    Simple ML-based grade prediction using linear regression on past scores.
    Body: { attendance_pct, internal_marks, assignment_score, mid_term_score }
    """
    data = request.get_json() or {}

    try:
        import numpy as np
        from sklearn.linear_model import LinearRegression

        # Synthetic training data (attendance, internal, assignment, midterm → final)
        X_train = np.array([
            [95, 28, 18, 42], [90, 25, 17, 38], [85, 22, 15, 35],
            [80, 20, 14, 32], [75, 18, 12, 28], [70, 15, 10, 24],
            [65, 12,  8, 20], [60, 10,  7, 18], [55,  8,  5, 14],
            [50,  6,  4, 10], [45,  5,  3,  8], [40,  3,  2,  5],
        ])
        y_train = np.array([92, 87, 83, 78, 73, 68, 62, 57, 52, 47, 41, 35])

        model = LinearRegression()
        model.fit(X_train, y_train)

        attendance = float(data.get("attendance_pct", 75))
        internal = float(data.get("internal_marks", 20))
        assignment = float(data.get("assignment_score", 10))
        midterm = float(data.get("mid_term_score", 25))

        X_pred = np.array([[attendance, internal, assignment, midterm]])
        predicted_score = float(model.predict(X_pred)[0])
        predicted_score = max(0, min(100, predicted_score))

        letter = calculate_letter_grade(predicted_score)
        gpa = calculate_gpa_points(letter)

        return jsonify({
            "predicted_score": round(predicted_score, 2),
            "predicted_grade": letter,
            "predicted_gpa": gpa,
            "confidence": "Medium",
            "model": "Linear Regression (scikit-learn)",
        }), 200

    except ImportError:
        # Fallback simple heuristic
        attendance = float(data.get("attendance_pct", 75))
        internal = float(data.get("internal_marks", 20))
        assignment = float(data.get("assignment_score", 10))
        midterm = float(data.get("mid_term_score", 25))

        # Simple weighted formula
        predicted = (attendance * 0.1 + internal * 1.5 + assignment * 2.0 + midterm * 1.8)
        predicted = min(100, max(0, predicted))
        letter = calculate_letter_grade(predicted)
        gpa = calculate_gpa_points(letter)

        return jsonify({
            "predicted_score": round(predicted, 2),
            "predicted_grade": letter,
            "predicted_gpa": gpa,
            "confidence": "Low (scikit-learn not installed)",
            "model": "Weighted Heuristic",
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
