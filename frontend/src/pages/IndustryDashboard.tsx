import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FilePlus2,
  GraduationCap,
  LayoutDashboard,
  MapPin,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  Users,
  UsersRound,
  X,
  TrendingUp,
  Brain,
  AlertTriangle,
  ClipboardCheck,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

type OpportunityTab = "INTERNSHIP" | "JOB";

interface Application {
  id: number;
  student_id?: number;
  student_name?: string;
  opportunity_title?: string;
  internship_id?: number | null;
  job_id?: number | null;
  status: string;
  recruitment_score?: number;
  skill_match_percentage?: number;
  assessment_coverage_percentage?: number;
  eligibility_status?: string;
  applied_at?: string;
  match?: any;
}
interface VerifiedSkill {
  id?: number;
  skill_id?: number;
  skill_name?: string;
  category?: string;
  ayush_system?: string;
  score?: number;
  level?: string;

  verification?: {
    source?: string;
    verified_at?: string;
    notes?: string;
    verified_by?: {
      user_id?: number;
      name?: string;
      role?: string;
    };
  };
}

interface Collaboration {
  id: number;
  title?: string;
  name?: string;
  status?: string;
  type?: string;
}

interface Internship {
  id: number;
  title: string;
  description?: string;
  eligibility?: string;
  location?: string;
  duration?: string;
  stipend?: number;
  application_deadline?: string;
  status?: string;
  verified?: boolean;
}

interface Job {
  id: number;
  title: string;
  description?: string;
  eligibility?: string;
  location?: string;
  employment_type?: string;
  salary_min?: number;
  salary_max?: number;
  application_deadline?: string;
  status?: string;
  verified?: boolean;
}

interface RequiredSkill {
  id?: number;
  skill_id: number;
  skill_name?: string;
  required_score?: number;
  importance_weight?: number;
}

interface SkillOption {
  id: number;
  name: string;
  category?: string;
}

interface ForecastItem {
  skill_id?: number;
  skill_name?: string;
  current_demand?: number;
  predicted_demand?: number;
  predicted_supply?: number;
  future_gap?: number;
  shortage?: number;
  confidence?: number;
}

interface IndustrySkillDemand {
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

const getArray = (value: any): any[] => {
  if (Array.isArray(value)) {
    return value;
  }

  const possibleKeys = [
    "items",
    "data",
    "results",
    "skills",
    "required_skills",
    "applications",
    "internships",
    "jobs",
    "collaborations",
    "proposals",
    "guest_lectures",
    "innovation_challenges",
    "consultancies",
    "partnerships",
    "forecast",
    "forecasts",
  ];

  for (const key of possibleKeys) {
    if (Array.isArray(value?.[key])) {
      return value[key];
    }
  }

  return [];
};

const getNumber = (
  value: unknown,
  fallback = 0,
): number => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
};

const formatDate = (value?: string) => {
  if (!value) {
    return "Not specified";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not specified";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusClasses = (status?: string) => {
  const normalized = String(
    status ?? "",
  ).toUpperCase();

  if (
    normalized === "SELECTED" ||
    normalized === "COMPLETED" ||
    normalized === "OPEN"
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (
    normalized === "SHORTLISTED" ||
    normalized === "UNDER_REVIEW" ||
    normalized === "INTERVIEW_SCHEDULED"
  ) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  if (
    normalized === "REJECTED" ||
    normalized === "CLOSED"
  ) {
    return "bg-red-50 text-red-700 border-red-200";
  }

  return "bg-slate-50 text-slate-600 border-slate-200";
};

const statusLabel = (status?: string) => {
  if (!status) {
    return "Unknown";
  }

  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
};
const canMoveToStatus = (
  currentStatus: string | undefined,
  nextStatus: string,
) => {
  const status = String(
    currentStatus ?? "",
  ).toUpperCase();

  const allowedTransitions: Record<
    string,
    string[]
  > = {
    APPLIED: [
      "UNDER_REVIEW",
      "REJECTED",
    ],
    UNDER_REVIEW: [
      "SHORTLISTED",
      "REJECTED",
    ],
    SHORTLISTED: [
      "INTERVIEW_SCHEDULED",
      "REJECTED",
    ],
    INTERVIEW_SCHEDULED: [
      "SELECTED",
      "REJECTED",
    ],
    SELECTED: [],
    REJECTED: [],
  };

  return (
    allowedTransitions[status] ?? []
  ).includes(nextStatus);
};

export default function IndustryDashboard() {
  const [activeSection, setActiveSection] =
  useState<
    | "dashboard"
    | "opportunities"
    | "candidates"
    | "skill-demand"
    | "ml-intelligence"
    | "collaboration"
    | "analytics"
  >("dashboard");
  const handleSectionChange = (
  section:
    | "dashboard"
    | "opportunities"
    | "candidates"
    | "skill-demand"
    | "ml-intelligence"
    | "collaboration"
    | "analytics",
) => {
  setActiveSection(section);

  if (section === "dashboard") {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    return;
  }

  const element = document.getElementById(section);

  if (element) {
    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
};
  const { user } = useAuth();

  const [applications, setApplications] =
    useState<Application[]>([]);

  const [collaborations, setCollaborations] =
    useState<Collaboration[]>([]);

  const [internships, setInternships] =
    useState<Internship[]>([]);

  const [jobs, setJobs] =
    useState<Job[]>([]);

  const [selectedOpportunity, setSelectedOpportunity] =
    useState<{
      type: OpportunityTab;
      id: number;
      title: string;
    } | null>(null);

  const [requiredSkills, setRequiredSkills] =
    useState<RequiredSkill[]>([]);

  const [selectedApplication, setSelectedApplication] =
    useState<Application | null>(null);

  const [verifiedSkills, setVerifiedSkills] =
    useState<VerifiedSkill[]>([]);
const [candidatePortfolio, setCandidatePortfolio] =
  useState<any>(null);
  const [forecastData, setForecastData] =
    useState<ForecastItem[]>([]);

  const [skillDemandData, setSkillDemandData] =
    useState<IndustrySkillDemand[]>([]);

  const [emergingSkillsData, setEmergingSkillsData] =
    useState<any[]>([]);

  const [trainingRequirementsData, setTrainingRequirementsData] =
    useState<any[]>([]);

  const [search, setSearch] = useState("");

  const [skillSearch, setSkillSearch] =
    useState("");

  const [availableSkills, setAvailableSkills] =
    useState<SkillOption[]>([]);

  const [, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [skillsLoading, setSkillsLoading] =
    useState(false);

  const [skillSaving, setSkillSaving] =
    useState(false);

  const [skillError, setSkillError] =
    useState("");

  const [updatingApplication, setUpdatingApplication] =
    useState(false);

  const [applicationActionError, setApplicationActionError] =
    useState("");

  const [mobileMenu, setMobileMenu] =
    useState(false);

  const [error, setError] =
    useState("");

  const [opportunityTab, setOpportunityTab] =
    useState<OpportunityTab>("INTERNSHIP");

  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [createError, setCreateError] =
    useState("");

  const [createSuccess, setCreateSuccess] =
    useState("");

  const [skillForm, setSkillForm] = useState({
    skill_id: "",
    required_score: "60",
    importance_weight: "1",
  });

  const [internshipForm, setInternshipForm] =
    useState({
      title: "",
      description: "",
      eligibility: "",
      location: "India",
      duration: "",
      stipend: "",
      application_deadline: "",
    });

  const [jobForm, setJobForm] =
    useState({
      title: "",
      description: "",
      eligibility: "",
      location: "India",
      employment_type: "Full-time",
      salary_min: "",
      salary_max: "",
      application_deadline: "",
    });

 const loadDashboard = async (
  silent = false,
) => {
  try {
    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    const results =
      await Promise.allSettled([
        api.get(
          "/api/industry/applications/my",
        ),
        api.get(
          "/api/industry/opportunities/internships/my",
        ),
        api.get(
          "/api/industry/jobs/my",
        ),
        api.get(
          "/api/collaboration/proposals",
        ),
        api.get(
          "/api/collaboration/guest-lectures",
        ),
        api.get(
          "/api/collaboration/innovation-challenges",
        ),
        api.get(
          "/api/collaboration/consultancies",
        ),
        api.get(
          "/api/collaboration/partnerships",
        ),
        api.get(
          "/api/analytics/skill-forecast",
        ),
        api.get(
          "/api/analytics/skill-demand",
        ),
        api.get(
          "/api/analytics/emerging-skills",
        ),
        api.get(
          "/api/analytics/training-requirements",
        ),
      ]);

    const [
      applicationsResult,
      internshipsResult,
      jobsResult,
      proposalsResult,
      lecturesResult,
      challengesResult,
      consultanciesResult,
      partnershipsResult,
      forecastResult,
      skillDemandResult,
      emergingSkillsResult,
      trainingRequirementsResult,
    ] = results;

    /* =========================
       APPLICATIONS
       ========================= */

    if (
      applicationsResult.status ===
      "fulfilled"
    ) {
      const rawApplications =
        getArray(
          applicationsResult.value.data,
        );

      const normalizedApplications: Application[] =
        rawApplications.map(
          (application: any) => {
            const match =
              application.match ?? {};

            return {
              ...application,

              id:
                application.id ??
                application.application_id,

              student_id:
                application.student_id,

              student_name:
                application.student_name ??
                "Unknown Candidate",

              opportunity_title:
                application.opportunity_title ??
                "AYUSH Opportunity",

              internship_id:
                application.internship_id ??
                (
                  application.opportunity_type ===
                  "INTERNSHIP"
                    ? application.opportunity_id
                    : null
                ),

              job_id:
                application.job_id ??
                (
                  application.opportunity_type ===
                  "JOB"
                    ? application.opportunity_id
                    : null
                ),

              status:
                application.status ??
                "APPLIED",

              recruitment_score:
                application.recruitment_score ??
                match.recruitment_score ??
                match.overall_match_percentage ??
                0,

              skill_match_percentage:
                application.skill_match_percentage ??
                match.skill_match_percentage ??
                match.overall_match_percentage ??
                0,

              assessment_coverage_percentage:
                application.assessment_coverage_percentage ??
                match.assessment_coverage_percentage ??
                0,

              eligibility_status:
                application.eligibility_status ??
                (
                  match.eligible === true
                    ? "ELIGIBLE"
                    : match.eligible === false
                      ? "NOT_ELIGIBLE"
                      : "EVALUATED"
                ),

              applied_at:
                application.applied_at,

              match: {
                ...match,

                overall_match_percentage:
                  match.overall_match_percentage ??
                  0,

                assessed_skill_match_percentage:
                  match.assessed_skill_match_percentage ??
                  match.overall_match_percentage ??
                  0,

                assessment_coverage_percentage:
                  match.assessment_coverage_percentage ??
                  0,

                eligible:
                  match.eligible ??
                  false,

                eligibility_reason:
                  match.eligibility_reason ??
                  "Eligibility was evaluated against the opportunity requirements.",

                total_required_skill_count:
                  match.total_required_skill_count ??
                  0,

                assessed_skill_count:
                  match.assessed_skill_count ??
                  0,

                matched_skill_count:
                  match.matched_skill_count ??
                  0,

                skill_gap_count:
                  match.skill_gap_count ??
                  0,

                not_assessed_skill_count:
                  match.not_assessed_skill_count ??
                  0,

                matched_skills:
                  getArray(
                    match.matched_skills,
                  ),

                skill_gaps:
                  getArray(
                    match.skill_gaps,
                  ),

                not_assessed_skills:
                  getArray(
                    match.not_assessed_skills,
                  ),

                skills:
                  getArray(
                    match.skills,
                  ),
              },
            };
          },
        );

      setApplications(
        normalizedApplications,
      );
    }

    /* =========================
       INTERNSHIPS
       ========================= */

    if (
      internshipsResult.status ===
      "fulfilled"
    ) {
      setInternships(
        getArray(
          internshipsResult.value.data,
        ),
      );
    }

    /* =========================
       JOBS
       ========================= */

    if (
      jobsResult.status ===
      "fulfilled"
    ) {
      setJobs(
        getArray(
          jobsResult.value.data,
        ),
      );
    }

    /* =========================
       COLLABORATION
       ========================= */

    const collaborationItems: Collaboration[] =
      [];

    const addCollaborations = (
      result: PromiseSettledResult<any>,
      type: string,
    ) => {
      if (
        result.status !==
        "fulfilled"
      ) {
        return;
      }

      const items = getArray(
        result.value.data,
      );

      collaborationItems.push(
        ...items.map(
          (item: any) => ({
            ...item,
            type,
          }),
        ),
      );
    };

    addCollaborations(
      proposalsResult,
      "PROPOSAL",
    );

    addCollaborations(
      lecturesResult,
      "GUEST_LECTURE",
    );

    addCollaborations(
      challengesResult,
      "INNOVATION_CHALLENGE",
    );

    addCollaborations(
      consultanciesResult,
      "CONSULTANCY",
    );

    addCollaborations(
      partnershipsResult,
      "PARTNERSHIP",
    );

    setCollaborations(
      collaborationItems,
    );

    /* =========================
       FORECAST
       ========================= */

    if (
      forecastResult.status ===
      "fulfilled"
    ) {
      setForecastData(
        getArray(
          forecastResult.value.data,
        ),
      );
    }

    /* =========================
       SKILL DEMAND
       ========================= */

    if (
      skillDemandResult.status ===
      "fulfilled"
    ) {
      setSkillDemandData(
        getArray(
          skillDemandResult.value.data,
        ),
      );
    }

    /* =========================
       EMERGING SKILLS
       ========================= */

    if (
      emergingSkillsResult.status ===
      "fulfilled"
    ) {
      setEmergingSkillsData(
        getArray(
          emergingSkillsResult.value.data,
        ),
      );
    }

    /* =========================
       TRAINING REQUIREMENTS
       ========================= */

    if (
      trainingRequirementsResult.status ===
      "fulfilled"
    ) {
      setTrainingRequirementsData(
        getArray(
          trainingRequirementsResult.value.data,
        ),
      );
    }
  } catch (err) {
    console.error(
      "Unable to load industry dashboard:",
      err,
    );

    setError(
      "Unable to load some dashboard information.",
    );
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};
  useEffect(() => {
    loadDashboard();
  }, []);

  const filteredApplications =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      if (!query) {
        return applications;
      }

      return applications.filter(
        (application) =>
          String(
            application.student_name ?? "",
          )
            .toLowerCase()
            .includes(query) ||
          String(
            application.opportunity_title ??
              "",
          )
            .toLowerCase()
            .includes(query) ||
          String(
            application.status ?? "",
          )
            .toLowerCase()
            .includes(query),
      );
    }, [applications, search]);

  const totalCandidates =
    applications.length;

  const shortlisted =
    applications.filter(
      (application) =>
        String(
          application.status,
        ).toUpperCase() ===
        "SHORTLISTED",
    ).length;

  const selected =
    applications.filter(
      (application) =>
        String(
          application.status,
        ).toUpperCase() ===
        "SELECTED",
    ).length;

  const averageMatch =
  applications.length > 0
    ? applications.reduce(
        (
          total,
          application,
        ) =>
          total +
          getNumber(
            application.skill_match_percentage ??
              application.recruitment_score,
          ),
        0,
      ) / applications.length
    : 0;

  const openInternships =
    internships.filter(
      (item) =>
        String(
          item.status,
        ).toUpperCase() ===
        "OPEN",
    ).length;

  const openJobs =
    jobs.filter(
      (item) =>
        String(
          item.status,
        ).toUpperCase() ===
        "OPEN",
    ).length;

  const selectedOpportunitySkills =
    requiredSkills;

  /*
   * Eligibility is evaluated independently for every applicant.
   * This lets the dashboard show all candidates' real eligibility and
   * skill gaps instead of waiting for one candidate to be selected.
   */
  const getCandidateEvaluation = (application: Application) => {
    const match = application?.match ?? {};
    const skills = getArray(match.skills);

    const getSkillScore = (skill: any) => {
      const raw =
        skill?.current_score ??
        skill?.student_score ??
        skill?.score;

      if (raw === null || raw === undefined || raw === "") {
        return null;
      }

      const score = Number(raw);
      return Number.isFinite(score) ? score : null;
    };

    const getRequiredScore = (skill: any) => {
      const raw =
        skill?.required_score ??
        skill?.minimum_score;

      const score = Number(raw);
      return Number.isFinite(score) ? score : 0;
    };

    const derivedGaps = skills.filter((skill: any) => {
      const candidateScore = getSkillScore(skill);
      const requiredScore = getRequiredScore(skill);

      return (
        candidateScore !== null &&
        candidateScore < requiredScore
      );
    });

    const derivedMatched = skills.filter((skill: any) => {
      const candidateScore = getSkillScore(skill);
      const requiredScore = getRequiredScore(skill);

      return (
        candidateScore !== null &&
        candidateScore >= requiredScore
      );
    });

    const derivedUnassessed = skills.filter(
      (skill: any) => getSkillScore(skill) === null,
    );

    const totalRequired = getNumber(
      match.total_required_skill_count,
      skills.length,
    );

    const matchedCount = getNumber(
      match.matched_skill_count,
      derivedMatched.length,
    );

    const gapCount = getNumber(
      match.skill_gap_count,
      getArray(match.skill_gaps).length ||
        derivedGaps.length,
    );

    const assessedCount = getNumber(
      match.assessed_skill_count,
      Math.max(
        skills.length - derivedUnassessed.length,
        0,
      ),
    );

    const notAssessedCount = getNumber(
      match.not_assessed_skill_count,
      derivedUnassessed.length,
    );

    const backendCoverage = Number(
      match.assessment_coverage_percentage,
    );

    const assessmentCoverage =
      Number.isFinite(backendCoverage)
        ? backendCoverage
        : totalRequired > 0
          ? (assessedCount / totalRequired) * 100
          : 0;

    const backendEligible =
      typeof match.eligible === "boolean"
        ? match.eligible
        : null;

    const eligible =
      backendEligible !== null
        ? backendEligible
        : totalRequired > 0 &&
          gapCount === 0 &&
          notAssessedCount === 0;

    const skillGaps =
      getArray(match.skill_gaps).length > 0
        ? getArray(match.skill_gaps)
        : derivedGaps;

    return {
      eligible,
      totalRequired,
      matchedCount,
      gapCount,
      assessedCount,
      notAssessedCount,
      assessmentCoverage,
      skillGaps,
      skills,
      reason:
        match.eligibility_reason ??
        "Eligibility was evaluated against the opportunity requirements.",
    };
  };

  const loadRequiredSkills = async (
    type: OpportunityTab,
    id: number,
  ) => {
    try {
      setSkillsLoading(true);
      setSkillError("");
      setRequiredSkills([]);

      const endpoint =
        type === "INTERNSHIP"
          ? `/api/industry/opportunities/internships/${id}/skills`
          : `/api/industry/opportunities/jobs/${id}/skills`;

      const response =
        await api.get(endpoint);

      const skills =
        getArray(response.data);

      setRequiredSkills(
        skills.map(
          (skill: any) => ({
            id: skill.id,
            skill_id: Number(
              skill.skill_id ??
                skill.skill?.id ??
                skill.id,
            ),
            skill_name:
              skill.skill_name ??
              skill.skill?.name ??
              skill.name,
            required_score:
              skill.required_score ??
              skill.minimum_score ??
              60,
            importance_weight:
              skill.importance_weight ??
              skill.weight ??
              1,
          }),
        ),
      );
    } catch (err: any) {
      console.error(
        "Unable to load required skills:",
        err,
      );

      setRequiredSkills([]);

      const detail =
        err?.response?.data?.detail;

      setSkillError(
        detail
          ? String(detail)
          : "Unable to load required skills.",
      );
    } finally {
      setSkillsLoading(false);
    }
  };

  const loadAvailableSkills =
    async () => {
      try {
        const response =
          await api.get(
            "/api/skills",
          );

        const skills =
          getArray(response.data).map(
            (skill: any) => ({
              id: Number(
                skill.id ??
                  skill.skill_id,
              ),

              name:
                skill.name ??
                skill.skill_name ??
                `Skill #${
                  skill.id ??
                  skill.skill_id
                }`,

              category:
                skill.category ??
                skill.skill_category,
            }),
          );

        setAvailableSkills(
          skills.filter(
            (skill: SkillOption) =>
              Number.isFinite(
                skill.id,
              ),
          ),
        );
      } catch (err) {
        console.error(
          "Unable to load available skills:",
          err,
        );

        setAvailableSkills([]);

        setSkillError(
          "Unable to load available skills.",
        );
      }
    };

  const openRequiredSkills =
    async (
      type: OpportunityTab,
      id: number,
      title: string,
    ) => {
      setSelectedOpportunity({
        type,
        id,
        title,
      });

      setRequiredSkills([]);

      setSkillForm({
        skill_id: "",
        required_score: "60",
        importance_weight: "1",
      });

      setSkillSearch("");
      setSkillError("");

      await Promise.all([
        loadRequiredSkills(
          type,
          id,
        ),

        loadAvailableSkills(),
      ]);
    };

  const addRequiredSkill =
    async () => {
      if (!selectedOpportunity) {
        return;
      }

      if (!skillForm.skill_id) {
        setSkillError(
          "Select an AYUSH skill.",
        );

        return;
      }

      const requiredScore =
        Number(
          skillForm.required_score,
        );

      const importanceWeight =
        Number(
          skillForm.importance_weight,
        );

      if (
        !Number.isFinite(
          requiredScore,
        ) ||
        requiredScore < 0 ||
        requiredScore > 100
      ) {
        setSkillError(
          "Required score must be between 0 and 100.",
        );

        return;
      }

      if (
        !Number.isFinite(
          importanceWeight,
        ) ||
        importanceWeight <= 0
      ) {
        setSkillError(
          "Importance weight must be greater than 0.",
        );

        return;
      }

      try {
        setSkillSaving(true);
        setSkillError("");

        const endpoint =
          selectedOpportunity.type ===
          "INTERNSHIP"
            ? `/api/industry/opportunities/internships/${selectedOpportunity.id}/skills`
            : `/api/industry/opportunities/jobs/${selectedOpportunity.id}/skills`;

        await api.post(
          endpoint,
          {
            skill_id:
              Number(
                skillForm.skill_id,
              ),

            required_score:
              requiredScore,

            importance_weight:
              importanceWeight,
          },
        );

        setSkillForm({
          skill_id: "",
          required_score: "60",
          importance_weight: "1",
        });

        await loadRequiredSkills(
          selectedOpportunity.type,
          selectedOpportunity.id,
        );
      } catch (err: any) {
        console.error(
          "Unable to add required skill:",
          err,
        );

        setSkillError(
          err?.response?.data
            ?.detail ||
            "Unable to add required skill.",
        );
      } finally {
        setSkillSaving(false);
      }
    };const viewVerifiedSkills = async (
  application: Application,
) => {
  try {
    setVerifiedSkills([]);
    setCandidatePortfolio(null);
    setApplicationActionError("");

    // The application from /industry/applications/my
    // already contains the complete match/eligibility data.
    setSelectedApplication(application);

    const [verifiedSkillsResponse, portfolioResponse] =
      await Promise.all([
        api.get(
          `/api/industry/applications/${application.id}/verified-skills`,
        ),
        api.get(
          `/api/portfolio/${application.student_id}`,
        ),
      ]);

    setVerifiedSkills(
      getArray(
        verifiedSkillsResponse.data,
      ),
    );

    setCandidatePortfolio(
      portfolioResponse.data,
    );
  } catch (err: any) {
    console.error(
      "Unable to load candidate details:",
      err,
    );

    setApplicationActionError(
      err?.response?.data?.detail ||
        "Unable to load candidate details.",
    );
  }
};
const updateApplicationStatus = async (
  application: Application,
  status: string,
) => {
  const currentStatus = String(
    application.status ?? "",
  ).toUpperCase();

  const allowedTransitions: Record<string, string[]> = {
    APPLIED: [
      "UNDER_REVIEW",
      "REJECTED",
    ],
    UNDER_REVIEW: [
      "SHORTLISTED",
      "REJECTED",
    ],
    SHORTLISTED: [
      "INTERVIEW_SCHEDULED",
      "REJECTED",
    ],
    INTERVIEW_SCHEDULED: [
      "SELECTED",
      "REJECTED",
    ],
    SELECTED: [],
    REJECTED: [],
  };

  const allowedStatuses =
    allowedTransitions[currentStatus] ?? [];

  if (!allowedStatuses.includes(status)) {
    setApplicationActionError(
      currentStatus === "SELECTED"
        ? "This candidate has already been selected. No further recruitment actions are available."
        : currentStatus === "REJECTED"
          ? "This application has already been rejected. No further recruitment actions are available."
          : `This action is not available from the current status: ${statusLabel(
              currentStatus,
            )}.`,
    );
    return;
  }

  try {
    setUpdatingApplication(true);
    setApplicationActionError("");

    await api.patch(
      `/api/applications/${application.id}/status`,
      { status },
    );

    setApplications((current) =>
      current.map((item) =>
        item.id === application.id
          ? { ...item, status }
          : item,
      ),
    );

    setSelectedApplication((current) =>
      current
        ? { ...current, status }
        : current,
    );
  } catch (err: any) {
    console.error(
      "Unable to update application status:",
      err,
    );

    setApplicationActionError(
      err?.response?.data?.detail ||
        "Unable to update application status.",
    );
  } finally {
    setUpdatingApplication(false);
  }
};
  const createInternship =
    async () => {
      try {
        setCreating(true);
        setCreateError("");
        setCreateSuccess("");

        if (
          !internshipForm.title.trim()
        ) {
          throw new Error(
            "Internship title is required.",
          );
        }

        if (
          !internshipForm.application_deadline
        ) {
          throw new Error(
            "Application deadline is required.",
          );
        }

        const deadline =
          new Date(
            internshipForm.application_deadline,
          );

        if (
          Number.isNaN(
            deadline.getTime(),
          ) ||
          deadline <= new Date()
        ) {
          throw new Error(
            "Application deadline must be in the future.",
          );
        }

        await api.post(
          "/api/industry/opportunities/internships",
          {
            title:
              internshipForm.title.trim(),

            description:
              internshipForm.description.trim(),

            eligibility:
              internshipForm.eligibility.trim(),

            location:
              internshipForm.location.trim(),

            duration:
              internshipForm.duration.trim(),

            stipend:
              internshipForm.stipend
                ? Number(
                    internshipForm.stipend,
                  )
                : null,

            application_deadline:
              deadline.toISOString(),
          },
        );

        setCreateSuccess(
          "Internship created successfully.",
        );

        setInternshipForm({
          title: "",
          description: "",
          eligibility: "",
          location: "India",
          duration: "",
          stipend: "",
          application_deadline: "",
        });

        await loadDashboard(
          true,
        );
      } catch (err: any) {
        console.error(
          "Unable to create internship:",
          err,
        );

        setCreateError(
          err?.response?.data
            ?.detail ||
            err?.message ||
            "Unable to create internship.",
        );
      } finally {
        setCreating(false);
      }
    };

  const createJob = async () => {
    try {
      setCreating(true);
      setCreateError("");
      setCreateSuccess("");

      if (!jobForm.title.trim()) {
        throw new Error(
          "Job title is required.",
        );
      }

      if (
        !jobForm.application_deadline
      ) {
        throw new Error(
          "Application deadline is required.",
        );
      }

      const deadline =
        new Date(
          jobForm.application_deadline,
        );

      if (
        Number.isNaN(
          deadline.getTime(),
        ) ||
        deadline <= new Date()
      ) {
        throw new Error(
          "Application deadline must be in the future.",
        );
      }

      await api.post(
        "/api/industry/jobs",
        {
          title:
            jobForm.title.trim(),

          description:
            jobForm.description.trim(),

          eligibility:
            jobForm.eligibility.trim(),

          location:
            jobForm.location.trim(),

          employment_type:
            jobForm.employment_type.trim(),

          salary_min:
            jobForm.salary_min
              ? Number(
                  jobForm.salary_min,
                )
              : null,

          salary_max:
            jobForm.salary_max
              ? Number(
                  jobForm.salary_max,
                )
              : null,

          application_deadline:
            deadline.toISOString(),
        },
      );

      setCreateSuccess(
        "Job created successfully.",
      );

      setJobForm({
        title: "",
        description: "",
        eligibility: "",
        location: "India",
        employment_type:
          "Full-time",
        salary_min: "",
        salary_max: "",
        application_deadline: "",
      });

      await loadDashboard(
        true,
      );
    } catch (err: any) {
      console.error(
        "Unable to create job:",
        err,
      );

      setCreateError(
        err?.response?.data
          ?.detail ||
          err?.message ||
          "Unable to create job.",
      );
    } finally {
      setCreating(false);
    }
  };

  const runAutomaticShortlist =
    async () => {
      if (!selectedOpportunity) {
        return;
      }

      try {
        setUpdatingApplication(
          true,
        );

        setApplicationActionError(
          "",
        );

        const endpoint =
          selectedOpportunity.type ===
          "INTERNSHIP"
            ? "internship"
            : "job";

        const response =
          await api.post(
            `/api/industry/recruitment/shortlist/${endpoint}/${selectedOpportunity.id}`,
          );

        const shortlistedApplications =
          getArray(
            response.data?.shortlist ??
              response.data,
          );

        if (
          shortlistedApplications.length >
          0
        ) {
          setApplications(
            (current) =>
              current.map(
                (application) => {
                  const match =
                    shortlistedApplications.find(
                      (item: any) =>
                        Number(
                          item.application_id ??
                            item.id,
                        ) ===
                        application.id,
                    );

                  if (!match) {
                    return application;
                  }

                  return {
                    ...application,

                    status:
                      "SHORTLISTED",

                    recruitment_score:
                      getNumber(
                        match.recruitment_score,
                        application.recruitment_score,
                      ),

                    skill_match_percentage:
                      getNumber(
                        match.skill_match_percentage,
                        application.skill_match_percentage,
                      ),

                    assessment_coverage_percentage:
                      getNumber(
                        match.assessment_coverage_percentage,
                        application.assessment_coverage_percentage,
                      ),
                  };
                },
              ),
          );
        }

        setApplicationActionError(
          `Automatic ranking completed. ${shortlistedApplications.length} candidate(s) shortlisted.`,
        );
      } catch (err: any) {
        console.error(
          "Automatic shortlist failed:",
          err,
        );

        setApplicationActionError(
          err?.response?.data
            ?.detail ||
            "Automatic shortlist could not be completed.",
        );
      } finally {
        setUpdatingApplication(
          false,
        );
      }
    };

  const displayedOpportunities =
    opportunityTab ===
    "INTERNSHIP"
      ? internships
      : jobs;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* MOBILE MENU */}

      {mobileMenu && (
        <div className="fixed inset-0 z-50 bg-black/30 lg:hidden">
          <div className="h-full w-80 bg-white p-6 shadow-xl">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                  AYUSH Platform
                </p>

                <h2 className="text-lg font-bold">
                  Industry Portal
                </h2>
              </div>

              <button
                onClick={() =>
                  setMobileMenu(
                    false,
                  )
                }
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="space-y-2">
              <SidebarItem
  icon={<LayoutDashboard size={18} />}
  label="Dashboard"
  active={activeSection === "dashboard"}
  onClick={() => handleSectionChange("dashboard")}
/>

              <SidebarItem
  icon={<BriefcaseBusiness size={18} />}
  label="Opportunities"
  active={activeSection === "opportunities"}
onClick={() => handleSectionChange("opportunities")}/>
<SidebarItem
  icon={<Users size={18} />}
  label="Candidates"
  active={activeSection === "candidates"}
  onClick={() => handleSectionChange ("candidates")}
/>
<SidebarItem
  icon={<Target size={18} />}
  label="Skill Demand"
  active={activeSection === "skill-demand"}
  onClick={() => handleSectionChange("skill-demand")}
/>
<SidebarItem
  icon={<Brain size={18} />}
  label="ML Intelligence"
  active={activeSection === "ml-intelligence"}
  onClick={() => handleSectionChange("ml-intelligence")}
/>
<SidebarItem
  icon={<Building2 size={18} />}
  label="Collaboration"
  active={activeSection === "collaboration"}
  onClick={() => handleSectionChange("collaboration")}
/>
<SidebarItem
  icon={<BarChart3 size={18} />}
  label="Analytics"
  active={activeSection === "analytics"}
  onClick={() => handleSectionChange("analytics")}
/>
            </nav>
          </div>
        </div>
      )}
{/* DESKTOP SIDEBAR */}

<aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-slate-200 bg-white lg:block">
  <div className="flex h-full flex-col">
    <div className="border-b border-slate-200 p-6">
      <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">
        AYUSH
      </p>

      <h1 className="mt-1 text-xl font-bold">
        Industry Portal
      </h1>

      <p className="mt-1 text-xs text-slate-500">
        Academia–Industry Skill Mapping
      </p>
    </div>

    <nav className="flex-1 space-y-1 p-4">

      <SidebarItem
        icon={<LayoutDashboard size={18} />}
        label="Dashboard"
        active={activeSection === "dashboard"}
        onClick={() => setActiveSection("dashboard")}
      />

      <SidebarItem
        icon={<BriefcaseBusiness size={18} />}
        label="Opportunities"
        active={activeSection === "opportunities"}
        onClick={() => setActiveSection("opportunities")}
      />

      <SidebarItem
        icon={<Users size={18} />}
        label="Candidates"
        active={activeSection === "candidates"}
        onClick={() => setActiveSection("candidates")}
      />

      <SidebarItem
        icon={<Target size={18} />}
        label="Skill Demand"
        active={activeSection === "skill-demand"}
        onClick={() => setActiveSection("skill-demand")}
      />

      <SidebarItem
        icon={<Brain size={18} />}
        label="ML Intelligence"
        active={activeSection === "ml-intelligence"}
        onClick={() => setActiveSection("ml-intelligence")}
      />

      <SidebarItem
        icon={<Building2 size={18} />}
        label="Collaboration"
        active={activeSection === "collaboration"}
        onClick={() => setActiveSection("collaboration")}
      />

      <SidebarItem
        icon={<BarChart3 size={18} />}
        label="Analytics"
        active={activeSection === "analytics"}
        onClick={() => setActiveSection("analytics")}
      />

    </nav>

    <div className="border-t border-slate-200 p-4">
      <div className="mb-3 rounded-xl bg-slate-50 p-3">
        <p className="text-xs text-slate-500">
          Signed in as
        </p>

        <p className="truncate text-sm font-semibold">
          {user?.name ?? "Industry Administrator"}
        </p>
      </div>
    </div>
  </div>
</aside>
      {/* MAIN */}

      <main className="lg:ml-64">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between px-5 py-4 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  setMobileMenu(
                    true,
                  )
                }
                className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
              >
                <Menu size={21} />
              </button>

              <div>
                <h2 className="text-lg font-bold">
                  Industry Dashboard
                </h2>

                <p className="hidden text-xs text-slate-500 sm:block">
                  Manage hiring, internships,
                  skills and collaboration
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  loadDashboard(
                    true,
                  )
                }
                className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50"
                title="Refresh"
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

              <button className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50">
                <Bell size={18} />
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-8 p-5 lg:p-8">
          {/* HERO */}

          <section className="rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 p-6 text-white shadow-sm lg:p-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  <ShieldCheck
                    size={14}
                  />
                  Verified Industry Workspace
                </div>

                <h1 className="max-w-3xl text-2xl font-bold tracking-tight lg:text-3xl">
                  Connect with skilled AYUSH
                  students, faculty and
                  researchers.
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50">
                  Use verified skills,
                  deterministic eligibility
                  rules, algorithmic candidate
                  matching and ML-powered
                  workforce intelligence to
                  support better hiring
                  decisions.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowCreateForm(
                    true,
                  );
                  setCreateError("");
                  setCreateSuccess("");
                }}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-700 shadow-sm hover:bg-emerald-50"
              >
                <FilePlus2
                  size={18}
                />
                Create Opportunity
              </button>
            </div>
          </section>

          {/* ERROR */}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* KPI */}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={
                <Users size={21} />
              }
              label="Candidates"
              value={
                totalCandidates
              }
              description="Applications received"
            />

            <KpiCard
              icon={
                <Target size={21} />
              }
              label="Average Match"
              value={`${averageMatch.toFixed(
                1,
              )}%`}
              description="Algorithmic skill compatibility"
            />

            <KpiCard
              icon={
                <BriefcaseBusiness
                  size={21}
                />
              }
              label="Open Opportunities"
              value={
                openInternships +
                openJobs
              }
              description={`${openInternships} internships • ${openJobs} jobs`}
            />

            <KpiCard
              icon={
                <Award size={21} />
              }
              label="Selected"
              value={selected}
              description={`${shortlisted} currently shortlisted`}
            />
          </section>

          {/* OPPORTUNITIES */}

<section
  id="opportunities"
  className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white shadow-sm"
>
              <SectionHeader
              icon={
                <BriefcaseBusiness
                  size={20}
                />
              }
              title="Opportunities"
              description="Create and manage AYUSH internships and jobs."
              action={
                <button
                  onClick={() =>
                    setShowCreateForm(
                      true,
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <FilePlus2
                    size={15}
                  />
                  New
                </button>
              }
            />

            <div className="border-b border-slate-200 px-6">
              <div className="flex gap-6">
                <TabButton
                  active={
                    opportunityTab ===
                    "INTERNSHIP"
                  }
                  onClick={() =>
                    setOpportunityTab(
                      "INTERNSHIP",
                    )
                  }
                >
                  Internships
                </TabButton>

                <TabButton
                  active={
                    opportunityTab ===
                    "JOB"
                  }
                  onClick={() =>
                    setOpportunityTab(
                      "JOB",
                    )
                  }
                >
                  Jobs
                </TabButton>
              </div>
            </div>

            <div className="grid gap-4 p-6 lg:grid-cols-2">
              {displayedOpportunities.length ===
              0 ? (
                <EmptyState
                  icon={
                    <BriefcaseBusiness
                      size={25}
                    />
                  }
                  title="No opportunities yet"
                  description="Create your first AYUSH opportunity."
                />
              ) : (
                displayedOpportunities.map(
                  (
                    opportunity: any,
                  ) => (
                    <OpportunityCard
                      key={
                        opportunity.id
                      }
                      type={
                        opportunityTab
                      }
                      opportunity={
                        opportunity
                      }
                      onSkills={() =>
                        openRequiredSkills(
                          opportunityTab,
                          opportunity.id,
                          opportunity.title,
                        )
                      }
                    />
                  ),
                )
              )}
            </div>
          </section>

          {/* CANDIDATES */}

          <section
  id="opportunities"
  className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white shadow-sm"
>
            <SectionHeader
              icon={
                <Users size={20} />
              }
              title="Candidate Recruitment"
              description="Eligibility and skill matching are handled by backend rules and ranking algorithms."
            />

            <div className="border-b border-slate-200 p-5">
              <div className="relative max-w-md">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Search candidates..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Candidate
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Opportunity
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Skill Match
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Eligibility
                    </th>

                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredApplications.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-12"
                      >
                        <EmptyState
                          icon={
                            <Users
                              size={25}
                            />
                          }
                          title="No candidates found"
                          description="Applications will appear here when students apply."
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredApplications.map(
                      (
                        application,
                      ) => (
                        <tr
                          key={
                            application.id
                          }
                          className="hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <div className="font-semibold text-slate-900">
                              {application.student_name ??
                                `Student #${
                                  application.student_id ??
                                  application.id
                                }`}
                            </div>

                            <div className="text-xs text-slate-500">
                              Applied{" "}
                              {formatDate(
                                application.applied_at,
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">
                            {application.opportunity_title ??
                              "Opportunity"}
                          </td>

                          <td className="px-5 py-4">
                            <span className="font-bold text-emerald-700">
                              {getNumber(
                                application.skill_match_percentage ??
                                  application.recruitment_score,
                              ).toFixed(
                                1,
                              )}
                              %
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold">
                              {application.eligibility_status ??
                                "Evaluated"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(
                                application.status,
                              )}`}
                            >
                              {statusLabel(
                                application.status,
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedApplication(
                                  application,
                                );

                                setVerifiedSkills(
                                  [],
                                );

                                setApplicationActionError(
                                  "",
                                );

                                viewVerifiedSkills(
                                  application,
                                );
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                            >
                              <Users
                                size={14}
                              />
                              View candidate
                            </button>
                          </td>
                        </tr>
                      ),
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ML INTELLIGENCE */}

          <section className="rounded-2xl border border-indigo-200 bg-white shadow-sm">
            <SectionHeader
              icon={
                <Brain size={20} />
              }
              title="ML Workforce Intelligence"
              description="Predictive insights generated from the platform's skill-demand forecasting models."
            />

            <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
              <InsightCard
                icon={
                  <TrendingUp
                    size={20}
                  />
                }
                title="Emerging Skills"
                value={
                  forecastData.filter(
                    (item) =>
                      getNumber(
                        item.predicted_demand,
                      ) >
                      getNumber(
                        item.current_demand,
                      ),
                  ).length
                }
                description="Skills with increasing predicted demand"
              />

              <InsightCard
                icon={
                  <AlertTriangle
                    size={20}
                  />
                }
                title="Future Shortages"
                value={
                  forecastData.filter(
                    (item) =>
                      getNumber(
                        item.shortage ??
                          item.future_gap,
                      ) > 0,
                  ).length
                }
                description="Skills where projected demand exceeds supply"
              />

              <InsightCard
                icon={
                  <BarChart3
                    size={20}
                  />
                }
                title="Demand Signals"
                value={
                  forecastData.length
                }
                description="Skills included in the forecasting model"
              />

              <InsightCard
                icon={
                  <ClipboardCheck
                    size={20}
                  />
                }
                title="Candidate Pool"
                value={
                  applications.length
                }
                description="Candidates available for current opportunities"
              />
            </div>

            {forecastData.length >
              0 && (
              <div className="border-t border-slate-200 p-6">
                <h3 className="mb-4 text-sm font-bold text-slate-900">
                  Predicted Skill Demand
                </h3>

                <div className="grid gap-3 md:grid-cols-2">
                  {forecastData
                    .slice(0, 8)
                    .map(
                      (
                        item,
                        index,
                      ) => {
                        const current =
                          getNumber(
                            item.current_demand,
                          );

                        const predicted =
                          getNumber(
                            item.predicted_demand,
                          );

                        const increase =
                          predicted -
                          current;

                        return (
                          <div
                            key={
                              item.skill_id ??
                              index
                            }
                            className="rounded-xl border border-slate-200 p-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-semibold">
                                  {item.skill_name ??
                                    `Skill #${
                                      item.skill_id ??
                                      index
                                    }`}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  Current demand:{" "}
                                  {
                                    current
                                  }
                                </p>
                              </div>

                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                  increase >
                                  0
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {increase >
                                0
                                  ? `+${increase}`
                                  : increase}
                              </span>
                            </div>

                            <div className="mt-4">
                              <div className="mb-1 flex justify-between text-xs">
                                <span className="text-slate-500">
                                  Predicted demand
                                </span>

                                <span className="font-bold">
                                  {
                                    predicted
                                  }
                                </span>
                              </div>

                              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-indigo-500"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.max(
                                        5,
                                        predicted *
                                          10,
                                      ),
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      },
                    )}
                </div>
              </div>
            )}
          </section>

          {/* SKILL DEMAND */}

 <section
  id="skill-demand"
  className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white shadow-sm"
>
            <SectionHeader
              icon={
                <Target size={20} />
              }
              title="AYUSH Skill Demand"
              description="Industry demand, student supply and skill shortages derived from live platform analytics."
            />

            {/* TOP DEMAND COUNTERS */}

            <div className="grid gap-4 p-6 md:grid-cols-3">
              <DemandCard
                title="Open internships"
                value={
                  openInternships
                }
                icon={
                  <GraduationCap
                    size={20}
                  />
                }
              />

              <DemandCard
                title="Open jobs"
                value={
                  openJobs
                }
                icon={
                  <BriefcaseBusiness
                    size={20}
                  />
                }
              />

              <DemandCard
                title="Candidate demand"
                value={
                  applications.length
                }
                icon={
                  <Users size={20} />
                }
              />
            </div>

            {/* CURRENT SKILL DEMAND */}

            <div className="border-t border-slate-200 p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Current Skill Demand
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Skills currently required by AYUSH industry opportunities.
                  </p>
                </div>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  {skillDemandData.length} skills
                </span>
              </div>

              {skillDemandData.length ===
              0 ? (
                <EmptyState
                  icon={
                    <Target size={24} />
                  }
                  title="No skill-demand data"
                  description="Current skill-demand analytics will appear when industry opportunity data is available."
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                          Skill
                        </th>

                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                          Demand
                        </th>

                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                          Student Supply
                        </th>

                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                          Gap
                        </th>

                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                          Priority
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {skillDemandData
                        .slice(0, 10)
                        .map(
                          (
                            item: any,
                            index: number,
                          ) => {
                            const demand =
                              getNumber(
                                item.demand ??
                                  item.demand_count ??
                                  item.industry_demand ??
                                  item.current_demand,
                              );

                            const supply =
                              getNumber(
                                item.supply ??
                                  item.supply_count ??
                                  item.student_supply ??
                                  item.current_supply,
                              );

                            const gap =
                              getNumber(
                                item.industry_skill_gap_count ??
                                  item.skill_gap_count ??
                                  item.gap ??
                                  item.skill_gap ??
                                  item.demand_supply_gap,
                                Math.max(
                                  0,
                                  demand -
                                    supply,
                                ),
                              );

                            const priority =
                              String(
                                item.priority ??
                                  item.priority_level ??
                                  "",
                              ).toUpperCase() ||
                              (gap > 5
                                ? "CRITICAL"
                                : gap > 2
                                  ? "HIGH"
                                  : gap > 0
                                    ? "MEDIUM"
                                    : "LOW");

                            const priorityClass =
                              priority ===
                              "CRITICAL"
                                ? "bg-red-50 text-red-700"
                                : priority ===
                                    "HIGH"
                                  ? "bg-orange-50 text-orange-700"
                                  : priority ===
                                      "MEDIUM"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-emerald-50 text-emerald-700";

                            return (
                              <tr
                                key={
                                  item.skill_id ??
                                  item.id ??
                                  index
                                }
                                className="hover:bg-slate-50"
                              >
                                <td className="px-4 py-4">
                                  <p className="font-semibold text-slate-900">
                                    {item.skill_name ??
                                      item.name ??
                                      item.skill?.name ??
                                      `Skill #${
                                        item.skill_id ??
                                        index
                                      }`}
                                  </p>

                                  {item.category && (
                                    <p className="mt-1 text-xs text-slate-500">
                                      {
                                        item.category
                                      }
                                    </p>
                                  )}
                                </td>

                                <td className="px-4 py-4">
                                  <span className="font-bold text-slate-900">
                                    {demand}
                                  </span>
                                </td>

                                <td className="px-4 py-4">
                                  <span className="font-semibold text-slate-700">
                                    {supply}
                                  </span>
                                </td>

                                <td className="px-4 py-4">
                                  <span
                                    className={`font-bold ${
                                      gap > 0
                                        ? "text-red-600"
                                        : "text-emerald-600"
                                    }`}
                                  >
                                    {gap}
                                  </span>
                                </td>

                                <td className="px-4 py-4">
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${priorityClass}`}
                                  >
                                    {statusLabel(
                                      priority,
                                    )}
                                  </span>
                                </td>
                              </tr>
                            );
                          },
                        )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
<div className="rounded-xl border border-slate-200 bg-white p-5">
  <div className="mb-4 flex items-center justify-between gap-4">
    <div className="flex items-center gap-2">
      <ShieldCheck size={18} className="text-emerald-600" />
      <h3 className="font-bold">Eligibility Assessment</h3>
    </div>

    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
      {applications.length} candidate{applications.length === 1 ? "" : "s"} evaluated
    </span>
  </div>

  {applications.length === 0 ? (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
      No candidate applications are available for eligibility assessment.
    </div>
  ) : (
    <div className="space-y-4">
      {applications.map((application) => {
        const evaluation = getCandidateEvaluation(application);
        const candidateName =
          application.student_name ??
          `Student #${application.student_id ?? application.id}`;

        return (
          <div
            key={application.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-slate-900">
                    {candidateName}
                  </p>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      String(application.status ?? "").toUpperCase() ===
                      "SELECTED"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {statusLabel(application.status)}
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  {application.opportunity_title ?? "AYUSH Opportunity"}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  evaluation.eligible
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {evaluation.eligible
                  ? "Eligible"
                  : "Not Eligible"}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Eligibility
                </p>
                <p
                  className={`mt-1 font-bold ${
                    evaluation.eligible
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {evaluation.eligible
                    ? "Eligible"
                    : "Not Eligible"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Requirements
                </p>
                <p className="mt-1 font-bold">
                  {evaluation.matchedCount}/
                  {evaluation.totalRequired}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Skill Gaps
                </p>
                <p
                  className={`mt-1 font-bold ${
                    evaluation.gapCount > 0
                      ? "text-red-600"
                      : "text-emerald-600"
                  }`}
                >
                  {evaluation.gapCount}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Assessment Coverage
                </p>
                <p className="mt-1 font-bold">
                  {evaluation.assessmentCoverage.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Student Skill Gaps
                </p>
                <span className="text-xs font-semibold text-slate-500">
                  {evaluation.gapCount} gap
                  {evaluation.gapCount === 1 ? "" : "s"}
                </span>
              </div>

              {evaluation.skillGaps.length === 0 ? (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  No skill gaps for this candidate for this opportunity.
                </div>
              ) : (
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {evaluation.skillGaps.map(
                    (skill: any, index: number) => {
                      const candidateScore = Number(
                        skill.current_score ??
                          skill.student_score ??
                          skill.score ??
                          0,
                      );

                      const requiredScore = Number(
                        skill.required_score ??
                          skill.minimum_score ??
                          0,
                      );

                      const gap = Math.max(
                        requiredScore - candidateScore,
                        0,
                      );

                      return (
                        <div
                          key={
                            skill.skill_id ??
                            skill.id ??
                            `${skill.skill_name}-${index}`
                          }
                          className="rounded-lg border border-red-100 bg-red-50/50 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-slate-900">
                              {skill.skill_name ??
                                skill.name ??
                                `Skill #${skill.skill_id}`}
                            </p>
                            <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                              Gap {gap}%
                            </span>
                          </div>

                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-slate-500">
                                Student score
                              </span>
                              <p className="font-bold text-slate-900">
                                {candidateScore}%
                              </p>
                            </div>

                            <div>
                              <span className="text-slate-500">
                                Required
                              </span>
                              <p className="font-bold text-slate-900">
                                {requiredScore}%
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              )}

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {evaluation.reason}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>
            {/* EMERGING SKILLS */}

            <div className="border-t border-slate-200 p-6">
              <div className="mb-5">
                <h3 className="text-sm font-bold text-slate-900">
                  Emerging AYUSH Skills
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Skills showing increasing industry demand signals.
                </p>
              </div>

              {emergingSkillsData.length ===
              0 ? (
                <EmptyState
                  icon={
                    <TrendingUp
                      size={24}
                    />
                  }
                  title="No emerging-skill data"
                  description="Emerging AYUSH skills will appear when sufficient demand history is available."
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {emergingSkillsData
                    .slice(0, 6)
                    .map(
                      (
                        item: any,
                        index: number,
                      ) => {
                        const growth =
                          getNumber(
                            item.growth_rate ??
                              item.growth_percentage ??
                              item.demand_growth ??
                              item.predicted_growth,
                          );

                        return (
                          <div
                            key={
                              item.skill_id ??
                              item.id ??
                              index
                            }
                            className="rounded-xl border border-slate-200 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                                <TrendingUp
                                  size={18}
                                />
                              </div>

                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                +{growth.toFixed(
                                  1,
                                )}
                                %
                              </span>
                            </div>

                            <p className="mt-4 font-semibold text-slate-900">
                              {item.skill_name ??
                                item.name ??
                                item.skill?.name ??
                                `Skill #${
                                  item.skill_id ??
                                  index
                                }`}
                            </p>

                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              Increasing industry demand signal
                            </p>

                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(
                                      5,
                                      growth,
                                    ),
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      },
                    )}
                </div>
              )}
            </div>

            {/* TRAINING REQUIREMENTS */}

            <div className="border-t border-slate-200 p-6">
              <div className="mb-5">
                <h3 className="text-sm font-bold text-slate-900">
                  Training Requirements
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Training areas required to close current AYUSH workforce skill gaps.
                </p>
              </div>

              {trainingRequirementsData.length ===
              0 ? (
                <EmptyState
                  icon={
                    <GraduationCap
                      size={24}
                    />
                  }
                  title="No training requirements"
                  description="Training requirements will appear when skill-demand and gap data are available."
                />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {trainingRequirementsData
                    .slice(0, 8)
                    .map(
                      (
                        item: any,
                        index: number,
                      ) => {
                        const requirement =
                          getNumber(
                            item.training_requirement ??
                              item.required_training ??
                              item.gap ??
                              item.skill_gap ??
                              item.required_students,
                          );

                        return (
                          <div
                            key={
                              item.skill_id ??
                              item.id ??
                              index
                            }
                            className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                                <GraduationCap
                                  size={18}
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900">
                                  {item.skill_name ??
                                    item.name ??
                                    item.skill?.name ??
                                    `Skill #${
                                      item.skill_id ??
                                      index
                                    }`}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  Recommended training requirement
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <p className="text-lg font-bold text-blue-700">
                                {requirement}
                              </p>

                              <p className="text-xs text-slate-500">
                                learners
                              </p>
                            </div>
                          </div>
                        );
                      },
                    )}
                </div>
              )}
            </div>
          </section>

          {/* COLLABORATION */}

<section
  id="collaboration"
  className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white shadow-sm"
>
            <SectionHeader
              icon={
                <Building2
                  size={20}
                />
              }
              title="Academia–Industry Collaboration"
              description="Mentorship, guest lectures, innovation challenges, consultancies and partnerships."
            />

            <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-5">
              <CollaborationCard
                title="Proposals"
                value={
                  collaborations.filter(
                    (item) =>
                      item.type ===
                      "PROPOSAL",
                  ).length
                }
              />

              <CollaborationCard
                title="Guest Lectures"
                value={
                  collaborations.filter(
                    (item) =>
                      item.type ===
                      "GUEST_LECTURE",
                  ).length
                }
              />

              <CollaborationCard
                title="Innovation"
                value={
                  collaborations.filter(
                    (item) =>
                      item.type ===
                      "INNOVATION_CHALLENGE",
                  ).length
                }
              />

              <CollaborationCard
                title="Consultancies"
                value={
                  collaborations.filter(
                    (item) =>
                      item.type ===
                      "CONSULTANCY",
                  ).length
                }
              />

              <CollaborationCard
                title="Partnerships"
                value={
                  collaborations.filter(
                    (item) =>
                      item.type ===
                      "PARTNERSHIP",
                  ).length
                }
              />
            </div>
          </section>

          {/* ANALYTICS */}

 <section
  id="analytics"
  className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white shadow-sm"
>
            <SectionHeader
              icon={
                <BarChart3
                  size={20}
                />
              }
              title="Recruitment Analytics"
              description="Operational indicators for the current industry workspace."
            />

            <div className="grid gap-4 p-6 md:grid-cols-3">
              <AnalyticsCard
                title="Applications"
                value={
                  applications.length
                }
                percentage={
                  applications.length >
                  0
                    ? 100
                    : 0
                }
              />

              <AnalyticsCard
                title="Shortlisted"
                value={
                  shortlisted
                }
                percentage={
                  applications.length
                    ? (shortlisted /
                        applications.length) *
                      100
                    : 0
                }
              />

              <AnalyticsCard
                title="Selected"
                value={
                  selected
                }
                percentage={
                  applications.length
                    ? (selected /
                        applications.length) *
                      100
                    : 0
                }
              />
            </div>
          </section>
        </div>
      </main>

      {/* CREATE OPPORTUNITY MODAL */}

      {showCreateForm && (
        <Modal
          title="Create Opportunity"
          onClose={() => {
            if (!creating) {
              setShowCreateForm(
                false,
              );
            }
          }}
        >
          <div className="mb-5 flex rounded-xl bg-slate-100 p-1">
            <button
              onClick={() =>
                setOpportunityTab(
                  "INTERNSHIP",
                )
              }
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold ${
                opportunityTab ===
                "INTERNSHIP"
                  ? "bg-white shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Internship
            </button>

            <button
              onClick={() =>
                setOpportunityTab(
                  "JOB",
                )
              }
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold ${
                opportunityTab ===
                "JOB"
                  ? "bg-white shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Job
            </button>
          </div>

          {createError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {createError}
            </div>
          )}

          {createSuccess && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {createSuccess}
            </div>
          )}

          {opportunityTab ===
          "INTERNSHIP" ? (
            <div className="space-y-4">
              <FormInput
                label="Title"
                value={
                  internshipForm.title
                }
                onChange={(value) =>
                  setInternshipForm(
                    (current) => ({
                      ...current,
                      title: value,
                    }),
                  )
                }
                placeholder="e.g. Panchakarma Clinical Internship"
              />

              <FormTextArea
                label="Description"
                value={
                  internshipForm.description
                }
                onChange={(value) =>
                  setInternshipForm(
                    (current) => ({
                      ...current,
                      description:
                        value,
                    }),
                  )
                }
              />

              <FormInput
                label="Eligibility"
                value={
                  internshipForm.eligibility
                }
                onChange={(value) =>
                  setInternshipForm(
                    (current) => ({
                      ...current,
                      eligibility:
                        value,
                    }),
                  )
                }
                placeholder="AYUSH students with relevant academic background"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput
                  label="Location"
                  value={
                    internshipForm.location
                  }
                  onChange={(value) =>
                    setInternshipForm(
                      (current) => ({
                        ...current,
                        location:
                          value,
                      }),
                    )
                  }
                />

                <FormInput
                  label="Duration"
                  value={
                    internshipForm.duration
                  }
                  onChange={(value) =>
                    setInternshipForm(
                      (current) => ({
                        ...current,
                        duration:
                          value,
                      }),
                    )
                  }
                  placeholder="3 Months"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput
                  label="Stipend"
                  type="number"
                  value={
                    internshipForm.stipend
                  }
                  onChange={(value) =>
                    setInternshipForm(
                      (current) => ({
                        ...current,
                        stipend:
                          value,
                      }),
                    )
                  }
                />

                <FormInput
                  label="Application Deadline"
                  type="datetime-local"
                  value={
                    internshipForm.application_deadline
                  }
                  onChange={(value) =>
                    setInternshipForm(
                      (current) => ({
                        ...current,
                        application_deadline:
                          value,
                      }),
                    )
                  }
                />
              </div>

              <button
                disabled={creating}
                onClick={
                  createInternship
                }
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {creating
                  ? "Creating..."
                  : "Create Internship"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <FormInput
                label="Title"
                value={
                  jobForm.title
                }
                onChange={(value) =>
                  setJobForm(
                    (current) => ({
                      ...current,
                      title: value,
                    }),
                  )
                }
                placeholder="e.g. Junior Ayurvedic Clinical Practitioner"
              />

              <FormTextArea
                label="Description"
                value={
                  jobForm.description
                }
                onChange={(value) =>
                  setJobForm(
                    (current) => ({
                      ...current,
                      description:
                        value,
                    }),
                  )
                }
              />

              <FormInput
                label="Eligibility"
                value={
                  jobForm.eligibility
                }
                onChange={(value) =>
                  setJobForm(
                    (current) => ({
                      ...current,
                      eligibility:
                        value,
                    }),
                  )
                }
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput
                  label="Location"
                  value={
                    jobForm.location
                  }
                  onChange={(value) =>
                    setJobForm(
                      (current) => ({
                        ...current,
                        location:
                          value,
                      }),
                    )
                  }
                />

                <FormInput
                  label="Employment Type"
                  value={
                    jobForm.employment_type
                  }
                  onChange={(value) =>
                    setJobForm(
                      (current) => ({
                        ...current,
                        employment_type:
                          value,
                      }),
                    )
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormInput
                  label="Minimum Salary"
                  type="number"
                  value={
                    jobForm.salary_min
                  }
                  onChange={(value) =>
                    setJobForm(
                      (current) => ({
                        ...current,
                        salary_min:
                          value,
                      }),
                    )
                  }
                />

                <FormInput
                  label="Maximum Salary"
                  type="number"
                  value={
                    jobForm.salary_max
                  }
                  onChange={(value) =>
                    setJobForm(
                      (current) => ({
                        ...current,
                        salary_max:
                          value,
                      }),
                    )
                  }
                />
              </div>

              <FormInput
                label="Application Deadline"
                type="datetime-local"
                value={
                  jobForm.application_deadline
                }
                onChange={(value) =>
                  setJobForm(
                    (current) => ({
                      ...current,
                      application_deadline:
                        value,
                    }),
                  )
                }
              />

              <button
                disabled={creating}
                onClick={
                  createJob
                }
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {creating
                  ? "Creating..."
                  : "Create Job"}
              </button>
            </div>
          )}
        </Modal>
      )}

      {/* REQUIRED SKILLS MODAL */}

      {selectedOpportunity && (
        <Modal
          title="Required AYUSH Skills"
          onClose={() => {
            setSelectedOpportunity(
              null,
            );

            setRequiredSkills(
              [],
            );

            setSkillError("");
          }}
        >
          <div className="mb-5 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Opportunity
            </p>

            <p className="mt-1 font-bold text-slate-900">
              {
                selectedOpportunity.title
              }
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Define minimum competencies
              expected from candidates.
            </p>
          </div>

          {skillError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {skillError}
            </div>
          )}

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">
                Search AYUSH Skill
              </span>

              <input
                value={
                  skillSearch
                }
                onChange={(event) =>
                  setSkillSearch(
                    event.target.value,
                  )
                }
                placeholder="Search by skill name or ID..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">
                AYUSH Skill
              </span>

              <select
                value={
                  skillForm.skill_id
                }
                onChange={(event) =>
                  setSkillForm(
                    (current) => ({
                      ...current,
                      skill_id:
                        event.target.value,
                    }),
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">
                  Select an AYUSH skill
                </option>

                {availableSkills
                  .filter(
                    (skill) =>
                      !requiredSkills.some(
                        (
                          required,
                        ) =>
                          Number(
                            required.skill_id,
                          ) ===
                          Number(
                            skill.id,
                          ),
                      ),
                  )
                  .filter(
                    (skill) => {
                      const query =
                        skillSearch
                          .trim()
                          .toLowerCase();

                      if (!query) {
                        return true;
                      }

                      return (
                        skill.name
                          .toLowerCase()
                          .includes(
                            query,
                          ) ||
                        String(
                          skill.id,
                        ).includes(
                          query,
                        )
                      );
                    },
                  )
                  .map(
                    (skill) => (
                      <option
                        key={
                          skill.id
                        }
                        value={
                          skill.id
                        }
                      >
                        {
                          skill.name
                        }{" "}
                        — ID{" "}
                        {
                          skill.id
                        }
                      </option>
                    ),
                  )}
              </select>
            </label>

            <FormInput
              label="Minimum Required Score"
              type="number"
              value={
                skillForm.required_score
              }
              onChange={(value) =>
                setSkillForm(
                  (current) => ({
                    ...current,
                    required_score:
                      value,
                  }),
                )
              }
              placeholder="60"
            />

            <FormInput
              label="Importance Weight"
              type="number"
              value={
                skillForm.importance_weight
              }
              onChange={(value) =>
                setSkillForm(
                  (current) => ({
                    ...current,
                    importance_weight:
                      value,
                  }),
                )
              }
              placeholder="1"
            />
          </div>

          <button
            onClick={
              addRequiredSkill
            }
            disabled={
              skillSaving
            }
            className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {skillSaving
              ? "Adding..."
              : "Add Required Skill"}
          </button>

          <div className="mt-7">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">
                Current Requirements
              </h3>

              <span className="text-xs font-semibold text-slate-500">
                {
                  selectedOpportunitySkills.length
                }{" "}
                skills
              </span>
            </div>

            {skillsLoading ? (
              <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                Loading skills...
              </div>
            ) : selectedOpportunitySkills.length ===
              0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                No required skills added
                yet.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedOpportunitySkills.map(
                  (
                    skill,
                    index,
                  ) => (
                    <div
                      key={
                        skill.id ??
                        `${skill.skill_id}-${index}`
                      }
                      className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
                    >
                      <div>
                        <p className="font-semibold">
                          {skill.skill_name ??
                            `Skill #${skill.skill_id}`}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Skill ID:{" "}
                          {
                            skill.skill_id
                          }
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-700">
                          {getNumber(
                            skill.required_score,
                            60,
                          )}
                          %
                        </p>

                        <p className="text-xs text-slate-500">
                          Weight:{" "}
                          {getNumber(
                            skill.importance_weight,
                            1,
                          )}
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>

          <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <div className="flex gap-3">
              <Brain
                size={19}
                className="mt-0.5 shrink-0 text-indigo-600"
              />

              <div>
                <p className="text-sm font-bold text-indigo-900">
                  Recruitment intelligence
                </p>

                <p className="mt-1 text-xs leading-5 text-indigo-700">
                  Candidates are evaluated
                  using deterministic
                  eligibility rules, weighted
                  skill matching and
                  assessment coverage. ML is
                  used separately for prediction
                  and workforce forecasting.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={
              runAutomaticShortlist
            }
            disabled={
              updatingApplication
            }
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Target size={17} />

            {updatingApplication
              ? "Ranking candidates..."
              : "Run Automatic Shortlist"}
          </button>
        </Modal>
      )}

      {/* CANDIDATE DETAILS MODAL */}

{selectedApplication != null && (
        <Modal
          title="Candidate Details"
          onClose={() => {
            setSelectedApplication(
              null,
            );

            setVerifiedSkills(
              [],
            );

            setApplicationActionError(
              "",
            );
          }}
        >
          <div className="space-y-5">
            <div className="rounded-xl bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Candidate
                  </p>

                  <h3 className="mt-1 text-lg font-bold text-slate-900">
                    {selectedApplication.student_name ??
                      `Student #${selectedApplication.student_id ?? selectedApplication.id}`}
                  </h3>

                  <p className="text-xs text-slate-500">
                    Applied for:{" "}
                    <span className="font-semibold text-slate-700">
                      {selectedApplication.opportunity_title ?? "Opportunity"}
                    </span>
                  </p>
                </div>

                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(
                    selectedApplication.status,
                  )}`}
                >
                  {statusLabel(selectedApplication.status)}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <MetricBox
                  label="Match Score"
                  value={`${getNumber(
                    selectedApplication.skill_match_percentage ??
                      selectedApplication.recruitment_score,
                  ).toFixed(1)}%`}
                />
                <MetricBox
                  label="Eligibility"
                  value={selectedApplication.eligibility_status ?? "Evaluated"}
                />
                <MetricBox
                  label="Applied Date"
                  value={formatDate(selectedApplication.applied_at)}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
<div className="mb-4 flex items-center gap-2">
  <UsersRound size={18} className="text-emerald-600" />
  <h3 className="font-bold">Candidate Profile</h3>
</div>

<div className="grid gap-4 sm:grid-cols-2">
  <div>
    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
      Degree
    </p>
    <p className="mt-1 font-semibold">
      {candidatePortfolio?.degree ?? "Not available"}
    </p>
  </div>

  <div>
    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
      Department
    </p>
    <p className="mt-1 font-semibold">
      {candidatePortfolio?.department ?? "Not available"}
    </p>
  </div>

  <div>
    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
      Graduation Year
    </p>
    <p className="mt-1 font-semibold">
      {candidatePortfolio?.graduation_year ?? "Not available"}
    </p>
  </div>

  <div>
    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
      CGPA
    </p>
    <p className="mt-1 font-semibold">
      {candidatePortfolio?.cgpa ?? "Not available"}
    </p>
  </div>
</div>

{candidatePortfolio?.headline && (
  <div className="mt-4">
    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
      Headline
    </p>
    <p className="mt-1 text-sm text-slate-700">
      {candidatePortfolio.headline}
    </p>
  </div>
)}

{candidatePortfolio?.career_objective && (
  <div className="mt-4">
    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
      Career Objective
    </p>
    <p className="mt-1 text-sm leading-6 text-slate-700">
      {candidatePortfolio.career_objective}
    </p>
  </div>
)}

{candidatePortfolio?.bio && (
  <div className="mt-4">
    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
      About Candidate
    </p>
    <p className="mt-1 text-sm leading-6 text-slate-700">
      {candidatePortfolio.bio}
    </p>
  </div>
)}
</div>

            {applicationActionError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-800">
                {applicationActionError}
              </div>
            )}

            <div>
              <h3 className="mb-3 font-bold text-slate-900">Verified Skills</h3>
               {verifiedSkills.length === 0 ? (
  <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
    No verified skills available, or student consent is not active.
  </div>
) : (
  <div className="space-y-3">
    {verifiedSkills.map((skill, index) => (
      <div
        key={skill.id ?? `${skill.skill_id}-${index}`}
        className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <Award size={18} />
            </div>

            <div>
              <p className="font-bold">
                {skill.skill_name ??
                  `Skill #${skill.skill_id}`}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {skill.category ?? "AYUSH Skill"}
                {skill.ayush_system
                  ? ` • ${skill.ayush_system}`
                  : ""}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xl font-bold text-emerald-700">
              {getNumber(skill.score)}%
            </p>

            <p className="text-xs font-semibold text-emerald-700">
              {skill.level ?? "Verified"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-white p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Verification Source
            </p>
            <p className="mt-1 text-sm font-semibold">
              {skill.verification?.source ??
                "Verified Assessment"}
            </p>
          </div>

          <div className="rounded-lg bg-white p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Verified By
            </p>
            <p className="mt-1 text-sm font-semibold">
              {skill.verification?.verified_by?.name ??
                "Authorized Verifier"}
            </p>
            {skill.verification?.verified_by?.role && (
              <p className="text-xs text-slate-500">
                {skill.verification.verified_by.role}
              </p>
            )}
          </div>
        </div>

        {skill.verification?.notes && (
          <div className="mt-3 rounded-lg bg-white p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Verification Notes
            </p>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              {skill.verification.notes}
            </p>
          </div>
        )}

        {skill.verification?.verified_at && (
          <p className="mt-3 text-xs text-slate-500">
            Verified on{" "}
            {new Date(
              skill.verification.verified_at,
            ).toLocaleDateString()}
          </p>
        )}
      </div>
    ))}
  </div>
)}
            </div>
            <div>
              <h3 className="mb-3 font-bold">
                Recruitment Actions
              </h3>

              {String(
                selectedApplication.status ?? "",
              ).toUpperCase() === "SELECTED" ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <p className="font-semibold">
                    Candidate Selected
                  </p>
                  <p className="mt-1">
                    This candidate has already been selected.
                    No further recruitment actions are available.
                  </p>
                </div>
              ) : String(
                  selectedApplication.status ?? "",
                ).toUpperCase() === "REJECTED" ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  <p className="font-semibold">
                    Application Rejected
                  </p>
                  <p className="mt-1">
                    This application has already been rejected.
                    No further recruitment actions are available.
                  </p>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {canMoveToStatus(
                    selectedApplication.status,
                    "UNDER_REVIEW",
                  ) && (
                    <ActionButton
                      label="Under Review"
                      icon={<Clock3 size={16} />}
                      disabled={updatingApplication}
                      onClick={() =>
                        updateApplicationStatus(
                          selectedApplication,
                          "UNDER_REVIEW",
                        )
                      }
                    />
                  )}

                  {canMoveToStatus(
                    selectedApplication.status,
                    "SHORTLISTED",
                  ) && (
                    <ActionButton
                      label="Shortlist"
                      icon={<Target size={16} />}
                      disabled={updatingApplication}
                      onClick={() =>
                        updateApplicationStatus(
                          selectedApplication,
                          "SHORTLISTED",
                        )
                      }
                    />
                  )}

                  {canMoveToStatus(
                    selectedApplication.status,
                    "INTERVIEW_SCHEDULED",
                  ) && (
                    <ActionButton
                      label="Schedule Interview"
                      icon={<CalendarDays size={16} />}
                      disabled={updatingApplication}
                      onClick={() =>
                        updateApplicationStatus(
                          selectedApplication,
                          "INTERVIEW_SCHEDULED",
                        )
                      }
                    />
                  )}

                  {canMoveToStatus(
                    selectedApplication.status,
                    "SELECTED",
                  ) && (
                    <ActionButton
                      label="Select Candidate"
                      icon={<CheckCircle2 size={16} />}
                      disabled={updatingApplication}
                      primary
                      onClick={() =>
                        updateApplicationStatus(
                          selectedApplication,
                          "SELECTED",
                        )
                      }
                    />
                  )}

                  {canMoveToStatus(
                    selectedApplication.status,
                    "REJECTED",
                  ) && (
                    <ActionButton
                      label="Reject"
                      icon={<X size={16} />}
                      disabled={updatingApplication}
                      danger
                      onClick={() =>
                        updateApplicationStatus(
                          selectedApplication,
                          "REJECTED",
                        )
                      }
                    />
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
  <div className="mb-4 flex items-center gap-2">
    <Target size={18} className="text-emerald-600" />
    <h3 className="font-bold">Skill Compatibility</h3>
  </div>

  {getArray(selectedApplication.match?.skills).length === 0 ? (
    <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
      No skill compatibility details available.
    </div>
  ) : (
    <div className="space-y-3">
      {getArray(selectedApplication.match?.skills).map(
        (skill: any, index: number) => {
          const candidateScore = getNumber(
            skill.current_score ??
              skill.student_score ??
              skill.score,
          );

          const requiredScore = getNumber(
            skill.required_score,
          );

          const gap = Math.max(
            requiredScore - candidateScore,
            0,
          );

          const matched =
            skill.matched === true ||
            candidateScore >= requiredScore;

          return (
            <div
              key={
                skill.skill_id ??
                skill.id ??
                `${skill.skill_name}-${index}`
              }
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">
                    {skill.skill_name ??
                      skill.name ??
                      `Skill #${skill.skill_id}`}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Required: {requiredScore}%
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    matched
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {matched ? "Matched" : "Skill Gap"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">
                    Candidate
                  </p>
                  <p className="mt-1 font-bold">
                    {candidateScore}%
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">
                    Required
                  </p>
                  <p className="mt-1 font-bold">
                    {requiredScore}%
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">
                    Gap
                  </p>
                  <p
                    className={`mt-1 font-bold ${
                      gap > 0
                        ? "text-red-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {gap}%
                  </p>
                </div>
              </div>
            </div>
          );
        },
      )}
    </div>
  )}
</div>
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   REUSABLE COMPONENTS
============================================================ */

function SidebarItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
function KpiCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
          {icon}
        </div>
      </div>

      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
          {icon}
        </div>

        <div>
          <h2 className="font-bold">
            {title}
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>

      {action}
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-1 py-3 text-sm font-bold ${
        active
          ? "border-emerald-600 text-emerald-700"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function OpportunityCard({
  type,
  opportunity,
  onSkills,
}: {
  type: OpportunityTab;
  opportunity: Internship | Job;
  onSkills: () => void;
}) {
  const item =
    opportunity as any;

  return (
    <div className="rounded-2xl border border-slate-200 p-5 transition hover:border-emerald-300 hover:shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClasses(
              item.status,
            )}`}
          >
            {statusLabel(
              item.status,
            )}
          </span>

          <h3 className="mt-3 font-bold">
            {item.title}
          </h3>
        </div>

        {item.verified && (
          <ShieldCheck
            size={19}
            className="text-emerald-600"
          />
        )}
      </div>

      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
        {item.description ??
          "AYUSH opportunity"}
      </p>

      <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
        <span className="flex items-center gap-1.5">
          <MapPin size={14} />
          {item.location ??
            "Location not specified"}
        </span>

        <span className="flex items-center gap-1.5">
          <CalendarDays
            size={14}
          />
          {formatDate(
            item.application_deadline,
          )}
        </span>

        {type ===
          "INTERNSHIP" && (
          <span className="flex items-center gap-1.5">
            <Clock3 size={14} />
            {item.duration ??
              "Duration not specified"}
          </span>
        )}

        {type === "JOB" && (
          <span className="flex items-center gap-1.5">
            <BriefcaseBusiness
              size={14}
            />
            {item.employment_type ??
              "Employment type not specified"}
          </span>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={onSkills}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50"
        >
          <Target size={14} />
          Required Skills
        </button>

        <button
          onClick={onSkills}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
        >
          Recruitment
          <ChevronRight
            size={14}
          />
        </button>
      </div>
    </div>
  );
}

function InsightCard({
  icon,
  title,
  value,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  value: number | string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-3 inline-flex rounded-lg bg-indigo-50 p-2 text-indigo-600">
        {icon}
      </div>

      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-2xl font-bold">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function DemandCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <div className="mb-3 w-fit rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
        {icon}
      </div>

      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}

function CollaborationCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-xl font-bold">
        {value}
      </p>
    </div>
  );
}

function AnalyticsCard({
  title,
  value,
  percentage,
}: {
  title: string;
  value: number;
  percentage: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          {title}
        </p>

        <span className="text-sm font-bold text-emerald-700">
          {percentage.toFixed(1)}%
        </span>
      </div>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{
            width: `${Math.min(
              100,
              Math.max(
                0,
                percentage,
              ),
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

function MetricBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-lg font-bold">
        {value}
      </p>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  disabled,
  primary = false,
  danger = false,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition disabled:opacity-50 ${
        danger
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : primary
            ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="rounded-xl bg-slate-100 p-3 text-slate-500">
        {icon}
      </div>

      <p className="mt-3 font-semibold">
        {title}
      </p>

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <h2 className="font-bold">
            {title}
          </h2>

          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X size={19} />
          </button>
        </div>

        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-600">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}

function FormTextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-600">
        {label}
      </span>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        placeholder={placeholder}
        rows={4}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}