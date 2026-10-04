"""
=============================================================
test_api.py — System & API Test Suite
=============================================================
Technology: Python + pytest + Flask TestClient + PyMongo validation
=============================================================
"""

import sys
import os
import pytest

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from utils.validators import (
    validate_email,
    validate_student_id,
    validate_grade,
    calculate_letter_grade,
    calculate_gpa_points,
    validate_required_fields,
    sanitize_string
)
from utils.auth import generate_token, decode_token
from app import create_app


# =============================================================
# 1. Validation Tests
# =============================================================

class TestValidators:
    """Unit tests for input validation logic."""

    def test_valid_emails(self):
        assert validate_email("student@university.edu") is True
        assert validate_email("john.doe@domain.co.uk") is True
        assert validate_email("invalid-email") is False
        assert validate_email("@nodomain.com") is False
        assert validate_email("user@") is False

    def test_student_id_format(self):
        assert validate_student_id("STU001") is True
        assert validate_student_id("STU202401") is True
        assert validate_student_id("ABC001") is False
        assert validate_student_id("STU") is False

    def test_grade_boundaries(self):
        assert validate_grade(0) is True
        assert validate_grade(100) is True
        assert validate_grade(85.5) is True
        assert validate_grade(-1) is False
        assert validate_grade(101) is False

    def test_letter_grade_conversion(self):
        assert calculate_letter_grade(95) == "A+"
        assert calculate_letter_grade(87) == "A"
        assert calculate_letter_grade(82) == "A-"
        assert calculate_letter_grade(77) == "B+"
        assert calculate_letter_grade(72) == "B"
        assert calculate_letter_grade(68) == "B-"
        assert calculate_letter_grade(63) == "C+"
        assert calculate_letter_grade(56) == "C"
        assert calculate_letter_grade(52) == "C-"
        assert calculate_letter_grade(47) == "D"
        assert calculate_letter_grade(30) == "F"

    def test_gpa_points_mapping(self):
        assert calculate_gpa_points("A+") == 4.0
        assert calculate_gpa_points("A") == 4.0
        assert calculate_gpa_points("A-") == 3.7
        assert calculate_gpa_points("B+") == 3.3
        assert calculate_gpa_points("B") == 3.0
        assert calculate_gpa_points("C+") == 2.3
        assert calculate_gpa_points("D") == 1.0
        assert calculate_gpa_points("F") == 0.0
        assert calculate_gpa_points("UNKNOWN") == 0.0

    def test_required_fields_check(self):
        payload = {"name": "Alice", "email": "alice@test.com"}
        valid, missing = validate_required_fields(payload, ["name", "email"])
        assert valid is True
        assert len(missing) == 0

        valid, missing = validate_required_fields(payload, ["name", "email", "age"])
        assert valid is False
        assert "age" in missing

    def test_string_sanitizer(self):
        assert sanitize_string("   test string   ") == "test string"
        assert len(sanitize_string("a" * 300, max_length=100)) == 100


# =============================================================
# 2. JWT Authentication Tests
# =============================================================

class TestAuthentication:
    """Unit tests for JWT generation and verification within app context."""

    @pytest.fixture(autouse=True)
    def app_context(self):
        app = create_app()
        with app.app_context():
            yield

    def test_token_lifecycle(self):
        user_id = "507f1f77bcf86cd799439011"
        username = "admin"
        role = "admin"

        token = generate_token(user_id, username, role)
        assert token is not None
        assert isinstance(token, str)

        result = decode_token(token)
        assert result is not None
        assert result.get("valid") is True
        payload = result.get("payload", {})
        assert payload.get("user_id") == user_id
        assert payload.get("username") == username
        assert payload.get("role") == role

    def test_invalid_token_decode(self):
        result = decode_token("invalid.jwt.token.string")
        assert result is not None
        assert result.get("valid") is False
        assert "error" in result


# =============================================================
# 3. Machine Learning Grade Prediction Logic Tests
# =============================================================

class TestMachineLearningModel:
    """Unit tests for the weighted linear regression grade predictor."""

    def test_prediction_calculation(self):
        attendance = 90.0
        assignments_avg = 85.0
        midterm_score = 80.0

        # Formula: 0.20 * 90 + 0.30 * 85 + 0.50 * 80 = 18 + 25.5 + 40 = 83.5
        predicted = (0.20 * attendance) + (0.30 * assignments_avg) + (0.50 * midterm_score)
        predicted = max(0, min(100, round(predicted, 2)))

        assert predicted == 83.5
        letter = calculate_letter_grade(predicted)
        assert letter == "A-"
        assert calculate_gpa_points(letter) == 3.7

    def test_boundary_prediction(self):
        # 100% everywhere -> 100% (A+)
        predicted = (0.20 * 100) + (0.30 * 100) + (0.50 * 100)
        assert predicted == 100.0
        assert calculate_letter_grade(predicted) == "A+"

        # 0% everywhere -> 0% (F)
        predicted = (0.20 * 0) + (0.30 * 0) + (0.50 * 0)
        assert predicted == 0.0
        assert calculate_letter_grade(predicted) == "F"


# =============================================================
# 4. Flask Application Endpoint Tests
# =============================================================

class TestFlaskEndpoints:
    """Integration tests with Flask test client."""

    @pytest.fixture
    def client(self):
        app = create_app()
        app.config["TESTING"] = True
        with app.test_client() as client:
            yield client

    def test_health_check(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.get_json()
        assert "status" in data
        assert "technologies" in data
        assert data["technologies"]["database"] == "MongoDB ⭐"
        assert data["technologies"]["driver"] == "PyMongo ⭐"

    def test_unauthenticated_protected_route(self, client):
        # Accessing protected /api/students/ without Authorization header should return 401
        response = client.get("/api/students/")
        assert response.status_code == 401
        data = response.get_json()
        assert "error" in data

    def test_login_missing_credentials(self, client):
        response = client.post("/api/auth/login", json={})
        assert response.status_code == 400
        data = response.get_json()
        assert "error" in data

    def test_not_found_endpoint(self, client):
        response = client.get("/api/nonexistent-route")
        assert response.status_code == 404


# =============================================================
# 5. CSE CGPA Calculator & Reappear Handling Tests
# =============================================================

class TestCGPACalculator:
    """Unit and Integration tests for CGPA/TCGPA engine and reappear logic."""

    @pytest.fixture
    def client(self):
        app = create_app()
        app.config["TESTING"] = True
        with app.test_client() as client:
            yield client

    @pytest.fixture
    def auth_headers(self):
        app = create_app()
        with app.app_context():
            token = generate_token("507f1f77bcf86cd799439011", "admin_test", "admin")
            return {"Authorization": f"Bearer {token}"}

    def test_cgpa_calculation_with_reappear(self, client, auth_headers):
        """
        Verify that reappear subjects get letter grade 'RA',
        are excluded from TCGPA without affecting passed subjects' grades.
        """
        payload = {
            "student_name": "Aarav Sharma",
            "student_id": "CSE202401",
            "semester": "Semester 6",
            "subjects": [
                {
                    "subject_name": "Data Structures",
                    "credits": 4,
                    "total_marks": 100,
                    "obtained_marks": 92,
                    "is_reappear": False
                },
                {
                    "subject_name": "Operating Systems",
                    "credits": 3,
                    "total_marks": 100,
                    "obtained_marks": 0,
                    "is_reappear": True
                },
                {
                    "subject_name": "Database Management",
                    "credits": 3,
                    "total_marks": 100,
                    "obtained_marks": 82,
                    "is_reappear": False
                }
            ]
        }

        response = client.post("/api/cgpa/calculate", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()

        assert data["student_name"] == "Aarav Sharma"
        assert data["total_credits"] == 10
        assert data["valid_credits"] == 7
        assert data["reappear_count"] == 1

        # Check subjects
        subjs = {s["subject_name"]: s for s in data["subjects"]}

        # Reappear subject has letter grade RA and status Reappear
        assert subjs["Operating Systems"]["letter_grade"] == "RA"
        assert subjs["Operating Systems"]["status"] == "Reappear"
        assert subjs["Operating Systems"]["is_reappear"] is True

        # Passed subjects retain their full proper letter grades
        assert subjs["Data Structures"]["letter_grade"] == "A+"
        assert subjs["Data Structures"]["status"] == "Pass"
        assert subjs["Database Management"]["letter_grade"] == "A-"
        assert subjs["Database Management"]["status"] == "Pass"

        # TCGPA excludes reappear credits (valid_credits = 7)
        assert data["tcgpa"] > 0
        assert data["tcgpa"] >= data["cgpa"]

    def test_ml_grade_prediction(self, client, auth_headers):
        """Verify ML grade prediction endpoint returns prediction and model info."""
        payload = {
            "attendance_pct": 88,
            "internal_marks": 24,
            "assignment_score": 16,
            "mid_term_score": 36
        }
        response = client.post("/api/cgpa/predict", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert "predicted_score" in data
        assert "predicted_grade" in data
        assert "predicted_gpa" in data
        assert data["predicted_score"] > 0

