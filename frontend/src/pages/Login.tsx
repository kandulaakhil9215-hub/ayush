import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      await login(email, password);

      const role = localStorage.getItem("user_role");

      if (role === "STUDENT") {
        navigate("/student");
      } else if (role === "INDUSTRY") {
        navigate("/industry");
      } else if (role === "FACULTY" || role === "ACADEMICIAN") {
        navigate("/faculty");
      } else if (role === "INSTITUTION_ADMIN") {
        navigate("/institution");
      } else {
        navigate("/admin");
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        "Login failed. Please check your credentials.";

      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* Left branding panel */}
        <div className="hidden bg-slate-950 px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500">
                <ShieldCheck size={25} />
              </div>

              <div>
                <p className="text-lg font-bold">
                  AYUSH Connect
                </p>
                <p className="text-xs text-slate-400">
                  Academia–Industry Collaboration Platform
                </p>
              </div>
            </div>
          </div>

          <div className="max-w-xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-400">
              Digital Skill Ecosystem
            </p>

            <h1 className="text-5xl font-bold leading-tight">
              Connecting AYUSH talent with opportunity.
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
              A unified platform for students, academicians, institutions
              and AYUSH industry partners to develop skills, discover
              opportunities and build meaningful collaborations.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-2xl font-bold">Skills</p>
                <p className="mt-1 text-sm text-slate-400">
                  Assess & verify
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-2xl font-bold">Careers</p>
                <p className="mt-1 text-sm text-slate-400">
                  Match & grow
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-2xl font-bold">Industry</p>
                <p className="mt-1 text-sm text-slate-400">
                  Collaborate
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-500">
            AYUSH Academia–Industry Skill Mapping Platform
          </p>
        </div>

        {/* Login panel */}
        <div className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">

            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white">
                  <ShieldCheck size={25} />
                </div>

                <div>
                  <p className="text-lg font-bold text-slate-900">
                    AYUSH Connect
                  </p>
                  <p className="text-xs text-slate-500">
                    Academia–Industry Platform
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-sm font-semibold text-emerald-600">
                SECURE PORTAL ACCESS
              </p>

              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                Welcome back
              </h2>

              <p className="mt-2 text-slate-500">
                Sign in to access your AYUSH ecosystem dashboard.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50"
            >
              {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-7 flex w-full items-center justify-center rounded-xl bg-emerald-600 py-3.5 font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in to platform"}
              </button>

              <div className="mt-6 border-t border-slate-100 pt-5 text-center">
                <p className="text-xs text-slate-400">
                  Secure role-based access • AYUSH ecosystem
                </p>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}