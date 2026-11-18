# Autenticación para el frontend

Guía para consumir la autenticación de ResumeDoc desde `apps/web` (o cualquier
cliente SPA). Todo lo descrito aquí **ya está implementado en el backend**:
login, registro, sesión con cookies `HttpOnly`, refresh con rotación y logout.

- API local por defecto: `http://localhost:8000`
- Documentación interactiva (Swagger): `/docs`
- Esquema OpenAPI: `/openapi.json`

> No guardes el token en `localStorage` ni lo leas con JavaScript: el access y
> el refresh viajan en cookies `HttpOnly`. El navegador las envía solo si usas
> `credentials: "include"` (fetch) o `withCredentials: true` (axios).

---

## 1. Antes de conectar

1. Backend levantado (véase `apps/api/README.md`).
2. En el `.env` del backend, `CORS_ORIGINS` debe incluir el origen exacto del
   front. Por defecto es `http://localhost:5173` (Vite) y ya está configurado.
3. En el front, `apps/web/.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_USE_MOCK_AUTH=false
```

Con `VITE_USE_MOCK_AUTH=true` (valor por defecto) el front usa una sesión de
demostración y **nunca llama a la API**.

4. Si el backend y el front están en el mismo sitio (localhost, o el mismo
   dominio/subdominios), no hace falta nada más. Si van a dominios distintos,
   véase la sección 7.

---

## 2. Endpoints

| Método | Ruta | Cuerpo | Éxito | Errores relevantes |
|---|---|---|---|---|
| `POST` | `/auth/register` | `{name, email, password}` | `201 {user}` + cookies | `409` correo duplicado, `422` validación |
| `POST` | `/auth/login` | `{email, password}` | `200 {user}` + cookies | `401` credenciales inválidas |
| `GET` | `/auth/me` | — | `200 {user}` | `401` sin sesión |
| `POST` | `/auth/refresh` | — (basta la cookie) o `{refresh_token}` | `200 {access_token}` + cookies | `401` inválido/expirado/revocado/reusado |
| `POST` | `/auth/logout` | — | `204` sin cuerpo | idempotente: siempre `204` |
| `POST` | `/auth/forgot-password` | `{email}` | `202` genérico | `422` validación |

`user` siempre tiene la forma:

```json
{ "user": { "id": 1, "name": "Ana Pérez", "email": "ana@correo.com" } }
```

El backend **no devuelve el token en el cuerpo** de login/registro: solo setea
las cookies. `/auth/refresh` devuelve `{ "access_token": "..." }` por
compatibilidad con clientes bearer, pero una SPA no necesita leerlo.

### Errores

- `401` → `{"detail": "Token de actualización inválido o expirado."}` (refresh)
  o `{"detail": "..."}` (credenciales).
- `422` → `{"detail": [{"msg": "...", ...}]}` (validación Pydantic). Puede ser
  un string o un array; el front ya tiene un extractor en `apiClient.ts`.
- `409` → correo ya registrado.

---

## 3. Cookies de sesión

| Cookie | Path | Max-Age | HttpOnly | SameSite | Secure |
|---|---|---|---|---|---|
| `access_token` | `/` | `JWT_ACCESS_TTL` (30 min) | Sí | `Lax` | `COOKIE_SECURE` |
| `refresh_token` | `/auth` | lo que reste hasta expirar (máx. 7 días) | Sí | `Lax` | `COOKIE_SECURE` |

- La cookie de refresh solo se envía a `/auth/*`; por eso `POST /auth/refresh`
  y `POST /auth/logout` funcionan sin body.
- `COOKIE_SECURE` es `false` en desarrollo HTTP y debe ser `true` con HTTPS.
- El refresh **no extiende** la vida de la sesión: a los 7 días del login hay
  que volver a autenticarse.

---

## 4. Flujo de sesión (obligatorio en el front)

1. Al cargar la app: `GET /auth/me`.
2. Si responde `401`: `POST /auth/refresh` (sin body).
3. Si el refresh responde `200`: reintentar la petición original.
4. Si el refresh responde `401`: sesión cerrada → limpiar estado y mandar a
   login.

Cada refresh **invalida el token anterior**. Si dos peticiones intentan
refrescar a la vez, la segunda presenta un token ya usado y el backend lo
interpreta como **robo/reuso: revoca toda la familia** y cierra la sesión. Por
eso el refresh debe ser **single-flight**: una única promesa compartida.

### Snippet (fetch + TypeScript)

```ts
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// Una sola promesa de refresh para todas las peticiones concurrentes.
let refreshPromise: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshPromise ??= fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

const NO_REFRESH_PATHS = ["/auth/login", "/auth/register", "/auth/refresh"];

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const send = () =>
    fetch(`${API_URL}${path}`, { ...init, credentials: "include" });

  let response = await send();

  if (response.status === 401 && !NO_REFRESH_PATHS.includes(path)) {
    if (await refreshSession()) {
      response = await send(); // reintento único
    }
  }

  if (response.status === 401) {
    window.dispatchEvent(new Event("resumedoc:session-expired"));
  }

  return response;
}
```

En `AuthContext`, escucha el evento para limpiar el usuario:

```tsx
useEffect(() => {
  const clear = () => setUser(null);
  window.addEventListener("resumedoc:session-expired", clear);
  return () => window.removeEventListener("resumedoc:session-expired", clear);
}, []);
```

Con axios basta con `withCredentials: true` en el interceptor y la misma
estrategia de una sola promesa de refresh.

### Login, sesión y logout

```ts
await fetch(`${API_URL}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ email, password }),
});

const me = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
const { user } = me.ok ? await me.json() : { user: null };

await fetch(`${API_URL}/auth/logout`, {
  method: "POST",
  credentials: "include",
}); // 204: revoca la familia y borra ambas cookies
```

El logout es idempotente: llamarlo sin sesión también responde `204`.

---

## 5. Checklist de integración

- [ ] `VITE_USE_MOCK_AUTH=false` y `VITE_API_URL` apunta al backend.
- [ ] Todas las peticiones usan `credentials: "include"` /
      `withCredentials: true`.
- [ ] `GET /auth/me` al cargar; `401` se trata como logged-out.
- [ ] Interceptor `401 → refresh → reintento único`, con refresh
      **single-flight**.
- [ ] `logout()` llama a `POST /auth/logout` y limpia el estado.
- [ ] El origen del front está en `CORS_ORIGINS`.
- [ ] No se guardan tokens en `localStorage`/`sessionStorage`.

Comportamiento esperado para probar a mano:

1. Login → 200 y dos cookies (`DevTools → Application → Cookies`).
2. Borrar la cookie `access_token` → `GET /auth/me` da 401 → refresh → 200.
3. Repetir el refresh con el token anterior (replay) → 401 y sesión revocada.
4. Logout → cookies desaparecen y `/auth/me` da 401.

---

## 6. Qué no necesita hacer el front

Rate limiting, purga de tokens expirados, revocación al cambiar contraseña y
límite de sesiones activas son endurecimiento del backend; no bloquean la
integración del MVP.

---

## 7. Despliegue: mismo sitio vs dominios distintos

Las cookies usan `SameSite=Lax`. Funciona si front y API comparten sitio
(localhost con distintos puertos, o `app.midominio.com` + `api.midominio.com`).

Si el front está en un dominio totalmente distinto (por ejemplo Vercel) y la
API en otro (por ejemplo Render), el navegador **no enviará las cookies** y el
refresh fallará. Opciones:

1. **Recomendado**: publicar la API bajo el mismo dominio que el front
   (proxy `/api` → backend).
2. Añadir en el backend `SameSite=None; Secure` configurable y protección CSRF
   explícita (aún no implementado).

---

## 8. Referencias

- Contrato y cookies: [`../apps/api/README.md`](../apps/api/README.md).
- Decisiones y pendientes del refresh: [`pendientes-refresh-cookies.md`](pendientes-refresh-cookies.md).
- Código de los endpoints: [`../apps/api/src/adapters/http/auth.py`](../apps/api/src/adapters/http/auth.py).
