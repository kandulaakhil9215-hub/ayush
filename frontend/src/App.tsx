import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";

import Login from "./pages/Login";
import StudentDashboard from "./pages/StudentDashboard";
import IndustryDashboard from "./pages/IndustryDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import InstitutionDashboard from "./pages/InstitutionDashboard";

const StudentDashboardComponent =
  StudentDashboard as unknown as React.ComponentType;

const AdminDashboardComponent =
  AdminDashboard as unknown as React.ComponentType;

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { token, user } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (
    allowedRoles &&
    user &&
    !allowedRoles.includes(user.role)
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

function Placeholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-lg rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          ✓
        </div>

        <h1 className="text-2xl font-bold text-slate-900">
          {title}
        </h1>

        <p className="mt-3 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>

      {/* =========================
          LOGIN
      ========================== */}
      <Route
        path="/login"
        element={<Login />}
      />


      {/* =========================
          STUDENT
      ========================== */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={["STUDENT"]}>
            <StudentDashboardComponent />
          </ProtectedRoute>
        }
      />


      {/* =========================
          INDUSTRY
      ========================== */}
      <Route
        path="/industry"
        element={
          <ProtectedRoute allowedRoles={["INDUSTRY"]}>
            <IndustryDashboard />
          </ProtectedRoute>
        }
      />


      {/* =========================
          FACULTY
      ========================== */}
      <Route
        path="/faculty"
        element={
          <ProtectedRoute
            allowedRoles={["FACULTY", "ACADEMICIAN"]}
          >
            <FacultyDashboard />
          </ProtectedRoute>
        }
      />


      {/* =========================
          INSTITUTION / COLLEGE
      ========================== */}
      <Route
        path="/institution"
        element={
          <ProtectedRoute
            allowedRoles={["INSTITUTION_ADMIN"]}
          >
            <InstitutionDashboard />
          </ProtectedRoute>
        }
      />


      {/* =========================
          ADMINISTRATION
      ========================== */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute
            allowedRoles={[
              "SUPER_ADMIN",
              "NATIONAL_ADMIN",
              "STATE_ADMIN",
            ]}
          >
            <AdminDashboardComponent />
          </ProtectedRoute>
        }
      />


      {/* =========================
          UNAUTHORIZED
      ========================== */}
      <Route
        path="/unauthorized"
        element={
          <Placeholder
            title="Access restricted"
            description="Your account does not have permission to access this portal."
          />
        }
      />


      {/* =========================
          UNKNOWN ROUTE
      ========================== */}
      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />

    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
