import sqlite3
import os
from werkzeug.security import generate_password_hash

DB_PATH = os.path.join(os.path.dirname(__file__), 'student_portal.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('student', 'faculty', 'admin')),
        name TEXT NOT NULL,
        identifier TEXT NOT NULL,
        department TEXT NOT NULL,
        semester INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS student_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        usn TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        semester INTEGER NOT NULL,
        section TEXT DEFAULT 'A',
        cgpa REAL DEFAULT 0.0,
        overall_attendance REAL DEFAULT 0.0,
        email TEXT NOT NULL,
        phone TEXT DEFAULT '',
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS examinations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_code TEXT NOT NULL,
        course_title TEXT NOT NULL,
        exam_date TEXT NOT NULL,
        time_slot TEXT NOT NULL,
        exam_hall TEXT NOT NULL,
        seat_number TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_code TEXT NOT NULL,
        course_title TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        due_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending',
        max_marks INTEGER DEFAULT 20,
        obtained_marks INTEGER DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        department TEXT NOT NULL,
        content TEXT NOT NULL,
        published_date TEXT NOT NULL,
        priority TEXT DEFAULT 'Normal'
    );

    CREATE TABLE IF NOT EXISTS academic_marks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        semester INTEGER NOT NULL,
        course_code TEXT NOT NULL,
        course_title TEXT NOT NULL,
        credits INTEGER NOT NULL,
        internal_marks INTEGER NOT NULL,
        lab_marks INTEGER NOT NULL,
        external_marks INTEGER NOT NULL,
        total_marks INTEGER NOT NULL,
        grade TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pass',
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        course_code TEXT NOT NULL,
        course_title TEXT NOT NULL,
        attended_hours INTEGER NOT NULL,
        total_hours INTEGER NOT NULL,
        od_hours INTEGER DEFAULT 0,
        faculty_name TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attendance_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_code TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'od')),
        marked_by TEXT DEFAULT 'Faculty',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS timetable (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day_of_week INTEGER NOT NULL,
        time_slot TEXT NOT NULL,
        course_code TEXT NOT NULL,
        course_title TEXT NOT NULL,
        room TEXT NOT NULL,
        faculty_name TEXT NOT NULL
    );
    """)

    conn.commit()

    # Re-seed academic marks and attendance with integer columns if needed
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        seed_data(conn)
    else:
        # Check if academic_marks has proper records
        cursor.execute("SELECT COUNT(*) FROM academic_marks")
        if cursor.fetchone()[0] == 0:
            seed_academic_data(conn, 1)

    conn.close()

def seed_academic_data(conn, student_id):
    cursor = conn.cursor()
    # Semester 6 marks
    sem6_marks = [
        (student_id, 6, "CS601", "Distributed Systems", 4, 28, 19, 45, 92, "O", "Pass"),
        (student_id, 6, "CS602", "Machine Learning", 4, 27, 20, 43, 90, "O", "Pass"),
        (student_id, 6, "CS603", "Compiler Design", 4, 25, 18, 41, 84, "A+", "Pass"),
        (student_id, 6, "CS604", "Cloud Architecture", 3, 26, 19, 44, 89, "A+", "Pass"),
        (student_id, 6, "CS605", "Information Security", 3, 29, 19, 46, 94, "O", "Pass"),
        (student_id, 6, "CS606L", "Capstone Phase-I", 4, 28, 19, 48, 95, "O", "Pass")
    ]
    cursor.executemany("""
    INSERT INTO academic_marks (user_id, semester, course_code, course_title, credits, internal_marks, lab_marks, external_marks, total_marks, grade, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, sem6_marks)

    # Semester 5 marks
    sem5_marks = [
        (student_id, 5, "CS501", "Database Management Systems", 4, 27, 19, 45, 91, "O", "Pass"),
        (student_id, 5, "CS502", "Computer Networks", 4, 26, 18, 43, 87, "A+", "Pass"),
        (student_id, 5, "CS503", "Theory of Computation", 4, 25, 18, 41, 84, "A+", "Pass"),
        (student_id, 5, "CS504", "Artificial Intelligence", 4, 28, 19, 44, 91, "O", "Pass"),
        (student_id, 5, "CS505", "Web Development Lab", 2, 29, 20, 46, 95, "O", "Pass")
    ]
    cursor.executemany("""
    INSERT INTO academic_marks (user_id, semester, course_code, course_title, credits, internal_marks, lab_marks, external_marks, total_marks, grade, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, sem5_marks)

    # Attendance data
    cursor.execute("SELECT COUNT(*) FROM attendance")
    if cursor.fetchone()[0] == 0:
        attendance_data = [
            (student_id, "CS601", "Distributed Systems", 42, 48, 2, "Dr. Ramesh Rao"),
            (student_id, "CS602", "Machine Learning", 38, 44, 2, "Prof. Ananya Sen"),
            (student_id, "CS603", "Compiler Design", 44, 48, 2, "Dr. K. V. Sharma"),
            (student_id, "CS604", "Cloud Architecture", 35, 44, 2, "Prof. Vikram Hegde"),
            (student_id, "CS605", "Information Security", 41, 48, 2, "Dr. Priya Nambiar"),
            (student_id, "CS606L", "Capstone Phase-I", 28, 40, 4, "Dr. Ramesh Rao")
        ]
        cursor.executemany("""
        INSERT INTO attendance (user_id, course_code, course_title, attended_hours, total_hours, od_hours, faculty_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, attendance_data)

    conn.commit()

def seed_data(conn):
    cursor = conn.cursor()

    student_pwd = generate_password_hash("student123")
    faculty_pwd = generate_password_hash("faculty123")
    admin_pwd = generate_password_hash("admin123")

    cursor.execute("""
    INSERT INTO users (email, password_hash, role, name, identifier, department, semester)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, ("student@college.edu", student_pwd, "student", "Alex Kumar", "1MS21CS084", "Computer Science & Engineering", 6))
    student_id = cursor.lastrowid

    cursor.execute("""
    INSERT INTO users (email, password_hash, role, name, identifier, department, semester)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, ("faculty@college.edu", faculty_pwd, "faculty", "Dr. K. V. Sharma", "EMP-CS104", "Computer Science & Engineering", 0))

    cursor.execute("""
    INSERT INTO users (email, password_hash, role, name, identifier, department, semester)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, ("admin@college.edu", admin_pwd, "admin", "Registrar Admin", "ADM-001", "Administration", 0))

    cursor.execute("""
    INSERT INTO student_profiles (user_id, usn, name, department, semester, section, cgpa, overall_attendance, email, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (student_id, "1MS21CS084", "Alex Kumar", "Computer Science & Engineering", 6, "B", 9.12, 88.4, "student@college.edu", "+91 98765 43210"))

    exams = [
        ("CS601", "Distributed Systems", "2026-11-20", "09:30 AM - 12:30 PM", "Hall 401", "Row D - 14"),
        ("CS602", "Machine Learning", "2026-11-23", "09:30 AM - 12:30 PM", "Hall 401", "Row D - 14"),
        ("CS603", "Compiler Design", "2026-11-26", "09:30 AM - 12:30 PM", "Hall 305", "Row B - 08"),
        ("CS604", "Cloud Architecture", "2026-11-29", "09:30 AM - 12:30 PM", "Hall 305", "Row B - 08")
    ]
    cursor.executemany("""
    INSERT INTO examinations (course_code, course_title, exam_date, time_slot, exam_hall, seat_number)
    VALUES (?, ?, ?, ?, ?, ?)
    """, exams)

    assignments = [
        ("CS601", "Distributed Systems", "Raft Consensus Protocol Implementation", "Implement leader election and log replication logic.", "Tomorrow, 11:59 PM", "Pending", 25, None),
        ("CS602", "Machine Learning", "CNN Architecture Benchmarking on CIFAR-10", "Evaluate accuracy and loss curves for ResNet-18 vs MobileNet.", "2026-11-08", "Pending", 30, None),
        ("CS603", "Compiler Design", "LR(1) Parser Table Generator", "Write lexer and grammar productions for expression evaluator.", "2026-11-12", "Pending", 20, None),
        ("CS604", "Cloud Architecture", "Terraform Multi-Tier AWS Infrastructure", "VPC peering and ECS task definitions.", "2026-10-28", "Submitted", 25, 24)
    ]
    cursor.executemany("""
    INSERT INTO assignments (course_code, course_title, title, description, due_date, status, max_marks, obtained_marks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, assignments)

    announcements = [
        ("End-Semester Theory Exam Schedule Released", "Office of Controller of Examinations", "Theory examination schedules for semesters 4, 6 and 8 are published. Download hall tickets from the examination tab.", "Today, 10:00 AM", "High"),
        ("Campus Placement Drive: Microsoft Solutions Open", "Career & Placement Cell", "Eligible students with CGPA >= 8.0 can register for the campus technical interview round before cutoff date.", "Yesterday, 04:30 PM", "High"),
        ("Library Book Return Notice (Autumn Cycle)", "Central University Library", "All textbooks borrowed prior to October 15 must be renewed or returned to avoid overdue charges.", "2026-10-31", "Normal")
    ]
    cursor.executemany("""
    INSERT INTO announcements (title, department, content, published_date, priority)
    VALUES (?, ?, ?, ?, ?)
    """, announcements)

    timetable_data = [
        (1, "09:00 AM - 10:00 AM", "CS601", "Distributed Systems", "LH-302", "Dr. Ramesh Rao"),
        (1, "10:00 AM - 11:00 AM", "CS602", "Machine Learning", "LH-302", "Prof. Ananya Sen"),
        (1, "11:15 AM - 01:15 PM", "CS606L", "Machine Learning Lab", "Lab 4", "Prof. Ananya Sen"),
        (2, "09:00 AM - 10:00 AM", "CS603", "Compiler Design", "LH-302", "Dr. K. V. Sharma"),
        (2, "10:00 AM - 11:00 AM", "CS605", "Information Security", "LH-302", "Dr. Priya Nambiar"),
        (2, "11:15 AM - 12:15 PM", "CS601", "Distributed Systems", "LH-302", "Dr. Ramesh Rao"),
        (2, "02:00 PM - 04:00 PM", "CS606L", "Capstone Project Studio", "Room 408", "Dr. Ramesh Rao"),
        (3, "09:00 AM - 10:00 AM", "CS602", "Machine Learning", "LH-302", "Prof. Ananya Sen"),
        (3, "10:00 AM - 11:00 AM", "CS604", "Cloud Architecture", "LH-302", "Prof. Vikram Hegde"),
        (4, "09:00 AM - 10:00 AM", "CS605", "Information Security", "LH-302", "Dr. Priya Nambiar"),
        (5, "09:00 AM - 10:00 AM", "CS604", "Cloud Architecture", "LH-302", "Prof. Vikram Hegde")
    ]
    cursor.executemany("""
    INSERT INTO timetable (day_of_week, time_slot, course_code, course_title, room, faculty_name)
    VALUES (?, ?, ?, ?, ?, ?)
    """, timetable_data)

    seed_academic_data(conn, student_id)
    conn.commit()

if __name__ == '__main__':
    # Reset DB file to ensure clean new schema
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    init_db()
    print("Database refreshed with updated schema and multi-semester records.")
