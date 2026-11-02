/**
 * Student DB Dashboard - Core Application Logic
 * Comprehensive multi-module campus portal engine
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // 1. DATA STATE & STORES
  // ==========================================
  const state = {
    currentView: 'view-overview',
    student: {
      name: 'Alex Kumar',
      usn: '1MS21CS084',
      dept: 'Computer Science & Engineering',
      sem: 6,
      section: 'B',
      cgpa: 9.12,
      overallAtt: 88.4,
      email: 'alex.cs21@apexuniversity.edu.in',
      phone: '+91 98765 43210',
      emergency: '+91 98450 12345'
    },
    marks: {
      6: [
        { code: 'CS601', title: 'Distributed Systems', credits: 4, ia: '28/30', lab: '19/20', see: '45/50', total: 92, grade: 'O', status: 'Pass' },
        { code: 'CS602', title: 'Machine Learning', credits: 4, ia: '27/30', lab: '20/20', see: '43/50', total: 90, grade: 'O', status: 'Pass' },
        { code: 'CS603', title: 'Compiler Design', credits: 4, ia: '25/30', lab: '18/20', see: '41/50', total: 84, grade: 'A+', status: 'Pass' },
        { code: 'CS604', title: 'Cloud Architecture & DevOps', credits: 3, ia: '26/30', lab: '19/20', see: '44/50', total: 89, grade: 'A+', status: 'Pass' },
        { code: 'CS605', title: 'Information & Cyber Security', credits: 3, ia: '29/30', lab: '19/20', see: '46/50', total: 94, grade: 'O', status: 'Pass' },
        { code: 'CS606L', title: 'Capstone Project Phase-I', credits: 4, ia: '48/50', lab: '47/50', see: '--', total: 95, grade: 'O', status: 'Pass' }
      ],
      5: [
        { code: 'CS501', title: 'Database Management Systems', credits: 4, ia: '29/30', lab: '20/20', see: '46/50', total: 95, grade: 'O', status: 'Pass' },
        { code: 'CS502', title: 'Computer Networks', credits: 4, ia: '27/30', lab: '19/20', see: '44/50', total: 90, grade: 'O', status: 'Pass' },
        { code: 'CS503', title: 'Theory of Computation', credits: 4, ia: '26/30', lab: '18/20', see: '42/50', total: 86, grade: 'A+', status: 'Pass' },
        { code: 'CS504', title: 'Artificial Intelligence', credits: 4, ia: '28/30', lab: '19/20', see: '45/50', total: 92, grade: 'O', status: 'Pass' },
        { code: 'CS505', title: 'Web Development Lab', credits: 2, ia: '48/50', lab: '49/50', see: '--', total: 97, grade: 'O', status: 'Pass' }
      ]
    },
    attendance: [
      { code: 'CS601', name: 'Distributed Systems', faculty: 'Dr. Ramesh Rao', attended: 42, absent: 4, od: 2, total: 48, rate: 87.5 },
      { code: 'CS602', name: 'Machine Learning', faculty: 'Prof. Ananya Sen', attended: 38, absent: 4, od: 2, total: 44, rate: 86.4 },
      { code: 'CS603', name: 'Compiler Design', faculty: 'Dr. K. V. Sharma', attended: 44, absent: 2, od: 2, total: 48, rate: 91.7 },
      { code: 'CS604', name: 'Cloud Architecture', faculty: 'Prof. Vikram Hegde', attended: 35, absent: 7, od: 2, total: 44, rate: 79.5 },
      { code: 'CS605', name: 'Cyber Security', faculty: 'Dr. Priya Nambiar', attended: 41, absent: 5, od: 2, total: 48, rate: 85.4 },
      { code: 'CS606L', name: 'Capstone Lab', faculty: 'Dr. Rajeshwari S.', attended: 28, absent: 8, od: 4, total: 40, rate: 80.0 }
    ],
    timetables: {
      1: [ // Mon
        { time: '09:00 - 10:00 AM', code: 'CS601', name: 'Distributed Systems', type: 'Lecture', room: 'LH-302', faculty: 'Dr. Ramesh Rao', status: 'Completed' },
        { time: '10:00 - 11:00 AM', code: 'CS602', name: 'Machine Learning', type: 'Lecture', room: 'LH-302', faculty: 'Prof. Ananya Sen', status: 'Completed' },
        { time: '11:15 - 01:15 PM', code: 'CS606L', name: 'ML & Data Engg Lab', type: 'Lab', room: 'Lab Complex 4', faculty: 'Prof. Ananya / TA', status: 'Completed' },
        { time: '02:00 - 03:00 PM', code: 'CS603', name: 'Compiler Design', type: 'Lecture', room: 'LH-302', faculty: 'Dr. K. V. Sharma', status: 'Completed' },
        { time: '03:00 - 04:00 PM', code: 'CS604', name: 'Cloud Architecture', type: 'Tutorial', room: 'LH-302', faculty: 'Prof. Vikram Hegde', status: 'Completed' }
      ],
      2: [ // Tue
        { time: '09:00 - 10:00 AM', code: 'CS603', name: 'Compiler Design', type: 'Lecture', room: 'LH-302', faculty: 'Dr. K. V. Sharma', status: 'Completed' },
        { time: '10:00 - 11:00 AM', code: 'CS605', name: 'Cyber Security', type: 'Lecture', room: 'LH-302', faculty: 'Dr. Priya Nambiar', status: 'Completed' },
        { time: '11:15 - 12:15 PM', code: 'CS601', name: 'Distributed Systems', type: 'Lecture', room: 'LH-302', faculty: 'Dr. Ramesh Rao', status: 'Live Now' },
        { time: '01:15 - 02:00 PM', code: 'LUNCH', name: 'Cafeteria Break', type: 'Break', room: 'Central Quad', faculty: '--', status: 'Upcoming' },
        { time: '02:00 - 04:00 PM', code: 'CS606L', name: 'Capstone Project Studio', type: 'Practical', room: 'Innovation Hub', faculty: 'Dr. Rajeshwari S.', status: 'Upcoming' }
      ],
      3: [ // Wed
        { time: '09:00 - 10:00 AM', code: 'CS602', name: 'Machine Learning', type: 'Lecture', room: 'LH-302', faculty: 'Prof. Ananya Sen', status: 'Scheduled' },
        { time: '10:00 - 11:00 AM', code: 'CS604', name: 'Cloud Architecture', type: 'Lecture', room: 'LH-302', faculty: 'Prof. Vikram Hegde', status: 'Scheduled' },
        { time: '11:15 - 01:15 PM', code: 'CS605L', name: 'Network Security Lab', type: 'Lab', room: 'Lab 2', faculty: 'Dr. Priya Nambiar', status: 'Scheduled' },
        { time: '02:00 - 03:00 PM', code: 'CS601', name: 'Distributed Systems', type: 'Tutorial', room: 'LH-302', faculty: 'Dr. Ramesh Rao', status: 'Scheduled' }
      ],
      4: [ // Thu
        { time: '09:00 - 10:00 AM', code: 'CS605', name: 'Cyber Security', type: 'Lecture', room: 'LH-302', faculty: 'Dr. Priya Nambiar', status: 'Scheduled' },
        { time: '10:00 - 11:00 AM', code: 'CS601', name: 'Distributed Systems', type: 'Lecture', room: 'LH-302', faculty: 'Dr. Ramesh Rao', status: 'Scheduled' },
        { time: '11:15 - 12:15 PM', code: 'CS603', name: 'Compiler Design', type: 'Lecture', room: 'LH-302', faculty: 'Dr. K. V. Sharma', status: 'Scheduled' },
        { time: '02:00 - 04:00 PM', code: 'ELECT', name: 'Open Elective (FinTech)', type: 'Seminar', room: 'Audi-2', faculty: 'Visiting Industry Lead', status: 'Scheduled' }
      ],
      5: [ // Fri
        { time: '09:00 - 10:00 AM', code: 'CS604', name: 'Cloud Architecture', type: 'Lecture', room: 'LH-302', faculty: 'Prof. Vikram Hegde', status: 'Scheduled' },
        { time: '10:00 - 11:00 AM', code: 'CS602', name: 'Machine Learning', type: 'Lecture', room: 'LH-302', faculty: 'Prof. Ananya Sen', status: 'Scheduled' },
        { time: '11:15 - 01:15 PM', code: 'CS603L', name: 'Lex & Yacc Lab', type: 'Lab', room: 'Systems Lab', faculty: 'Dr. K. V. Sharma', status: 'Scheduled' },
        { time: '02:00 - 04:00 PM', code: 'CLUB', name: 'Coding Club & Hackathon Prep', type: 'Activity', room: 'Seminar Hall B', faculty: 'Student Mentors', status: 'Scheduled' }
      ],
      6: [ // Sat
        { time: '09:30 - 11:30 AM', code: 'RESEARCH', name: 'Research Paper Colloquium', type: 'Research', room: 'Board Room', faculty: 'Dept Dean / Guides', status: 'Scheduled' },
        { time: '11:45 - 01:00 PM', code: 'MENTOR', name: 'Proctor & Mentor Meeting', type: 'Mentorship', room: 'Faculty Cabins', faculty: 'Dr. Rajeshwari S.', status: 'Scheduled' }
      ]
    },
    assignments: [
      { id: 1, code: 'CS601', title: 'Raft Consensus Algorithm Implementation', due: 'Tomorrow, 11:59 PM', marks: 25, status: 'pending', desc: 'Implement leader election and log replication in Go or Python. Include test benchmark results.' },
      { id: 2, code: 'CS602', title: 'CNN Architecture Comparison on CIFAR-10', due: 'In 3 Days (Nov 5)', marks: 30, status: 'pending', desc: 'Compare ResNet-18 vs MobileNetV2 with custom learning rate schedules and augmentations.' },
      { id: 3, code: 'CS603', title: 'Syntax Directed Translation Parser', due: 'Submitted Yesterday', marks: 20, status: 'submitted', desc: 'Bison/Flex grammar for arithmetic expressions and intermediate three-address code generation.' },
      { id: 4, code: 'CS604', title: 'Terraform AWS Multi-Region Deployment', due: 'Graded', marks: 25, scored: 24, status: 'graded', desc: 'Automated VPC peering, ECS Fargate clusters, and CloudWatch alarms.', feedback: 'Exceptional IaC structure. Clean state management.' },
      { id: 5, code: 'CS605', title: 'RSA & Elliptic Curve Cryptography Lab', due: 'Graded', marks: 20, scored: 20, status: 'graded', desc: 'Implementation of modular exponentiation and key exchange simulation.', feedback: 'Full points. Correct vulnerability mitigation demonstrated.' }
    ],
    notes: [
      { id: 101, subject: 'CS601', title: 'Distributed Systems - Unit 1 & 2 Complete Notes', type: 'PDF', size: '4.8 MB', faculty: 'Dr. Ramesh Rao', downloads: 184 },
      { id: 102, subject: 'CS601', title: 'Consensus Protocols (Paxos vs Raft) Slide Deck', type: 'PPT', size: '12.4 MB', faculty: 'Dr. Ramesh Rao', downloads: 142 },
      { id: 103, subject: 'CS602', title: 'Deep Learning & Neural Networks Handwritten Digest', type: 'PDF', size: '8.1 MB', faculty: 'Prof. Ananya Sen', downloads: 310 },
      { id: 104, subject: 'CS603', title: 'Compiler Design Official Lab Manual 2026', type: 'Manual', size: '2.3 MB', faculty: 'Dr. K. V. Sharma', downloads: 96 },
      { id: 105, subject: 'CS604', title: 'Kubernetes & Docker Microservices Primer', type: 'PDF', size: '6.7 MB', faculty: 'Prof. Vikram Hegde', downloads: 215 },
      { id: 106, subject: 'CS605', title: 'Previous 5-Year Question Papers (2021-2025 Solved)', type: 'PYQ', size: '15.8 MB', faculty: 'Exam Cell Archive', downloads: 540 }
    ],
    exams: [
      { code: 'CS601', subject: 'Distributed Systems', date: '25 Nov 2026', time: '09:30 AM - 12:30 PM', room: 'Hall 401', seat: 'Row D - 14' },
      { code: 'CS602', subject: 'Machine Learning', date: '28 Nov 2026', time: '09:30 AM - 12:30 PM', room: 'Hall 401', seat: 'Row D - 14' },
      { code: 'CS603', subject: 'Compiler Design', date: '02 Dec 2026', time: '09:30 AM - 12:30 PM', room: 'Hall 305', seat: 'Row B - 08' },
      { code: 'CS604', subject: 'Cloud Architecture & DevOps', date: '05 Dec 2026', time: '09:30 AM - 12:30 PM', room: 'Hall 305', seat: 'Row B - 08' },
      { code: 'CS605', subject: 'Information & Cyber Security', date: '08 Dec 2026', time: '09:30 AM - 12:30 PM', room: 'Hall 401', seat: 'Row D - 14' }
    ],
    gpaCourses: [
      { name: 'Distributed Systems (CS601)', credits: 4, grade: 'O', pts: 10 },
      { name: 'Machine Learning (CS602)', credits: 4, grade: 'O', pts: 10 },
      { name: 'Compiler Design (CS603)', credits: 4, grade: 'A+', pts: 9 },
      { name: 'Cloud Architecture (CS604)', credits: 3, grade: 'A+', pts: 9 },
      { name: 'Cyber Security (CS605)', credits: 3, grade: 'O', pts: 10 },
      { name: 'Capstone Project Phase-I (CS606L)', credits: 4, grade: 'O', pts: 10 }
    ],
    placements: [
      { company: 'Google', role: 'Software Engineer (Campus 2026)', type: 'Tech', ctc: '34.5 LPA', deadline: 'Nov 14, 2026', cgpaMin: 8.5, applied: false },
      { company: 'Microsoft', role: 'SWE - Cloud & AI Platform', type: 'Tech', ctc: '32.0 LPA', deadline: 'Nov 18, 2026', cgpaMin: 8.0, applied: true },
      { company: 'Amazon AWS', role: 'Solutions Architect Intern', type: 'Intern', ctc: '₹1,00,000/mo', deadline: 'Nov 20, 2026', cgpaMin: 8.0, applied: true },
      { company: 'Cisco Systems', role: 'Network Software Engineer', type: 'Tech', ctc: '21.0 LPA', deadline: 'Nov 25, 2026', cgpaMin: 7.5, applied: false },
      { company: 'JPMorgan Chase', role: 'Software Analyst - FinTech', type: 'Tech', ctc: '24.0 LPA', deadline: 'Nov 28, 2026', cgpaMin: 8.0, applied: false }
    ],
    projects: [
      {
        title: 'ApexEdge: Autonomous Edge-AI Mesh for Drone Telemetry',
        guide: 'Dr. Ramesh Rao',
        tags: ['Golang', 'Rust', 'TensorFlow Lite', 'WebRTC'],
        repo: 'github.com/alexkumar/apex-edge-mesh',
        status: 'Active Capstone',
        openSeats: 1,
        desc: 'Decentralized low-latency edge computing architecture for UAV fleets operating in zero-cellular environments.'
      },
      {
        title: 'VeriDegree: Zero-Knowledge Academic Credential Ledger',
        guide: 'Dr. Priya Nambiar',
        tags: ['Ethereum', 'Solidity', 'Circom', 'React'],
        repo: 'github.com/alexkumar/veridegree-zk',
        status: 'Hackathon Winner',
        openSeats: 0,
        desc: 'Tamper-proof verifiable diplomas and transcripts using zk-SNARKs allowing instant employer background checks.'
      },
      {
        title: 'LLM-DocuQuery: RAG Engine with Multilingual OCR',
        guide: 'Prof. Ananya Sen',
        tags: ['Python', 'LangChain', 'ChromaDB', 'FastAPI'],
        repo: 'github.com/alexkumar/docuquery-rag',
        status: 'Research Project',
        openSeats: 2,
        desc: 'Context-aware question answering across 10,000+ university research publications with citation verification.'
      }
    ],
    events: [
      { title: 'ApexHack 2026: 36-Hour National Hackathon', org: 'ACM Student Chapter', date: 'Nov 15-16, 2026', venue: 'Convention Center', prize: '₹2,50,000 Pool', rsvp: true },
      { title: 'Generative AI & LLM Fine-Tuning Bootcamp', org: 'Google Developer Group', date: 'Nov 22, 2026', venue: 'Auditorium 1', prize: 'Swags & Cloud Credits', rsvp: false },
      { title: 'International Cyber Defense CTF Challenge', org: 'InfoSec Club', date: 'Dec 01, 2026', venue: 'Virtual Arena', prize: '₹75,000 + Badges', rsvp: false }
    ],
    library: {
      catalog: [
        { id: 1, title: 'Distributed Systems: Principles and Paradigms', author: 'Andrew S. Tanenbaum', isbn: '978-0132392273', copies: 4, available: 2 },
        { id: 2, title: 'Pattern Recognition and Machine Learning', author: 'Christopher M. Bishop', isbn: '978-0387310732', copies: 6, available: 3 },
        { id: 3, title: 'Compilers: Principles, Techniques, and Tools (Dragon Book)', author: 'Aho, Lam, Sethi, Ullman', isbn: '978-0321486813', copies: 5, available: 1 },
        { id: 4, title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', isbn: '978-1449373320', copies: 3, available: 0 },
        { id: 5, title: 'Computer Networking: A Top-Down Approach', author: 'Kurose & Ross', isbn: '978-0133594140', copies: 8, available: 5 }
      ],
      issued: [
        { title: 'Distributed Systems: Principles and Paradigms', issueDate: 'Oct 18, 2026', dueDate: 'Nov 17, 2026', daysLeft: 15, barcode: 'LIB-84920' },
        { title: 'Pattern Recognition and Machine Learning', issueDate: 'Oct 22, 2026', dueDate: 'Nov 21, 2026', daysLeft: 19, barcode: 'LIB-77312' }
      ]
    },
    announcements: [
      { id: 1, title: 'End-Semester Theory Exam Hall Tickets Released', dept: 'Office of Registrar', date: 'Today, 10:30 AM', tag: 'Exams', content: 'Eligible candidates with >=75% attendance can verify hall ticket details in Module 7.' },
      { id: 2, title: 'Campus Recruitment Drive: Microsoft SWE Applications Open', dept: 'Placement Cell', date: 'Yesterday, 04:15 PM', tag: 'Placement', content: 'Drive scheduled for Nov 18. Submit resumes with verified CGPA before cutoff.' },
      { id: 3, title: 'On-Duty Attendance Approved for IEEE Hackathon Delegates', dept: 'Dean Academics', date: 'Oct 30, 2026', tag: 'Attendance', content: 'OD records credited across all subjects for official participants.' }
    ],
    faculty: [
      { name: 'Dr. Ramesh Rao', dept: 'CSE', role: 'Professor & HOD', cabin: 'Cabin CS-101', email: 'ramesh.rao@apexuniversity.edu.in', courses: 'Distributed Systems' },
      { name: 'Prof. Ananya Sen', dept: 'CSE', role: 'Associate Professor', cabin: 'Cabin CS-204', email: 'ananya.sen@apexuniversity.edu.in', courses: 'Machine Learning' },
      { name: 'Dr. K. V. Sharma', dept: 'CSE', role: 'Professor', cabin: 'Cabin CS-208', email: 'kv.sharma@apexuniversity.edu.in', courses: 'Compiler Design' },
      { name: 'Prof. Vikram Hegde', dept: 'CSE', role: 'Assistant Professor', cabin: 'Cabin CS-312', email: 'vikram.hegde@apexuniversity.edu.in', courses: 'Cloud Architecture' },
      { name: 'Dr. Priya Nambiar', dept: 'CSE', role: 'Associate Professor', cabin: 'Cabin CS-215', email: 'priya.nambiar@apexuniversity.edu.in', courses: 'Cyber Security' }
    ],
    doubts: [
      {
        id: 1,
        course: 'CS601: Distributed Systems',
        author: 'Alex Kumar',
        time: '2 hours ago',
        question: 'In Raft consensus, how does the leader handle network partitions when split-brain occurs between two minority clusters?',
        status: 'Answered',
        reply: {
          faculty: 'Dr. Ramesh Rao (Faculty)',
          text: 'The partitioned leader cannot achieve a quorum (majority: N/2 + 1) for its append entries log commits. Once network heals, the cluster with the higher Term number and longest valid committed log will force the stale leader to step down.'
        }
      },
      {
        id: 2,
        course: 'CS603: Compiler Design',
        author: 'Alex Kumar',
        time: 'Yesterday',
        question: 'Why are L-attributed definitions evaluated during depth-first traversal, whereas S-attributed definitions can be evaluated bottom-up with LR parsers?',
        status: 'Answered',
        reply: {
          faculty: 'Dr. K. V. Sharma (Faculty)',
          text: 'S-attributed definitions only use synthesized attributes (values flow up). L-attributed definitions allow inherited attributes, but only from parents or left siblings, requiring a strict left-to-right top-down/depth-first order.'
        }
      }
    ],
    lostFound: [
      { item: 'Sony WH-1000XM4 Headphones (Black)', location: 'LH-302, 3rd Bench', date: 'Nov 01, 2026', contact: 'Security Gate 2' },
      { item: 'Casio fx-991CW Scientific Calculator', location: 'Lab Complex 4', date: 'Oct 31, 2026', contact: 'Lab Assistant Mahesh' },
      { item: 'Dell 65W USB-C Laptop Charger', location: 'Central Library 1st Floor', date: 'Oct 29, 2026', contact: 'Library Desk' }
    ]
  };

  // ==========================================
  // 2. ROUTING & NAVIGATION
  // ==========================================
  const navLinks = document.querySelectorAll('.nav-link');
  const viewPanels = document.querySelectorAll('.view-panel');
  const currentViewTitle = document.getElementById('currentViewTitle');
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menuToggle');

  function switchView(targetViewId) {
    state.currentView = targetViewId;
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-view') === targetViewId);
    });

    viewPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === targetViewId);
    });

    // Update Title
    const activeLink = document.querySelector(`.nav-link[data-view="${targetViewId}"]`);
    if (activeLink) {
      currentViewTitle.textContent = activeLink.querySelector('.label').textContent;
    } else if (targetViewId === 'view-overview') {
      currentViewTitle.textContent = 'Overview Dashboard';
    }

    // Scroll top
    document.querySelector('.content-scroll').scrollTop = 0;

    // Render Canvas if analytics
    if (targetViewId === 'view-analytics') {
      setTimeout(renderAnalyticsCharts, 50);
    }

    // Close mobile drawer
    sidebar.classList.remove('mobile-open');
  }

  navLinks.forEach(btn => {
    btn.addEventListener('click', () => {
      const viewId = btn.getAttribute('data-view');
      switchView(viewId);
    });
  });

  menuToggle?.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
  });

  // Hub Shortcut Jump
  document.querySelectorAll('[data-goto]').forEach(el => {
    el.addEventListener('click', () => {
      const target = el.getAttribute('data-goto');
      switchView(target);
    });
  });

  // ==========================================
  // 3. MODAL CONTROLLER
  // ==========================================
  const modalOverlay = document.getElementById('modalOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalCloseBtn = document.getElementById('modalCloseBtn');

  function openModal(title, htmlContent) {
    modalTitle.textContent = title;
    modalBody.innerHTML = htmlContent;
    modalOverlay.classList.add('open');
  }

  function closeModal() {
    modalOverlay.classList.remove('open');
  }

  modalCloseBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // ==========================================
  // 4. NOTIFICATIONS DROPDOWN
  // ==========================================
  const notifBellBtn = document.getElementById('notifBellBtn');
  const notifDropdown = document.getElementById('notifDropdown');
  const notifList = document.getElementById('notifList');

  notifBellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notifDropdown.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!notifDropdown.contains(e.target) && e.target !== notifBellBtn) {
      notifDropdown.classList.remove('open');
    }
  });

  function renderNotifications() {
    notifList.innerHTML = state.announcements.map(a => `
      <li onclick="alert('${a.title}\\n\\n${a.content}')">
        <strong>${a.title}</strong>
        <span class="time">${a.dept} • ${a.date}</span>
      </li>
    `).join('');
  }
  renderNotifications();

  // ==========================================
  // 5. MODULE 1: ACADEMIC MARKS
  // ==========================================
  const perfSemSelect = document.getElementById('perfSemSelect');
  const marksTableBody = document.getElementById('marksTableBody');
  const currentSgpaVal = document.getElementById('currentSgpaVal');

  function renderMarksTable(sem) {
    const list = state.marks[sem] || state.marks[6];
    let totalGradePoints = 0;
    let totalCreds = 0;

    const gradeMap = { 'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'P': 4, 'F': 0 };

    marksTableBody.innerHTML = list.map(item => {
      const gPts = gradeMap[item.grade] || 10;
      totalGradePoints += (gPts * item.credits);
      totalCreds += item.credits;

      return `
        <tr>
          <td><strong style="color: #818cf8; font-family: 'JetBrains Mono', monospace;">${item.code}</strong></td>
          <td>${item.title}</td>
          <td>${item.credits}</td>
          <td>${item.ia}</td>
          <td>${item.lab}</td>
          <td>${item.see}</td>
          <td><strong>${item.total}</strong></td>
          <td><span class="badge-status ${item.grade === 'O' ? 'success' : 'warning'}">${item.grade}</span></td>
          <td><span class="badge-tag safe-tag">${item.status}</span></td>
        </tr>
      `;
    }).join('');

    const calculatedSgpa = (totalGradePoints / totalCreds).toFixed(2);
    currentSgpaVal.textContent = calculatedSgpa;
  }

  perfSemSelect.addEventListener('change', (e) => {
    renderMarksTable(e.target.value);
  });

  document.getElementById('exportMarksPdf')?.addEventListener('click', () => {
    openModal('Official Academic Marks Card', `
      <div style="padding: 10px; font-family: 'Plus Jakarta Sans', sans-serif;">
        <div style="border-bottom: 2px solid #6366f1; padding-bottom: 12px; margin-bottom: 16px;">
          <h3>STUDENT PORTAL - TRANSCRIPT & MARKS CARD</h3>
          <p style="font-size: 0.8rem; color: #94a3b8;">Candidate: Alex Kumar (1MS21CS084) • B.Tech CSE Semester 6</p>
        </div>
        <p style="font-size: 0.85rem; margin-bottom: 14px;">This transcript reflects verified scores across Continuous Internal Evaluation (CIE) and Semester End Examination (SEE).</p>
        <div style="background: rgba(255,255,255,0.04); padding: 12px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem;">
          <div>SGPA: ${currentSgpaVal.textContent} / 10.00</div>
          <div>Cumulative CGPA: ${state.student.cgpa}</div>
          <div>Result Status: FIRST CLASS WITH DISTINCTION</div>
        </div>
        <button class="btn-primary full-width mt-16" onclick="window.print()">🖨️ Print / Save as PDF</button>
      </div>
    `);
  });

  // ==========================================
  // 6. MODULE 2: SMART ATTENDANCE
  // ==========================================
  const attendanceTableBody = document.getElementById('attendanceTableBody');
  const calcPresetSubject = document.getElementById('calcPresetSubject');

  function renderAttendanceTable() {
    attendanceTableBody.innerHTML = state.attendance.map(item => {
      // Safe bunks calculation for 75% cutoff
      // (attended) / (total + x) >= 0.75  =>  attended >= 0.75*(total + x) => x = floor(attended/0.75 - total)
      const safeBunks = Math.max(0, Math.floor((item.attended / 0.75) - item.total));
      const statusClass = item.rate >= 85 ? 'success' : (item.rate >= 75 ? 'warning' : 'danger');

      return `
        <tr>
          <td>
            <strong>${item.name}</strong>
            <span style="display:block; font-size: 0.72rem; color: #818cf8; font-family: 'JetBrains Mono';">${item.code}</span>
          </td>
          <td>${item.faculty}</td>
          <td><strong class="text-success">${item.attended}</strong></td>
          <td><strong class="text-danger">${item.absent}</strong></td>
          <td><strong class="text-warning">${item.od}</strong></td>
          <td>${item.total}</td>
          <td>
            <div style="display:flex; align-items:center; gap: 8px;">
              <strong>${item.rate}%</strong>
              <div style="flex:1; height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;">
                <div style="width: ${item.rate}%; height:100%; background: ${item.rate >= 85 ? '#10b981' : (item.rate >= 75 ? '#f59e0b' : '#ef4444')};"></div>
              </div>
            </div>
          </td>
          <td><strong style="color: #38bdf8;">${safeBunks} Lectures</strong></td>
          <td><span class="badge-status ${statusClass}">${item.rate >= 75 ? 'Eligible' : 'Shortage'}</span></td>
        </tr>
      `;
    }).join('');

    // Fill calc dropdown
    calcPresetSubject.innerHTML = `<option value="">-- Choose Course --</option>` + state.attendance.map((c, i) => `
      <option value="${i}">${c.name} (${c.rate}%)</option>
    `).join('');
  }

  document.getElementById('btnRequestOd')?.addEventListener('click', () => {
    openModal('Apply for On-Duty (OD) Leave Approval', `
      <form id="odForm" style="display: flex; flex-direction: column; gap: 14px;">
        <div class="form-group">
          <label>Event / Purpose Name:</label>
          <input type="text" id="odEventName" required class="form-input" placeholder="e.g. IEEE Hackathon / University Sports">
        </div>
        <div class="form-group">
          <label>Event Date(s):</label>
          <input type="date" id="odEventDate" required class="form-input">
        </div>
        <div class="form-group">
          <label>Classes / Hours Missed:</label>
          <input type="number" id="odHours" min="1" max="20" value="4" class="form-input">
        </div>
        <div class="form-group">
          <label>Upload Supporting Letter / Ticket (Mock):</label>
          <input type="file" class="form-input">
        </div>
        <button type="submit" class="btn-primary full-width mt-8">Submit to HOD & Proctor</button>
      </form>
    `);

    document.getElementById('odForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const eventName = document.getElementById('odEventName').value;
      const hours = document.getElementById('odHours').value;
      alert(`OD application for "${eventName}" (${hours} hours) submitted successfully! Tracking ID: OD-2026-${Math.floor(100 + Math.random() * 900)}.`);
      closeModal();
    });
  });

  // ==========================================
  // 7. MODULE 3: ATTENDANCE BUNK CALCULATOR
  // ==========================================
  const calcTotalHeld = document.getElementById('calcTotalHeld');
  const calcAttended = document.getElementById('calcAttended');
  const calcTarget = document.getElementById('calcTarget');
  const calcDynamicOutput = document.getElementById('calcDynamicOutput');
  const calcCurrentPercent = document.getElementById('calcCurrentPercent');

  function runAttendanceCalc() {
    const total = parseInt(calcTotalHeld.value, 10) || 1;
    const attended = parseInt(calcAttended.value, 10) || 0;
    const target = parseFloat(calcTarget.value) || 75;

    const curRate = ((attended / total) * 100).toFixed(1);
    calcCurrentPercent.textContent = `${curRate}% Current`;

    if (attended > total) {
      calcDynamicOutput.innerHTML = `
        <div class="forecast-banner danger">
          <div class="forecast-num">Invalid Input</div>
          <p class="forecast-desc">Attended classes cannot exceed total classes held.</p>
        </div>
      `;
      return;
    }

    const targetFraction = target / 100;

    if (curRate >= target) {
      // Safe to bunk: (attended) / (total + x) >= targetFraction
      // x <= (attended / targetFraction) - total
      const maxBunks = Math.floor((attended / targetFraction) - total);
      calcDynamicOutput.innerHTML = `
        <div class="forecast-banner">
          <div class="forecast-num text-success">${maxBunks} Classes</div>
          <p class="forecast-desc">
            You are currently safely <strong>above</strong> your ${target}% threshold (${curRate}%).<br>
            You can afford to <strong>bunk up to ${maxBunks} consecutive lectures</strong> without dropping below ${target}%.
          </p>
        </div>
        <div style="font-size: 0.8rem; color: #94a3b8;">
          Next lecture missed will bring attendance to: <strong>${((attended / (total + 1)) * 100).toFixed(1)}%</strong>.
        </div>
      `;
    } else {
      // Need to attend consecutively: (attended + y) / (total + y) >= targetFraction
      // attended + y >= targetFraction*total + targetFraction*y
      // y * (1 - targetFraction) >= targetFraction*total - attended
      // y = ceil((targetFraction*total - attended) / (1 - targetFraction))
      const needed = Math.ceil((targetFraction * total - attended) / (1 - targetFraction));
      calcDynamicOutput.innerHTML = `
        <div class="forecast-banner danger">
          <div class="forecast-num text-danger">${needed} Classes</div>
          <p class="forecast-desc">
            <strong>Attendance Shortage Alert!</strong> You are below your ${target}% threshold (${curRate}%).<br>
            You must attend the next <strong>${needed} consecutive lectures</strong> without missing any to restore your eligibility.
          </p>
        </div>
        <div style="font-size: 0.8rem; color: #94a3b8;">
          Attending next class will raise attendance to: <strong>${(((attended + 1) / (total + 1)) * 100).toFixed(1)}%</strong>.
        </div>
      `;
    }
  }

  [calcTotalHeld, calcAttended, calcTarget].forEach(inp => {
    inp.addEventListener('input', runAttendanceCalc);
  });

  calcPresetSubject.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val !== '') {
      const c = state.attendance[parseInt(val, 10)];
      calcTotalHeld.value = c.total;
      calcAttended.value = c.attended;
      runAttendanceCalc();
    }
  });

  // ==========================================
  // 8. MODULE 4: TIMETABLE
  // ==========================================
  const timetableBody = document.getElementById('timetableBody');
  const ttDaySwitcher = document.getElementById('ttDaySwitcher');
  const ttDayTitle = document.getElementById('ttDayTitle');

  const daysMap = {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday'
  };

  function renderTimetable(dayNum) {
    ttDayTitle.textContent = `${daysMap[dayNum]} Schedule`;
    const slots = state.timetables[dayNum] || [];

    timetableBody.innerHTML = slots.map(slot => `
      <tr>
        <td><strong style="font-family: 'JetBrains Mono';">${slot.time}</strong></td>
        <td>
          <strong>${slot.name}</strong>
          <span style="display:block; font-size: 0.72rem; color: #818cf8; font-family: 'JetBrains Mono';">${slot.code}</span>
        </td>
        <td><span class="badge-pill">${slot.type}</span></td>
        <td><code>${slot.room}</code></td>
        <td>${slot.faculty}</td>
        <td>
          <span class="badge-status ${slot.status === 'Live Now' ? 'danger' : (slot.status === 'Completed' ? 'success' : 'warning')}">
            ${slot.status}
          </span>
        </td>
      </tr>
    `).join('');
  }

  ttDaySwitcher.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      ttDaySwitcher.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTimetable(parseInt(btn.getAttribute('data-day'), 10));
    });
  });

  // Mini Schedule in Overview
  function renderOverviewWidgets() {
    const miniScheduleList = document.getElementById('miniScheduleList');
    const todaySlots = state.timetables[2]; // Tuesday default
    miniScheduleList.innerHTML = todaySlots.slice(0, 3).map(slot => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
        <div>
          <strong style="font-size: 0.85rem; color:#fff;">${slot.name}</strong>
          <span style="display:block; font-size: 0.72rem; color:#94a3b8;">${slot.time} • ${slot.room}</span>
        </div>
        <span class="badge-status ${slot.status === 'Live Now' ? 'danger' : 'warning'}">${slot.status}</span>
      </div>
    `).join('');

    const miniNoticeList = document.getElementById('miniNoticeList');
    miniNoticeList.innerHTML = state.announcements.slice(0, 2).map(n => `
      <div style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
        <strong style="font-size: 0.82rem; color:#818cf8; display:block;">${n.title}</strong>
        <p style="font-size: 0.74rem; color:#94a3b8; margin-top:2px;">${n.content}</p>
      </div>
    `).join('');
  }

  // ==========================================
  // 9. MODULE 5: ASSIGNMENT TRACKER
  // ==========================================
  const assignmentGrid = document.getElementById('assignmentGrid');
  const assignmentTabs = document.querySelectorAll('.tabs-nav .tab-btn');

  function renderAssignments(filter = 'all') {
    const filtered = state.assignments.filter(a => filter === 'all' || a.status === filter);

    assignmentGrid.innerHTML = filtered.map(a => `
      <div class="assignment-card">
        <div class="assig-meta-row">
          <span class="assig-code">${a.code}</span>
          <span class="badge-status ${a.status === 'graded' ? 'success' : (a.status === 'submitted' ? 'warning' : 'danger')}">
            ${a.status.toUpperCase()}
          </span>
        </div>
        <div class="assig-title">${a.title}</div>
        <div class="assig-details">${a.desc}</div>
        ${a.feedback ? `<div style="font-size: 0.78rem; background: rgba(16,185,129,0.1); border-left: 2px solid #10b981; padding: 6px 10px; color: #a7f3d0;"><strong>Feedback:</strong> ${a.feedback} (${a.scored}/${a.marks})</div>` : ''}
        <div class="assig-footer">
          <span style="font-size: 0.75rem; color: #94a3b8;">⏳ ${a.due}</span>
          ${a.status === 'pending' ? `<button class="btn-primary" style="padding: 4px 10px; font-size: 0.75rem;" onclick="submitAssignmentAction(${a.id})">Upload Solution</button>` : `<span style="font-size: 0.75rem; color: #818cf8;">✓ Recorded</span>`}
        </div>
      </div>
    `).join('');

    // Update Counts
    document.getElementById('count-all-assig').textContent = state.assignments.length;
    document.getElementById('count-pending-assig').textContent = state.assignments.filter(a => a.status === 'pending').length;
    document.getElementById('count-submitted-assig').textContent = state.assignments.filter(a => a.status === 'submitted').length;
    document.getElementById('count-graded-assig').textContent = state.assignments.filter(a => a.status === 'graded').length;
    document.getElementById('badge-pending-assignments').textContent = state.assignments.filter(a => a.status === 'pending').length;
  }

  assignmentTabs.forEach(t => {
    t.addEventListener('click', () => {
      assignmentTabs.forEach(b => b.classList.remove('active'));
      t.classList.add('active');
      renderAssignments(t.getAttribute('data-filter'));
    });
  });

  window.submitAssignmentAction = (id) => {
    const item = state.assignments.find(x => x.id === id);
    openModal(`Submit Assignment: ${item.code}`, `
      <form id="submitAssigForm" style="display:flex; flex-direction:column; gap: 12px;">
        <p style="font-size: 0.85rem; color: #cbd5e1;"><strong>${item.title}</strong></p>
        <div class="form-group">
          <label>GitHub Repository / Google Drive Link:</label>
          <input type="url" id="assigLink" required class="form-input" placeholder="https://github.com/alexkumar/assignment-repo">
        </div>
        <div class="form-group">
          <label>Notes / Submission Comments:</label>
          <textarea id="assigNotes" rows="3" class="form-textarea" placeholder="Tested on Ubuntu 24.04 and Docker..."></textarea>
        </div>
        <button type="submit" class="btn-primary full-width">Finalize & Submit Assignment</button>
      </form>
    `);

    document.getElementById('submitAssigForm').addEventListener('submit', (e) => {
      e.preventDefault();
      item.status = 'submitted';
      item.due = 'Submitted Just Now';
      renderAssignments();
      closeModal();
      alert(`Assignment for ${item.code} submitted successfully!`);
    });
  };

  document.getElementById('btnNewAssignmentModal')?.addEventListener('click', () => {
    openModal('Submit Custom Lab / Term Assignment', `
      <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 12px;">Choose an active pending course to upload your deliverable:</p>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${state.assignments.filter(a => a.status === 'pending').map(a => `
          <button class="btn-secondary full-width" onclick="submitAssignmentAction(${a.id})">${a.code}: ${a.title}</button>
        `).join('')}
      </div>
    `);
  });

  // ==========================================
  // 10. MODULE 6: NOTES & STUDY MATERIALS
  // ==========================================
  const notesCatalog = document.getElementById('notesCatalog');
  const notesSubjectFilter = document.getElementById('notesSubjectFilter');

  function renderNotes(filter = 'all') {
    const filtered = state.notes.filter(n => filter === 'all' || n.subject === filter);
    const icons = { 'PDF': '📕', 'PPT': '📊', 'Manual': '🔬', 'PYQ': '📜' };

    notesCatalog.innerHTML = filtered.map(n => `
      <div class="note-item">
        <div class="note-icon">${icons[n.type] || '📄'}</div>
        <div class="note-info">
          <h4>${n.title}</h4>
          <span class="meta">${n.subject} • ${n.faculty} • ${n.size}</span>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size: 0.7rem; color: #94a3b8;">📥 ${n.downloads} Downloads</span>
            <button class="btn-secondary" style="font-size: 0.72rem; padding: 4px 8px;" onclick="alert('Downloading: ${n.title} (${n.size})')">Download</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  notesSubjectFilter.addEventListener('change', (e) => {
    renderNotes(e.target.value);
  });

  // ==========================================
  // 11. MODULE 7: EXAMINATION PORTAL
  // ==========================================
  const examTimetableList = document.getElementById('examTimetableList');

  function renderExamList() {
    examTimetableList.innerHTML = state.exams.map(e => `
      <div style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong style="color: #fff; font-size: 0.85rem;">${e.subject} (${e.code})</strong>
          <span style="display:block; font-size: 0.72rem; color: #94a3b8;">📅 ${e.date} • ${e.time}</span>
        </div>
        <div style="text-align:right;">
          <code style="color: #818cf8; font-size: 0.78rem;">${e.room}</code>
          <span style="display:block; font-size: 0.7rem; color: #cbd5e1;">${e.seat}</span>
        </div>
      </div>
    `).join('');
  }

  document.getElementById('btnPrintHallTicket')?.addEventListener('click', () => {
    window.print();
  });

  document.getElementById('btnOpenRevalModal')?.addEventListener('click', () => {
    openModal('Apply for Exam Paper Revaluation & Photocopy', `
      <form id="revalForm" style="display:flex; flex-direction:column; gap:12px;">
        <div class="form-group">
          <label>Select Course for Revaluation:</label>
          <select id="revalCourse" class="form-select">
            ${state.exams.map(e => `<option value="${e.code}">${e.code} - ${e.subject}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Application Category:</label>
          <select class="form-select">
            <option>Digital Answer Script Photocopy (₹350)</option>
            <option>Complete Re-Evaluation by External Board (₹750)</option>
            <option>Photocopy + Re-Evaluation Combo (₹1,000)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Reason / Discrepancy Note:</label>
          <textarea class="form-textarea" rows="2" placeholder="Marks mismatch in Question 3(b) or totaling error..."></textarea>
        </div>
        <button type="submit" class="btn-primary full-width">Pay Application Fee & Register</button>
      </form>
    `);

    document.getElementById('revalForm').addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Revaluation application lodged! Receipt will be dispatched to your student email.');
      closeModal();
    });
  });

  // ==========================================
  // 12. MODULE 8: SGPA & CGPA CALCULATOR
  // ==========================================
  const gpaCalcBody = document.getElementById('gpaCalcBody');
  const projectedSgpa = document.getElementById('projectedSgpa');
  const projectedCgpa = document.getElementById('projectedCgpa');
  const btnAddCalcCourse = document.getElementById('btnAddCalcCourse');

  const gradeScoreMap = { 'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'P': 4, 'F': 0 };

  function renderGpaCalcTable() {
    gpaCalcBody.innerHTML = state.gpaCourses.map((c, idx) => `
      <tr>
        <td><input type="text" value="${c.name}" class="form-input" style="padding: 6px 10px; font-size: 0.8rem;" onchange="updateCalcName(${idx}, this.value)"></td>
        <td>
          <input type="number" value="${c.credits}" min="1" max="6" class="form-input" style="width: 70px; padding: 6px 10px;" onchange="updateCalcCredits(${idx}, this.value)">
        </td>
        <td>
          <select class="form-select" style="padding: 6px 10px;" onchange="updateCalcGrade(${idx}, this.value)">
            ${Object.keys(gradeScoreMap).map(g => `<option value="${g}" ${g === c.grade ? 'selected' : ''}>${g} (${gradeScoreMap[g]} pts)</option>`).join('')}
          </select>
        </td>
        <td><strong style="color: #818cf8; font-family: 'JetBrains Mono';">${c.pts}</strong></td>
        <td>
          <button class="btn-secondary" style="padding: 4px 8px; color: #ef4444;" onclick="deleteCalcCourse(${idx})">✕</button>
        </td>
      </tr>
    `).join('');

    computeGpa();
  }

  window.updateCalcName = (idx, val) => { state.gpaCourses[idx].name = val; };
  window.updateCalcCredits = (idx, val) => {
    state.gpaCourses[idx].credits = parseInt(val, 10) || 1;
    computeGpa();
  };
  window.updateCalcGrade = (idx, val) => {
    state.gpaCourses[idx].grade = val;
    state.gpaCourses[idx].pts = gradeScoreMap[val] || 10;
    renderGpaCalcTable();
  };
  window.deleteCalcCourse = (idx) => {
    state.gpaCourses.splice(idx, 1);
    renderGpaCalcTable();
  };

  btnAddCalcCourse.addEventListener('click', () => {
    state.gpaCourses.push({ name: 'New Elective Course', credits: 3, grade: 'A+', pts: 9 });
    renderGpaCalcTable();
  });

  function computeGpa() {
    let semPoints = 0;
    let semCredits = 0;

    state.gpaCourses.forEach(c => {
      semPoints += (c.credits * c.pts);
      semCredits += c.credits;
    });

    const sgpa = semCredits > 0 ? (semPoints / semCredits) : 0;
    projectedSgpa.textContent = sgpa.toFixed(2);

    // Factors prior 5 sems: 106 credits @ 9.08 CGPA = 962.48 points
    const priorCredits = 106;
    const priorPoints = 962.48;
    const totalCredits = priorCredits + semCredits;
    const cumulativeCgpa = (priorPoints + semPoints) / totalCredits;

    projectedCgpa.textContent = cumulativeCgpa.toFixed(2);
  }

  // ==========================================
  // 13. MODULE 9: PROFILE & DIGITAL ID
  // ==========================================
  document.getElementById('openDigitalIdModal')?.addEventListener('click', () => {
    openModal('Student NFC & QR Identity Badge', `
      <div style="display:flex; flex-direction:column; align-items:center; gap: 16px;">
        <div style="background: linear-gradient(135deg, #1e1b4b, #0f172a 60%, #0369a1); border-radius: 16px; padding: 20px; width: 100%; color: #fff; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <div style="display:flex; justify-content:space-between; margin-bottom: 12px;">
            <strong>STUDENT PORTAL</strong>
            <span style="font-family:'JetBrains Mono'; font-size:0.75rem; color:#38bdf8;">ACTIVE STUDENT</span>
          </div>
          <div style="display:flex; gap:16px; align-items:center; margin-bottom: 16px;">
            <div style="width: 60px; height: 75px; background: #6366f1; border-radius: 8px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.4rem;">AK</div>
            <div>
              <h4 style="font-size:1.1rem; color:#fff;">Alex Kumar</h4>
              <p style="font-family:'JetBrains Mono'; color:#fbbf24; font-size:0.85rem;">1MS21CS084</p>
              <p style="font-size:0.75rem; color:#cbd5e1;">B.Tech Computer Science & Engg</p>
            </div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 12px; font-size: 0.72rem; color: #94a3b8;">
            <span>Blood Group: O+</span>
            <span>Emergency: +91 98450 12345</span>
          </div>
        </div>
        <button class="btn-primary full-width" onclick="window.print()">Print Card</button>
      </div>
    `);
  });

  document.getElementById('openProfileQuick')?.addEventListener('click', () => {
    switchView('view-profile');
  });

  document.getElementById('btnEditProfile')?.addEventListener('click', () => {
    openModal('Update Contact Information', `
      <form id="editProfileForm" style="display:flex; flex-direction:column; gap:12px;">
        <div class="form-group">
          <label>Mobile Number:</label>
          <input type="text" id="profPhone" class="form-input" value="${state.student.phone}">
        </div>
        <div class="form-group">
          <label>Emergency Contact:</label>
          <input type="text" id="profEmergency" class="form-input" value="${state.student.emergency}">
        </div>
        <button type="submit" class="btn-primary full-width">Save Changes</button>
      </form>
    `);

    document.getElementById('editProfileForm').addEventListener('submit', (e) => {
      e.preventDefault();
      state.student.phone = document.getElementById('profPhone').value;
      state.student.emergency = document.getElementById('profEmergency').value;
      alert('Contact records updated.');
      closeModal();
    });
  });

  // ==========================================
  // 14. MODULE 10: PLACEMENT & CAREER
  // ==========================================
  const placementTableBody = document.getElementById('placementTableBody');

  function renderPlacements(filter = 'all') {
    const filtered = state.placements.filter(p => filter === 'all' || (filter === 'tech' && p.type === 'Tech') || (filter === 'intern' && p.type === 'Intern'));

    placementTableBody.innerHTML = filtered.map((p, idx) => `
      <tr>
        <td><strong>${p.company}</strong></td>
        <td>${p.role}</td>
        <td><span class="badge-pill">${p.type}</span></td>
        <td><strong style="color: #10b981;">${p.ctc}</strong></td>
        <td>${p.deadline}</td>
        <td><span class="badge-tag safe-tag">CGPA >= ${p.cgpaMin}</span></td>
        <td>
          <button class="btn-${p.applied ? 'secondary' : 'primary'}" style="font-size: 0.75rem; padding: 5px 12px;" onclick="toggleApplyDrive(${idx})">
            ${p.applied ? '✓ Applied' : 'Apply Now'}
          </button>
        </td>
      </tr>
    `).join('');
  }

  window.toggleApplyDrive = (idx) => {
    state.placements[idx].applied = !state.placements[idx].applied;
    renderPlacements();
  };

  document.querySelectorAll('[data-drive]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-drive]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderPlacements(btn.getAttribute('data-drive'));
    });
  });

  document.getElementById('btnScheduleMockInterview')?.addEventListener('click', () => {
    openModal('Schedule 1-on-1 Mock Interview with Alumni Mentors', `
      <form id="mockForm" style="display:flex; flex-direction:column; gap:12px;">
        <div class="form-group">
          <label>Target Domain:</label>
          <select class="form-select">
            <option>Data Structures & Algorithms (FAANG LeetCode Medium/Hard)</option>
            <option>Low-Level & High-Level System Design</option>
            <option>Machine Learning Engineering & LLM Architecture</option>
            <option>Behavioral & Leadership Principles</option>
          </select>
        </div>
        <div class="form-group">
          <label>Preferred Time Slot:</label>
          <input type="datetime-local" class="form-input" required>
        </div>
        <button type="submit" class="btn-primary full-width">Confirm Slot Reservation</button>
      </form>
    `);

    document.getElementById('mockForm').addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Mock interview confirmed! Zoom calendar link emailed to alex.cs21@apexuniversity.edu.in.');
      closeModal();
    });
  });

  // ==========================================
  // 15. MODULE 11: PROJECTS HUB
  // ==========================================
  const projectsGrid = document.getElementById('projectsGrid');

  function renderProjects() {
    projectsGrid.innerHTML = state.projects.map(p => `
      <div class="project-card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <h3 style="font-size: 1rem; color: #fff;">${p.title}</h3>
          <span class="badge-status ${p.openSeats > 0 ? 'success' : 'warning'}">${p.status}</span>
        </div>
        <p style="font-size: 0.8rem; color: #94a3b8; line-height: 1.4;">${p.desc}</p>
        <div class="project-tags">
          ${p.tags.map(t => `<span class="tag-badge">${t}</span>`).join('')}
        </div>
        <div style="font-size: 0.75rem; color: #cbd5e1;">
          👨‍🏫 Guide: <strong>${p.guide}</strong>
        </div>
        <div style="margin-top:auto; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; align-items:center;">
          <a href="#" onclick="alert('Navigating to: https://${p.repo}')" style="color: #818cf8; font-size: 0.78rem; text-decoration: none;">🔗 ${p.repo}</a>
          ${p.openSeats > 0 ? `<button class="btn-primary" style="font-size: 0.72rem; padding: 4px 10px;" onclick="alert('Join request sent to project leader!')">Join Team (${p.openSeats} Left)</button>` : '<span style="font-size: 0.72rem; color: #64748b;">Team Full</span>'}
        </div>
      </div>
    `).join('');
  }

  document.getElementById('btnNewProjectModal')?.addEventListener('click', () => {
    openModal('Showcase New Research / Capstone Project', `
      <form id="newProjForm" style="display:flex; flex-direction:column; gap:12px;">
        <div class="form-group">
          <label>Project Title:</label>
          <input type="text" id="pTitle" required class="form-input" placeholder="e.g. Real-Time Distributed Consensus Engine">
        </div>
        <div class="form-group">
          <label>Faculty Guide / Mentor:</label>
          <input type="text" id="pGuide" required class="form-input" placeholder="e.g. Dr. Ramesh Rao">
        </div>
        <div class="form-group">
          <label>Tech Stack (comma-separated):</label>
          <input type="text" id="pTags" required class="form-input" placeholder="Golang, Docker, gRPC, React">
        </div>
        <div class="form-group">
          <label>GitHub Repository URL:</label>
          <input type="text" id="pRepo" required class="form-input" placeholder="github.com/alexkumar/project">
        </div>
        <div class="form-group">
          <label>Summary / Abstract:</label>
          <textarea id="pDesc" rows="3" required class="form-textarea"></textarea>
        </div>
        <button type="submit" class="btn-primary full-width">Publish to Campus Showcase</button>
      </form>
    `);

    document.getElementById('newProjForm').addEventListener('submit', (e) => {
      e.preventDefault();
      state.projects.unshift({
        title: document.getElementById('pTitle').value,
        guide: document.getElementById('pGuide').value,
        tags: document.getElementById('pTags').value.split(',').map(s => s.trim()),
        repo: document.getElementById('pRepo').value,
        status: 'Active',
        openSeats: 1,
        desc: document.getElementById('pDesc').value
      });
      renderProjects();
      closeModal();
      alert('Project showcase published!');
    });
  });

  // ==========================================
  // 16. MODULE 12: EVENTS & CLUBS
  // ==========================================
  const eventsGrid = document.getElementById('eventsGrid');

  function renderEvents() {
    eventsGrid.innerHTML = state.events.map((ev, idx) => `
      <div class="event-card">
        <div class="event-header-banner">
          <span>${ev.org}</span>
        </div>
        <div class="event-card-body">
          <h3 style="font-size: 0.95rem; color: #fff;">${ev.title}</h3>
          <span style="font-size: 0.75rem; color: #94a3b8;">📅 ${ev.date} • ${ev.venue}</span>
          <span style="font-size: 0.78rem; color: #10b981; font-weight: 600;">🎁 ${ev.prize}</span>
          <div style="margin-top: auto; padding-top: 10px;">
            <button class="btn-${ev.rsvp ? 'secondary' : 'primary'} full-width" onclick="toggleEventRsvp(${idx})">
              ${ev.rsvp ? '✓ Registered' : 'RSVP & Register'}
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  window.toggleEventRsvp = (idx) => {
    state.events[idx].rsvp = !state.events[idx].rsvp;
    renderEvents();
  };

  document.getElementById('btnViewCertificates')?.addEventListener('click', () => {
    openModal('Verified Credentials & Certificates', `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div style="padding: 12px; background: rgba(255,255,255,0.04); border-radius:8px; border-left: 3px solid #6366f1;">
          <h4 style="color:#fff; font-size:0.9rem;">1st Place Winner - Smart India Hackathon 2025</h4>
          <span style="font-size:0.72rem; color:#94a3b8;">Issued by: Ministry of Education & AICTE • Verification ID: SIH-2025-9982</span>
        </div>
        <div style="padding: 12px; background: rgba(255,255,255,0.04); border-radius:8px; border-left: 3px solid #10b981;">
          <h4 style="color:#fff; font-size:0.9rem;">Google Cloud Certified Associate Cloud Engineer</h4>
          <span style="font-size:0.72rem; color:#94a3b8;">Issued: May 2026 • Valid Upto: May 2029 • ID: GCP-ACE-48821</span>
        </div>
      </div>
    `);
  });

  // ==========================================
  // 17. MODULE 13: LIBRARY MANAGEMENT
  // ==========================================
  const bookResultsList = document.getElementById('bookResultsList');
  const issuedBooksList = document.getElementById('issuedBooksList');
  const librarySearchInput = document.getElementById('librarySearchInput');
  const btnSearchLibrary = document.getElementById('btnSearchLibrary');

  function renderLibrary(query = '') {
    const q = query.toLowerCase().trim();
    const books = state.library.catalog.filter(b => !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));

    bookResultsList.innerHTML = books.map(b => `
      <div style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong style="font-size: 0.85rem; color: #fff;">${b.title}</strong>
          <span style="display:block; font-size: 0.72rem; color: #94a3b8;">By ${b.author} • ISBN: ${b.isbn}</span>
        </div>
        <div style="text-align:right;">
          <span class="badge-status ${b.available > 0 ? 'success' : 'danger'}">${b.available > 0 ? `${b.available} Available` : 'All Issued'}</span>
          ${b.available > 0 ? `<button class="btn-secondary mt-8" style="font-size: 0.7rem; padding: 3px 8px;" onclick="reserveBookAction('${b.title}')">Reserve Copy</button>` : ''}
        </div>
      </div>
    `).join('');

    issuedBooksList.innerHTML = state.library.issued.map((ib, i) => `
      <div style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
        <strong style="font-size: 0.85rem; color: #fff;">${ib.title}</strong>
        <span style="display:block; font-size: 0.72rem; color: #94a3b8;">Due: ${ib.dueDate} (${ib.daysLeft} days remaining) • ${ib.barcode}</span>
        <button class="btn-secondary mt-8" style="font-size: 0.72rem; padding: 4px 10px;" onclick="renewBookAction(${i})">Renew Loan (15 Days)</button>
      </div>
    `).join('');
  }

  btnSearchLibrary.addEventListener('click', () => {
    renderLibrary(librarySearchInput.value);
  });
  librarySearchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') renderLibrary(librarySearchInput.value);
  });

  window.reserveBookAction = (title) => {
    alert(`Reservation placed for "${title}". Collect from Central Library Counter within 24 hours.`);
  };

  window.renewBookAction = (idx) => {
    state.library.issued[idx].daysLeft += 15;
    renderLibrary();
    alert('Book loan successfully renewed for +15 days.');
  };

  // ==========================================
  // 18. MODULE 14: CAMPUS SERVICES & BUS
  // ==========================================
  document.getElementById('btnLostFoundModal')?.addEventListener('click', () => {
    openModal('Campus Lost & Found Items Registry', `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${state.lostFound.map(item => `
            <div style="padding: 10px; background: rgba(255,255,255,0.04); border-radius:8px;">
              <strong style="color:#fff; font-size:0.85rem;">${item.item}</strong>
              <div style="font-size:0.72rem; color:#94a3b8;">Found at: ${item.location} (${item.date})</div>
              <div style="font-size:0.72rem; color:#818cf8;">Claim from: ${item.contact}</div>
            </div>
          `).join('')}
        </div>
        <button class="btn-primary full-width mt-8" onclick="alert('Form opened to report lost or found item.')">+ Report Found Item</button>
      </div>
    `);
  });

  // ==========================================
  // 19. MODULE 15: COMMUNICATIONS & FACULTY
  // ==========================================
  const announcementsFeed = document.getElementById('announcementsFeed');
  const facultyDirectory = document.getElementById('facultyDirectory');

  function renderComms() {
    announcementsFeed.innerHTML = state.announcements.map(a => `
      <div style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
        <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
          <span class="badge-tag">${a.tag}</span>
          <span style="font-size: 0.72rem; color: #94a3b8;">${a.date}</span>
        </div>
        <strong style="color: #fff; font-size: 0.9rem;">${a.title}</strong>
        <p style="font-size: 0.8rem; color: #cbd5e1; margin-top: 4px; line-height: 1.4;">${a.content}</p>
        <span style="font-size: 0.72rem; color: #818cf8; display:block; margin-top: 4px;">Authority: ${a.dept}</span>
      </div>
    `).join('');

    facultyDirectory.innerHTML = state.faculty.map(f => `
      <div style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong style="color: #fff; font-size: 0.85rem;">${f.name}</strong>
          <span style="display:block; font-size: 0.72rem; color: #94a3b8;">${f.role} • ${f.courses}</span>
          <span style="display:block; font-size: 0.7rem; color: #818cf8;">${f.cabin}</span>
        </div>
        <button class="btn-secondary" style="font-size: 0.72rem; padding: 4px 8px;" onclick="bookFacultySlot('${f.name}')">Book Slot</button>
      </div>
    `).join('');
  }

  window.bookFacultySlot = (profName) => {
    openModal(`Book Appointment with ${profName}`, `
      <form id="bookAptForm" style="display:flex; flex-direction:column; gap:12px;">
        <div class="form-group">
          <label>Meeting Purpose / Topic:</label>
          <input type="text" required class="form-input" placeholder="e.g. Capstone Phase-1 Architecture Review">
        </div>
        <div class="form-group">
          <label>Preferred Date & Time:</label>
          <input type="datetime-local" required class="form-input">
        </div>
        <button type="submit" class="btn-primary full-width">Request Calendar Invitation</button>
      </form>
    `);

    document.getElementById('bookAptForm').addEventListener('submit', (e) => {
      e.preventDefault();
      alert(`Meeting request sent to ${profName}! Check your college inbox for confirmation.`);
      closeModal();
    });
  };

  document.getElementById('btnBookAppointment')?.addEventListener('click', () => {
    bookFacultySlot('Faculty Proctor');
  });

  // ==========================================
  // 20. MODULE 16: PERFORMANCE ANALYTICS CHARTS
  // ==========================================
  function renderAnalyticsCharts() {
    // 1. SGPA Line Chart
    const sgpaCanvas = document.getElementById('sgpaChart');
    if (sgpaCanvas) {
      const ctx = sgpaCanvas.getContext('2d');
      const w = sgpaCanvas.width;
      const h = sgpaCanvas.height;
      ctx.clearRect(0, 0, w, h);

      const sems = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6'];
      const values = [9.30, 9.15, 8.95, 9.08, 9.24, 9.18];
      const minG = 8.0, maxG = 10.0;

      // Draw grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let g = 8.0; g <= 10.0; g += 0.5) {
        const y = h - 40 - ((g - minG) / (maxG - minG)) * (h - 70);
        ctx.beginPath();
        ctx.moveTo(50, y);
        ctx.lineTo(w - 20, y);
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.font = '10px JetBrains Mono';
        ctx.textAlign = 'right';
        ctx.fillText(g.toFixed(1), 42, y + 3);
      }

      // Draw line and gradient
      const points = values.map((val, i) => {
        const x = 60 + i * ((w - 90) / (sems.length - 1));
        const y = h - 40 - ((val - minG) / (maxG - minG)) * (h - 70);
        return { x, y, val, label: sems[i] };
      });

      // Gradient Fill
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
      grad.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, h - 40);
      ctx.lineTo(points[0].x, h - 40);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Stroke Line
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw Points
      points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#06b6d4';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Plus Jakarta Sans';
        ctx.textAlign = 'center';
        ctx.fillText(p.val.toFixed(2), p.x, p.y - 10);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px Plus Jakarta Sans';
        ctx.fillText(p.label, p.x, h - 20);
      });
    }

    // 2. Attendance vs Score Bar Chart
    const masteryCanvas = document.getElementById('masteryChart');
    if (masteryCanvas) {
      const ctx = masteryCanvas.getContext('2d');
      const w = masteryCanvas.width;
      const h = masteryCanvas.height;
      ctx.clearRect(0, 0, w, h);

      const labels = ['DS', 'ML', 'Compiler', 'Cloud', 'Cyber'];
      const attData = [87.5, 86.4, 91.7, 79.5, 85.4];
      const marksData = [92, 90, 84, 89, 94];

      const barWidth = 18;
      const spacing = (w - 70) / labels.length;

      labels.forEach((lbl, i) => {
        const xCenter = 50 + i * spacing + spacing / 2;

        // Att Bar
        const attHeight = (attData[i] / 100) * (h - 70);
        const yAtt = h - 35 - attHeight;
        ctx.fillStyle = '#10b981';
        ctx.fillRect(xCenter - barWidth - 2, yAtt, barWidth, attHeight);

        // Marks Bar
        const marksHeight = (marksData[i] / 100) * (h - 70);
        const yMarks = h - 35 - marksHeight;
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(xCenter + 2, yMarks, barWidth, marksHeight);

        // X Label
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px Plus Jakarta Sans';
        ctx.textAlign = 'center';
        ctx.fillText(lbl, xCenter, h - 18);
      });

      // Legend
      ctx.fillStyle = '#10b981';
      ctx.fillRect(w - 180, 15, 10, 10);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px Plus Jakarta Sans';
      ctx.textAlign = 'left';
      ctx.fillText('Attendance %', w - 165, 24);

      ctx.fillStyle = '#6366f1';
      ctx.fillRect(w - 95, 15, 10, 10);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('Marks %', w - 80, 24);
    }
  }

  // ==========================================
  // 21. MODULE 17: FACULTY DOUBT PORTAL
  // ==========================================
  const doubtStream = document.getElementById('doubtStream');

  function renderDoubts() {
    doubtStream.innerHTML = state.doubts.map(d => `
      <div class="doubt-card">
        <div class="doubt-top">
          <span class="badge-tag">${d.course}</span>
          <span style="font-size: 0.72rem; color: #94a3b8;">${d.time}</span>
        </div>
        <p style="font-size: 0.88rem; color: #fff; line-height: 1.4; margin-top: 6px;">${d.question}</p>
        <span style="font-size: 0.72rem; color: #818cf8; display: block; margin-top: 4px;">Posted by: ${d.author}</span>
        ${d.reply ? `
          <div class="faculty-reply-box">
            <div class="faculty-name">✓ ${d.reply.faculty}</div>
            <p style="color: #cbd5e1; line-height: 1.4;">${d.reply.text}</p>
          </div>
        ` : `<div style="margin-top: 8px; font-size: 0.75rem; color: #f59e0b;">⏳ Pending faculty review</div>`}
      </div>
    `).join('');
  }

  document.getElementById('btnAskDoubtModal')?.addEventListener('click', () => {
    openModal('Post Subject Doubt to Course Instructor', `
      <form id="askDoubtForm" style="display:flex; flex-direction:column; gap:12px;">
        <div class="form-group">
          <label>Course / Subject:</label>
          <select id="doubtCourse" class="form-select">
            <option>CS601: Distributed Systems</option>
            <option>CS602: Machine Learning</option>
            <option>CS603: Compiler Design</option>
            <option>CS604: Cloud Architecture</option>
            <option>CS605: Cyber Security</option>
          </select>
        </div>
        <div class="form-group">
          <label>Your Question / Query:</label>
          <textarea id="doubtText" required rows="3" class="form-textarea" placeholder="Detail the concept, theorem, or code behavior..."></textarea>
        </div>
        <div class="form-group">
          <label>Optional Code Snippet or Diagram (Mock upload):</label>
          <input type="file" class="form-input">
        </div>
        <button type="submit" class="btn-primary full-width">Publish Question</button>
      </form>
    `);

    document.getElementById('askDoubtForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const course = document.getElementById('doubtCourse').value;
      const text = document.getElementById('doubtText').value;

      state.doubts.unshift({
        id: Date.now(),
        course: course,
        author: 'Alex Kumar',
        time: 'Just now',
        question: text,
        status: 'Pending',
        reply: null
      });

      renderDoubts();
      closeModal();
      alert('Academic doubt submitted! Instructor will receive instant notification.');
    });
  });

  // ==========================================
  // 22. GLOBAL SEARCH FILTER
  // ==========================================
  const globalSearch = document.getElementById('globalSearch');
  globalSearch.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) return;

    // Search mapping
    if (q.includes('att') || q.includes('bunk')) switchView('view-attendance');
    else if (q.includes('mark') || q.includes('grade') || q.includes('score')) switchView('view-performance');
    else if (q.includes('time') || q.includes('sched') || q.includes('class')) switchView('view-timetable');
    else if (q.includes('assign') || q.includes('dead')) switchView('view-assignments');
    else if (q.includes('note') || q.includes('pdf') || q.includes('book')) switchView('view-notes');
    else if (q.includes('exam') || q.includes('hall') || q.includes('ticket')) switchView('view-exams');
    else if (q.includes('calc') || q.includes('gpa') || q.includes('sgpa')) switchView('view-gpa-calc');
    else if (q.includes('place') || q.includes('job') || q.includes('career')) switchView('view-placements');
    else if (q.includes('proj')) switchView('view-projects');
    else if (q.includes('club') || q.includes('event')) switchView('view-events');
    else if (q.includes('lib')) switchView('view-library');
    else if (q.includes('bus') || q.includes('canteen') || q.includes('food')) switchView('view-services');
    else if (q.includes('doubt') || q.includes('prof')) switchView('view-doubts');
    else if (q.includes('id') || q.includes('card')) switchView('view-profile');
  });

  // ==========================================
  // 23. BACKEND POSTGRESQL SYNC
  // ==========================================
  async function syncWithBackend() {
    try {
      const healthRes = await fetch('/api/health');
      if (!healthRes.ok) return;
      const health = await healthRes.json();
      console.log('[API] Backend online, DB status:', health.status);

      const studentRes = await fetch('/api/student');
      if (studentRes.ok) {
        const student = await studentRes.json();
        state.student = { ...state.student, ...student };
        const miniName = document.querySelector('.mini-name');
        const miniUsn = document.querySelector('.mini-usn');
        if (miniName) miniName.textContent = student.name;
        if (miniUsn) miniUsn.textContent = student.usn;
        const hCgpa = document.getElementById('headerCgpa');
        const hAtt = document.getElementById('headerAttRate');
        if (hCgpa) hCgpa.textContent = student.cgpa;
        if (hAtt) hAtt.textContent = student.overall_attendance + '%';
      }

      const attRes = await fetch('/api/attendance');
      if (attRes.ok) {
        state.attendance = await attRes.json();
        renderAttendanceTable();
        runAttendanceCalc();
      }

      const assigRes = await fetch('/api/assignments');
      if (assigRes.ok) {
        state.assignments = await assigRes.json();
        renderAssignments('all');
      }

      const notesRes = await fetch('/api/notes');
      if (notesRes.ok) {
        state.notes = await notesRes.json();
        renderNotes('all');
      }

      const placeRes = await fetch('/api/placements');
      if (placeRes.ok) {
        state.placements = await placeRes.json();
        renderPlacements('all');
      }
    } catch (e) {
      console.log('[API] Local offline fallback active');
    }
  }

  // ==========================================
  // INITIALIZATION RUN
  // ==========================================
  renderMarksTable(6);
  renderAttendanceTable();
  runAttendanceCalc();
  renderTimetable(2);
  renderOverviewWidgets();
  renderAssignments('all');
  renderNotes('all');
  renderExamList();
  renderGpaCalcTable();
  renderPlacements('all');
  renderProjects();
  renderEvents();
  renderLibrary();
  renderComms();
  renderDoubts();
  syncWithBackend();
});
