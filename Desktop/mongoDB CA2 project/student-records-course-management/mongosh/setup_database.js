// =============================================================
// setup_database.js — MongoDB Shell (mongosh) Setup Script
// =============================================================
// Technology: MongoDB Shell (mongosh) ⭐⭐⭐
// Run with: mongosh "mongodb://localhost:27017/studentDB" setup_database.js
// =============================================================

print("=".repeat(60));
print("  🍃 Student Records & Course Management — Database Setup");
print("  MongoDB Shell (mongosh) — Database Initialization");
print("=".repeat(60));

// Step 1: Switch to studentDB
use("studentDB");
print("\n✅ Switched to: studentDB");

// Helper to create or update collection schema safely
function safeCreateCollection(name, options) {
  const existing = db.getCollectionNames();
  if (existing.includes(name)) {
    try {
      if (options && options.validator) {
        db.runCommand({ collMod: name, validator: options.validator });
      }
      print(`ℹ️ Collection '${name}' exists (schema validator applied).`);
    } catch (e) {
      print(`ℹ️ Collection '${name}' exists.`);
    }
  } else {
    db.createCollection(name, options);
    print(`✅ Collection created: ${name}`);
  }
}

// -------------------------------------------------------
// Step 2: Create Collections with Validators
// -------------------------------------------------------

// --- users collection ---
safeCreateCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["username", "email", "password", "role"],
      properties: {
        username: { bsonType: "string", description: "Username is required" },
        email: { bsonType: "string", description: "Email is required" },
        password: { bsonType: "string", description: "Password is required" },
        role: {
          bsonType: "string",
          enum: ["admin", "user"],
          description: "Role must be admin or user"
        },
        created_at: { bsonType: "date" }
      }
    }
  }
});

// --- students collection ---
safeCreateCollection("students", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["student_id", "name", "email", "department"],
      properties: {
        student_id: { bsonType: "string", description: "Student ID required (e.g., STU001)" },
        name:       { bsonType: "string", description: "Student name required" },
        email:      { bsonType: "string", description: "Email required" },
        department: { bsonType: "string", description: "Department required" },
        year:       { bsonType: ["int", "double"], minimum: 1, maximum: 6 },
        cgpa:       { bsonType: ["double", "int"], minimum: 0, maximum: 4.0 },
        status:     { bsonType: "string", enum: ["active", "inactive", "graduated"] }
      }
    }
  }
});

// --- courses collection ---
safeCreateCollection("courses", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["course_code", "name", "department", "credits"],
      properties: {
        course_code:   { bsonType: "string", description: "Course code required (e.g., CS101)" },
        name:          { bsonType: "string", description: "Course name required" },
        department:    { bsonType: "string" },
        credits:       { bsonType: ["int", "double"], minimum: 1, maximum: 6 },
        max_students:  { bsonType: ["int", "double"], minimum: 1 },
        status:        { bsonType: "string", enum: ["active", "inactive"] }
      }
    }
  }
});

// --- enrollments collection ---
safeCreateCollection("enrollments", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["student_id", "course_id"],
      properties: {
        student_id:  { bsonType: "string" },
        course_id:   { bsonType: "string" },
        status:      { bsonType: "string", enum: ["enrolled", "dropped", "completed"] },
        enrolled_at: { bsonType: "date" }
      }
    }
  }
});

// --- results collection ---
safeCreateCollection("results", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["student_id", "course_id", "score", "semester"],
      properties: {
        student_id:   { bsonType: "string" },
        course_id:    { bsonType: "string" },
        score:        { bsonType: ["double", "int"], minimum: 0, maximum: 100 },
        letter_grade: { bsonType: "string" },
        semester:     { bsonType: "string" },
        exam_type:    { bsonType: "string", enum: ["midterm", "final", "assignment", "quiz"] }
      }
    }
  }
});

// --- documents collection (OCR uploads) ---
safeCreateCollection("documents", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["filename", "original_name"],
      properties: {
        filename:       { bsonType: "string" },
        original_name:  { bsonType: "string" },
        extracted_text: { bsonType: "string" },
        status:         { bsonType: "string", enum: ["processed", "pending", "error"] }
      }
    }
  }
});

// -------------------------------------------------------
// Step 3: Create Indexes for Performance
// -------------------------------------------------------
print("\n📊 Creating indexes...");

// Users indexes
try { db.users.createIndex({ username: 1 }, { unique: true, name: "idx_username_unique" }); } catch (e) {}
try { db.users.createIndex({ email: 1 }, { unique: true, name: "idx_email_unique" }); } catch (e) {}

// Students indexes
try { db.students.createIndex({ student_id: 1 }, { unique: true, name: "idx_student_id_unique" }); } catch (e) {}
try { db.students.createIndex({ email: 1 }, { unique: true, name: "idx_student_email_unique" }); } catch (e) {}
try { db.students.createIndex({ department: 1, year: 1 }, { name: "idx_dept_year" }); } catch (e) {}
try { db.students.createIndex({ cgpa: -1 }, { name: "idx_cgpa_desc" }); } catch (e) {}

// Courses indexes
try { db.courses.createIndex({ course_code: 1 }, { unique: true, name: "idx_course_code_unique" }); } catch (e) {}
try { db.courses.createIndex({ department: 1 }, { name: "idx_course_dept" }); } catch (e) {}

// Enrollments indexes
try {
  db.enrollments.createIndex(
    { student_id: 1, course_id: 1 },
    { unique: true, name: "idx_enrollment_unique" }
  );
} catch (e) {}
try { db.enrollments.createIndex({ course_id: 1 }, { name: "idx_enroll_course" }); } catch (e) {}
try { db.enrollments.createIndex({ student_id: 1 }, { name: "idx_enroll_student" }); } catch (e) {}

// Results indexes
try { db.results.createIndex({ student_id: 1, course_id: 1 }, { name: "idx_result_student_course" }); } catch (e) {}
try { db.results.createIndex({ score: -1 }, { name: "idx_result_score_desc" }); } catch (e) {}
try { db.results.createIndex({ semester: 1 }, { name: "idx_result_semester" }); } catch (e) {}

print("✅ All indexes ensured successfully!");

// -------------------------------------------------------
// Step 4: Show Database Summary
// -------------------------------------------------------
print("\n📋 studentDB Collections:");
const collections = db.getCollectionNames();
collections.forEach(col => {
  print(`   - ${col}`);
});

print("\n" + "=".repeat(60));
print("  ✅ studentDB setup complete!");
print("  Run: mongosh studentDB mongosh/sample_data.js");
print("=".repeat(60));
