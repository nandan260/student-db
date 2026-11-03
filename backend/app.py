import os
import math
import json
import io
import base64
from datetime import datetime, date, timedelta
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
import qrcode
from database import (
    get_db, init_db, UPLOAD_DIR, NOTES_UPLOAD_DIR, ASSIGNMENTS_UPLOAD_DIR,
    PROFILES_UPLOAD_DIR, RESUMES_UPLOAD_DIR, PROJECTS_UPLOAD_DIR, CERTIFICATES_UPLOAD_DIR,
    DOUBTS_UPLOAD_DIR
)

FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist'))
app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path='')
CORS(app, resources={r"/api/*": {"origins": "*"}})

init_db()

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(UPLOAD_DIR, filename)

def calculate_grade_and_status(total, external):
    if total >= 90:
        grade = 'O'
    elif total >= 80:
        grade = 'A+'
    elif total >= 70:
        grade = 'A'
    elif total >= 60:
        grade = 'B+'
    elif total >= 55:
        grade = 'B'
    elif total >= 50:
        grade = 'C'
    elif total >= 40:
        grade = 'P'
    else:
        grade = 'F'
    status = 'Pass' if (total >= 40 and external >= 18) else 'Fail'
    return grade, status

GRADE_POINTS = {'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'P': 4, 'F': 0}

# ==========================================================
# AUTHENTICATION (LOGIN, REGISTER, SESSION)
# ==========================================================

@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()
    role = (data.get('role') or '').strip().lower()

    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    if role:
        cursor.execute("SELECT * FROM users WHERE LOWER(email) = ? AND role = ?", (email, role))
    else:
        cursor.execute("SELECT * FROM users WHERE LOWER(email) = ?", (email,))
    user = cursor.fetchone()
    conn.close()

    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'error': 'Invalid email, role, or password.'}), 401

    token = f"auth_token_{user['id']}_{int(datetime.now().timestamp())}"
    user_payload = {
        'id': user['id'],
        'email': user['email'],
        'role': user['role'],
        'name': user['name'],
        'identifier': user['identifier'],
        'department': user['department'],
        'semester': user['semester']
    }
    return jsonify({
        'message': 'Login successful.',
        'token': token,
        'user': user_payload
    })

@app.route('/api/auth/register', methods=['POST'])
def auth_register():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()
    role = (data.get('role') or 'student').strip().lower()
    name = (data.get('name') or '').strip()
    identifier = (data.get('identifier') or '').strip()
    department = (data.get('department') or 'Computer Science & Engineering').strip()
    try:
        semester = int(data.get('semester', 1))
    except (ValueError, TypeError):
        semester = 1

    if not email or not password or not name or not identifier:
        return jsonify({'error': 'All fields are required for registration.'}), 400

    if role not in ['student', 'faculty', 'admin']:
        return jsonify({'error': 'Invalid role specified.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE LOWER(email) = ?", (email,))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'An account with this email address already exists.'}), 409

    pwd_hash = generate_password_hash(password)
    cursor.execute("""
        INSERT INTO users (email, password_hash, role, name, identifier, department, semester)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (email, pwd_hash, role, name, identifier, department, semester))
    new_user_id = cursor.lastrowid

    if role == 'student':
        cursor.execute("SELECT id FROM student_profiles WHERE user_id = ?", (new_user_id,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO student_profiles (user_id, name, usn, department, semester, email, phone)
                VALUES (?, ?, ?, ?, ?, ?, '+91 98765 43210')
            """, (new_user_id, name, identifier, department, semester, email))

    conn.commit()
    conn.close()

    token = f"auth_token_{new_user_id}_{int(datetime.now().timestamp())}"
    user_payload = {
        'id': new_user_id,
        'email': email,
        'role': role,
        'name': name,
        'identifier': identifier,
        'department': department,
        'semester': semester
    }
    return jsonify({
        'message': 'Registration successful. Welcome to College Portal!',
        'token': token,
        'user': user_payload
    }), 201

@app.route('/api/auth/me', methods=['GET'])
def auth_me():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, role, name, identifier, department, semester FROM users WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    if row:
        return jsonify({'user': dict(row)})
    return jsonify({'error': 'Not logged in.'}), 401

# ==========================================================
# DASHBOARD SUMMARY
# ==========================================================

@app.route('/api/dashboard/summary', methods=['GET'])
def dashboard_summary():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM student_profiles LIMIT 1")
    profile_row = cursor.fetchone()
    profile = dict(profile_row) if profile_row else {
        'name': 'Alex Kumar',
        'usn': '1MS21CS084',
        'department': 'Computer Science & Engineering',
        'semester': 6
    }

    # Live attendance calculation
    cursor.execute("SELECT SUM(attended_hours) as attended, SUM(total_hours) as total, SUM(od_hours) as od FROM attendance")
    att_agg = cursor.fetchone()
    if att_agg and att_agg['total'] and att_agg['total'] > 0:
        overall_attendance = round(((att_agg['attended'] + (att_agg['od'] or 0)) / att_agg['total']) * 100, 1)
    else:
        overall_attendance = 88.4

    # Live SGPA for Sem 6
    cursor.execute("SELECT credits, grade FROM academic_marks WHERE semester = 6")
    sem6_marks = cursor.fetchall()
    sem6_pts = sum(m['credits'] * GRADE_POINTS.get(m['grade'], 8) for m in sem6_marks)
    sem6_creds = sum(m['credits'] for m in sem6_marks)
    current_sgpa = round(sem6_pts / sem6_creds, 2) if sem6_creds > 0 else 9.68

    # Live CGPA across all recorded semesters
    cursor.execute("SELECT SUM(total_credits) as cum_credits, SUM(total_credit_points) as cum_points FROM semester_gpa_history WHERE student_id = 1")
    gpa_agg = cursor.fetchone()
    if gpa_agg and gpa_agg['cum_credits'] and gpa_agg['cum_credits'] > 0:
        cgpa = round(gpa_agg['cum_points'] / gpa_agg['cum_credits'], 2)
    else:
        cursor.execute("SELECT credits, grade FROM academic_marks")
        all_marks = cursor.fetchall()
        all_pts = sum(m['credits'] * GRADE_POINTS.get(m['grade'], 8) for m in all_marks)
        all_creds = sum(m['credits'] for m in all_marks)
        cgpa = round(all_pts / all_creds, 2) if all_creds > 0 else 9.36

    # Upcoming examinations
    cursor.execute("SELECT * FROM examinations ORDER BY exam_date ASC LIMIT 5")
    exams = [dict(r) for r in cursor.fetchall()]

    # Pending assignments
    cursor.execute("""
        SELECT a.*, COALESCE(s.status, 'Pending') as submission_status
        FROM assignments a
        LEFT JOIN assignment_submissions s ON s.assignment_id = a.id
        WHERE COALESCE(s.status, 'Pending') = 'Pending'
        ORDER BY a.deadline_date ASC LIMIT 5
    """)
    pending_assignments = [dict(r) for r in cursor.fetchall()]

    # Announcements
    cursor.execute("SELECT * FROM announcements ORDER BY id DESC LIMIT 5")
    announcements = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return jsonify({
        'student': {
            'name': profile['name'],
            'usn': profile['usn'],
            'department': profile['department'],
            'semester': profile['semester'],
            'overall_attendance': overall_attendance,
            'current_sgpa': current_sgpa,
            'cgpa': cgpa
        },
        'upcoming_examinations': exams,
        'pending_assignments': pending_assignments,
        'recent_announcements': announcements
    })

# ==========================================================
# MODULE 1: ACADEMIC PERFORMANCE & MARKS
# ==========================================================

@app.route('/api/academics/performance', methods=['GET'])
def get_performance():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT DISTINCT semester FROM academic_marks ORDER BY semester DESC")
    available_semesters = [r['semester'] for r in cursor.fetchall()] or [6, 5]

    selected_sem = request.args.get('semester')
    selected_sem = int(selected_sem) if selected_sem else available_semesters[0]

    cursor.execute("""
        SELECT id, course_code, course_title, credits, internal_marks, lab_marks, external_marks, total_marks, grade, status
        FROM academic_marks
        WHERE semester = ?
        ORDER BY course_code ASC
    """, (selected_sem,))
    marks_rows = [dict(r) for r in cursor.fetchall()]

    sem_pts = sum(m['credits'] * GRADE_POINTS.get(m['grade'], 0) for m in marks_rows)
    sem_creds = sum(m['credits'] for m in marks_rows)
    sgpa = round(sem_pts / sem_creds, 2) if sem_creds > 0 else 0.0

    cursor.execute("SELECT credits, grade FROM academic_marks")
    all_marks = cursor.fetchall()
    cum_pts = sum(m['credits'] * GRADE_POINTS.get(m['grade'], 0) for m in all_marks)
    cum_creds = sum(m['credits'] for m in all_marks)
    cgpa = round(cum_pts / cum_creds, 2) if cum_creds > 0 else 0.0

    total_subjects = len(marks_rows)
    passed_subjects = sum(1 for m in marks_rows if m['status'] == 'Pass')
    failed_subjects = total_subjects - passed_subjects

    conn.close()

    return jsonify({
        'selected_semester': selected_sem,
        'available_semesters': available_semesters,
        'marks': marks_rows,
        'sgpa': sgpa,
        'cgpa': cgpa,
        'total_credits': sem_creds,
        'total_subjects': total_subjects,
        'passed_subjects': passed_subjects,
        'failed_subjects': failed_subjects,
        'result_status': 'PASS' if failed_subjects == 0 else 'FAIL'
    })

@app.route('/api/academics/marks/<int:mark_id>', methods=['PUT'])
def update_marks(mark_id):
    data = request.get_json() or {}
    internal = int(data.get('internal_marks', 0))
    lab = int(data.get('lab_marks', 0))
    external = int(data.get('external_marks', 0))

    if internal < 0 or internal > 30 or lab < 0 or lab > 20 or external < 0 or external > 50:
        return jsonify({'error': 'Marks exceed permissible ranges.'}), 400

    total = internal + lab + external
    grade, status = calculate_grade_and_status(total, external)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE academic_marks
        SET internal_marks = ?, lab_marks = ?, external_marks = ?, total_marks = ?, grade = ?, status = ?
        WHERE id = ?
    """, (internal, lab, external, total, grade, status, mark_id))
    conn.commit()

    cursor.execute("SELECT * FROM academic_marks WHERE id = ?", (mark_id,))
    updated_mark = dict(cursor.fetchone())
    conn.close()

    return jsonify({
        'message': f'Marks updated for {updated_mark["course_code"]}. Total: {total}/100, Grade: {grade}, Status: {status}.',
        'mark': updated_mark
    })

# ==========================================================
# MODULE 2: SMART ATTENDANCE
# ==========================================================

@app.route('/api/attendance', methods=['GET'])
def get_attendance():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, course_code, course_title, faculty_name, attended_hours, total_hours, od_hours
        FROM attendance
        ORDER BY course_code ASC
    """)
    raw_rows = cursor.fetchall()

    attendance_list = []
    total_conducted = 0
    total_attended = 0
    total_od = 0
    total_absent = 0

    for r in raw_rows:
        item = dict(r)
        attended = item['attended_hours']
        total = item['total_hours']
        od = item['od_hours'] or 0
        absent = max(0, total - attended - od)
        pct = round(((attended + od) / total) * 100, 1) if total > 0 else 0.0

        if pct >= 75.0:
            status = 'Eligible'
            safe_bunks = max(0, int(((attended + od) / 0.75) - total))
            needed = 0
        else:
            status = 'Shortage'
            safe_bunks = 0
            needed = max(1, math.ceil((0.75 * total - (attended + od)) / 0.25))

        item['absent_hours'] = absent
        item['percentage'] = pct
        item['status'] = status
        item['safe_bunks'] = safe_bunks
        item['needed_to_reach_75'] = needed

        total_conducted += total
        total_attended += attended
        total_od += od
        total_absent += absent
        attendance_list.append(item)

    overall_pct = round(((total_attended + total_od) / total_conducted) * 100, 1) if total_conducted > 0 else 0.0
    conn.close()

    return jsonify({
        'overall_summary': {
            'total_conducted': total_conducted,
            'total_attended': total_attended,
            'total_absent': total_absent,
            'total_od': total_od,
            'overall_percentage': overall_pct,
            'overall_status': 'Eligible' if overall_pct >= 75.0 else 'Shortage Warning'
        },
        'attendance': attendance_list
    })

@app.route('/api/attendance/mark', methods=['POST'])
def mark_attendance():
    data = request.get_json() or {}
    course_code = data.get('course_code', '').strip().upper()
    action = data.get('action', 'present').strip().lower()
    date_str = data.get('date', 'Today')

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM attendance WHERE course_code = ?", (course_code,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'Course not found in attendance records.'}), 404

    attended = row['attended_hours']
    total = row['total_hours'] + 1
    od = row['od_hours'] or 0

    if action == 'present':
        attended += 1
    elif action == 'od':
        od += 1

    cursor.execute("""
        UPDATE attendance
        SET attended_hours = ?, total_hours = ?, od_hours = ?
        WHERE course_code = ?
    """, (attended, total, od, course_code))

    cursor.execute("""
        INSERT INTO attendance_logs (course_code, date, status, marked_by)
        VALUES (?, ?, ?, 'Faculty Portal')
    """, (course_code, date_str, action))

    conn.commit()
    conn.close()

    new_pct = round(((attended + od) / total) * 100, 1)
    return jsonify({
        'message': f'Attendance session logged as {action.upper()} for {course_code}. New rate: {new_pct}%.',
        'percentage': new_pct
    })

# ==========================================================
# MODULE 3: ATTENDANCE CALCULATOR
# ==========================================================

@app.route('/api/attendance/calculate', methods=['POST'])
def calculate_attendance():
    data = request.get_json() or {}
    try:
        total = int(data.get('total_hours') if data.get('total_hours') is not None else data.get('total_classes', 0))
        attended = int(data.get('attended_hours') if data.get('attended_hours') is not None else data.get('attended_classes', 0))
        od = int(data.get('od_hours') if data.get('od_hours') is not None else data.get('od_classes', 0))
    except (ValueError, TypeError):
        total, attended, od = 0, 0, 0

    target = float(data.get('target_percentage', 75.0))
    course_name = data.get('course_name', 'Selected Subject')

    if total < 0 or attended < 0 or od < 0:
        return jsonify({'error': 'Class hours cannot be negative.'}), 400
    if target <= 0 or target > 100:
        return jsonify({'error': 'Target percentage must be between 1 and 100.'}), 400

    effective_attended = attended + od
    if effective_attended > total:
        return jsonify({'error': f'Classes attended ({effective_attended}) cannot exceed total classes conducted ({total}).'}), 400

    if total == 0:
        return jsonify({
            'current_percentage': 0.0,
            'status': 'No Sessions',
            'max_bunks': 0,
            'needed_classes': 0,
            'projected_if_attend_one': 100.0,
            'projected_if_miss_one': 0.0,
            'message': 'No classes conducted yet. Start attending to establish your percentage.'
        })

    current_rate = round((effective_attended / total) * 100, 1)
    target_fraction = target / 100.0
    proj_if_attend_next = round(((effective_attended + 1) / (total + 1)) * 100, 1)
    proj_if_miss_next = round((effective_attended / (total + 1)) * 100, 1)

    if current_rate >= target:
        max_bunks = max(0, int((effective_attended / target_fraction) - total))
        proj_after_bunks = round((effective_attended / (total + max_bunks)) * 100, 1) if max_bunks > 0 else current_rate
        return jsonify({
            'course_name': course_name,
            'total_conducted': total,
            'classes_attended': effective_attended,
            'target_percentage': target,
            'current_percentage': current_rate,
            'status': 'Eligible',
            'max_bunks': max_bunks,
            'can_bunk': max_bunks,
            'needed_classes': 0,
            'projected_if_miss_one': proj_if_miss_next,
            'projected_if_attend_one': proj_if_attend_next,
            'projected_after_all_bunks': proj_after_bunks,
            'message': f'You are safely above {target}% ({current_rate}%). You can miss up to {max_bunks} consecutive classes.'
        })
    else:
        needed = max(1, math.ceil((target_fraction * total - effective_attended) / (1.0 - target_fraction)))
        proj_after_recovery = round(((effective_attended + needed) / (total + needed)) * 100, 1)
        return jsonify({
            'course_name': course_name,
            'total_conducted': total,
            'classes_attended': effective_attended,
            'target_percentage': target,
            'current_percentage': current_rate,
            'status': 'Shortage',
            'max_bunks': 0,
            'needed_classes': needed,
            'projected_if_miss_one': proj_if_miss_next,
            'projected_if_attend_one': proj_if_attend_next,
            'projected_after_recovery': proj_after_recovery,
            'message': f'Attendance shortage alert ({current_rate}% < {target}%). You must attend the next {needed} consecutive classes.'
        })

# ==========================================================
# MODULE 4: TIMETABLE MANAGEMENT (DAILY, WEEKLY, ADMIN CRUD)
# ==========================================================

@app.route('/api/timetable', methods=['GET'])
def get_timetable():
    view_type = request.args.get('view', 'daily')
    day = int(request.args.get('day', 1))

    conn = get_db()
    cursor = conn.cursor()

    if view_type == 'weekly':
        cursor.execute("SELECT * FROM timetable ORDER BY day_of_week ASC, start_time ASC")
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return jsonify({'view': 'weekly', 'schedule': rows})
    else:
        cursor.execute("SELECT * FROM timetable WHERE day_of_week = ? ORDER BY start_time ASC", (day,))
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return jsonify({'view': 'daily', 'day': day, 'schedule': rows})

@app.route('/api/timetable', methods=['POST'])
def add_timetable_entry():
    data = request.get_json() or {}
    day = int(data.get('day_of_week', 1))
    start_time = data.get('start_time', '').strip()
    end_time = data.get('end_time', '').strip()
    course_code = data.get('course_code', '').strip().upper()
    course_title = data.get('course_title', '').strip()
    room = data.get('room', '').strip()
    faculty_name = data.get('faculty_name', '').strip()

    if not start_time or not end_time or not course_code or not course_title or not room:
        return jsonify({'error': 'All timetable entry fields are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO timetable (day_of_week, start_time, end_time, course_code, course_title, room, faculty_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (day, start_time, end_time, course_code, course_title, room, faculty_name))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    return jsonify({'message': 'Timetable entry added successfully.', 'id': new_id}), 201

@app.route('/api/timetable/<int:entry_id>', methods=['PUT'])
def update_timetable_entry(entry_id):
    data = request.get_json() or {}
    day = int(data.get('day_of_week', 1))
    start_time = data.get('start_time', '').strip()
    end_time = data.get('end_time', '').strip()
    course_code = data.get('course_code', '').strip().upper()
    course_title = data.get('course_title', '').strip()
    room = data.get('room', '').strip()
    faculty_name = data.get('faculty_name', '').strip()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE timetable
        SET day_of_week = ?, start_time = ?, end_time = ?, course_code = ?, course_title = ?, room = ?, faculty_name = ?
        WHERE id = ?
    """, (day, start_time, end_time, course_code, course_title, room, faculty_name, entry_id))
    conn.commit()
    conn.close()

    return jsonify({'message': f'Timetable entry #{entry_id} updated successfully.'})

@app.route('/api/timetable/<int:entry_id>', methods=['DELETE'])
def delete_timetable_entry(entry_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM timetable WHERE id = ?", (entry_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': f'Timetable entry #{entry_id} removed.'})

# ==========================================================
# MODULE 5: ASSIGNMENT TRACKER (FACULTY CREATION, STUDENT UPLOAD, EVALUATION)
# ==========================================================

@app.route('/api/assignments', methods=['GET'])
def get_assignments():
    subject = request.args.get('subject', '').strip().upper()
    conn = get_db()
    cursor = conn.cursor()

    query = """
        SELECT a.id, a.course_code, a.course_title, a.title, a.description, a.deadline_date, a.max_marks, a.created_by,
               s.id as submission_id,
               COALESCE(s.status, 'Pending') as submission_status,
               s.file_name, s.submitted_at, s.scored_marks, s.feedback, s.evaluated_by
        FROM assignments a
        LEFT JOIN assignment_submissions s ON s.assignment_id = a.id
    """
    params = []
    if subject:
        query += " WHERE a.course_code = ?"
        params.append(subject)
    query += " ORDER BY a.deadline_date ASC"

    cursor.execute(query, params)
    rows = []
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")

    for r in cursor.fetchall():
        item = dict(r)
        # Mark Late if past deadline and not submitted
        if item['submission_status'] == 'Pending' and item['deadline_date'] < now_str:
            item['submission_status'] = 'Late'
        rows.append(item)

    conn.close()
    return jsonify({'assignments': rows})

@app.route('/api/assignments', methods=['POST'])
def create_assignment():
    data = request.get_json() or {}
    course_code = data.get('course_code', '').strip().upper()
    course_title = data.get('course_title', '').strip()
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    deadline = data.get('deadline_date', '').strip()
    max_marks = int(data.get('max_marks', 25))
    created_by = data.get('created_by', 'Course Faculty')

    if not course_code or not title or not deadline:
        return jsonify({'error': 'Course, title, and deadline are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO assignments (course_code, course_title, title, description, deadline_date, max_marks, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (course_code, course_title, title, description, deadline, max_marks, created_by))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    return jsonify({'message': f'Assignment "{title}" published.', 'id': new_id}), 201

@app.route('/api/assignments/<int:assignment_id>/upload', methods=['POST'])
def upload_assignment_submission(assignment_id):
    student_name = request.form.get('student_name', 'Alex Kumar')
    student_id = int(request.form.get('student_id', 1))

    file = request.files.get('file')
    filename = None
    filepath = None

    if file and file.filename:
        filename = secure_filename(file.filename)
        filepath = os.path.join(ASSIGNMENTS_UPLOAD_DIR, filename)
        file.save(filepath)
    else:
        filename = 'assignment_solution.pdf'

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT deadline_date FROM assignments WHERE id = ?", (assignment_id,))
    assig = cursor.fetchone()
    if not assig:
        conn.close()
        return jsonify({'error': 'Assignment not found.'}), 404

    status = 'Late' if now_str > assig['deadline_date'] else 'Submitted'

    cursor.execute("""
        INSERT INTO assignment_submissions (assignment_id, student_id, student_name, file_name, file_path, submitted_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (assignment_id, student_id, student_name, filename, filepath or filename, now_str, status))
    conn.commit()
    conn.close()

    return jsonify({'message': f'Assignment file "{filename}" submitted successfully. Status: {status}.'})

@app.route('/api/assignments/<int:assignment_id>/evaluate', methods=['POST'])
def evaluate_assignment(assignment_id):
    data = request.get_json() or {}
    scored_marks = int(data.get('scored_marks', 0))
    feedback = data.get('feedback', '').strip()
    evaluated_by = data.get('evaluated_by', 'Course Faculty')

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE assignment_submissions
        SET scored_marks = ?, feedback = ?, evaluated_by = ?
        WHERE assignment_id = ?
    """, (scored_marks, feedback, evaluated_by, assignment_id))
    conn.commit()
    conn.close()

    return jsonify({'message': f'Submission evaluated. Scored: {scored_marks} points.'})

# ==========================================================
# MODULE 6: NOTES AND STUDY MATERIALS (UPLOAD, DOWNLOAD, FILTERS)
# ==========================================================

@app.route('/api/notes', methods=['GET'])
def get_study_materials():
    subject = request.args.get('subject', '').strip().upper()
    category = request.args.get('category', '').strip()
    search = request.args.get('search', '').strip().lower()

    conn = get_db()
    cursor = conn.cursor()

    query = "SELECT * FROM study_materials WHERE 1=1"
    params = []

    if subject and subject != 'ALL':
        query += " AND course_code = ?"
        params.append(subject)

    if category and category != 'ALL':
        query += " AND category = ?"
        params.append(category)

    if search:
        query += " AND (LOWER(title) LIKE ? OR LOWER(course_title) LIKE ? OR LOWER(uploaded_by) LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])

    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    materials = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return jsonify({'materials': materials})

@app.route('/api/notes/upload', methods=['POST'])
def upload_study_material():
    course_code = request.form.get('course_code', '').strip().upper()
    course_title = request.form.get('course_title', '').strip()
    title = request.form.get('title', '').strip()
    category = request.form.get('category', 'Lecture Notes').strip()
    uploaded_by = request.form.get('uploaded_by', 'Faculty Member').strip()

    file = request.files.get('file')
    if not file or not file.filename:
        return jsonify({'error': 'Valid document file is required.'}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(NOTES_UPLOAD_DIR, filename)
    file.save(filepath)

    ext = os.path.splitext(filename)[1].replace('.', '').upper() or 'PDF'
    size_mb = f"{round(os.path.getsize(filepath) / (1024 * 1024), 2)} MB"
    upload_date = datetime.now().strftime("%Y-%m-%d")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO study_materials (course_code, course_title, title, category, file_format, file_name, file_size, uploaded_by, upload_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (course_code, course_title, title, category, ext, filename, size_mb, uploaded_by, upload_date))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    return jsonify({'message': f'Study material "{title}" uploaded.', 'id': new_id}), 201

@app.route('/api/notes/<int:note_id>/download', methods=['GET'])
def download_study_material(note_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM study_materials WHERE id = ?", (note_id,))
    note = cursor.fetchone()

    if not note:
        conn.close()
        return jsonify({'error': 'Study material not found.'}), 404

    cursor.execute("UPDATE study_materials SET downloads_count = downloads_count + 1 WHERE id = ?", (note_id,))
    conn.commit()
    conn.close()

    filename = note['file_name']
    target_path = os.path.join(NOTES_UPLOAD_DIR, filename)
    if not os.path.exists(target_path):
        # Create lightweight placeholder file if physical file missing
        with open(target_path, 'w', encoding='utf-8') as f:
            f.write(f"%PDF-1.4\nAcademic Material: {note['title']}\nCourse: {note['course_code']}\n")

    return send_from_directory(NOTES_UPLOAD_DIR, filename, as_attachment=True)

# ==========================================================
# MODULE 7: EXAMINATION MANAGEMENT (TIMETABLE, HALL TICKET, REVALUATION)
# ==========================================================

@app.route('/api/examinations', methods=['GET'])
def get_examinations():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM examinations ORDER BY exam_date ASC")
    exams = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM hall_ticket_status WHERE semester = 6 LIMIT 1")
    ht_row = cursor.fetchone()
    hall_ticket = dict(ht_row) if ht_row else {
        'is_published': 1,
        'published_date': '2026-11-01',
        'exam_cycle': 'November/December 2026 Regular SEE'
    }

    # Student exam registration details
    cursor.execute("SELECT * FROM student_profiles LIMIT 1")
    profile = dict(cursor.fetchone())

    registration_details = {
        'candidate_name': profile['name'],
        'usn': profile['usn'],
        'department': profile['department'],
        'semester': profile['semester'],
        'exam_center': 'Center 01: Main Science & Engg Complex',
        'seat_status': 'Verified & Allotted'
    }

    conn.close()
    return jsonify({
        'examinations': exams,
        'hall_ticket': hall_ticket,
        'registration': registration_details
    })

@app.route('/api/examinations/hall-ticket/publish', methods=['POST'])
def toggle_hall_ticket_publish():
    data = request.get_json() or {}
    publish_status = int(data.get('is_published', 1))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE hall_ticket_status
        SET is_published = ?, published_date = CURRENT_DATE
        WHERE semester = 6
    """, (publish_status,))
    conn.commit()
    conn.close()

    status_label = 'Published' if publish_status == 1 else 'Unpublished'
    return jsonify({'message': f'Hall ticket status updated to {status_label}.'})

@app.route('/api/examinations/revaluation', methods=['GET', 'POST'])
def handle_revaluation():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'POST':
        data = request.get_json() or {}
        student_name = data.get('student_name', 'Alex Kumar')
        usn = data.get('usn', '1MS21CS084')
        course_code = data.get('course_code', '').strip().upper()
        app_type = data.get('application_type', 'Re-evaluation')
        applied_date = datetime.now().strftime("%Y-%m-%d")

        cursor.execute("""
            INSERT INTO revaluations (student_name, usn, course_code, application_type, fee_status, status, remarks, applied_date)
            VALUES (?, ?, ?, ?, 'Paid', 'Under Review', 'Application lodged with Examination Board.', ?)
        """, (student_name, usn, course_code, app_type, applied_date))
        conn.commit()
        conn.close()
        return jsonify({'message': f'Revaluation request submitted for {course_code}. Tracking status: Under Review.'}), 201

    cursor.execute("SELECT * FROM revaluations ORDER BY id DESC")
    records = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'revaluations': records})

# ==========================================================
# MODULE 8: SGPA AND CGPA CALCULATOR & ACADEMIC HISTORY
# ==========================================================

GRADE_POINT_MAP = {
    'O': 10.0,
    'A+': 9.0,
    'A': 8.0,
    'B+': 7.0,
    'B': 6.0,
    'C': 5.0,
    'P': 4.0,
    'F': 0.0
}

@app.route('/api/gpa/calculate-sgpa', methods=['POST'])
def api_calculate_sgpa():
    data = request.get_json() or {}
    courses = data.get('courses') or data.get('subjects') or []
    if not courses:
        return jsonify({'error': 'Please provide at least one course with credits and grade point.'}), 400

    processed_courses = []
    total_credits = 0.0
    total_credit_points = 0.0

    for i, c in enumerate(courses, start=1):
        name = str(c.get('name') or c.get('subject_name') or f'Subject {i}').strip()
        try:
            credits = float(c.get('credits', 0))
        except (ValueError, TypeError):
            return jsonify({'error': f'Invalid credits for course "{name}". Must be a numeric value.'}), 400

        if credits <= 0 or credits > 10:
            return jsonify({'error': f'Course "{name}" credits must be between 1 and 10.'}), 400

        raw_gp = c.get('grade_point')
        if raw_gp is not None and str(raw_gp).strip() != '':
            try:
                gp = float(raw_gp)
            except (ValueError, TypeError):
                return jsonify({'error': f'Invalid grade point for course "{name}". Must be between 0.0 and 10.0.'}), 400
        else:
            letter = str(c.get('grade', 'A')).strip().upper()
            gp = GRADE_POINT_MAP.get(letter, 8.0)

        if gp < 0.0 or gp > 10.0:
            return jsonify({'error': f'Grade point for "{name}" must be between 0.0 and 10.0.'}), 400

        credit_points = round(credits * gp, 2)
        total_credits += credits
        total_credit_points += credit_points

        letter_match = 'Custom'
        for k, v in GRADE_POINT_MAP.items():
            if abs(v - gp) < 0.01:
                letter_match = k
                break

        processed_courses.append({
            'subject_name': name,
            'credits': credits,
            'grade_point': gp,
            'letter_grade': letter_match,
            'credit_points': credit_points
        })

    if total_credits <= 0:
        return jsonify({'error': 'Total credits across courses must be greater than zero.'}), 400

    sgpa = round(total_credit_points / total_credits, 2)

    return jsonify({
        'sgpa': sgpa,
        'total_credits': total_credits,
        'total_credit_points': round(total_credit_points, 2),
        'courses': processed_courses,
        'formula': f"SGPA = Sum of (Credit × Grade Point) / Total Credits = {total_credit_points:.2f} / {total_credits:.1f} = {sgpa:.2f}"
    })

@app.route('/api/gpa/calculate-cgpa', methods=['POST'])
def api_calculate_cgpa():
    data = request.get_json() or {}
    semesters = data.get('semesters', [])
    if not semesters:
        return jsonify({'error': 'Please provide at least one semester record to compute CGPA.'}), 400

    processed_sems = []
    total_credits_across_semesters = 0.0
    sum_credit_x_sgpa = 0.0

    for s in semesters:
        sem_num = s.get('semester', len(processed_sems) + 1)
        try:
            credits = float(s.get('credits', s.get('total_credits', 0)))
            sgpa = float(s.get('sgpa', 0))
        except (ValueError, TypeError):
            return jsonify({'error': f'Invalid numeric values in Semester {sem_num}.'}), 400

        if credits <= 0:
            return jsonify({'error': f'Semester {sem_num} credits must be greater than zero.'}), 400
        if sgpa < 0.0 or sgpa > 10.0:
            return jsonify({'error': f'Semester {sem_num} SGPA must be between 0.0 and 10.0.'}), 400

        credit_pts = round(credits * sgpa, 2)
        total_credits_across_semesters += credits
        sum_credit_x_sgpa += credit_pts

        processed_sems.append({
            'semester': sem_num,
            'total_credits': credits,
            'sgpa': sgpa,
            'semester_grade_points': credit_pts
        })

    if total_credits_across_semesters <= 0:
        return jsonify({'error': 'Total credits across all semesters must be greater than zero.'}), 400

    cgpa = round(sum_credit_x_sgpa / total_credits_across_semesters, 2)

    return jsonify({
        'cgpa': cgpa,
        'total_credits_across_semesters': total_credits_across_semesters,
        'total_credit_points': round(sum_credit_x_sgpa, 2),
        'semesters': processed_sems,
        'formula': f"CGPA = Sum of (Semester Credit × Semester Grade Points) / Total Credits Across Semesters = {sum_credit_x_sgpa:.2f} / {total_credits_across_semesters:.1f} = {cgpa:.2f}"
    })

@app.route('/api/gpa/history', methods=['GET'])
def get_gpa_history():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, semester, total_credits, total_credit_points, sgpa, subjects_json, created_at
        FROM semester_gpa_history
        WHERE student_id = 1
        ORDER BY semester ASC
    """)
    rows = cursor.fetchall()

    history = []
    cumulative_points = 0.0
    cumulative_credits = 0.0

    for r in rows:
        item = dict(r)
        try:
            item['subjects'] = json.loads(item['subjects_json'])
        except Exception:
            item['subjects'] = []

        cumulative_points += item['total_credit_points']
        cumulative_credits += item['total_credits']
        running_cgpa = round(cumulative_points / cumulative_credits, 2) if cumulative_credits > 0 else 0.0
        item['cumulative_cgpa'] = running_cgpa
        history.append(item)

    overall_cgpa = round(cumulative_points / cumulative_credits, 2) if cumulative_credits > 0 else 0.0

    conn.close()
    return jsonify({
        'history': history,
        'overall_cgpa': overall_cgpa,
        'total_credits_earned': cumulative_credits,
        'total_credit_points': round(cumulative_points, 2),
        'total_semesters': len(history)
    })

@app.route('/api/gpa/save-semester', methods=['POST'])
def save_gpa_semester():
    data = request.get_json() or {}
    semester = int(data.get('semester', 6))
    courses = data.get('courses', [])

    if not courses:
        return jsonify({'error': 'Cannot save empty semester. Please provide courses.'}), 400

    total_credits = 0.0
    total_credit_points = 0.0
    clean_courses = []

    for c in courses:
        name = str(c.get('name') or c.get('subject_name') or 'Subject').strip()
        try:
            credits = float(c.get('credits', 4))
        except Exception:
            credits = 4.0
        if credits <= 0:
            credits = 1.0

        raw_gp = c.get('grade_point')
        if raw_gp is not None and str(raw_gp).strip() != '':
            try:
                gp = float(raw_gp)
            except Exception:
                gp = 8.0
        else:
            gp = GRADE_POINT_MAP.get(str(c.get('grade', 'A')).strip().upper(), 8.0)

        cp = round(credits * gp, 2)
        total_credits += credits
        total_credit_points += cp

        letter_match = 'Custom'
        for k, v in GRADE_POINT_MAP.items():
            if abs(v - gp) < 0.01:
                letter_match = k
                break

        clean_courses.append({
            'subject_name': name,
            'credits': credits,
            'grade_point': gp,
            'letter_grade': letter_match,
            'credit_points': cp
        })

    sgpa = round(total_credit_points / total_credits, 2) if total_credits > 0 else 0.0
    subjects_json = json.dumps(clean_courses)

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM semester_gpa_history WHERE student_id = 1 AND semester = ?", (semester,))
    existing = cursor.fetchone()

    if existing:
        cursor.execute("""
            UPDATE semester_gpa_history
            SET total_credits = ?, total_credit_points = ?, sgpa = ?, subjects_json = ?, created_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (total_credits, total_credit_points, sgpa, subjects_json, existing['id']))
    else:
        cursor.execute("""
            INSERT INTO semester_gpa_history (student_id, semester, total_credits, total_credit_points, sgpa, subjects_json)
            VALUES (1, ?, ?, ?, ?, ?)
        """, (semester, total_credits, total_credit_points, sgpa, subjects_json))

    # Recalculate student overall CGPA
    cursor.execute("SELECT SUM(total_credits) as cum_credits, SUM(total_credit_points) as cum_points FROM semester_gpa_history WHERE student_id = 1")
    agg = cursor.fetchone()
    cum_cgpa = 0.0
    if agg and agg['cum_credits'] and agg['cum_credits'] > 0:
        cum_cgpa = round(agg['cum_points'] / agg['cum_credits'], 2)
        cursor.execute("UPDATE student_profiles SET cgpa = ?, credits_earned = ? WHERE id = 1", (cum_cgpa, int(agg['cum_credits'])))

    conn.commit()
    conn.close()

    return jsonify({
        'message': f'Semester {semester} academic record saved successfully. Calculated SGPA: {sgpa}, Updated Overall CGPA: {cum_cgpa}.',
        'sgpa': sgpa,
        'cumulative_cgpa': cum_cgpa,
        'semester': semester
    }), 201

@app.route('/api/gpa/history/<int:record_id>', methods=['DELETE'])
def delete_gpa_record(record_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM semester_gpa_history WHERE id = ? AND student_id = 1", (record_id,))

    cursor.execute("SELECT SUM(total_credits) as cum_credits, SUM(total_credit_points) as cum_points FROM semester_gpa_history WHERE student_id = 1")
    agg = cursor.fetchone()
    cum_cgpa = 0.0
    if agg and agg['cum_credits'] and agg['cum_credits'] > 0:
        cum_cgpa = round(agg['cum_points'] / agg['cum_credits'], 2)
        cursor.execute("UPDATE student_profiles SET cgpa = ?, credits_earned = ? WHERE id = 1", (cum_cgpa, int(agg['cum_credits'])))
    else:
        cursor.execute("UPDATE student_profiles SET cgpa = 0.0 WHERE id = 1")

    conn.commit()
    conn.close()
    return jsonify({'message': f'Semester record #{record_id} deleted from academic history.'})

# ==========================================================
# MODULE 9: STUDENT PROFILE AND DIGITAL ID
# ==========================================================

@app.route('/api/profile', methods=['GET', 'PUT'])
def handle_profile():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'PUT':
        data = request.get_json() or {}
        phone = data.get('phone', '').strip()
        email = data.get('email', '').strip()
        emergency_contact = data.get('emergency_contact', '').strip()
        blood_group = data.get('blood_group', '').strip()
        address = data.get('address', '').strip()
        photo_url = data.get('photo_url', '').strip()

        if email and '@' not in email:
            return jsonify({'error': 'Please provide a valid email address.'}), 400

        admin_department = data.get('department')
        admin_semester = data.get('semester')
        admin_section = data.get('section')
        admin_college = data.get('college_name')

        query = """
            UPDATE student_profiles
            SET phone = COALESCE(NULLIF(?, ''), phone),
                email = COALESCE(NULLIF(?, ''), email),
                emergency_contact = COALESCE(NULLIF(?, ''), emergency_contact),
                blood_group = COALESCE(NULLIF(?, ''), blood_group),
                address = COALESCE(NULLIF(?, ''), address),
                photo_url = COALESCE(NULLIF(?, ''), photo_url)
        """
        params = [phone, email, emergency_contact, blood_group, address, photo_url]

        if admin_department:
            query += ", department = ?"
            params.append(admin_department)
        if admin_semester:
            query += ", semester = ?"
            params.append(int(admin_semester))
        if admin_section:
            query += ", section = ?"
            params.append(admin_section)
        if admin_college:
            query += ", college_name = ?"
            params.append(admin_college)

        query += " WHERE id = 1"
        cursor.execute(query, params)
        conn.commit()

    cursor.execute("SELECT * FROM student_profiles WHERE id = 1")
    row = cursor.fetchone()
    if not row:
        cursor.execute("SELECT * FROM student_profiles LIMIT 1")
        row = cursor.fetchone()

    profile = dict(row) if row else {}
    conn.close()
    return jsonify({'profile': profile})

@app.route('/api/profile/photo', methods=['POST'])
def upload_profile_photo():
    file = request.files.get('photo')
    if not file or not file.filename:
        return jsonify({'error': 'No file uploaded.'}), 400

    filename = secure_filename(file.filename)
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png', '.webp', '.svg']:
        return jsonify({'error': 'Invalid image format. Allowed formats: PNG, JPG, JPEG, WEBP, SVG.'}), 400

    saved_filename = f"student_1_{int(datetime.now().timestamp())}{ext}"
    filepath = os.path.join(PROFILES_UPLOAD_DIR, saved_filename)
    file.save(filepath)

    photo_url = f"/uploads/profiles/{saved_filename}"

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE student_profiles SET photo_url = ? WHERE id = 1", (photo_url,))
    conn.commit()
    conn.close()

    return jsonify({'message': 'Profile photograph updated successfully.', 'photo_url': photo_url})

@app.route('/api/profile/digital-id', methods=['GET'])
def get_digital_id():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM student_profiles WHERE id = 1")
    row = cursor.fetchone()
    if not row:
        cursor.execute("SELECT * FROM student_profiles LIMIT 1")
        row = cursor.fetchone()

    profile = dict(row) if row else {}
    conn.close()

    college = profile.get('college_name', 'Apex Institute of Engineering & Technology')
    usn = profile.get('usn', '1MS21CS084')
    name = profile.get('name', 'Alex Kumar')
    dept = profile.get('department', 'Computer Science & Engineering')
    sem = profile.get('semester', 6)
    sec = profile.get('section', 'A')
    degree = profile.get('degree', 'Bachelor of Engineering (B.E.)')
    blood = profile.get('blood_group', 'O+')
    em_contact = profile.get('emergency_contact', '+91 98765 43210')
    valid_thru = profile.get('valid_thru', 'June 2027')
    status = profile.get('academic_status', 'Good Standing / Regular')

    # Construct strictly permitted student verification payload (CRITICAL: Zero sensitive passwords or keys)
    qr_text = (
        f"INSTITUTION: {college}\n"
        f"OFFICIAL DIGITAL STUDENT CREDENTIAL\n"
        f"USN: {usn}\n"
        f"NAME: {name}\n"
        f"DEGREE: {degree}\n"
        f"DEPARTMENT: {dept}\n"
        f"SEMESTER: {sem} (Section {sec})\n"
        f"BLOOD GROUP: {blood}\n"
        f"EMERGENCY CONTACT: {em_contact}\n"
        f"VALID THRU: {valid_thru}\n"
        f"STATUS: {status}\n"
        f"SECURITY NOTICE: Public credential verification. No sensitive credentials exposed."
    )

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=6,
        border=2
    )
    qr.add_data(qr_text)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0f172a", back_color="#ffffff")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_base64 = f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"

    return jsonify({
        'digital_id': {
            'college_name': college,
            'usn': usn,
            'name': name,
            'department': dept,
            'semester': sem,
            'section': sec,
            'degree': degree,
            'blood_group': blood,
            'emergency_contact': em_contact,
            'valid_thru': valid_thru,
            'academic_status': status,
            'photo_url': profile.get('photo_url', '/uploads/profiles/default_student.png'),
            'email': profile.get('email', 'student@college.edu'),
            'phone': profile.get('phone', '+91 98765 43210'),
            'address': profile.get('address', 'Campus Hostel, Tech Road'),
            'admission_year': profile.get('admission_year', 2021),
            'credits_earned': profile.get('credits_earned', 128),
            'cgpa': profile.get('cgpa', 9.19)
        },
        'qr_code_image': qr_base64,
        'qr_payload_text': qr_text,
        'generated_at': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })

@app.route('/api/profile/verify/<string:usn>', methods=['GET'])
def verify_student_credential(usn):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM student_profiles WHERE usn = ?", (usn.strip().upper(),))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return jsonify({
            'verified': False,
            'error': f'No verified student profile matches USN "{usn}".'
        }), 404

    profile = dict(row)
    return jsonify({
        'verified': True,
        'verification_source': 'Apex Institute Official Registrar Registry',
        'student': {
            'usn': profile['usn'],
            'name': profile['name'],
            'department': profile['department'],
            'college_name': profile.get('college_name', 'Apex Institute of Engineering & Technology'),
            'degree': profile.get('degree', 'Bachelor of Engineering (B.E.)'),
            'semester': profile['semester'],
            'section': profile['section'],
            'blood_group': profile.get('blood_group', 'O+'),
            'academic_status': profile.get('academic_status', 'Good Standing / Regular'),
            'valid_thru': profile.get('valid_thru', 'June 2027'),
            'photo_url': profile.get('photo_url', '/uploads/profiles/default_student.png')
        },
        'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })

# ==========================================================
# MODULE 10: PLACEMENT AND CAREER
# ==========================================================

@app.route('/api/placements/drives', methods=['GET', 'POST'])
def handle_placement_drives():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'POST':
        data = request.get_json() or {}
        company = data.get('company_name', '').strip()
        title = data.get('job_title', '').strip()
        job_type = data.get('job_type', 'Full-time').strip()
        ctc = data.get('ctc_or_stipend', '').strip()
        location = data.get('location', '').strip()
        desc = data.get('description', '').strip()
        min_cgpa = float(data.get('min_cgpa', 7.0))
        branches = data.get('eligible_branches', 'All Branches').strip()
        skills = data.get('required_skills', '').strip()
        deadline = data.get('deadline_date', '').strip()
        drive_date = data.get('drive_date', '').strip()

        if not company or not title or not ctc:
            return jsonify({'error': 'Company name, job title, and CTC/stipend are required.'}), 400

        cursor.execute("""
            INSERT INTO placement_drives (company_name, job_title, job_type, ctc_or_stipend, location, description, min_cgpa, eligible_branches, required_skills, deadline_date, drive_date, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open')
        """, (company, title, job_type, ctc, location, desc, min_cgpa, branches, skills, deadline, drive_date))
        conn.commit()
        drive_id = cursor.lastrowid
        conn.close()
        return jsonify({'message': f'Placement drive for {company} published.', 'id': drive_id}), 201

    drive_type = request.args.get('type', 'all').lower()
    search = request.args.get('search', '').strip().lower()

    query = "SELECT * FROM placement_drives WHERE 1=1"
    params = []
    if drive_type == 'fulltime':
        query += " AND LOWER(job_type) = 'full-time'"
    elif drive_type == 'internship':
        query += " AND LOWER(job_type) = 'internship'"

    if search:
        query += " AND (LOWER(company_name) LIKE ? OR LOWER(job_title) LIKE ? OR LOWER(required_skills) LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])

    query += " ORDER BY deadline_date ASC"
    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT drive_id, status, applied_date FROM placement_applications WHERE student_id = 1")
    app_map = {r['drive_id']: dict(r) for r in cursor.fetchall()}

    for row in rows:
        app_info = app_map.get(row['id'])
        row['has_applied'] = bool(app_info)
        row['application_status'] = app_info['status'] if app_info else 'Not Applied'
        row['applied_date'] = app_info['applied_date'] if app_info else None

    conn.close()
    return jsonify({'drives': rows})

@app.route('/api/placements/apply', methods=['POST'])
def apply_placement_drive():
    data = request.get_json() or {}
    drive_id = data.get('drive_id')
    resume_name = data.get('resume_name', 'alex_kumar_resume.pdf')
    resume_path = data.get('resume_path', 'resumes/alex_kumar_resume.pdf')

    if not drive_id:
        return jsonify({'error': 'Drive ID is required.'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM placement_drives WHERE id = ?", (drive_id,))
    drive = cursor.fetchone()
    if not drive:
        conn.close()
        return jsonify({'error': 'Placement drive not found.'}), 404

    cursor.execute("SELECT * FROM student_profiles WHERE id = 1")
    prof = cursor.fetchone()
    student_cgpa = prof['cgpa'] if prof else 9.36
    student_name = prof['name'] if prof else 'Alex Kumar'
    student_usn = prof['usn'] if prof else '1MS21CS084'

    cursor.execute("SELECT id FROM placement_applications WHERE drive_id = ? AND student_id = 1", (drive_id,))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'You have already submitted an application for this drive.'}), 400

    applied_date = datetime.now().strftime("%Y-%m-%d %H:%M")
    cursor.execute("""
        INSERT INTO placement_applications (drive_id, student_id, student_name, usn, cgpa, resume_name, resume_path, status, applied_date, remarks)
        VALUES (?, 1, ?, ?, ?, ?, ?, 'Applied', ?, 'Application received and logged in placement portal.')
    """, (drive_id, student_name, student_usn, student_cgpa, resume_name, resume_path, applied_date))
    conn.commit()
    conn.close()

    return jsonify({'message': f'Application successfully submitted for {drive["company_name"]} - {drive["job_title"]}.', 'status': 'Applied'}), 201

@app.route('/api/placements/applications', methods=['GET'])
def get_placement_applications():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT a.id, a.drive_id, a.student_name, a.usn, a.cgpa, a.resume_name, a.status, a.applied_date, a.remarks,
               d.company_name, d.job_title, d.job_type, d.ctc_or_stipend, d.location, d.drive_date
        FROM placement_applications a
        JOIN placement_drives d ON d.id = a.drive_id
        ORDER BY a.id DESC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'applications': rows})

@app.route('/api/placements/applications/<int:app_id>/status', methods=['PUT'])
def update_application_status(app_id):
    data = request.get_json() or {}
    new_status = data.get('status', 'Applied').strip()
    remarks = data.get('remarks', '').strip()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE placement_applications
        SET status = ?, remarks = ?
        WHERE id = ?
    """, (new_status, remarks, app_id))
    conn.commit()
    conn.close()
    return jsonify({'message': f'Application #{app_id} status updated to {new_status}.'})

@app.route('/api/placements/resumes', methods=['GET'])
def get_student_resumes():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM student_resumes WHERE student_id = 1 ORDER BY id DESC")
    resumes = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'resumes': resumes})

@app.route('/api/placements/resumes/upload', methods=['POST'])
def upload_student_resume():
    file = request.files.get('resume')
    title = request.form.get('title', 'Academic Resume')
    if not file or not file.filename:
        return jsonify({'error': 'No resume file selected.'}), 400

    filename = secure_filename(file.filename)
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ['.pdf', '.docx', '.doc']:
        return jsonify({'error': 'Allowed resume formats: PDF, DOCX, DOC.'}), 400

    saved_filename = f"resume_1_{int(datetime.now().timestamp())}_{filename}"
    file_path = os.path.join(RESUMES_UPLOAD_DIR, saved_filename)
    file.save(file_path)

    relative_path = f"resumes/{saved_filename}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO student_resumes (student_id, title, file_name, file_path, uploaded_at)
        VALUES (1, ?, ?, ?, ?)
    """, (title, filename, relative_path, now_str))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    return jsonify({'message': 'Resume uploaded successfully.', 'id': new_id, 'file_name': filename, 'file_path': relative_path}), 201

@app.route('/api/placements/resumes/<int:resume_id>/download', methods=['GET'])
def download_resume(resume_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM student_resumes WHERE id = ?", (resume_id,))
    res = cursor.fetchone()
    conn.close()

    if not res:
        return jsonify({'error': 'Resume not found.'}), 404

    filename = os.path.basename(res['file_path'])
    return send_from_directory(RESUMES_UPLOAD_DIR, filename, as_attachment=True)

@app.route('/api/placements/resume-builder', methods=['GET', 'POST'])
def handle_resume_builder():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'POST':
        data = request.get_json() or {}
        full_name = data.get('full_name', 'Alex Kumar')
        email = data.get('email', 'student@college.edu')
        phone = data.get('phone', '+91 98765 43210')
        headline = data.get('headline', '')
        summary = data.get('summary', '')
        education = json.dumps(data.get('education', []))
        skills = json.dumps(data.get('skills', []))
        projects = json.dumps(data.get('projects', []))
        certifications = json.dumps(data.get('certifications', []))

        cursor.execute("SELECT id FROM resume_builder_data WHERE student_id = 1")
        existing = cursor.fetchone()
        if existing:
            cursor.execute("""
                UPDATE resume_builder_data
                SET full_name = ?, email = ?, phone = ?, headline = ?, summary = ?,
                    education_json = ?, skills_json = ?, projects_json = ?, certifications_json = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (full_name, email, phone, headline, summary, education, skills, projects, certifications, existing['id']))
        else:
            cursor.execute("""
                INSERT INTO resume_builder_data (student_id, full_name, email, phone, headline, summary, education_json, skills_json, projects_json, certifications_json)
                VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (full_name, email, phone, headline, summary, education, skills, projects, certifications))

        conn.commit()
        conn.close()
        return jsonify({'message': 'Resume builder profile updated successfully.'})

    cursor.execute("SELECT * FROM resume_builder_data WHERE student_id = 1")
    row = cursor.fetchone()
    conn.close()

    if row:
        builder_data = {
            'full_name': row['full_name'],
            'email': row['email'],
            'phone': row['phone'],
            'headline': row['headline'],
            'summary': row['summary'],
            'education': json.loads(row['education_json'] or '[]'),
            'skills': json.loads(row['skills_json'] or '[]'),
            'projects': json.loads(row['projects_json'] or '[]'),
            'certifications': json.loads(row['certifications_json'] or '[]'),
            'updated_at': row['updated_at']
        }
    else:
        builder_data = {
            'full_name': 'Alex Kumar',
            'email': 'student@college.edu',
            'phone': '+91 98765 43210',
            'headline': 'Software Engineer | Systems & Distributed Computing',
            'summary': 'Final-year Computer Science undergraduate with 9.36 CGPA and hands-on experience in building scalable microservices and distributed consensus systems.',
            'education': [
                {'degree': 'B.E. Computer Science & Engineering', 'institution': 'Apex Institute of Engineering & Technology', 'year': '2021 - 2025', 'score': '9.36 CGPA'}
            ],
            'skills': ['C++', 'Python', 'Go', 'Docker', 'Kubernetes', 'PostgreSQL', 'React.js'],
            'projects': [
                {'title': 'Autonomous Drone Telemetry Mesh', 'tech': 'Go, gRPC', 'description': 'Low-latency telemetry streaming passing failover under 15ms.'}
            ],
            'certifications': ['AWS Certified Cloud Practitioner']
        }

    return jsonify({'resume_data': builder_data})

@app.route('/api/placements/interview-prep', methods=['GET'])
def get_interview_prep():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM interview_resources ORDER BY id ASC")
    resources = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM mock_questions ORDER BY id ASC")
    questions = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return jsonify({
        'resources': resources,
        'mock_questions': questions
    })

# ==========================================================
# MODULE 11: PROJECTS HUB
# ==========================================================

@app.route('/api/projects', methods=['GET', 'POST'])
def handle_projects():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        title = (request.form.get('title') or data.get('title', '')).strip()
        desc = (request.form.get('description') or data.get('description', '')).strip()
        category = (request.form.get('category') or data.get('category', 'Capstone Project')).strip()
        tech = (request.form.get('technologies') or data.get('technologies', '')).strip()
        github = (request.form.get('github_url') or data.get('github_url', '')).strip()
        demo = (request.form.get('demo_url') or data.get('demo_url', '')).strip()
        team_status = (request.form.get('team_status') or data.get('team_status', 'Looking for Teammates')).strip()
        open_roles = (request.form.get('open_roles') or data.get('open_roles', '')).strip()
        guide = (request.form.get('guide_name') or data.get('guide_name', 'Dr. Ramesh Rao')).strip()

        doc_file = request.files.get('document_file')
        doc_path = ""
        if doc_file and doc_file.filename:
            saved_doc = f"doc_{int(datetime.now().timestamp())}_{secure_filename(doc_file.filename)}"
            doc_file.save(os.path.join(PROJECTS_UPLOAD_DIR, saved_doc))
            doc_path = f"projects/{saved_doc}"

        if not title or not desc or not tech:
            conn.close()
            return jsonify({'error': 'Project title, description, and technologies are required.'}), 400

        cursor.execute("SELECT name, usn FROM student_profiles WHERE id = 1")
        prof = cursor.fetchone()
        student_name = prof['name'] if prof else 'Alex Kumar'
        usn = prof['usn'] if prof else '1MS21CS084'

        cursor.execute("""
            INSERT INTO projects (student_id, student_name, usn, title, category, description, technologies, github_url, demo_url, document_file, image_file, team_status, open_roles, guide_name, guide_status)
            VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, 'Approved')
        """, (student_name, usn, title, category, desc, tech, github, demo, doc_path, team_status, open_roles, guide))
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()

        return jsonify({'message': f'Project "{title}" showcased successfully.', 'id': new_id}), 201

    search = request.args.get('search', '').strip().lower()
    cat = request.args.get('category', 'ALL')
    team = request.args.get('team_status', 'ALL')

    query = """
        SELECT p.*,
               (SELECT COUNT(*) FROM project_feedback f WHERE f.project_id = p.id) as feedback_count,
               (SELECT AVG(f.score) FROM project_feedback f WHERE f.project_id = p.id) as avg_score
        FROM projects p
        WHERE 1=1
    """
    params = []

    if search:
        query += " AND (LOWER(p.title) LIKE ? OR LOWER(p.technologies) LIKE ? OR LOWER(p.description) LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])

    if cat != 'ALL':
        query += " AND p.category = ?"
        params.append(cat)

    if team != 'ALL':
        query += " AND p.team_status = ?"
        params.append(team)

    query += " ORDER BY p.id DESC"
    cursor.execute(query, params)
    projects = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return jsonify({'projects': projects})

@app.route('/api/projects/<int:project_id>', methods=['GET'])
def get_project_details(project_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
    p_row = cursor.fetchone()
    if not p_row:
        conn.close()
        return jsonify({'error': 'Project not found.'}), 404

    project = dict(p_row)

    cursor.execute("SELECT * FROM project_feedback WHERE project_id = ? ORDER BY id DESC", (project_id,))
    project['feedback'] = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM project_teammate_requests WHERE project_id = ? ORDER BY id DESC", (project_id,))
    project['teammate_requests'] = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return jsonify({'project': project})

@app.route('/api/projects/<int:project_id>/teammate-request', methods=['POST'])
def apply_project_teammate(project_id):
    data = request.get_json() or {}
    role = data.get('role_applied', 'Collaborator').strip()
    msg = data.get('message', '').strip()
    req_name = data.get('requester_name', 'Rahul Sharma').strip()
    req_usn = data.get('requester_usn', '1MS21CS092').strip()

    if not msg:
        return jsonify({'error': 'Please provide a brief message on how you can contribute.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO project_teammate_requests (project_id, requester_id, requester_name, requester_usn, role_applied, message, status)
        VALUES (?, 1, ?, ?, ?, ?, 'Pending')
    """, (project_id, req_name, req_usn, role, msg))
    conn.commit()
    conn.close()

    return jsonify({'message': f'Teammate request submitted for {role}. Project owner notified.'}), 201

@app.route('/api/projects/teammate-requests/<int:req_id>', methods=['PUT'])
def update_teammate_request(req_id):
    data = request.get_json() or {}
    status = data.get('status', 'Accepted').strip()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE project_teammate_requests SET status = ? WHERE id = ?", (status, req_id))
    conn.commit()
    conn.close()

    return jsonify({'message': f'Teammate collaboration request marked as {status}.'})

@app.route('/api/projects/<int:project_id>/feedback', methods=['POST'])
def add_project_feedback(project_id):
    data = request.get_json() or {}
    faculty = (data.get('faculty_name') or data.get('guide_name') or 'Dr. Ramesh Rao').strip()
    score = int(data.get('score', 45))
    max_score = int(data.get('max_score', 50))
    comments = (data.get('comments') or data.get('feedback') or '').strip()

    if not comments:
        return jsonify({'error': 'Evaluation comments are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO project_feedback (project_id, faculty_name, score, max_score, comments)
        VALUES (?, ?, ?, ?, ?)
    """, (project_id, faculty, score, max_score, comments))
    conn.commit()
    conn.close()

    return jsonify({'message': 'Faculty evaluation and score saved successfully.'}), 201

@app.route('/api/projects/<int:project_id>/document/download', methods=['GET'])
def download_project_document(project_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT document_file, title FROM projects WHERE id = ?", (project_id,))
    row = cursor.fetchone()
    conn.close()

    if not row or not row['document_file']:
        return jsonify({'error': 'No document attached to this project.'}), 404

    filename = os.path.basename(row['document_file'])
    return send_from_directory(PROJECTS_UPLOAD_DIR, filename, as_attachment=True)

# ==========================================================
# MODULE 12: EVENTS AND CLUBS
# ==========================================================

@app.route('/api/events', methods=['GET', 'POST'])
def handle_events():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'POST':
        data = request.get_json() or {}
        title = data.get('title', '').strip()
        cat = data.get('category', 'Workshop').strip()
        club = data.get('club_name', '').strip()
        event_date = data.get('event_date', '').strip()
        event_time = data.get('event_time', '10:00 AM').strip()
        venue = data.get('venue', '').strip()
        desc = data.get('description', '').strip()
        deadline = data.get('registration_deadline', '').strip()
        seats_total = int(data.get('seats_total', 100))

        if not title or not club or not event_date or not venue:
            conn.close()
            return jsonify({'error': 'Title, club name, event date, and venue are required.'}), 400

        cursor.execute("""
            INSERT INTO events (title, category, club_name, event_date, event_time, venue, description, registration_deadline, seats_total, seats_booked, status, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'Upcoming', 'Admin')
        """, (title, cat, club, event_date, event_time, venue, desc, deadline, seats_total))
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        return jsonify({'message': f'Event "{title}" created successfully.', 'id': new_id}), 201

    cat = request.args.get('category', 'ALL')
    search = request.args.get('search', '').strip().lower()

    query = "SELECT * FROM events WHERE 1=1"
    params = []

    if cat != 'ALL':
        query += " AND category = ?"
        params.append(cat)

    if search:
        query += " AND (LOWER(title) LIKE ? OR LOWER(club_name) LIKE ? OR LOWER(description) LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])

    query += " ORDER BY event_date ASC"
    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT id as reg_id, event_id, attendance_status, certificate_issued, certificate_file, certificate_title FROM event_registrations WHERE student_id = 1")
    reg_map = {r['event_id']: dict(r) for r in cursor.fetchall()}

    for row in rows:
        reg = reg_map.get(row['id'])
        row['is_registered'] = bool(reg)
        row['registration_id'] = reg['reg_id'] if reg else None
        row['attendance_status'] = reg['attendance_status'] if reg else 'Not Registered'
        row['certificate_issued'] = reg['certificate_issued'] if reg else 0
        row['certificate_title'] = reg['certificate_title'] if reg else ''

    conn.close()
    return jsonify({'events': rows})

@app.route('/api/events/<int:event_id>', methods=['PUT', 'DELETE'])
def manage_event(event_id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'DELETE':
        cursor.execute("DELETE FROM events WHERE id = ?", (event_id,))
        conn.commit()
        conn.close()
        return jsonify({'message': f'Event #{event_id} deleted.'})

    data = request.get_json() or {}
    cursor.execute("""
        UPDATE events
        SET title = COALESCE(NULLIF(?, ''), title),
            category = COALESCE(NULLIF(?, ''), category),
            club_name = COALESCE(NULLIF(?, ''), club_name),
            event_date = COALESCE(NULLIF(?, ''), event_date),
            event_time = COALESCE(NULLIF(?, ''), event_time),
            venue = COALESCE(NULLIF(?, ''), venue),
            description = COALESCE(NULLIF(?, ''), description),
            seats_total = COALESCE(?, seats_total),
            status = COALESCE(NULLIF(?, ''), status)
        WHERE id = ?
    """, (data.get('title'), data.get('category'), data.get('club_name'), data.get('event_date'),
          data.get('event_time'), data.get('venue'), data.get('description'), data.get('seats_total'),
          data.get('status'), event_id))
    conn.commit()
    conn.close()
    return jsonify({'message': f'Event #{event_id} updated.'})

@app.route('/api/events/<int:event_id>/register', methods=['POST'])
def register_for_event(event_id):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM events WHERE id = ?", (event_id,))
    ev = cursor.fetchone()
    if not ev:
        conn.close()
        return jsonify({'error': 'Event not found.'}), 404

    cursor.execute("SELECT id FROM event_registrations WHERE event_id = ? AND student_id = 1", (event_id,))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'You are already registered for this event.'}), 400

    if ev['seats_booked'] >= ev['seats_total']:
        conn.close()
        return jsonify({'error': 'Registration full. Maximum capacity reached.'}), 400

    cursor.execute("SELECT name, usn FROM student_profiles WHERE id = 1")
    prof = cursor.fetchone()
    student_name = prof['name'] if prof else 'Alex Kumar'
    usn = prof['usn'] if prof else '1MS21CS084'

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    cursor.execute("""
        INSERT INTO event_registrations (event_id, student_id, student_name, usn, registered_at, attendance_status, certificate_issued)
        VALUES (?, 1, ?, ?, ?, 'Registered', 0)
    """, (event_id, student_name, usn, now_str))

    cursor.execute("UPDATE events SET seats_booked = seats_booked + 1 WHERE id = ?", (event_id,))
    conn.commit()
    conn.close()

    return jsonify({'message': f'Successfully registered for {ev["title"]}. Seat confirmed!'}), 201

@app.route('/api/events/my-registrations', methods=['GET'])
def get_my_event_registrations():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT r.id as reg_id, r.registered_at, r.attendance_status, r.certificate_issued, r.certificate_file, r.certificate_title,
               e.id as event_id, e.title, e.category, e.club_name, e.event_date, e.event_time, e.venue, e.status as event_status
        FROM event_registrations r
        JOIN events e ON e.id = r.event_id
        WHERE r.student_id = 1
        ORDER BY r.id DESC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'registrations': rows})

@app.route('/api/events/<int:event_id>/certificate/upload', methods=['POST'])
def upload_event_certificate(event_id):
    student_usn = request.form.get('usn', '1MS21CS084').strip()
    cert_title = request.form.get('certificate_title', 'Certificate of Participation').strip()
    file = request.files.get('certificate')

    if not file or not file.filename:
        return jsonify({'error': 'No certificate file uploaded.'}), 400

    filename = secure_filename(file.filename)
    saved_filename = f"cert_{event_id}_{int(datetime.now().timestamp())}_{filename}"
    file_path = os.path.join(CERTIFICATES_UPLOAD_DIR, saved_filename)
    file.save(file_path)

    relative_path = f"certificates/{saved_filename}"

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE event_registrations
        SET certificate_issued = 1, certificate_file = ?, certificate_title = ?, attendance_status = 'Attended'
        WHERE event_id = ? AND usn = ?
    """, (relative_path, cert_title, event_id, student_usn))
    conn.commit()
    conn.close()

    return jsonify({'message': f'Certificate issued for {student_usn}.', 'certificate_file': relative_path})

@app.route('/api/events/certificates/<int:reg_id>/download', methods=['GET'])
def download_event_certificate(reg_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT certificate_file, certificate_title FROM event_registrations WHERE id = ?", (reg_id,))
    row = cursor.fetchone()
    conn.close()

    if not row or not row['certificate_file']:
        return jsonify({'error': 'No certificate issued for this registration yet.'}), 404

    filename = os.path.basename(row['certificate_file'])
    return send_from_directory(CERTIFICATES_UPLOAD_DIR, filename, as_attachment=True)

# ==============================================================================
# LIBRARY MANAGEMENT MODULE
# ==============================================================================

@app.route('/api/library/books', methods=['GET'])
def get_library_books():
    search = request.args.get('search', '').strip().lower()
    category = request.args.get('category', '').strip()
    availability = request.args.get('availability', '').strip().lower()

    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM library_books WHERE 1=1"
    params = []

    if category and category.lower() != 'all':
        query += " AND category = ?"
        params.append(category)

    if search:
        query += " AND (LOWER(title) LIKE ? OR LOWER(author) LIKE ? OR LOWER(isbn) LIKE ? OR LOWER(shelf_location) LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term, term])

    if availability == 'available':
        query += " AND available_copies > 0"
    elif availability in ['borrowed', 'out_of_stock']:
        query += " AND available_copies = 0"

    query += " ORDER BY title ASC"
    cursor.execute(query, params)
    books = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT COUNT(*), SUM(total_copies), SUM(available_copies), SUM(issued_copies) FROM library_books")
    stats_row = cursor.fetchone()
    stats = {
        'total_titles': stats_row[0] or 0,
        'total_copies': stats_row[1] or 0,
        'available_copies': stats_row[2] or 0,
        'issued_copies': stats_row[3] or 0
    }
    conn.close()
    return jsonify({'books': books, 'stats': stats})

@app.route('/api/library/books', methods=['POST'])
def add_library_book():
    data = request.get_json() or {}
    isbn = (data.get('isbn') or '').strip()
    title = (data.get('title') or '').strip()
    author = (data.get('author') or '').strip()
    category = (data.get('category') or 'General').strip()
    publisher = (data.get('publisher') or '').strip()
    edition = (data.get('edition') or '1st Edition').strip()
    shelf_location = (data.get('shelf_location') or 'Rack General').strip()
    try:
        total_copies = int(data.get('total_copies') or 5)
    except (ValueError, TypeError):
        total_copies = 5

    if not isbn or not title or not author:
        return jsonify({'error': 'ISBN, Title, and Author are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM library_books WHERE isbn = ?", (isbn,))
    if cursor.fetchone():
        conn.close()
        return jsonify({'error': f'Book with ISBN {isbn} already exists.'}), 409

    cursor.execute("""
        INSERT INTO library_books (isbn, title, author, category, publisher, edition, shelf_location, total_copies, available_copies, issued_copies)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    """, (isbn, title, author, category, publisher, edition, shelf_location, total_copies, total_copies))
    book_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({'message': 'Book added successfully to library catalog.', 'book_id': book_id}), 201

@app.route('/api/library/books/<int:book_id>', methods=['PUT'])
def update_library_book(book_id):
    data = request.get_json() or {}
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM library_books WHERE id = ?", (book_id,))
    book = cursor.fetchone()
    if not book:
        conn.close()
        return jsonify({'error': 'Book not found.'}), 404

    title = (data.get('title') or book['title']).strip()
    author = (data.get('author') or book['author']).strip()
    category = (data.get('category') or book['category']).strip()
    publisher = (data.get('publisher') or book['publisher']).strip()
    edition = (data.get('edition') or book['edition']).strip()
    shelf_location = (data.get('shelf_location') or book['shelf_location']).strip()
    try:
        total_copies = int(data.get('total_copies', book['total_copies']))
    except (ValueError, TypeError):
        total_copies = book['total_copies']

    issued_copies = book['issued_copies']
    if total_copies < issued_copies:
        conn.close()
        return jsonify({'error': f'Total copies ({total_copies}) cannot be less than currently issued copies ({issued_copies}).'}), 400

    available_copies = total_copies - issued_copies

    cursor.execute("""
        UPDATE library_books
        SET title = ?, author = ?, category = ?, publisher = ?, edition = ?, shelf_location = ?, total_copies = ?, available_copies = ?
        WHERE id = ?
    """, (title, author, category, publisher, edition, shelf_location, total_copies, available_copies, book_id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Book details updated successfully.'})

@app.route('/api/library/books/<int:book_id>', methods=['DELETE'])
def delete_library_book(book_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT issued_copies FROM library_books WHERE id = ?", (book_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'Book not found.'}), 404
    if row['issued_copies'] > 0:
        conn.close()
        return jsonify({'error': f'Cannot delete book while {row["issued_copies"]} copies are currently issued to students.'}), 400

    cursor.execute("DELETE FROM library_books WHERE id = ?", (book_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Book removed from library catalog.'})

@app.route('/api/library/my-books', methods=['GET'])
def get_my_library_books():
    student_usn = request.args.get('usn', '1MS21CS084').strip()
    today_str = datetime.now().strftime('%Y-%m-%d')
    today_date = datetime.strptime(today_str, '%Y-%m-%d').date()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT r.id, r.book_id, r.student_id, r.student_name, r.usn, r.issue_date, r.due_date,
               r.return_date, r.status, r.fine_amount, r.librarian_remarks,
               b.title, b.author, b.isbn, b.category, b.shelf_location
        FROM library_borrow_records r
        JOIN library_books b ON r.book_id = b.id
        WHERE r.usn = ? AND r.status != 'Returned'
        ORDER BY r.due_date ASC
    """, (student_usn,))
    raw_records = cursor.fetchall()

    active_books = []
    total_overdue_fines = 0.0
    reminders = []

    for r in raw_records:
        rec = dict(r)
        due_date = datetime.strptime(rec['due_date'], '%Y-%m-%d').date()
        days_diff = (due_date - today_date).days

        if days_diff < 0:
            rec['status'] = 'Overdue'
            overdue_days = abs(days_diff)
            rec['overdue_days'] = overdue_days
            rec['calculated_fine'] = overdue_days * 2.0  # Rs 2 per day
            total_overdue_fines += rec['calculated_fine']
            rec['days_remaining'] = days_diff
            reminders.append({
                'type': 'Overdue Alert',
                'severity': 'high',
                'book_title': rec['title'],
                'due_date': rec['due_date'],
                'message': f"Overdue by {overdue_days} day(s). Fine accrued: Rs {rec['calculated_fine']:.2f}. Please return immediately."
            })
        else:
            rec['overdue_days'] = 0
            rec['calculated_fine'] = 0.0
            rec['days_remaining'] = days_diff
            if days_diff <= 3:
                reminders.append({
                    'type': 'Return Reminder',
                    'severity': 'medium',
                    'book_title': rec['title'],
                    'due_date': rec['due_date'],
                    'message': f"Book '{rec['title']}' is due in {days_diff} day(s) on {rec['due_date']}."
                })

        active_books.append(rec)

    conn.close()
    return jsonify({
        'borrowed_books': active_books,
        'total_active': len(active_books),
        'total_overdue_fines': total_overdue_fines,
        'reminders': reminders
    })

@app.route('/api/library/history', methods=['GET'])
def get_library_history():
    student_usn = request.args.get('usn', '1MS21CS084').strip()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT r.id, r.book_id, r.student_id, r.student_name, r.usn, r.issue_date, r.due_date,
               r.return_date, r.status, r.fine_amount, r.librarian_remarks,
               b.title, b.author, b.isbn, b.category
        FROM library_borrow_records r
        JOIN library_books b ON r.book_id = b.id
        WHERE r.usn = ? AND r.status = 'Returned'
        ORDER BY r.return_date DESC
    """, (student_usn,))
    history = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'history': history})

@app.route('/api/library/issue', methods=['POST'])
def issue_library_book():
    data = request.get_json() or {}
    book_id = data.get('book_id')
    usn = (data.get('usn') or '1MS21CS084').strip()
    student_name = (data.get('student_name') or 'Alex Kumar').strip()
    try:
        due_days = int(data.get('days', 14))
    except (ValueError, TypeError):
        due_days = 14

    issue_date = datetime.now().strftime('%Y-%m-%d')
    due_date = (datetime.now() + timedelta(days=due_days)).strftime('%Y-%m-%d')

    if not book_id:
        return jsonify({'error': 'Book ID is required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM library_books WHERE id = ?", (book_id,))
    book = cursor.fetchone()
    if not book:
        conn.close()
        return jsonify({'error': 'Book not found.'}), 404

    if book['available_copies'] <= 0:
        conn.close()
        return jsonify({'error': 'No available copies left for this book.'}), 400

    cursor.execute("""
        UPDATE library_books
        SET available_copies = available_copies - 1, issued_copies = issued_copies + 1
        WHERE id = ?
    """, (book_id,))

    cursor.execute("""
        INSERT INTO library_borrow_records (book_id, student_id, student_name, usn, issue_date, due_date, status, fine_amount, librarian_remarks)
        VALUES (?, 1, ?, ?, ?, ?, 'Issued', 0.0, 'Issued via Circulation Desk')
    """, (book_id, student_name, usn, issue_date, due_date))
    record_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({'message': f'Book "{book["title"]}" successfully issued to {usn}. Due on {due_date}.', 'record_id': record_id}), 201

@app.route('/api/library/return/<int:borrow_id>', methods=['POST'])
def return_library_book(borrow_id):
    data = request.get_json() or {}
    remarks = (data.get('remarks') or 'Returned in good condition').strip()
    return_date = datetime.now().strftime('%Y-%m-%d')
    today_date = datetime.strptime(return_date, '%Y-%m-%d').date()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM library_borrow_records WHERE id = ?", (borrow_id,))
    rec = cursor.fetchone()
    if not rec:
        conn.close()
        return jsonify({'error': 'Borrow record not found.'}), 404

    if rec['status'] == 'Returned':
        conn.close()
        return jsonify({'error': 'This book has already been returned.'}), 400

    due_date = datetime.strptime(rec['due_date'], '%Y-%m-%d').date()
    fine = 0.0
    if today_date > due_date:
        overdue_days = (today_date - due_date).days
        fine = float(overdue_days * 2.0)

    cursor.execute("""
        UPDATE library_borrow_records
        SET status = 'Returned', return_date = ?, fine_amount = ?, librarian_remarks = ?
        WHERE id = ?
    """, (return_date, fine, remarks, borrow_id))

    cursor.execute("""
        UPDATE library_books
        SET available_copies = available_copies + 1, issued_copies = MAX(0, issued_copies - 1)
        WHERE id = ?
    """, (rec['book_id'],))

    conn.commit()
    conn.close()
    return jsonify({
        'message': 'Book returned successfully.',
        'return_date': return_date,
        'fine_amount': fine
    })

@app.route('/api/library', methods=['GET'])
def get_library():
    return get_my_library_books()

# ==============================================================================
# CAMPUS SERVICES MODULE
# ==============================================================================

@app.route('/api/services/bus-routes', methods=['GET'])
def get_bus_routes():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM bus_routes ORDER BY route_number ASC")
    rows = cursor.fetchall()
    routes = []
    for r in rows:
        route_dict = dict(r)
        try:
            route_dict['stops'] = json.loads(route_dict.get('stops_and_timings_json') or '[]')
        except Exception:
            route_dict['stops'] = []
        routes.append(route_dict)
    conn.close()
    return jsonify({
        'routes': routes,
        'tracking_disclaimer': 'Simulation / Demo Tracking Mode Active. Hardware GPS feed is currently simulated.',
        'is_simulation': True
    })

@app.route('/api/services/canteen', methods=['GET'])
def get_canteen():
    category = request.args.get('category', '').strip()
    dietary = request.args.get('dietary', '').strip()
    search = request.args.get('search', '').strip().lower()

    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM canteen_menu WHERE 1=1"
    params = []

    if category and category.lower() != 'all':
        query += " AND category = ?"
        params.append(category)

    if dietary and dietary.lower() != 'all':
        query += " AND dietary = ?"
        params.append(dietary)

    if search:
        query += " AND (LOWER(item_name) LIKE ? OR LOWER(category) LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term])

    query += " ORDER BY category ASC, item_name ASC"
    cursor.execute(query, params)
    items = [dict(r) for r in cursor.fetchall()]
    conn.close()

    info = {
        'name': 'University Central Food Court & Canteen',
        'location': 'Campus Student Plaza, Ground Floor',
        'opening_hours': '07:30 AM - 08:30 PM (Monday to Sunday)',
        'breakfast_timings': '07:30 AM - 10:30 AM',
        'lunch_timings': '12:00 PM - 03:00 PM',
        'snacks_timings': '04:00 PM - 07:00 PM',
        'dinner_timings': '07:00 PM - 08:30 PM',
        'contact': '+91 80 2345 6750',
        'payment_methods': 'UPI, Campus RFID Smart Card, Cash'
    }
    return jsonify({'info': info, 'menu': items})

@app.route('/api/services/canteen/<int:item_id>/availability', methods=['PUT'])
def toggle_canteen_availability(item_id):
    data = request.get_json() or {}
    new_availability = data.get('availability', 'Available')
    if new_availability not in ['Available', 'Sold Out']:
        return jsonify({'error': 'Invalid status. Must be Available or Sold Out.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE canteen_menu SET availability = ? WHERE id = ?", (new_availability, item_id))
    conn.commit()
    conn.close()
    return jsonify({'message': f'Item availability updated to {new_availability}.'})

@app.route('/api/services/lost-found', methods=['GET'])
def get_lost_found():
    report_type = request.args.get('type', '').strip()
    category = request.args.get('category', '').strip()
    status = request.args.get('status', '').strip()
    search = request.args.get('search', '').strip().lower()

    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM lost_and_found WHERE 1=1"
    params = []

    if report_type and report_type.lower() != 'all':
        query += " AND LOWER(report_type) = LOWER(?)"
        params.append(report_type)

    if category and category.lower() != 'all':
        query += " AND category = ?"
        params.append(category)

    if status and status.lower() != 'all':
        query += " AND status = ?"
        params.append(status)

    if search:
        query += " AND (LOWER(item_title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(location_reported) LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])

    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    items = [dict(r) for r in cursor.fetchall()]

    for it in items:
        cursor.execute("SELECT COUNT(*) FROM lost_and_found_messages WHERE item_id = ?", (it['id'],))
        it['message_count'] = cursor.fetchone()[0]

    conn.close()
    return jsonify({'items': items})

@app.route('/api/services/lost-found', methods=['POST'])
def create_lost_found():
    data = request.get_json() or {}
    report_type = data.get('report_type', 'Lost')
    item_title = (data.get('item_title') or '').strip()
    category = (data.get('category') or 'Personal Items').strip()
    location_reported = (data.get('location_reported') or '').strip()
    date_reported = data.get('date_reported') or datetime.now().strftime('%Y-%m-%d')
    description = (data.get('description') or '').strip()
    reporter_name = (data.get('reporter_name') or 'Alex Kumar').strip()
    reporter_usn = (data.get('reporter_usn') or '1MS21CS084').strip()
    contact_email = (data.get('contact_email') or 'student@college.edu').strip()
    contact_phone = (data.get('contact_phone') or '+91 98765 43210').strip()
    claim_instructions = (data.get('claim_instructions') or 'Contact reporter or visit department office.').strip()

    if not item_title or not location_reported or not description:
        return jsonify({'error': 'Item title, location, and description are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO lost_and_found (
            report_type, item_title, category, location_reported, date_reported,
            description, reporter_name, reporter_usn, contact_email, contact_phone,
            status, claim_instructions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?)
    """, (report_type, item_title, category, location_reported, date_reported,
          description, reporter_name, reporter_usn, contact_email, contact_phone, claim_instructions))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({'message': f'{report_type} item report submitted successfully.', 'id': new_id}), 201

@app.route('/api/services/lost-found/<int:item_id>/status', methods=['PUT'])
def update_lost_found_status(item_id):
    data = request.get_json() or {}
    status = data.get('status', 'Resolved')
    if status not in ['Open', 'Claimed', 'Resolved']:
        return jsonify({'error': 'Invalid status. Must be Open, Claimed, or Resolved.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE lost_and_found SET status = ? WHERE id = ?", (status, item_id))
    conn.commit()
    conn.close()
    return jsonify({'message': f'Status updated to {status}.'})

@app.route('/api/services/lost-found/<int:item_id>/messages', methods=['GET'])
def get_lost_found_messages(item_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM lost_and_found_messages WHERE item_id = ? ORDER BY id ASC", (item_id,))
    messages = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'messages': messages})

@app.route('/api/services/lost-found/<int:item_id>/message', methods=['POST'])
def send_lost_found_message(item_id):
    data = request.get_json() or {}
    sender_name = (data.get('sender_name') or 'Alex Kumar').strip()
    sender_usn = (data.get('sender_usn') or '1MS21CS084').strip()
    sender_contact = (data.get('sender_contact') or '+91 98765 43210').strip()
    message = (data.get('message') or '').strip()

    if not message:
        return jsonify({'error': 'Message content is required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM lost_and_found WHERE id = ?", (item_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Lost/Found item not found.'}), 404

    cursor.execute("""
        INSERT INTO lost_and_found_messages (item_id, sender_name, sender_usn, sender_contact, message)
        VALUES (?, ?, ?, ?, ?)
    """, (item_id, sender_name, sender_usn, sender_contact, message))
    msg_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({'message': 'Inquiry message delivered to the item reporter.', 'id': msg_id}), 201

@app.route('/api/services/facilities', methods=['GET'])
def get_campus_facilities():
    category = request.args.get('category', '').strip()
    search = request.args.get('search', '').strip().lower()

    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM campus_facilities WHERE 1=1"
    params = []

    if category and category.lower() != 'all':
        query += " AND category = ?"
        params.append(category)

    if search:
        query += " AND (LOWER(facility_name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(building_location) LIKE ? OR LOWER(key_features) LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term, term])

    query += " ORDER BY facility_name ASC"
    cursor.execute(query, params)
    facilities = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'facilities': facilities})

@app.route('/api/services', methods=['GET'])
def get_services():
    return jsonify({
        'shuttle_bus': {'route': 'Route 14 (Electronic City)', 'status': 'On Time', 'next_stop': 'Silk Board Junction (08:25 AM)'},
        'cafeteria': {'status': 'Open', 'crowd_level': 'Moderate', 'specials': 'Veg Thali, Paneer Wrap, Fresh Juice'}
    })

# ==============================================================================
# 15. COMMUNICATION & NOTIFICATIONS MODULE
# ==============================================================================

@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    category = request.args.get('category', '').strip()
    status = request.args.get('status', '').strip().lower()
    role = request.args.get('role', 'all').strip().lower()

    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM notifications WHERE 1=1"
    params = []

    if category and category.lower() != 'all':
        query += " AND category = ?"
        params.append(category)

    if status == 'unread':
        query += " AND is_read = 0"
    elif status == 'read':
        query += " AND is_read = 1"

    if role != 'all' and role:
        query += " AND (target_role = 'all' OR target_role = ?)"
        params.append(role)

    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    notifs = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT COUNT(*) FROM notifications WHERE is_read = 0")
    unread_count = cursor.fetchone()[0]

    conn.close()
    return jsonify({'notifications': notifs, 'unread_count': unread_count})

@app.route('/api/notifications', methods=['POST'])
def publish_notification():
    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    category = (data.get('category') or 'College Announcement').strip()
    department = (data.get('department') or 'Office of Academic Affairs').strip()
    content = (data.get('content') or '').strip()
    priority = (data.get('priority') or 'Normal').strip()
    target_role = (data.get('target_role') or 'all').strip()
    published_date = data.get('published_date') or datetime.now().strftime('%Y-%m-%d')

    if not title or not content:
        return jsonify({'error': 'Title and content are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO notifications (title, category, department, content, priority, target_role, published_date, is_read)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    """, (title, category, department, content, priority, target_role, published_date))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({'message': 'Official circular published successfully.', 'id': new_id}), 201

@app.route('/api/notifications/<int:notif_id>/read', methods=['PUT'])
def mark_notification_read(notif_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE notifications SET is_read = 1 WHERE id = ?", (notif_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Notification marked as read.'})

@app.route('/api/notifications/mark-all-read', methods=['POST'])
def mark_all_notifications_read():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE notifications SET is_read = 1")
    conn.commit()
    conn.close()
    return jsonify({'message': 'All notifications marked as read.'})

@app.route('/api/notifications/<int:notif_id>', methods=['DELETE'])
def delete_notification(notif_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM notifications WHERE id = ?", (notif_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Notification deleted successfully.'})

@app.route('/api/communications/faculty-directory', methods=['GET'])
def get_faculty_directory():
    faculty = [
        {
            'name': 'Dr. Ramesh Rao (Head of Systems)',
            'department': 'Computer Science & Engineering',
            'designation': 'Professor & Head of Department',
            'email': 'ramesh.rao@college.edu',
            'office': 'CS Block 301, 3rd Floor',
            'consultation_hours': '10:00 AM - 12:00 PM (Tue, Thu)',
            'courses': ['CS601 Distributed Systems', 'CS602 Machine Learning']
        },
        {
            'name': 'Prof. Anil Deshmukh',
            'department': 'Computer Science & Engineering',
            'designation': 'Associate Professor',
            'email': 'anil.deshmukh@college.edu',
            'office': 'CS Block 204, 2nd Floor',
            'consultation_hours': '11:00 AM - 01:00 PM (Mon, Wed)',
            'courses': ['CS603 Compiler Design', 'CS502 Operating Systems']
        },
        {
            'name': 'Dr. Geetha S. (HoD ECE)',
            'department': 'Electronics & Communication',
            'designation': 'Professor & Head of Department',
            'email': 'geetha.s@college.edu',
            'office': 'EC Complex 102, Ground Floor',
            'consultation_hours': '02:00 PM - 04:00 PM (Mon, Fri)',
            'courses': ['EC601 Embedded IoT Systems', 'EC503 Digital Signal Processing']
        },
        {
            'name': 'Dr. Sunita Varma',
            'department': 'Campus Health & Medical Services',
            'designation': 'Senior Medical Officer',
            'email': 'sunita.varma@college.edu',
            'office': 'Health Pavilion Room 101',
            'consultation_hours': '09:00 AM - 01:00 PM (Daily)',
            'courses': ['HS101 Health & Preventive Care']
        }
    ]
    return jsonify({'faculty': faculty})

@app.route('/api/communications/appointments', methods=['GET'])
def get_faculty_appointments():
    student_usn = request.args.get('usn', '1MS21CS084').strip()
    role = request.args.get('role', 'student').strip().lower()

    conn = get_db()
    cursor = conn.cursor()
    if role in ['faculty', 'admin']:
        cursor.execute("SELECT * FROM faculty_appointments ORDER BY id DESC")
    else:
        cursor.execute("SELECT * FROM faculty_appointments WHERE usn = ? ORDER BY id DESC", (student_usn,))
    appts = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'appointments': appts})

@app.route('/api/communications/appointments', methods=['POST'])
def create_faculty_appointment():
    data = request.get_json() or {}
    faculty_name = (data.get('faculty_name') or '').strip()
    department = (data.get('department') or 'Computer Science').strip()
    purpose = (data.get('purpose') or '').strip()
    requested_date = (data.get('requested_date') or '').strip()
    requested_slot = (data.get('requested_slot') or '10:30 AM - 11:00 AM').strip()
    usn = (data.get('usn') or '1MS21CS084').strip()
    student_name = (data.get('student_name') or 'Alex Kumar').strip()

    if not faculty_name or not purpose or not requested_date:
        return jsonify({'error': 'Faculty name, consultation purpose, and requested date are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO faculty_appointments (student_id, student_name, usn, faculty_name, department, purpose, requested_date, requested_slot, status, faculty_remarks)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, 'Pending', '')
    """, (student_name, usn, faculty_name, department, purpose, requested_date, requested_slot))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({'message': f'Appointment request submitted to {faculty_name}. Status: Pending.', 'id': new_id}), 201

@app.route('/api/communications/appointments/<int:appt_id>/status', methods=['PUT'])
def update_appointment_status(appt_id):
    data = request.get_json() or {}
    status = data.get('status', 'Confirmed')
    remarks = (data.get('remarks') or '').strip()

    if status not in ['Pending', 'Confirmed', 'Rescheduled', 'Completed', 'Cancelled']:
        return jsonify({'error': 'Invalid appointment status.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE faculty_appointments
        SET status = ?, faculty_remarks = ?
        WHERE id = ?
    """, (status, remarks, appt_id))
    conn.commit()
    conn.close()
    return jsonify({'message': f'Appointment status updated to {status}.'})


# ==============================================================================
# 16. PERFORMANCE ANALYTICS MODULE
# ==============================================================================

@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    student_usn = request.args.get('usn', '1MS21CS084').strip()
    conn = get_db()
    cursor = conn.cursor()

    # 1. Fetch Semester SGPA History & calculate CGPA progression
    cursor.execute("""
        SELECT semester, total_credits, total_credit_points, sgpa
        FROM semester_gpa_history
        WHERE student_id = 1
        ORDER BY semester ASC
    """)
    gpa_rows = cursor.fetchall()

    sgpa_history = []
    cum_credits = 0.0
    cum_points = 0.0
    for r in gpa_rows:
        sem_num = r['semester']
        creds = float(r['total_credits'])
        pts = float(r['total_credit_points'])
        sgpa_val = float(r['sgpa'])

        cum_credits += creds
        cum_points += pts
        cgpa_val = round(cum_points / cum_credits, 2) if cum_credits > 0 else 0.0

        sgpa_history.append({
            'semester': f"Sem {sem_num}",
            'semester_number': sem_num,
            'credits': creds,
            'grade_points': pts,
            'sgpa': sgpa_val,
            'cgpa': cgpa_val
        })

    # Academic Improvement or Decline Trend Calculation
    trend_info = {'direction': 'Consistent', 'delta': 0.0, 'label': 'Stable Academic Pace'}
    if len(sgpa_history) >= 2:
        latest = sgpa_history[-1]['sgpa']
        prev = sgpa_history[-2]['sgpa']
        delta = round(latest - prev, 2)
        if delta > 0:
            trend_info = {
                'direction': 'Improvement',
                'delta': delta,
                'label': f"Academic Improvement: +{delta:.2f} SGPA compared to {sgpa_history[-2]['semester']}"
            }
        elif delta < 0:
            trend_info = {
                'direction': 'Decline',
                'delta': delta,
                'label': f"Academic Decline: {delta:.2f} SGPA compared to {sgpa_history[-2]['semester']}"
            }

    # 2. Fetch Subject-wise Attendance
    cursor.execute("""
        SELECT id, course_code, course_title, attended_hours, total_hours, od_hours, faculty_name
        FROM attendance
        WHERE user_id = 1
        ORDER BY course_title ASC
    """)
    att_rows = cursor.fetchall()

    subject_attendance = []
    low_attendance_alerts = []
    total_conducted = 0
    total_attended = 0

    for r in att_rows:
        tc = r['total_hours']
        ac = r['attended_hours']
        od = r['od_hours']
        sub_name = r['course_title']
        sub_code = r['course_code']
        pct = round(((ac + od) / tc * 100), 1) if tc > 0 else 0.0
        absent = max(0, tc - (ac + od))

        total_conducted += tc
        total_attended += (ac + od)

        status_tag = 'Good'
        needed_for_75 = 0
        needed_for_85 = 0

        if pct < 75.0:
            status_tag = 'Critical Shortage'
            needed_for_75 = max(0, math.ceil((0.75 * tc - (ac + od)) / (1 - 0.75)))
            needed_for_85 = max(0, math.ceil((0.85 * tc - (ac + od)) / (1 - 0.85)))
            low_attendance_alerts.append({
                'subject': sub_name,
                'code': sub_code,
                'percentage': pct,
                'severity': 'Critical',
                'message': f"Shortage below mandatory 75% ({pct}%). Attend next {needed_for_75} consecutive classes to reach 75%, and {needed_for_85} to reach 85%."
            })
        elif pct < 85.0:
            status_tag = 'Warning'
            needed_for_85 = max(0, math.ceil((0.85 * tc - (ac + od)) / (1 - 0.85)))
            low_attendance_alerts.append({
                'subject': sub_name,
                'code': sub_code,
                'percentage': pct,
                'severity': 'Warning',
                'message': f"Below recommended 85% threshold ({pct}%). Attend next {needed_for_85} consecutive classes to safely qualify for honors."
            })

        subject_attendance.append({
            'subject': sub_name,
            'code': sub_code,
            'total_classes': tc,
            'attended_classes': ac,
            'absent_classes': absent,
            'od_classes': od,
            'percentage': pct,
            'faculty': r['faculty_name'],
            'status': status_tag
        })

    overall_attendance_pct = round((total_attended / total_conducted * 100), 1) if total_conducted > 0 else 0.0

    # 3. Fetch Subject-wise Marks for Current Semester
    cursor.execute("""
        SELECT id, course_code, course_title, credits, internal_marks, lab_marks, external_marks, total_marks, grade, status
        FROM academic_marks
        WHERE user_id = 1 AND semester = 6
        ORDER BY course_title ASC
    """)
    marks_rows = cursor.fetchall()

    subject_marks = []
    marks_improvement_alerts = []
    total_marks_sum = 0
    subject_count = len(marks_rows)

    for r in marks_rows:
        tot = r['total_marks']
        ext = r['external_marks']
        sub_name = r['course_title']
        sub_code = r['course_code']
        grade = r['grade']
        total_marks_sum += tot

        if tot < 80 or ext < 50:
            marks_improvement_alerts.append({
                'subject': sub_name,
                'code': sub_code,
                'total_marks': tot,
                'external_marks': ext,
                'grade': grade,
                'suggestion': f"Current score is {tot}/100. Target internal test revisions and lab assignments to boost total above 80 (Grade A+)."
            })

        subject_marks.append({
            'subject': sub_name,
            'code': sub_code,
            'internal_marks': r['internal_marks'],
            'lab_marks': r['lab_marks'],
            'external_marks': ext,
            'total_marks': tot,
            'grade': grade,
            'credits': r['credits'],
            'status': r['status']
        })

    overall_marks_avg = round(total_marks_sum / subject_count, 1) if subject_count > 0 else 0.0

    current_sgpa = sgpa_history[-1]['sgpa'] if sgpa_history else 9.18
    cumulative_cgpa = sgpa_history[-1]['cgpa'] if sgpa_history else 9.36

    conn.close()
    return jsonify({
        'student': {
            'name': 'Alex Kumar',
            'usn': '1MS21CS084',
            'department': 'Computer Science & Engineering',
            'semester': 6,
            'batch': '2021 - 2025'
        },
        'sgpa_history': sgpa_history,
        'current_sgpa': current_sgpa,
        'cumulative_cgpa': cumulative_cgpa,
        'trend': trend_info,
        'subject_attendance': subject_attendance,
        'overall_attendance_pct': overall_attendance_pct,
        'low_attendance_alerts': low_attendance_alerts,
        'subject_marks': subject_marks,
        'overall_marks_avg': overall_marks_avg,
        'marks_improvement_alerts': marks_improvement_alerts,
        'academic_standing': 'First Class with Distinction (FCD)'
    })


# ==============================================================================
# 17. FACULTY DOUBT PORTAL MODULE
# ==============================================================================

@app.route('/api/doubts', methods=['GET'])
def get_doubts():
    subject = request.args.get('subject', '').strip()
    status = request.args.get('status', '').strip()
    search = request.args.get('search', '').strip().lower()

    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM faculty_doubts WHERE 1=1"
    params = []

    if subject and subject.lower() != 'all':
        query += " AND (subject_code = ? OR subject_name = ?)"
        params.extend([subject, subject])

    if status and status.lower() != 'all':
        query += " AND status = ?"
        params.append(status)

    if search:
        query += " AND (LOWER(title) LIKE ? OR LOWER(question) LIKE ? OR LOWER(faculty_name) LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])

    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    doubts = [dict(r) for r in cursor.fetchall()]

    for d in doubts:
        cursor.execute("SELECT * FROM doubt_responses WHERE doubt_id = ? ORDER BY id ASC", (d['id'],))
        d['responses'] = [dict(r) for r in cursor.fetchall()]

    conn.close()
    return jsonify({'doubts': doubts})

@app.route('/api/doubts', methods=['POST'])
def submit_doubt():
    subject_code = request.form.get('subject_code') or ''
    subject_name = request.form.get('subject_name') or ''
    faculty_name = request.form.get('faculty_name') or 'Dr. Ramesh Rao (Head of Systems)'
    title = request.form.get('title') or ''
    question = request.form.get('question') or ''
    usn = request.form.get('usn', '1MS21CS084')
    student_name = request.form.get('student_name', 'Alex Kumar')

    if not subject_code or not title or not question:
        data = request.get_json(silent=True) or {}
        subject_code = data.get('subject_code') or subject_code
        subject_name = data.get('subject_name') or subject_name
        faculty_name = data.get('faculty_name') or faculty_name
        title = data.get('title') or title
        question = data.get('question') or question
        usn = data.get('usn') or usn
        student_name = data.get('student_name') or student_name

    if not title or not question:
        return jsonify({'error': 'Doubt title and question details are required.'}), 400

    attachment_rel = ''
    file = request.files.get('attachment')
    if file and file.filename:
        filename = secure_filename(file.filename)
        saved_filename = f"doubt_{int(datetime.now().timestamp())}_{filename}"
        file_path = os.path.join(DOUBTS_UPLOAD_DIR, saved_filename)
        file.save(file_path)
        attachment_rel = f"doubts/{saved_filename}"

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO faculty_doubts (student_id, student_name, usn, subject_code, subject_name, faculty_name, title, question, attachment_file, status)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, 'Submitted')
    """, (student_name, usn, subject_code, subject_name, faculty_name, title, question, attachment_rel))
    doubt_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({'message': 'Doubt submitted successfully to faculty member.', 'doubt_id': doubt_id}), 201

@app.route('/api/doubts/<int:doubt_id>/respond', methods=['POST'])
def respond_to_doubt(doubt_id):
    responder_name = request.form.get('responder_name') or ''
    responder_role = request.form.get('responder_role') or 'faculty'
    response_text = request.form.get('response_text') or ''

    if not response_text:
        data = request.get_json(silent=True) or {}
        responder_name = data.get('responder_name') or responder_name
        responder_role = data.get('responder_role') or responder_role
        response_text = data.get('response_text') or response_text

    if not response_text:
        return jsonify({'error': 'Response text cannot be empty.'}), 400

    if not responder_name:
        responder_name = 'Dr. Ramesh Rao (Head of Systems)' if responder_role == 'faculty' else 'Alex Kumar'

    attachment_rel = ''
    file = request.files.get('attachment')
    if file and file.filename:
        filename = secure_filename(file.filename)
        saved_filename = f"doubt_reply_{int(datetime.now().timestamp())}_{filename}"
        file_path = os.path.join(DOUBTS_UPLOAD_DIR, saved_filename)
        file.save(file_path)
        attachment_rel = f"doubts/{saved_filename}"

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO doubt_responses (doubt_id, responder_name, responder_role, response_text, attachment_file)
        VALUES (?, ?, ?, ?, ?)
    """, (doubt_id, responder_name, responder_role, response_text, attachment_rel))

    if responder_role == 'faculty':
        cursor.execute("UPDATE faculty_doubts SET status = 'Answered' WHERE id = ?", (doubt_id,))

    conn.commit()
    conn.close()
    return jsonify({'message': 'Response submitted successfully.'}), 201

@app.route('/api/doubts/<int:doubt_id>/status', methods=['PUT'])
def update_doubt_status(doubt_id):
    data = request.get_json() or {}
    new_status = data.get('status', 'Resolved')
    if new_status not in ['Submitted', 'Under Review', 'Answered', 'Resolved']:
        return jsonify({'error': 'Invalid doubt status.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE faculty_doubts SET status = ? WHERE id = ?", (new_status, doubt_id))
    conn.commit()
    conn.close()
    return jsonify({'message': f'Doubt status updated to {new_status}.'})

# Static React Frontend Serving
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path.startswith('api'):
        return jsonify({'error': 'Not found'}), 404
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    if os.path.exists(os.path.join(app.static_folder, 'index.html')):
        return send_from_directory(app.static_folder, 'index.html')
    return jsonify({'message': 'College Student Management Portal API Server Running', 'endpoints': '/api/*'})

if __name__ == '__main__':
    print("Starting Flask Server on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
