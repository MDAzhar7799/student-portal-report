"""
=============================================================
student_service.py — Student Business Logic Layer
=============================================================
Technology: Python + PyMongo
Handles complex student operations and ML-enhanced analytics.
=============================================================
"""

from database.mongodb import students_col, results_col, enrollments_col
from utils.validators import calculate_letter_grade, calculate_gpa_points
from datetime import datetime
from bson import ObjectId


def get_student_academic_summary(student_id: str) -> dict:
    """
    Get comprehensive academic summary for a student.
    Uses PyMongo to aggregate results across all courses.
    """
    # Get all results for student
    all_results = list(results_col().find({"student_id": student_id}))
    # Get all enrollments
    all_enrollments = list(enrollments_col().find({"student_id": student_id}))

    if not all_results:
        return {
            "total_courses": len(all_enrollments),
            "completed_courses": 0,
            "total_credits": 0,
            "cgpa": 0.0,
            "highest_score": 0,
            "lowest_score": 0,
            "average_score": 0,
            "grade_distribution": {},
        }

    scores = [r.get("score", 0) for r in all_results]
    total_credit_points = sum(r.get("gpa_points", 0) * r.get("credits", 3) for r in all_results)
    total_credits = sum(r.get("credits", 3) for r in all_results)
    cgpa = round(total_credit_points / total_credits, 2) if total_credits > 0 else 0.0

    # Grade distribution
    grade_dist = {}
    for r in all_results:
        grade = r.get("letter_grade", "N/A")
        grade_dist[grade] = grade_dist.get(grade, 0) + 1

    return {
        "total_courses": len(all_enrollments),
        "completed_courses": len(all_results),
        "total_credits": total_credits,
        "cgpa": cgpa,
        "highest_score": max(scores),
        "lowest_score": min(scores),
        "average_score": round(sum(scores) / len(scores), 2),
        "grade_distribution": grade_dist,
    }


def predict_academic_risk(student_id: str) -> dict:
    """
    ML-based academic risk assessment.
    Analyzes score trends to detect at-risk students.
    Returns: risk_level (low/medium/high), recommendations
    """
    results = list(results_col().find({"student_id": student_id}).sort("created_at", -1))

    if not results:
        return {"risk_level": "unknown", "reason": "No results found"}

    scores = [r.get("score", 0) for r in results]
    avg_score = sum(scores) / len(scores)

    # Simple ML-like risk scoring
    risk_factors = []
    if avg_score < 50:
        risk_factors.append("Average score below 50%")
    if len([s for s in scores if s < 50]) > len(scores) * 0.5:
        risk_factors.append("More than 50% of scores below passing")

    # Trend analysis: is performance declining?
    if len(scores) >= 3:
        recent_avg = sum(scores[:3]) / 3
        older_avg = sum(scores[3:]) / max(len(scores[3:]), 1)
        if recent_avg < older_avg - 10:
            risk_factors.append("Declining performance trend detected")

    if len(risk_factors) >= 2:
        risk_level = "high"
    elif len(risk_factors) == 1:
        risk_level = "medium"
    else:
        risk_level = "low"

    recommendations = {
        "high": ["Schedule academic counseling", "Review course load", "Attend tutoring sessions"],
        "medium": ["Attend extra study sessions", "Review weak subject areas"],
        "low": ["Keep up the good work!", "Consider advanced coursework"],
    }

    return {
        "risk_level": risk_level,
        "risk_factors": risk_factors,
        "average_score": round(avg_score, 2),
        "recommendations": recommendations.get(risk_level, []),
    }


def get_all_students_with_stats() -> list:
    """Get all students with their result statistics."""
    students = list(students_col().find({"status": "active"}))
    enriched = []
    for student in students:
        sid = str(student["_id"])
        results = list(results_col().find({"student_id": sid}))
        scores = [r.get("score", 0) for r in results]
        enriched.append({
            "id": sid,
            "student_id": student.get("student_id"),
            "name": student.get("name"),
            "department": student.get("department"),
            "cgpa": student.get("cgpa", 0),
            "courses_taken": len(results),
            "avg_score": round(sum(scores) / len(scores), 2) if scores else 0,
        })
    return enriched
