# Student DB - 17-Module Campus Management Portal

A full-stack, enterprise-grade Student Management Dashboard and PostgreSQL backend featuring 17 distinct academic, campus, and career modules with a modern dark theme.

![Theme](https://img.shields.io/badge/Theme-Dark%20Glassmorphism-6366f1)
![Node](https://img.shields.io/badge/Node.js-v24-green)
![Express](https://img.shields.io/badge/Express-v4.21-blue)
![Database](https://img.shields.io/badge/Database-PostgreSQL-336791)

---

## 🎯 17 Comprehensive Modules

1. **Academic Performance & Marks**: S1–S6 semester selector, CIE (IA+Lab) & SEE score breakdown, SGPA rollup, printable transcript card.
2. **Smart Attendance**: Circular progress visualization (88.4%), subject-wise present/absent/OD logs, On-Duty (OD) request modal.
3. **Attendance & Bunk Calculator**: Two-way forecaster calculating safe bunks vs consecutive classes needed for >=75% compliance.
4. **Dynamic Timetable**: Monday–Saturday interactive schedule switcher, room numbers, faculty info, active slot tracker.
5. **Assignment Tracker**: Status tabs (Pending, Submitted, Graded), assignment upload modal, rubric score feedback.
6. **Notes & Study Vault**: Subject-filtered document downloads (PDFs, PPTs, Lab Manuals, PYQs 2021–2025).
7. **Examination Portal**: Official verified admit card with barcode, seating hall allotment, revaluation filing system.
8. **SGPA & CGPA Calculator**: Real-time credit weighting, grade point multipliers, cumulative degree projection.
9. **Student Profile & Digital ID**: Smart NFC-style card with dynamic SVG QR code, USN credentials, emergency contact manager.
10. **Placement & Career**: Recruitment drive tracker (Google, Microsoft, AWS, Cisco), ATS match score gauge, mock interview scheduler.
11. **Projects Hub**: Project showcase cards, open teammate vacancy counter, faculty guides, GitHub repository links.
12. **Events & Clubs**: Technical symposiums, hackathons, RSVP status toggles, verifiable credentials viewer.
13. **Central Library Portal**: Real-time OPAC search, book reservation, active loans with due date countdown & 15-day renewal.
14. **Campus Services**: Live shuttle bus route GPS tracker simulation, cafeteria live menu, lost & found registry.
15. **Communications & Faculty Directory**: Official department circulars, faculty cabin directory, appointment booking.
16. **Performance Analytics**: Native HTML5 Canvas charts (6-semester SGPA trajectory line graph + Attendance vs Marks correlation).
17. **Faculty Doubt Portal**: Interactive Q&A discussion feed with verified instructor responses.

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla JS (ES6+), HTML5 Canvas, Responsive CSS Variables, Glassmorphism, Print Media Styles.
- **Backend**: Node.js, Express.js REST API.
- **Database**: PostgreSQL with connection pooling via `pg` (node-postgres), relational schema with foreign keys and indexes.

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/nandan260/student-db.git
cd student-db
npm install
```

### 2. Configure Environment
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```
Set your PostgreSQL connection string in `.env`:
```env
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/student_db
# Or Cloud PostgreSQL (Neon / Supabase):
# DATABASE_URL=postgresql://user:pass@ep-cool-db.us-east-2.aws.neon.tech/student_db?sslmode=require
```

### 3. Initialize & Seed Database
```bash
npm run seed
```

### 4. Start Server
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📂 Project Structure

```
├── index.html       # Single-Page Application interface
├── styles.css       # Dark-first design system & print styles
├── app.js           # Client state machine, canvas charts, API sync
├── server.js        # Express REST API routes
├── db.js            # PostgreSQL connection pool & auto-init
├── seed.js          # Database seeder for all 17 modules
├── schema.sql       # PostgreSQL DDL table definitions
└── package.json     # Project dependencies & scripts
```

---

## 📜 License
MIT License
