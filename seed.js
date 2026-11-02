const { pool, query } = require('./db');

async function seedData() {
  console.log('[SEED] Populating database tables...');

  // 1. Student
  const studentRes = await query(`
    INSERT INTO students (usn, name, email, phone, emergency_phone, department, semester, section, cgpa, overall_attendance)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (usn) DO UPDATE SET name = EXCLUDED.name
    RETURNING id;
  `, ['1MS21CS084', 'Alex Kumar', 'alex.cs21@apexuniversity.edu.in', '+91 98765 43210', '+91 98450 12345', 'Computer Science & Engineering', 6, 'B', 9.12, 88.40]);
  const studentId = studentRes.rows[0].id;

  // 2. Faculty
  const facultyData = [
    ['FAC01', 'Dr. Ramesh Rao', 'CSE', 'Professor & HOD', 'Cabin CS-101', 'ramesh.rao@apexuniversity.edu.in'],
    ['FAC02', 'Prof. Ananya Sen', 'CSE', 'Associate Professor', 'Cabin CS-204', 'ananya.sen@apexuniversity.edu.in'],
    ['FAC03', 'Dr. K. V. Sharma', 'CSE', 'Professor', 'Cabin CS-208', 'kv.sharma@apexuniversity.edu.in'],
    ['FAC04', 'Prof. Vikram Hegde', 'CSE', 'Assistant Professor', 'Cabin CS-312', 'vikram.hegde@apexuniversity.edu.in'],
    ['FAC05', 'Dr. Priya Nambiar', 'CSE', 'Associate Professor', 'Cabin CS-215', 'priya.nambiar@apexuniversity.edu.in']
  ];

  const facultyMap = {};
  for (const f of facultyData) {
    const res = await query(`
      INSERT INTO faculty (emp_id, name, department, role, cabin, email)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (emp_id) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name;
    `, f);
    facultyMap[f[1]] = res.rows[0].id;
  }

  // 3. Courses
  const courseData = [
    ['CS601', 'Distributed Systems', 4, 6, 'CSE', facultyMap['Dr. Ramesh Rao']],
    ['CS602', 'Machine Learning', 4, 6, 'CSE', facultyMap['Prof. Ananya Sen']],
    ['CS603', 'Compiler Design', 4, 6, 'CSE', facultyMap['Dr. K. V. Sharma']],
    ['CS604', 'Cloud Architecture & DevOps', 3, 6, 'CSE', facultyMap['Prof. Vikram Hegde']],
    ['CS605', 'Information & Cyber Security', 3, 6, 'CSE', facultyMap['Dr. Priya Nambiar']],
    ['CS606L', 'Capstone Project Phase-I', 4, 6, 'CSE', facultyMap['Dr. Ramesh Rao']]
  ];

  const courseMap = {};
  for (const c of courseData) {
    const res = await query(`
      INSERT INTO courses (code, title, credits, semester, department, faculty_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title
      RETURNING id, code;
    `, c);
    courseMap[c[0]] = res.rows[0].id;
  }

  // 4. Academic Marks
  const marksData = [
    [courseMap['CS601'], 6, '28/30', '19/20', '45/50', 92, 'O', 'Pass'],
    [courseMap['CS602'], 6, '27/30', '20/20', '43/50', 90, 'O', 'Pass'],
    [courseMap['CS603'], 6, '25/30', '18/20', '41/50', 84, 'A+', 'Pass'],
    [courseMap['CS604'], 6, '26/30', '19/20', '44/50', 89, 'A+', 'Pass'],
    [courseMap['CS605'], 6, '29/30', '19/20', '46/50', 94, 'O', 'Pass'],
    [courseMap['CS606L'], 6, '48/50', '47/50', '--', 95, 'O', 'Pass']
  ];

  for (const m of marksData) {
    await query(`
      INSERT INTO academic_marks (student_id, course_id, semester, ia_score, lab_score, see_score, total_score, grade, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (student_id, course_id, semester) DO NOTHING;
    `, [studentId, ...m]);
  }

  // 5. Attendance Records
  const attData = [
    [courseMap['CS601'], 42, 4, 2, 48],
    [courseMap['CS602'], 38, 4, 2, 44],
    [courseMap['CS603'], 44, 2, 2, 48],
    [courseMap['CS604'], 35, 7, 2, 44],
    [courseMap['CS605'], 41, 5, 2, 48],
    [courseMap['CS606L'], 28, 8, 4, 40]
  ];

  for (const a of attData) {
    await query(`
      INSERT INTO attendance_records (student_id, course_id, attended, absent, on_duty, total_sessions)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (student_id, course_id) DO UPDATE SET attended = EXCLUDED.attended;
    `, [studentId, ...a]);
  }

  // 6. Timetable Slots
  const ttSlots = [
    [2, '09:00 - 10:00 AM', courseMap['CS603'], 'Lecture', 'LH-302', 'Completed'],
    [2, '10:00 - 11:00 AM', courseMap['CS605'], 'Lecture', 'LH-302', 'Completed'],
    [2, '11:15 - 12:15 PM', courseMap['CS601'], 'Lecture', 'LH-302', 'Live Now'],
    [2, '02:00 - 04:00 PM', courseMap['CS606L'], 'Practical', 'Innovation Hub', 'Upcoming']
  ];

  for (const slot of ttSlots) {
    await query(`
      INSERT INTO timetable_slots (day_of_week, time_slot, course_id, slot_type, room, status)
      VALUES ($1, $2, $3, $4, $5, $6);
    `, slot);
  }

  // 7. Assignments & Submissions
  const a1 = await query(`
    INSERT INTO assignments (course_id, title, description, max_marks, due_date, status)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;
  `, [courseMap['CS601'], 'Raft Consensus Algorithm Implementation', 'Leader election & log replication in Go/Python.', 25, 'Tomorrow, 11:59 PM', 'pending']);

  const a4 = await query(`
    INSERT INTO assignments (course_id, title, description, max_marks, due_date, status)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;
  `, [courseMap['CS604'], 'Terraform AWS Multi-Region Deployment', 'Automated VPC peering & ECS Fargate.', 25, 'Graded', 'graded']);

  await query(`
    INSERT INTO submissions (assignment_id, student_id, submission_link, notes, scored_marks, feedback, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (assignment_id, student_id) DO NOTHING;
  `, [a4.rows[0].id, studentId, 'https://github.com/alexkumar/terraform-aws', 'Deployed using Terraform v1.8', 24, 'Exceptional IaC structure. Clean state management.', 'graded']);

  // 8. Notes
  const notesData = [
    [courseMap['CS601'], 'Distributed Systems - Unit 1 & 2 Complete Notes', 'PDF', '4.8 MB', 184],
    [courseMap['CS602'], 'Deep Learning & Neural Networks Handwritten Digest', 'PDF', '8.1 MB', 310],
    [courseMap['CS603'], 'Compiler Design Official Lab Manual 2026', 'Manual', '2.3 MB', 96],
    [courseMap['CS605'], 'Previous 5-Year Question Papers (2021-2025 Solved)', 'PYQ', '15.8 MB', 540]
  ];

  for (const n of notesData) {
    await query(`
      INSERT INTO notes (course_id, title, doc_type, file_size, downloads_count)
      VALUES ($1, $2, $3, $4, $5);
    `, n);
  }

  // 9. Exams
  const examsData = [
    [courseMap['CS601'], '25 Nov 2026', '09:30 AM - 12:30 PM', 'Hall 401', 'Row D - 14'],
    [courseMap['CS602'], '28 Nov 2026', '09:30 AM - 12:30 PM', 'Hall 401', 'Row D - 14'],
    [courseMap['CS603'], '02 Dec 2026', '09:30 AM - 12:30 PM', 'Hall 305', 'Row B - 08']
  ];

  for (const ex of examsData) {
    await query(`
      INSERT INTO exam_schedules (course_id, exam_date, time_slot, exam_hall, seat_number)
      VALUES ($1, $2, $3, $4, $5);
    `, ex);
  }

  // 10. Placement Drives
  const drivesData = [
    ['Google', 'Software Engineer (Campus 2026)', 'Tech', '34.5 LPA', 'Nov 14, 2026', 8.5],
    ['Microsoft', 'SWE - Cloud & AI Platform', 'Tech', '32.0 LPA', 'Nov 18, 2026', 8.0],
    ['Amazon AWS', 'Solutions Architect Intern', 'Intern', '₹1,00,000/mo', 'Nov 20, 2026', 8.0]
  ];

  for (const d of drivesData) {
    await query(`
      INSERT INTO placement_drives (company_name, role_title, drive_type, ctc_package, deadline, min_cgpa)
      VALUES ($1, $2, $3, $4, $5, $6);
    `, d);
  }

  // 11. Library Books
  const booksData = [
    ['Distributed Systems: Principles and Paradigms', 'Andrew S. Tanenbaum', '978-0132392273', 4, 2],
    ['Pattern Recognition and Machine Learning', 'Christopher M. Bishop', '978-0387310732', 6, 3],
    ['Compilers: Principles, Techniques, and Tools', 'Aho, Lam, Sethi, Ullman', '978-0321486813', 5, 1]
  ];

  for (const b of booksData) {
    await query(`
      INSERT INTO library_books (title, author, isbn, total_copies, available_copies)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (isbn) DO NOTHING;
    `, b);
  }

  // 12. Announcements
  const announcementsData = [
    ['End-Semester Theory Exam Hall Tickets Released', 'Office of Registrar', 'Exams', 'Eligible candidates with >=75% attendance can verify admit card details.', 'Today, 10:30 AM'],
    ['Campus Recruitment Drive: Microsoft SWE Applications Open', 'Placement Cell', 'Placement', 'Drive scheduled for Nov 18. Submit resumes with verified CGPA.', 'Yesterday, 04:15 PM'],
    ['On-Duty Attendance Approved for IEEE Hackathon Delegates', 'Dean Academics', 'Attendance', 'OD records credited across all subjects for official participants.', 'Oct 30, 2026']
  ];

  for (const an of announcementsData) {
    await query(`
      INSERT INTO announcements (title, department, category, content, published_at)
      VALUES ($1, $2, $3, $4, $5);
    `, an);
  }

  console.log('[SEED COMPLETE] All 17 module baseline data loaded successfully.');
}

if (require.main === module) {
  seedData()
    .then(() => {
      console.log('Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

module.exports = { seedData };
