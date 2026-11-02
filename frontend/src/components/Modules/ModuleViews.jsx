import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api';

// 1. ACADEMIC PERFORMANCE
export function AcademicPerformanceView() {
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/academics/performance')
      .then(res => setMarks(res.marks || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="panel-card">
      <div className="panel-card-header">
        <h3 className="panel-card-title">Subject-Wise Marks & Grades</h3>
      </div>
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Course Code</th>
              <th>Course Title</th>
              <th>Credits</th>
              <th>Internal</th>
              <th>Lab</th>
              <th>End-Sem</th>
              <th>Total (/100)</th>
              <th>Grade</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9">Loading performance records...</td></tr>
            ) : (
              marks.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.course_code}</strong></td>
                  <td>{m.course_title}</td>
                  <td>{m.credits}</td>
                  <td>{m.internal_marks}</td>
                  <td>{m.lab_marks}</td>
                  <td>{m.external_marks}</td>
                  <td><strong>{m.total_marks}</strong></td>
                  <td><span className="status-pill status-neutral">{m.grade}</span></td>
                  <td><span className="status-pill status-success">{m.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 2. ATTENDANCE
export function AttendanceView() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/attendance')
      .then(res => setList(res.attendance || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="panel-card">
      <div className="panel-card-header">
        <h3 className="panel-card-title">Course Attendance Register</h3>
        <span className="status-pill status-success">Threshold: 75%</span>
      </div>
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Faculty</th>
              <th>Attended</th>
              <th>Total</th>
              <th>Percentage</th>
              <th>Safe Bunks Left</th>
              <th>Eligibility</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7">Loading attendance logs...</td></tr>
            ) : (
              list.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.course_code}</strong> - {item.course_title}</td>
                  <td>{item.faculty_name}</td>
                  <td>{item.attended_hours} hrs</td>
                  <td>{item.total_hours} hrs</td>
                  <td><strong>{item.percentage}%</strong></td>
                  <td>{item.safe_bunks} classes</td>
                  <td>
                    <span className={`status-pill ${item.percentage >= 75 ? 'status-success' : 'status-danger'}`}>
                      {item.percentage >= 75 ? 'Eligible' : 'Shortage'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 3. ATTENDANCE CALCULATOR
export function AttendanceCalculatorView() {
  const [total, setTotal] = useState(48);
  const [attended, setAttended] = useState(43);
  const [target, setTarget] = useState(75);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const calculate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await apiRequest('/attendance/calculate', {
        method: 'POST',
        body: JSON.stringify({
          total_hours: parseInt(total, 10),
          attended_hours: parseInt(attended, 10),
          target_percentage: parseFloat(target)
        })
      });
      setResult(res);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="panel-card" style={{ maxWidth: '600px' }}>
      <div className="panel-card-header">
        <h3 className="panel-card-title">Attendance Target & Bunk Calculator</h3>
      </div>
      <div className="panel-card-body">
        {error && <div className="alert-box alert-danger">{error}</div>}
        <form onSubmit={calculate}>
          <div className="form-group">
            <label>Total Classes Conducted</label>
            <input
              type="number"
              min="1"
              required
              className="form-input"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Classes Attended</label>
            <input
              type="number"
              min="0"
              required
              className="form-input"
              value={attended}
              onChange={(e) => setAttended(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Target Minimum Attendance (%)</label>
            <input
              type="number"
              min="1"
              max="100"
              required
              className="form-input"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary">Compute Projection</button>
        </form>

        {result && (
          <div style={{ marginTop: '20px', padding: '14px', background: '#f8fafc', border: '1px solid #d1d5db' }}>
            <div>Current Rate: <strong>{result.current_percentage}%</strong></div>
            <div style={{ marginTop: '6px' }}>Status: <span className={`status-pill ${result.status === 'Eligible' ? 'status-success' : 'status-danger'}`}>{result.status}</span></div>
            <p style={{ marginTop: '8px', fontSize: '13px', color: '#1e293b' }}>{result.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// 4. TIMETABLE
export function TimetableView() {
  const [day, setDay] = useState(2);
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    apiRequest(`/timetable?day=${day}`)
      .then(res => setSlots(res.schedule || []))
      .catch(console.error);
  }, [day]);

  return (
    <div className="panel-card">
      <div className="panel-card-header">
        <h3 className="panel-card-title">Weekly Lecture & Lab Schedule</h3>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[1, 2, 3, 4, 5].map((d) => (
            <button
              key={d}
              type="button"
              className={`btn-secondary ${day === d ? 'active' : ''}`}
              style={{ background: day === d ? '#1e3a8a' : '#ffffff', color: day === d ? '#ffffff' : '#1e293b' }}
              onClick={() => setDay(d)}
            >
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][d - 1]}
            </button>
          ))}
        </div>
      </div>
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Time Slot</th>
              <th>Course Code</th>
              <th>Course Name</th>
              <th>Room</th>
              <th>Instructor</th>
            </tr>
          </thead>
          <tbody>
            {slots.length > 0 ? (
              slots.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.time_slot}</strong></td>
                  <td>{s.course_code}</td>
                  <td>{s.course_title}</td>
                  <td>{s.room}</td>
                  <td>{s.faculty_name}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="5">No lectures scheduled on this day.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 5. ASSIGNMENTS
export function AssignmentsView() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAssignments = () => {
    apiRequest('/assignments')
      .then(res => setAssignments(res.assignments || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  const handleSubmit = async (id) => {
    try {
      await apiRequest(`/assignments/${id}/submit`, { method: 'POST' });
      loadAssignments();
    } catch (err) {
      alert(`Error submitting: ${err.message}`);
    }
  };

  return (
    <div className="panel-card">
      <div className="panel-card-header">
        <h3 className="panel-card-title">Continuous Evaluation Assignments</h3>
      </div>
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Title & Description</th>
              <th>Due Date</th>
              <th>Max Marks</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6">Loading assignments...</td></tr>
            ) : (
              assignments.map((a) => (
                <tr key={a.id}>
                  <td><strong>{a.course_code}</strong></td>
                  <td>
                    <strong>{a.title}</strong>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{a.description}</div>
                  </td>
                  <td>{a.due_date}</td>
                  <td>{a.max_marks}</td>
                  <td>
                    <span className={`status-pill ${a.status === 'Submitted' ? 'status-success' : 'status-warning'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td>
                    {a.status === 'Pending' ? (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleSubmit(a.id)}
                      >
                        Mark Submitted
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Submitted</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 6. NOTES & MATERIALS
export function NotesView() {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    apiRequest('/notes').then(res => setNotes(res.notes || [])).catch(console.error);
  }, []);

  return (
    <div className="panel-card">
      <div className="panel-card-header">
        <h3 className="panel-card-title">Subject Notes & Reference Vault</h3>
      </div>
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Material Title</th>
              <th>Format</th>
              <th>Size</th>
              <th>Faculty</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {notes.map((n) => (
              <tr key={n.id}>
                <td><strong>{n.course}</strong></td>
                <td>{n.title}</td>
                <td>{n.type}</td>
                <td>{n.size}</td>
                <td>{n.author}</td>
                <td>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => alert(`Starting download for: ${n.title}`)}
                  >
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 7. EXAMINATIONS
export function ExaminationsView() {
  const [exams, setExams] = useState([]);

  useEffect(() => {
    apiRequest('/examinations').then(res => setExams(res.examinations || [])).catch(console.error);
  }, []);

  return (
    <div>
      <div className="panel-card">
        <div className="panel-card-header">
          <h3 className="panel-card-title">End-Semester Examination Time Table</h3>
          <button type="button" className="btn-secondary" onClick={() => window.print()}>
            Print Hall Ticket
          </button>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Subject Name</th>
                <th>Exam Date</th>
                <th>Time Slot</th>
                <th>Room / Hall</th>
                <th>Seat Allotment</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((ex) => (
                <tr key={ex.id}>
                  <td><strong>{ex.course_code}</strong></td>
                  <td>{ex.course_title}</td>
                  <td>{ex.exam_date}</td>
                  <td>{ex.time_slot}</td>
                  <td>{ex.exam_hall}</td>
                  <td>{ex.seat_number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// 8. SGPA & CGPA CALCULATOR
export function GpaCalculatorView() {
  const [courses, setCourses] = useState([
    { name: 'Distributed Systems', credits: 4, grade: 'O' },
    { name: 'Machine Learning', credits: 4, grade: 'O' },
    { name: 'Compiler Design', credits: 4, grade: 'A+' },
    { name: 'Cloud Architecture', credits: 3, grade: 'A+' }
  ]);
  const [sgpa, setSgpa] = useState(null);

  const calculate = async () => {
    const res = await apiRequest('/gpa/calculate', {
      method: 'POST',
      body: JSON.stringify({ courses })
    });
    setSgpa(res.sgpa);
  };

  const addRow = () => {
    setCourses([...courses, { name: 'Elective Subject', credits: 3, grade: 'A' }]);
  };

  const updateCourse = (index, field, value) => {
    const copy = [...courses];
    copy[index][field] = value;
    setCourses(copy);
  };

  const removeRow = (index) => {
    setCourses(courses.filter((_, i) => i !== index));
  };

  return (
    <div className="panel-card" style={{ maxWidth: '700px' }}>
      <div className="panel-card-header">
        <h3 className="panel-card-title">Semester Grade Point Average (SGPA) Forecaster</h3>
        <button type="button" className="btn-secondary" onClick={addRow}>+ Add Course</button>
      </div>
      <div className="panel-card-body">
        <table className="data-table" style={{ marginBottom: '16px' }}>
          <thead>
            <tr>
              <th>Course Name</th>
              <th>Credits</th>
              <th>Expected Grade</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c, i) => (
              <tr key={i}>
                <td>
                  <input
                    type="text"
                    className="form-input"
                    value={c.name}
                    onChange={(e) => updateCourse(i, 'name', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    className="form-input"
                    style={{ width: '60px' }}
                    value={c.credits}
                    onChange={(e) => updateCourse(i, 'credits', e.target.value)}
                  />
                </td>
                <td>
                  <select
                    className="form-select"
                    value={c.grade}
                    onChange={(e) => updateCourse(i, 'grade', e.target.value)}
                  >
                    {['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'F'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <button type="button" className="btn-secondary" onClick={() => removeRow(i)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button type="button" className="btn-primary" onClick={calculate}>Compute SGPA</button>

        {sgpa !== null && (
          <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', border: '1px solid #d1d5db' }}>
            Predicted Semester SGPA: <strong>{sgpa} / 10.00</strong>
          </div>
        )}
      </div>
    </div>
  );
}

// 9. STUDENT PROFILE
export function StudentProfileView() {
  const [profile, setProfile] = useState(null);
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    apiRequest('/profile').then(res => {
      setProfile(res.profile);
      setPhone(res.profile.phone || '');
    }).catch(console.error);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    await apiRequest('/profile', {
      method: 'PUT',
      body: JSON.stringify({ phone })
    });
    setMsg('Contact details updated successfully.');
  };

  if (!profile) return <div>Loading profile...</div>;

  return (
    <div className="panel-card" style={{ maxWidth: '600px' }}>
      <div className="panel-card-header">
        <h3 className="panel-card-title">Official Student Registry</h3>
      </div>
      <div className="panel-card-body">
        {msg && <div className="alert-box alert-success">{msg}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div><label className="stat-label">Full Name</label><div><strong>{profile.name}</strong></div></div>
          <div><label className="stat-label">USN</label><div><strong>{profile.usn}</strong></div></div>
          <div><label className="stat-label">Department</label><div>{profile.department}</div></div>
          <div><label className="stat-label">Semester & Section</label><div>Semester {profile.semester} - Section {profile.section}</div></div>
          <div><label className="stat-label">Cumulative CGPA</label><div>{profile.cgpa}</div></div>
          <div><label className="stat-label">Attendance Record</label><div>{profile.overall_attendance}%</div></div>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Emergency Contact Phone</label>
            <input
              type="text"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary">Update Contact</button>
        </form>
      </div>
    </div>
  );
}

// 10. PLACEMENTS
export function PlacementsView() {
  const [drives, setDrives] = useState([]);

  useEffect(() => {
    apiRequest('/placements').then(res => setDrives(res.drives || [])).catch(console.error);
  }, []);

  const apply = (id, company) => {
    alert(`Application submitted for ${company} recruitment drive.`);
  };

  return (
    <div className="panel-card">
      <div className="panel-card-header">
        <h3 className="panel-card-title">Campus Recruitment Drives</h3>
      </div>
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Position</th>
              <th>Compensation</th>
              <th>Min CGPA</th>
              <th>Deadline</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {drives.map((d) => (
              <tr key={d.id}>
                <td><strong>{d.company}</strong></td>
                <td>{d.role}</td>
                <td>{d.ctc}</td>
                <td>{d.min_cgpa}</td>
                <td>{d.deadline}</td>
                <td>
                  <button type="button" className="btn-secondary" onClick={() => apply(d.id, d.company)}>
                    Apply
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 11. PROJECTS HUB
export function ProjectsView() {
  const [projects, setProjects] = useState([]);
  const [title, setTitle] = useState('');
  const [guide, setGuide] = useState('');

  const loadProjects = () => {
    apiRequest('/projects').then(res => setProjects(res.projects || [])).catch(console.error);
  };

  useEffect(() => { loadProjects(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title || !guide) return;
    await apiRequest('/projects', {
      method: 'POST',
      body: JSON.stringify({ title, guide, stack: 'Full Stack', open_roles: 1, status: 'Active' })
    });
    setTitle('');
    setGuide('');
    loadProjects();
  };

  return (
    <div>
      <div className="panel-card" style={{ marginBottom: '20px' }}>
        <div className="panel-card-header"><h3 className="panel-card-title">Register New Academic Project</h3></div>
        <div className="panel-card-body">
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Project Title"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              type="text"
              placeholder="Faculty Guide"
              className="form-input"
              value={guide}
              onChange={(e) => setGuide(e.target.value)}
            />
            <button type="submit" className="btn-primary" style={{ width: '160px' }}>Register</button>
          </form>
        </div>
      </div>

      <div className="panel-card">
        <div className="panel-card-header"><h3 className="panel-card-title">Capstone & Research Projects</h3></div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project Title</th>
                <th>Faculty Guide</th>
                <th>Tech Stack</th>
                <th>Open Slots</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id || Math.random()}>
                  <td><strong>{p.title}</strong></td>
                  <td>{p.guide}</td>
                  <td>{p.stack}</td>
                  <td>{p.open_roles}</td>
                  <td><span className="status-pill status-neutral">{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// 12. EVENTS
export function EventsView() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    apiRequest('/events').then(res => setEvents(res.events || [])).catch(console.error);
  }, []);

  return (
    <div className="panel-card">
      <div className="panel-card-header"><h3 className="panel-card-title">Campus Events & Technical Activities</h3></div>
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Event Title</th>
              <th>Organizer</th>
              <th>Date</th>
              <th>Location</th>
              <th>Registration</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id}>
                <td><strong>{ev.title}</strong></td>
                <td>{ev.organizer}</td>
                <td>{ev.date}</td>
                <td>{ev.venue}</td>
                <td>
                  <button type="button" className="btn-secondary" onClick={() => alert(`Registered for ${ev.title}`)}>
                    Register
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 13. LIBRARY
export function LibraryView() {
  const [books, setBooks] = useState([]);

  useEffect(() => {
    apiRequest('/library').then(res => setBooks(res.borrowed_books || [])).catch(console.error);
  }, []);

  const handleRenew = (title) => {
    alert(`Loan for "${title}" extended by 14 days.`);
  };

  return (
    <div className="panel-card">
      <div className="panel-card-header"><h3 className="panel-card-title">Issued Library Textbooks</h3></div>
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Book Title</th>
              <th>Author</th>
              <th>ISBN</th>
              <th>Return Due Date</th>
              <th>Days Left</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {books.map((b) => (
              <tr key={b.id}>
                <td><strong>{b.title}</strong></td>
                <td>{b.author}</td>
                <td>{b.isbn}</td>
                <td>{b.due_date}</td>
                <td>{b.days_left} days</td>
                <td>
                  <button type="button" className="btn-secondary" onClick={() => handleRenew(b.title)}>
                    Renew Loan
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 14. CAMPUS SERVICES
export function CampusServicesView() {
  const [services, setServices] = useState(null);

  useEffect(() => {
    apiRequest('/services').then(setServices).catch(console.error);
  }, []);

  if (!services) return <div>Loading campus services...</div>;

  return (
    <div className="dashboard-sections-grid">
      <div className="panel-card">
        <div className="panel-card-header"><h3 className="panel-card-title">Campus Shuttle Bus Transit</h3></div>
        <div className="panel-card-body">
          <div style={{ marginBottom: '8px' }}>Route: <strong>{services.shuttle_bus.route}</strong></div>
          <div style={{ marginBottom: '8px' }}>Schedule Status: <span className="status-pill status-success">{services.shuttle_bus.status}</span></div>
          <div>Current Transit Point: <strong>{services.shuttle_bus.next_stop}</strong></div>
        </div>
      </div>

      <div className="panel-card">
        <div className="panel-card-header"><h3 className="panel-card-title">Central Dining & Food Court</h3></div>
        <div className="panel-card-body">
          <div style={{ marginBottom: '8px' }}>Status: <span className="status-pill status-success">{services.cafeteria.status}</span></div>
          <div style={{ marginBottom: '8px' }}>Current Footfall: <strong>{services.cafeteria.crowd_level}</strong></div>
          <div>Menu Highlights: {services.cafeteria.specials}</div>
        </div>
      </div>
    </div>
  );
}

// 15. NOTIFICATIONS
export function NotificationsView() {
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    apiRequest('/notifications').then(res => setNotifs(res.notifications || [])).catch(console.error);
  }, []);

  return (
    <div className="panel-card">
      <div className="panel-card-header"><h3 className="panel-card-title">Institutional Circulars & Notices</h3></div>
      <div className="panel-card-body">
        <ul className="item-list">
          {notifs.map((n) => (
            <li key={n.id} className="list-item">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="list-item-title">{n.title}</span>
                <span className="status-pill status-neutral">{n.published_date}</span>
              </div>
              <div className="list-item-desc">{n.content}</div>
              <div className="list-item-meta">Issuing Authority: {n.department}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// 16. PERFORMANCE ANALYTICS
export function PerformanceAnalyticsView() {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    apiRequest('/analytics').then(setAnalytics).catch(console.error);
  }, []);

  if (!analytics) return <div>Loading analytics data...</div>;

  return (
    <div>
      <div className="panel-card">
        <div className="panel-card-header"><h3 className="panel-card-title">Semester-Wise SGPA Progression</h3></div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                {analytics.sgpa_history.map(s => <th key={s.semester}>{s.semester}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                {analytics.sgpa_history.map(s => <td key={s.semester}><strong>{s.sgpa}</strong></td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel-card">
        <div className="panel-card-header"><h3 className="panel-card-title">Subject Mastery vs Attendance Rate</h3></div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Subject Name</th>
                <th>Final Marks Percentage</th>
                <th>Lecture Attendance</th>
              </tr>
            </thead>
            <tbody>
              {analytics.subject_averages.map((sub) => (
                <tr key={sub.subject}>
                  <td><strong>{sub.subject}</strong></td>
                  <td>{sub.marks}%</td>
                  <td>{sub.attendance}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// 17. FACULTY DOUBT PORTAL
export function FacultyDoubtPortalView() {
  const [doubts, setDoubts] = useState([]);
  const [course, setCourse] = useState('CS601');
  const [question, setQuestion] = useState('');

  const loadDoubts = () => {
    apiRequest('/doubts').then(res => setDoubts(res.doubts || [])).catch(console.error);
  };

  useEffect(() => { loadDoubts(); }, []);

  const handlePostDoubt = async (e) => {
    e.preventDefault();
    if (!question) return;
    await apiRequest('/doubts', {
      method: 'POST',
      body: JSON.stringify({ course, question })
    });
    setQuestion('');
    loadDoubts();
    alert('Doubt submitted to course instructor.');
  };

  return (
    <div>
      <div className="panel-card" style={{ marginBottom: '20px' }}>
        <div className="panel-card-header"><h3 className="panel-card-title">Submit Academic Doubt to Faculty</h3></div>
        <div className="panel-card-body">
          <form onSubmit={handlePostDoubt}>
            <div className="form-group">
              <label>Course Subject</label>
              <select className="form-select" value={course} onChange={(e) => setCourse(e.target.value)}>
                <option value="CS601">CS601: Distributed Systems</option>
                <option value="CS602">CS602: Machine Learning</option>
                <option value="CS603">CS603: Compiler Design</option>
                <option value="CS604">CS604: Cloud Architecture</option>
              </select>
            </div>
            <div className="form-group">
              <label>Your Question</label>
              <textarea
                rows="3"
                className="form-textarea"
                required
                placeholder="State the concept or algorithm question clearly..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary">Post Question</button>
          </form>
        </div>
      </div>

      <div className="panel-card">
        <div className="panel-card-header"><h3 className="panel-card-title">Q&A Resolution Stream</h3></div>
        <div className="panel-card-body">
          <ul className="item-list">
            {doubts.map((d) => (
              <li key={d.id || Math.random()} className="list-item">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{d.course}</strong>
                  <span className="status-pill status-success">{d.status}</span>
                </div>
                <div style={{ marginTop: '4px', fontSize: '13px' }}>{d.question}</div>
                {d.reply && (
                  <div style={{ marginTop: '8px', padding: '8px 12px', background: '#f8fafc', borderLeft: '3px solid #1e3a8a', fontSize: '12px' }}>
                    <strong>Faculty Response:</strong> {d.reply}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
