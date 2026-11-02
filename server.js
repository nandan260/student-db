const express = require('express');
const cors = require('cors');
const path = require('path');
const { query, initDb, isConnected, checkConnection } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ==========================================
// DB HEALTH CHECK
// ==========================================
app.get('/api/health', async (req, res) => {
  const status = await checkConnection();
  res.json({
    status: status.ok ? 'connected' : 'disconnected',
    database: 'PostgreSQL',
    timestamp: new Date().toISOString(),
    connection: status
  });
});

// ==========================================
// 1. STUDENT PROFILE
// ==========================================
app.get('/api/student', async (req, res) => {
  try {
    if (isConnected()) {
      const result = await query('SELECT * FROM students LIMIT 1');
      if (result.rows.length > 0) return res.json(result.rows[0]);
    }
  } catch (e) {
    console.error('Error fetching student from DB:', e.message);
  }
  // Fallback
  res.json({
    usn: '1MS21CS084',
    name: 'Alex Kumar',
    email: 'alex.cs21@apexuniversity.edu.in',
    phone: '+91 98765 43210',
    emergency_phone: '+91 98450 12345',
    department: 'Computer Science & Engineering',
    semester: 6,
    section: 'B',
    cgpa: 9.12,
    overall_attendance: 88.40
  });
});

app.put('/api/student', async (req, res) => {
  const { phone, emergency_phone } = req.body;
  try {
    if (isConnected()) {
      const result = await query(`
        UPDATE students SET phone = $1, emergency_phone = $2 WHERE usn = '1MS21CS084' RETURNING *;
      `, [phone, emergency_phone]);
      return res.json({ success: true, student: result.rows[0] });
    }
  } catch (e) {
    console.error('Error updating student:', e.message);
  }
  res.json({ success: true, updated: { phone, emergency_phone } });
});

// ==========================================
// 2. ACADEMIC MARKS
// ==========================================
app.get('/api/marks', async (req, res) => {
  const sem = parseInt(req.query.sem, 10) || 6;
  try {
    if (isConnected()) {
      const result = await query(`
        SELECT c.code, c.title, c.credits, m.ia_score, m.lab_score, m.see_score, m.total_score, m.grade, m.status
        FROM academic_marks m
        JOIN courses c ON m.course_id = c.id
        WHERE m.semester = $1
        ORDER BY c.code ASC;
      `, [sem]);
      if (result.rows.length > 0) return res.json(result.rows);
    }
  } catch (e) {
    console.error('Error fetching marks:', e.message);
  }

  // Fallback dataset
  res.json([
    { code: 'CS601', title: 'Distributed Systems', credits: 4, ia_score: '28/30', lab_score: '19/20', see_score: '45/50', total_score: 92, grade: 'O', status: 'Pass' },
    { code: 'CS602', title: 'Machine Learning', credits: 4, ia_score: '27/30', lab_score: '20/20', see_score: '43/50', total_score: 90, grade: 'O', status: 'Pass' },
    { code: 'CS603', title: 'Compiler Design', credits: 4, ia_score: '25/30', lab_score: '18/20', see_score: '41/50', total_score: 84, grade: 'A+', status: 'Pass' },
    { code: 'CS604', title: 'Cloud Architecture & DevOps', credits: 3, ia_score: '26/30', lab_score: '19/20', see_score: '44/50', total_score: 89, grade: 'A+', status: 'Pass' },
    { code: 'CS605', title: 'Information & Cyber Security', credits: 3, ia_score: '29/30', lab_score: '19/20', see_score: '46/50', total_score: 94, grade: 'O', status: 'Pass' },
    { code: 'CS606L', title: 'Capstone Project Phase-I', credits: 4, ia_score: '48/50', lab_score: '47/50', see_score: '--', total_score: 95, grade: 'O', status: 'Pass' }
  ]);
});

// ==========================================
// 3. ATTENDANCE & OD
// ==========================================
app.get('/api/attendance', async (req, res) => {
  try {
    if (isConnected()) {
      const result = await query(`
        SELECT c.code, c.title as name, f.name as faculty, a.attended, a.absent, a.on_duty, a.total_sessions as total,
               ROUND((a.attended::numeric / NULLIF(a.total_sessions, 0)::numeric) * 100, 1) as rate
        FROM attendance_records a
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN faculty f ON c.faculty_id = f.id
        ORDER BY c.code ASC;
      `);
      if (result.rows.length > 0) return res.json(result.rows);
    }
  } catch (e) {
    console.error('Error fetching attendance:', e.message);
  }

  res.json([
    { code: 'CS601', name: 'Distributed Systems', faculty: 'Dr. Ramesh Rao', attended: 42, absent: 4, on_duty: 2, total: 48, rate: 87.5 },
    { code: 'CS602', name: 'Machine Learning', faculty: 'Prof. Ananya Sen', attended: 38, absent: 4, on_duty: 2, total: 44, rate: 86.4 },
    { code: 'CS603', name: 'Compiler Design', faculty: 'Dr. K. V. Sharma', attended: 44, absent: 2, on_duty: 2, total: 48, rate: 91.7 },
    { code: 'CS604', name: 'Cloud Architecture', faculty: 'Prof. Vikram Hegde', attended: 35, absent: 7, on_duty: 2, total: 44, rate: 79.5 },
    { code: 'CS605', name: 'Cyber Security', faculty: 'Dr. Priya Nambiar', attended: 41, absent: 5, on_duty: 2, total: 48, rate: 85.4 },
    { code: 'CS606L', name: 'Capstone Lab', faculty: 'Dr. Rajeshwari S.', attended: 28, absent: 8, on_duty: 4, total: 40, rate: 80.0 }
  ]);
});

app.post('/api/attendance/od', async (req, res) => {
  const { event_name, event_date, hours } = req.body;
  const tracking_code = `OD-2026-${Math.floor(100 + Math.random() * 900)}`;
  try {
    if (isConnected()) {
      await query(`
        INSERT INTO on_duty_requests (student_id, event_name, event_date, hours, tracking_code)
        VALUES (1, $1, $2, $3, $4);
      `, [event_name, event_date, hours, tracking_code]);
    }
  } catch (e) {
    console.error('Error logging OD request:', e.message);
  }
  res.json({ success: true, tracking_code, event_name, hours });
});

// ==========================================
// 4. TIMETABLE
// ==========================================
app.get('/api/timetable', async (req, res) => {
  const day = parseInt(req.query.day, 10) || 2;
  try {
    if (isConnected()) {
      const result = await query(`
        SELECT t.time_slot as time, c.code, c.title as name, t.slot_type as type, t.room, COALESCE(f.name, '--') as faculty, t.status
        FROM timetable_slots t
        JOIN courses c ON t.course_id = c.id
        LEFT JOIN faculty f ON c.faculty_id = f.id
        WHERE t.day_of_week = $1
        ORDER BY t.id ASC;
      `, [day]);
      if (result.rows.length > 0) return res.json(result.rows);
    }
  } catch (e) {
    console.error('Error fetching timetable:', e.message);
  }

  // Fallback Tuesday
  res.json([
    { time: '09:00 - 10:00 AM', code: 'CS603', name: 'Compiler Design', type: 'Lecture', room: 'LH-302', faculty: 'Dr. K. V. Sharma', status: 'Completed' },
    { time: '10:00 - 11:00 AM', code: 'CS605', name: 'Cyber Security', type: 'Lecture', room: 'LH-302', faculty: 'Dr. Priya Nambiar', status: 'Completed' },
    { time: '11:15 - 12:15 PM', code: 'CS601', name: 'Distributed Systems', type: 'Lecture', room: 'LH-302', faculty: 'Dr. Ramesh Rao', status: 'Live Now' },
    { time: '02:00 - 04:00 PM', code: 'CS606L', name: 'Capstone Project Studio', type: 'Practical', room: 'Innovation Hub', faculty: 'Dr. Rajeshwari S.', status: 'Upcoming' }
  ]);
});

// ==========================================
// 5. ASSIGNMENTS
// ==========================================
app.get('/api/assignments', async (req, res) => {
  try {
    if (isConnected()) {
      const result = await query(`
        SELECT a.id, c.code, a.title, a.due_date as due, a.max_marks as marks, a.status, a.description as desc,
               s.feedback, s.scored_marks as scored
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN submissions s ON s.assignment_id = a.id
        ORDER BY a.id ASC;
      `);
      if (result.rows.length > 0) return res.json(result.rows);
    }
  } catch (e) {
    console.error('Error fetching assignments:', e.message);
  }

  res.json([
    { id: 1, code: 'CS601', title: 'Raft Consensus Algorithm Implementation', due: 'Tomorrow, 11:59 PM', marks: 25, status: 'pending', desc: 'Implement leader election and log replication in Go or Python.' },
    { id: 2, code: 'CS602', title: 'CNN Architecture Comparison on CIFAR-10', due: 'In 3 Days (Nov 5)', marks: 30, status: 'pending', desc: 'Compare ResNet-18 vs MobileNetV2 with custom schedules.' },
    { id: 3, code: 'CS603', title: 'Syntax Directed Translation Parser', due: 'Submitted Yesterday', marks: 20, status: 'submitted', desc: 'Bison/Flex grammar for arithmetic expressions.' },
    { id: 4, code: 'CS604', title: 'Terraform AWS Multi-Region Deployment', due: 'Graded', marks: 25, scored: 24, status: 'graded', desc: 'Automated VPC peering, ECS Fargate clusters.', feedback: 'Exceptional IaC structure. Clean state management.' },
    { id: 5, code: 'CS605', title: 'RSA & Elliptic Curve Cryptography Lab', due: 'Graded', marks: 20, scored: 20, status: 'graded', desc: 'Modular exponentiation and key exchange simulation.', feedback: 'Full points. Correct vulnerability mitigation demonstrated.' }
  ]);
});

app.post('/api/assignments/:id/submit', async (req, res) => {
  const { id } = req.params;
  const { link, notes } = req.body;
  try {
    if (isConnected()) {
      await query(`
        INSERT INTO submissions (assignment_id, student_id, submission_link, notes, status)
        VALUES ($1, 1, $2, $3, 'submitted')
        ON CONFLICT (assignment_id, student_id) DO UPDATE SET submission_link = EXCLUDED.submission_link, notes = EXCLUDED.notes;
      `, [id, link, notes]);
      await query(`UPDATE assignments SET status = 'submitted' WHERE id = $1`, [id]);
    }
  } catch (e) {
    console.error('Error submitting assignment:', e.message);
  }
  res.json({ success: true, assignmentId: id });
});

// ==========================================
// 6. NOTES & MATERIALS
// ==========================================
app.get('/api/notes', async (req, res) => {
  try {
    if (isConnected()) {
      const result = await query(`
        SELECT n.id, c.code as subject, n.title, n.doc_type as type, n.file_size as size, COALESCE(f.name, 'Dept') as faculty, n.downloads_count as downloads
        FROM notes n
        JOIN courses c ON n.course_id = c.id
        LEFT JOIN faculty f ON c.faculty_id = f.id;
      `);
      if (result.rows.length > 0) return res.json(result.rows);
    }
  } catch (e) {
    console.error('Error fetching notes:', e.message);
  }

  res.json([
    { id: 101, subject: 'CS601', title: 'Distributed Systems - Unit 1 & 2 Complete Notes', type: 'PDF', size: '4.8 MB', faculty: 'Dr. Ramesh Rao', downloads: 184 },
    { id: 102, subject: 'CS601', title: 'Consensus Protocols (Paxos vs Raft) Slide Deck', type: 'PPT', size: '12.4 MB', faculty: 'Dr. Ramesh Rao', downloads: 142 },
    { id: 103, subject: 'CS602', title: 'Deep Learning & Neural Networks Handwritten Digest', type: 'PDF', size: '8.1 MB', faculty: 'Prof. Ananya Sen', downloads: 310 },
    { id: 104, subject: 'CS603', title: 'Compiler Design Official Lab Manual 2026', type: 'Manual', size: '2.3 MB', faculty: 'Dr. K. V. Sharma', downloads: 96 },
    { id: 105, subject: 'CS604', title: 'Kubernetes & Docker Microservices Primer', type: 'PDF', size: '6.7 MB', faculty: 'Prof. Vikram Hegde', downloads: 215 },
    { id: 106, subject: 'CS605', title: 'Previous 5-Year Question Papers (2021-2025 Solved)', type: 'PYQ', size: '15.8 MB', faculty: 'Exam Cell Archive', downloads: 540 }
  ]);
});

// ==========================================
// 7. EXAM MANAGEMENT
// ==========================================
app.get('/api/exams', async (req, res) => {
  try {
    if (isConnected()) {
      const result = await query(`
        SELECT c.code, c.title as subject, e.exam_date as date, e.time_slot as time, e.exam_hall as room, e.seat_number as seat
        FROM exam_schedules e
        JOIN courses c ON e.course_id = c.id
        ORDER BY e.id ASC;
      `);
      if (result.rows.length > 0) return res.json(result.rows);
    }
  } catch (e) {
    console.error('Error fetching exams:', e.message);
  }

  res.json([
    { code: 'CS601', subject: 'Distributed Systems', date: '25 Nov 2026', time: '09:30 AM - 12:30 PM', room: 'Hall 401', seat: 'Row D - 14' },
    { code: 'CS602', subject: 'Machine Learning', date: '28 Nov 2026', time: '09:30 AM - 12:30 PM', room: 'Hall 401', seat: 'Row D - 14' },
    { code: 'CS603', subject: 'Compiler Design', date: '02 Dec 2026', time: '09:30 AM - 12:30 PM', room: 'Hall 305', seat: 'Row B - 08' },
    { code: 'CS604', subject: 'Cloud Architecture & DevOps', date: '05 Dec 2026', time: '09:30 AM - 12:30 PM', room: 'Hall 305', seat: 'Row B - 08' },
    { code: 'CS605', subject: 'Information & Cyber Security', date: '08 Dec 2026', time: '09:30 AM - 12:30 PM', room: 'Hall 401', seat: 'Row D - 14' }
  ]);
});

// ==========================================
// 8. PLACEMENTS
// ==========================================
app.get('/api/placements', async (req, res) => {
  try {
    if (isConnected()) {
      const result = await query(`
        SELECT p.id, p.company_name as company, p.role_title as role, p.drive_type as type, p.ctc_package as ctc,
               p.deadline, p.min_cgpa as "cgpaMin",
               EXISTS(SELECT 1 FROM placement_applications a WHERE a.drive_id = p.id AND a.student_id = 1) as applied
        FROM placement_drives p
        ORDER BY p.id ASC;
      `);
      if (result.rows.length > 0) return res.json(result.rows);
    }
  } catch (e) {
    console.error('Error fetching placements:', e.message);
  }

  res.json([
    { id: 1, company: 'Google', role: 'Software Engineer (Campus 2026)', type: 'Tech', ctc: '34.5 LPA', deadline: 'Nov 14, 2026', cgpaMin: 8.5, applied: false },
    { id: 2, company: 'Microsoft', role: 'SWE - Cloud & AI Platform', type: 'Tech', ctc: '32.0 LPA', deadline: 'Nov 18, 2026', cgpaMin: 8.0, applied: true },
    { id: 3, company: 'Amazon AWS', role: 'Solutions Architect Intern', type: 'Intern', ctc: '₹1,00,000/mo', deadline: 'Nov 20, 2026', cgpaMin: 8.0, applied: true },
    { id: 4, company: 'Cisco Systems', role: 'Network Software Engineer', type: 'Tech', ctc: '21.0 LPA', deadline: 'Nov 25, 2026', cgpaMin: 7.5, applied: false },
    { id: 5, company: 'JPMorgan Chase', role: 'Software Analyst - FinTech', type: 'Tech', ctc: '24.0 LPA', deadline: 'Nov 28, 2026', cgpaMin: 8.0, applied: false }
  ]);
});

// ==========================================
// 9. LIBRARY
// ==========================================
app.get('/api/library', async (req, res) => {
  try {
    if (isConnected()) {
      const books = await query('SELECT id, title, author, isbn, total_copies as copies, available_copies as available FROM library_books');
      return res.json({
        catalog: books.rows,
        issued: [
          { title: 'Distributed Systems: Principles and Paradigms', issueDate: 'Oct 18, 2026', dueDate: 'Nov 17, 2026', daysLeft: 15, barcode: 'LIB-84920' },
          { title: 'Pattern Recognition and Machine Learning', issueDate: 'Oct 22, 2026', dueDate: 'Nov 21, 2026', daysLeft: 19, barcode: 'LIB-77312' }
        ]
      });
    }
  } catch (e) {
    console.error('Error fetching library:', e.message);
  }

  res.json({
    catalog: [
      { id: 1, title: 'Distributed Systems: Principles and Paradigms', author: 'Andrew S. Tanenbaum', isbn: '978-0132392273', copies: 4, available: 2 },
      { id: 2, title: 'Pattern Recognition and Machine Learning', author: 'Christopher M. Bishop', isbn: '978-0387310732', copies: 6, available: 3 },
      { id: 3, title: 'Compilers: Principles, Techniques, and Tools (Dragon Book)', author: 'Aho, Lam, Sethi, Ullman', isbn: '978-0321486813', copies: 5, available: 1 }
    ],
    issued: [
      { title: 'Distributed Systems: Principles and Paradigms', issueDate: 'Oct 18, 2026', dueDate: 'Nov 17, 2026', daysLeft: 15, barcode: 'LIB-84920' },
      { title: 'Pattern Recognition and Machine Learning', issueDate: 'Oct 22, 2026', dueDate: 'Nov 21, 2026', daysLeft: 19, barcode: 'LIB-77312' }
    ]
  });
});

// ==========================================
// 10. ANNOUNCEMENTS & FACULTY
// ==========================================
app.get('/api/announcements', async (req, res) => {
  try {
    if (isConnected()) {
      const result = await query('SELECT id, title, department as dept, category as tag, content, published_at as date FROM announcements ORDER BY id DESC');
      if (result.rows.length > 0) return res.json(result.rows);
    }
  } catch (e) {
    console.error('Error fetching announcements:', e.message);
  }

  res.json([
    { id: 1, title: 'End-Semester Theory Exam Hall Tickets Released', dept: 'Office of Registrar', date: 'Today, 10:30 AM', tag: 'Exams', content: 'Eligible candidates with >=75% attendance can verify hall ticket details in Module 7.' },
    { id: 2, title: 'Campus Recruitment Drive: Microsoft SWE Applications Open', dept: 'Placement Cell', date: 'Yesterday, 04:15 PM', tag: 'Placement', content: 'Drive scheduled for Nov 18. Submit resumes with verified CGPA before cutoff.' },
    { id: 3, title: 'On-Duty Attendance Approved for IEEE Hackathon Delegates', dept: 'Dean Academics', date: 'Oct 30, 2026', tag: 'Attendance', content: 'OD records credited across all subjects for official participants.' }
  ]);
});

// START SERVER
app.listen(PORT, async () => {
  console.log(`=================================================`);
  console.log(`🚀 Student DB API Server listening on port ${PORT}`);
  console.log(`🌐 Dashboard UI: http://localhost:${PORT}`);
  console.log(`=================================================`);
  
  // Try initializing PostgreSQL database connection and tables
  await initDb();
});
