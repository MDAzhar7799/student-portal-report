"""
=============================================================
mongodb.py — PyMongo Database Connection ⭐ REQUIRED
=============================================================
Technology: Python + PyMongo
Database: MongoDB (studentDB)
Collections: students, courses, enrollments, results, users, documents,
             mcq_papers, mcq_sessions
=============================================================
"""

from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
import os
from dotenv import load_dotenv

load_dotenv()

# ----------------------------
# PyMongo Client (⭐ REQUIRED)
# ----------------------------
_client = None
_db = None


def get_client():
    """
    Returns singleton PyMongo MongoClient.
    PyMongo is the official Python driver for MongoDB.
    Supports both local MongoDB and MongoDB Atlas (cloud).
    """
    global _client
    if _client is None:
        mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
        # Atlas URIs use mongodb+srv:// and need TLS
        if "mongodb+srv://" in mongo_uri or "mongodb.net" in mongo_uri:
            import ssl
            _client = MongoClient(
                mongo_uri,
                serverSelectionTimeoutMS=10000,
                connectTimeoutMS=10000,
                socketTimeoutMS=10000,
                tls=True,
                tlsAllowInvalidCertificates=True,
            )
        else:
            _client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    return _client


def get_db():
    """
    Returns the studentDB database instance via PyMongo.
    All CRUD operations use this db reference.
    """
    global _db
    if _db is None:
        client = get_client()
        db_name = os.getenv("MONGO_DB_NAME", "studentDB")
        _db = client[db_name]
    return _db


def get_collection(collection_name: str):
    """
    Returns a specific collection from studentDB.

    Collections in studentDB:
      - users
      - students
      - courses
      - enrollments
      - results
      - documents
    """
    db = get_db()
    return db[collection_name]


def ping_database():
    """Test MongoDB connection using PyMongo."""
    try:
        client = get_client()
        client.admin.command("ping")
        return True, "MongoDB connected successfully ✅"
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        return False, f"MongoDB connection failed ❌: {str(e)}"


def create_indexes():
    """
    Create indexes on collections for optimal query performance.
    PyMongo index creation using create_index().
    """
    db = get_db()

    # Students collection indexes
    db.students.create_index([("student_id", ASCENDING)], unique=True)
    db.students.create_index([("email", ASCENDING)], unique=True)
    db.students.create_index([("name", ASCENDING)])

    # Courses collection indexes
    db.courses.create_index([("course_code", ASCENDING)], unique=True)
    db.courses.create_index([("name", ASCENDING)])

    # Enrollments collection indexes
    db.enrollments.create_index(
        [("student_id", ASCENDING), ("course_id", ASCENDING)], unique=True
    )

    # Results collection indexes
    db.results.create_index([("student_id", ASCENDING)])
    db.results.create_index([("course_id", ASCENDING)])

    # Users collection indexes
    db.users.create_index([("username", ASCENDING)], unique=True)
    db.users.create_index([("email", ASCENDING)], unique=True)

    # MCQ Practice collection indexes
    db.mcq_papers.create_index([("created_at", DESCENDING)])
    db.mcq_papers.create_index([("uploaded_by", ASCENDING)])
    db.mcq_sessions.create_index([("paper_id", ASCENDING)])
    db.mcq_sessions.create_index([("created_by", ASCENDING)])
    db.mcq_sessions.create_index([("created_at", DESCENDING)])

    print("✅ MongoDB indexes created successfully (PyMongo)")


def close_connection():
    """Close PyMongo connection."""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None


# Collection references for direct import
def students_col():
    return get_collection("students")


def courses_col():
    return get_collection("courses")


def enrollments_col():
    return get_collection("enrollments")


def results_col():
    return get_collection("results")


def users_col():
    return get_collection("users")


def documents_col():
    return get_collection("documents")


def mcq_papers_col():
    return get_collection("mcq_papers")


def mcq_sessions_col():
    return get_collection("mcq_sessions")
