import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/router/ProtectedRoute';
import PublicLayout from '@/components/layout/PublicLayout';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageLoader } from '@/components/ui';

// Lazy-loaded routes keep the initial mobile bundle small (perf requirement).
const Home = lazy(() => import('@/pages/public/HomePage'));
const Directory = lazy(() => import('@/pages/public/DirectoryPage'));
const ClinicProfile = lazy(() => import('@/pages/public/ClinicProfilePage'));
const InfoPortal = lazy(() => import('@/pages/public/InfoPortalPage'));
const Article = lazy(() => import('@/pages/public/ArticlePage'));
const Emergency = lazy(() => import('@/pages/public/EmergencyPage'));
const NotFound = lazy(() => import('@/pages/public/NotFoundPage'));
const Unauthorized = lazy(() => import('@/pages/public/UnauthorizedPage'));

const Login = lazy(() => import('@/pages/auth/LoginPage'));
const Register = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPasswordPage'));

const OwnerDashboard = lazy(() => import('@/pages/owner/OwnerDashboard'));
const MyAnimals = lazy(() => import('@/pages/owner/MyAnimalsPage'));
const MyAppointments = lazy(() => import('@/pages/owner/MyAppointmentsPage'));
const Booking = lazy(() => import('@/pages/owner/BookingPage'));
const Vaccinations = lazy(() => import('@/pages/owner/VaccinationsPage'));
const Profile = lazy(() => import('@/pages/owner/ProfilePage'));

const ClinicDashboard = lazy(() => import('@/pages/clinic/ClinicDashboard'));
const ClinicAppointments = lazy(() => import('@/pages/clinic/ClinicAppointmentsPage'));
const ClinicAvailability = lazy(() => import('@/pages/clinic/AvailabilityPage'));
const ClinicReviews = lazy(() => import('@/pages/clinic/ClinicReviewsPage'));
const ClinicManage = lazy(() => import('@/pages/clinic/ClinicManagePage'));
const VetManage = lazy(() => import('@/pages/clinic/VetManagePage'));

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminClinics = lazy(() => import('@/pages/admin/AdminClinicsPage'));
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminReviews = lazy(() => import('@/pages/admin/AdminReviewsPage'));
const AdminArticles = lazy(() => import('@/pages/admin/AdminArticlesPage'));
const AdminEmergency = lazy(() => import('@/pages/admin/AdminEmergencyPage'));

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Public ─────────────────────────────────────────── */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/directory" element={<Directory />} />
          <Route path="/clinics/:slug" element={<ClinicProfile />} />
          <Route path="/info" element={<InfoPortal />} />
          <Route path="/info/:slug" element={<Article />} />
          <Route path="/emergency" element={<Emergency />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
        </Route>

        {/* ── Auth ───────────────────────────────────────────── */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ── Animal Owner ───────────────────────────────────── */}
        <Route element={<ProtectedRoute roles={['OWNER']}><DashboardLayout scope="owner" /></ProtectedRoute>}>
          <Route path="/app/dashboard" element={<OwnerDashboard />} />
          <Route path="/app/animals" element={<MyAnimals />} />
          <Route path="/app/appointments" element={<MyAppointments />} />
          <Route path="/app/book" element={<Booking />} />
          <Route path="/app/book/:clinicSlug" element={<Booking />} />
          <Route path="/app/vaccinations" element={<Vaccinations />} />
          <Route path="/app/profile" element={<Profile />} />
        </Route>

        {/* ── Clinic Admin ───────────────────────────────────── */}
        <Route element={<ProtectedRoute roles={['CLINIC_ADMIN']}><DashboardLayout scope="clinic" /></ProtectedRoute>}>
          <Route path="/clinic/dashboard" element={<ClinicDashboard />} />
          <Route path="/clinic/appointments" element={<ClinicAppointments />} />
          <Route path="/clinic/availability" element={<ClinicAvailability />} />
          <Route path="/clinic/reviews" element={<ClinicReviews />} />
          <Route path="/clinic/profile" element={<ClinicManage />} />
          <Route path="/clinic/veterinarians" element={<VetManage />} />
        </Route>

        {/* ── System Admin ───────────────────────────────────── */}
        <Route element={<ProtectedRoute roles={['SUPER_ADMIN']}><DashboardLayout scope="admin" /></ProtectedRoute>}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/clinics" element={<AdminClinics />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/reviews" element={<AdminReviews />} />
          <Route path="/admin/articles" element={<AdminArticles />} />
          <Route path="/admin/emergency" element={<AdminEmergency />} />
        </Route>

        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
}
