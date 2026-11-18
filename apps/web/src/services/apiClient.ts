const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function extractErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object" || !("detail" in payload)) {
    return "No se pudo completar la solicitud.";
  }

  const { detail } = payload as { detail?: unknown };

  if (typeof detail === "string") {
    return detail;
  }

  // Errores 422 de FastAPI/Pydantic vienen como array de objetos { msg: string }
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) =>
        typeof item === "object" && item && "msg" in item
          ? String((item as { msg: unknown }).msg)
          : "",
      )
      .filter(Boolean);

    if (messages.length > 0) return messages.join(" ");
  }

  return "No se pudo completar la solicitud.";
}

async function baseFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);

  // Solo añadimos Content-Type JSON si NO estamos enviando FormData y no fue definido ya
  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: "include", // Imprescindible para enviar la cookie HttpOnly access_token
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(extractErrorMessage(payload));
  }

  return response;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await baseFetch(path, init);

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function apiRequestText(path: string, init: RequestInit = {}): Promise<string> {
  const response = await baseFetch(path, init);
  return response.text();
}