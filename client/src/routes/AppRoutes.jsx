import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute.jsx';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { ROLES } from '../utils/constants.js';

import Landing from '../pages/public/Landing.jsx';
import Login from '../pages/public/Login.jsx';
import Register from '../pages/public/Register.jsx';
import NotFound from '../pages/public/NotFound.jsx';

import StudentDashboard from '../pages/student/StudentDashboard.jsx';
import SubmitComplaint from '../pages/student/SubmitComplaint.jsx';
import MyComplaints from '../pages/student/MyComplaints.jsx';
import Profile from '../pages/shared/Profile.jsx';
import ComplaintDetails from '../pages/shared/ComplaintDetails.jsx';

import AdminDashboard from '../pages/admin/AdminDashboard.jsx';
import ManageComplaints from '../pages/admin/ManageComplaints.jsx';
import ManageUsers from '../pages/admin/ManageUsers.jsx';
import Analytics from '../pages/admin/Analytics.jsx';

import StaffDashboard from '../pages/staff/StaffDashboard.jsx';
import AssignedTasks from '../pages/staff/AssignedTasks.jsx';

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <Register />
          </PublicOnlyRoute>
        }
      />

      {/* Every authenticated area shares the sidebar shell. */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/profile" element={<Profile />} />
        <Route path="/complaints/:id" element={<ComplaintDetails />} />
      </Route>

      <Route
        element={
          <ProtectedRoute allow={[ROLES.STUDENT]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/student/complaints" element={<MyComplaints />} />
        <Route path="/student/complaints/new" element={<SubmitComplaint />} />
      </Route>

      <Route
        element={
          <ProtectedRoute allow={[ROLES.ADMIN]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/complaints" element={<ManageComplaints />} />
        <Route path="/admin/users" element={<ManageUsers />} />
        <Route path="/admin/staff" element={<ManageUsers fixedRole={ROLES.STAFF} />} />
        <Route path="/admin/analytics" element={<Analytics />} />
      </Route>

      <Route
        element={
          <ProtectedRoute allow={[ROLES.STAFF]}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/staff" element={<StaffDashboard />} />
        <Route path="/staff/tasks" element={<AssignedTasks />} />
      </Route>

      <Route path="/" element={<Landing />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
