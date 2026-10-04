// =============================================================
// sample_data.js — MongoDB Shell (mongosh) Sample Data Seeder
// =============================================================
// Technology: MongoDB Shell (mongosh) ⭐⭐⭐
// Run with: mongosh "mongodb://localhost:27017/studentDB" --file sample_data.js
// Populates all 6 collections: users, students, courses, enrollments, results, documents
// =============================================================

use("studentDB");

print("=".repeat(60));
print("  🌱 Seeding Sample Data into studentDB");
print("  MongoDB Shell (mongosh) — insertMany() operations");
print("=".repeat(60));

// Clear existing sample data (optional - comment out to preserve)
db.students.deleteMany({ student_id: { $regex: /^STU0/ } });
db.courses.deleteMany({ course_code: { $regex: /^CS|^MATH|^ENG|^PHY/ } });
db.enrollments.deleteMany({});
db.results.deleteMany({});
db.documents.deleteMany({ status: "demo" });

// -------------------------------------------------------
// 1. INSERT USERS
// -------------------------------------------------------
print("\n👤 Ensuring users...");
try {
  db.users.deleteMany({ username: { $in: ["admin", "teacher1"] } });
  db.users.insertMany([
    {
      username: "admin",
      email: "admin@studentdb.com",
      password: "$2b$12$e8YxPkW/N9K5a2bJ3m8tqeJ8kFZZ6/7gT2fGz4Jk5U9vS8Xy/9.1q",  // admin123
      role: "admin",
      created_at: new Date()
    },
    {
      username: "teacher1",
      email: "teacher@studentdb.com",
      password: "$2b$12$e8YxPkW/N9K5a2bJ3m8tqeJ8kFZZ6/7gT2fGz4Jk5U9vS8Xy/9.1q",
      role: "user",
      created_at: new Date()
    }
  ], { ordered: false });
} catch (e) {
  // Ignore duplicates
}
print(`   ✅ Total Users: ${db.users.countDocuments()}`);

// -------------------------------------------------------
// 2. INSERT STUDENTS (insertMany ⭐)
// -------------------------------------------------------
print("\n🎓 Inserting students...");
const studentsInsert = db.students.insertMany([
  {
    student_id: "STU001",
    name: "Alice Johnson",
    email: "alice.johnson@email.com",
    phone: "+1-555-0101",
    date_of_birth: "2001-05-15",
    gender: "Female",
    address: "123 Main St, New York, NY",
    department: "Computer Science",
    year: 3,
    cgpa: 3.85,
    status: "active",
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    student_id: "STU002",
    name: "Bob Smith",
    email: "bob.smith@email.com",
    phone: "+1-555-0102",
    date_of_birth: "2001-08-22",
    gender: "Male",
    address: "456 Oak Ave, Chicago, IL",
    department: "Mathematics",
    year: 2,
    cgpa: 3.45,
    status: "active",
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    student_id: "STU003",
    name: "Carol Davis",
    email: "carol.davis@email.com",
    phone: "+1-555-0103",
    date_of_birth: "2000-11-30",
    gender: "Female",
    address: "789 Pine Rd, Los Angeles, CA",
    department: "Computer Science",
    year: 4,
    cgpa: 3.92,
    status: "active",
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    student_id: "STU004",
    name: "David Brown",
    email: "david.brown@email.com",
    phone: "+1-555-0104",
    date_of_birth: "2002-03-12",
    gender: "Male",
    address: "321 Elm St, Houston, TX",
    department: "Physics",
    year: 1,
    cgpa: 2.90,
    status: "active",
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    student_id: "STU005",
    name: "Emma Wilson",
    email: "emma.wilson@email.com",
    phone: "+1-555-0105",
    date_of_birth: "2001-07-19",
    gender: "Female",
    address: "654 Maple Ave, Seattle, WA",
    department: "Engineering",
    year: 3,
    cgpa: 3.60,
    status: "active",
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    student_id: "STU006",
    name: "Frank Martinez",
    email: "frank.martinez@email.com",
    phone: "+1-555-0106",
    date_of_birth: "2000-09-05",
    gender: "Male",
    address: "987 Cedar Blvd, Miami, FL",
    department: "Computer Science",
    year: 4,
    cgpa: 3.15,
    status: "active",
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    student_id: "STU007",
    name: "Grace Lee",
    email: "grace.lee@email.com",
    phone: "+1-555-0107",
    date_of_birth: "2002-01-28",
    gender: "Female",
    address: "147 Birch Lane, Boston, MA",
    department: "Mathematics",
    year: 2,
    cgpa: 3.78,
    status: "active",
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    student_id: "STU008",
    name: "Henry Taylor",
    email: "henry.taylor@email.com",
    phone: "+1-555-0108",
    date_of_birth: "2001-12-14",
    gender: "Male",
    address: "258 Walnut St, Denver, CO",
    department: "Engineering",
    year: 3,
    cgpa: 2.75,
    status: "active",
    created_at: new Date(),
    updated_at: new Date()
  }
]);
print(`   ✅ Students inserted: ${db.students.countDocuments()}`);

// -------------------------------------------------------
// 3. INSERT COURSES (insertMany ⭐)
// -------------------------------------------------------
print("\n📚 Inserting courses...");
const coursesInsert = db.courses.insertMany([
  {
    course_code: "CS101",
    name: "Introduction to Programming",
    description: "Fundamentals of programming using Python",
    credits: 3,
    department: "Computer Science",
    instructor: "Prof. Alan Turing",
    semester: "Fall 2024",
    max_students: 40,
    enrolled_count: 0,
    status: "active",
    created_at: new Date()
  },
  {
    course_code: "CS201",
    name: "Data Structures & Algorithms",
    description: "Arrays, linked lists, trees, sorting, searching",
    credits: 4,
    department: "Computer Science",
    instructor: "Prof. Grace Hopper",
    semester: "Fall 2024",
    max_students: 35,
    enrolled_count: 0,
    status: "active",
    created_at: new Date()
  },
  {
    course_code: "CS301",
    name: "Database Systems",
    description: "Relational and NoSQL databases, MongoDB, SQL",
    credits: 3,
    department: "Computer Science",
    instructor: "Prof. Edgar Codd",
    semester: "Fall 2024",
    max_students: 30,
    enrolled_count: 0,
    status: "active",
    created_at: new Date()
  },
  {
    course_code: "MATH101",
    name: "Calculus I",
    description: "Limits, derivatives, integrals",
    credits: 4,
    department: "Mathematics",
    instructor: "Prof. Isaac Newton",
    semester: "Fall 2024",
    max_students: 50,
    enrolled_count: 0,
    status: "active",
    created_at: new Date()
  },
  {
    course_code: "MATH201",
    name: "Linear Algebra",
    description: "Vectors, matrices, eigenvalues",
    credits: 3,
    department: "Mathematics",
    instructor: "Prof. Emmy Noether",
    semester: "Fall 2024",
    max_students: 35,
    enrolled_count: 0,
    status: "active",
    created_at: new Date()
  },
  {
    course_code: "ENG101",
    name: "Engineering Mathematics",
    description: "Applied math for engineering",
    credits: 4,
    department: "Engineering",
    instructor: "Prof. Nikola Tesla",
    semester: "Fall 2024",
    max_students: 45,
    enrolled_count: 0,
    status: "active",
    created_at: new Date()
  },
  {
    course_code: "PHY101",
    name: "Physics I — Mechanics",
    description: "Newton's laws, kinematics, energy",
    credits: 4,
    department: "Physics",
    instructor: "Prof. Richard Feynman",
    semester: "Fall 2024",
    max_students: 40,
    enrolled_count: 0,
    status: "active",
    created_at: new Date()
  },
  {
    course_code: "CS401",
    name: "Machine Learning",
    description: "Supervised, unsupervised learning, neural networks",
    credits: 4,
    department: "Computer Science",
    instructor: "Prof. Andrew Ng",
    semester: "Fall 2024",
    max_students: 25,
    enrolled_count: 0,
    status: "active",
    created_at: new Date()
  }
]);

// Get inserted IDs for cross-referencing
const students = db.students.find().toArray();
const courses = db.courses.find().toArray();

// -------------------------------------------------------
// 4. INSERT ENROLLMENTS (insertMany ⭐)
// -------------------------------------------------------
print("\n📝 Inserting enrollments...");

const enrollmentData = [
  { si: 0, ci: 0 },  // STU001 -> CS101
  { si: 0, ci: 1 },  // STU001 -> CS201
  { si: 0, ci: 2 },  // STU001 -> CS301
  { si: 1, ci: 3 },  // STU002 -> MATH101
  { si: 1, ci: 4 },  // STU002 -> MATH201
  { si: 2, ci: 1 },  // STU003 -> CS201
  { si: 2, ci: 7 },  // STU003 -> ML
  { si: 3, ci: 6 },  // STU004 -> PHY101
  { si: 3, ci: 3 },  // STU004 -> MATH101
  { si: 4, ci: 5 },  // STU005 -> ENG101
  { si: 4, ci: 0 },  // STU005 -> CS101
  { si: 5, ci: 2 },  // STU006 -> CS301
  { si: 5, ci: 7 },  // STU006 -> ML
  { si: 6, ci: 3 },  // STU007 -> MATH101
  { si: 6, ci: 4 },  // STU007 -> MATH201
  { si: 7, ci: 5 },  // STU008 -> ENG101
];

const enrollmentDocs = enrollmentData.map(e => ({
  student_id: students[e.si]._id.toString(),
  course_id: courses[e.ci]._id.toString(),
  student_name: students[e.si].name,
  student_code: students[e.si].student_id,
  course_name: courses[e.ci].name,
  course_code: courses[e.ci].course_code,
  semester: "Fall 2024",
  status: "enrolled",
  enrolled_at: new Date()
}));

db.enrollments.insertMany(enrollmentDocs);
print(`   ✅ Enrollments inserted: ${db.enrollments.countDocuments()}`);

// Update enrolled_count for courses
enrollmentData.forEach(e => {
  db.courses.updateOne(
    { _id: courses[e.ci]._id },
    { $inc: { enrolled_count: 1 } }
  );
});

// -------------------------------------------------------
// 5. INSERT RESULTS (insertMany ⭐)
// -------------------------------------------------------
print("\n📊 Inserting results...");

function letterGrade(score) {
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 80) return "A-";
  if (score >= 75) return "B+";
  if (score >= 70) return "B";
  if (score >= 65) return "B-";
  if (score >= 60) return "C+";
  if (score >= 55) return "C";
  if (score >= 50) return "C-";
  if (score >= 45) return "D";
  return "F";
}

function gpaPoints(grade) {
  const map = { "A+": 4.0, "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7, "C+": 2.3, "C": 2.0, "C-": 1.7, "D": 1.0, "F": 0.0 };
  return map[grade] || 0.0;
}

const resultScores = [
  { si: 0, ci: 0, score: 92, exam: "final" },
  { si: 0, ci: 1, score: 88, exam: "final" },
  { si: 0, ci: 2, score: 95, exam: "final" },
  { si: 1, ci: 3, score: 78, exam: "final" },
  { si: 1, ci: 4, score: 82, exam: "final" },
  { si: 2, ci: 1, score: 96, exam: "final" },
  { si: 2, ci: 7, score: 91, exam: "final" },
  { si: 3, ci: 6, score: 65, exam: "final" },
  { si: 3, ci: 3, score: 70, exam: "final" },
  { si: 4, ci: 5, score: 84, exam: "final" },
  { si: 4, ci: 0, score: 79, exam: "final" },
  { si: 5, ci: 2, score: 73, exam: "final" },
  { si: 5, ci: 7, score: 68, exam: "final" },
  { si: 6, ci: 3, score: 90, exam: "final" },
  { si: 6, ci: 4, score: 87, exam: "final" },
  { si: 7, ci: 5, score: 58, exam: "final" },
];

const resultDocs = resultScores.map(r => {
  const lg = letterGrade(r.score);
  return {
    student_id: students[r.si]._id.toString(),
    course_id: courses[r.ci]._id.toString(),
    student_name: students[r.si].name,
    student_code: students[r.si].student_id,
    course_name: courses[r.ci].name,
    course_code: courses[r.ci].course_code,
    score: r.score,
    letter_grade: lg,
    gpa_points: gpaPoints(lg),
    credits: courses[r.ci].credits,
    semester: "Fall 2024",
    exam_type: r.exam,
    remarks: r.score >= 80 ? "Excellent" : r.score >= 60 ? "Good" : "Needs improvement",
    created_at: new Date(),
    updated_at: new Date()
  };
});

db.results.insertMany(resultDocs);
print(`   ✅ Results inserted: ${db.results.countDocuments()}`);

// -------------------------------------------------------
// 6. INSERT SAMPLE OCR DOCUMENT
// -------------------------------------------------------
print("\n📄 Inserting sample OCR document...");
db.documents.insertOne({
  filename: "sample_transcript.png",
  original_name: "Student_Transcript_STU001.png",
  extracted_text: "Student ID: STU001\nName: Alice Johnson\nDepartment: Computer Science\nCGPA: 3.85\nSemester: Fall 2024\nCS101 - Introduction to Programming: 92/100 A+\nCS201 - Data Structures: 88/100 A\nCS301 - Database Systems: 95/100 A+",
  parsed_data: {
    student_id: "STU001",
    name: "Alice Johnson",
    department: "Computer Science",
    cgpa: 3.85,
    course_codes: ["CS101", "CS201", "CS301"],
    scores: [92, 88, 95]
  },
  confidence: 94.5,
  status: "processed",
  uploaded_by: "admin",
  created_at: new Date()
});
print(`   ✅ Documents inserted: ${db.documents.countDocuments()}`);

// -------------------------------------------------------
// Final Summary
// -------------------------------------------------------
print("\n" + "=".repeat(60));
print("  ✅ Sample data seeding complete!");
print(`  👥 Users: ${db.users.countDocuments()}`);
print(`  🎓 Students: ${db.students.countDocuments()}`);
print(`  📚 Courses: ${db.courses.countDocuments()}`);
print(`  📝 Enrollments: ${db.enrollments.countDocuments()}`);
print(`  📊 Results: ${db.results.countDocuments()}`);
print(`  📄 Documents: ${db.documents.countDocuments()}`);
print("=".repeat(60));
