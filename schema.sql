-- Student DB - PostgreSQL Schema (17 Modules)
-- Comprehensive DDL with foreign keys, indexes, and constraints

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  usn VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20),
  emergency_phone VARCHAR(20),
  department VARCHAR(100) NOT NULL,
  semester INT NOT NULL DEFAULT 6,
  section VARCHAR(5) NOT NULL DEFAULT 'B',
  cgpa NUMERIC(4, 2) DEFAULT 9.12,
  overall_attendance NUMERIC(5, 2) DEFAULT 88.40,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faculty (
  id SERIAL PRIMARY KEY,
  emp_id VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL,
  role VARCHAR(100) NOT NULL,
  cabin VARCHAR(50),
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  title VARCHAR(150) NOT NULL,
  credits INT NOT NULL DEFAULT 4,
  semester INT NOT NULL DEFAULT 6,
  department VARCHAR(100) NOT NULL,
  faculty_id INT REFERENCES faculty(id) ON DELETE SET NULL
);

-- 1. Academic Performance & Marks
CREATE TABLE IF NOT EXISTS academic_marks (
  id SERIAL PRIMARY KEY,
  student_id INT REFERENCES students(id) ON DELETE CASCADE,
  course_id INT REFERENCES courses(id) ON DELETE CASCADE,
  semester INT NOT NULL,
  ia_score VARCHAR(10),
  lab_score VARCHAR(10),
  see_score VARCHAR(10),
  total_score INT NOT NULL,
  grade VARCHAR(5) NOT NULL,
  status VARCHAR(20) DEFAULT 'Pass',
  UNIQUE(student_id, course_id, semester)
);

-- 2. Smart Attendance
CREATE TABLE IF NOT EXISTS attendance_records (
  id SERIAL PRIMARY KEY,
  student_id INT REFERENCES students(id) ON DELETE CASCADE,
  course_id INT REFERENCES courses(id) ON DELETE CASCADE,
  attended INT NOT NULL DEFAULT 0,
  absent INT NOT NULL DEFAULT 0,
  on_duty INT NOT NULL DEFAULT 0,
  total_sessions INT NOT NULL DEFAULT 0,
  UNIQUE(student_id, course_id)
);

CREATE TABLE IF NOT EXISTS on_duty_requests (
  id SERIAL PRIMARY KEY,
  student_id INT REFERENCES students(id) ON DELETE CASCADE,
  event_name VARCHAR(150) NOT NULL,
  event_date DATE NOT NULL,
  hours INT NOT NULL,
  status VARCHAR(20) DEFAULT 'Approved',
  tracking_code VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Timetable
CREATE TABLE IF NOT EXISTS timetable_slots (
  id SERIAL PRIMARY KEY,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 6),
  time_slot VARCHAR(50) NOT NULL,
  course_id INT REFERENCES courses(id) ON DELETE CASCADE,
  slot_type VARCHAR(50) NOT NULL,
  room VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'Scheduled'
);

-- 5. Assignments & Submissions
CREATE TABLE IF NOT EXISTS assignments (
  id SERIAL PRIMARY KEY,
  course_id INT REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  max_marks INT NOT NULL DEFAULT 25,
  due_date VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  assignment_id INT REFERENCES assignments(id) ON DELETE CASCADE,
  student_id INT REFERENCES students(id) ON DELETE CASCADE,
  submission_link TEXT NOT NULL,
  notes TEXT,
  scored_marks INT,
  feedback TEXT,
  status VARCHAR(20) DEFAULT 'submitted',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(assignment_id, student_id)
);

-- 6. Notes & Materials
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  course_id INT REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  doc_type VARCHAR(20) NOT NULL,
  file_size VARCHAR(20),
  file_url TEXT,
  downloads_count INT DEFAULT 0
);

-- 7. Exam Management
CREATE TABLE IF NOT EXISTS exam_schedules (
  id SERIAL PRIMARY KEY,
  course_id INT REFERENCES courses(id) ON DELETE CASCADE,
  exam_date VARCHAR(50) NOT NULL,
  time_slot VARCHAR(50) NOT NULL,
  exam_hall VARCHAR(50) NOT NULL,
  seat_number VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS revaluations (
  id SERIAL PRIMARY KEY,
  student_id INT REFERENCES students(id) ON DELETE CASCADE,
  course_id INT REFERENCES courses(id) ON DELETE CASCADE,
  application_type VARCHAR(100) NOT NULL,
  discrepancy_note TEXT,
  fee_paid NUMERIC(8, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'Under Review',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Placements
CREATE TABLE IF NOT EXISTS placement_drives (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(100) NOT NULL,
  role_title VARCHAR(150) NOT NULL,
  drive_type VARCHAR(50) NOT NULL,
  ctc_package VARCHAR(50) NOT NULL,
  deadline VARCHAR(50) NOT NULL,
  min_cgpa NUMERIC(3, 1) DEFAULT 7.5
);

CREATE TABLE IF NOT EXISTS placement_applications (
  id SERIAL PRIMARY KEY,
  drive_id INT REFERENCES placement_drives(id) ON DELETE CASCADE,
  student_id INT REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'Applied',
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(drive_id, student_id)
);

CREATE TABLE IF NOT EXISTS mock_interviews (
  id SERIAL PRIMARY KEY,
  student_id INT REFERENCES students(id) ON DELETE CASCADE,
  domain VARCHAR(100) NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'Confirmed'
);

-- 11. Projects Hub
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  faculty_guide_id INT REFERENCES faculty(id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL,
  repo_url TEXT NOT NULL,
  project_status VARCHAR(50) DEFAULT 'Active',
  open_seats INT DEFAULT 1,
  abstract TEXT,
  created_by INT REFERENCES students(id) ON DELETE SET NULL
);

-- 12. Events & Clubs
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  organizer VARCHAR(100) NOT NULL,
  event_date VARCHAR(50) NOT NULL,
  venue VARCHAR(100) NOT NULL,
  prize_pool VARCHAR(50),
  description TEXT
);

CREATE TABLE IF NOT EXISTS event_registrations (
  id SERIAL PRIMARY KEY,
  event_id INT REFERENCES events(id) ON DELETE CASCADE,
  student_id INT REFERENCES students(id) ON DELETE CASCADE,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, student_id)
);

-- 13. Library
CREATE TABLE IF NOT EXISTS library_books (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  author VARCHAR(100) NOT NULL,
  isbn VARCHAR(30) UNIQUE NOT NULL,
  total_copies INT DEFAULT 5,
  available_copies INT DEFAULT 5
);

CREATE TABLE IF NOT EXISTS library_loans (
  id SERIAL PRIMARY KEY,
  book_id INT REFERENCES library_books(id) ON DELETE CASCADE,
  student_id INT REFERENCES students(id) ON DELETE CASCADE,
  issue_date VARCHAR(50) NOT NULL,
  due_date VARCHAR(50) NOT NULL,
  days_left INT DEFAULT 15,
  barcode VARCHAR(50) UNIQUE NOT NULL
);

-- 14. Campus Services
CREATE TABLE IF NOT EXISTS lost_found_items (
  id SERIAL PRIMARY KEY,
  item_name VARCHAR(150) NOT NULL,
  found_location VARCHAR(150) NOT NULL,
  report_date VARCHAR(50) NOT NULL,
  contact_person VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'Unclaimed'
);

-- 15. Communications
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  department VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  published_at VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS faculty_appointments (
  id SERIAL PRIMARY KEY,
  faculty_id INT REFERENCES faculty(id) ON DELETE CASCADE,
  student_id INT REFERENCES students(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending'
);

-- 17. Faculty Doubt Portal
CREATE TABLE IF NOT EXISTS doubts (
  id SERIAL PRIMARY KEY,
  course_id INT REFERENCES courses(id) ON DELETE CASCADE,
  student_id INT REFERENCES students(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'Answered',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doubt_replies (
  id SERIAL PRIMARY KEY,
  doubt_id INT REFERENCES doubts(id) ON DELETE CASCADE,
  faculty_id INT REFERENCES faculty(id) ON DELETE CASCADE,
  reply_text TEXT NOT NULL,
  replied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for frequent queries
CREATE INDEX IF NOT EXISTS idx_courses_sem ON courses(semester);
CREATE INDEX IF NOT EXISTS idx_marks_student ON academic_marks(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_timetable_day ON timetable_slots(day_of_week);
CREATE INDEX IF NOT EXISTS idx_submissions_assig ON submissions(assignment_id);
