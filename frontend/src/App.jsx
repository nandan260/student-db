import React, { useState } from 'react';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import DashboardHome from './components/Dashboard/DashboardHome';
import {
  AcademicPerformanceView,
  AttendanceView,
  AttendanceCalculatorView,
  TimetableView,
  AssignmentsView,
  NotesView,
  ExaminationsView,
  GpaCalculatorView,
  StudentProfileView,
  PlacementsView,
  ProjectsView,
  EventsView,
  LibraryView,
  CampusServicesView,
  NotificationsView,
  PerformanceAnalyticsView,
  FacultyDoubtPortalView
} from './components/Modules/ModuleViews';

export default function App() {
  const [currentUser] = useState({
    name: 'Alex Kumar',
    identifier: '1MS21CS084',
    role: 'student',
    department: 'Computer Science & Engineering',
    semester: 6
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeTitle, setActiveTitle] = useState('Dashboard');

  const handleSelectTab = (tabId, label) => {
    setActiveTab(tabId);
    setActiveTitle(label);
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardHome onNavigate={handleSelectTab} />;
      case 'academics':
        return <AcademicPerformanceView />;
      case 'attendance':
        return <AttendanceView />;
      case 'attendance_calc':
        return <AttendanceCalculatorView />;
      case 'timetable':
        return <TimetableView />;
      case 'assignments':
        return <AssignmentsView />;
      case 'notes':
        return <NotesView />;
      case 'examinations':
        return <ExaminationsView />;
      case 'gpa_calc':
        return <GpaCalculatorView />;
      case 'profile':
        return <StudentProfileView />;
      case 'placements':
        return <PlacementsView />;
      case 'projects':
        return <ProjectsView />;
      case 'events':
        return <EventsView />;
      case 'library':
        return <LibraryView />;
      case 'services':
        return <CampusServicesView />;
      case 'notifications':
        return <NotificationsView />;
      case 'analytics':
        return <PerformanceAnalyticsView />;
      case 'doubts':
        return <FacultyDoubtPortalView />;
      default:
        return <DashboardHome onNavigate={handleSelectTab} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} onSelectTab={handleSelectTab} />
      <div className="main-wrapper">
        <Navbar
          user={currentUser}
          activeTitle={activeTitle}
        />
        <main className="content-area">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}
