import { useEffect, useState } from "react";
import {
  Building2,
  Users,
  Brain,
  GraduationCap,
  MapPin,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

interface Institution {
  id: number;
  name: string;
  code: string;
  type: string;
  state: string;
  district: string;
  city: string;
}

interface Overview {
  students: number;
  faculty: number;
  assessed_skills: number;
}

interface Student {
  student_id: number;
  student_code: string;
  department: string;
  degree: string;
  graduation_year: number;
  cgpa: number;
}

interface InstitutionAnalytics {
  scope: string;
  institution: Institution;
  overview: Overview;
  students: Student[];
}

export default function InstitutionDashboard() {
  const { user, logout } = useAuth();

  const [data, setData] = useState<InstitutionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const institutionId = user?.institution_id;

      if (!institutionId) {
        throw new Error(
          "No institution is associated with this administrator account.",
        );
      }

      const response = await api.get(
        `/api/analytics/institution/${institutionId}`,
      );

      setData(response.data);
    } catch (err: any) {
      console.error("Institution dashboard error:", err);

      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to load institution data.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user?.institution_id]);

  const filteredStudents =
    data?.students.filter((student) => {
      const query = search.toLowerCase();

      return (
        student.student_code?.toLowerCase().includes(query) ||
        student.department?.toLowerCase().includes(query) ||
        student.degree?.toLowerCase().includes(query)
      );
    }) ?? [];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
            <p className="text-sm font-medium text-slate-600">
              Loading institution dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Building2 size={23} />
              </div>

              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  AYUSH Skill Intelligence Platform
                </h1>
                <p className="text-xs text-slate-500">
                  Institution Administration Portal
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-10">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h2 className="text-lg font-semibold text-red-800">
              Unable to load institution dashboard
            </h2>

            <p className="mt-2 text-sm text-red-700">{error}</p>

            <button
              onClick={fetchDashboard}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Building2 size={23} />
            </div>

            <div>
              <h1 className="text-lg font-bold text-slate-900">
                AYUSH Skill Intelligence Platform
              </h1>

              <p className="text-xs text-slate-500">
                Institution Administration Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {user?.name || "Institution Administrator"}
              </p>

              <p className="text-xs text-slate-500">
                Institution Administrator
              </p>
            </div>

            <button
              onClick={logout}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Institution identity */}
        <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white px-6 py-6">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <Building2 size={17} />
                  Institution Overview
                </div>

                <h2 className="text-2xl font-bold text-slate-900">
                  {data.institution.name}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Institution Code: {data.institution.code}
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <MapPin size={18} className="text-emerald-600" />

                <div>
                  <p className="text-xs font-medium text-slate-400">
                    Location
                  </p>

                  <p className="text-sm font-semibold text-slate-700">
                    {data.institution.city}, {data.institution.district},{" "}
                    {data.institution.state}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="px-6 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Institution Type
              </p>

              <p className="mt-1 font-semibold text-slate-800">
                {data.institution.type}
              </p>
            </div>

            <div className="px-6 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                State
              </p>

              <p className="mt-1 font-semibold text-slate-800">
                {data.institution.state}
              </p>
            </div>

            <div className="px-6 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                District
              </p>

              <p className="mt-1 font-semibold text-slate-800">
                {data.institution.district}
              </p>
            </div>
          </div>
        </section>

        {/* Page title */}
        <div className="mb-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold text-emerald-600">
                Institution Intelligence
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Academic & Skill Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Monitor students, faculty and assessed skills within your
                institution.
              </p>
            </div>

            <button
              onClick={fetchDashboard}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw size={16} />
              Refresh Data
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Students
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {data.overview.students}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Registered students
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Users size={21} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Faculty
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {data.overview.faculty}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Faculty members
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <GraduationCap size={21} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Assessed Skills
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {data.overview.assessed_skills}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Recorded skill assessments
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Brain size={21} />
              </div>
            </div>
          </div>
        </section>

        {/* Students */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-6 py-5 md:flex-row md:items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Institution Students
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Students registered under this institution.
              </p>
            </div>

            <div className="relative w-full md:w-72">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Student
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Department
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Degree
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Graduation
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    CGPA
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <tr
                      key={student.student_id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                            <UserRound size={17} />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {student.student_code}
                            </p>

                            <p className="text-xs text-slate-400">
                              ID: {student.student_id}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {student.department || "—"}
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {student.degree || "—"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {student.graduation_year || "—"}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800">
                          {typeof student.cgpa === "number"
                            ? student.cgpa.toFixed(1)
                            : "—"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-sm text-slate-500"
                    >
                      No students found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 px-6 py-4">
            <p className="text-xs text-slate-400">
              Showing {filteredStudents.length} of {data.students.length}{" "}
              students
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}