import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Eye,
  Filter,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  X,
  Activity,
  AlertTriangle,
  ChevronDown,
  BriefcaseBusiness,
  UsersRound,
  Save,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import api from "../services/api";

interface Student {
  id: number;
  name?: string;
  full_name?: string;
  email?: string;
  degree?: string;
  department?: string;
  institution?: string;
  cgpa?: number;
  total_skills?: number;
  assessed_skills?: number;
  verified_skills?: number;
  average_score?: number;
  not_assessed_skills?: number;
  skills?: StudentSkill[];
}


interface StudentSkill {
  id: number;
  skill_id?: number;
  skill_name?: string;
  name?: string;
  score?: number;
  level?: string;
  verified?: boolean;
  verification_status?: string;
  verification_source?: string;
  verification_notes?: string;
  evidence_reference?: string;
  review_date?: string;
  verified_by?: number;
  verified_by_name?: string;
  verified_at?: string;
  category?: string;
  ayush_system?: string;
  required_score?: number;
  updated_at?: string;
  assessed_at?: string;
  student_id?: number;
}


interface Internship {
  id: number;
  progress_id?: number;
  internship_progress_id?: number;
  title?: string;
  internship_title?: string;
  status?: string;
  progress_percentage?: number;
  attendance_percentage?: number;
  tasks_completed?: number;
  total_tasks?: number;
  student_name?: string;
  student_id?: number;
  mentor_id?: number;
  mentor_name?: string;
  application_id?: number;
  internship_id?: number;
  start_date?: string;
  end_date?: string;
  student_notes?: string;
  mentor_notes?: string;
}

interface AssessmentSkillResult {
  skill_id: number;
  skill_name?: string;
  score?: number;
  level_id?: number;
  verified?: boolean;
}

interface Assessment {
  id: number;
  attempt_id?: number;
  student_id?: number;
  student_name?: string;
  student_identifier?: string;
  institution_id?: number;
  department?: string;
  degree?: string;
  cgpa?: number;
  assessment_id?: number;
  assessment_name?: string;
  assessment_type?: string;
  version?: number;
  submitted_at?: string;
  total_score?: number;
  percentage?: number;
  passed?: boolean;
  status?: string;
  skills?: AssessmentSkillResult[];
}

interface SkillDemandItem {
  skill_id?: number;
  skill_name?: string;
  name?: string;
  category?: string;
  ayush_system?: string;
  demand_count?: number;
  industry_count?: number;
  job_demand_count?: number;
  internship_demand_count?: number;
  average_required_score?: number;
  student_supply_count?: number;
  skill_gap_count?: number;
  gap_percentage?: number;
  demand_score?: number;
  industry_skill_gap_count?: number;
  students_below_required_count?: number;
  students_meeting_required_count?: number;
  students_not_assessed_count?: number;
  average_candidate_gap?: number;
}

interface EmergingSkill extends SkillDemandItem {
  trend?: string;
}

interface TrainingRequirement extends SkillDemandItem {
  current_training_priority?: string;
  predicted_future_demand?: number;
  predicted_future_skill_gap?: number;
  future_shortage_level?: string;
  forecast_trend?: string;
  forecast_confidence_score?: number;
  training_priority?: string;
  training_recommendation_reason?: string;
}

interface CollaborationItem {
  id: number;
  title?: string;
  topic?: string;
  description?: string;
  status?: string;
  verified?: boolean;
  institution_id?: number;
  faculty_id?: number;
  industry_id?: number;
  scheduled_at?: string;
  deadline?: string;
  start_date?: string;
  end_date?: string;
  agreement_type?: string;
  collaboration_type?: string;
  mode?: string;
}

interface FacultyProfile {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  employee_id?: string | null;
  department?: string | null;
  designation?: string | null;
  institution_id: number;
  is_verified: boolean;
}

interface DashboardStats {
  students: number;
  internships: number;
  assessments: number;
  verifiedSkills: number;
  assessedSkills: number;
  studentsWithAssessments: number;
  averageSkillScore: number;
  activeInternships: number;
  completedInternships: number;
}

export default function FacultyDashboard() {
  const { user, logout } = useAuth();

  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [students, setStudents] = useState<Student[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  const [skillDemandData, setSkillDemandData] = useState<SkillDemandItem[]>([]);
  const [emergingSkillsData, setEmergingSkillsData] = useState<EmergingSkill[]>([]);
  const [trainingRequirementsData, setTrainingRequirementsData] = useState<TrainingRequirement[]>([]);
  const [collaborations, setCollaborations] = useState<CollaborationItem[]>([]);
  const [guestLectures, setGuestLectures] = useState<CollaborationItem[]>([]);
  const [innovationChallenges, setInnovationChallenges] = useState<CollaborationItem[]>([]);
  const [consultancies, setConsultancies] = useState<CollaborationItem[]>([]);
  const [partnerships, setPartnerships] = useState<CollaborationItem[]>([]);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentSkills, setStudentSkills] = useState<StudentSkill[]>([]);
  const [studentSkillMap, setStudentSkillMap] = useState<Record<number, StudentSkill[]>>({});

  const [loading, setLoading] = useState(true);
  const [studentLoading, setStudentLoading] = useState(false);
  const [error, setError] = useState("");
  const [facultyProfile, setFacultyProfile] = useState<FacultyProfile | null>(null);
  const [profileForm, setProfileForm] = useState({ employee_id: "", department: "", designation: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);
  const [addStudentError, setAddStudentError] = useState("");
  const [addStudentSuccess, setAddStudentSuccess] = useState("");
  const [studentForm, setStudentForm] = useState({
    email: "",
    password: "",
    full_name: "",
    student_id: "",
    department: "",
    degree: "BAMS",
    graduation_year: "",
    cgpa: "",
  });

  const getArray = (data: any): any[] => {
    if (Array.isArray(data)) return data;

    if (Array.isArray(data?.students)) return data.students;
    if (Array.isArray(data?.internships)) return data.internships;
    if (Array.isArray(data?.assessments)) return data.assessments;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.skills)) return data.skills;
    if (Array.isArray(data?.requirements)) return data.requirements;
    if (Array.isArray(data?.collaborations)) return data.collaborations;
    if (Array.isArray(data?.guest_lectures)) return data.guest_lectures;
    if (Array.isArray(data?.innovation_challenges)) return data.innovation_challenges;
    if (Array.isArray(data?.consultancies)) return data.consultancies;
    if (Array.isArray(data?.partnerships)) return data.partnerships;
    if (Array.isArray(data?.items)) return data.items;

    return [];
  };

  const getNumber = (value: any, fallback = 0): number => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  };

  const getStudentName = (student: Student) =>
    student.name ||
    student.full_name ||
    `Student ${student.id}`;

  const getSkillName = (skill: StudentSkill) =>
    skill.skill_name ||
    skill.name ||
    `Skill ${skill.skill_id ?? skill.id}`;

  const loadFacultyProfile = async () => {
    setProfileLoading(true);
    setProfileError("");
    try {
      const response = await api.get("/api/faculty/profile");
      const profile = response.data as FacultyProfile;
      setFacultyProfile(profile);
      setProfileForm({
        employee_id: profile.employee_id ?? "",
        department: profile.department ?? "",
        designation: profile.designation ?? "",
      });
    } catch (err: any) {
      console.error("Unable to load faculty profile:", err);
      const detail = err?.response?.data?.detail;
      setProfileError(typeof detail === "string" ? detail : "Unable to load faculty profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  const saveFacultyProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (profileSaving) return;
    setProfileSaving(true);
    setProfileMessage("");
    setProfileError("");
    try {
      const response = await api.patch("/api/faculty/profile", {
        employee_id: profileForm.employee_id.trim() || null,
        department: profileForm.department.trim() || null,
        designation: profileForm.designation.trim() || null,
      });
      setFacultyProfile(response.data as FacultyProfile);
      setProfileMessage("Faculty profile updated successfully.");
    } catch (err: any) {
      console.error("Unable to update faculty profile:", err);
      const detail = err?.response?.data?.detail;
      setProfileError(typeof detail === "string" ? detail : "Unable to update faculty profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled([
        api.get("/api/skills/students"),
        api.get("/api/faculty/mentorship/my-internships"),
        api.get("/api/collaboration/proposals"),
        api.get("/api/collaboration/guest-lectures"),
        api.get("/api/collaboration/innovation-challenges"),
        api.get("/api/collaboration/consultancies"),
        api.get("/api/collaboration/partnerships"),
        api.get("/api/analytics/skill-demand"),
        api.get("/api/analytics/emerging-skills"),
        api.get("/api/analytics/training-requirements"),
        api.get("/api/assessments/faculty/results"),
      ]);

      const [
        studentsResponse,
        internshipResponse,
        collaborationResponse,
        lecturesResponse,
        challengesResponse,
        consultanciesResponse,
        partnershipsResponse,
        skillDemandResponse,
        emergingResponse,
        trainingResponse,
        assessmentResultsResponse,
      ] = results;

      if (studentsResponse.status === "fulfilled") {
        const studentList = getArray(studentsResponse.value.data) as Student[];
        const skillMap: Record<number, StudentSkill[]> = {};

        const enrichedStudents = studentList.map((student) => {
          const apiSkills = Array.isArray((student as any).skills)
            ? (student as any).skills
            : [];

          const skills: StudentSkill[] = apiSkills.map((skill: any) => ({
            id: getNumber(skill.id ?? skill.student_skill_id),
            skill_id: skill.skill_id ?? skill.id,
            skill_name: skill.skill_name ?? skill.name,
            name: skill.name ?? skill.skill_name,
            score: skill.score,
            level: skill.level ?? skill.skill_level,
            verified: skill.verified === true,
            category: skill.category,
            ayush_system: skill.ayush_system,
            required_score: skill.required_score,
            updated_at: skill.updated_at,
            assessed_at: skill.assessed_at,
            student_id: student.id,
          }));

          skillMap[student.id] = skills;

          const assessed = skills.filter(
            (skill) => skill.score !== null && skill.score !== undefined,
          );
          const verified = assessed.filter((skill) => skill.verified === true);
          const scores = assessed
            .map((skill) => Number(skill.score))
            .filter((score) => Number.isFinite(score));
          const average = scores.length
            ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1))
            : undefined;

          return {
            ...student,
            total_skills: student.total_skills ?? skills.length,
            assessed_skills: student.assessed_skills ?? assessed.length,
            verified_skills: student.verified_skills ?? verified.length,
            not_assessed_skills: Math.max(
              (student.total_skills ?? skills.length) -
                (student.assessed_skills ?? assessed.length),
              0,
            ),
            average_score: student.average_score ?? average,
          };
        });

        setStudentSkillMap(skillMap);
        setStudents(enrichedStudents);
      }

      if (assessmentResultsResponse.status === "fulfilled") {
        setAssessments(getArray(assessmentResultsResponse.value.data) as Assessment[]);
      } else {
        setAssessments([]);
        console.error(
          "Unable to load faculty assessment results:",
          assessmentResultsResponse.reason,
        );
      }

      if (internshipResponse.status === "fulfilled") {
        setInternships(getArray(internshipResponse.value.data).map((item: any) => ({ ...item, id: getNumber(item.progress_id ?? item.internship_progress_id ?? item.id), progress_id: getNumber(item.progress_id ?? item.internship_progress_id ?? item.id) })));
      }

      if (collaborationResponse.status === "fulfilled") {
        setCollaborations(getArray(collaborationResponse.value.data));
      }

      if (lecturesResponse.status === "fulfilled") {
        setGuestLectures(getArray(lecturesResponse.value.data));
      }

      if (challengesResponse.status === "fulfilled") {
        setInnovationChallenges(getArray(challengesResponse.value.data));
      }

      if (consultanciesResponse.status === "fulfilled") {
        setConsultancies(getArray(consultanciesResponse.value.data));
      }

      if (partnershipsResponse.status === "fulfilled") {
        setPartnerships(getArray(partnershipsResponse.value.data));
      }

      if (skillDemandResponse.status === "fulfilled") {
        setSkillDemandData(getArray(skillDemandResponse.value.data));
      }

      if (emergingResponse.status === "fulfilled") {
        setEmergingSkillsData(getArray(emergingResponse.value.data));
      }

      if (trainingResponse.status === "fulfilled") {
        setTrainingRequirementsData(getArray(trainingResponse.value.data));
      }

      const coreFailed =
        studentsResponse.status === "rejected" &&
        internshipResponse.status === "rejected";

      if (coreFailed) {
        setError("Unable to load core faculty dashboard data.");
      }
    } catch (err) {
      console.error("Unable to load faculty dashboard:", err);
      setError("Unable to load faculty dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    loadFacultyProfile();
  }, []);

  const loadStudentSkills = async (student: Student) => {
    setSelectedStudent(student);
    setStudentLoading(true);

    const cachedSkills = studentSkillMap[student.id] || [];
    setStudentSkills(cachedSkills);
    setStudentLoading(false);
  };

  const verifyStudentSkill = async (studentId: number, skillId: number) => {
    try {
      await api.patch(`/api/skill-verification/students/${studentId}/skills/${skillId}/verify`, {
        verification_source: "FACULTY_ASSESSMENT",
        verification_notes: "Verified by faculty through the AYUSH academic portal.",
      });

      const response = await api.get("/api/skills/students");
      const studentList = getArray(response.data) as Student[];
      const skillMap: Record<number, StudentSkill[]> = {};

      const refreshedStudents = studentList.map((student) => {
        const apiSkills = Array.isArray((student as any).skills) ? (student as any).skills : [];
        const skills: StudentSkill[] = apiSkills.map((skill: any) => ({
          id: getNumber(skill.id ?? skill.student_skill_id),
          skill_id: skill.skill_id ?? skill.id,
          skill_name: skill.skill_name ?? skill.name,
          name: skill.name ?? skill.skill_name,
          score: skill.score,
          level: skill.level ?? skill.skill_level,
          verified: skill.verified === true,
          category: skill.category,
          ayush_system: skill.ayush_system,
          required_score: skill.required_score,
          updated_at: skill.updated_at,
          assessed_at: skill.assessed_at,
          student_id: student.id,
        }));
        skillMap[student.id] = skills;
        return student;
      });

      setStudentSkillMap(skillMap);
      setStudents(refreshedStudents);
      setStudentSkills(skillMap[studentId] || []);
      setSelectedStudent(refreshedStudents.find((student) => student.id === studentId) || null);
    } catch (err) {
      console.error("Unable to verify student skill:", err);
      setError("Unable to verify the selected skill. Please refresh and try again.");
    }
  };

  const stats: DashboardStats = useMemo(() => {
    const assessedSkills = students.reduce(
      (total, student) => total + getNumber(student.assessed_skills),
      0,
    );
    const verifiedSkills = students.reduce(
      (total, student) => total + getNumber(student.verified_skills),
      0,
    );
    const averageScores = students
      .map((student) => student.average_score)
      .filter((score): score is number => typeof score === "number" && Number.isFinite(score));
    const averageSkillScore = averageScores.length
      ? Number((averageScores.reduce((sum, score) => sum + score, 0) / averageScores.length).toFixed(1))
      : 0;
    const activeInternships = internships.filter((item) =>
      ["ACTIVE", "ONGOING", "IN_PROGRESS", "ENROLLED", "STARTED"].includes(String(item.status || "").toUpperCase()),
    ).length;
    const completedInternships = internships.filter((item) =>
      ["COMPLETED", "COMPLETE", "FINISHED"].includes(String(item.status || "").toUpperCase()),
    ).length;

    return {
      students: students.length,
      internships: internships.length,
      assessments: assessedSkills,
      verifiedSkills,
      assessedSkills,
      studentsWithAssessments: students.filter((student) => getNumber(student.assessed_skills) > 0).length,
      averageSkillScore,
      activeInternships,
      completedInternships,
    };
  }, [students, internships]);

  const filteredStudents = students.filter((student) =>
    getStudentName(student)
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  const resetStudentForm = () => {
    setStudentForm({
      email: "",
      password: "",
      full_name: "",
      student_id: "",
      department: "",
      degree: "BAMS",
      graduation_year: "",
      cgpa: "",
    });
    setAddStudentError("");
    setAddStudentSuccess("");
  };

  const handleAddStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (addingStudent) return;

    setAddingStudent(true);
    setAddStudentError("");
    setAddStudentSuccess("");

    try {
      const payload: Record<string, unknown> = {
        email: studentForm.email.trim(),
        password: studentForm.password,
        full_name: studentForm.full_name.trim(),
        student_id: studentForm.student_id.trim(),
        department: studentForm.department.trim() || null,
        degree: studentForm.degree.trim() || null,
        graduation_year: studentForm.graduation_year ? Number(studentForm.graduation_year) : null,
        cgpa: studentForm.cgpa ? Number(studentForm.cgpa) : null,
      };

      await api.post("/api/auth/faculty/students", payload);
      setAddStudentSuccess("Student created successfully.");
      await loadDashboard();
      setTimeout(() => {
        setShowAddStudent(false);
        resetStudentForm();
      }, 700);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setAddStudentError(
        typeof detail === "string"
          ? detail
          : "Unable to create the student. Please check the details and try again.",
      );
    } finally {
      setAddingStudent(false);
    }
  };

  const navigation = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      id: "students",
      label: "Student Skills",
      icon: Users,
    },
    {
      id: "profile",
      label: "Faculty Profile",
      icon: UsersRound,
    },
    {
      id: "internships",
      label: "Internship Mentorship",
      icon: GraduationCap,
    },
    {
      id: "assessments",
      label: "Assessments",
      icon: ClipboardCheck,
    },
    {
      id: "verification",
      label: "Skill Verification",
      icon: ShieldCheck,
    },
    {
      id: "collaboration",
      label: "Industry Collaboration",
      icon: MessageSquare,
    },
    {
      id: "analytics",
      label: "Industry Analytics",
      icon: BarChart3,
    },
  ];

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={closeSidebar}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transform bg-slate-950 text-white transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div>
            <div className="text-lg font-bold">🌿 AYUSH</div>
            <div className="text-xs text-slate-400">
              Academia–Industry Platform
            </div>
          </div>

          <button
            onClick={closeSidebar}
            className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-6">
          <div className="mb-4 rounded-2xl bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 font-bold">
                {user?.name?.charAt(0) || "F"}
              </div>

              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {user?.name || "Faculty"}
                </p>
                <p className="text-xs text-slate-400">Academician</p>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    closeSidebar();
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                    activeSection === item.id
                      ? "bg-emerald-600 text-white"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-xl p-2 hover:bg-slate-100 lg:hidden"
              >
                <Menu size={22} />
              </button>

              <div>
                <h1 className="text-xl font-bold">
                  Faculty & Academician Dashboard
                </h1>
                <p className="text-sm text-slate-500">
                  Monitor student development, mentorship and skill verification
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                Faculty Portal
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {activeSection === "overview" && (
            <OverviewSection
              stats={stats}
              internships={internships}
              assessments={assessments}
              onNavigate={setActiveSection}
            />
          )}

          {activeSection === "profile" && (
            <FacultyProfileSection
              profile={facultyProfile}
              form={profileForm}
              loading={profileLoading}
              saving={profileSaving}
              message={profileMessage}
              error={profileError}
              setForm={setProfileForm}
              onSubmit={saveFacultyProfile}
              onRefresh={loadFacultyProfile}
            />
          )}

          {activeSection === "students" && (
            <StudentSkillsSection
              students={filteredStudents}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onSelect={loadStudentSkills}
              onAddStudent={() => {
                setAddStudentError("");
                setAddStudentSuccess("");
                setShowAddStudent(true);
              }}
            />
          )}

          {activeSection === "internships" && (
            <InternshipSection internships={internships} />
          )}

          {activeSection === "assessments" && (
            <AssessmentSection assessments={assessments} stats={stats} />
          )}

          {activeSection === "verification" && (
            <VerificationSection students={students} studentSkillMap={studentSkillMap} onVerify={verifyStudentSkill} />
          )}

          {activeSection === "collaboration" && (
            <CollaborationSection
              collaborations={collaborations}
              guestLectures={guestLectures}
              innovationChallenges={innovationChallenges}
              consultancies={consultancies}
              partnerships={partnerships}
              onRefresh={loadDashboard}
            />
          )}

          {activeSection === "analytics" && (
            <AnalyticsSection
              skillDemandData={skillDemandData}
              emergingSkillsData={emergingSkillsData}
              trainingRequirementsData={trainingRequirementsData}
            />
          )}

          {loading && (
            <div className="fixed bottom-6 right-6 rounded-xl bg-slate-950 px-4 py-3 text-sm text-white shadow-xl">
              Loading faculty data...
            </div>
          )}
        </div>
      </main>

      {/* Add student modal */}
      {showAddStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !addingStudent) {
              setShowAddStudent(false);
              resetStudentForm();
            }
          }}
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Faculty action</p>
                <h2 className="mt-1 text-2xl font-bold">Add Student</h2>
                <p className="mt-1 text-sm text-slate-500">Create a student account under your institution. Institution assignment is handled securely by the backend.</p>
              </div>
              <button
                type="button"
                disabled={addingStudent}
                onClick={() => { setShowAddStudent(false); resetStudentForm(); }}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Close add student form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-5 p-6">
              {addStudentError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{addStudentError}</div>
              )}
              {addStudentSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{addStudentSuccess}</div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Full name" required>
                  <input required value={studentForm.full_name} onChange={(e) => setStudentForm({ ...studentForm, full_name: e.target.value })} placeholder="Arjun Reddy" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" />
                </FormField>
                <FormField label="Student ID" required>
                  <input required value={studentForm.student_id} onChange={(e) => setStudentForm({ ...studentForm, student_id: e.target.value })} placeholder="AYUSH-STU-007" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" />
                </FormField>
                <FormField label="Email" required>
                  <input required type="email" value={studentForm.email} onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })} placeholder="student@ayush.com" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" />
                </FormField>
                <FormField label="Temporary password" required>
                  <input required type="password" minLength={8} maxLength={72} value={studentForm.password} onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })} placeholder="Minimum 8 characters" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" />
                </FormField>
                <FormField label="Degree">
                  <select value={studentForm.degree} onChange={(e) => setStudentForm({ ...studentForm, degree: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100">
                    <option>BAMS</option><option>BHMS</option><option>BSMS</option><option>BUMS</option><option>BNYS</option><option>Other AYUSH Degree</option>
                  </select>
                </FormField>
                <FormField label="Department / Specialization">
                  <input value={studentForm.department} onChange={(e) => setStudentForm({ ...studentForm, department: e.target.value })} placeholder="Kayachikitsa" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" />
                </FormField>
                <FormField label="Graduation year">
                  <input type="number" min={2020} max={2100} value={studentForm.graduation_year} onChange={(e) => setStudentForm({ ...studentForm, graduation_year: e.target.value })} placeholder="2027" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" />
                </FormField>
                <FormField label="CGPA (0–10)">
                  <input type="number" min={0} max={10} step="0.01" value={studentForm.cgpa} onChange={(e) => setStudentForm({ ...studentForm, cgpa: e.target.value })} placeholder="8.40" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" />
                </FormField>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                <strong className="text-slate-800">Security:</strong> the faculty cannot choose or change the institution in this form. The authenticated faculty account determines the institution on the server.
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button type="button" disabled={addingStudent} onClick={() => { setShowAddStudent(false); resetStudentForm(); }} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={addingStudent} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">
                  {addingStudent ? <RefreshCw size={17} className="animate-spin" /> : <Save size={17} />}
                  {addingStudent ? "Creating..." : "Create Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student detail modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-6">
              <div>
                <h2 className="text-xl font-bold">
                  {getStudentName(selectedStudent)}
                </h2>

                <p className="text-sm text-slate-500">
                  {selectedStudent.degree || "AYUSH Student"}{" "}
                  {selectedStudent.department
                    ? `• ${selectedStudent.department}`
                    : ""}
                </p>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="rounded-xl p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {studentLoading ? (
                <div className="py-12 text-center text-slate-500">
                  Loading student skills...
                </div>
              ) : studentSkills.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-8 text-center">
                  <BookOpen className="mx-auto mb-3 text-slate-400" />
                  <p className="font-medium">No skill records found</p>
                  <p className="mt-1 text-sm text-slate-500">
                    This student does not have available skill records yet.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {studentSkills.map((skill) => (
                    <div
                      key={skill.id}
                      className="rounded-2xl border border-slate-200 p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">
                            {getSkillName(skill)}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {skill.level || "Assessment level unavailable"}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {skill.ayush_system || "AYUSH"}{skill.category ? ` • ${skill.category}` : ""}
                          </p>
                        </div>

                        {skill.verified && (
                          <CheckCircle2
                            size={20}
                            className="text-emerald-600"
                          />
                        )}
                      </div>

                      <div className="mt-4">
                        <div className="mb-2 flex justify-between text-sm">
                          <span className="text-slate-500">Score</span>
                          <span className="font-bold">
                            {skill.score !== null && skill.score !== undefined ? `${getNumber(skill.score)}%` : "Not assessed"}
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(0, getNumber(skill.score)),
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Overview                                                                    */
/* -------------------------------------------------------------------------- */

function FacultyProfileSection({
  profile,
  form,
  loading,
  saving,
  message,
  error,
  setForm,
  onSubmit,
  onRefresh,
}: {
  profile: FacultyProfile | null;
  form: { employee_id: string; department: string; designation: string };
  loading: boolean;
  saving: boolean;
  message: string;
  error: string;
  setForm: (value: { employee_id: string; department: string; designation: string }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title="Faculty Profile" description="Manage your academic profile and institutional information connected to the AYUSH faculty database." />

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">{message}</div>}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading faculty profile...</div>
      ) : profile ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ProfileInfoCard label="Faculty" value={profile.full_name} />
            <ProfileInfoCard label="Email" value={profile.email} />
            <ProfileInfoCard label="Institution ID" value={`#${profile.institution_id}`} />
            <ProfileInfoCard label="Account Status" value={profile.is_verified ? "Verified" : "Verification Pending"} />
          </div>

          <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Academic identity</p>
                <h2 className="mt-1 text-xl font-bold">Professional Information</h2>
                <p className="mt-1 text-sm text-slate-500">These details are stored in PostgreSQL and associated with your faculty account.</p>
              </div>
              <button type="button" onClick={onRefresh} disabled={loading || saving} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
                <RefreshCw size={16} /> Refresh
              </button>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <ProfileInput label="Employee ID" value={form.employee_id} onChange={(value) => setForm({ ...form, employee_id: value })} placeholder="FAC-AYUSH-001" />
              <ProfileInput label="Department" value={form.department} onChange={(value) => setForm({ ...form, department: value })} placeholder="Ayurveda Clinical Sciences" />
              <ProfileInput label="Designation" value={form.designation} onChange={(value) => setForm({ ...form, designation: value })} placeholder="Assistant Professor" />
            </div>

            <div className="mt-6 flex justify-end">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                <Save size={17} /> {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        </>
      ) : (
        <EmptyState text="Faculty profile is not available." />
      )}
    </div>
  );
}

function ProfileInfoCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 truncate font-semibold text-slate-900">{value}</p></div>;
}

function ProfileInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={150} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100" /></label>;
}

function OverviewSection({
  stats,
  internships,
  assessments,
  onNavigate,
}: {
  stats: DashboardStats;
  internships: Internship[];
  assessments: Assessment[];
  onNavigate: (section: string) => void;
}) {
  const cards = [
    {
      title: "Students",
      value: stats.students,
      icon: Users,
      description: "Students available for monitoring",
    },
    {
      title: "Internships",
      value: stats.internships,
      icon: GraduationCap,
      description: "Mentorship records",
    },
    {
      title: "Assessed Skills",
      value: stats.assessments,
      icon: ClipboardCheck,
      description: "Student skill records with scores",
    },
    {
      title: "Verified Skills",
      value: stats.verifiedSkills,
      icon: ShieldCheck,
      description: "Verified student skills",
    },
    {
      title: "Average Skill Score",
      value: stats.averageSkillScore ? `${stats.averageSkillScore}%` : "—",
      icon: Target,
      description: "Average across students with assessed skills",
    },
    {
      title: "Active Internships",
      value: stats.activeInternships,
      icon: Activity,
      description: "Internships currently active or in progress",
    },
    {
      title: "Completed Internships",
      value: stats.completedInternships,
      icon: CheckCircle2,
      description: "Mentorship records marked completed",
    },
  ];

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
            Academician Workspace
          </p>

          <h2 className="mt-1 text-3xl font-bold tracking-tight">
            Student development at a glance
          </h2>

          <p className="mt-2 max-w-3xl text-slate-500">
            Track student skills, assessments, internships and industry-facing
            development from one AYUSH academic workspace.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                    <Icon size={22} />
                  </div>

                  <TrendingUp size={18} className="text-slate-300" />
                </div>

                <p className="mt-5 text-sm text-slate-500">{card.title}</p>

                <p className="mt-1 text-3xl font-bold">{card.value}</p>

                <p className="mt-2 text-xs text-slate-400">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">Mentorship Activity</h3>
              <p className="mt-1 text-sm text-slate-500">
                Current internship mentorship records
              </p>
            </div>

            <button
              onClick={() => onNavigate("internships")}
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              View all
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {internships.slice(0, 5).map((internship) => (
              <div
                key={internship.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 p-4"
              >
                <div>
                  <p className="font-medium">
                    {internship.title ||
                      internship.internship_title ||
                      "AYUSH Internship"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {internship.student_name ||
                      `Student ${internship.student_id ?? ""}`}
                  </p>
                </div>

                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {internship.status || "ACTIVE"}
                </span>
              </div>
            ))}

            {internships.length === 0 && (
              <EmptyState text="No internship mentorship records available." />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold">Assessment Activity</h3>
              <p className="mt-1 text-sm text-slate-500">
                Latest available assessment records
              </p>
            </div>

            <button
              onClick={() => onNavigate("assessments")}
              className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              View all
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {assessments.slice(0, 5).map((assessment) => (
              <div
                key={assessment.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 p-4"
              >
                <div>
                  <p className="font-medium">
                    {assessment.assessment_name ||
                      "AYUSH Assessment"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {assessment.student_name ||
                      `Student ${assessment.student_id ?? ""}`}
                  </p>
                </div>

                <span className="font-bold text-emerald-700">
                  {getNumber(assessment.percentage)}%
                </span>
              </div>
            ))}

            {assessments.length === 0 && (
              <EmptyState text="No assessment records available." />
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <QuickAction
          icon={Users}
          title="Monitor Students"
          description="Review student skill profiles and progress."
          onClick={() => onNavigate("students")}
        />

        <QuickAction
          icon={ShieldCheck}
          title="Verify Skills"
          description="Review skills requiring academic verification."
          onClick={() => onNavigate("verification")}
        />

        <QuickAction
          icon={MessageSquare}
          title="Industry Collaboration"
          description="Manage academic-industry engagement activities."
          onClick={() => onNavigate("collaboration")}
        />
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Student Skills                                                              */
/* -------------------------------------------------------------------------- */

function StudentSkillsSection({
  students,
  searchTerm,
  setSearchTerm,
  onSelect,
}: {
  students: Student[];
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  onSelect: (student: Student) => void;
  onAddStudent: () => void;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Skill Monitoring"
        description="Review AYUSH student profiles and their assessed skills."
      />

      <div className="relative max-w-xl">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search students..."
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 outline-none focus:border-emerald-500"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Degree</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">CGPA</th>
                <th className="px-6 py-4">Assessed / Total</th>
                <th className="px-6 py-4">Avg. Score</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="font-semibold">
                      {student.name ||
                        student.full_name ||
                        `Student ${student.id}`}
                    </div>

                    <div className="text-xs text-slate-500">
                      {student.email || "AYUSH Student"}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-sm">
                    {student.degree || "—"}
                  </td>

                  <td className="px-6 py-4 text-sm">
                    {student.department || "—"}
                  </td>

                  <td className="px-6 py-4 text-sm font-semibold">
                    {student.cgpa != null ? student.cgpa.toFixed(2) : "—"}
                  </td>

                  <td className="px-6 py-4 text-sm">
                    {getNumber(student.assessed_skills)} / {getNumber(student.total_skills)}
                  </td>

                  <td className="px-6 py-4 text-sm">
                    {student.average_score != null ? `${student.average_score.toFixed(1)}%` : "Not assessed"}
                  </td>

                  <td className="px-6 py-4">
                    <button
                      onClick={() => onSelect(student)}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      View Skills
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {students.length === 0 && (
          <div className="p-10">
            <EmptyState text="No students found." />
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Internships                                                                 */
/* -------------------------------------------------------------------------- */

function InternshipSection({
  internships,
}: {
  internships: Internship[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedInternship, setSelectedInternship] = useState<Internship | null>(null);
  const [detail, setDetail] = useState<Internship | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [editForm, setEditForm] = useState({
    progress_percentage: "0",
    tasks_completed: "0",
    total_tasks: "0",
    attendance_percentage: "0",
    mentor_notes: "",
    status: "IN_PROGRESS",
  });

  const normalizeStatus = (status?: string) =>
    String(status || "UNKNOWN").trim().toUpperCase();

  const statusLabel = (status?: string) =>
    String(status || "UNKNOWN").replaceAll("_", " ");

  const statusClasses = (status?: string) => {
    const normalized = normalizeStatus(status);
    if (["COMPLETED", "COMPLETE", "FINISHED"].includes(normalized)) {
      return "bg-emerald-50 text-emerald-700";
    }
    if (["ON_HOLD", "ON HOLD"].includes(normalized)) {
      return "bg-amber-50 text-amber-700";
    }
    if (["CANCELLED", "CANCELED"].includes(normalized)) {
      return "bg-red-50 text-red-700";
    }
    return "bg-blue-50 text-blue-700";
  };

  const formatDate = (value?: string) => {
    if (!value) return "Not specified";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const statuses = Array.from(
    new Set(internships.map((item) => normalizeStatus(item.status)).filter(Boolean)),
  ).sort();

  const filtered = internships.filter((internship) => {
    const query = search.trim().toLowerCase();
    const searchable = [
      internship.title,
      internship.internship_title,
      internship.student_name,
      internship.student_id,
      internship.mentor_name,
      internship.status,
    ]
      .filter((value) => value !== undefined && value !== null)
      .join(" ")
      .toLowerCase();

    return (
      (query === "" || searchable.includes(query)) &&
      (statusFilter === "ALL" || normalizeStatus(internship.status) === statusFilter)
    );
  });

  const activeCount = internships.filter((item) =>
    ["IN_PROGRESS", "ACTIVE", "ONGOING", "STARTED", "ENROLLED"].includes(
      normalizeStatus(item.status),
    ),
  ).length;
  const completedCount = internships.filter((item) =>
    ["COMPLETED", "COMPLETE", "FINISHED"].includes(normalizeStatus(item.status)),
  ).length;
  const averageProgress = internships.length
    ? Math.round(
        internships.reduce(
          (sum, item) => sum + Math.min(100, Math.max(0, getNumber(item.progress_percentage))),
          0,
        ) / internships.length,
      )
    : 0;

  const openDetails = async (internship: Internship) => {
    const progressId = getNumber((internship as any).progress_id ?? (internship as any).internship_progress_id ?? internship.id);
    if (!progressId) {
      setSelectedInternship(internship);
      setDetail(null);
      setDetailError("This mentorship record does not contain a valid progress ID.");
      return;
    }
    setSelectedInternship(internship);
    setDetail(null);
    setDetailError("");
    setSaveMessage("");
    setDetailLoading(true);

    try {
      const response = await api.get(`/api/faculty/mentorship/internship/${progressId}`);
      const record = response.data?.internship ?? response.data?.data ?? response.data;
      const merged = { ...internship, ...(record || {}) } as Internship;
      setDetail(merged);
      setEditForm({
        progress_percentage: String(getNumber(merged.progress_percentage)),
        tasks_completed: String(getNumber(merged.tasks_completed)),
        total_tasks: String(getNumber(merged.total_tasks)),
        attendance_percentage: String(getNumber(merged.attendance_percentage)),
        mentor_notes: merged.mentor_notes || "",
        status: normalizeStatus(merged.status || "IN_PROGRESS"),
      });
    } catch (err: any) {
      console.error("Unable to load internship mentorship details:", err);
      setDetailError(
        typeof err?.response?.data?.detail === "string"
          ? err.response.data.detail
          : "Unable to load mentorship details. Please refresh and try again.",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const saveProgress = async () => {
    if (!selectedInternship) return;

    const progress = Number(editForm.progress_percentage);
    const tasks = Number(editForm.tasks_completed);
    const totalTasks = Number(editForm.total_tasks);
    const attendance = Number(editForm.attendance_percentage);

    if (![progress, tasks, totalTasks, attendance].every(Number.isFinite)) {
      setDetailError("Please enter valid progress, task and attendance values.");
      return;
    }
    if (progress < 0 || progress > 100 || attendance < 0 || attendance > 100) {
      setDetailError("Progress and attendance must be between 0 and 100.");
      return;
    }
    if (tasks < 0 || totalTasks < 0 || tasks > totalTasks) {
      setDetailError("Completed tasks cannot exceed total tasks.");
      return;
    }

    setSaving(true);
    setDetailError("");
    setSaveMessage("");

    try {
      await api.patch(`/api/internship/${selectedInternship.id}`, {
        progress_percentage: progress,
        tasks_completed: tasks,
        total_tasks: totalTasks,
        attendance_percentage: attendance,
        mentor_notes: editForm.mentor_notes || null,
        status: editForm.status || null,
      });

      const response = await api.get(
        `/api/faculty/mentorship/internship/${getNumber((selectedInternship as any).progress_id ?? (selectedInternship as any).internship_progress_id ?? selectedInternship.id)}`,
      );
      const record = response.data?.internship ?? response.data?.data ?? response.data;
      const refreshed = { ...selectedInternship, ...(record || {}) } as Internship;
      setDetail(refreshed);
      setSaveMessage("Mentorship progress updated successfully.");
      setEditForm({
        progress_percentage: String(getNumber(refreshed.progress_percentage)),
        tasks_completed: String(getNumber(refreshed.tasks_completed)),
        total_tasks: String(getNumber(refreshed.total_tasks)),
        attendance_percentage: String(getNumber(refreshed.attendance_percentage)),
        mentor_notes: refreshed.mentor_notes || "",
        status: normalizeStatus(refreshed.status || "IN_PROGRESS"),
      });
    } catch (err: any) {
      console.error("Unable to update internship mentorship:", err);
      setDetailError(
        err?.response?.data?.detail ||
          "Unable to update mentorship progress. You can only update internships assigned to you.",
      );
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internship Mentorship"
        description="Monitor assigned AYUSH internships, review student progress and record mentor feedback."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniMetric label="Mentored Internships" value={String(internships.length)} />
        <MiniMetric label="Active" value={String(activeCount)} />
        <MiniMetric label="Completed" value={String(completedCount)} />
        <MiniMetric label="Average Progress" value={`${averageProgress}%`} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search internship, student, mentor or status..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={17} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-emerald-500"
            >
              <option value="ALL">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </div>

          {(search || statusFilter !== "ALL") && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Clear
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>{filtered.length} mentorship record{filtered.length === 1 ? "" : "s"}</span>
          <span className="font-medium text-emerald-700">Live PostgreSQL mentorship data</span>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {filtered.map((internship) => {
            const progress = Math.min(
              100,
              Math.max(0, getNumber(internship.progress_percentage)),
            );

            return (
              <div
                key={internship.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <BriefcaseBusiness size={18} className="shrink-0 text-emerald-600" />
                      <h3 className="truncate font-bold">
                        {internship.title || internship.internship_title || "AYUSH Internship"}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {internship.student_name || `Student ${internship.student_id ?? ""}`}
                    </p>
                  </div>

                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(internship.status)}`}>
                    {statusLabel(internship.status)}
                  </span>
                </div>

                <div className="mt-6">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-slate-500">Internship progress</span>
                    <span className="font-bold text-slate-800">{progress}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MiniMetric
                    label="Attendance"
                    value={
                      internship.attendance_percentage != null
                        ? `${internship.attendance_percentage}%`
                        : "—"
                    }
                  />
                  <MiniMetric
                    label="Tasks"
                    value={
                      internship.tasks_completed != null
                        ? `${internship.tasks_completed}/${internship.total_tasks ?? "—"}`
                        : "—"
                    }
                  />
                  <MiniMetric
                    label="Mentor"
                    value={internship.mentor_name || "Assigned"}
                  />
                  <MiniMetric label="Progress ID" value={`#${internship.id}`} />
                </div>

                <button
                  type="button"
                  onClick={() => openDetails(internship)}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <Eye size={16} />
                  View mentorship details
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          text={
            internships.length === 0
              ? "No internship mentorship records are currently assigned to this faculty account."
              : "No mentorship records match the selected filters."
          }
        />
      )}

      {selectedInternship && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setSelectedInternship(null);
              setDetail(null);
            }
          }}
        >
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-6">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                  Faculty mentorship record
                </p>
                <h2 className="mt-1 text-2xl font-bold">
                  {selectedInternship.title || selectedInternship.internship_title || "AYUSH Internship"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedInternship.student_name || `Student ${selectedInternship.student_id ?? ""}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!saving) {
                    setSelectedInternship(null);
                    setDetail(null);
                  }
                }}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                disabled={saving}
                aria-label="Close mentorship details"
              >
                <X size={20} />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-12 text-center text-slate-500">
                Loading mentorship details...
              </div>
            ) : detailError && !detail ? (
              <div className="p-6">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {detailError}
                </div>
              </div>
            ) : detail ? (
              <div className="space-y-6 p-6">
                {detailError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {detailError}
                  </div>
                )}
                {saveMessage && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                    {saveMessage}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <MiniMetric label="Start date" value={formatDate(detail.start_date)} />
                  <MiniMetric label="End date" value={formatDate(detail.end_date)} />
                  <MiniMetric label="Application" value={detail.application_id ? `#${detail.application_id}` : "—"} />
                  <MiniMetric label="Mentor" value={detail.mentor_name || "You"} />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Activity size={18} className="text-emerald-600" />
                      <h3 className="font-bold">Progress monitoring</h3>
                    </div>

                    <div className="space-y-4">
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-slate-700">Progress percentage</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={editForm.progress_percentage}
                          onChange={(event) => setEditForm({ ...editForm, progress_percentage: event.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        />
                      </label>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="mb-1.5 block text-sm font-semibold text-slate-700">Tasks completed</span>
                          <input
                            type="number"
                            min="0"
                            value={editForm.tasks_completed}
                            onChange={(event) => setEditForm({ ...editForm, tasks_completed: event.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block text-sm font-semibold text-slate-700">Total tasks</span>
                          <input
                            type="number"
                            min="0"
                            value={editForm.total_tasks}
                            onChange={(event) => setEditForm({ ...editForm, total_tasks: event.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                          />
                        </label>
                      </div>

                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-slate-700">Attendance percentage</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={editForm.attendance_percentage}
                          onChange={(event) => setEditForm({ ...editForm, attendance_percentage: event.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-slate-700">Internship status</span>
                        <select
                          value={editForm.status}
                          onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                        >
                          <option value="IN_PROGRESS">In progress</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="ON_HOLD">On hold</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <UsersRound size={18} className="text-emerald-600" />
                      <h3 className="font-bold">Mentor feedback</h3>
                    </div>

                    <p className="mb-3 text-xs text-slate-500">
                      This note is stored against the internship progress record and is visible to authorized participants.
                    </p>
                    <textarea
                      rows={10}
                      value={editForm.mentor_notes}
                      onChange={(event) => setEditForm({ ...editForm, mentor_notes: event.target.value })}
                      placeholder="Record observations, strengths, areas for improvement and guidance..."
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                    />

                    {detail.student_notes && (
                      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Student note</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{detail.student_notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setSelectedInternship(null);
                      setDetail(null);
                    }}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={saveProgress}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <CheckCircle2 size={17} />
                    {saving ? "Saving..." : "Save mentorship update"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Assessments                                                                 */
/* -------------------------------------------------------------------------- */

function AssessmentSection({
  assessments,
}: {
  assessments: Assessment[];
  stats: DashboardStats;
}) {
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("ALL");
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);

  const statusOf = (assessment: Assessment) =>
    assessment.passed === true
      ? "PASSED"
      : assessment.passed === false
        ? "FAILED"
        : String(assessment.status || "SUBMITTED").toUpperCase();

  const percentageOf = (assessment: Assessment) =>
    assessment.percentage != null
      ? getNumber(assessment.percentage)
      : getNumber(assessment.total_score);

  const formatDate = (value?: string) => {
    if (!value) return "Not available";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filtered = assessments
    .filter((assessment) => {
      const query = search.trim().toLowerCase();
      const searchable = [
        assessment.student_name,
        assessment.student_identifier,
        assessment.department,
        assessment.degree,
        assessment.assessment_name,
        assessment.assessment_type,
        statusOf(assessment),
        ...(assessment.skills || []).map((skill) => skill.skill_name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (query === "" || searchable.includes(query)) &&
        (resultFilter === "ALL" || statusOf(assessment) === resultFilter)
      );
    })
    .sort((a, b) => {
      const at = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
      const bt = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
      return bt - at;
    });

  const studentsAssessed = new Set(
    assessments
      .map((item) => item.student_id)
      .filter((id): id is number => typeof id === "number"),
  ).size;

  const passed = assessments.filter((item) => item.passed === true).length;
  const failed = assessments.filter((item) => item.passed === false).length;

  const average = assessments.length
    ? Number(
        (
          assessments.reduce((sum, item) => sum + percentageOf(item), 0) /
          assessments.length
        ).toFixed(1),
      )
    : 0;

  const latestAttemptByStudent = new Map<number, number>();
  [...assessments]
    .sort((a, b) => {
      const at = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
      const bt = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
      return bt - at;
    })
    .forEach((item) => {
      if (
        typeof item.student_id === "number" &&
        !latestAttemptByStudent.has(item.student_id)
      ) {
        latestAttemptByStudent.set(
          item.student_id,
          item.attempt_id ?? item.id,
        );
      }
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessment Monitoring"
        description="Monitor real submitted AYUSH assessment attempts from the faculty institution, including results, skill-level scores and complete assessment history."
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        <AnalyticsMetric title="Submitted Attempts" value={assessments.length} description="Completed assessment attempts" />
        <AnalyticsMetric title="Students Assessed" value={studentsAssessed} description="Students with submitted attempts" />
        <AnalyticsMetric title="Average Score" value={assessments.length ? `${average}%` : "—"} description="Average submitted percentage" />
        <AnalyticsMetric title="Passed" value={passed} description="Attempts meeting the passing score" />
        <AnalyticsMetric title="Failed" value={failed} description="Attempts below the passing score" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student, assessment, skill or department..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <select
            value={resultFilter}
            onChange={(event) => setResultFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none focus:border-emerald-500"
          >
            <option value="ALL">All results</option>
            <option value="PASSED">Passed</option>
            <option value="FAILED">Failed</option>
          </select>

          {(search || resultFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setResultFilter("ALL");
              }}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Clear
            </button>
          )}
        </div>

        <div className="mt-3 flex justify-between text-xs text-slate-500">
          <span>
            Showing {filtered.length} of {assessments.length} submitted attempts
          </span>
          <span>Live PostgreSQL results</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Assessment</th>
                <th className="px-6 py-4">Skills</th>
                <th className="px-6 py-4">Score</th>
                <th className="px-6 py-4">Result</th>
                <th className="px-6 py-4">Submitted</th>
                <th className="px-6 py-4">Details</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.map((assessment) => {
                const status = statusOf(assessment);
                const latest =
                  typeof assessment.student_id === "number" &&
                  latestAttemptByStudent.get(assessment.student_id) ===
                    (assessment.attempt_id ?? assessment.id);

                return (
                  <tr
                    key={assessment.attempt_id ?? assessment.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold">
                        {assessment.student_name ||
                          `Student ${assessment.student_id ?? ""}`}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {assessment.student_identifier ||
                          assessment.degree ||
                          "AYUSH Student"}
                      </p>
                      {latest && (
                        <span className="mt-2 inline-flex rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                          Latest attempt
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <p className="max-w-[280px] font-medium">
                        {assessment.assessment_name || "AYUSH Assessment"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {assessment.assessment_type || "SKILL"} • v
                        {assessment.version ?? "—"}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex max-w-[260px] flex-wrap gap-1.5">
                        {(assessment.skills || []).slice(0, 3).map((skill) => (
                          <span
                            key={`${assessment.attempt_id}-${skill.skill_id}`}
                            className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                          >
                            {skill.skill_name || `Skill ${skill.skill_id}`}
                          </span>
                        ))}
                        {(assessment.skills || []).length > 3 && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            +{(assessment.skills || []).length - 3} more
                          </span>
                        )}
                        {(assessment.skills || []).length === 0 && (
                          <span className="text-xs text-slate-400">
                            No skill breakdown
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-lg font-bold">
                        {percentageOf(assessment)}%
                      </p>
                      <p className="text-xs text-slate-500">
                        Total: {assessment.total_score ?? "—"}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          status === "PASSED"
                            ? "bg-emerald-100 text-emerald-700"
                            : status === "FAILED"
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(assessment.submitted_at)}
                    </td>

                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedAssessment(assessment)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <Eye size={15} />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-10">
            <EmptyState
              text={
                assessments.length
                  ? "No assessment attempts match the current filters."
                  : "No submitted assessment attempts are currently available for this faculty institution."
              }
            />
          </div>
        )}
      </div>

      {selectedAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                  Assessment attempt #{selectedAssessment.attempt_id ?? selectedAssessment.id}
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  {selectedAssessment.assessment_name || "AYUSH Assessment"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedAssessment.student_name || "AYUSH Student"}
                  {selectedAssessment.student_identifier
                    ? ` • ${selectedAssessment.student_identifier}`
                    : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAssessment(null)}
                className="rounded-xl p-2 hover:bg-slate-100"
                aria-label="Close assessment details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MiniMetric label="Percentage" value={`${percentageOf(selectedAssessment)}%`} />
                <MiniMetric label="Total score" value={selectedAssessment.total_score != null ? String(selectedAssessment.total_score) : "—"} />
                <MiniMetric label="Result" value={statusOf(selectedAssessment)} />
                <MiniMetric label="Version" value={`v${selectedAssessment.version ?? "—"}`} />
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Academic profile</p>
                    <p className="mt-1 font-semibold">
                      {selectedAssessment.degree || "AYUSH"}
                      {selectedAssessment.department ? ` • ${selectedAssessment.department}` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">CGPA</p>
                    <p className="mt-1 font-semibold">
                      {selectedAssessment.cgpa != null ? selectedAssessment.cgpa.toFixed(2) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Submitted</p>
                    <p className="mt-1 font-semibold">{formatDate(selectedAssessment.submitted_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Assessment type</p>
                    <p className="mt-1 font-semibold">{selectedAssessment.assessment_type || "SKILL"}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold">Skill-level results</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Competency evidence recorded for this submitted attempt.
                </p>

                <div className="mt-4 space-y-3">
                  {(selectedAssessment.skills || []).map((skill) => (
                    <div
                      key={`${selectedAssessment.attempt_id}-${skill.skill_id}`}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold">
                            {skill.skill_name || `Skill ${skill.skill_id}`}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Competency level {skill.level_id ?? "—"}
                            {skill.verified ? " • Verified" : ""}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-emerald-700">
                          {skill.score != null
                            ? `${getNumber(skill.score)}%`
                            : "—"}
                        </p>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, getNumber(skill.score)),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  {(selectedAssessment.skills || []).length === 0 && (
                    <EmptyState text="No skill-level result breakdown was returned for this attempt." />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Verification                                                                */
/* -------------------------------------------------------------------------- */

function getArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  for (const key of ["queue", "items", "results", "data", "history"]) {
    if (Array.isArray(data[key])) return data[key];
  }
  return [];
}

function VerificationSection({ students, studentSkillMap, onVerify }: {
  students: Student[];
  studentSkillMap: Record<number, StudentSkill[]>;
  onVerify: (studentId: number, skillId: number) => void;
}) {
  const [queue, setQueue] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedHistory, setSelectedHistory] = useState<any | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const studentName = (student: Student) => student.name || student.full_name || `Student ${student.id}`;
  const skillName = (item: any) => item.skill_name || item.name || item.skill?.name || `Skill ${item.skill_id ?? item.id ?? ""}`;
  const getStatus = (item: any) => {
    const value = String(item.verification_status ?? item.status ?? (item.verified === true ? "VERIFIED" : "PENDING")).toUpperCase();
    if (["VERIFIED", "APPROVED", "COMPLETED"].includes(value)) return "VERIFIED";
    if (["REJECTED", "DENIED"].includes(value)) return "REJECTED";
    return "PENDING";
  };

  const loadVerification = async () => {
    setLoading(true); setError("");
    try {
      const [q, h] = await Promise.all([
        api.get("/api/skill-verification/faculty/queue"),
        api.get("/api/skill-verification/faculty/history"),
      ]);
      setQueue((getArray(q.data) || []).filter((item: any) => item && typeof item === "object"));
      setHistory((getArray(h.data) || []).filter((item: any) => item && typeof item === "object"));
    } catch (err: any) {
      console.error("Verification load failed:", err);
      setError(err?.response?.data?.detail || "Unable to load verification data.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadVerification(); }, []);

  const fallbackRows = students.flatMap((student) =>
    (studentSkillMap[student.id] || [])
      .filter((skill) => skill.score !== null && skill.score !== undefined)
      .map((skill) => ({ ...skill, student_id: student.id, student_name: studentName(student) })),
  );
  const rows = queue.length ? queue : fallbackRows;
  const filtered = rows.filter((item) => {
    const text = [item.student_name, item.student?.full_name, item.student?.name, skillName(item), item.department, item.degree, item.verification_source, item.evidence_reference].filter(Boolean).join(" ").toLowerCase();
    return text.includes(search.toLowerCase()) && (statusFilter === "ALL" || getStatus(item) === statusFilter);
  });
  const pending = rows.filter((x) => getStatus(x) === "PENDING").length;
  const verified = rows.filter((x) => getStatus(x) === "VERIFIED").length;
  const rejected = rows.filter((x) => getStatus(x) === "REJECTED").length;

  const verify = async (studentId: number, skillId: number) => {
    setActionId(`${studentId}-${skillId}`); setMessage(""); setError("");
    try {
      await onVerify(studentId, skillId);
      setMessage("Skill verified successfully.");
      await loadVerification();
    } catch (err) { setError("Unable to verify the selected skill."); }
    finally { setActionId(null); }
  };

  const badge = (status: string) => status === "VERIFIED" ? "bg-emerald-100 text-emerald-700" : status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";

  return (
    <div className="space-y-6">
      <PageHeader title="Skill Verification" description="Review assessed AYUSH skills and maintain faculty verification records." />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <AnalyticsMetric title="Queue" value={rows.length} description="Verification records" />
        <AnalyticsMetric title="Pending" value={pending} description="Awaiting review" />
        <AnalyticsMetric title="Verified" value={verified} description="Verified skills" />
        <AnalyticsMetric title="Rejected" value={rejected} description="Rejected records" />
      </div>
      {(message || error) && <div className={`rounded-2xl border p-4 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error || message}</div>}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student, skill, department or evidence..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-emerald-500" /></div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm"><option value="ALL">All statuses</option><option value="PENDING">Pending</option><option value="VERIFIED">Verified</option><option value="REJECTED">Rejected</option></select>
          <button type="button" onClick={() => void loadVerification()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh</button>
        </div>
        <div className="mt-3 flex justify-between text-xs text-slate-500"><span>Showing {filtered.length} of {rows.length}</span><span>Live PostgreSQL verification workflow</span></div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto"><table className="w-full min-w-[1000px]"><thead className="bg-slate-50"><tr className="text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-6 py-4">Student</th><th className="px-6 py-4">Skill</th><th className="px-6 py-4">Score</th><th className="px-6 py-4">Level</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Evidence</th><th className="px-6 py-4">Action</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{filtered.map((item, i) => { const sid=Number(item.student_id ?? item.student?.id ?? 0); const kid=Number(item.skill_id ?? item.skill?.id ?? 0); const st=getStatus(item); const id=`${sid}-${kid}`; return <tr key={`${id}-${item.id ?? i}`} className="hover:bg-slate-50"><td className="px-6 py-4"><p className="font-semibold">{item.student_name || item.student?.full_name || item.student?.name || `Student ${sid}`}</p><p className="text-xs text-slate-500">{item.department || item.degree || "AYUSH Student"}</p></td><td className="px-6 py-4"><p className="font-medium">{skillName(item)}</p><p className="text-xs text-slate-500">{item.ayush_system || "AYUSH"}</p></td><td className="px-6 py-4 font-bold text-emerald-700">{item.score == null ? "—" : `${getNumber(item.score)}%`}</td><td className="px-6 py-4 text-sm">{item.level || item.skill_level || "—"}</td><td className="px-6 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge(st)}`}>{st}</span></td><td className="px-6 py-4"><p className="max-w-xs truncate text-sm">{item.evidence_reference || item.verification_source || item.source || "No evidence reference"}</p></td><td className="px-6 py-4">{st === "VERIFIED" ? <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16}/>Verified</span> : <button type="button" disabled={!sid || !kid || actionId === id} onClick={() => void verify(sid,kid)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{actionId===id ? "Verifying..." : "Verify skill"}</button>}</td></tr>; })}</tbody></table></div>
        {!loading && filtered.length === 0 && <div className="p-8 text-sm text-slate-500">No verification records match the current filters.</div>}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-6 py-5"><div><h3 className="font-bold">Verification History</h3><p className="mt-1 text-sm text-slate-500">Previous faculty verification activity returned by the backend.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{history.length} records</span></div><div className="divide-y divide-slate-100">{history.slice(0,10).map((item,i)=><button type="button" key={item.id ?? i} onClick={()=>setSelectedHistory(item)} className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left hover:bg-slate-50"><div><p className="font-semibold">{item.student_name || item.student?.full_name || item.student?.name || `Student ${item.student_id ?? ""}`}</p><p className="text-sm text-slate-500">{skillName(item)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge(getStatus(item))}`}>{getStatus(item)}</span></button>)}{history.length===0&&<p className="px-6 py-8 text-sm text-slate-500">No verification history returned.</p>}</div></section>
      {selectedHistory&&<div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b px-6 py-5"><h3 className="text-xl font-bold">Verification Record</h3><button type="button" onClick={()=>setSelectedHistory(null)} className="rounded-xl p-2 hover:bg-slate-100"><X size={20}/></button></div><div className="space-y-4 p-6"><div><p className="text-xs text-slate-400">Student</p><p className="font-semibold">{selectedHistory.student_name || selectedHistory.student?.full_name || selectedHistory.student?.name || selectedHistory.student_id}</p></div><div><p className="text-xs text-slate-400">Skill</p><p className="font-semibold">{skillName(selectedHistory)}</p></div><div><p className="text-xs text-slate-400">Score</p><p className="font-semibold">{selectedHistory.score == null ? "—" : `${getNumber(selectedHistory.score)}%`}</p></div><div><p className="text-xs text-slate-400">Source</p><p>{selectedHistory.verification_source || selectedHistory.source || "—"}</p></div><div><p className="text-xs text-slate-400">Notes</p><p className="text-sm leading-6">{selectedHistory.verification_notes || selectedHistory.notes || "No notes returned."}</p></div></div></div></div>}
    </div>
  );
}

function CollaborationSection({
  collaborations,
  guestLectures,
  innovationChallenges,
  consultancies,
  partnerships,
  onRefresh,
}: {
  collaborations: CollaborationItem[];
  guestLectures: CollaborationItem[];
  innovationChallenges: CollaborationItem[];
  consultancies: CollaborationItem[];
  partnerships: CollaborationItem[];
  onRefresh: () => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selectedItem, setSelectedItem] = useState<{
    item: CollaborationItem;
    type: string;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const activityGroups = [
    {
      key: "GUEST_LECTURE",
      icon: MessageSquare,
      title: "Guest Lectures",
      items: guestLectures,
      description: "Industry-led sessions connected to AYUSH academic programs.",
    },
    {
      key: "INNOVATION_CHALLENGE",
      icon: Target,
      title: "Innovation Challenges",
      items: innovationChallenges,
      description: "Practical AYUSH problems opened by industry partners.",
    },
    {
      key: "CONSULTANCY",
      icon: BookOpen,
      title: "Consultancies",
      items: consultancies,
      description: "Faculty expertise connected with industry consultancy needs.",
    },
    {
      key: "PARTNERSHIP",
      icon: GraduationCap,
      title: "Partnerships",
      items: partnerships,
      description: "Industry-academia partnership activity recorded in the platform.",
    },
    {
      key: "PROPOSAL",
      icon: Building2,
      title: "Collaboration Proposals",
      items: collaborations,
      description: "Collaboration proposals recorded between industry and academia.",
    },
  ];

  const allActivities = activityGroups.flatMap((group) =>
    group.items.map((item) => ({
      item,
      type: group.key,
      typeLabel: group.title,
    })),
  );

  const normalize = (value?: string) =>
    String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_");

  const statuses = Array.from(
    new Set(
      allActivities
        .map(({ item }) => normalize(item.status))
        .filter(Boolean),
    ),
  ).sort();

  const filteredActivities = allActivities.filter(({ item, type, typeLabel }) => {
    const query = search.trim().toLowerCase();

    const searchable = [
      item.title,
      item.topic,
      item.description,
      item.collaboration_type,
      item.agreement_type,
      item.mode,
      item.status,
      typeLabel,
      type,
      item.industry_id ? `industry ${item.industry_id}` : "",
      item.institution_id ? `institution ${item.institution_id}` : "",
      item.faculty_id ? `faculty ${item.faculty_id}` : "",
    ]
      .filter((value) => value !== undefined && value !== null && String(value).trim() !== "")
      .join(" ")
      .toLowerCase();

    const matchesSearch = query === "" || searchable.includes(query);
    const matchesStatus =
      statusFilter === "ALL" || normalize(item.status) === statusFilter;
    const matchesType =
      typeFilter === "ALL" || type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleRefresh = async () => {
    if (refreshing) return;

    setRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error("Unable to refresh collaboration data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
  };

  const formatDate = (value?: string) => {
    if (!value) return "Not specified";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const hasTime = value.includes("T");

    return date.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...(hasTime
        ? {
            hour: "2-digit",
            minute: "2-digit",
          }
        : {}),
    });
  };

  const getDateValue = (item: CollaborationItem, type: string) => {
    if (type === "GUEST_LECTURE") return item.scheduled_at;
    if (type === "INNOVATION_CHALLENGE") return item.deadline;
    return item.start_date;
  };

  const getDateLabel = (item: CollaborationItem, type: string) => {
    if (type === "GUEST_LECTURE") {
      return item.scheduled_at ? "Scheduled" : "Schedule not specified";
    }

    if (type === "INNOVATION_CHALLENGE") {
      return item.deadline ? "Deadline" : "Deadline not specified";
    }

    if (type === "CONSULTANCY" || type === "PARTNERSHIP") {
      return item.start_date ? "Start date" : "Start date not specified";
    }

    return item.start_date ? "Start date" : "Start date not specified";
  };

  const statusClass = (status?: string) => {
    const normalized = normalize(status);

    if (["ACTIVE", "OPEN", "PLANNED", "ONGOING", "IN_PROGRESS"].includes(normalized)) {
      return "bg-emerald-100 text-emerald-700";
    }

    if (["PROPOSED", "PENDING", "PENDING_REVIEW", "REVIEW", "DRAFT"].includes(normalized)) {
      return "bg-amber-100 text-amber-700";
    }

    if (["COMPLETED", "CLOSED", "FINISHED", "CANCELLED", "REJECTED"].includes(normalized)) {
      return "bg-slate-200 text-slate-700";
    }

    return "bg-blue-100 text-blue-700";
  };

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (statusFilter !== "ALL" ? 1 : 0) +
    (typeFilter !== "ALL" ? 1 : 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Industry Collaboration"
        description="Monitor live AYUSH industry-academia collaboration activity. All records are loaded from the PostgreSQL-backed collaboration APIs."
      />

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search collaboration activities..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Filter
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="min-w-[190px] cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-10 text-sm font-medium outline-none transition hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="ALL">All types</option>
                {activityGroups.map((group) => (
                  <option key={group.key} value={group.key}>
                    {group.title}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="min-w-[155px] cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-3 pr-10 text-sm font-medium outline-none transition hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="ALL">All statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex min-w-[112px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Clear ({activeFilterCount})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {activityGroups.map((group) => {
          const Icon = group.icon;
          const active = typeFilter === group.key;

          return (
            <button
              type="button"
              key={group.key}
              onClick={() =>
                setTypeFilter((current) =>
                  current === group.key ? "ALL" : group.key,
                )
              }
              className={`cursor-pointer rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                active
                  ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-100"
                  : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Icon size={21} />
                </div>
                <span className="text-3xl font-bold text-slate-900">
                  {group.items.length}
                </span>
              </div>

              <h3 className="mt-4 font-bold text-slate-900">{group.title}</h3>
              <p className="mt-2 text-sm leading-5 text-slate-500">
                {group.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Results */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Collaboration Activity</h3>
            <p className="mt-1 text-sm text-slate-500">
              Showing {filteredActivities.length} of {allActivities.length} collaboration records.
            </p>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {typeFilter === "ALL"
              ? "All types"
              : activityGroups.find((group) => group.key === typeFilter)?.title}
            {" • "}
            {statusFilter === "ALL" ? "All statuses" : statusFilter.replace(/_/g, " ")}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px]">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-6 py-4">Activity</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date / Deadline</th>
                <th className="px-6 py-4">Industry / Faculty</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredActivities.map(({ item, type, typeLabel }) => {
                const dateValue = getDateValue(item, type);

                return (
                  <tr key={`${type}-${item.id}`} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">
                        {item.title || "Untitled activity"}
                      </p>
                      <p className="mt-1 max-w-sm truncate text-xs text-slate-500">
                        {item.topic ||
                          item.description ||
                          "No additional description available."}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {typeLabel}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                          item.status,
                        )}`}
                      >
                        {item.status
                          ? item.status.replace(/_/g, " ")
                          : "NOT SPECIFIED"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm">
                      <p className="font-medium text-slate-700">
                        {dateValue ? formatDate(dateValue) : "Not specified"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {getDateLabel(item, type)}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-sm">
                      <p className="text-slate-700">
                        {item.industry_id
                          ? `Industry #${item.industry_id}`
                          : "Industry not specified"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {item.faculty_id
                          ? `Faculty #${item.faculty_id}`
                          : "Faculty not assigned"}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedItem({ item, type })}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        <Eye size={15} />
                        View details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredActivities.length === 0 && (
          <div className="p-10">
            <EmptyState text="No collaboration records match the current search and filters." />
          </div>
        )}
      </div>

      {/* Details modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedItem(null);
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-6">
              <div className="pr-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                  {activityGroups.find(
                    (group) => group.key === selectedItem.type,
                  )?.title || "Collaboration"}
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  {selectedItem.item.title || "Untitled activity"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="cursor-pointer rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                    selectedItem.item.status,
                  )}`}
                >
                  {selectedItem.item.status
                    ? selectedItem.item.status.replace(/_/g, " ")
                    : "NOT SPECIFIED"}
                </span>

                {selectedItem.item.verified !== undefined && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      selectedItem.item.verified
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {selectedItem.item.verified
                      ? "Verified"
                      : "Verification pending"}
                  </span>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField
                  label="Record ID"
                  value={String(selectedItem.item.id)}
                />
                <DetailField
                  label="Industry ID"
                  value={
                    selectedItem.item.industry_id
                      ? String(selectedItem.item.industry_id)
                      : "Not specified"
                  }
                />
                <DetailField
                  label="Institution ID"
                  value={
                    selectedItem.item.institution_id
                      ? String(selectedItem.item.institution_id)
                      : "Not specified"
                  }
                />
                <DetailField
                  label="Faculty ID"
                  value={
                    selectedItem.item.faculty_id
                      ? String(selectedItem.item.faculty_id)
                      : "Not assigned"
                  }
                />

                {selectedItem.item.collaboration_type && (
                  <DetailField
                    label="Collaboration type"
                    value={selectedItem.item.collaboration_type}
                  />
                )}

                {selectedItem.item.agreement_type && (
                  <DetailField
                    label="Agreement type"
                    value={selectedItem.item.agreement_type}
                  />
                )}

                {selectedItem.item.mode && (
                  <DetailField
                    label="Mode"
                    value={selectedItem.item.mode}
                  />
                )}

                {selectedItem.item.scheduled_at && (
                  <DetailField
                    label="Scheduled at"
                    value={formatDate(selectedItem.item.scheduled_at)}
                  />
                )}

                {selectedItem.item.deadline && (
                  <DetailField
                    label="Deadline"
                    value={formatDate(selectedItem.item.deadline)}
                  />
                )}

                {selectedItem.item.start_date && (
                  <DetailField
                    label="Start date"
                    value={formatDate(selectedItem.item.start_date)}
                  />
                )}

                {selectedItem.item.end_date && (
                  <DetailField
                    label="End date"
                    value={formatDate(selectedItem.item.end_date)}
                  />
                )}
              </div>

              {selectedItem.item.topic && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Topic
                  </p>
                  <p className="mt-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    {selectedItem.item.topic}
                  </p>
                </div>
              )}

              {selectedItem.item.description && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Description
                  </p>
                  <p className="mt-2 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    {selectedItem.item.description}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-100 p-6">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="cursor-pointer rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
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

function FormField({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}{required ? <span className="text-red-500"> *</span> : ""}</span>
      {children}
    </label>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Faculty Analytics                                                           */
/* -------------------------------------------------------------------------- */

function AnalyticsSection({ skillDemandData, emergingSkillsData, trainingRequirementsData }: { skillDemandData: SkillDemandItem[]; emergingSkillsData: EmergingSkill[]; trainingRequirementsData: TrainingRequirement[] }) {
  const demandedSkills = skillDemandData.filter((item) => getNumber(item.demand_count) > 0);
  const totalDemand = demandedSkills.reduce((sum, item) => sum + getNumber(item.demand_count), 0);
  const totalIndustryGap = demandedSkills.reduce((sum, item) => sum + getNumber(item.industry_skill_gap_count ?? item.skill_gap_count), 0);
  const totalBelowRequired = demandedSkills.reduce((sum, item) => sum + getNumber(item.students_below_required_count ?? item.skill_gap_count), 0);
  const totalNotAssessed = demandedSkills.reduce((sum, item) => sum + getNumber(item.students_not_assessed_count), 0);
  const criticalTraining = trainingRequirementsData.filter((item) => String(item.training_priority || '').toUpperCase() === 'CRITICAL').length;
  const highTraining = trainingRequirementsData.filter((item) => String(item.training_priority || '').toUpperCase() === 'HIGH').length;
  const topDemand = [...demandedSkills].sort((a,b) => getNumber(b.demand_score)-getNumber(a.demand_score)).slice(0,8);
  const highestGap = [...demandedSkills].sort((a,b) => getNumber(b.gap_percentage)-getNumber(a.gap_percentage)).slice(0,8);
  const topEmerging = emergingSkillsData.slice(0,8);
  const topTraining = trainingRequirementsData.slice(0,8);
  const maxDemand = Math.max(...topDemand.map((x) => getNumber(x.demand_count)), 1);
  return (<div className="space-y-6">
    <PageHeader title="Industry Skill Intelligence" description="Convert live industry requirements into actionable academic insight. Demand, student supply, skill gaps and training priorities are calculated from backend data." />
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <AnalyticsMetric title="Skills With Demand" value={demandedSkills.length} description="AYUSH skills currently required by open industry opportunities" />
      <AnalyticsMetric title="Demand Signals" value={totalDemand} description="Open job and internship skill requirements" />
      <AnalyticsMetric title="Industry Skill Gaps" value={totalIndustryGap} description="Student requirement mismatches detected against industry needs" />
      <AnalyticsMetric title="Training Priorities" value={`${criticalTraining} critical / ${highTraining} high`} description={`${trainingRequirementsData.length} current or forecast-based academic priorities`} />
    </div>
    <div className="grid gap-5 md:grid-cols-3">
      <InsightCard icon={BriefcaseBusiness} title="Job Demand" value={demandedSkills.reduce((s,i)=>s+getNumber(i.job_demand_count),0)} description="Required skill signals from open jobs" />
      <InsightCard icon={Activity} title="Internship Demand" value={demandedSkills.reduce((s,i)=>s+getNumber(i.internship_demand_count),0)} description="Required skill signals from internships" />
      <InsightCard icon={AlertTriangle} title="Students Below Requirement" value={totalBelowRequired} description="Assessed students below industry-required competency" />
    </div>
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5"><div className="flex gap-3"><BarChart3 className="mt-0.5 text-blue-700" /><div><h3 className="font-semibold text-blue-900">How this analysis is generated</h3><p className="mt-1 text-sm leading-6 text-blue-800">Industry demand is calculated from open internships and jobs, their required skills and competency levels. Student supply comes from assessed student skills. The industry gap identifies students who are below the required competency, while unassessed students are tracked separately. Training priorities additionally use the platform forecast engine.</p></div></div></div>
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center justify-between"><div><h3 className="font-bold">Top Industry-Demanded Skills</h3><p className="mt-1 text-sm text-slate-500">Ranked by the backend demand score.</p></div><TrendingUp className="text-emerald-600" size={20}/></div><div className="mt-5 space-y-5">
        {topDemand.map((item)=><div key={item.skill_id ?? item.skill_name}><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{item.skill_name || item.name || 'AYUSH Skill'}</p><p className="text-xs text-slate-400">{item.ayush_system || 'AYUSH'}{item.category ? ` • ${item.category}` : ''}</p></div><div className="shrink-0 text-right"><p className="font-bold text-emerald-700">{getNumber(item.demand_count)} demand</p><p className="text-xs text-slate-400">Supply {getNumber(item.student_supply_count)} • Gap {getNumber(item.industry_skill_gap_count ?? item.skill_gap_count)}</p></div></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{width:`${Math.min(getNumber(item.demand_count)/maxDemand*100,100)}%`}}/></div><div className="mt-2 flex justify-between text-xs text-slate-400"><span>{getNumber(item.job_demand_count)} jobs • {getNumber(item.internship_demand_count)} internships</span><span>{getNumber(item.gap_percentage).toFixed(1)}% gap</span></div></div>)}
        {topDemand.length===0 && <EmptyState text="No current industry skill-demand records are available."/>}
      </div></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center justify-between"><div><h3 className="font-bold">Highest Skill Gaps</h3><p className="mt-1 text-sm text-slate-500">Academic intervention areas where industry requirements exceed current student capability.</p></div><AlertTriangle className="text-orange-500" size={20}/></div><div className="mt-5 space-y-4">
        {highestGap.map((item)=>{const pct=Math.min(Math.max(getNumber(item.gap_percentage),0),100); return <div key={`gap-${item.skill_id ?? item.skill_name}`}><div className="flex items-center justify-between gap-3"><div><p className="font-semibold">{item.skill_name || item.name || 'AYUSH Skill'}</p><p className="text-xs text-slate-400">{getNumber(item.industry_skill_gap_count ?? item.skill_gap_count)} students below requirement</p></div><span className="font-bold text-orange-600">{pct.toFixed(1)}%</span></div><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange-400" style={{width:`${pct}%`}}/></div></div>})}
        {highestGap.length===0 && <EmptyState text="No industry skill gaps are currently available."/>}
      </div></div>
    </div>
    <div className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center justify-between"><div><h3 className="font-bold">Emerging Skills</h3><p className="mt-1 text-sm text-slate-500">Skills identified by the backend demand and trend engine.</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">{topEmerging.length} shown</span></div><div className="mt-5 grid gap-3 md:grid-cols-2">{topEmerging.map((item)=><div key={item.skill_id ?? item.skill_name} className="flex items-center justify-between rounded-xl bg-slate-50 p-4"><div><p className="font-semibold">{item.skill_name || item.name || 'AYUSH Skill'}</p><p className="mt-1 text-xs text-slate-500">Demand {getNumber(item.demand_count)} • Industries {getNumber(item.industry_count)}</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">{item.trend || 'EMERGING'}</span></div>)}{topEmerging.length===0 && <div className="md:col-span-2"><EmptyState text="No emerging skills are currently returned by the backend."/></div>}</div></div>
    <div className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center justify-between"><div><h3 className="font-bold">Training Requirements</h3><p className="mt-1 text-sm text-slate-500">Faculty priorities generated from current gaps and future demand.</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{trainingRequirementsData.length} priorities</span></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[900px]"><thead className="bg-slate-50"><tr className="text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-4 py-3">Skill</th><th className="px-4 py-3">Current Gap</th><th className="px-4 py-3">Future Gap</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Forecast</th><th className="px-4 py-3">Why Training?</th></tr></thead><tbody className="divide-y divide-slate-100">{topTraining.map((item)=><tr key={item.skill_id ?? item.skill_name}><td className="px-4 py-4 font-semibold">{item.skill_name || item.name || 'AYUSH Skill'}</td><td className="px-4 py-4">{getNumber(item.skill_gap_count)}</td><td className="px-4 py-4">{getNumber(item.predicted_future_skill_gap)}</td><td className="px-4 py-4"><PriorityBadge value={item.training_priority || 'NONE'}/></td><td className="px-4 py-4 text-sm">{item.forecast_trend || 'STABLE'}<span className="ml-2 text-xs text-slate-400">{getNumber(item.forecast_confidence_score)}%</span></td><td className="max-w-sm px-4 py-4 text-sm text-slate-500">{item.training_recommendation_reason || 'Training is recommended based on current or forecasted skill shortage.'}</td></tr>)}</tbody></table></div>{topTraining.length===0 && <div className="mt-5"><EmptyState text="No training requirements are currently returned by the backend."/></div>}</div>
    <div className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center gap-3"><UsersRound className="text-slate-500" size={20}/><div><h3 className="font-bold">Supply Readiness Context</h3><p className="text-sm text-slate-500">Students without assessment evidence are kept separate from confirmed skill gaps.</p></div></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><MiniMetric label="Students below required competency" value={String(totalBelowRequired)}/><MiniMetric label="Students not assessed" value={String(totalNotAssessed)}/></div></div>
  </div>);
}

function InsightCard({icon: Icon,title,value,description}:{icon:any;title:string;value:string|number;description:string}) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="rounded-xl bg-slate-100 p-3 text-slate-700"><Icon size={20}/></div><span className="text-xs font-medium text-slate-400">Live data</span></div><p className="mt-4 text-sm text-slate-500">{title}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-2 text-xs leading-5 text-slate-400">{description}</p></div>; }

function AnalyticsMetric({ title, value, description }: { title: string; value: string | number; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{description}</p>
    </div>
  );
}

function PriorityBadge({ value }: { value: string }) {
  const priority = value.toUpperCase();
  const className =
    priority === "CRITICAL"
      ? "bg-red-100 text-red-700"
      : priority === "HIGH"
        ? "bg-orange-100 text-orange-700"
        : priority === "MEDIUM"
          ? "bg-amber-100 text-amber-700"
          : "bg-slate-100 text-slate-600";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{priority}</span>;
}

/* -------------------------------------------------------------------------- */
/* Reusable UI                                                                 */
/* -------------------------------------------------------------------------- */

function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
        Faculty Portal
      </p>

      <h2 className="mt-1 text-3xl font-bold tracking-tight">{title}</h2>

      <p className="mt-2 max-w-3xl text-slate-500">{description}</p>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: any;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-slate-200 bg-white p-6 text-left transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        <Icon size={21} />
      </div>

      <h3 className="mt-4 font-bold">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </button>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}

function getNumber(value: any, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}