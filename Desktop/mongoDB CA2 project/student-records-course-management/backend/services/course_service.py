"""
=============================================================
course_service.py — Course Business Logic Layer
=============================================================
Technology: Python + PyMongo
=============================================================
"""

from database.mongodb import courses_col, enrollments_col, results_col
from datetime import datetime
from bson import ObjectId


def get_course_statistics(course_id: str) -> dict:
    """Get full stats for a course including enrollment and results data."""
    try:
        course = courses_col().find_one({"_id": ObjectId(course_id)})
    except Exception:
        course = courses_col().find_one({"course_code": course_id.upper()})

    if not course:
        return None

    enrollment_count = enrollments_col().count_documents({"course_id": str(course["_id"])})
    results = list(results_col().find({"course_id": str(course["_id"])}))
    scores = [r.get("score", 0) for r in results]

    return {
        "course_id": str(course["_id"]),
        "course_code": course.get("course_code"),
        "name": course.get("name"),
        "enrollment_count": enrollment_count,
        "max_students": course.get("max_students", 30),
        "capacity_used": f"{enrollment_count}/{course.get('max_students', 30)}",
        "results_count": len(results),
        "avg_score": round(sum(scores) / len(scores), 2) if scores else 0,
        "pass_rate": round(len([s for s in scores if s >= 50]) / len(scores) * 100, 1) if scores else 0,
    }


def get_popular_courses(limit: int = 5) -> list:
    """Get most popular courses by enrollment count."""
    pipeline = [
        {"$group": {"_id": "$course_id", "count": {"$sum": 1}, "course_name": {"$first": "$course_name"}, "course_code": {"$first": "$course_code"}}},
        {"$sort": {"count": -1}},
        {"$limit": limit}
    ]
    return list(enrollments_col().aggregate(pipeline))
