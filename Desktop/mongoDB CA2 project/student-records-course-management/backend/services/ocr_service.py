"""
=============================================================
ocr_service.py — OCR Business Logic Service
=============================================================
Technology: Python + OpenCV + pytesseract + scikit-learn
Provides image preprocessing and text extraction services.
=============================================================
"""

import os
import re
from datetime import datetime


def process_uploaded_image(file_path: str) -> dict:
    """
    Full OCR pipeline:
    1. Preprocess with OpenCV
    2. Extract text with pytesseract
    3. Parse structured data
    Returns: { text, confidence, parsed_data }
    """
    try:
        import sys
        ocr_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'ocr')
        if ocr_path not in sys.path:
            sys.path.insert(0, ocr_path)

        from ocr.preprocess import preprocess_image
        from ocr.extractor import extract_text, parse_student_data

        processed_path = preprocess_image(file_path)
        text, confidence = extract_text(processed_path)
        parsed = parse_student_data(text)

        return {
            "success": True,
            "text": text,
            "confidence": confidence,
            "parsed_data": parsed,
            "processed_at": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "text": "",
            "confidence": 0,
            "parsed_data": {},
        }


def classify_document_type(text: str) -> str:
    """
    ML-based document type classification.
    Classifies OCR text into: transcript, result_sheet, enrollment_form
    """
    text_lower = text.lower()

    transcript_keywords = ["cgpa", "gpa", "transcript", "grade report", "academic record"]
    result_keywords = ["result", "score", "marks", "examination", "final exam"]
    enrollment_keywords = ["enrollment", "enroll", "registration", "enrolled", "course registration"]

    scores = {
        "transcript": sum(1 for k in transcript_keywords if k in text_lower),
        "result_sheet": sum(1 for k in result_keywords if k in text_lower),
        "enrollment_form": sum(1 for k in enrollment_keywords if k in text_lower),
    }

    max_type = max(scores, key=scores.get)
    return max_type if scores[max_type] > 0 else "unknown"
