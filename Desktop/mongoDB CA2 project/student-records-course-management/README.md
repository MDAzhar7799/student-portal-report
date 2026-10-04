# 🎓 Student Records & Course Management System (StudentDB)

A complete, production-grade full-stack web application for student information management, academic course scheduling, enrollment handling, exam result computation with dynamic CGPA recalculation, OpenCV + Tesseract OCR document scanning, and machine learning grade prediction.

Built strictly with **MongoDB**, **mongosh**, **PyMongo**, **Python**, **Flask REST API**, **React.js**, **JavaScript**, **OCR (OpenCV + pytesseract)**, **Chart.js**, **JWT Auth**, and **Tailwind CSS**.

---

## 🌟 Technology Stack Mapping

| Layer | Technology | Role & Purpose |
|---|---|---|
| **Database** ⭐ | **MongoDB** | Primary NoSQL document database (`studentDB`), JSON Schema validation, multi-field indexes |
| **Database CLI** ⭐⭐⭐ | **mongosh** | MongoDB Shell scripts for database setup, schema validation, CRUD operations, $lookup joins, and aggregations |
| **Database Driver** ⭐⭐⭐ | **PyMongo** | Official Python MongoDB driver singleton used for all Flask database interactions |
| **Backend Framework** | **Flask (Python 3)** | Modular REST API with Blueprints, error handling, and CORS |
| **Authentication** | **JWT (PyJWT) + bcrypt** | Token-based stateless authentication and password hashing |
| **Frontend Framework** | **React.js (Vite)** | Reactive single-page application with React Router v6 |
| **Styling & Design** | **Tailwind CSS** | Custom Dark Glassmorphism design system |
| **Visual Analytics** | **Chart.js + react-chartjs-2** | Interactive Doughnut, Bar, and Line charts |
| **OCR Pipeline** | **OpenCV + pytesseract** | Grayscale, Gaussian Blur, Otsu Thresholding, Deskewing & text extraction |
| **Machine Learning** | **Weighted Performance Regression** | Predictive modeling for student grade forecasting |

---

## 🏗️ System Architecture

```text
┌────────────────────────────────────────────────────────┐
│                   REACT.JS FRONTEND                    │
│   • Dark Glassmorphism UI (Tailwind CSS)               │
│   • Dashboard with Chart.js Graphs                     │
│   • Student / Course / Enrollment / Result Management  │
│   • OCR Upload & Document Viewer                       │
│   • ML Grade Prediction Simulator                      │
└───────────────────────────┬────────────────────────────┘
                            │ Axios (JWT in Auth Header)
                            ▼
┌────────────────────────────────────────────────────────┐
│                 FLASK PYTHON REST API                  │
│   • Auth (Login, Register, JWT verification)           │
│   • Student & Course CRUD                              │
│   • Enrollment Engine & Course Capacity Tracker        │
│   • Result Engine & Real-time CGPA Recalculator        │
│   • Analytics ($match, $group, $avg, $lookup)          │
│   • ML Grade Predictor (NumPy linear model)            │
│   • OCR Route (OpenCV Preprocessing + pytesseract)     │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
               ▼ PyMongo Driver           ▼ OpenCV / Tesseract
┌──────────────────────────┐    ┌────────────────────────┐
│      MONGODB DATABASE    │    │       OCR ENGINE       │
│        (studentDB)       │    │   1. Grayscale & Blur  │
│  • users                 │    │   2. Otsu Threshold    │
│  • students              │    │   3. Deskew            │
│  • courses               │    │   4. Pytesseract OCR   │
│  • enrollments           │    │   5. Regex Parser      │
│  • results               │    └────────────────────────┘
│  • documents (OCR)       │
└──────────────────────────┘
```

---

## 📁 Repository Structure

```text
student-records-course-management/
├── backend/
│   ├── app.py                      # Flask Application Factory & Blueprints
│   ├── config.py                   # App Configuration & Environment Variables
│   ├── requirements.txt            # Python dependencies (PyMongo, Flask, OpenCV, etc.)
│   ├── database/
│   │   └── mongodb.py              # PyMongo Singleton, Collections & Index Creation
│   ├── routes/
│   │   ├── auth_routes.py          # /api/auth (login, register, me)
│   │   ├── student_routes.py       # /api/students (CRUD, search, pagination)
│   │   ├── course_routes.py        # /api/courses (CRUD, capacity management)
│   │   ├── enrollment_routes.py    # /api/enrollments (enroll, drop, list)
│   │   ├── result_routes.py        # /api/results (grades, automated CGPA calc)
│   │   ├── analytics_routes.py     # /api/analytics (aggregation pipelines & ML)
│   │   └── ocr_routes.py           # /api/ocr (upload, parse, documents list)
│   ├── services/
│   │   ├── student_service.py      # Business logic for students
│   │   ├── course_service.py       # Business logic for courses
│   │   ├── result_service.py       # CGPA calculation & grade conversion
│   │   └── ocr_service.py          # OCR pipeline coordinator
│   └── utils/
│       ├── auth.py                 # JWT token generation, decoding & decorators
│       └── validators.py           # Regex input validation & grade scales
├── frontend/
│   ├── index.html                  # HTML entry point with Google Fonts
│   ├── package.json                # React, Vite, Tailwind CSS, Chart.js dependencies
│   ├── tailwind.config.js          # Tailwind custom palette & glassmorphic tokens
│   ├── src/
│   │   ├── main.jsx                # React DOM root
│   │   ├── App.jsx                 # React Router v6 & Protected Routes
│   │   ├── index.css               # Complete Dark Theme Design System
│   │   ├── services/
│   │   │   └── api.js              # Axios instance with JWT interceptors & API methods
│   │   ├── components/
│   │   │   ├── Sidebar.jsx         # Navigation sidebar with tech stack badges
│   │   │   ├── Navbar.jsx          # Top bar with profile and page title
│   │   │   ├── DashboardCard.jsx   # Glassmorphic statistic metric cards
│   │   │   ├── StudentTable.jsx    # Student data table with actions & badges
│   │   │   ├── CourseTable.jsx     # Course catalog with enrollment progress bars
│   │   │   ├── ResultTable.jsx     # Results data table with score indicators
│   │   │   └── OCRUploader.jsx     # Drag-and-drop document upload with OCR progress
│   │   └── pages/
│   │       ├── Login.jsx           # Glassmorphic JWT Authentication page
│   │       ├── Dashboard.jsx       # Overview metrics, charts & top performers
│   │       ├── Students.jsx        # Student CRUD, search & pagination
│   │       ├── Courses.jsx         # Course CRUD & capacity tracking
│   │       ├── Enrollments.jsx     # Student course enrollment management
│   │       ├── Results.jsx         # Exam score recording & auto-CGPA calculation
│   │       ├── Analytics.jsx       # Aggregations, Chart.js graphs & ML predictor
│   │       └── OCR.jsx             # Scanned document history & OCR pipeline
├── mongosh/                        # ⭐⭐⭐ MongoDB Shell Scripts
│   ├── setup_database.js           # Database creation, schema validators & indexes
│   ├── sample_data.js              # Initial records (students, courses, results)
│   ├── crud_operations.js          # insertOne, insertMany, find, update, delete
│   ├── aggregation_queries.js      # $match, $group, $avg, $count, $sort, $cond
│   └── lookup_queries.js           # 3-way $lookup joins & cross-collection queries
├── ocr/
│   ├── preprocess.py               # OpenCV image enhancements (blur, threshold, deskew)
│   └── extractor.py                # Pytesseract OCR & structured regex extraction
├── tests/
│   └── test_api.py                 # Pytest suite (validators, auth, ML, Flask endpoints)
├── uploads/                        # Document upload directory
├── .gitignore                      # Git ignore rules
└── README.md                       # Comprehensive documentation
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **MongoDB** (v5.0+ running locally on `mongodb://localhost:27017`)
- **MongoDB Shell (`mongosh`)** (v2.0+)
- **Python** (v3.9 or v3.12)
- **Node.js** (v18+) & **npm**
- *(Optional)* **Tesseract OCR** for local physical image scanning

---

### 2. Database Initialization (MongoDB & mongosh) ⭐⭐⭐

Execute the mongosh scripts in sequence to prepare `studentDB`:

```bash
# 1. Initialize database, collections with JSON schema validation, and indexes
mongosh "mongodb://localhost:27017/studentDB" mongosh/setup_database.js

# 2. Seed database with realistic sample students, courses, enrollments & results
mongosh "mongodb://localhost:27017/studentDB" mongosh/sample_data.js

# 3. (Optional) Run demonstration scripts to verify CRUD, Aggregations and Joins
mongosh "mongodb://localhost:27017/studentDB" mongosh/aggregation_queries.js
mongosh "mongodb://localhost:27017/studentDB" mongosh/lookup_queries.js
mongosh "mongodb://localhost:27017/studentDB" mongosh/crud_operations.js
```

---

### 3. Backend Setup (Flask & PyMongo)

```bash
cd backend

# Install Python requirements
py -3.9 -m pip install -r requirements.txt

# Run the Flask REST API server (starts on http://localhost:5000)
py -3.9 app.py
```

*Default credentials seeded automatically:*
- **Username:** `admin`
- **Password:** `admin123`

---

### 4. Frontend Setup (React.js & Tailwind CSS)

```bash
cd frontend

# Install node dependencies
npm install

# Start Vite development server (starts on http://localhost:5173)
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

### 5. Running the Test Suite

```bash
# Run pytest across validation, auth, ML model, and Flask endpoints
py -3.9 -m pytest tests/test_api.py -v
```

*Results: 15 passed in <1s.*

---

## 🍃 MongoDB Shell (mongosh) Features Highlight ⭐⭐⭐

The system includes 5 comprehensive `mongosh` scripts demonstrating key MongoDB concepts:

### 1. Aggregation Pipeline (`aggregation_queries.js`)
Demonstrates database-level analytics using:
- **`$match`**: Filters documents by active status or score thresholds.
- **`$group`**: Groups results by `course_id`, `letter_grade`, or `department`.
- **`$avg`**: Calculates average scores and department average CGPA.
- **`$sum`**: Calculates totals and counts.
- **`$sort`**: Sorts top performers by CGPA descending.
- **`$cond`**: Evaluates conditions to calculate course pass rates.

### 2. Multi-Collection Joins (`lookup_queries.js`)
- **`$lookup`**: Joins `students` with `enrollments` and `courses`.
- **3-Way Joins**: Resolves `students` &rarr; `results` &rarr; `courses` for complete transcripts.
- **`$unwind`**: Flattens join arrays for processing.

### 3. JSON Schema Validation (`setup_database.js`)
- Ensures document integrity at the database layer using `$jsonSchema`.
- Validates field data types, string formats, and numeric bounds (e.g., scores 0–100, CGPA 0.0–4.0).

---

## 🤖 Machine Learning Model (Grade Prediction)

The system embeds a performance regression model in `backend/routes/analytics_routes.py` to predict a student's final grade before final exams take place:

$$\text{Predicted Score} = (0.20 \times \text{Attendance}) + (0.30 \times \text{Assignments Avg}) + (0.50 \times \text{Midterm Score})$$

- Calculates:
  - **Predicted Final Percentage (0–100%)**
  - **Predicted Letter Grade (A+, A, B, etc.)**
  - **Predicted GPA Points (0.0 – 4.0)**
  - **Model Confidence Score**

Interactive sliders are available directly in the **Analytics** page.

---

## 📷 OCR Document Processing Pipeline

1. **Upload**: User drags & drops a transcript or mark sheet image in the React UI.
2. **OpenCV Preprocessing** (`ocr/preprocess.py`):
   - Grayscale conversion (`cv2.cvtColor`)
   - Gaussian Blur noise suppression (`cv2.GaussianBlur`)
   - Otsu's thresholding for contrast enhancement (`cv2.threshold`)
   - Deskewing via affine rotation transformation (`cv2.warpAffine`)
3. **Extraction** (`ocr/extractor.py`):
   - Text detection via `pytesseract.image_to_string`
   - Confidence extraction via `pytesseract.image_to_data`
   - Structured field extraction (Name, Student ID, Course, GPA) using regular expressions
4. **Storage**: Extracted text, structured data, and file metadata are saved into MongoDB's `documents` collection.

---

## 🔐 REST API Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/login` | Authenticate user & return JWT token | No |
| `POST` | `/api/auth/register` | Register new user | Admin |
| `GET` | `/api/health` | Health status of API & MongoDB connection | No |
| `GET` | `/api/students/` | List students (pagination & search) | Yes |
| `POST` | `/api/students/` | Create new student | Yes |
| `PUT` | `/api/students/:id` | Update student details | Yes |
| `DELETE`| `/api/students/:id` | Delete student | Admin |
| `GET` | `/api/courses/` | List all courses | Yes |
| `POST` | `/api/courses/` | Create a course | Yes |
| `POST` | `/api/enrollments/` | Enroll student in a course | Yes |
| `DELETE`| `/api/enrollments/:id`| Drop student from course | Yes |
| `POST` | `/api/results/` | Record exam result & recalc CGPA | Yes |
| `GET` | `/api/analytics/dashboard`| Aggregate statistics | Yes |
| `GET` | `/api/analytics/grades` | Grade distribution for Chart.js | Yes |
| `POST` | `/api/analytics/predict-grade` | ML grade prediction | Yes |
| `POST` | `/api/ocr/upload` | Process image through OCR pipeline | Yes |
| `GET` | `/api/ocr/documents` | List scanned document history | Yes |

---

## 🎨 UI Design Highlights

- **Dark Theme:** Deep obsidian navy background (`#0a0e17`) with slate and emerald accents.
- **Glassmorphism:** Cards with translucent blur (`backdrop-filter: blur(16px)`), subtle borders (`rgba(255, 255, 255, 0.07)`), and soft drop shadows.
- **Responsive Navigation:** Fixed sidebar with live badges for MongoDB, PyMongo, Flask, and React.
- **Interactive Visualizations:** Chart.js graphs styled to match the dark color palette.

---

## 📄 License
This project was developed for academic and demonstration purposes as part of the MongoDB CA2 Project.
