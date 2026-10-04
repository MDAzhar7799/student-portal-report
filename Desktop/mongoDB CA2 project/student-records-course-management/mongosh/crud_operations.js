// =============================================================
// crud_operations.js — MongoDB Shell (mongosh) CRUD Demo
// =============================================================
// Technology: MongoDB Shell (mongosh) ⭐⭐⭐
// Demonstrates all CRUD operations on studentDB collections
// Run: mongosh "mongodb://localhost:27017/studentDB" --file crud_operations.js
// =============================================================

use("studentDB");

print("=".repeat(60));
print("  🔄 MongoDB Shell (mongosh) — CRUD Operations Demo");
print("  Database: studentDB | Driver: PyMongo (Python)");
print("=".repeat(60));

// -------------------------------------------------------
// CREATE — insertOne() / insertMany()
// -------------------------------------------------------
print("\n📌 CREATE Operations:");
print("-".repeat(40));

// Insert a single student
const newStudentResult = db.students.insertOne({
  student_id: "STU999",
  name: "Demo Student",
  email: "demo@test.com",
  phone: "+1-555-9999",
  department: "Computer Science",
  year: 1,
  cgpa: 0.0,
  status: "active",
  created_at: new Date(),
  updated_at: new Date()
});
print(`   insertOne() → student ID: ${newStudentResult.insertedId}`);

// Insert a test course
const newCourseResult = db.courses.insertOne({
  course_code: "DEMO101",
  name: "Demo Course for CRUD Test",
  description: "Temporary course for demonstration",
  credits: 3,
  department: "Computer Science",
  instructor: "Prof. Demo",
  semester: "Test",
  max_students: 10,
  enrolled_count: 0,
  status: "active",
  created_at: new Date()
});
print(`   insertOne() → course ID: ${newCourseResult.insertedId}`);

// -------------------------------------------------------
// READ — find() / findOne() / count
// -------------------------------------------------------
print("\n📖 READ Operations:");
print("-".repeat(40));

// Find all active students
const activeStudents = db.students.find({ status: "active" }).toArray();
print(`   find({ status: 'active' }) → ${activeStudents.length} students`);

// Find one student by student_id
const alice = db.students.findOne({ student_id: "STU001" });
print(`   findOne({ student_id: 'STU001' }) → ${alice ? alice.name : "Not found"}`);

// Find students in Computer Science, sorted by CGPA descending
const csStudents = db.students
  .find({ department: "Computer Science" })
  .sort({ cgpa: -1 })
  .limit(5)
  .toArray();
print(`   CS students sorted by CGPA:`);
csStudents.forEach(s => print(`     - ${s.name}: CGPA ${s.cgpa}`));

// Count documents
const totalStudents = db.students.countDocuments({ status: "active" });
const totalCourses = db.courses.countDocuments({ status: "active" });
print(`   countDocuments(active students): ${totalStudents}`);
print(`   countDocuments(active courses): ${totalCourses}`);

// Find with $gt / $lt / $regex operators
const highCgpa = db.students.find({ cgpa: { $gte: 3.5 } }).toArray();
print(`   find({ cgpa: { $gte: 3.5 } }) → ${highCgpa.length} students`);

const csRegex = db.students.find({ name: { $regex: /^A/, $options: "i" } }).toArray();
print(`   find(name starts with 'A') → ${csRegex.length} students`);

// -------------------------------------------------------
// UPDATE — updateOne() / updateMany()
// -------------------------------------------------------
print("\n✏️  UPDATE Operations:");
print("-".repeat(40));

// Update one student CGPA using $set
const updateResult = db.students.updateOne(
  { student_id: "STU999" },
  {
    $set: { cgpa: 3.2, updated_at: new Date() },
    $inc: { year: 1 }  // Increment year by 1
  }
);
print(`   updateOne() → matched: ${updateResult.matchedCount}, modified: ${updateResult.modifiedCount}`);

// Update many — set all inactive students
const updateManyResult = db.students.updateMany(
  { status: "inactive" },
  { $set: { updated_at: new Date() } }
);
print(`   updateMany(inactive) → modified: ${updateManyResult.modifiedCount}`);

// $push — add to an array field
db.students.updateOne(
  { student_id: "STU001" },
  { $push: { achievements: "Dean's List Fall 2024" } }
);
print(`   $push achievements → added to STU001`);

// $unset — remove a field
db.students.updateOne(
  { student_id: "STU001" },
  { $unset: { achievements: "" } }
);
print(`   $unset achievements → removed from STU001`);

// $inc — increment a numeric field
db.courses.updateOne(
  { course_code: "DEMO101" },
  { $inc: { enrolled_count: 5 } }
);
print(`   $inc enrolled_count by 5 on DEMO101`);

// -------------------------------------------------------
// DELETE — deleteOne() / deleteMany()
// -------------------------------------------------------
print("\n🗑️  DELETE Operations:");
print("-".repeat(40));

// Delete the demo student
const deleteResult = db.students.deleteOne({ student_id: "STU999" });
print(`   deleteOne({ student_id: 'STU999' }) → deleted: ${deleteResult.deletedCount}`);

// Delete demo course
const deleteCourse = db.courses.deleteOne({ course_code: "DEMO101" });
print(`   deleteOne(DEMO101) → deleted: ${deleteCourse.deletedCount}`);

// Delete many (soft delete approach — better to use $set status)
db.students.updateMany(
  { status: "inactive" },
  { $set: { status: "inactive", deleted_flag: true } }
);
print(`   updateMany() → flagged inactive students`);

// -------------------------------------------------------
// Final State
// -------------------------------------------------------
print("\n" + "=".repeat(60));
print("  📋 Current studentDB State:");
print(`  Students: ${db.students.countDocuments()}`);
print(`  Courses: ${db.courses.countDocuments()}`);
print(`  Enrollments: ${db.enrollments.countDocuments()}`);
print(`  Results: ${db.results.countDocuments()}`);
print("  ✅ CRUD Operations Demo Complete!");
print("=".repeat(60));
