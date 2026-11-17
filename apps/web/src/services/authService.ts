import { apiRequest } from "./apiClient";
import type {
  AuthResponse,
  LoginCredentials,
  RegisterData,
} from "../types/auth";

const USE_MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH !== "false";
const SESSION_KEY = "resumedoc.demo-session";

function wait(milliseconds = 450) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

/**
 * Adaptador de autenticación del frontend.
 *
 * El modo mock permite desarrollar las pantallas antes de que exista la API.
 * Al integrar FastAPI, se desactiva con VITE_USE_MOCK_AUTH=false.
 */
export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    if (USE_MOCK_AUTH) {
      await wait();
      if (!credentials.email || !credentials.password) {
        throw new Error("Introduce tu correo y contraseña.");
      }

      const response: AuthResponse = {
        user: {
          id: "demo-user",
          name: credentials.email.split("@")[0].replace(/[._-]/g, " "),
          email: credentials.email,
        },
        accessToken: "demo-session-token",
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(response));
      return response;
    }

    return apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    if (USE_MOCK_AUTH) {
      await wait();
      const response: AuthResponse = {
        user: {
          id: crypto.randomUUID(),
          name: data.name,
          email: data.email,
        },
        accessToken: "demo-session-token",
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(response));
      return response;
    }

    return apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async requestPasswordReset(email: string): Promise<void> {
    if (USE_MOCK_AUTH) {
      await wait();
      return;
    }

    await apiRequest<void>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async getSession(): Promise<AuthResponse | null> {
    if (!USE_MOCK_AUTH) {
      try {
        // El backend valida la cookie HttpOnly y devuelve el usuario actual.
        return await apiRequest<AuthResponse>("/auth/me", { method: "GET" });
      } catch {
        return null;
      }
    }

    const saved = sessionStorage.getItem(SESSION_KEY);
    return saved ? (JSON.parse(saved) as AuthResponse) : null;
  },

  async logout(): Promise<void> {
    if (USE_MOCK_AUTH) {
      sessionStorage.removeItem(SESSION_KEY);
      return;
    }

    await apiRequest<void>("/auth/logout", { method: "POST" });
  },
};