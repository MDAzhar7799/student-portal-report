"""
=============================================================
mcq_routes.py — MCQ Exam Practice REST API
=============================================================
Technology: Flask REST API + PyMongo (MongoDB) + pytesseract
            + OpenCV + regex NLP parsing
Collections:
  - mcq_papers   : uploaded question papers and extracted MCQs
  - mcq_sessions : practice session results and attempt history

Endpoints:
  POST   /api/mcq/upload               - Upload question paper image/PDF
  GET    /api/mcq/papers               - List all uploaded question papers
  GET    /api/mcq/papers/<id>          - Get a single paper with its MCQs
  DELETE /api/mcq/papers/<id>          - Delete a paper
  POST   /api/mcq/sessions             - Start a practice session
  POST   /api/mcq/sessions/<id>/submit - Submit answers and get results
  GET    /api/mcq/sessions             - List all sessions
  GET    /api/mcq/sessions/<id>        - Get one session result
=============================================================
"""

import os
import re
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from bson import ObjectId
from database.mongodb import mcq_papers_col, mcq_sessions_col
from utils.auth import token_required

mcq_bp = Blueprint("mcq", __name__)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "bmp", "tiff", "gif", "pdf"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _extract_text_from_image(file_path):
    """Extract text from image using OpenCV + pytesseract OCR."""
    try:
        import cv2
        import pytesseract
        img = cv2.imread(file_path)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (3, 3), 0)
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        text = pytesseract.image_to_string(thresh, config="--psm 6")
        return text, None
    except ImportError:
        return None, "OCR libraries not installed"
    except Exception as e:
        return None, str(e)


def _extract_text_from_pdf(file_path):
    """Extract text from PDF using pdfplumber, pypdf, or PyMuPDF."""
    # 1. Try pdfplumber
    try:
        import pdfplumber
        text_pages = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text_pages.append(t)
        if text_pages:
            return "\n".join(text_pages), None
    except Exception:
        pass

    # 2. Try pypdf
    try:
        import pypdf
        reader = pypdf.PdfReader(file_path)
        text_pages = []
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text_pages.append(t)
        if text_pages:
            return "\n".join(text_pages), None
    except Exception:
        pass

    # 3. Try PyMuPDF (fitz)
    try:
        import fitz
        doc = fitz.open(file_path)
        text_pages = [page.get_text() for page in doc]
        if text_pages:
            return "\n".join(text_pages), None
    except Exception:
        pass

    return None, "Failed to extract text from PDF. Ensure pdfplumber or pypdf is installed."


def _parse_mcq_questions(raw_text):
    """
    Parse MCQ questions from raw text.
    Supports formats like:
      1. Question?
         A) opt  B) opt  C) opt  D) opt
         Answer: B
    Returns list of question dicts.
    """
    questions = []
    lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
    i = 0
    while i < len(lines):
        line = lines[i]
        q_match = re.match(
            r"^(?:Q(?:uestion)?[\s.]?\s*)?(\d+)[.):\s]\s*(.+)$",
            line, re.IGNORECASE,
        )
        if not q_match:
            i += 1
            continue

        q_number = q_match.group(1)
        q_text_parts = [q_match.group(2).strip()]
        i += 1

        while i < len(lines) and not re.match(r"^[\(\[]?[aAbBcCdDeE][\)\]\.:]", lines[i]):
            if re.match(r"^(?:Q(?:uestion)?[\s.]?\s*)?\d+[.):\s]", lines[i], re.IGNORECASE):
                break
            q_text_parts.append(lines[i])
            i += 1

        question_text = " ".join(q_text_parts).strip()
        if not question_text:
            continue

        options = {}
        while i < len(lines):
            opt_line = lines[i]
            opt_match = re.match(r"^[\(\[]?([aAbBcCdDeE])[\)\]\.:\s]+(.+)$", opt_line)
            if opt_match:
                options[opt_match.group(1).upper()] = opt_match.group(2).strip()
                i += 1
            else:
                inline = re.findall(
                    r"[\(\[]?([aAbBcCdDeE])[\)\]\.:\s]+([^ABCDE\(\[]{2,40}?)(?=\s*[\(\[]?[ABCDE][\)\]\.:\s]|$)",
                    opt_line, re.IGNORECASE,
                )
                if len(inline) >= 2:
                    for k, v in inline:
                        options[k.upper()] = v.strip()
                    i += 1
                else:
                    break

        correct = None
        if i < len(lines):
            ans_match = re.match(
                r"^(?:ans(?:wer)?|correct\s*ans(?:wer)?|key|solution)[:\s.\-]*\(?([aAbBcCdDeE\d])\)?",
                lines[i], re.IGNORECASE,
            )
            if ans_match:
                correct = ans_match.group(1).upper()
                mapping = {"1": "A", "2": "B", "3": "C", "4": "D", "5": "E"}
                if correct in mapping:
                    correct = mapping[correct]
                i += 1

        if not options:
            continue

        questions.append({
            "question_number": int(q_number),
            "question": question_text,
            "question_text": question_text,
            "options": options,
            "correct_answer": correct,
        })

    return questions


def _serialize_paper(doc, include_answers=False):
    questions = doc.get("questions", [])
    if not include_answers:
        questions = [{k: v for k, v in q.items() if k != "correct_answer"} for q in questions]
    return {
        "id": str(doc["_id"]),
        "title": doc.get("title", "Untitled Paper"),
        "subject": doc.get("subject", "General Exam"),
        "original_name": doc.get("original_name", ""),
        "filename": doc.get("filename", ""),
        "total_questions": len(questions),
        "question_count": len(questions),
        "questions": questions,
        "extracted_text_preview": doc.get("raw_text", "")[:300],
        "uploaded_by": doc.get("uploaded_by", ""),
        "created_at": doc.get("created_at", datetime.utcnow()).isoformat(),
        "has_answer_key": any(q.get("correct_answer") for q in doc.get("questions", [])),
        "status": doc.get("status", "processed"),
        "parse_error": doc.get("parse_error"),
    }


def _serialize_session(doc):
    return {
        "id": str(doc["_id"]),
        "paper_id": str(doc.get("paper_id", "")),
        "paper_title": doc.get("paper_title", ""),
        "score": doc.get("score", 0),
        "total": doc.get("total", 0),
        "total_questions": doc.get("total", 0),
        "percentage": doc.get("percentage", 0),
        "answers": doc.get("answers", []),
        "results": doc.get("answers", []),  # alias for review modal
        "completed_at": (doc.get("completed_at") or datetime.utcnow()).isoformat(),
        "created_at": (doc.get("created_at") or datetime.utcnow()).isoformat(),
        "created_by": doc.get("created_by", ""),
        "status": doc.get("status", "in_progress"),
    }


@mcq_bp.route("/upload", methods=["POST"])
@token_required
def upload_question_paper():
    """POST /api/mcq/upload — Upload question paper and extract MCQs."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file = request.files["file"]
    if not file or file.filename == "":
        return jsonify({"error": "No file selected"}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

    title = request.form.get("title", "") or os.path.splitext(file.filename)[0]
    upload_folder = current_app.config.get("UPLOAD_FOLDER", "../uploads")
    mcq_folder = os.path.join(upload_folder, "mcq")
    os.makedirs(mcq_folder, exist_ok=True)

    ext = file.filename.rsplit(".", 1)[1].lower()
    unique_filename = f"mcq_{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(mcq_folder, unique_filename)
    file.save(file_path)

    if ext == "pdf":
        raw_text, extract_error = _extract_text_from_pdf(file_path)
    else:
        raw_text, extract_error = _extract_text_from_image(file_path)

    if raw_text is None:
        raw_text = ""

    questions = []
    parse_error = None
    if raw_text.strip():
        try:
            questions = _parse_mcq_questions(raw_text)
        except Exception as e:
            parse_error = str(e)

    status = "processed" if questions else ("no_questions" if not extract_error else "error")

    paper_doc = {
        "title": title,
        "original_name": file.filename,
        "filename": unique_filename,
        "file_path": file_path,
        "raw_text": raw_text,
        "questions": questions,
        "question_count": len(questions),
        "status": status,
        "extract_error": extract_error,
        "parse_error": parse_error,
        "uploaded_by": request.current_user.get("username", ""),
        "created_at": datetime.utcnow(),
    }

    result = mcq_papers_col().insert_one(paper_doc)
    paper_doc["_id"] = result.inserted_id

    return jsonify({
        "message": f"Question paper uploaded! Extracted {len(questions)} MCQ question(s).",
        "paper": _serialize_paper(paper_doc, include_answers=True),
        "raw_text_preview": raw_text[:500] if raw_text else "",
        "questions_count": len(questions),
    }), 201


@mcq_bp.route("/upload-answer-key", methods=["POST"])
@token_required
def upload_answer_key():
    """
    POST /api/mcq/upload-answer-key
    Upload an answer key file (image/PDF) and attach answers to an existing paper.
    Form fields: paper_id, file
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file = request.files["file"]
    paper_id = request.form.get("paper_id", "").strip()
    if not paper_id:
        return jsonify({"error": "paper_id is required"}), 400
    if not file or file.filename == "":
        return jsonify({"error": "No file selected"}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

    # Verify the paper exists
    try:
        paper = mcq_papers_col().find_one({"_id": ObjectId(paper_id)})
    except Exception:
        return jsonify({"error": "Invalid paper ID"}), 400
    if not paper:
        return jsonify({"error": "Paper not found"}), 404

    # Save the answer key file
    upload_folder = current_app.config.get("UPLOAD_FOLDER", "../uploads")
    mcq_folder = os.path.join(upload_folder, "mcq")
    os.makedirs(mcq_folder, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[1].lower()
    unique_filename = f"anskey_{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(mcq_folder, unique_filename)
    file.save(file_path)

    # Extract text from answer key
    if ext == "pdf":
        raw_text, _ = _extract_text_from_pdf(file_path)
    else:
        raw_text, _ = _extract_text_from_image(file_path)

    if not raw_text or not raw_text.strip():
        return jsonify({"error": "Could not extract text from answer key. Please try a clearer image or PDF."}), 422

    # Parse answer key — supports formats:
    #   "1-A  2-B  3-C" or "1. A  2. B" or "Answer: A" per line
    parsed_answers = {}
    # Pattern 1: "1-A" or "1. A" or "1) A" or "Q1: A" etc.
    for match in re.finditer(
        r"(?:Q(?:uestion)?\s*)?(\d+)\s*[-.):\s]+\s*([A-Ea-e])\b",
        raw_text, re.IGNORECASE
    ):
        q_num = int(match.group(1))
        answer = match.group(2).upper()
        parsed_answers[q_num] = answer

    # Pattern 2: lines like "Answer: A" (context-dependent, map to unanswered questions)
    if not parsed_answers:
        answer_lines = re.findall(
            r"(?:ans(?:wer)?|correct)[:\s.]+\(?([A-Ea-e])\)?",
            raw_text, re.IGNORECASE
        )
        for idx, ans in enumerate(answer_lines, start=1):
            parsed_answers[idx] = ans.upper()

    if not parsed_answers:
        return jsonify({"error": "Could not parse any answers. Ensure format: '1-A, 2-B ...' or 'Answer: A'"}), 422

    # Update questions in the paper with parsed correct answers
    questions = paper.get("questions", [])
    updated_count = 0
    for q in questions:
        qn = q.get("question_number")
        if qn and qn in parsed_answers:
            q["correct_answer"] = parsed_answers[qn]
            updated_count += 1

    mcq_papers_col().update_one(
        {"_id": paper["_id"]},
        {"$set": {"questions": questions, "answer_key_file": unique_filename, "answer_key_uploaded_at": datetime.utcnow()}}
    )

    return jsonify({
        "message": f"Answer key uploaded! Matched {updated_count} of {len(questions)} questions.",
        "parsed_answers": parsed_answers,
        "matched": updated_count,
        "total": len(questions),
    }), 200


@mcq_bp.route("/gemini-answers", methods=["POST"])
@token_required
def gemini_auto_answers():
    """
    POST /api/mcq/gemini-answers
    Body: { "paper_id": "<mongo_id>" }

    Sends all MCQ questions from the paper to Google Gemini AI and
    stores the correct answers back into MongoDB automatically.
    No answer key upload needed!
    """
    import json as _json
    import urllib.request
    import urllib.error

    data = request.get_json() or {}
    paper_id = data.get("paper_id", "").strip()
    if not paper_id:
        return jsonify({"error": "paper_id is required"}), 400

    # Fetch the paper from MongoDB
    try:
        paper = mcq_papers_col().find_one({"_id": ObjectId(paper_id)})
    except Exception:
        return jsonify({"error": "Invalid paper ID"}), 400
    if not paper:
        return jsonify({"error": "Paper not found"}), 404

    questions = paper.get("questions", [])
    if not questions:
        return jsonify({"error": "No questions found in this paper. Please re-upload."}), 400

    # Get Gemini API key
    from config import Config
    api_key = Config.GEMINI_API_KEY
    if not api_key:
        return jsonify({"error": "Gemini API key not configured on server."}), 500

    # ── Build prompt for Gemini ───────────────────────────────────
    prompt_lines = [
        "You are an expert exam answer key generator.",
        "For each MCQ question below, provide ONLY the correct answer letter (A, B, C, or D).",
        "Respond in strict JSON format: {\"answers\": {\"1\": \"A\", \"2\": \"C\", ...}}",
        "Do NOT include any explanation. ONLY the JSON object.",
        "",
        "Questions:",
    ]
    for q in questions:
        qn = q.get("question_number", "?")
        qt = q.get("question", "")
        opts = q.get("options", {})
        opts_str = "  ".join(f"{k}) {v}" for k, v in sorted(opts.items()))
        prompt_lines.append(f"Q{qn}. {qt}")
        if opts_str:
            prompt_lines.append(f"   Options: {opts_str}")

    prompt = "\n".join(prompt_lines)

    # ── Call Gemini API with x-goog-api-key header ────────────────
    # AQ. keys ONLY work with the x-goog-api-key header (not ?key= or Bearer)
    GEMINI_MODELS = [
        "gemini-3.8-flash",        # confirmed working ✅
        "gemini-3.1-pro-preview",  # fallback
        "gemini-2.5-flash",        # legacy fallback
    ]

    payload = _json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 1024,
        },
    }).encode("utf-8")

    raw_text = None
    sdk_error = ""

    for model_name in GEMINI_MODELS:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model_name}:generateContent"
        )
        try:
            req = urllib.request.Request(
                url,
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": api_key,
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp_data = _json.loads(resp.read().decode("utf-8"))
            candidates = resp_data.get("candidates", [])
            if candidates:
                raw_text = candidates[0]["content"]["parts"][0]["text"]
                break
        except urllib.error.HTTPError as e:
            sdk_error = f"{model_name}: HTTP {e.code} — {e.read().decode()[:150]}"
        except Exception as ex:
            sdk_error = f"{model_name}: {str(ex)}"

    if not raw_text:
        return jsonify({"error": f"Gemini failed: {sdk_error}"}), 502

    # ── Parse the JSON answer from Gemini's response ──────────────
    try:
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```[a-z]*\n?", "", cleaned)
            cleaned = re.sub(r"\n?```$", "", cleaned)

        # Find JSON object in response
        json_match = re.search(r'\{.*"answers"\s*:\s*\{.*?\}\s*\}', cleaned, re.DOTALL)
        if json_match:
            answer_data = _json.loads(json_match.group(0))
        else:
            answer_data = _json.loads(cleaned)

        ai_answers = answer_data.get("answers", {})
        # Normalize keys to int
        ai_answers = {int(k): v.strip().upper() for k, v in ai_answers.items() if v}
    except Exception as e:
        return jsonify({
            "error": f"Could not parse Gemini response. Raw: {raw_text[:400]}",
            "parse_error": str(e),
        }), 502


    # ── Apply AI answers to questions & save to MongoDB ───────────
    updated_count = 0
    for q in questions:
        qn = q.get("question_number")
        if qn and qn in ai_answers:
            ans = ai_answers[qn]
            # Only accept valid option letters
            if ans in (q.get("options") or {}) or ans in ("A", "B", "C", "D", "E"):
                q["correct_answer"] = ans
                updated_count += 1

    mcq_papers_col().update_one(
        {"_id": paper["_id"]},
        {"$set": {
            "questions": questions,
            "gemini_answers_applied": True,
            "gemini_answered_at": datetime.utcnow(),
        }},
    )

    return jsonify({
        "message": f"✅ Gemini AI answered {updated_count} of {len(questions)} questions successfully!",
        "answered": updated_count,
        "total": len(questions),
        "ai_answers": ai_answers,
    }), 200


@mcq_bp.route("/papers", methods=["GET"])
@token_required
def list_papers():
    """GET /api/mcq/papers — List all uploaded question papers."""
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))
    skip = (page - 1) * limit
    papers = list(mcq_papers_col().find({}).sort("created_at", -1).skip(skip).limit(limit))
    total = mcq_papers_col().count_documents({})
    return jsonify({
        "papers": [_serialize_paper(p) for p in papers],
        "total": total,
        "page": page,
        "pages": max(1, (total + limit - 1) // limit),
    }), 200


@mcq_bp.route("/papers/<paper_id>", methods=["GET"])
@token_required
def get_paper(paper_id):
    """GET /api/mcq/papers/:id — Get paper with questions (no correct answers exposed)."""
    try:
        paper = mcq_papers_col().find_one({"_id": ObjectId(paper_id)})
    except Exception:
        return jsonify({"error": "Invalid paper ID"}), 400
    if not paper:
        return jsonify({"error": "Paper not found"}), 404
    return jsonify({"paper": _serialize_paper(paper, include_answers=False)}), 200


@mcq_bp.route("/papers/<paper_id>", methods=["DELETE"])
@token_required
def delete_paper(paper_id):
    """DELETE /api/mcq/papers/:id — Delete a question paper."""
    try:
        paper = mcq_papers_col().find_one({"_id": ObjectId(paper_id)})
    except Exception:
        return jsonify({"error": "Invalid paper ID"}), 400
    if not paper:
        return jsonify({"error": "Paper not found"}), 404
    file_path = paper.get("file_path", "")
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass
    mcq_papers_col().delete_one({"_id": paper["_id"]})
    return jsonify({"message": "Question paper deleted successfully"}), 200


@mcq_bp.route("/sessions", methods=["POST"])
@token_required
def create_session():
    """POST /api/mcq/sessions — Start a new MCQ practice session."""
    data = request.get_json() or {}
    paper_id = data.get("paper_id")
    if not paper_id:
        return jsonify({"error": "paper_id is required"}), 400
    try:
        paper = mcq_papers_col().find_one({"_id": ObjectId(paper_id)})
    except Exception:
        return jsonify({"error": "Invalid paper ID"}), 400
    if not paper:
        return jsonify({"error": "Paper not found"}), 404

    session_doc = {
        "paper_id": ObjectId(paper_id),
        "paper_title": paper.get("title", "Untitled"),
        "score": 0,
        "total": len(paper.get("questions", [])),
        "percentage": 0,
        "answers": [],
        "status": "in_progress",
        "created_by": request.current_user.get("username", ""),
        "created_at": datetime.utcnow(),
        "completed_at": None,
    }
    result = mcq_sessions_col().insert_one(session_doc)
    return jsonify({"message": "Session started", "session_id": str(result.inserted_id)}), 201


@mcq_bp.route("/sessions/<session_id>/submit", methods=["POST"])
@token_required
def submit_session(session_id):
    """
    POST /api/mcq/sessions/:id/submit
    Body: {"answers": [{"question_number": 1, "selected": "B"}, ...]}
    Grades answers, reveals correct answers, saves to MongoDB.
    """
    try:
        session = mcq_sessions_col().find_one({"_id": ObjectId(session_id)})
    except Exception:
        return jsonify({"error": "Invalid session ID"}), 400
    if not session:
        return jsonify({"error": "Session not found"}), 404

    data = request.get_json() or {}
    user_answers = data.get("answers", [])

    try:
        paper = mcq_papers_col().find_one({"_id": session["paper_id"]})
    except Exception:
        return jsonify({"error": "Associated paper not found"}), 404
    if not paper:
        return jsonify({"error": "Associated paper not found"}), 404

    questions = paper.get("questions", [])
    user_map = {str(a.get("question_number", "")): (a.get("selected") or "").upper().strip() for a in user_answers}

    results = []
    score = 0
    for q in questions:
        qn = str(q["question_number"])
        user_ans = user_map.get(qn, "")
        correct_ans = (q.get("correct_answer") or "").upper().strip()
        is_correct = bool(user_ans and correct_ans and user_ans == correct_ans)
        is_skipped = not bool(user_ans)
        if is_correct:
            score += 1
        results.append({
            "question_number": q["question_number"],
            "question": q["question"],
            "options": q["options"],
            "user_answer": user_ans or None,
            "correct_answer": correct_ans or None,
            "is_correct": is_correct,
            "is_skipped": is_skipped,
            "has_answer_key": bool(correct_ans),
        })

    total = len(questions)
    percentage = round((score / total * 100), 1) if total > 0 else 0

    mcq_sessions_col().update_one(
        {"_id": session["_id"]},
        {"$set": {
            "score": score, "total": total, "percentage": percentage,
            "answers": results, "status": "completed", "completed_at": datetime.utcnow(),
        }},
    )

    return jsonify({
        "message": "Session submitted successfully",
        "score": score,
        "total": total,
        "percentage": percentage,
        "results": results,
    }), 200


@mcq_bp.route("/sessions", methods=["GET"])
@token_required
def list_sessions():
    """GET /api/mcq/sessions — List all practice sessions."""
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))
    skip = (page - 1) * limit
    sessions = list(mcq_sessions_col().find({}).sort("created_at", -1).skip(skip).limit(limit))
    total = mcq_sessions_col().count_documents({})
    return jsonify({
        "sessions": [_serialize_session(s) for s in sessions],
        "total": total,
        "page": page,
        "pages": max(1, (total + limit - 1) // limit),
    }), 200


@mcq_bp.route("/sessions/<session_id>", methods=["GET"])
@token_required
def get_session(session_id):
    """GET /api/mcq/sessions/:id — Get session result detail."""
    try:
        session = mcq_sessions_col().find_one({"_id": ObjectId(session_id)})
    except Exception:
        return jsonify({"error": "Invalid session ID"}), 400
    if not session:
        return jsonify({"error": "Session not found"}), 404
    return jsonify({"session": _serialize_session(session)}), 200
