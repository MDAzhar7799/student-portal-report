// =============================================================
// aggregation_queries.js — MongoDB Shell Aggregation Pipeline
// =============================================================
// Technology: MongoDB Shell (mongosh) ⭐⭐⭐
// Demonstrates: $match, $group, $avg, $count, $sort, $project, $limit
// Run: mongosh "mongodb://localhost:27017/studentDB" --file aggregation_queries.js
// =============================================================

use("studentDB");

print("=".repeat(60));
print("  📊 MongoDB Aggregation Pipeline Queries");
print("  Operations: $match $group $avg $count $sort $project");
print("=".repeat(60));

// -------------------------------------------------------
// QUERY 1: Average Score Per Course using $group + $avg
// -------------------------------------------------------
print("\n📈 Query 1: Average Score Per Course ($group + $avg)");
print("-".repeat(50));

const avgPerCourse = db.results.aggregate([
  // $match: Filter only final exams
  { $match: { exam_type: "final" } },

  // $group: Group by course and calculate $avg score
  {
    $group: {
      _id: "$course_code",
      course_name:   { $first: "$course_name" },
      average_score: { $avg: "$score" },       // $avg ⭐
      max_score:     { $max: "$score" },
      min_score:     { $min: "$score" },
      student_count: { $sum: 1 }               // $count via $sum
    }
  },

  // $sort: Sort by average_score descending
  { $sort: { average_score: -1 } },           // $sort ⭐

  // $project: Select and format fields
  {
    $project: {
      _id: 0,
      course_code:   "$_id",
      course_name:   1,
      average_score: { $round: ["$average_score", 2] },
      max_score:     1,
      min_score:     1,
      student_count: 1
    }
  }
]).toArray();

avgPerCourse.forEach(c => {
  print(`   ${c.course_code}: avg=${c.average_score} | students=${c.student_count} | max=${c.max_score} | min=${c.min_score}`);
});

// -------------------------------------------------------
// QUERY 2: Grade Distribution using $group + $count
// -------------------------------------------------------
print("\n📊 Query 2: Grade Distribution ($group + $count)");
print("-".repeat(50));

const gradeDist = db.results.aggregate([
  // $group: Group by letter_grade
  {
    $group: {
      _id: "$letter_grade",
      count: { $sum: 1 },                      // $count ⭐
      avg_score: { $avg: "$score" }            // $avg ⭐
    }
  },
  // $sort: Alphabetical
  { $sort: { _id: 1 } }
]).toArray();

print("   Grade | Count | Avg Score");
gradeDist.forEach(g => {
  const bar = "█".repeat(Math.min(g.count * 3, 20));
  print(`   ${g._id.padEnd(4)}  | ${String(g.count).padStart(3)} | ${g.avg_score.toFixed(1)} ${bar}`);
});

// -------------------------------------------------------
// QUERY 3: Department Statistics with $match + $group
// -------------------------------------------------------
print("\n🏫 Query 3: Department-wise Statistics ($match + $group + $avg)");
print("-".repeat(50));

const deptStats = db.students.aggregate([
  // $match: Only active students
  { $match: { status: "active" } },           // $match ⭐

  // $group: Group by department
  {
    $group: {
      _id: "$department",
      total_students: { $sum: 1 },             // $count ⭐
      avg_cgpa:       { $avg: "$cgpa" },       // $avg ⭐
      max_cgpa:       { $max: "$cgpa" },
      min_cgpa:       { $min: "$cgpa" },
      year_1_count:   { $sum: { $cond: [{ $eq: ["$year", 1] }, 1, 0] } },
      year_2_count:   { $sum: { $cond: [{ $eq: ["$year", 2] }, 1, 0] } },
      year_3_count:   { $sum: { $cond: [{ $eq: ["$year", 3] }, 1, 0] } },
      year_4_count:   { $sum: { $cond: [{ $eq: ["$year", 4] }, 1, 0] } },
    }
  },
  { $sort: { total_students: -1 } }
]).toArray();

deptStats.forEach(d => {
  print(`   ${d._id}: ${d.total_students} students | Avg CGPA: ${d.avg_cgpa.toFixed(2)} | Max: ${d.max_cgpa}`);
});

// -------------------------------------------------------
// QUERY 4: Top 5 Students by CGPA ($match + $sort + $limit)
// -------------------------------------------------------
print("\n🏆 Query 4: Top 5 Students by CGPA ($match + $sort + $limit)");
print("-".repeat(50));

const topStudents = db.students.aggregate([
  { $match: { status: "active", cgpa: { $gt: 0 } } },
  { $sort: { cgpa: -1 } },                    // $sort ⭐
  { $limit: 5 },
  {
    $project: {                                // $project ⭐
      _id: 0,
      rank: 1,
      student_id: 1,
      name: 1,
      department: 1,
      year: 1,
      cgpa: 1
    }
  }
]).toArray();

topStudents.forEach((s, i) => {
  print(`   #${i + 1} ${s.name} (${s.student_id}) — CGPA: ${s.cgpa} | ${s.department}`);
});

// -------------------------------------------------------
// QUERY 5: Enrollment Count Per Course ($group + $count)
// -------------------------------------------------------
print("\n📝 Query 5: Enrollment Count Per Course ($group + $count)");
print("-".repeat(50));

const enrollmentCounts = db.enrollments.aggregate([
  {
    $group: {
      _id: "$course_code",
      course_name: { $first: "$course_name" },
      enrolled:    { $sum: 1 }                // $count ⭐
    }
  },
  { $sort: { enrolled: -1 } }
]).toArray();

enrollmentCounts.forEach(e => {
  print(`   ${e._id}: ${e.enrolled} enrolled — ${e.course_name}`);
});

// -------------------------------------------------------
// QUERY 6: Pass/Fail Rate per Course
// -------------------------------------------------------
print("\n✅ Query 6: Pass Rate per Course ($group + $cond)");
print("-".repeat(50));

const passRate = db.results.aggregate([
  {
    $group: {
      _id: "$course_code",
      course_name: { $first: "$course_name" },
      total:       { $sum: 1 },
      passed:      { $sum: { $cond: [{ $gte: ["$score", 50] }, 1, 0] } },
      failed:      { $sum: { $cond: [{ $lt:  ["$score", 50] }, 1, 0] } }
    }
  },
  {
    $project: {
      _id: 0,
      course_code: "$_id",
      course_name: 1,
      total: 1,
      passed: 1,
      failed: 1,
      pass_rate: {
        $round: [{ $multiply: [{ $divide: ["$passed", "$total"] }, 100] }, 1]
      }
    }
  },
  { $sort: { pass_rate: -1 } }
]).toArray();

passRate.forEach(p => {
  print(`   ${p.course_code}: ${p.pass_rate}% pass rate (${p.passed}/${p.total})`);
});

// -------------------------------------------------------
// QUERY 7: Monthly Enrollment Trend ($group by month)
// -------------------------------------------------------
print("\n📅 Query 7: Monthly Enrollment Trend ($group by date parts)");
print("-".repeat(50));

const monthlyTrend = db.enrollments.aggregate([
  {
    $group: {
      _id: {
        year:  { $year:  "$enrolled_at" },
        month: { $month: "$enrolled_at" }
      },
      count: { $sum: 1 }
    }
  },
  { $sort: { "_id.year": 1, "_id.month": 1 } }
]).toArray();

monthlyTrend.forEach(t => {
  print(`   ${t._id.year}-${String(t._id.month).padStart(2, "0")}: ${t.count} enrollments`);
});

print("\n" + "=".repeat(60));
print("  ✅ Aggregation Pipeline Queries Complete!");
print("  Operators used: $match, $group, $avg, $sum (count),");
print("  $sort, $project, $limit, $max, $min, $cond, $first");
print("=".repeat(60));
