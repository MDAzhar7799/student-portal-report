// =============================================================
// lookup_queries.js — MongoDB Shell (mongosh) $lookup Joins
// =============================================================
// Technology: MongoDB Shell (mongosh) ⭐⭐⭐
// Demonstrates: $lookup (JOIN), $unwind, $match, $project, $group
// Run: mongosh "mongodb://localhost:27017/studentDB" --file lookup_queries.js
// =============================================================

use("studentDB");

print("=".repeat(60));
print("  🔗 MongoDB Shell (mongosh) — $lookup JOIN Queries");
print("  Joins: enrollments ↔ students ↔ courses ↔ results");
print("=".repeat(60));

// -------------------------------------------------------
// LOOKUP 1: Student Enrollment Report (students ↔ enrollments)
// -------------------------------------------------------
print("\n🔗 Lookup 1: Student + Enrollment Details");
print("-".repeat(50));

const studentEnrollments = db.students.aggregate([
  // $match: Only active students
  { $match: { status: "active" } },

  // $lookup: JOIN enrollments ON students._id = enrollments.student_id
  {
    $lookup: {                                 // $lookup ⭐
      from: "enrollments",                    // Collection to join
      let: { sid: { $toString: "$_id" } },   // Local variable
      pipeline: [
        { $match: { $expr: { $eq: ["$student_id", "$$sid"] } } }
      ],
      as: "enrollments"                       // Output array field
    }
  },

  // $project: Select fields
  {
    $project: {
      _id: 0,
      student_id: 1,
      name: 1,
      department: 1,
      cgpa: 1,
      enrolled_courses: { $size: "$enrollments" },
      course_codes: "$enrollments.course_code"
    }
  },

  { $sort: { cgpa: -1 } },
  { $limit: 5 }
]).toArray();

studentEnrollments.forEach(s => {
  print(`   ${s.name} (${s.student_id})`);
  print(`     → Enrolled: ${s.enrolled_courses} courses | CGPA: ${s.cgpa}`);
  print(`     → Courses: ${(s.course_codes || []).join(", ")}`);
});

// -------------------------------------------------------
// LOOKUP 2: Course → Students ($lookup enrollments → students)
// -------------------------------------------------------
print("\n🔗 Lookup 2: Course with Enrolled Students");
print("-".repeat(50));

const courseStudents = db.courses.aggregate([
  { $match: { status: "active" } },
  { $limit: 3 },

  // $lookup: JOIN enrollments ON course._id
  {
    $lookup: {
      from: "enrollments",
      let: { cid: { $toString: "$_id" } },
      pipeline: [
        { $match: { $expr: { $eq: ["$course_id", "$$cid"] } } }
      ],
      as: "enrolled_students"
    }
  },

  {
    $project: {
      _id: 0,
      course_code: 1,
      name: 1,
      department: 1,
      max_students: 1,
      enrolled_count: { $size: "$enrolled_students" },
      students: "$enrolled_students.student_name"
    }
  }
]).toArray();

courseStudents.forEach(c => {
  print(`   ${c.course_code}: ${c.name}`);
  print(`     → ${c.enrolled_count}/${c.max_students} enrolled`);
  (c.students || []).forEach(s => print(`       - ${s}`));
});

// -------------------------------------------------------
// LOOKUP 3: Full Transcript — Student + Courses + Results
// -------------------------------------------------------
print("\n🔗 Lookup 3: Full Student Transcript (3-way join)");
print("-".repeat(50));

const transcripts = db.students.aggregate([
  { $match: { student_id: "STU001" } },

  // Step 1: $lookup results for student
  {
    $lookup: {
      from: "results",
      let: { sid: { $toString: "$_id" } },
      pipeline: [
        { $match: { $expr: { $eq: ["$student_id", "$$sid"] } } },
        { $sort: { score: -1 } }
      ],
      as: "results"
    }
  },

  // $unwind: Flatten results array for per-result processing
  { $unwind: { path: "$results", preserveNullAndEmptyArrays: true } },  // $unwind ⭐

  {
    $project: {
      _id: 0,
      student_id: 1,
      name: 1,
      department: 1,
      cgpa: 1,
      course_code:   "$results.course_code",
      course_name:   "$results.course_name",
      score:         "$results.score",
      letter_grade:  "$results.letter_grade",
      semester:      "$results.semester"
    }
  }
]).toArray();

if (transcripts.length > 0) {
  const first = transcripts[0];
  print(`   Student: ${first.name} (${first.student_id}) | CGPA: ${first.cgpa}`);
  print(`   Department: ${first.department}`);
  print(`   Course Results:`);
  transcripts.forEach(t => {
    if (t.course_code) {
      print(`     ${t.course_code.padEnd(10)} ${t.course_name.substring(0,30).padEnd(32)} ${t.score}/100 [${t.letter_grade}]`);
    }
  });
}

// -------------------------------------------------------
// LOOKUP 4: Best Student per Department ($group + $lookup)
// -------------------------------------------------------
print("\n🔗 Lookup 4: Best Student per Department ($group + $lookup)");
print("-".repeat(50));

const bestPerDept = db.students.aggregate([
  { $match: { status: "active", cgpa: { $gt: 0 } } },

  // $group by department, get max CGPA and that student name
  {
    $group: {
      _id: "$department",
      best_cgpa:    { $max: "$cgpa" },
      best_student: { $first: "$name" },      // first in sorted order
      student_id:   { $first: "$student_id" }
    }
  },

  { $sort: { best_cgpa: -1 } },

  {
    $project: {
      _id: 0,
      department:   "$_id",
      best_student: 1,
      student_id:   1,
      best_cgpa:    1
    }
  }
]).toArray();

bestPerDept.forEach(d => {
  print(`   ${d.department}: ${d.best_student} (${d.student_id}) — CGPA: ${d.best_cgpa}`);
});

// -------------------------------------------------------
// LOOKUP 5: Courses with Result Statistics ($lookup + $group)
// -------------------------------------------------------
print("\n🔗 Lookup 5: Courses with Aggregated Result Stats");
print("-".repeat(50));

const courseResultStats = db.courses.aggregate([
  { $match: { status: "active" } },

  {
    $lookup: {
      from: "results",
      let: { cid: { $toString: "$_id" } },
      pipeline: [
        { $match: { $expr: { $eq: ["$course_id", "$$cid"] } } },
        {
          $group: {
            _id: null,
            avg_score: { $avg: "$score" },
            count:     { $sum: 1 },
            max_score: { $max: "$score" },
            min_score: { $min: "$score" }
          }
        }
      ],
      as: "stats"
    }
  },

  // $unwind with preserveNullAndEmptyArrays
  { $unwind: { path: "$stats", preserveNullAndEmptyArrays: true } },

  {
    $project: {
      _id: 0,
      course_code: 1,
      name: 1,
      avg_score:   { $ifNull: [{ $round: ["$stats.avg_score", 1] }, "N/A"] },
      result_count: { $ifNull: ["$stats.count", 0] },
      max_score:   { $ifNull: ["$stats.max_score", 0] }
    }
  },

  { $sort: { avg_score: -1 } }
]).toArray();

courseResultStats.forEach(c => {
  print(`   ${c.course_code.padEnd(10)} Avg: ${String(c.avg_score).padEnd(6)} | Results: ${c.result_count} | Max: ${c.max_score}`);
});

print("\n" + "=".repeat(60));
print("  ✅ $lookup JOIN Queries Complete!");
print("  Joins demonstrated:");
print("    students ↔ enrollments");
print("    courses  ↔ enrollments");
print("    students ↔ results ↔ courses (3-way)");
print("  Operators: $lookup, $unwind, $match, $group, $project");
print("=".repeat(60));
