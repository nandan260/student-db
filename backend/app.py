import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from database import get_db, init_db

FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist'))
app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path='')
CORS(app, resources={r"/api/*": {"origins": "*"}})

init_db()

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
        'semester': 6,
        'overall_attendance': 88.4,
        'cgpa': 9.12
    }

    # Upcoming examinations
    cursor.execute("SELECT * FROM examinations ORDER BY exam_date ASC LIMIT 5")
    exams = [dict(r) for r in cursor.fetchall()]

    # Pending assignments
    cursor.execute("SELECT * FROM assignments WHERE status = 'Pending' ORDER BY due_date ASC LIMIT 5")
    pending_assignments = [dict(r) for r in cursor.fetchall()]

    # Recent announcements
    cursor.execute("SELECT * FROM announcements ORDER BY id DESC LIMIT 5")
    announcements = [dict(r) for r in cursor.fetchall()]

    # Attendance aggregation
    cursor.execute("SELECT SUM(attended_hours) as attended, SUM(total_hours) as total FROM attendance WHERE user_id = 1")
    att_agg = cursor.fetchone()
    if att_agg and att_agg['total'] and att_agg['total'] > 0:
        calculated_att = round((att_agg['attended'] / att_agg['total']) * 100, 1)
        profile['overall_attendance'] = calculated_att

    # Calculate semester SGPA from marks
    cursor.execute("SELECT credits, total_marks, grade FROM academic_marks WHERE user_id = 1 AND semester = ?", (profile['semester'],))
    marks_rows = cursor.fetchall()
    grade_pts = {'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'P': 4, 'F': 0}
    total_pts = 0
    total_cr = 0
    for m in marks_rows:
        cr = m['credits']
        pts = grade_pts.get(m['grade'], 8)
        total_pts += (cr * pts)
        total_cr += cr
    current_sgpa = round(total_pts / total_cr, 2) if total_cr > 0 else profile.get('cgpa', 9.12)

    conn.close()

    return jsonify({
        'student': {
            'name': profile['name'],
            'usn': profile['usn'],
            'department': profile['department'],
            'semester': profile['semester'],
            'overall_attendance': profile['overall_attendance'],
            'current_sgpa': current_sgpa,
            'cgpa': profile.get('cgpa', 9.12)
        },
        'upcoming_examinations': exams,
        'pending_assignments': pending_assignments,
        'recent_announcements': announcements
    })

# ==========================================================
# 2. MODULE APIS
# ==========================================================

# Academic Performance
@app.route('/api/academics/performance', methods=['GET'])
def get_performance():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM academic_marks ORDER BY semester DESC, course_code ASC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'marks': rows})

# Attendance & Attendance Calculator
@app.route('/api/attendance', methods=['GET'])
def get_attendance():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM attendance ORDER BY course_code ASC")
    rows = []
    for r in cursor.fetchall():
        item = dict(r)
        total = item['total_hours']
        att = item['attended_hours']
        item['percentage'] = round((att / total) * 100, 1) if total > 0 else 0.0
        if item['percentage'] >= 75.0:
            item['safe_bunks'] = max(0, int((att / 0.75) - total))
            item['needed_to_reach_75'] = 0
        else:
            item['safe_bunks'] = 0
            item['needed_to_reach_75'] = int(((0.75 * total) - att) / 0.25) + 1
        rows.append(item)
    conn.close()
    return jsonify({'attendance': rows})

@app.route('/api/attendance/calculate', methods=['POST'])
def calculate_attendance():
    data = request.get_json() or {}
    total = int(data.get('total_hours', 1))
    attended = int(data.get('attended_hours', 0))
    target = float(data.get('target_percentage', 75.0))

    if total <= 0 or attended < 0 or attended > total:
        return jsonify({'error': 'Invalid hours entered.'}), 400

    current_rate = round((attended / total) * 100, 1)
    target_fraction = target / 100.0

    if current_rate >= target:
        max_bunks = int((attended / target_fraction) - total)
        return jsonify({
            'current_percentage': current_rate,
            'status': 'Eligible',
            'max_bunks': max_bunks,
            'message': f'You are above {target}%. You can safely miss up to {max_bunks} upcoming classes.'
        })
    else:
        needed = int(((target_fraction * total) - attended) / (1 - target_fraction)) + 1
        return jsonify({
            'current_percentage': current_rate,
            'status': 'Shortage',
            'needed_classes': needed,
            'message': f'Attendance shortage! You must attend the next {needed} consecutive classes.'
        })

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
    grade_map = {'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'P': 4, 'F': 0}
    total_pts = 0
    total_credits = 0

    for c in courses:
        credits = int(c.get('credits', 3))
        grade = c.get('grade', 'A').strip().upper()
        pts = grade_map.get(grade, 8)
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
