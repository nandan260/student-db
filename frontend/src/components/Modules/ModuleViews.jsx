import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../api';

// ==========================================================
// 1. ACADEMIC PERFORMANCE MODULE
// ==========================================================
export function AcademicPerformanceView() {
  const [data, setData] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(6);
  const [loading, setLoading] = useState(true);
  const [editingMark, setEditingMark] = useState(null);
  const [formInternal, setFormInternal] = useState(0);
  const [formLab, setFormLab] = useState(0);
  const [formExternal, setFormExternal] = useState(0);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  const loadPerformance = (sem) => {
    setLoading(true);
    apiRequest(`/academics/performance?semester=${sem}`)
      .then(res => {
        setData(res);
        setSelectedSemester(res.selected_semester);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPerformance(selectedSemester);
  }, [selectedSemester]);

  const openEditModal = (mark) => {
    setEditingMark(mark);
    setFormInternal(mark.internal_marks);
    setFormLab(mark.lab_marks);
    setFormExternal(mark.external_marks);
    setEditError('');
    setEditSuccess('');
  };

  const handleUpdateMarks = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');

    try {
      const res = await apiRequest(`/academics/marks/${editingMark.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          internal_marks: parseInt(formInternal, 10),
          lab_marks: parseInt(formLab, 10),
          external_marks: parseInt(formExternal, 10)
        })
      });
      setEditSuccess(res.message);
      setTimeout(() => {
        setEditingMark(null);
        loadPerformance(selectedSemester);
      }, 1000);
    } catch (err) {
      setEditError(err.message);
    }
  };

  const calcPreviewTotal = parseInt(formInternal || 0, 10) + parseInt(formLab || 0, 10) + parseInt(formExternal || 0, 10);
  let previewGrade = 'F';
  if (calcPreviewTotal >= 90) previewGrade = 'O';
  else if (calcPreviewTotal >= 80) previewGrade = 'A+';
  else if (calcPreviewTotal >= 70) previewGrade = 'A';
  else if (calcPreviewTotal >= 60) previewGrade = 'B+';
  else if (calcPreviewTotal >= 55) previewGrade = 'B';
  else if (calcPreviewTotal >= 50) previewGrade = 'C';
  else if (calcPreviewTotal >= 40) previewGrade = 'P';

  return (
    <div>
      {/* Semester Header & Grade Summary */}
      <div className="banner-card">
        <div>
          <div className="banner-title">Academic Marks & Semester Transcript</div>
          <div className="banner-sub">
            Review Continuous Internal Evaluation (CIE) and Semester End Examination (SEE) scores.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ fontSize: '13px', fontWeight: '600' }}>Select Semester:</label>
          <select
            className="form-select"
            style={{ width: '150px' }}
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(parseInt(e.target.value, 10))}
          >
            {data?.available_semesters?.map((s) => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Semester SGPA</div>
          <div className="stat-value">{data?.sgpa ?? '--'}</div>
          <div className="stat-footer">Computed for Semester {selectedSemester}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cumulative CGPA</div>
          <div className="stat-value">{data?.cgpa ?? '--'}</div>
          <div className="stat-footer">Across All Recorded Semesters</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Credits</div>
          <div className="stat-value">{data?.total_credits ?? 0}</div>
          <div className="stat-footer">Course Credits Earned</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Semester Result</div>
          <div className="stat-value">
            <span className={`status-pill ${data?.result_status === 'PASS' ? 'status-success' : 'status-danger'}`}>
              {data?.result_status || 'PASS'}
            </span>
          </div>
          <div className="stat-footer">{data?.passed_subjects} Passed, {data?.failed_subjects} Backlogs</div>
        </div>
      </div>

      {/* Subject-Wise Marks Table */}
      <div className="panel-card">
        <div className="panel-card-header">
          <h3 className="panel-card-title">Subject-Wise Marks Breakdown (Semester {selectedSemester})</h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Faculty & Admins can click "Edit Marks" to update scores
          </span>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Course Code</th>
                <th>Course Title</th>
                <th>Credits</th>
                <th>Internal (IA /30)</th>
                <th>Lab / Practical (/20)</th>
                <th>External Exam (/50)</th>
                <th>Total Marks (/100)</th>
                <th>Grade</th>
                <th>Status</th>
                <th>Faculty Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="10" style={{ textAlign: 'center' }}>Loading marks...</td></tr>
              ) : (
                data?.marks?.map((m) => (
                  <tr key={m.id}>
                    <td><strong>{m.course_code}</strong></td>
                    <td>{m.course_title}</td>
                    <td>{m.credits}</td>
                    <td>{m.internal_marks} / 30</td>
                    <td>{m.lab_marks} / 20</td>
                    <td>{m.external_marks} / 50</td>
                    <td><strong>{m.total_marks} / 100</strong></td>
                    <td>
                      <span className="status-pill status-neutral">
                        {m.grade}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${m.status === 'Pass' ? 'status-success' : 'status-danger'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => openEditModal(m)}
                      >
                        Edit Marks
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Faculty Marks Update Form Modal */}
      {editingMark && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="panel-card" style={{ width: '100%', maxWidth: '480px', margin: '20px' }}>
            <div className="panel-card-header">
              <h3 className="panel-card-title">Update Marks: {editingMark.course_code}</h3>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditingMark(null)}
              >
                Close
              </button>
            </div>
            <div className="panel-card-body">
              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '14px' }}>
                Course: <strong>{editingMark.course_title}</strong> (Credits: {editingMark.credits})
              </p>

              {editError && <div className="alert-box alert-danger">{editError}</div>}
              {editSuccess && <div className="alert-box alert-success">{editSuccess}</div>}

              <form onSubmit={handleUpdateMarks}>
                <div className="form-group">
                  <label>Continuous Internal Evaluation (IA1 + IA2) [Max: 30]</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    required
                    className="form-input"
                    value={formInternal}
                    onChange={(e) => setFormInternal(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Lab / Practical Marks [Max: 20]</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    required
                    className="form-input"
                    value={formLab}
                    onChange={(e) => setFormLab(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Semester End Exam (SEE) Score [Max: 50]</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    required
                    className="form-input"
                    value={formExternal}
                    onChange={(e) => setFormExternal(e.target.value)}
                  />
                </div>

                <div style={{ padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '13px' }}>
                  <div>Calculated Total: <strong>{calcPreviewTotal} / 100</strong></div>
                  <div style={{ marginTop: '4px' }}>Projected Grade: <strong>{previewGrade}</strong> ({calcPreviewTotal >= 40 && formExternal >= 18 ? 'Pass' : 'Fail'})</div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn-primary">Save Updated Marks</button>
                  <button type="button" className="btn-secondary" onClick={() => setEditingMark(null)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================
// 2. SMART ATTENDANCE MODULE
// ==========================================================
export function AttendanceView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Faculty Mark Attendance State
  const [markCourse, setMarkCourse] = useState('CS601');
  const [markAction, setMarkAction] = useState('present');
  const [markDate, setMarkDate] = useState('Today');
  const [markMessage, setMarkMessage] = useState('');
  const [markLoading, setMarkLoading] = useState(false);

  const loadAttendance = () => {
    setLoading(true);
    apiRequest('/attendance')
      .then(res => {
        setData(res);
        if (res.attendance && res.attendance.length > 0 && !markCourse) {
          setMarkCourse(res.attendance[0].course_code);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    setMarkMessage('');
    setMarkLoading(true);

    try {
      const res = await apiRequest('/attendance/mark', {
        method: 'POST',
        body: JSON.stringify({
          course_code: markCourse,
          action: markAction,
          date: markDate
        })
      });
      setMarkMessage(res.message);
      loadAttendance();
    } catch (err) {
      alert(`Error marking attendance: ${err.message}`);
    } finally {
      setMarkLoading(false);
    }
  };

  const summary = data?.overall_summary;
  const list = data?.attendance || [];

  return (
    <div>
      {/* Banner */}
      <div className="banner-card">
        <div>
          <div className="banner-title">Smart Attendance Register</div>
          <div className="banner-sub">
            Track conducted hours, present hours, absences, and official On-Duty (OD) credits.
          </div>
        </div>
        <div>
          <span className={`status-pill ${summary?.overall_percentage >= 75 ? 'status-success' : 'status-danger'}`}>
            Overall: {summary?.overall_percentage || 0}% ({summary?.overall_status})
          </span>
        </div>
      </div>

      {/* Aggregate KPI Deck */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Conducted</div>
          <div className="stat-value">{summary?.total_conducted || 0} hrs</div>
          <div className="stat-footer">All Courses Combined</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Attended Classes</div>
          <div className="stat-value" style={{ color: '#15803d' }}>{summary?.total_attended || 0} hrs</div>
          <div className="stat-footer">Regular Classes Attended</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Absent Classes</div>
          <div className="stat-value" style={{ color: '#b91c1c' }}>{summary?.total_absent || 0} hrs</div>
          <div className="stat-footer">Missed Sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">On-Duty (OD) Approved</div>
          <div className="stat-value" style={{ color: '#b45309' }}>{summary?.total_od || 0} hrs</div>
          <div className="stat-footer">Credited Sports/Symposiums</div>
        </div>
      </div>

      {/* Split Section: Subject-Wise Attendance and Faculty Mark Attendance Tool */}
      <div className="dashboard-sections-grid">
        {/* Subject-Wise Table */}
        <div className="panel-card" style={{ gridColumn: 'span 2' }}>
          <div className="panel-card-header">
            <h3 className="panel-card-title">Subject-Wise Attendance Details</h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Minimum 75% required for exam eligibility</span>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course Code</th>
                  <th>Course Title</th>
                  <th>Faculty</th>
                  <th>Conducted</th>
                  <th>Attended</th>
                  <th>Absent</th>
                  <th>On-Duty (OD)</th>
                  <th>Percentage</th>
                  <th>Safe Bunks Left</th>
                  <th>Eligibility Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="10" style={{ textAlign: 'center' }}>Loading attendance records...</td></tr>
                ) : (
                  list.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.course_code}</strong></td>
                      <td>{item.course_title}</td>
                      <td>{item.faculty_name}</td>
                      <td>{item.total_hours}</td>
                      <td style={{ color: '#15803d', fontWeight: '600' }}>{item.attended_hours}</td>
                      <td style={{ color: '#b91c1c', fontWeight: '600' }}>{item.absent_hours}</td>
                      <td style={{ color: '#b45309', fontWeight: '600' }}>{item.od_hours}</td>
                      <td>
                        <strong>{item.percentage}%</strong>
                      </td>
                      <td>
                        {item.percentage >= 75 ? (
                          <span style={{ color: '#1e3a8a', fontWeight: '600' }}>{item.safe_bunks} classes</span>
                        ) : (
                          <span style={{ color: '#b91c1c', fontWeight: '600' }}>Need {item.needed_to_reach_75} consecutive</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-pill ${item.percentage >= 75 ? 'status-success' : 'status-danger'}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Faculty Action: Mark Attendance */}
        <div className="panel-card">
          <div className="panel-card-header">
            <h3 className="panel-card-title">Faculty Portal: Log Class Session Attendance</h3>
          </div>
          <div className="panel-card-body">
            {markMessage && <div className="alert-box alert-success">{markMessage}</div>}
            <form onSubmit={handleMarkAttendance}>
              <div className="form-group">
                <label>Select Course</label>
                <select
                  className="form-select"
                  value={markCourse}
                  onChange={(e) => setMarkCourse(e.target.value)}
                >
                  {list.map((c) => (
                    <option key={c.course_code} value={c.course_code}>
                      {c.course_code}: {c.course_title} ({c.percentage}%)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Session Date</label>
                <input
                  type="text"
                  className="form-input"
                  value={markDate}
                  onChange={(e) => setMarkDate(e.target.value)}
                  placeholder="e.g. 2026-11-03 or Today"
                />
              </div>

              <div className="form-group">
                <label>Student Session Status</label>
                <div className="role-selector">
                  <button
                    type="button"
                    className={`role-btn ${markAction === 'present' ? 'active' : ''}`}
                    onClick={() => setMarkAction('present')}
                  >
                    Present (+1 Attended)
                  </button>
                  <button
                    type="button"
                    className={`role-btn ${markAction === 'absent' ? 'active' : ''}`}
                    onClick={() => setMarkAction('absent')}
                  >
                    Absent (+1 Absent)
                  </button>
                  <button
                    type="button"
                    className={`role-btn ${markAction === 'od' ? 'active' : ''}`}
                    onClick={() => setMarkAction('od')}
                  >
                    On-Duty (+1 OD)
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={markLoading}>
                {markLoading ? 'Recording Session...' : 'Submit Session Record'}
              </button>
            </form>
          </div>
        </div>

        {/* Attendance Regulation Guidelines */}
        <div className="panel-card">
          <div className="panel-card-header">
            <h3 className="panel-card-title">Academic Attendance Regulations</h3>
          </div>
          <div className="panel-card-body" style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
            <p style={{ marginBottom: '8px' }}>
              <strong>1. Minimum Compliance:</strong> Every student must maintain at least <strong>75% attendance</strong> in each registered course to be eligible to sit for the Semester End Examination (SEE).
            </p>
            <p style={{ marginBottom: '8px' }}>
              <strong>2. On-Duty (OD) Provisions:</strong> Formal OD credit is provided for authorized participation in university hackathons, research colloquiums, and inter-university sports championships.
            </p>
            <p>
              <strong>3. Condonation Window:</strong> Shortages between 65% and 74% can be considered only on medical grounds with hospital documentation approved by the Dean of Academic Affairs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================================
// 3. ATTENDANCE CALCULATOR MODULE
// ==========================================================
export function AttendanceCalculatorView() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [totalHours, setTotalHours] = useState(48);
  const [attendedHours, setAttendedHours] = useState(42);
  const [odHours, setOdHours] = useState(2);
  const [targetPercentage, setTargetPercentage] = useState(75);
  const [simulation, setSimulation] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiRequest('/attendance')
      .then(res => {
        const att = res.attendance || [];
        setCourses(att);
        if (att.length > 0) {
          const first = att[0];
          setSelectedCourse(first.course_code);
          setTotalHours(first.total_hours);
          setAttendedHours(first.attended_hours);
          setOdHours(first.od_hours || 0);
          // Initial auto-calc
          runCalculation(first.total_hours, first.attended_hours, first.od_hours || 0, 75, first.course_title);
        }
      })
      .catch(console.error);
  }, []);

  const handleCourseChange = (e) => {
    const code = e.target.value;
    setSelectedCourse(code);
    const found = courses.find(c => c.course_code === code);
    if (found) {
      setTotalHours(found.total_hours);
      setAttendedHours(found.attended_hours);
      setOdHours(found.od_hours || 0);
      runCalculation(found.total_hours, found.attended_hours, found.od_hours || 0, targetPercentage, found.course_title);
    }
  };

  const runCalculation = async (total, attended, od, target, courseName) => {
    setError('');
    setLoading(true);

    try {
      const res = await apiRequest('/attendance/calculate', {
        method: 'POST',
        body: JSON.stringify({
          total_hours: parseInt(total, 10),
          attended_hours: parseInt(attended, 10),
          od_hours: parseInt(od, 10),
          target_percentage: parseFloat(target),
          course_name: courseName || 'Selected Subject'
        })
      });
      setSimulation(res);
    } catch (err) {
      setError(err.message);
      setSimulation(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const found = courses.find(c => c.course_code === selectedCourse);
    runCalculation(totalHours, attendedHours, odHours, targetPercentage, found?.course_title || 'Subject');
  };

  return (
    <div>
      <div className="banner-card">
        <div>
          <div className="banner-title">Smart Attendance & Safe Bunk Calculator</div>
          <div className="banner-sub">
            Simulate future leaves or compute exact recovery sessions needed to meet institutional thresholds.
          </div>
        </div>
      </div>

      <div className="dashboard-sections-grid">
        {/* Parameters Form */}
        <div className="panel-card">
          <div className="panel-card-header">
            <h3 className="panel-card-title">Simulation Parameters</h3>
          </div>
          <div className="panel-card-body">
            {error && <div className="alert-box alert-danger">{error}</div>}

            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label>Load from Registered Subject (Optional)</label>
                <select
                  className="form-select"
                  value={selectedCourse}
                  onChange={handleCourseChange}
                >
                  <option value="">-- Manual Custom Entry --</option>
                  {courses.map((c) => (
                    <option key={c.course_code} value={c.course_code}>
                      {c.course_code}: {c.course_title} (Current: {c.percentage}%)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Total Classes Conducted</label>
                <input
                  type="number"
                  min="0"
                  required
                  className="form-input"
                  value={totalHours}
                  onChange={(e) => setTotalHours(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Classes Attended</label>
                <input
                  type="number"
                  min="0"
                  required
                  className="form-input"
                  value={attendedHours}
                  onChange={(e) => setAttendedHours(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>On-Duty (OD) Approved Classes</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={odHours}
                  onChange={(e) => setOdHours(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Required Compliance Percentage (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="0.5"
                  required
                  className="form-input"
                  value={targetPercentage}
                  onChange={(e) => setTargetPercentage(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Calculating...' : 'Run Attendance Simulation'}
              </button>
            </form>
          </div>
        </div>

        {/* Real Calculation Results & Projection */}
        <div className="panel-card">
          <div className="panel-card-header">
            <h3 className="panel-card-title">Calculation Outcome & Projections</h3>
            {simulation && (
              <span className={`status-pill ${simulation.status === 'Eligible' ? 'status-success' : 'status-danger'}`}>
                {simulation.current_percentage}% Current
              </span>
            )}
          </div>
          <div className="panel-card-body">
            {simulation ? (
              <div>
                {/* Result Hero Banner */}
                <div style={{
                  padding: '16px',
                  borderRadius: '4px',
                  backgroundColor: simulation.status === 'Eligible' ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${simulation.status === 'Eligible' ? '#bbf7d0' : '#fecaca'}`,
                  marginBottom: '16px'
                }}>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: simulation.status === 'Eligible' ? '#15803d' : '#b91c1c'
                  }}>
                    {simulation.status === 'Eligible' ? (
                      `${simulation.max_bunks} Safe Bunks Remaining`
                    ) : (
                      `Must Attend Next ${simulation.needed_classes} Consecutive Classes`
                    )}
                  </div>
                  <p style={{ marginTop: '8px', fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>
                    {simulation.message}
                  </p>
                </div>

                {/* Mathematical Breakdown Table */}
                <table className="data-table" style={{ marginBottom: '16px' }}>
                  <tbody>
                    <tr>
                      <td>Effective Attended (Regular + OD):</td>
                      <td><strong>{simulation.classes_attended} / {simulation.total_conducted} hrs</strong></td>
                    </tr>
                    <tr>
                      <td>Current Attendance Rate:</td>
                      <td><strong>{simulation.current_percentage}%</strong></td>
                    </tr>
                    <tr>
                      <td>Required Target Threshold:</td>
                      <td><strong>{simulation.target_percentage}%</strong></td>
                    </tr>
                    <tr>
                      <td>Projected if you attend the next class:</td>
                      <td style={{ color: '#15803d' }}>
                        <strong>{simulation.projected_if_attend_one}%</strong> (+{(simulation.projected_if_attend_one - simulation.current_percentage).toFixed(1)}%)
                      </td>
                    </tr>
                    <tr>
                      <td>Projected if you miss the next class:</td>
                      <td style={{ color: '#b91c1c' }}>
                        <strong>{simulation.projected_if_miss_one}%</strong> ({(simulation.projected_if_miss_one - simulation.current_percentage).toFixed(1)}%)
                      </td>
                    </tr>
                    {simulation.status === 'Eligible' && simulation.max_bunks > 0 && (
                      <tr>
                        <td>Final percentage after taking all {simulation.max_bunks} safe bunks:</td>
                        <td><strong>{simulation.projected_after_all_bunks}%</strong> (above {simulation.target_percentage}%)</td>
                      </tr>
                    )}
                    {simulation.status !== 'Eligible' && (
                      <tr>
                        <td>Final percentage after completing all {simulation.needed_classes} recovery classes:</td>
                        <td><strong>{simulation.projected_after_recovery}%</strong> (restores eligibility)</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ color: '#64748b', textAlign: 'center', padding: '30px 0' }}>
                Enter class numbers on the left or choose a course to simulate attendance projections.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================================
// 4. TIMETABLE MODULE
// ==========================================================
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
              className="btn-secondary"
              style={{
                backgroundColor: day === d ? '#1e3a8a' : '#ffffff',
                color: day === d ? '#ffffff' : '#1e293b'
              }}
              onClick={() => setDay(d)}
            >
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][d - 1]}
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

// ==========================================================
// 5. ASSIGNMENTS MODULE
// ==========================================================
export function AssignmentsView() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAssignments = () => {
    apiRequest('/assignments')
      .then(res => setAssignments(res.assignments || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAssignments(); }, []);

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
                  <td>{a.max_marks} pts</td>
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

// ==========================================================
// 6. NOTES & STUDY MATERIALS MODULE
// ==========================================================
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

// ==========================================================
// 7. EXAMINATIONS MODULE
// ==========================================================
export function ExaminationsView() {
  const [exams, setExams] = useState([]);

  useEffect(() => {
    apiRequest('/examinations').then(res => setExams(res.examinations || [])).catch(console.error);
  }, []);

  return (
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
  );
}

// ==========================================================
// 8. SGPA & CGPA CALCULATOR MODULE
// ==========================================================
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

// ==========================================================
// 9. STUDENT PROFILE MODULE
// ==========================================================
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

// ==========================================================
// 10. PLACEMENTS MODULE
// ==========================================================
export function PlacementsView() {
  const [drives, setDrives] = useState([]);

  useEffect(() => {
    apiRequest('/placements').then(res => setDrives(res.drives || [])).catch(console.error);
  }, []);

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
                  <button type="button" className="btn-secondary" onClick={() => alert(`Application submitted for ${d.company}.`)}>
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

// ==========================================================
// 11. PROJECTS HUB MODULE
// ==========================================================
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

// ==========================================================
// 12. EVENTS & CLUBS MODULE
// ==========================================================
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

// ==========================================================
// 13. LIBRARY MODULE
// ==========================================================
export function LibraryView() {
  const [books, setBooks] = useState([]);

  useEffect(() => {
    apiRequest('/library').then(res => setBooks(res.borrowed_books || [])).catch(console.error);
  }, []);

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
                  <button type="button" className="btn-secondary" onClick={() => alert(`Loan for "${b.title}" extended by 14 days.`)}>
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

// ==========================================================
// 14. CAMPUS SERVICES MODULE
// ==========================================================
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

// ==========================================================
// 15. NOTIFICATIONS MODULE
// ==========================================================
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

// ==========================================================
// 16. PERFORMANCE ANALYTICS MODULE
// ==========================================================
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

// ==========================================================
// 17. FACULTY DOUBT PORTAL MODULE
// ==========================================================
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
