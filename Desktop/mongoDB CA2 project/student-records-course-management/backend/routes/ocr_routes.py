"""
=============================================================
ocr_routes.py — OCR Upload & Processing REST API
=============================================================
Technology: Flask REST API + OpenCV + pytesseract + PyMongo
Endpoints:
  POST /api/ocr/upload    - Upload image and extract text
  GET  /api/ocr/documents - List OCR'd documents
  GET  /api/ocr/:id       - Get OCR document
  DELETE /api/ocr/:id     - Delete document
=============================================================
"""

import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from database.mongodb import documents_col
from utils.auth import token_required
from datetime import datetime
from bson import ObjectId

# Import OCR modules
import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'ocr'))

ocr_bp = Blueprint("ocr", __name__)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "bmp", "tiff", "gif"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _serialize_document(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "filename": doc.get("filename"),
        "original_name": doc.get("original_name"),
        "extracted_text": doc.get("extracted_text", ""),
        "parsed_data": doc.get("parsed_data", {}),
        "confidence": doc.get("confidence", 0),
        "status": doc.get("status", "processed"),
        "uploaded_by": doc.get("uploaded_by", ""),
        "created_at": doc.get("created_at", datetime.utcnow()).isoformat(),
    }


@ocr_bp.route("/upload", methods=["POST"])
@token_required
def upload_and_extract():
    """
    POST /api/ocr/upload
    Upload an image file, process with OpenCV + pytesseract,
    store results in MongoDB documents collection.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": f"Invalid file type. Allowed: {ALLOWED_EXTENSIONS}"}), 400

    # Save uploaded file
    upload_folder = current_app.config.get("UPLOAD_FOLDER", "../uploads")
    os.makedirs(upload_folder, exist_ok=True)

    unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(upload_folder, unique_filename)
    file.save(file_path)

    # ----------------------------
    # OCR Processing with OpenCV + pytesseract
    # ----------------------------
    try:
        from ocr.preprocess import preprocess_image
        from ocr.extractor import extract_text, parse_student_data

        # Step 1: Preprocess with OpenCV
        processed_path = preprocess_image(file_path)

        # Step 2: Extract text with pytesseract
        extracted_text, confidence = extract_text(processed_path)

        # Step 3: Parse structured data
        parsed_data = parse_student_data(extracted_text)

        ocr_status = "processed"
        error_msg = None
    except ImportError:
        # Fallback if OCR libraries not installed
        extracted_text = "OCR libraries not installed. Install opencv-python and pytesseract."
        confidence = 0
        parsed_data = {}
        ocr_status = "error"
        error_msg = "OCR libraries missing"
    except Exception as e:
        extracted_text = ""
        confidence = 0
        parsed_data = {}
        ocr_status = "error"
        error_msg = str(e)

    # PyMongo: Store document in MongoDB
    doc_record = {
        "filename": unique_filename,
        "original_name": file.filename,
        "file_path": file_path,
        "extracted_text": extracted_text,
        "parsed_data": parsed_data,
        "confidence": confidence,
        "status": ocr_status,
        "error": error_msg,
        "uploaded_by": request.current_user.get("username", ""),
        "created_at": datetime.utcnow(),
    }

    result = documents_col().insert_one(doc_record)
    doc_record["_id"] = result.inserted_id

    return jsonify({
        "message": "File processed successfully",
        "document": _serialize_document(doc_record),
        "ocr_result": {
            "text": extracted_text,
            "confidence": confidence,
            "parsed_data": parsed_data,
        }
    }), 201


@ocr_bp.route("/documents", methods=["GET"])
@token_required
def get_documents():
    """GET /api/ocr/documents — List all OCR documents."""
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 10))
    skip = (page - 1) * limit

    docs = list(documents_col().find({}).sort("created_at", -1).skip(skip).limit(limit))
    total = documents_col().count_documents({})

    return jsonify({
        "documents": [_serialize_document(d) for d in docs],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }), 200


@ocr_bp.route("/documents/<doc_id>", methods=["GET"])
@token_required
def get_document(doc_id):
    """GET /api/ocr/:id — Get single OCR document."""
    try:
        doc = documents_col().find_one({"_id": ObjectId(doc_id)})
    except Exception:
        return jsonify({"error": "Invalid document ID"}), 400

    if not doc:
        return jsonify({"error": "Document not found"}), 404

    return jsonify({"document": _serialize_document(doc)}), 200


@ocr_bp.route("/documents/<doc_id>", methods=["DELETE"])
@token_required
def delete_document(doc_id):
    """DELETE /api/ocr/:id — Delete OCR document."""
    try:
        doc = documents_col().find_one({"_id": ObjectId(doc_id)})
    except Exception:
        return jsonify({"error": "Invalid document ID"}), 400

    if not doc:
        return jsonify({"error": "Document not found"}), 404

    # Remove file from disk
    file_path = doc.get("file_path", "")
    if file_path and os.path.exists(file_path):
        os.remove(file_path)

    documents_col().delete_one({"_id": doc["_id"]})
    return jsonify({"message": "Document deleted"}), 200
