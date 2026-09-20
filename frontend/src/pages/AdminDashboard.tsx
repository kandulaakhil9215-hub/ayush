import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../services/api";

/* =========================================================
   TYPES
========================================================= */

interface DashboardOverview {
  total_institutions: number;
  total_students: number;
  total_faculty: number;
  total_industries: number;
  total_skills: number;
  total_assessed_skills: number;
  open_internships: number;
  open_jobs: number;
  total_applications: number;
}

interface SkillDemandItem {
  skill_id?: number;
  skill_name?: string;
  name?: string;
  category?: string;
  demand_count?: number;
  industry_count?: number;
  jobs_count?: number;
  job_count?: number;
  internships_count?: number;
  internship_count?: number;
  student_supply_count?: number;
  student_supply?: number;
  skill_gap_count?: number;
  skill_gap?: number;
  gap_count?: number;
  gap_percentage?: number;
  demand_score?: number;
  growth_rate?: number;
  classification?: string;
  demand_level?: string;
  average_required_score?: number;
}

interface IndustrySkillDemand {
  total_skills: number;
  results: SkillDemandItem[];
  top_skills: SkillDemandItem[];
}

interface SkillGapIntelligence {
  total_skill_gap: number;
  skills_with_gap: number;
  critical_gaps: SkillDemandItem[];
  results: SkillDemandItem[];
}

interface EmergingSkill {
  skill_id?: number;
  skill_name?: string;
  name?: string;
  demand_score?: number;
  growth_rate?: number;
  demand_count?: number;
  gap_count?: number;
  skill_gap?: number;
  skill_gap_count?: number;
  student_supply?: number;
  student_supply_count?: number;
  classification?: string;
  demand_level?: string;
}

interface TrainingRequirement {
  skill_id?: number;
  skill_name?: string;
  name?: string;
  gap_count?: number;
  skill_gap?: number;
  student_count?: number;
  required_students?: number;
  priority?: string;
  priority_level?: string;
}

interface PlacementStatus {
  status: string;
  count: number;
}

interface PlacementIntelligence {
  total_applications: number;
  hired: number;
  placement_rate: number;
  status_breakdown: PlacementStatus[];
}

interface DashboardResponse {
  scope?: string;
  overview?: DashboardOverview;
  industry_skill_demand?: IndustrySkillDemand;
  skill_gap_intelligence?: SkillGapIntelligence;
  emerging_skills?: EmergingSkill[];
  training_requirements?: TrainingRequirement[];
  placement_intelligence?: PlacementIntelligence;
}

type Section =
  | "overview"
  | "institutions"
  | "people"
  | "intelligence"
  | "verification"
  | "opportunities"
  | "activity";

interface StatCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  description: string;
}

interface Institution {
  id: number;
  name: string;
  institution_code?: string | null;
  institution_type?: string | null;
  state?: string | null;
  district?: string | null;
  city?: string | null;
  is_active?: boolean;
  student_count?: number;
  faculty_count?: number;
}

interface StudentSkillRecord {
  id: number;
  student_skill_id: number;
  name: string;
  category?: string | null;
  ayush_system?: string | null;
  score?: number | null;
  skill_level?: string | null;
  verified?: boolean;
  source?: string | null;
  assessed_at?: string | null;
  status?: string | null;
}

interface StudentRecord {
  id: number;
  student_id: string;
  name: string;
  full_name: string;
  email: string;
  degree?: string | null;
  department?: string | null;
  graduation_year?: number | null;
  cgpa?: number | null;
  institution?: string | null;
  total_skills: number;
  assessed_skills: number;
  verified_skills: number;
  average_score?: number | null;
  skills: StudentSkillRecord[];
}

interface StudentsResponse {
  total_students: number;
  students: StudentRecord[];
}

interface AdminFaculty {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  employee_id?: string | null;
  department?: string | null;
  designation?: string | null;
  institution_id: number;
  institution_name?: string | null;
  is_active: boolean;
  is_verified: boolean;
}

/* =========================================================
   HELPERS
========================================================= */

const CHART_COLORS = [
  "#0f172a",
  "#0284c7",
  "#059669",
  "#d97706",
  "#dc2626",
  "#7c3aed",
];

function getSkillName(
  item: SkillDemandItem | EmergingSkill | TrainingRequirement,
) {
  return item.skill_name || item.name || "Unnamed Skill";
}

function getDemandValue(item: SkillDemandItem) {
  return Number(item.demand_score ?? item.demand_count ?? 0);
}

function getGapValue(item: SkillDemandItem) {
  return Number(
    item.gap_count ??
      item.skill_gap_count ??
      item.skill_gap ??
      0,
  );
}

function getSupplyValue(item: SkillDemandItem) {
  return Number(
    item.student_supply ??
      item.student_supply_count ??
      0,
  );
}

function getPriority(item: TrainingRequirement) {
  return item.priority_level || item.priority || "NORMAL";
}

function getStudentName(student: StudentRecord) {
  return (
    student.full_name ||
    student.name ||
    student.student_id ||
    "Unknown Student"
  );
}

function getArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function priorityClass(priority: string) {
  const value = priority.toUpperCase();

  if (value.includes("CRITICAL")) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (value.includes("HIGH")) {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  if (value.includes("MEDIUM")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function classificationClass(classification: string) {
  const value = classification.toUpperCase();

  if (
    value.includes("CRITICAL") ||
    value.includes("HIGH")
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (
    value.includes("EMERGING") ||
    value.includes("GROWING")
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (value.includes("MODERATE")) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

/* =========================================================
   SMALL UI COMPONENTS
========================================================= */

function StatCard({
  title,
  value,
  icon,
  description,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value.toLocaleString("en-IN")}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>
        </div>

        <div className="shrink-0 rounded-xl bg-slate-100 p-3 text-slate-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
        {icon}
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-8 text-center">
      <p className="text-sm font-semibold text-slate-700">
        {title}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   ADMIN DASHBOARD
========================================================= */

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<Section>("overview");

  const [overview, setOverview] = useState<DashboardOverview>({
    total_institutions: 0,
    total_students: 0,
    total_faculty: 0,
    total_industries: 0,
    total_skills: 0,
    total_assessed_skills: 0,
    open_internships: 0,
    open_jobs: 0,
    total_applications: 0,
  });

  const [faculty, setFaculty] = useState<AdminFaculty[]>([]);
  const [facultySearch, setFacultySearch] = useState("");
  const [facultyLoading, setFacultyLoading] = useState(false);
  const [selectedFaculty, setSelectedFaculty] =
    useState<AdminFaculty | null>(null);

  const [industrySkillDemand, setIndustrySkillDemand] = useState<IndustrySkillDemand>({
    total_skills: 0,
    results: [],
    top_skills: [],
  });

  const [skillGapIntelligence, setSkillGapIntelligence] = useState<SkillGapIntelligence>({
    total_skill_gap: 0,
    skills_with_gap: 0,
    critical_gaps: [],
    results: [],
  });

  const [emergingSkills, setEmergingSkills] = useState<EmergingSkill[]>([]);

  const [trainingRequirements, setTrainingRequirements] = useState<TrainingRequirement[]>([]);

  const [placementIntelligence, setPlacementIntelligence] = useState<PlacementIntelligence>({
    total_applications: 0,
    hired: 0,
    placement_rate: 0,
    status_breakdown: [],
  });

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentInstitutionFilter, setStudentInstitutionFilter] = useState("ALL");
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [studentsLoading, setStudentsLoading] = useState(false);

  const [institutions, setInstitutions] = useState<Institution[]>([]);

  const [scope, setScope] = useState("NATIONAL");

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [analyticsError, setAnalyticsError] = useState("");

  const [studentsError, setStudentsError] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [institutionSearch, setInstitutionSearch] = useState("");

  const [institutionTypeFilter, setInstitutionTypeFilter] = useState("ALL");

  const [institutionStateFilter, setInstitutionStateFilter] = useState("ALL");

  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);

  const [institutionsLoading, setInstitutionsLoading] = useState(false);

  const loadInstitutions = async () => {
    try {
      setInstitutionsLoading(true);

      const response = await api.get<Institution[]>("/api/admin/institutions");

      setInstitutions(response.data);
    } catch (err) {
      console.error("Institution loading failed:", err);
    } finally {
      setInstitutionsLoading(false);
    }
  };

  /* =======================================================
     LOAD DASHBOARD
  ======================================================= */

  const loadDashboard = async () => {
    try {
      setError("");
      setAnalyticsError("");

      const overviewResponse = await api.get<DashboardResponse>(
        "/api/admin/dashboard/overview",
      );

      const data = overviewResponse.data;

      if (data.scope) {
        setScope(data.scope);
      }

      if (data.overview) {
        setOverview(data.overview);
      }

      if (data.industry_skill_demand) {
        setIndustrySkillDemand(data.industry_skill_demand);
      }

      if (data.skill_gap_intelligence) {
        setSkillGapIntelligence(data.skill_gap_intelligence);
      }

      if (data.emerging_skills) {
        setEmergingSkills(data.emerging_skills);
      }

      if (data.training_requirements) {
        setTrainingRequirements(data.training_requirements);
      }

      if (data.placement_intelligence) {
        setPlacementIntelligence(data.placement_intelligence);
      } else {
        setPlacementIntelligence((current) => ({
          ...current,
          total_applications:
            data.overview?.total_applications ?? current.total_applications,
        }));
      }
    } catch (err) {
      console.error("Admin dashboard load failed:", err);

      setError(
        "Unable to load administrative dashboard data from the backend.",
      );
    }

    try {
      const analyticsResponse = await api.get<DashboardResponse>(
        "/api/analytics/national",
      );

      const data = analyticsResponse.data;

      if (data.industry_skill_demand) {
        setIndustrySkillDemand(data.industry_skill_demand);
      }

      if (data.skill_gap_intelligence) {
        setSkillGapIntelligence(data.skill_gap_intelligence);
      }

      if (data.emerging_skills) {
        setEmergingSkills(data.emerging_skills);
      }

      if (data.training_requirements) {
        setTrainingRequirements(data.training_requirements);
      }

      if (data.placement_intelligence) {
        setPlacementIntelligence(data.placement_intelligence);
      }
    } catch (err) {
      console.error("National analytics load failed:", err);

      setAnalyticsError(
        "Some intelligence data could not be refreshed from the analytics engine.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* =======================================================
     LOAD STUDENTS
  ======================================================= */

  const loadStudents = async () => {
    try {
      setStudentsLoading(true);
      setStudentsError("");

      const response = await api.get<StudentsResponse>(
        "/api/skills/students"
      );

      setStudents(response.data.students);
    } catch (err) {
      console.error("Student loading failed:", err);
      setStudentsError("Unable to load students.");
    } finally {
      setStudentsLoading(false);
    }
  };

  /* =======================================================
     LOAD FACULTY
  ======================================================= */

  const loadFaculty = async () => {
    try {
      setFacultyLoading(true);

      const response = await api.get<AdminFaculty[]>(
        "/api/faculty/profile/admin"
      );

      setFaculty(response.data);
    } catch (err) {
      console.error("Faculty loading failed:", err);
    } finally {
      setFacultyLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
    void loadInstitutions();
    void loadStudents();
    void loadFaculty();
  }, []);

  /* =======================================================
     REFRESH
  ======================================================= */

  const handleRefresh = async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    await Promise.all([
      loadDashboard(),
      loadStudents(),
      loadInstitutions(),
      loadFaculty(),
    ]);
  };

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const navigateTo = (section: Section) => {
    setActiveSection(section);
    setSidebarOpen(false);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =======================================================
     SEARCH
  ======================================================= */

  const studentInstitutionOptions = useMemo(
    () => [
      "ALL",
      ...Array.from(
        new Set(
          students
            .map((student) => student.institution)
            .filter((institution): institution is string => Boolean(institution)),
        ),
      ),
    ],
    [students],
  );

  const filteredStudents = useMemo(() => {
    const value = searchTerm.trim().toLowerCase();

    let visibleStudents = students;

    if (studentInstitutionFilter !== "ALL") {
      const institutionFilter = studentInstitutionFilter.trim().toLowerCase();

      visibleStudents = visibleStudents.filter((student) =>
        (student.institution ?? "").trim().toLowerCase() === institutionFilter,
      );
    }

    if (!value) {
      return visibleStudents;
    }

    return visibleStudents.filter((student) => {
      const haystack = [
        getStudentName(student),
        student.email,
        student.student_id,
        student.institution,
        student.department,
        student.degree,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(value);
    });
  }, [students, searchTerm, studentInstitutionFilter]);

  /* =======================================================
     DERIVED ANALYTICS
  ======================================================= */

  const demandChartData = industrySkillDemand.top_skills
    .slice(0, 10)
    .map((item) => ({
      name: getSkillName(item),
      demand: getDemandValue(item),
    }));

  const gapChartData = skillGapIntelligence.results
    .filter((item) => getGapValue(item) > 0)
    .slice(0, 10)
    .map((item) => ({
      name: getSkillName(item),
      gap: getGapValue(item),
    }));

  const placementChartData = placementIntelligence.status_breakdown.map(
    (item) => ({
      name: item.status,
      value: item.count,
    }),
  );

  const verifiedStudentSkills = students.reduce((total, student) => {
    const skills = getArray<StudentSkillRecord>(student.skills);

    return (
      total +
      skills.filter(
        (skill) =>
          skill.verified === true ||
          skill.status === "VERIFIED",
      ).length
    );
  }, 0);

  const pendingStudentSkills = students.reduce((total, student) => {
    const skills = getArray<StudentSkillRecord>(student.skills);

    return (
      total +
      skills.filter(
        (skill) =>
          skill.status === "PENDING" ||
          skill.status === "PENDING_REVIEW",
      ).length
    );
  }, 0);

  const studentsWithAssessments = students.filter((student) =>
    getArray<StudentSkillRecord>(student.skills).some(
      (skill) => skill.score !== null && skill.score !== undefined,
    ),
  ).length;

  const institutionTypes: string[] = [
    "ALL",
    ...Array.from(
      new Set(
        institutions
          .map((institution) => institution.institution_type)
          .filter((type): type is string => Boolean(type)),
      ),
    ),
  ];

  const institutionStates: string[] = [
    "ALL",
    ...Array.from(
      new Set(
        institutions
          .map((institution) => institution.state)
          .filter((state): state is string => Boolean(state)),
      ),
    ),
  ];

  const filteredInstitutions: Institution[] = institutions.filter(
    (institution) => {
      const search = institutionSearch.trim().toLowerCase();

      const matchesSearch =
        !search ||
        (institution.name || "").toLowerCase().includes(search) ||
        institution.institution_code?.toLowerCase().includes(search) ||
        institution.district?.toLowerCase().includes(search) ||
        institution.city?.toLowerCase().includes(search);

      const matchesType =
        institutionTypeFilter === "ALL" ||
        institution.institution_type === institutionTypeFilter;

      const matchesState =
        institutionStateFilter === "ALL" ||
        institution.state === institutionStateFilter;

      return Boolean(matchesSearch) && matchesType && matchesState;
    },
  );

  const topDemand =
    industrySkillDemand.top_skills.length > 0
      ? industrySkillDemand.top_skills[0]
      : null;

  const highestGap =
    skillGapIntelligence.critical_gaps.length > 0
      ? skillGapIntelligence.critical_gaps[0]
      : null;

  const topEmerging =
    emergingSkills.length > 0 ? emergingSkills[0] : null;

  const criticalGapCount = skillGapIntelligence.critical_gaps.length;

  /* =======================================================
     SIDEBAR ITEM
  ======================================================= */

  const SidebarItem = ({
    section,
    icon,
    label,
  }: {
    section: Section;
    icon: ReactNode;
    label: string;
  }) => {
    const active = activeSection === section;

    return (
      <button
        type="button"
        onClick={() => navigateTo(section)}
        className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
          active
            ? "bg-slate-900 text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
      >
        {icon}

        <span className="flex-1">{label}</span>

        {active && <ChevronRight size={16} />}
      </button>
    );
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <div>
            <p className="text-lg font-bold">AYUSH Platform</p>

            <p className="text-xs text-slate-500">National Administration</p>
          </div>

          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="border-b border-slate-200 p-4">
          <div className="rounded-xl bg-slate-900 p-4 text-white">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} />

              <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Administration
              </span>
            </div>

            <p className="mt-2 text-sm font-bold">{scope} Control Center</p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Monitor the AYUSH academia–industry ecosystem.
            </p>
          </div>
        </div>

        <nav className="space-y-1 p-4">
          <SidebarItem
            section="overview"
            icon={<LayoutDashboard size={18} />}
            label="Overview"
          />

          <SidebarItem
            section="institutions"
            icon={<Building2 size={18} />}
            label="Institutions"
          />

          <SidebarItem
            section="people"
            icon={<Users size={18} />}
            label="Students & Faculty"
          />

          <SidebarItem
            section="intelligence"
            icon={<BarChart3 size={18} />}
            label="Skill Intelligence"
          />

          <SidebarItem
            section="verification"
            icon={<ShieldCheck size={18} />}
            label="Verification"
          />

          <SidebarItem
            section="opportunities"
            icon={<BriefcaseBusiness size={18} />}
            label="Opportunities"
          />

          <SidebarItem
            section="activity"
            icon={<Activity size={18} />}
            label="System Activity"
          />
        </nav>
      </aside>

      {/* ===================================================
          MAIN
      =================================================== */}

      <main className="lg:pl-72">
        {/* HEADER */}

        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={22} />
              </button>

              <div>
                <h1 className="text-lg font-bold">Admin Dashboard</h1>

                <p className="hidden text-xs text-slate-500 sm:block">
                  AYUSH academia–industry ecosystem intelligence
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 md:block">
                {scope}
              </div>

              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "animate-spin" : ""}
                />

                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-6 p-4 sm:p-6">
          {/* =================================================
              GLOBAL ERRORS
          ================================================= */}

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
              <AlertTriangle size={19} />

              <div className="text-sm">
                <p className="font-semibold">Dashboard data unavailable</p>

                <p className="mt-1">{error}</p>
              </div>
            </div>
          )}

          {analyticsError && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <AlertTriangle size={19} />

              <div className="text-sm">
                <p className="font-semibold">Analytics refresh warning</p>

                <p className="mt-1">{analyticsError}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <RefreshCw
                className="mx-auto animate-spin text-slate-500"
                size={30}
              />

              <p className="mt-3 text-sm text-slate-500">
                Loading live administrative data…
              </p>
            </div>
          ) : (
            <>
              {/* =================================================
                  OVERVIEW
              ================================================= */}

              {activeSection === "overview" && (
                <div className="space-y-6">
                  <section className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
                    <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                      <div>
                        <p className="text-sm font-semibold text-slate-300">
                          National AYUSH Skill Intelligence
                        </p>

                        <h2 className="mt-2 max-w-4xl text-2xl font-bold tracking-tight sm:text-3xl">
                          Monitor the complete academia–industry skill ecosystem
                        </h2>

                        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                          A centralized administrative view of institutions,
                          students, faculty, industry demand, skill gaps,
                          training requirements, opportunities and placement
                          activity.
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-4 py-3">
                        <Activity size={19} />

                        <div>
                          <p className="text-xs text-slate-300">
                            Current scope
                          </p>

                          <p className="text-sm font-bold">{scope}</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section>
                    <SectionHeader
                      title="National Overview"
                      description="Live metrics from the PostgreSQL-backed AYUSH platform"
                      icon={<LayoutDashboard size={19} />}
                    />

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <StatCard
                        title="Institutions"
                        value={overview.total_institutions}
                        icon={<Building2 size={21} />}
                        description="Registered AYUSH institutions"
                      />

                      <StatCard
                        title="Students"
                        value={overview.total_students}
                        icon={<GraduationCap size={21} />}
                        description="Students in ecosystem"
                      />

                      <StatCard
                        title="Faculty"
                        value={overview.total_faculty}
                        icon={<Users size={21} />}
                        description="Academic faculty members"
                      />

                      <StatCard
                        title="Industries"
                        value={overview.total_industries}
                        icon={<BriefcaseBusiness size={21} />}
                        description="Industry organizations"
                      />

                      <StatCard
                        title="Skills"
                        value={overview.total_skills}
                        icon={<BarChart3 size={21} />}
                        description="AYUSH skill taxonomy"
                      />

                      <StatCard
                        title="Assessed Skills"
                        value={overview.total_assessed_skills}
                        icon={<ShieldCheck size={21} />}
                        description="Skills with assessment scores"
                      />

                      <StatCard
                        title="Open Internships"
                        value={overview.open_internships}
                        icon={<ClipboardCheck size={21} />}
                        description="Currently open internships"
                      />

                      <StatCard
                        title="Open Jobs"
                        value={overview.open_jobs}
                        icon={<BriefcaseBusiness size={21} />}
                        description="Currently open jobs"
                      />
                    </div>
                  </section>

                  <section className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-3">
                        <TrendingUp size={20} className="text-slate-600" />

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Highest demand
                          </p>

                          <p className="mt-1 font-bold">
                            {topDemand ? getSkillName(topDemand) : "No data"}
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 text-3xl font-bold">
                        {topDemand ? getDemandValue(topDemand).toFixed(2) : "0"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Demand score
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-3">
                        <Target size={20} className="text-red-600" />

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Largest gap
                          </p>

                          <p className="mt-1 font-bold">
                            {highestGap
                              ? getSkillName(highestGap)
                              : "No gap"}
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 text-3xl font-bold text-red-700">
                        {highestGap
                          ? getGapValue(highestGap).toLocaleString("en-IN")
                          : "0"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Students below demand
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-3">
                        <TrendingUp size={20} className="text-amber-600" />

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Emerging priority
                          </p>

                          <p className="mt-1 font-bold">
                            {topEmerging
                              ? getSkillName(topEmerging)
                              : "No data"}
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 text-3xl font-bold text-amber-700">
                        {topEmerging
                          ? Number(topEmerging.growth_rate ?? 0).toFixed(2)
                          : "0.00"}
                        %
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Recorded growth rate
                      </p>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <SectionHeader
                      title="Administrative Snapshot"
                      description="Key ecosystem indicators requiring attention"
                      icon={<ShieldCheck size={19} />}
                    />

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <button
                        type="button"
                        onClick={() => navigateTo("institutions")}
                        className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <p className="text-xs text-slate-500">
                          Institutions
                        </p>

                        <p className="mt-2 text-2xl font-bold">
                          {overview.total_institutions.toLocaleString("en-IN")}
                        </p>

                        <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-slate-600">
                          Manage ecosystem
                          <ChevronRight size={14} />
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigateTo("verification")}
                        className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <p className="text-xs text-slate-500">
                          Pending Verification
                        </p>

                        <p className="mt-2 text-2xl font-bold text-amber-700">
                          {pendingStudentSkills.toLocaleString("en-IN")}
                        </p>

                        <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-slate-600">
                          Review skill records
                          <ChevronRight size={14} />
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigateTo("intelligence")}
                        className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <p className="text-xs text-slate-500">
                          Critical Skill Gaps
                        </p>

                        <p className="mt-2 text-2xl font-bold text-red-700">
                          {criticalGapCount.toLocaleString("en-IN")}
                        </p>

                        <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-slate-600">
                          Open intelligence
                          <ChevronRight size={14} />
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigateTo("opportunities")}
                        className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        <p className="text-xs text-slate-500">
                          Active Opportunities
                        </p>

                        <p className="mt-2 text-2xl font-bold">
                          {(
                            overview.open_internships + overview.open_jobs
                          ).toLocaleString("en-IN")}
                        </p>

                        <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-slate-600">
                          View opportunities
                          <ChevronRight size={14} />
                        </div>
                      </button>
                    </div>
                  </section>
                </div>
              )}

              {/* =================================================
                  INSTITUTIONS
              ================================================= */}

              {activeSection === "institutions" && (
                <div className="space-y-6">
                  <section className="rounded-2xl bg-slate-900 p-6 text-white">
                    <p className="text-sm font-semibold text-slate-300">
                      Institution Administration
                    </p>

                    <h2 className="mt-2 text-2xl font-bold">
                      AYUSH institutional ecosystem
                    </h2>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                      National-level monitoring of institutions and the
                      academic ecosystem connected to the platform.
                    </p>
                  </section>

                  <section>
                    <SectionHeader
                      title="Institution Metrics"
                      description="Database-backed institutional indicators"
                      icon={<Building2 size={19} />}
                    />

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <StatCard
                        title="Institutions"
                        value={overview.total_institutions}
                        icon={<Building2 size={21} />}
                        description="Registered institutions"
                      />

                      <StatCard
                        title="Students"
                        value={overview.total_students}
                        icon={<GraduationCap size={21} />}
                        description="Across institutions"
                      />

                      <StatCard
                        title="Faculty"
                        value={overview.total_faculty}
                        icon={<Users size={21} />}
                        description="Academic members"
                      />

                      <StatCard
                        title="Assessed Skills"
                        value={overview.total_assessed_skills}
                        icon={<ClipboardCheck size={21} />}
                        description="Assessment coverage"
                      />
                    </div>
                  </section>

                  <section
                    id="students"
                    className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          Students
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Monitor AYUSH student profiles, skill development and assessment readiness
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                        <Users size={20} />
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={(event) => setStudentSearch(event.target.value)}
                        placeholder="Search student, ID, email, department..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                      />

                      <select
                        value={studentInstitutionFilter}
                        onChange={(event) =>
                          setStudentInstitutionFilter(event.target.value)
                        }
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                      >
                        {studentInstitutionOptions.map((institution) => (
                          <option key={institution} value={institution}>
                            {institution === "ALL"
                              ? "All Institutions"
                              : institution}
                          </option>
                        ))}
                      </select>
                    </div>

                    {studentsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <RefreshCw
                          size={24}
                          className="animate-spin text-slate-500"
                        />
                      </div>
                    ) : studentsError ? (
                      <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {studentsError}
                      </div>
                    ) : students.length === 0 ? (
                      <div className="py-12 text-center text-sm text-slate-500">
                        No students found.
                      </div>
                    ) : (
                      <div className="mt-5 overflow-x-auto">
                        <table className="w-full min-w-[1100px] text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                              <th className="pb-3">Student</th>
                              <th className="pb-3">Institution</th>
                              <th className="pb-3">Degree</th>
                              <th className="pb-3">Department</th>
                              <th className="pb-3">CGPA</th>
                              <th className="pb-3">Skills</th>
                              <th className="pb-3">Assessed</th>
                              <th className="pb-3">Verified</th>
                              <th className="pb-3">Avg. Score</th>
                            </tr>
                          </thead>

                          <tbody>
                            {students
                              .filter((student) => {
                                const search = studentSearch
                                  .trim()
                                  .toLowerCase();

                                const matchesSearch =
                                  !search ||
                                  getStudentName(student).toLowerCase().includes(search) ||
                                  (student.student_id || "")
                                    .toLowerCase()
                                    .includes(search) ||
                                  (student.email || "")
                                    .toLowerCase()
                                    .includes(search) ||
                                  (student.department || "")
                                    .toLowerCase()
                                    .includes(search) ||
                                  (student.degree || "")
                                    .toLowerCase()
                                    .includes(search);

                                const matchesInstitution =
                                  studentInstitutionFilter === "ALL" ||
                                  student.institution ===
                                    studentInstitutionFilter;

                                return (
                                  matchesSearch &&
                                  matchesInstitution
                                );
                              })
                              .map((student) => (
                                <tr
                                  key={student.id}
                                  onClick={() => setSelectedStudent(student)}
                                  className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50 last:border-0"
                                >
                                  <td className="py-4">
                                    <p className="font-semibold text-slate-800">
                                      {getStudentName(student)}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                      {student.student_id}
                                    </p>
                                  </td>

                                  <td className="py-4 text-slate-600">
                                    {student.institution || "—"}
                                  </td>

                                  <td className="py-4 text-slate-600">
                                    {student.degree || "—"}
                                  </td>

                                  <td className="py-4 text-slate-600">
                                    {student.department || "—"}
                                  </td>

                                  <td className="py-4 font-semibold text-slate-700">
                                    {student.cgpa ?? "—"}
                                  </td>

                                  <td className="py-4 font-semibold text-slate-700">
                                    {student.total_skills}
                                  </td>

                                  <td className="py-4 font-semibold text-slate-700">
                                    {student.assessed_skills}
                                  </td>

                                  <td className="py-4 font-semibold text-emerald-700">
                                    {student.verified_skills}
                                  </td>

                                  <td className="py-4">
                                    <span className="font-semibold text-slate-700">
                                      {student.average_score != null
                                        ? `${student.average_score.toFixed(1)}%`
                                        : "—"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>

                  <section
                    id="faculty"
                    className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          Faculty & Academicians
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Faculty registered across the AYUSH academic ecosystem
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                        <GraduationCap size={20} />
                      </div>
                    </div>

                    <div className="mt-5">
                      <input
                        type="text"
                        value={facultySearch}
                        onChange={(event) => setFacultySearch(event.target.value)}
                        placeholder="Search faculty, employee ID, department..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                      />
                    </div>

                    {facultyLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <RefreshCw
                          size={24}
                          className="animate-spin text-slate-500"
                        />
                      </div>
                    ) : faculty.length === 0 ? (
                      <div className="py-12 text-center text-sm text-slate-500">
                        No faculty records found.
                      </div>
                    ) : (
                      <div className="mt-5 overflow-x-auto">
                        <table className="w-full min-w-[1000px] text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                              <th className="pb-3">Faculty</th>
                              <th className="pb-3">Employee ID</th>
                              <th className="pb-3">Institution</th>
                              <th className="pb-3">Department</th>
                              <th className="pb-3">Designation</th>
                              <th className="pb-3">Account</th>
                              <th className="pb-3">Verification</th>
                            </tr>
                          </thead>

                          <tbody>
                            {faculty
                              .filter((member) => {
                                const search = facultySearch
                                  .trim()
                                  .toLowerCase();

                                if (!search) return true;

                                return (
                                  (member.full_name || "")
                                    .toLowerCase()
                                    .includes(search) ||
                                  (member.email || "")
                                    .toLowerCase()
                                    .includes(search) ||
                                  (member.employee_id || "")
                                    .toLowerCase()
                                    .includes(search) ||
                                  (member.department || "")
                                    .toLowerCase()
                                    .includes(search) ||
                                  (member.designation || "")
                                    .toLowerCase()
                                    .includes(search) ||
                                  (member.institution_name || "")
                                    .toLowerCase()
                                    .includes(search)
                                );
                              })
                              .map((member) => (
                                <tr
                                  key={member.id}
                                  onClick={() => setSelectedFaculty(member)}
                                  className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50 last:border-0"
                                >
                                  <td className="py-4">
                                    <p className="font-semibold text-slate-800">
                                      {member.full_name}
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                      {member.email}
                                    </p>
                                  </td>

                                  <td className="py-4 text-slate-600">
                                    {member.employee_id || "—"}
                                  </td>

                                  <td className="py-4 text-slate-600">
                                    {member.institution_name || "—"}
                                  </td>

                                  <td className="py-4 text-slate-600">
                                    {member.department || "—"}
                                  </td>

                                  <td className="py-4 text-slate-600">
                                    {member.designation || "—"}
                                  </td>

                                  <td className="py-4">
                                    <span
                                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                        member.is_active
                                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                          : "border-red-200 bg-red-50 text-red-700"
                                      }`}
                                    >
                                      {member.is_active ? "ACTIVE" : "INACTIVE"}
                                    </span>
                                  </td>

                                  <td className="py-4">
                                    <span
                                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                        member.is_verified
                                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                          : "border-amber-200 bg-amber-50 text-amber-700"
                                      }`}
                                    >
                                      {member.is_verified
                                        ? "VERIFIED"
                                        : "UNVERIFIED"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          AYUSH Institutions List
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          Institutions registered in the national AYUSH ecosystem
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                        <Building2 size={20} />
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <div className="md:col-span-1">
                        <input
                          type="text"
                          value={institutionSearch}
                          onChange={(event) =>
                            setInstitutionSearch(event.target.value)
                          }
                          placeholder="Search institution..."
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                        />
                      </div>

                      <select
                        value={institutionStateFilter}
                        onChange={(event) =>
                          setInstitutionStateFilter(event.target.value)
                        }
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                      >
                        {institutionStates.map((state) => (
                          <option key={state} value={state}>
                            {state === "ALL" ? "All States" : state}
                          </option>
                        ))}
                      </select>

                      <select
                        value={institutionTypeFilter}
                        onChange={(event) =>
                          setInstitutionTypeFilter(event.target.value)
                        }
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-slate-400"
                      >
                        {institutionTypes.map((type) => (
                          <option key={type} value={type}>
                            {type === "ALL" ? "All Institution Types" : type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-4 text-xs text-slate-500">
                      Showing{" "}
                      <strong className="text-slate-800">
                        {filteredInstitutions.length}
                      </strong>{" "}
                      of{" "}
                      <strong className="text-slate-800">
                        {institutions.length}
                      </strong>{" "}
                      institutions
                    </div>

                    {institutionsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <RefreshCw
                          size={24}
                          className="animate-spin text-slate-500"
                        />
                      </div>
                    ) : institutions.length === 0 ? (
                      <div className="py-12 text-center text-sm text-slate-500">
                        No institutions found.
                      </div>
                    ) : (
                      <div className="mt-5 overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                              <th className="pb-3">Institution</th>
                              <th className="pb-3">Code</th>
                              <th className="pb-3">Type</th>
                              <th className="pb-3">Location</th>
                              <th className="pb-3">Status</th>
                              <th className="pb-3">Students</th>
                              <th className="pb-3">Faculty</th>
                            </tr>
                          </thead>

                          <tbody>
                            {filteredInstitutions.map((institution) => (
                              <tr
                                key={institution.id}
                                onClick={() =>
                                  setSelectedInstitution(institution)
                                }
                                className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50 last:border-0"
                              >
                                <td className="py-4">
                                  <p className="font-semibold text-slate-800">
                                    {institution.name}
                                  </p>
                                </td>

                                <td className="py-4 text-slate-600">
                                  {institution.institution_code || "—"}
                                </td>

                                <td className="py-4 text-slate-600">
                                  {institution.institution_type || "—"}
                                </td>

                                <td className="py-4 text-slate-600">
                                  {[
                                    institution.city,
                                    institution.district,
                                    institution.state,
                                  ]
                                    .filter(Boolean)
                                    .join(", ") || "—"}
                                </td>

                                <td className="py-4">
                                  <span
                                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                      institution.is_active
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : "border-red-200 bg-red-50 text-red-700"
                                    }`}
                                  >
                                    {institution.is_active
                                      ? "ACTIVE"
                                      : "INACTIVE"}
                                  </span>
                                </td>

                                <td className="py-4 font-semibold text-slate-700">
                                  {Number(
                                    institution.student_count ?? 0,
                                  ).toLocaleString("en-IN")}
                                </td>

                                <td className="py-4 font-semibold text-slate-700">
                                  {Number(
                                    institution.faculty_count ?? 0,
                                  ).toLocaleString("en-IN")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* =================================================
                  PEOPLE
              ================================================= */}

              {activeSection === "people" && (
                <div className="space-y-6">
                  <section className="rounded-2xl bg-slate-900 p-6 text-white">
                    <p className="text-sm font-semibold text-slate-300">
                      People & Academic Network
                    </p>

                    <h2 className="mt-2 text-2xl font-bold">
                      Students and faculty
                    </h2>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                      Monitor the student skill population and academic coverage
                      using live backend records.
                    </p>
                  </section>

                  <section>
                    <SectionHeader
                      title="People Overview"
                      description="Live population and assessment coverage"
                      icon={<Users size={19} />}
                    />

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <StatCard
                        title="Students"
                        value={overview.total_students}
                        icon={<GraduationCap size={21} />}
                        description="Registered students"
                      />

                      <StatCard
                        title="Faculty"
                        value={overview.total_faculty}
                        icon={<Users size={21} />}
                        description="Registered faculty"
                      />

                      <StatCard
                        title="Assessed Students"
                        value={studentsWithAssessments}
                        icon={<ClipboardCheck size={21} />}
                        description="Students with skill scores"
                      />

                      <StatCard
                        title="Verified Skills"
                        value={verifiedStudentSkills}
                        icon={<CheckCircle2 size={21} />}
                        description="Verified student skills"
                      />
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <h3 className="font-bold">Student Records</h3>

                          <p className="mt-1 text-sm text-slate-500">
                            Loaded directly from the student skill API
                          </p>
                        </div>

                        <div className="relative w-full lg:w-80">
                          <Search
                            size={17}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          />

                          <input
                            value={searchTerm}
                            onChange={(event) =>
                              setSearchTerm(event.target.value)
                            }
                            placeholder="Search students..."
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-slate-400"
                          />
                        </div>
                      </div>
                    </div>

                    {studentsLoading ? (
                      <div className="p-10 text-center">
                        <RefreshCw
                          size={24}
                          className="mx-auto animate-spin text-slate-400"
                        />

                        <p className="mt-2 text-sm text-slate-500">
                          Loading student records…
                        </p>
                      </div>
                    ) : studentsError ? (
                      <div className="p-8">
                        <EmptyState
                          title="Student records unavailable"
                          description={studentsError}
                        />
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="p-8">
                        <EmptyState
                          title="No students found"
                          description="No matching student records were returned by the backend."
                        />
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                              <th className="px-5 py-3">Student</th>

                              <th className="px-5 py-3">Institution</th>

                              <th className="px-5 py-3">Department</th>

                              <th className="px-5 py-3">Degree</th>

                              <th className="px-5 py-3">Skills</th>

                              <th className="px-5 py-3">Verified</th>
                            </tr>
                          </thead>

                          <tbody>
                            {filteredStudents
                              .slice(0, 30)
                              .map((student, index) => {
                                const skills = getArray<StudentSkillRecord>(
                                  student.skills,
                                );

                                const verified = skills.filter(
                                  (skill) =>
                                    skill.verified === true ||
                                    skill.status === "VERIFIED",
                                ).length;

                                return (
                                  <tr
                                    key={
                                      student.id ??
                                      student.student_id ??
                                      index
                                    }
                                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                                  >
                                    <td className="px-5 py-4">
                                      <p className="font-semibold text-slate-800">
                                        {getStudentName(student)}
                                      </p>

                                      <p className="mt-1 text-xs text-slate-500">
                                        {student.email ||
                                          student.student_id ||
                                          "Student record"}
                                      </p>
                                    </td>

                                    <td className="px-5 py-4 text-slate-600">
                                      {student.institution || "—"}
                                    </td>

                                    <td className="px-5 py-4 text-slate-600">
                                      {student.department || "—"}
                                    </td>

                                    <td className="px-5 py-4 text-slate-600">
                                      {student.degree || "—"}
                                    </td>

                                    <td className="px-5 py-4">
                                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                        {skills.length.toLocaleString("en-IN")}
                                      </span>
                                    </td>

                                    <td className="px-5 py-4">
                                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                        {verified.toLocaleString("en-IN")}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* =================================================
                  SKILL INTELLIGENCE
              ================================================= */}

              {activeSection === "intelligence" && (
                <div className="space-y-6">
                  <section className="rounded-2xl bg-slate-900 p-6 text-white">
                    <p className="text-sm font-semibold text-slate-300">
                      Skill Intelligence
                    </p>

                    <h2 className="mt-2 text-2xl font-bold">
                      Industry demand, supply and skill gaps
                    </h2>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                      Backend analytics identify where AYUSH industry demand is
                      strongest and where student supply requires intervention.
                    </p>
                  </section>

                  <section className="grid gap-6 xl:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <SectionHeader
                        title="Industry Skill Demand"
                        description="Highest demand signals"
                        icon={<TrendingUp size={19} />}
                      />

                      <div className="h-80">
                        {demandChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={demandChartData}
                              margin={{
                                top: 10,
                                right: 10,
                                left: -10,
                                bottom: 70,
                              }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />

                              <XAxis
                                dataKey="name"
                                angle={-35}
                                textAnchor="end"
                                interval={0}
                                tick={{
                                  fontSize: 11,
                                }}
                              />

                              <YAxis />

                              <Tooltip />

                              <Bar
                                dataKey="demand"
                                name="Demand score"
                                radius={[6, 6, 0, 0]}
                                fill="#0f172a"
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <EmptyState
                            title="No demand data"
                            description="The analytics engine has not returned demand records."
                          />
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <SectionHeader
                        title="Skill Gap Intelligence"
                        description="Largest gaps requiring intervention"
                        icon={<Target size={19} />}
                      />

                      <div className="h-80">
                        {gapChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={gapChartData}
                              margin={{
                                top: 10,
                                right: 10,
                                left: -10,
                                bottom: 70,
                              }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />

                              <XAxis
                                dataKey="name"
                                angle={-35}
                                textAnchor="end"
                                interval={0}
                                tick={{
                                  fontSize: 11,
                                }}
                              />

                              <YAxis />

                              <Tooltip />

                              <Bar
                                dataKey="gap"
                                name="Skill gap"
                                radius={[6, 6, 0, 0]}
                                fill="#dc2626"
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <EmptyState
                            title="No skill gap data"
                            description="No positive skill gap records are currently available."
                          />
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <SectionHeader
                      title="Skill Intelligence Detail"
                      description="Demand, industry participation, student supply and gap signals"
                      icon={<BarChart3 size={19} />}
                    />

                    {industrySkillDemand.results.length === 0 ? (
                      <EmptyState
                        title="No detailed skill intelligence"
                        description="No skill demand records were returned by the analytics engine."
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[950px] text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                              <th className="pb-3">Skill</th>

                              <th className="pb-3">Demand</th>

                              <th className="pb-3">Industry</th>

                              <th className="pb-3">Supply</th>

                              <th className="pb-3">Gap</th>

                              <th className="pb-3">Gap %</th>

                              <th className="pb-3">Signal</th>
                            </tr>
                          </thead>

                          <tbody>
                            {industrySkillDemand.results
                              .slice(0, 25)
                              .map((item, index) => {
                                const classification =
                                  item.classification ||
                                  item.demand_level ||
                                  "NORMAL";

                                return (
                                  <tr
                                    key={`${getSkillName(item)}-${index}`}
                                    className="border-b border-slate-100 last:border-0"
                                  >
                                    <td className="py-3 font-semibold">
                                      {getSkillName(item)}
                                    </td>

                                    <td className="py-3">
                                      {Number(
                                        item.demand_count ?? 0,
                                      ).toLocaleString("en-IN")}
                                    </td>

                                    <td className="py-3">
                                      {Number(
                                        item.industry_count ?? 0,
                                      ).toLocaleString("en-IN")}
                                    </td>

                                    <td className="py-3">
                                      {getSupplyValue(item).toLocaleString(
                                        "en-IN",
                                      )}
                                    </td>

                                    <td className="py-3 font-semibold text-red-700">
                                      {getGapValue(item).toLocaleString(
                                        "en-IN",
                                      )}
                                    </td>

                                    <td className="py-3">
                                      {Number(item.gap_percentage ?? 0).toFixed(
                                        2,
                                      )}
                                      %
                                    </td>

                                    <td className="py-3">
                                      <span
                                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${classificationClass(
                                          classification,
                                        )}`}
                                      >
                                        {classification}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>

                  <section className="grid gap-6 xl:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <SectionHeader
                        title="Emerging Skills"
                        description="Skills with growth signals"
                        icon={<TrendingUp size={19} />}
                      />

                      <div className="space-y-3">
                        {emergingSkills.length > 0 ? (
                          emergingSkills.slice(0, 10).map((item, index) => {
                            const classification =
                              item.classification ||
                              item.demand_level ||
                              "EMERGING";

                            return (
                              <div
                                key={`${getSkillName(item)}-${index}`}
                                className="rounded-xl border border-slate-200 p-4"
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <div>
                                    <p className="font-semibold">
                                      {getSkillName(item)}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                      Demand:{" "}
                                      {Number(
                                        item.demand_count ??
                                          item.demand_score ??
                                          0,
                                      ).toLocaleString("en-IN")}
                                    </p>
                                  </div>

                                  <div className="text-right">
                                    <p className="font-bold text-amber-700">
                                      {Number(item.growth_rate ?? 0).toFixed(2)}
                                      %
                                    </p>

                                    <span
                                      className={`mt-1 inline-block rounded-full border px-2 py-1 text-[10px] font-semibold ${classificationClass(
                                        classification,
                                      )}`}
                                    >
                                      {classification}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <EmptyState
                            title="No emerging skills"
                            description="No emerging skill records were returned."
                          />
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                      <SectionHeader
                        title="Critical Skill Gaps"
                        description="Highest-priority intervention areas"
                        icon={<AlertTriangle size={19} />}
                      />

                      <div className="space-y-3">
                        {skillGapIntelligence.critical_gaps.length > 0 ? (
                          skillGapIntelligence.critical_gaps
                            .slice(0, 10)
                            .map((item, index) => (
                              <div
                                key={`${getSkillName(item)}-${index}`}
                                className="rounded-xl border border-red-200 bg-white p-4"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <p className="font-semibold">
                                    {getSkillName(item)}
                                  </p>

                                  <p className="font-bold text-red-700">
                                    {getGapValue(item).toLocaleString("en-IN")}
                                  </p>
                                </div>

                                {item.gap_percentage !== undefined && (
                                  <p className="mt-1 text-xs text-red-600">
                                    Gap:{" "}
                                    {Number(item.gap_percentage).toFixed(2)}%
                                  </p>
                                )}
                              </div>
                            ))
                        ) : (
                          <EmptyState
                            title="No critical gaps"
                            description="The analytics engine has not identified critical gaps."
                          />
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* =================================================
                  VERIFICATION
              ================================================= */}

              {activeSection === "verification" && (
                <div className="space-y-6">
                  <section className="rounded-2xl bg-slate-900 p-6 text-white">
                    <p className="text-sm font-semibold text-slate-300">
                      Skill Verification
                    </p>

                    <h2 className="mt-2 text-2xl font-bold">
                      Student skill verification monitoring
                    </h2>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                      Monitor verified and pending student skill records
                      currently exposed by the backend.
                    </p>
                  </section>

                  <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                      title="Assessed Skills"
                      value={overview.total_assessed_skills}
                      icon={<ClipboardCheck size={21} />}
                      description="Skills with scores"
                    />

                    <StatCard
                      title="Verified Skills"
                      value={verifiedStudentSkills}
                      icon={<CheckCircle2 size={21} />}
                      description="Verified records returned"
                    />

                    <StatCard
                      title="Pending Review"
                      value={pendingStudentSkills}
                      icon={<AlertTriangle size={21} />}
                      description="Pending verification records"
                    />

                    <StatCard
                      title="Students Assessed"
                      value={studentsWithAssessments}
                      icon={<Users size={21} />}
                      description="Students with scored skills"
                    />
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <SectionHeader
                      title="Verification Summary"
                      description="Current verification state derived from live student skill records"
                      icon={<ShieldCheck size={19} />}
                    />

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                        <div className="flex items-center gap-2">
                          <CheckCircle2
                            size={19}
                            className="text-emerald-700"
                          />

                          <p className="font-semibold text-emerald-800">
                            Verified
                          </p>
                        </div>

                        <p className="mt-3 text-3xl font-bold text-emerald-800">
                          {verifiedStudentSkills.toLocaleString("en-IN")}
                        </p>

                        <p className="mt-1 text-xs text-emerald-700">
                          Verified student skill records
                        </p>
                      </div>

                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                        <div className="flex items-center gap-2">
                          <AlertTriangle
                            size={19}
                            className="text-amber-700"
                          />

                          <p className="font-semibold text-amber-800">
                            Pending
                          </p>
                        </div>

                        <p className="mt-3 text-3xl font-bold text-amber-800">
                          {pendingStudentSkills.toLocaleString("en-IN")}
                        </p>

                        <p className="mt-1 text-xs text-amber-700">
                          Records requiring review
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex items-center gap-2">
                          <ClipboardCheck
                            size={19}
                            className="text-slate-700"
                          />

                          <p className="font-semibold text-slate-800">
                            Assessed
                          </p>
                        </div>

                        <p className="mt-3 text-3xl font-bold">
                          {overview.total_assessed_skills.toLocaleString(
                            "en-IN",
                          )}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Skill records with assessment scores
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <SectionHeader
                      title="Student Verification Records"
                      description="Student-level verification information available from the backend"
                      icon={<ShieldCheck size={19} />}
                    />

                    {students.length === 0 ? (
                      <EmptyState
                        title="No student verification records"
                        description="No student skill records were returned."
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px] text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                              <th className="pb-3">Student</th>

                              <th className="pb-3">Total Skills</th>

                              <th className="pb-3">Verified</th>

                              <th className="pb-3">Pending</th>

                              <th className="pb-3">Assessed</th>
                            </tr>
                          </thead>

                          <tbody>
                            {students.slice(0, 25).map((student, index) => {
                              const skills = getArray<StudentSkillRecord>(
                                student.skills,
                              );

                              const verified = skills.filter(
                                (skill) =>
                                  skill.verified === true ||
                                  skill.status === "VERIFIED",
                              ).length;

                              const pending = skills.filter(
                                (skill) =>
                                  skill.status === "PENDING" ||
                                  skill.status === "PENDING_REVIEW",
                              ).length;

                              const assessed = skills.filter(
                                (skill) =>
                                  skill.score !== null &&
                                  skill.score !== undefined,
                              ).length;

                              return (
                                <tr
                                  key={
                                    student.id ?? student.student_id ?? index
                                  }
                                  className="border-b border-slate-100 last:border-0"
                                >
                                  <td className="py-3 font-semibold">
                                    {getStudentName(student)}
                                  </td>

                                  <td className="py-3">{skills.length}</td>

                                  <td className="py-3 font-semibold text-emerald-700">
                                    {verified}
                                  </td>

                                  <td className="py-3 font-semibold text-amber-700">
                                    {pending}
                                  </td>

                                  <td className="py-3">{assessed}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* =================================================
                  OPPORTUNITIES
              ================================================= */}

              {activeSection === "opportunities" && (
                <div className="space-y-6">
                  <section className="rounded-2xl bg-slate-900 p-6 text-white">
                    <p className="text-sm font-semibold text-slate-300">
                      Opportunities
                    </p>

                    <h2 className="mt-2 text-2xl font-bold">
                      Internship, job and placement ecosystem
                    </h2>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                      Monitor active opportunities and application activity
                      across the platform.
                    </p>
                  </section>

                  <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                      title="Open Internships"
                      value={overview.open_internships}
                      icon={<ClipboardCheck size={21} />}
                      description="Active internship opportunities"
                    />

                    <StatCard
                      title="Open Jobs"
                      value={overview.open_jobs}
                      icon={<BriefcaseBusiness size={21} />}
                      description="Active employment opportunities"
                    />

                    <StatCard
                      title="Applications"
                      value={overview.total_applications}
                      icon={<Users size={21} />}
                      description="Applications recorded"
                    />

                    <StatCard
                      title="Industries"
                      value={overview.total_industries}
                      icon={<Building2 size={21} />}
                      description="Industry organizations"
                    />
                  </section>

                  <section className="grid gap-6 xl:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <SectionHeader
                        title="Training Requirements"
                        description="Training priorities derived from skill gaps"
                        icon={<BookOpen size={19} />}
                      />

                      <div className="space-y-3">
                        {trainingRequirements.length > 0 ? (
                          trainingRequirements
                            .slice(0, 12)
                            .map((item, index) => {
                              const priority = getPriority(item);
                              return (
                                <div
                                  key={`${getSkillName(item)}-${index}`}
                                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold">
                                      {getSkillName(item)}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                      Students requiring training:{" "}
                                      {Number(
                                        item.required_students ??
                                          item.student_count ??
                                          item.gap_count ??
                                          0,
                                      ).toLocaleString("en-IN")}
                                    </p>
                                  </div>

                                  <span
                                    className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityClass(
                                      priority,
                                    )}`}
                                  >
                                    {priority}
                                  </span>
                                </div>
                              );
                            })
                        ) : (
                          <EmptyState
                            title="No training requirements"
                            description="No training requirement records were returned."
                          />
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <SectionHeader
                        title="Placement Intelligence"
                        description="Application status and placement activity"
                        icon={<BriefcaseBusiness size={19} />}
                      />

                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="rounded-xl bg-slate-50 p-4">
                          <p className="text-xs text-slate-500">Applications</p>

                          <p className="mt-2 text-2xl font-bold">
                            {placementIntelligence.total_applications.toLocaleString(
                              "en-IN",
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-4">
                          <p className="text-xs text-slate-500">Hired</p>

                          <p className="mt-2 text-2xl font-bold">
                            {placementIntelligence.hired.toLocaleString("en-IN")}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-4">
                          <p className="text-xs text-slate-500">
                            Placement Rate
                          </p>

                          <p className="mt-2 text-2xl font-bold">
                            {Number(
                              placementIntelligence.placement_rate,
                            ).toFixed(2)}
                            %
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 h-60">
                        {placementChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={placementChartData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={82}
                                label
                              >
                                {placementChartData.map((_entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                                  />
                                ))}
                              </Pie>

                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <EmptyState
                            title="No placement breakdown"
                            description="No application status breakdown was returned."
                          />
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {/* =================================================
                  ACTIVITY
              ================================================= */}

              {activeSection === "activity" && (
                <div className="space-y-6">
                  <section className="rounded-2xl bg-slate-900 p-6 text-white">
                    <p className="text-sm font-semibold text-slate-300">
                      System Activity
                    </p>

                    <h2 className="mt-2 text-2xl font-bold">
                      Platform activity monitor
                    </h2>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                      Current activity indicators derived from live platform
                      records.
                    </p>
                  </section>

                  <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-xs text-slate-500">Students</p>

                      <p className="mt-2 text-3xl font-bold">
                        {overview.total_students.toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-xs text-slate-500">Faculty</p>

                      <p className="mt-2 text-3xl font-bold">
                        {overview.total_faculty.toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-xs text-slate-500">Industries</p>

                      <p className="mt-2 text-3xl font-bold">
                        {overview.total_industries.toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-xs text-slate-500">Internships</p>

                      <p className="mt-2 text-3xl font-bold">
                        {overview.open_internships.toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-xs text-slate-500">Jobs</p>

                      <p className="mt-2 text-3xl font-bold">
                        {overview.open_jobs.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <SectionHeader
                      title="Platform Health"
                      description="Current state of major administrative data domains"
                      icon={<Activity size={19} />}
                    />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle2
                            size={20}
                            className="text-emerald-700"
                          />

                          <div>
                            <p className="font-semibold text-emerald-900">
                              PostgreSQL platform data
                            </p>

                            <p className="text-xs text-emerald-700">
                              Administrative overview loaded successfully
                            </p>
                          </div>
                        </div>

                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                          CONNECTED
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-3">
                          <BarChart3 size={20} className="text-slate-700" />

                          <div>
                            <p className="font-semibold text-slate-900">
                              Analytics engine
                            </p>

                            <p className="text-xs text-slate-500">
                              National demand and skill intelligence
                            </p>
                          </div>
                        </div>

                        {analyticsError ? (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                            WARNING
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                            ACTIVE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-3">
                          <Users size={20} className="text-slate-700" />

                          <div>
                            <p className="font-semibold text-slate-900">
                              Student skill service
                            </p>

                            <p className="text-xs text-slate-500">
                              Student skill records available to administration
                            </p>
                          </div>
                        </div>

                        {studentsError ? (
                          <XCircle size={21} className="text-red-600" />
                        ) : (
                          <CheckCircle2 size={21} className="text-emerald-600" />
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <SectionHeader
                      title="Application Activity"
                      description="Application volume currently recorded by the platform"
                      icon={<ClipboardCheck size={19} />}
                    />

                    <p className="text-4xl font-bold">
                      {overview.total_applications.toLocaleString("en-IN")}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Total applications recorded in the database
                    </p>
                  </section>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ===================================================
          STUDENT DETAILS MODAL
      =================================================== */}

      {selectedStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Student Profile
                </p>

                <h3 className="mt-1 text-2xl font-bold text-slate-900">
                  {getStudentName(selectedStudent)}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedStudent.student_id} · {selectedStudent.email}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Degree</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selectedStudent.degree || "—"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Department</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selectedStudent.department || "—"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Graduation Year</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selectedStudent.graduation_year || "—"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">CGPA</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selectedStudent.cgpa ?? "—"}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">
                    AYUSH Skills
                  </h4>
                  <p className="mt-1 text-sm text-slate-500">
                    Assessed and verified skills recorded in the platform
                  </p>
                </div>

                <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                  {selectedStudent.total_skills} Skills
                </div>
              </div>

              {selectedStudent.skills.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  No skills have been assessed for this student yet.
                </div>
              ) : (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {selectedStudent.skills.map((skill) => (
                    <div
                      key={skill.student_skill_id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {skill.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {skill.ayush_system || "AYUSH"}
                            {skill.category
                              ? ` · ${skill.category}`
                              : ""}
                          </p>
                        </div>

                        {skill.verified ? (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            VERIFIED
                          </span>
                        ) : (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            UNVERIFIED
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex items-end justify-between">
                        <div>
                          <p className="text-xs text-slate-500">
                            Skill Level
                          </p>
                          <p className="mt-1 font-semibold text-slate-800">
                            {skill.skill_level || "—"}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-slate-500">
                            Score
                          </p>
                          <p className="mt-1 text-xl font-bold text-slate-900">
                            {skill.score != null
                              ? `${skill.score}%`
                              : "—"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 text-xs text-slate-500">
                        Source: {skill.source || "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-200 p-5">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          FACULTY DETAILS MODAL
      =================================================== */}

      {selectedFaculty && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setSelectedFaculty(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 p-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Faculty Details
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Faculty profile and institutional information
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFaculty(null)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Full Name
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selectedFaculty.full_name}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </p>
                <p className="mt-1 break-all font-semibold text-slate-900">
                  {selectedFaculty.email}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Employee ID
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selectedFaculty.employee_id || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Designation
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selectedFaculty.designation || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Department
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selectedFaculty.department || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Institution
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selectedFaculty.institution_name || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Account Status
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    selectedFaculty.is_active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {selectedFaculty.is_active ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Verification
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    selectedFaculty.is_verified
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {selectedFaculty.is_verified
                    ? "VERIFIED"
                    : "UNVERIFIED"}
                </span>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-200 p-6">
              <button
                type="button"
                onClick={() => setSelectedFaculty(null)}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          INSTITUTION DETAILS MODAL
      =================================================== */}

      {selectedInstitution && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={() => setSelectedInstitution(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Institution Details
                </p>

                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedInstitution.name}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedInstitution(null)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Institution Code</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selectedInstitution.institution_code || "—"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Institution Type</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selectedInstitution.institution_type || "—"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">State</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selectedInstitution.state || "—"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">District</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selectedInstitution.district || "—"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">City</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selectedInstitution.city || "—"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Status</p>
                <span
                  className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    selectedInstitution.is_active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {selectedInstitution.is_active ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Students</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {Number(
                    selectedInstitution.student_count ?? 0,
                  ).toLocaleString("en-IN")}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Faculty</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {Number(
                    selectedInstitution.faculty_count ?? 0,
                  ).toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200 p-5">
              <button
                type="button"
                onClick={() => setSelectedInstitution(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}