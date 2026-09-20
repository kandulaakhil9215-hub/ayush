import { useEffect, useMemo, useState } from "react";
import {
  Award,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

interface Skill {
  skill_id: number;
  skill_name: string;
  category: string;
  ayush_system: string;
  score: number;
  level: string;
  verified: boolean;
  source: string;
  last_assessed_at?: string;
}

interface SkillsResponse {
  student_id: number;
  student_identifier: string;
  total_skills: number;
  verified_skills: number;
  overall_score: number;
  skills: Skill[];
}
interface Career {
  career_role_id?: number;
  id?: number;
  career_role_name?: string;
  career_name?: string;
  role_name?: string;
  name?: string;
  title?: string;
  match_percentage?: number;
  overall_match_percentage?: number;
  eligible?: boolean;
  readiness?: string;
  readiness_level?: string;
  role?: {
    name?: string;
  };
  career_role?: {
    name?: string;
  };
}
interface Opportunity {
  id?: number;
  opportunity_id?: number;
  internship_id?: number;
  job_id?: number;
  title?: string;
  organization?: string;
  industry_name?: string;
  opportunity_type?: string;
  match_percentage?: number;
  overall_match_percentage?: number;
  eligibility?: boolean;
  eligible?: boolean;
  status?: string;
  location?: string;
  application_deadline?: string;
  industry?: {
    name?: string;
  };
  company?: {
    name?: string;
  };
}
interface ApplicationStatusHistory {
  id: number;
  old_status?: string | null;
  new_status: string;
  remarks?: string | null;
  changed_at: string;
}

interface Application {
  id?: number;
  application_id?: number;
  title?: string;
  opportunity_title?: string;
  organization?: string;
  status?: string;
  applied_at?: string;
  opportunity_type?: string;
  opportunity_id?: number;
  internship_id?: number | null;
  job_id?: number | null;
  status_history?: ApplicationStatusHistory[];
}

interface InternshipProgress {
  id?: number;
  internship_progress_id?: number;
  title?: string;
  opportunity_title?: string;
  status?: string;
  progress_percentage?: number;
  attendance_percentage?: number;
  tasks_completed?: number;
  total_tasks?: number;
}

interface Course {
  id?: number;
  title?: string;
  provider?: string;
  industry_training_relevance_score?: number;
  industry_training_relevance?: string;
  score?: number;
  recommendation_score?: number;
}

interface Notification {
  id: number;
  title?: string;
  message?: string;
  is_read?: boolean;
  created_at?: string;
}

interface Passport {
  total_assessed_skills?: number;
  total_verified_skills?: number;
  average_assessed_score?: number;
  average_verified_score?: number;
  verified_skills?: Skill[];
  assessed_skills?: Skill[];
}

interface DashboardData {
  careers: Career[];
  opportunities: Opportunity[];
  applications: Application[];
  internship: InternshipProgress[];
  courses: Course[];
  notifications: Notification[];
  passport: Passport | null;
}

function getArray<T>(data: unknown, keys: string[] = []): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (data && typeof data === "object") {
    const object = data as Record<string, unknown>;

    for (const key of keys) {
      if (Array.isArray(object[key])) {
        return object[key] as T[];
      }
    }
  }

  return [];
}

function getNumber(
  value: number | undefined | null,
  fallback = 0,
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function formatDate(date?: string) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date?: string) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status?: string) {
  if (!status) return "UNKNOWN";

  return status.replaceAll("_", " ");
}

function statusClasses(status?: string) {
  const normalized = status?.toUpperCase();

  if (
    normalized === "SELECTED" ||
    normalized === "COMPLETED" ||
    normalized === "SHORTLISTED"
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    normalized === "INTERVIEW_SCHEDULED" ||
    normalized === "UNDER_REVIEW" ||
    normalized === "IN_PROGRESS"
  ) {
    return "bg-blue-50 text-blue-700";
  }

  if (
    normalized === "REJECTED" ||
    normalized === "CANCELLED" ||
    normalized === "WITHDRAWN"
  ) {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-600";
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [skills, setSkills] =
    useState<SkillsResponse | null>(null);

  const [dashboard, setDashboard] =
    useState<DashboardData>({
      careers: [],
      opportunities: [],
      applications: [],
      internship: [],
      courses: [],
      notifications: [],
      passport: null,
    });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [error, setError] = useState("");

  const [selectedOpportunity, setSelectedOpportunity] =
    useState<Opportunity | null>(null);

  const [applying, setApplying] = useState(false);
  const [applicationMessage, setApplicationMessage] =
    useState("");

  const [selectedApplication, setSelectedApplication] =
    useState<Application | null>(null);

  const [applicationDetailsLoading, setApplicationDetailsLoading] =
    useState(false);

  const firstName =
    user?.name?.split(" ")[0] || "Student";

  const loadDashboard = async () => {
    try {
      setError("");

      const results = await Promise.allSettled([
        api.get<SkillsResponse>("/api/skills/my-skills"),
        api.get("/api/career-matching/my-careers"),
        api.get("/api/student/opportunities/recommended"),
        api.get("/api/applications/my"),
        api.get("/api/internship/my"),
        api.get("/api/student/learning/recommendations"),
        api.get("/api/notifications/my"),
        api.get("/api/portfolio/my/skill-passport"),
      ]);

      const [
        skillsResult,
        careersResult,
        opportunitiesResult,
        applicationsResult,
        internshipResult,
        coursesResult,
        notificationsResult,
        passportResult,
      ] = results;

      if (skillsResult.status === "fulfilled") {
        setSkills(skillsResult.value.data);
      }

      setDashboard({
        careers:
          careersResult.status === "fulfilled"
            ? getArray<Career>(
                careersResult.value.data,
                [
                  "careers",
                  "recommendations",
                  "career_matches",
                ],
              )
            : [],

        opportunities:
          opportunitiesResult.status === "fulfilled"
            ? getArray<Opportunity>(
                opportunitiesResult.value.data,
                [
                  "recommendations",
                  "opportunities",
                  "results",
                ],
              )
            : [],

        applications:
          applicationsResult.status === "fulfilled"
            ? getArray<Application>(
                applicationsResult.value.data,
                [
                  "applications",
                  "results",
                ],
              )
            : [],

        internship:
          internshipResult.status === "fulfilled"
            ? getArray<InternshipProgress>(
                internshipResult.value.data,
                [
                  "internships",
                  "progress",
                  "results",
                ],
              )
            : [],

        courses:
          coursesResult.status === "fulfilled"
            ? getArray<Course>(
                coursesResult.value.data,
                [
                  "recommendations",
                  "courses",
                  "results",
                ],
              )
            : [],

        notifications:
          notificationsResult.status === "fulfilled"
            ? getArray<Notification>(
                notificationsResult.value.data,
                [
                  "notifications",
                  "results",
                ],
              )
            : [],

        passport:
          passportResult.status === "fulfilled"
            ? passportResult.value.data
            : null,
      });

      if (skillsResult.status === "rejected") {
        setError(
          "Unable to load your skill profile.",
        );
      }
    } catch (err) {
      console.error(
        "Unable to load student dashboard:",
        err,
      );

      setError(
        "Unable to load dashboard data.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleOpenOpportunity = (
    opportunity: Opportunity,
  ) => {
    setApplicationMessage("");
    setSelectedOpportunity(opportunity);
  };

  const handleApply = async () => {
    if (!selectedOpportunity) {
      return;
    }

    setApplying(true);
    setApplicationMessage("");

    try {
      const opportunityType =
        String(
          selectedOpportunity.opportunity_type || "",
        ).toUpperCase();

      const opportunityId =
        selectedOpportunity.opportunity_id ??
        selectedOpportunity.id ??
        selectedOpportunity.internship_id ??
        selectedOpportunity.job_id;

      if (!opportunityId) {
        throw new Error(
          "Unable to identify this opportunity.",
        );
      }

      let payload: {
        internship_id: number | null;
        job_id: number | null;
        cover_letter: string;
        resume_url: string | null;
      };

      if (opportunityType === "INTERNSHIP") {
        payload = {
          internship_id: Number(opportunityId),
          job_id: null,
          cover_letter: "",
          resume_url: null,
        };
      } else if (opportunityType === "JOB") {
        payload = {
          internship_id: null,
          job_id: Number(opportunityId),
          cover_letter: "",
          resume_url: null,
        };
      } else {
        throw new Error(
          `Unsupported opportunity type: ${selectedOpportunity.opportunity_type}`,
        );
      }

      await api.post(
        "/api/applications",
        payload,
      );

      setApplicationMessage(
        "Application submitted successfully.",
      );

      await loadDashboard();
    } catch (err: any) {
      console.error(
        "Application failed:",
        err,
      );

      const detail =
        err?.response?.data?.detail;

      if (
        typeof detail === "string" &&
        detail
          .toLowerCase()
          .includes("already applied")
      ) {
        setApplicationMessage(
          "You have already applied for this opportunity.",
        );
      } else {
        setApplicationMessage(
          typeof detail === "string"
            ? detail
            : "Unable to submit application. Please try again.",
        );
      }
    } finally {
      setApplying(false);
    }
  };

  const handleOpenApplication = async (
    application: Application,
  ) => {
    const applicationId =
      application.application_id ??
      application.id;

    if (!applicationId) {
      return;
    }

    setApplicationDetailsLoading(true);
    setSelectedApplication(null);

    try {
      const response = await api.get(
        `/api/applications/${applicationId}`,
      );

      setSelectedApplication({
        ...application,
        ...response.data,
      });
    } catch (err) {
      console.error(
        "Unable to load application details:",
        err,
      );

      setSelectedApplication(application);
    } finally {
      setApplicationDetailsLoading(false);
    }
  };

  const scrollTo = (id: string) => {
    setMobileMenu(false);

    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  const verificationCoverage = useMemo(() => {
    if (!skills?.total_skills) {
      return 0;
    }

    return Math.round(
      (skills.verified_skills /
        skills.total_skills) *
        100,
    );
  }, [skills]);

  const unreadNotifications =
    dashboard.notifications.filter(
      (notification) =>
        !notification.is_read,
    ).length;

  const topCareers =
    dashboard.careers.slice(0, 3);

  const topOpportunities =
    dashboard.opportunities.slice(0, 4);

  const topCourses =
    dashboard.courses.slice(0, 4);

  const activeInternship =
    dashboard.internship.find(
      (item) =>
        item.status === "IN_PROGRESS" ||
        item.status === "NOT_STARTED",
    ) ||
    dashboard.internship[0];

  const navigation = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      action: () =>
        scrollTo("dashboard-top"),
      active: true,
    },
    {
      label: "My Skills",
      icon: TrendingUp,
      action: () =>
        scrollTo("skills-section"),
    },
    {
      label: "Assessments",
      icon: BookOpen,
      action: () =>
        scrollTo("learning-section"),
    },
    {
      label: "Career",
      icon: GraduationCap,
      action: () =>
        scrollTo("career-section"),
    },
    {
      label: "Opportunities",
      icon: BriefcaseBusiness,
      action: () =>
        scrollTo("opportunities-section"),
    },
    {
      label: "Portfolio",
      icon: Award,
      action: () =>
        scrollTo("passport-section"),
    },
  ];

  return (
    <div
      id="dashboard-top"
      className="min-h-screen bg-slate-50 text-slate-900"
    >
      {/* Mobile overlay */}
      {mobileMenu && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() =>
            setMobileMenu(false)
          }
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0 ${
          mobileMenu
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <ShieldCheck size={22} />
            </div>

            <div>
              <p className="font-bold text-slate-900">
                AYUSH Connect
              </p>

              <p className="text-[11px] text-slate-400">
                Student Portal
              </p>
            </div>
          </div>

          <button
            className="text-slate-400 lg:hidden"
            onClick={() =>
              setMobileMenu(false)
            }
          >
            <X size={21} />
          </button>
        </div>

        <div className="px-4 py-6">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Workspace
          </p>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  onClick={item.action}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    item.active
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon size={19} />

                  {item.label}

                  {item.active && (
                    <ChevronRight
                      size={16}
                      className="ml-auto"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto border-t border-slate-100 p-4">
          <div className="mb-3 rounded-2xl bg-slate-50 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                {firstName
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {user?.name || "Student"}
                </p>

                <p className="truncate text-xs text-slate-400">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
              onClick={() =>
                setMobileMenu(true)
              }
            >
              <Menu size={22} />
            </button>

            <div>
              <p className="text-xs font-medium text-slate-400">
                STUDENT PORTAL
              </p>

              <h1 className="font-bold text-slate-900">
                Dashboard
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
              title="Refresh dashboard"
            >
              <RefreshCw
                size={18}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />
            </button>

            <div className="relative hidden sm:block">
              <Bell
                size={20}
                className="text-slate-500"
              />

              {unreadNotifications >
                0 && (
                <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadNotifications}
                </span>
              )}
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <div className="text-right">
                <p className="text-sm font-semibold">
                  {user?.name}
                </p>

                <p className="text-xs text-slate-400">
                  {skills?.student_identifier ||
                    "AYUSH Student"}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                {firstName
                  .charAt(0)
                  .toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="p-5 lg:p-8">
          {/* Welcome */}
          <section className="mb-8 rounded-3xl bg-slate-950 p-7 text-white shadow-xl lg:p-9">
            <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-400">
                  <Sparkles size={17} />
                  AYUSH Skill Ecosystem
                </div>

                <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
                  Welcome back, {firstName}.
                </h2>

                <p className="mt-3 max-w-2xl leading-7 text-slate-300">
                  Track your skills, discover
                  career opportunities and build
                  a verified professional profile
                  across the AYUSH ecosystem.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-5 lg:min-w-56">
                <p className="text-xs uppercase tracking-widest text-slate-500">
                  Student ID
                </p>

                <p className="mt-2 text-xl font-bold">
                  {skills?.student_identifier ||
                    "—"}
                </p>
              </div>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />

              <p className="mt-4 text-sm text-slate-500">
                Loading your student ecosystem...
              </p>
            </div>
          )}

          {!loading && skills && (
            <>
              {/* KPI cards */}
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                      <TrendingUp size={21} />
                    </div>

                    <span className="text-xs font-semibold text-emerald-600">
                      ASSESSED
                    </span>
                  </div>

                  <p className="mt-5 text-3xl font-bold">
                    {skills.total_skills}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Assessed skills
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                      <ShieldCheck size={21} />
                    </div>

                    <span className="text-xs font-semibold text-blue-600">
                      VERIFIED
                    </span>
                  </div>

                  <p className="mt-5 text-3xl font-bold">
                    {skills.verified_skills}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Verified skills
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
                      <Award size={21} />
                    </div>

                    <span className="text-xs font-semibold text-violet-600">
                      SCORE
                    </span>
                  </div>

                  <p className="mt-5 text-3xl font-bold">
                    {getNumber(
                      skills.overall_score,
                    )}
                    %
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Overall skill score
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                      <CheckCircle2 size={21} />
                    </div>

                    <span className="text-xs font-semibold text-amber-600">
                      PROFILE
                    </span>
                  </div>

                  <p className="mt-5 text-3xl font-bold">
                    {verificationCoverage}%
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Verification coverage
                  </p>
                </div>
              </section>

              {/* Skills + Profile */}
              <section
                id="skills-section"
                className="mt-8 grid scroll-mt-28 gap-6 xl:grid-cols-[1.5fr_1fr]"
              >
                {/* Skills */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">
                        My skill profile
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Your latest assessed AYUSH competencies
                      </p>
                    </div>

                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {skills.total_skills} skills
                    </span>
                  </div>

                  <div className="mt-6 space-y-4">
                    {skills.skills.length ===
                      0 && (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                        No assessed skills yet.
                      </div>
                    )}

                    {skills.skills.map(
                      (skill) => (
                        <div
                          key={skill.skill_id}
                          className="rounded-2xl border border-slate-100 p-4 transition hover:border-emerald-100 hover:bg-slate-50/50"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold">
                                  {skill.skill_name}
                                </p>

                                {skill.verified && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                                    <ShieldCheck
                                      size={11}
                                    />
                                    VERIFIED
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 text-xs text-slate-400">
                                {skill.ayush_system}{" "}
                                •{" "}
                                {skill.category}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-lg font-bold">
                                {getNumber(
                                  skill.score,
                                )}
                                %
                              </p>

                              <p className="text-xs font-semibold text-emerald-600">
                                {skill.level}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{
                                width: `${Math.min(
                                  getNumber(
                                    skill.score,
                                  ),
                                  100,
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {/* Profile */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                      <UserRound size={22} />
                    </div>

                    <div>
                      <h3 className="font-bold">
                        Student profile
                      </h3>

                      <p className="text-sm text-slate-500">
                        Academic identity
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Full name
                      </p>

                      <p className="mt-1 font-medium">
                        {user?.name || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Email
                      </p>

                      <p className="mt-1 break-all font-medium">
                        {user?.email || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Student identifier
                      </p>

                      <p className="mt-1 font-medium">
                        {skills.student_identifier}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        AYUSH system
                      </p>

                      <p className="mt-1 font-medium">
                        {skills.skills[0]
                          ?.ayush_system ||
                          "AYUSH"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-7 rounded-2xl bg-emerald-50 p-4">
                    <div className="flex items-start gap-3">
                      <GraduationCap
                        size={20}
                        className="mt-0.5 text-emerald-700"
                      />

                      <div>
                        <p className="font-semibold text-emerald-900">
                          Keep building your profile
                        </p>

                        <p className="mt-1 text-sm leading-6 text-emerald-800/70">
                          Complete assessments
                          and verify more skills
                          to improve your career
                          opportunities.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Career */}
              <section
                id="career-section"
                className="mt-8 scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">
                      Career matches
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Career paths ranked against your current skill profile
                    </p>
                  </div>

                  <Target
                    className="text-emerald-600"
                    size={22}
                  />
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {topCareers.length ===
                    0 && (
                    <div className="md:col-span-3 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                      Career recommendations
                      will appear here once
                      your profile is evaluated.
                    </div>
                  )}

                  {topCareers.map(
                    (career, index) => {
                      const match =
                        getNumber(
                          career.match_percentage ??
                            career.overall_match_percentage,
                        );

                      const careerData = career as Career & {
  role_name?: string;
  career_name?: string;
  title?: string;
  role?: { name?: string };
  career_role?: { name?: string };
};

const name =
  careerData.career_role_name ||
  careerData.career_name ||
  careerData.role_name ||
  careerData.name ||
  careerData.title ||
  careerData.career_role?.name ||
  careerData.role?.name ||
  "AYUSH Career Role";
                      return (
                        <div
                          key={
                            career.career_role_id ||
                            career.id ||
                            index
                          }
                          className="rounded-2xl border border-slate-100 p-5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                              <GraduationCap
                                size={20}
                              />
                            </div>

                            <span className="text-lg font-bold text-emerald-600">
                              {Math.round(
                                match,
                              )}
                              %
                            </span>
                          </div>

                          <h4 className="mt-4 font-semibold">
                            {name}
                          </h4>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {career.eligible && (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                                ELIGIBLE
                              </span>
                            )}

                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                              {career.readiness ||
                                career.readiness_level ||
                                "PROFILE MATCH"}
                            </span>
                          </div>

                          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-violet-500"
                              style={{
                                width: `${Math.min(
                                  match,
                                  100,
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </section>

              {/* Opportunities */}
              <section
                id="opportunities-section"
                className="mt-8 scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">
                      Recommended opportunities
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Internships and jobs matched to your skills
                    </p>
                  </div>

                  <BriefcaseBusiness
                    className="text-emerald-600"
                    size={22}
                  />
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {topOpportunities.length ===
                    0 && (
                    <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                      No matching opportunities
                      are available right now.
                    </div>
                  )}

                  {topOpportunities.map(
                    (opportunity, index) => {
                      const match =
                        getNumber(
                          opportunity.match_percentage ??
                            opportunity.overall_match_percentage,
                        );

                      const eligible =
                        opportunity.eligible ??
                        opportunity.eligibility;

                      return (
                        <div
                          key={
                            opportunity.id ||
                            opportunity.internship_id ||
                            opportunity.job_id ||
                            index
                          }
                          onClick={() =>
                            handleOpenOpportunity(
                              opportunity,
                            )
                          }
                          className="cursor-pointer rounded-2xl border border-slate-100 p-5 transition hover:border-emerald-200 hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-700">
                                {opportunity.opportunity_type ||
                                  "OPPORTUNITY"}
                              </span>

                              <h4 className="mt-3 font-semibold">
                               {cleanOpportunityTitle(opportunity.title)}
                              </h4>

                              <p className="mt-1 text-sm text-slate-500">
                               {opportunity.organization ||
  opportunity.industry_name ||
  (opportunity as Opportunity & {
    industry?: { name?: string };
    company?: { name?: string };
  }).industry?.name ||
  (opportunity as Opportunity & {
    industry?: { name?: string };
    company?: { name?: string };
  }).company?.name ||
  "AYUSH Industry Partner"}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-xl font-bold text-emerald-600">
                                {Math.round(
                                  match,
                                )}
                                %
                              </p>

                              <p className="text-[10px] uppercase text-slate-400">
                                Match
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {eligible && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                                <CheckCircle2
                                  size={12}
                                />
                                Eligible
                              </span>
                            )}

                            {opportunity.location && (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
                                {opportunity.location}
                              </span>
                            )}
                          </div>

                          {opportunity.application_deadline && (
                            <p className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                              <Clock3 size={14} />

                              Deadline:{" "}
                              {formatDate(
                                opportunity.application_deadline,
                              )}
                            </p>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
              </section>

              {/* Applications + Internship */}
              <section className="mt-8 grid gap-6 xl:grid-cols-2">
                {/* Applications */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">
                        My applications
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Track your internship and placement applications
                      </p>
                    </div>

                    <BriefcaseBusiness
                      size={21}
                      className="text-blue-600"
                    />
                  </div>

                  <div className="mt-5 space-y-3">
                    {dashboard.applications.length ===
                      0 && (
                      <div className="rounded-2xl border border-dashed border-slate-200 p-7 text-center text-sm text-slate-500">
                        No applications yet.
                      </div>
                    )}

                    {dashboard.applications
                      .slice(0, 5)
                      .map(
                        (
                          application,
                          index,
                        ) => (
                          <button
                            key={
                              application.application_id ??
                              application.id ??
                              index
                            }
                            type="button"
                            onClick={() =>
                              handleOpenApplication(
                                application,
                              )
                            }
                            className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-100 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/30"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-semibold">
                                {application.opportunity_title ||
                                  application.title ||
                                  "Opportunity"}
                              </p>

                              <p className="mt-1 truncate text-xs text-slate-400">
                                {application.organization ||
                                  application.opportunity_type ||
                                  "AYUSH"}
                              </p>
                            </div>

                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClasses(
                                application.status,
                              )}`}
                            >
                              {statusLabel(
                                application.status,
                              )}
                            </span>
                          </button>
                        ),
                      )}
                  </div>
                </div>

                {/* Internship */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">
                        Internship progress
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Your current practical experience
                      </p>
                    </div>

                    <TrendingUp
                      size={21}
                      className="text-emerald-600"
                    />
                  </div>

                  {!activeInternship ? (
                    <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                      No internship progress
                      recorded yet.
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl bg-slate-50 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">
                            {activeInternship.opportunity_title ||
                              activeInternship.title ||
                              "AYUSH Internship"}
                          </p>

                          <span
                            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClasses(
                              activeInternship.status,
                            )}`}
                          >
                            {statusLabel(
                              activeInternship.status,
                            )}
                          </span>
                        </div>

                        <p className="text-2xl font-bold text-emerald-600">
                          {getNumber(
                            activeInternship.progress_percentage,
                          )}
                          %
                        </p>
                      </div>

                      <div className="mt-5 h-3 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{
                            width: `${Math.min(
                              getNumber(
                                activeInternship.progress_percentage,
                              ),
                              100,
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-white p-3">
                          <p className="text-[10px] uppercase text-slate-400">
                            Attendance
                          </p>

                          <p className="mt-1 font-bold">
                            {getNumber(
                              activeInternship.attendance_percentage,
                            )}
                            %
                          </p>
                        </div>

                        <div className="rounded-xl bg-white p-3">
                          <p className="text-[10px] uppercase text-slate-400">
                            Tasks
                          </p>

                          <p className="mt-1 font-bold">
                            {getNumber(
                              activeInternship.tasks_completed,
                            )}
                            /
                            {getNumber(
                              activeInternship.total_tasks,
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Learning */}
              <section
                id="learning-section"
                className="mt-8 scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">
                      Recommended learning
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Courses selected using your skill gaps and industry demand
                    </p>
                  </div>

                  <BookOpen
                    size={22}
                    className="text-violet-600"
                  />
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {topCourses.length ===
                    0 && (
                    <div className="md:col-span-2 xl:col-span-4 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                      No learning recommendations
                      available.
                    </div>
                  )}

                  {topCourses.map(
                    (course, index) => (
                      <div
                        key={
                          course.id || index
                        }
                        className="rounded-2xl border border-slate-100 p-5"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                          <BookOpen size={19} />
                        </div>

                        <h4 className="mt-4 font-semibold">
                          {course.title ||
                            "AYUSH Learning Program"}
                        </h4>

                        <p className="mt-1 text-xs text-slate-400">
                          {course.provider ||
                            "AYUSH Learning"}
                        </p>

                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-slate-400">
                            Relevance
                          </span>

                          <span className="font-bold text-violet-600">
  {Math.round(
    getNumber(
      course.industry_training_relevance_score ??
        course.recommendation_score ??
        course.score,
    ),
  )}
  %
</span>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </section>

              {/* Skill Passport */}
              <section
                id="passport-section"
                className="mt-8 scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-lg font-bold">
                      Verified Skill Passport
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Your trusted academic and competency record
                    </p>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                    <ShieldCheck size={18} />

                    {dashboard.passport
                      ?.total_verified_skills ??
                      skills.verified_skills}{" "}
                    verified
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Assessed
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      {dashboard.passport
                        ?.total_assessed_skills ??
                        skills.total_skills}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Verified
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      {dashboard.passport
                        ?.total_verified_skills ??
                        skills.verified_skills}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Verified average
                    </p>

                    <p className="mt-2 text-2xl font-bold">
  {Math.round(
    getNumber(
      dashboard.passport?.average_verified_score,
      dashboard.passport?.verified_skills?.length
        ? dashboard.passport.verified_skills.reduce(
            (total, skill) =>
              total + getNumber(skill.score),
            0,
          ) / dashboard.passport.verified_skills.length
        : 0,
    ),
  )}
  %
</p>
                  </div>
                </div>

                {dashboard.passport
                  ?.verified_skills &&
                  dashboard.passport
                    .verified_skills.length >
                    0 && (
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {dashboard.passport.verified_skills.map(
                        (skill) => (
                          <div
                            key={
                              skill.skill_id
                            }
                            className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/40 p-4"
                          >
                            <div className="flex items-center gap-3">
                              <ShieldCheck
                                size={20}
                                className="text-blue-600"
                              />

                              <div>
                                <p className="font-semibold">
                                  {skill.skill_name}
                                </p>

                                <p className="text-xs text-slate-400">
                                  {skill.ayush_system}{" "}
                                  •{" "}
                                  {skill.category}
                                </p>
                              </div>
                            </div>

                            <span className="font-bold text-blue-700">
                              {skill.score}%
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  )}
              </section>

              {/* Notifications */}
              <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">
                      Recent notifications
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Updates from your AYUSH Connect activity
                    </p>
                  </div>

                  <Bell
                    size={21}
                    className="text-amber-600"
                  />
                </div>

                <div className="mt-5 space-y-3">
                  {dashboard.notifications.length ===
                    0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-7 text-center text-sm text-slate-500">
                      You're all caught up.
                    </div>
                  )}

                  {dashboard.notifications
                    .slice(0, 5)
                    .map(
                      (notification) => (
                        <div
                          key={
                            notification.id
                          }
                          className={`rounded-2xl border p-4 ${
                            notification.is_read
                              ? "border-slate-100"
                              : "border-emerald-100 bg-emerald-50/40"
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className="mt-1">
                              {notification.is_read ? (
                                <CheckCircle2
                                  size={17}
                                  className="text-slate-400"
                                />
                              ) : (
                                <Sparkles
                                  size={17}
                                  className="text-emerald-600"
                                />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="font-semibold">
                                {notification.title ||
                                  "AYUSH Connect update"}
                              </p>

                              <p className="mt-1 text-sm leading-6 text-slate-500">
                                {notification.message ||
                                  "You have a new platform update."}
                              </p>

                              {notification.created_at && (
                                <p className="mt-2 text-[11px] text-slate-400">
                                  {formatDate(
                                    notification.created_at,
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      {/* Application tracking modal */}
      {(applicationDetailsLoading ||
        selectedApplication) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => {
            if (
              !applicationDetailsLoading
            ) {
              setSelectedApplication(
                null,
              );
            }
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {applicationDetailsLoading ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

                <p className="mt-4 text-sm text-slate-500">
                  Loading application details...
                </p>
              </div>
            ) : selectedApplication ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                      {selectedApplication.opportunity_type ||
                        "APPLICATION"}
                    </p>

                    <h2 className="mt-1 text-2xl font-bold text-slate-900">
                      {selectedApplication.opportunity_title ||
                        selectedApplication.title ||
                        "Application details"}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {selectedApplication.organization ||
                        selectedApplication.opportunity_type ||
                        "AYUSH"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedApplication(
                        null,
                      )
                    }
                    className="rounded-xl px-3 py-2 text-slate-500 hover:bg-slate-100"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="mt-6">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-slate-900">
                      Application Timeline
                    </h3>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                        selectedApplication.status,
                      )}`}
                    >
                      {statusLabel(
                        selectedApplication.status,
                      )}
                    </span>
                  </div>

                  {selectedApplication.status_history &&
                  selectedApplication.status_history
                    .length > 0 ? (
                    <div className="space-y-5">
                      {selectedApplication.status_history.map(
                        (
                          history,
                          index,
                        ) => (
                          <div
                            key={
                              history.id
                            }
                            className="relative flex gap-4"
                          >
                            {index <
                              selectedApplication
                                .status_history!
                                .length -
                                1 && (
                              <div className="absolute left-3 top-7 h-full w-px bg-slate-200" />
                            )}

                            <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600">
                              <div className="h-2 w-2 rounded-full bg-white" />
                            </div>

                            <div className="flex-1 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h4 className="font-semibold text-slate-900">
                                  {statusLabel(
                                    history.new_status,
                                  )}
                                </h4>

                                <span className="text-xs text-slate-400">
                                  {formatDateTime(
                                    history.changed_at,
                                  )}
                                </span>
                              </div>

                              {history.remarks && (
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                  {history.remarks}
                                </p>
                              )}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                      No application history available.
                    </div>
                  )}
                </div>

                <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Application ID
                      </p>

                      <p className="mt-1 font-semibold text-slate-900">
                        #
                        {selectedApplication.application_id ??
                          selectedApplication.id ??
                          "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Applied on
                      </p>

                      <p className="mt-1 font-semibold text-slate-900">
                        {formatDateTime(
                          selectedApplication.applied_at,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
      

      {/* Opportunity modal */}
      {selectedOpportunity && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() =>
            setSelectedOpportunity(null)
          }
        >
          <div
            className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
                  {selectedOpportunity.opportunity_type ||
                    "Opportunity"}
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  {selectedOpportunity.title ||
                    "Opportunity Details"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedOpportunity.organization ||
                    selectedOpportunity.industry_name ||
                    "AYUSH Industry"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedOpportunity(
                    null,
                  )
                }
                className="rounded-xl px-3 py-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">
                  Skill Match
                </p>

                <p className="mt-1 text-xl font-bold text-emerald-600">
                  {Math.round(
                    selectedOpportunity.match_percentage ??
                      selectedOpportunity.overall_match_percentage ??
                      0,
                  )}
                  %
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">
                  Eligibility
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {(
                    selectedOpportunity.eligible ??
                    selectedOpportunity.eligibility
                  )
                    ? "Eligible"
                    : "Eligibility not confirmed"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">
                  Location
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {selectedOpportunity.location ||
                    "Not specified"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">
                  Application Deadline
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {selectedOpportunity.application_deadline
                    ? formatDate(
                        selectedOpportunity.application_deadline,
                      )
                    : "Not specified"}
                </p>
              </div>
            </div>

            {applicationMessage && (
              <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                {applicationMessage}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setSelectedOpportunity(
                    null,
                  )
                }
                className="rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>

              {(() => {
                const alreadyApplied =
                  dashboard.applications.some(
                    (
                      application,
                    ) => {
                      const applicationType =
                        String(
                          application.opportunity_type ||
                            "",
                        ).toUpperCase();

                      const selectedType =
                        String(
                          selectedOpportunity.opportunity_type ||
                            "",
                        ).toUpperCase();

                      const applicationId =
                        Number(
                          application.opportunity_id,
                        );

                      const selectedId =
                        Number(
                          selectedOpportunity.opportunity_id ??
                            selectedOpportunity.id ??
                            selectedOpportunity.internship_id ??
                            selectedOpportunity.job_id,
                        );

                      return (
                        applicationType ===
                          selectedType &&
                        applicationId ===
                          selectedId
                      );
                    },
                  );

                return (
                  <button
                    type="button"
                    disabled={
                      alreadyApplied ||
                      applying
                    }
                    onClick={handleApply}
                    className={`w-full rounded-xl px-5 py-3 font-semibold transition ${
                      alreadyApplied
                        ? "cursor-not-allowed bg-slate-200 text-slate-500"
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                  >
                    {alreadyApplied
                      ? "Already Applied"
                      : applying
                        ? "Submitting..."
                        : "Apply Now"}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function cleanOpportunityTitle(title?: string) {
  if (!title) return "AYUSH Opportunity";

  const cleaned = title.trim();

  const typoMap: Record<string, string> = {
    clincial: "AYUSH Clinical Internship",
    clincal: "AYUSH Clinical Opportunity",
  };

  return typoMap[cleaned.toLowerCase()] || cleaned;
}