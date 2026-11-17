import type {
  AuthResponse,
  LoginCredentials,
  RegisterData,
} from "../types/auth";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
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

    return request<AuthResponse>("/auth/login", {
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

    return request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async requestPasswordReset(email: string): Promise<void> {
    if (USE_MOCK_AUTH) {
      await wait();
      return;
    }

    await request<void>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async getSession(): Promise<AuthResponse | null> {
    if (!USE_MOCK_AUTH) {
      try {
        // El backend puede validar la cookie HttpOnly y devolver el usuario actual.
        return await request<AuthResponse>("/auth/me", { method: "GET" });
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
    // Añadir aquí el endpoint de cierre de sesión si el backend lo requiere.
  },
};

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? "No se pudo completar la solicitud.");
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
