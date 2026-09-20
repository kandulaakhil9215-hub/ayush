import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import api from "../services/api";

interface User {
  id: number;
  role: string;
  name?: string;
  email?: string;
  institution_id?: number | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("access_token"),
  );

  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      return null;
    }

    try {
      return JSON.parse(savedUser);
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem("access_token");

    if (!savedToken) {
      setToken(null);
      setUser(null);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);

    try {
      const formData = new URLSearchParams();

      formData.append("username", email);
      formData.append("password", password);

      const response = await api.post("/api/auth/login", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const data = response.data;
      const accessToken = data.access_token;

      if (!accessToken) {
        throw new Error("Login succeeded but no access token was returned.");
      }

      const backendUser = data.user;

      const userData: User = {
        id: Number(backendUser?.id ?? 0),
        role: String(backendUser?.roles?.[0] ?? "").toUpperCase(),
        name: backendUser?.full_name,
        email: backendUser?.email ?? email,
        institution_id:
          backendUser?.institution_id != null
            ? Number(backendUser.institution_id)
            : null,
      };

      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("user_role", userData.role);
      localStorage.setItem("user_id", String(userData.id));
      localStorage.setItem("user", JSON.stringify(userData));

      setToken(accessToken);
      setUser(userData);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user");

    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}