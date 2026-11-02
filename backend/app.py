import os
import math
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from database import get_db, init_db

FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist'))
app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path='')
CORS(app, resources={r"/api/*": {"origins": "*"}})

init_db()

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

    # Pass if total >= 40 and external exam score >= 18 out of 50
    status = 'Pass' if (total >= 40 and external >= 18) else 'Fail'
    return grade, status

GRADE_POINTS = {'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'P': 4, 'F': 0}

# ==========================================================
# 1. DASHBOARD HOME SUMMARY
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

    # Live SGPA calculation for current semester (Sem 6)
    cursor.execute("SELECT credits, grade FROM academic_marks WHERE semester = 6")
    sem6_marks = cursor.fetchall()
    sem6_pts = sum(m['credits'] * GRADE_POINTS.get(m['grade'], 8) for m in sem6_marks)
    sem6_creds = sum(m['credits'] for m in sem6_marks)
    current_sgpa = round(sem6_pts / sem6_creds, 2) if sem6_creds > 0 else 9.68

    # Live CGPA across all recorded semesters
    cursor.execute("SELECT credits, grade FROM academic_marks")
    all_marks = cursor.fetchall()
    all_pts = sum(m['credits'] * GRADE_POINTS.get(m['grade'], 8) for m in all_marks)
    all_creds = sum(m['credits'] for m in all_marks)
    cgpa = round(all_pts / all_creds, 2) if all_creds > 0 else 9.63

    # Upcoming examinations
    cursor.execute("SELECT * FROM examinations ORDER BY exam_date ASC LIMIT 5")
    exams = [dict(r) for r in cursor.fetchall()]

    # Pending assignments
    cursor.execute("SELECT * FROM assignments WHERE status = 'Pending' ORDER BY due_date ASC LIMIT 5")
    pending_assignments = [dict(r) for r in cursor.fetchall()]

    # Recent announcements
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
# 2. MODULE 1: ACADEMIC PERFORMANCE & MARKS
# ==========================================================

@app.route('/api/academics/performance', methods=['GET'])
def get_performance():
    conn = get_db()
    cursor = conn.cursor()

    # Get available semesters
    cursor.execute("SELECT DISTINCT semester FROM academic_marks ORDER BY semester DESC")
    available_semesters = [r['semester'] for r in cursor.fetchall()]
    if not available_semesters:
        available_semesters = [6, 5]

    selected_sem = request.args.get('semester')
    if selected_sem:
        selected_sem = int(selected_sem)
    else:
        selected_sem = available_semesters[0]

    # Semester specific marks
    cursor.execute("""
        SELECT id, course_code, course_title, credits, internal_marks, lab_marks, external_marks, total_marks, grade, status
        FROM academic_marks
        WHERE semester = ?
        ORDER BY course_code ASC
    """, (selected_sem,))
    marks_rows = [dict(r) for r in cursor.fetchall()]

    # Semester SGPA
    sem_pts = sum(m['credits'] * GRADE_POINTS.get(m['grade'], 0) for m in marks_rows)
    sem_creds = sum(m['credits'] for m in marks_rows)
    sgpa = round(sem_pts / sem_creds, 2) if sem_creds > 0 else 0.0

    # Overall Cumulative CGPA across all semesters
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

    if internal < 0 or internal > 30:
        return jsonify({'error': 'Internal marks must be between 0 and 30.'}), 400
    if lab < 0 or lab > 20:
        return jsonify({'error': 'Lab marks must be between 0 and 20.'}), 400
    if external < 0 or external > 50:
        return jsonify({'error': 'External exam marks must be between 0 and 50.'}), 400

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
# 3. MODULE 2: SMART ATTENDANCE
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
            # Safe bunks: floor(((attended + od) / 0.75) - total)
            safe_bunks = max(0, int(((attended + od) / 0.75) - total))
            needed = 0
        else:
            status = 'Shortage'
            safe_bunks = 0
            # Classes needed: ceil((0.75 * total - (attended + od)) / 0.25)
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
    action = data.get('action', 'present').strip().lower()  # 'present', 'absent', 'od'
    date_str = data.get('date', 'Today')

    if not course_code:
        return jsonify({'error': 'Course code is required.'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM attendance WHERE course_code = ?", (course_code,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({'error': f'Course {course_code} not found in attendance register.'}), 404

    attended = row['attended_hours']
    total = row['total_hours'] + 1
    od = row['od_hours'] or 0

    if action == 'present':
        attended += 1
    elif action == 'od':
        od += 1
    # absent increments only total

    cursor.execute("""
        UPDATE attendance
        SET attended_hours = ?, total_hours = ?, od_hours = ?
        WHERE course_code = ?
    """, (attended, total, od, course_code))

    # Log record
    cursor.execute("""
        INSERT INTO attendance_logs (course_code, date, status, marked_by)
        VALUES (?, ?, ?, 'Faculty Portal')
    """, (course_code, date_str, action))

    conn.commit()
    conn.close()

    new_pct = round(((attended + od) / total) * 100, 1)
    return jsonify({
        'message': f'Attendance marked as "{action.upper()}" for {course_code}. Updated attendance: {new_pct}%.',
        'updated_course': {
            'course_code': course_code,
            'attended': attended,
            'total': total,
            'od': od,
            'percentage': new_pct
        }
    })

@app.route('/api/attendance/<int:attendance_id>', methods=['PUT'])
def edit_attendance(attendance_id):
    data = request.get_json() or {}
    attended = int(data.get('attended_hours', 0))
    total = int(data.get('total_hours', 0))
    od = int(data.get('od_hours', 0))

    if total < 0 or attended < 0 or od < 0:
        return jsonify({'error': 'Hours cannot be negative.'}), 400
    if attended + od > total:
        return jsonify({'error': 'Attended + OD hours cannot exceed total hours conducted.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE attendance
        SET attended_hours = ?, total_hours = ?, od_hours = ?
        WHERE id = ?
    """, (attended, total, od, attendance_id))
    conn.commit()
    conn.close()

    return jsonify({'message': 'Attendance record adjusted successfully.'})

# ==========================================================
# 4. MODULE 3: ATTENDANCE CALCULATOR
# ==========================================================

@app.route('/api/attendance/calculate', methods=['POST'])
def calculate_attendance():
    data = request.get_json() or {}
    total = int(data.get('total_hours', 0))
    attended = int(data.get('attended_hours', 0))
    od = int(data.get('od_hours', 0))
    target = float(data.get('target_percentage', 75.0))
    course_name = data.get('course_name', 'Selected Subject')

    # Edge cases
    if total < 0 or attended < 0 or od < 0:
        return jsonify({'error': 'Class hours cannot be negative values.'}), 400

    if target <= 0 or target > 100:
        return jsonify({'error': 'Required attendance target must be between 1% and 100%.'}), 400

    effective_attended = attended + od

    if effective_attended > total:
        return jsonify({'error': f'Classes attended ({effective_attended}) cannot exceed total classes conducted ({total}).'}), 400

    if total == 0:
        return jsonify({
            'current_percentage': 0.0,
            'status': 'No Sessions',
            'max_bunks': 0,
            'needed_classes': 0,
            'projected_next_attended': 100.0,
            'projected_next_bunk': 0.0,
            'message': 'No classes conducted yet for this course. Start attending to establish your percentage.'
        })

    current_rate = round((effective_attended / total) * 100, 1)
    target_fraction = target / 100.0

    # Projected attendance simulations
    proj_if_attend_next = round(((effective_attended + 1) / (total + 1)) * 100, 1)
    proj_if_miss_next = round((effective_attended / (total + 1)) * 100, 1)

    if current_rate >= target:
        # Safe bunks: (effective_attended) / (total + x) >= target_fraction
        # x <= (effective_attended / target_fraction) - total
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
            'needed_classes': 0,
            'projected_if_miss_one': proj_if_miss_next,
            'projected_if_attend_one': proj_if_attend_next,
            'projected_after_all_bunks': proj_after_bunks,
            'message': f'You are safely above your {target}% target ({current_rate}%). You can miss up to {max_bunks} consecutive classes without falling below {target}%.'
        })
    else:
        # Needed: (effective_attended + y) / (total + y) >= target_fraction
        # y >= (target_fraction * total - effective_attended) / (1 - target_fraction)
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
            'message': f'Attendance shortage alert ({current_rate}% < {target}%). You must attend the next {needed} consecutive classes without any absence to restore eligibility.'
        })

# ==========================================================
# 5. OTHER MODULE APIS
# ==========================================================

# Timetable
@app.route('/api/timetable', methods=['GET'])
def get_timetable():
    day = int(request.args.get('day', 1))
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM timetable WHERE day_of_week = ? ORDER BY id ASC", (day,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'day': day, 'schedule': rows})

# Assignments
@app.route('/api/assignments', methods=['GET'])
def get_assignments():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM assignments ORDER BY id ASC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'assignments': rows})

@app.route('/api/assignments/<int:assignment_id>/submit', methods=['POST'])
def submit_assignment(assignment_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE assignments SET status = 'Submitted' WHERE id = ?", (assignment_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': f'Assignment #{assignment_id} marked as submitted successfully.'})

# Notes & Study Materials
@app.route('/api/notes', methods=['GET'])
def get_notes():
    notes = [
        {'id': 1, 'course': 'CS601', 'title': 'Distributed Consensus & Replication Notes', 'type': 'PDF', 'size': '4.2 MB', 'author': 'Dr. Ramesh Rao'},
        {'id': 2, 'course': 'CS602', 'title': 'Supervised & Unsupervised Learning Slide Deck', 'type': 'PPTX', 'size': '11.5 MB', 'author': 'Prof. Ananya Sen'},
        {'id': 3, 'course': 'CS603', 'title': 'Compiler Design Complete Lab Manual', 'type': 'PDF', 'size': '2.1 MB', 'author': 'Dr. K. V. Sharma'},
        {'id': 4, 'course': 'CS604', 'title': 'AWS Cloud Services & IaC Cheat Sheet', 'type': 'PDF', 'size': '3.4 MB', 'author': 'Prof. Vikram Hegde'}
    ]
    return jsonify({'notes': notes})

# Examinations
@app.route('/api/examinations', methods=['GET'])
def get_examinations():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM examinations ORDER BY exam_date ASC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'examinations': rows})

# SGPA / CGPA Calculator
@app.route('/api/gpa/calculate', methods=['POST'])
def calculate_gpa():
    data = request.get_json() or {}
    courses = data.get('courses', [])
    total_pts = 0
    total_credits = 0

    for c in courses:
        credits = int(c.get('credits', 3))
        grade = c.get('grade', 'A').strip().upper()
        pts = GRADE_POINTS.get(grade, 8)
        total_pts += (credits * pts)
        total_credits += credits

    sgpa = round(total_pts / total_credits, 2) if total_credits > 0 else 0.0
    return jsonify({'sgpa': sgpa, 'total_credits': total_credits})

# Student Profile
@app.route('/api/profile', methods=['GET', 'PUT'])
def handle_profile():
    conn = get_db()
    cursor = conn.cursor()
    if request.method == 'PUT':
        data = request.get_json() or {}
        phone = data.get('phone', '')
        cursor.execute("UPDATE student_profiles SET phone = ? WHERE id = 1", (phone,))
        conn.commit()
    cursor.execute("SELECT * FROM student_profiles LIMIT 1")
    profile = dict(cursor.fetchone())
    conn.close()
    return jsonify({'profile': profile})

# Placements
@app.route('/api/placements', methods=['GET'])
def get_placements():
    drives = [
        {'id': 1, 'company': 'Microsoft', 'role': 'Software Development Engineer', 'ctc': '₹32.0 LPA', 'deadline': '2026-11-15', 'min_cgpa': 8.0, 'status': 'Open'},
        {'id': 2, 'company': 'Amazon', 'role': 'Cloud Support Associate', 'ctc': '₹22.5 LPA', 'deadline': '2026-11-20', 'min_cgpa': 7.5, 'status': 'Open'},
        {'id': 3, 'company': 'Cisco', 'role': 'Network Software Engineer', 'ctc': '₹19.0 LPA', 'deadline': '2026-11-28', 'min_cgpa': 7.0, 'status': 'Open'}
    ]
    return jsonify({'drives': drives})

# Projects Hub
@app.route('/api/projects', methods=['GET', 'POST'])
def handle_projects():
    if request.method == 'POST':
        data = request.get_json() or {}
        return jsonify({'message': 'Project registered successfully.', 'project': data}), 201
    projects = [
        {'id': 1, 'title': 'Autonomous Drone Telemetry Mesh', 'guide': 'Dr. Ramesh Rao', 'stack': 'Go, gRPC, WebRTC', 'open_roles': 1, 'status': 'Active'},
        {'id': 2, 'title': 'Blockchain Academic Verifier', 'guide': 'Dr. Priya Nambiar', 'stack': 'Solidity, React', 'open_roles': 0, 'status': 'Completed'}
    ]
    return jsonify({'projects': projects})

# Events & Clubs
@app.route('/api/events', methods=['GET'])
def get_events():
    events = [
        {'id': 1, 'title': 'Annual Inter-College Hackathon 2026', 'organizer': 'ACM Chapter', 'date': '2026-11-18', 'venue': 'Main Auditorium'},
        {'id': 2, 'title': 'Machine Learning Workshop with Industry Mentors', 'organizer': 'AI Club', 'date': '2026-11-24', 'venue': 'Seminar Hall 2'}
    ]
    return jsonify({'events': events})

# Library
@app.route('/api/library', methods=['GET'])
def get_library():
    books = [
        {'id': 1, 'title': 'Distributed Systems Principles', 'author': 'Tanenbaum', 'isbn': '978-0132392273', 'due_date': '2026-11-14', 'days_left': 12},
        {'id': 2, 'title': 'Pattern Recognition and Machine Learning', 'author': 'Bishop', 'isbn': '978-0387310732', 'due_date': '2026-11-18', 'days_left': 16}
    ]
    return jsonify({'borrowed_books': books})

# Campus Services
@app.route('/api/services', methods=['GET'])
def get_services():
    return jsonify({
        'shuttle_bus': {'route': 'Route 14 (Electronic City)', 'status': 'On Time', 'next_stop': 'Silk Board Junction (08:25 AM)'},
        'cafeteria': {'status': 'Open', 'crowd_level': 'Moderate', 'specials': 'Veg Thali, Paneer Wrap, Fresh Juice'}
    })

# Notifications
@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM announcements ORDER BY id DESC")
    announcements = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'notifications': announcements})

# Performance Analytics
@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    return jsonify({
        'sgpa_history': [
            {'semester': 'Sem 1', 'sgpa': 9.30},
            {'semester': 'Sem 2', 'sgpa': 9.15},
            {'semester': 'Sem 3', 'sgpa': 8.95},
            {'semester': 'Sem 4', 'sgpa': 9.08},
            {'semester': 'Sem 5', 'sgpa': 9.24},
            {'semester': 'Sem 6', 'sgpa': 9.18}
        ],
        'subject_averages': [
            {'subject': 'Distributed Systems', 'marks': 92, 'attendance': 87.5},
            {'subject': 'Machine Learning', 'marks': 90, 'attendance': 86.4},
            {'subject': 'Compiler Design', 'marks': 84, 'attendance': 91.7},
            {'subject': 'Cloud Architecture', 'marks': 89, 'attendance': 79.5}
        ]
    })

# Faculty Doubt Portal
@app.route('/api/doubts', methods=['GET', 'POST'])
def handle_doubts():
    if request.method == 'POST':
        data = request.get_json() or {}
        return jsonify({'message': 'Question submitted to course instructor.', 'doubt': data}), 201
    doubts = [
        {'id': 1, 'course': 'CS601', 'question': 'In Raft consensus, how does the leader handle stale heartbeat partitions?', 'author': 'Alex Kumar', 'status': 'Answered', 'reply': 'The higher term number from healed cluster forces stale leader to downgrade to follower.'},
        {'id': 2, 'course': 'CS603', 'question': 'Difference between L-attributed and S-attributed SDDs?', 'author': 'Alex Kumar', 'status': 'Answered', 'reply': 'S-attributed uses only synthesized attributes; L-attributed can use inherited attributes from left siblings/parent.'}
    ]
    return jsonify({'doubts': doubts})

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
