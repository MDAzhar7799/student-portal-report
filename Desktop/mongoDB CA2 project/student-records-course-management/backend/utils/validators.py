"""
=============================================================
validators.py — Input Validation Utilities
=============================================================
Technology: Python
=============================================================
"""

import re
from datetime import datetime


def validate_email(email: str) -> bool:
    """Validate email format using regex."""
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email))


def validate_student_id(student_id: str) -> bool:
    """Validate student ID format (e.g., STU001, STU2024001)."""
    pattern = r"^STU\d{3,10}$"
    return bool(re.match(pattern, student_id.upper()))


def validate_course_code(code: str) -> bool:
    """Validate course code format (e.g., CS101, MATH201)."""
    pattern = r"^[A-Z]{2,6}\d{3,4}$"
    return bool(re.match(code.upper(), code.upper())) and len(code) <= 10


def validate_grade(grade: float) -> bool:
    """Validate that grade is between 0 and 100."""
    return 0 <= grade <= 100


def validate_required_fields(data: dict, required: list) -> tuple:
    """
    Check that all required fields exist and are non-empty.
    Returns: (is_valid: bool, missing_fields: list)
    """
    missing = [field for field in required if not data.get(field)]
    return len(missing) == 0, missing


def sanitize_string(value: str, max_length: int = 200) -> str:
    """Strip and truncate string input."""
    if not isinstance(value, str):
        return str(value)
    return value.strip()[:max_length]


def validate_phone(phone: str) -> bool:
    """Validate international phone number format."""
    pattern = r"^\+?[\d\s\-()]{7,15}$"
    return bool(re.match(pattern, phone))


def calculate_letter_grade(score: float) -> str:
    """Convert numeric score to letter grade."""
    if score >= 90:
        return "A+"
    elif score >= 85:
        return "A"
    elif score >= 80:
        return "A-"
    elif score >= 75:
        return "B+"
    elif score >= 70:
        return "B"
    elif score >= 65:
        return "B-"
    elif score >= 60:
        return "C+"
    elif score >= 55:
        return "C"
    elif score >= 50:
        return "C-"
    elif score >= 45:
        return "D"
    else:
        return "F"


def calculate_gpa_points(letter_grade: str) -> float:
    """Convert letter grade to GPA points."""
    gpa_map = {
        "A+": 4.0,
        "A": 4.0,
        "A-": 3.7,
        "B+": 3.3,
        "B": 3.0,
        "B-": 2.7,
        "C+": 2.3,
        "C": 2.0,
        "C-": 1.7,
        "D": 1.0,
        "F": 0.0,
    }
    return gpa_map.get(letter_grade, 0.0)
