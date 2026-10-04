"""
=============================================================
extractor.py — Text Extraction with pytesseract + OpenCV
=============================================================
Technology: Python + pytesseract + OpenCV + re (regex)
Purpose: Extract text from preprocessed images and parse
         structured student/course data.
=============================================================
"""

import pytesseract
import cv2
import numpy as np
import os
import re
from PIL import Image


def configure_tesseract():
    """
    Configure pytesseract path for Windows.
    Tesseract-OCR must be installed separately.
    """
    tesseract_path = os.getenv(
        "TESSERACT_CMD",
        r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    )
    if os.path.exists(tesseract_path):
        pytesseract.pytesseract.tesseract_cmd = tesseract_path


# Configure on import
configure_tesseract()


def extract_text(image_path: str, lang: str = "eng") -> tuple:
    """
    Extract text from image using pytesseract (Tesseract OCR).

    Args:
        image_path: Path to preprocessed image
        lang: OCR language (default: 'eng')

    Returns:
        (extracted_text: str, confidence: float)
    """
    # Load image with PIL (pytesseract prefers PIL Image)
    img = Image.open(image_path)

    # Tesseract configuration for better accuracy
    # --oem 3: Use default OCR Engine Mode (LSTM + Legacy)
    # --psm 6: Assume uniform block of text
    custom_config = r"--oem 3 --psm 6"

    try:
        # Extract text using pytesseract
        extracted_text = pytesseract.image_to_string(img, lang=lang, config=custom_config)

        # Get confidence scores using image_to_data
        data = pytesseract.image_to_data(img, config=custom_config, output_type=pytesseract.Output.DICT)
        confidences = [int(c) for c in data["conf"] if str(c).isdigit() and int(c) > 0]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0

        return extracted_text.strip(), round(avg_confidence, 2)

    except Exception as e:
        return f"OCR Error: {str(e)}", 0.0


def extract_text_from_regions(image_path: str) -> list:
    """
    Extract text with bounding box information.
    Returns list of { text, x, y, w, h, confidence } for each word.
    """
    img = Image.open(image_path)
    data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)

    regions = []
    for i in range(len(data["text"])):
        text = data["text"][i].strip()
        conf = int(data["conf"][i]) if str(data["conf"][i]).isdigit() else 0
        if text and conf > 30:
            regions.append({
                "text": text,
                "x": data["left"][i],
                "y": data["top"][i],
                "w": data["width"][i],
                "h": data["height"][i],
                "confidence": conf,
            })
    return regions


def parse_student_data(text: str) -> dict:
    """
    Parse extracted OCR text to find structured student information.
    Uses regex patterns to extract:
    - Student name
    - Student ID
    - Email
    - Course codes and scores
    - CGPA/GPA

    Args:
        text: Raw OCR text

    Returns:
        Parsed data dictionary
    """
    parsed = {}

    # Extract Student ID (e.g., STU001, STU2024001)
    student_id_match = re.search(r'\b(STU\d{3,10})\b', text, re.IGNORECASE)
    if student_id_match:
        parsed["student_id"] = student_id_match.group(1).upper()

    # Extract Email
    email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
    if email_match:
        parsed["email"] = email_match.group(0)

    # Extract Name (Name: John Doe pattern)
    name_match = re.search(r'(?:Name|Student)\s*[:\-]\s*([A-Za-z\s]{2,50})', text, re.IGNORECASE)
    if name_match:
        parsed["name"] = name_match.group(1).strip()

    # Extract CGPA/GPA
    cgpa_match = re.search(r'(?:CGPA|GPA)\s*[:\-]?\s*(\d+\.?\d*)', text, re.IGNORECASE)
    if cgpa_match:
        parsed["cgpa"] = float(cgpa_match.group(1))

    # Extract Course Codes (e.g., CS101, MATH201)
    course_codes = re.findall(r'\b([A-Z]{2,6}\d{3,4})\b', text)
    if course_codes:
        parsed["course_codes"] = list(set(course_codes))

    # Extract scores/marks (number followed by / 100 or % or marks)
    scores = re.findall(r'(\d{1,3})\s*(?:/\s*100|%|marks?)', text, re.IGNORECASE)
    if scores:
        parsed["scores"] = [int(s) for s in scores if 0 <= int(s) <= 100]

    # Extract semester
    semester_match = re.search(r'(?:Semester|Sem)\s*[:\-]?\s*(\d+|[A-Za-z]+)', text, re.IGNORECASE)
    if semester_match:
        parsed["semester"] = semester_match.group(1)

    # Extract Department
    dept_match = re.search(r'(?:Department|Dept)\s*[:\-]\s*([A-Za-z\s&]{3,40})', text, re.IGNORECASE)
    if dept_match:
        parsed["department"] = dept_match.group(1).strip()

    # Extract Phone number
    phone_match = re.search(r'(?:Phone|Tel|Mobile)\s*[:\-]?\s*([\+\d\s\-()]{7,15})', text, re.IGNORECASE)
    if phone_match:
        parsed["phone"] = phone_match.group(1).strip()

    parsed["raw_text_length"] = len(text)
    parsed["fields_extracted"] = len([v for v in parsed.values() if v])

    return parsed


def detect_table_structure(image_path: str) -> list:
    """
    Detect table structure in image using OpenCV contours.
    Returns list of cell bounding boxes for table extraction.
    """
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return []

    # Threshold to binary
    _, binary = cv2.threshold(img, 128, 255, cv2.THRESH_BINARY_INV)

    # Find contours
    contours, _ = cv2.findContours(binary, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    cells = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        # Filter for table-cell-like rectangles
        if 30 < w < 500 and 15 < h < 100:
            cells.append({"x": x, "y": y, "w": w, "h": h})

    # Sort cells by row then column
    cells.sort(key=lambda c: (c["y"], c["x"]))
    return cells
