# Pendientes — Refresh tokens con cookies

> Estado: **implementado en backend** (B, C y D cerrados). El contrato para
> consumirlo desde el front está en
> [`docs/api-auth-frontend.md`](api-auth-frontend.md).

## Estado actual

### Hecho
- [x] Tabla `token_refresco` en `db/models.py:143`.
- [x] Migración `alembic/versions/e3f9a7c1b204_add_token_refresco.py`.
- [x] Entidad de dominio `RefreshToken` con reglas puras
      (`apps/api/src/domain/refresh_token.py`).
- [x] Tests de dominio (`apps/api/tests/test_refresh_token_domain.py`, 15 passed).
- [x] Rotación, revocación por familia y logout en
      `apps/api/src/application/usecases/auth.py`.
- [x] Cookies HttpOnly en `apps/api/src/adapters/http/auth.py`.
- [x] Persistencia real en `token_refresco`
      (`apps/api/src/adapters/persistence/sqlmodel_refresh_repo.py`) con
      `claim` atómico, probado contra Neon (incluida concurrencia con hilos).

### Decisiones tomadas
- Refresh token por **cookie HttpOnly** y, por compatibilidad, también por body bearer.
- Rotación en cada refresh: nuevo `jti`, misma `family`.
- Reuso de un token ya usado ⇒ **revocar toda la familia**.
- Expiración **absoluta**: login + `JWT_REFRESH_TTL`; rotar no la extiende.
- La migración **ya está aplicada a Neon** (ver sección 7): la tabla existía
  por `create_all` + `stamp`, sin el índice de expiración; se recreó con
  `downgrade d9b1c3e5f702` + `upgrade head`.

---

## 1. Puertos

### 1.1 `apps/api/src/application/ports/security.py`
- [x] Importar `RefreshTokenClaims`.
- [x] Cambiar `create_refresh_token(self, user)` por
      `create_refresh_token(self, user, jti: str, family: str)`.
- [x] Cambiar `decode_refresh_token(token) -> AuthContext | None` por
      `decode_refresh_token(token) -> RefreshTokenClaims | None`.
- [x] Mantener igual `create_access_token` / `decode_access_token` / `AuthContext`.

### 1.2 Nuevo `apps/api/src/application/ports/refresh_token_repository.py`
- [x] `create(token: RefreshToken) -> None`
- [x] `get(jti: str) -> RefreshToken | None`
- [x] `claim(jti: str, now: datetime) -> bool`
      (marca `used_at` solo si estaba libre; `False` si ya se usó o no existe)
- [x] `revoke_family(family: str, now: datetime) -> None`
- [x] (Opcional) `delete_expired(now: datetime) -> int`

---

## 2. Casos de uso (`apps/api/src/application/usecases/auth.py`)

- [x] `issue_session(user, refresh_repo, tokens, now=None) -> TokenPair`
      - crea `family = new_family()`
      - crea `new_refresh_token(...)`, lo persiste
      - firma refresh con `jti`/`family` y access
- [x] `login` / `register_user`: dejar de firmar tokens sueltos y usar
      `issue_session`.
- [x] `rotate_session(refresh_repo, repository, tokens, raw_refresh, now=None)`
      1. `decode_refresh_token`; `None` → `InvalidRefreshToken`
      2. `get(jti)`; inexistente → `InvalidRefreshToken`
      3. `is_reuse()` → `revoke_family` + `ReusedRefreshToken`
      4. `is_revoked()` → `RevokedRefreshToken`
      5. `is_expired(now)` → `ExpiredRefreshToken`
      6. `claim(jti, now)`; `False` (carrera) → revocar familia
      7. `repository.get_user(user_id)`; inexistente → `InvalidRefreshToken`
      8. nuevo token: mismo `family`, mismo `expires_at`; nuevo `jti`
      9. devolver `(user, TokenPair)`
- [x] `logout_session(refresh_repo, tokens, raw_refresh, now=None) -> None`
      - token válido → `revoke_family`
      - token inválido/ausente → no-op (logout idempotente)
- [x] Inyectar reloj (`now`) opcional para tests.

---

## 3. Adaptadores

### 3.1 `apps/api/src/adapters/security/jwt_adapter.py`
- [x] Refresh JWT incluye `jti` y `family`.
- [x] `decode_refresh_token` valida que ambos existan y sean strings.
- [x] Devuelve `RefreshTokenClaims`.
- [x] El access token sigue igual (sin `jti`/`family`).

### 3.2 `apps/api/src/adapters/persistence/memory.py`
- [x] `InMemoryRefreshTokenRepository`
      - dict por `jti`
      - `claim` con `threading.Lock` para atomicidad
      - `revoke_family` recorre la familia

### 3.3 Nuevo `apps/api/src/adapters/persistence/sqlmodel_refresh_repo.py`
- [x] Mapear `TokenRefresco` ↔ `RefreshToken`
      (`fecha_expiracion`, `fecha_creacion`, `fecha_uso`, `fecha_revocacion`).
- [x] Normalizar datetimes a UTC (Postgres devuelve aware/naive según driver).
- [x] `claim` atómico:
      `UPDATE token_refresco SET fecha_uso=:now WHERE jti=:jti AND fecha_uso IS NULL`
      y comprobar `rowcount == 1`.
- [x] `revoke_family`:
      `UPDATE ... SET fecha_revocacion=:now WHERE familia=:f AND fecha_revocacion IS NULL`.
- [x] Manejar `IntegrityError` al crear un `jti` duplicado.

### 3.4 `apps/api/src/main.py`
- [x] `app.state.refresh_repository`:
      memoria si `DATABASE_URL=memory://`; SQLModel llega en D.
- [x] Pasar el nuevo puerto a los endpoints vía dependencias.

---

## 4. HTTP y cookies

### 4.1 `apps/api/src/adapters/http/dependencies.py`
- [x] `REFRESH_COOKIE = "refresh_token"`.
- [x] `get_refresh_repository(request)`.
- [x] Helper para leer refresh desde cookie o, si falta, del body.

### 4.2 Cookie de sesión

| Cookie | Path | Max-Age | HttpOnly | SameSite | Secure |
|---|---|---|---|---|---|
| `access_token` | `/` | `JWT_ACCESS_TTL` | Sí | `lax` | Configurable |
| `refresh_token` | `/auth` | restante hasta `expires_at` | Sí | `lax` | Configurable |

- [x] `refresh_token` con `path=/auth` para no enviarse a `/documents`.
- [x] Al rotar, `max_age` = `expires_at - now` (no reiniciar 7 días).

### 4.3 `apps/api/src/adapters/http/auth.py`
- [x] `POST /auth/login`
      - autentica, emite sesión, setea **ambas** cookies
      - respuesta `{user}` intacta
- [x] `POST /auth/register`
      - crea usuario, emite sesión, setea ambas cookies
      - respuesta 201 `{user}` intacta
- [x] `POST /auth/refresh`
      - acepta cookie **o** body (`RefreshRequest | None`)
      - rota, setea ambas cookies
      - mantiene respuesta `{access_token}`
      - errores → 401 genérico
        `"Token de actualización inválido o expirado."`
- [x] `POST /auth/logout`
      - lee refresh desde cookie/body
      - revoca la familia
      - borra ambas cookies
      - 204 idempotente
- [x] `GET /auth/me` sin cambios (solo access).
- [x] `POST /auth/forgot-password` sin cambios.

### 4.4 `apps/api/src/adapters/http/schemas.py`
- [x] `RefreshRequest.refresh_token` opcional (`str | None = None`)
      para permitir el flujo por cookie.

### 4.5 Configuración
- [x] Setting opcional `COOKIE_SECURE` (default `false` en desarrollo).
- [x] Documentar que en producción debe ser `true` (HTTPS).

### 4.6 CSRF
- [x] `SameSite=Lax` + `path=/auth` mitiga el envío cross-site.
- [x] Si se necesita soporte cross-site, añadir token CSRF (fuera del MVP).

---

## 5. Tests

### 5.1 Actualizar
- [x] `apps/api/tests/test_auth.py:84-109`
      hoy crean el refresh con `tokens.create_refresh_token(user)` sin persistirlo;
      pasarán a hacer login real o a sembrar `refresh_repository`.
- [x] `apps/api/tests/test_auth.py:266-278` (refresh usado como access)
      ajustar a la nueva firma.

### 5.2 Nuevos
- [x] `tests/test_auth_refresh_flow.py`
      - login/register setean `access_token` y `refresh_token`
      - refresh rota y setea cookies nuevas
      - token viejo reusado ⇒ 401 y familia revocada
      - token revocado ⇒ 401
      - token expirado ⇒ 401
      - logout revoca y borra cookies
      - access sigue rechazando un refresh
- [x] `tests/test_refresh_repository_memory.py`
      - `claim` solo una vez
      - `revoke_family`
- [x] `tests/test_integration_db.py` y `tests/test_refresh_repository_sqlmodel.py`
      - repo SQLModel contra BD real (auto-skip sin infra o con `memory://`)
      - ejecutados contra Neon tras migrar; limpieza por familia/usuario

### 5.3 Comandos
```bash
cd apps/api
venv/bin/pytest
venv/bin/pyright
```

Dependencias ya instaladas en el `.venv` de la raíz
(`pip install -r apps/api/requirements.txt`). `pyright` no viene en ese
archivo: se ejecuta con `npx pyright --pythonpath ../../.venv/bin/python`.

---

## 6. Documentación

- [x] `apps/api/README.md`:
      - login/register setean 2 cookies
      - `/auth/refresh` acepta cookie o bearer
      - logout revoca la familia
      - tabla de cookies
- [x] `docs/pendientes.md`: marcar dominio como hecho y enlazar este archivo.
- [x] Documentar que el front aún no llama a `/auth/refresh`; para sesión
      deslizante debe hacer: `GET /auth/me` → 401 → `POST /auth/refresh` → reintentar.

---

## 7. Migración en Neon

- [x] Aplicada: la tabla existía por `create_all` + `stamp` (sin el índice
      `ix_token_refresco_fecha_expiracion`); se recreó de verdad con:
```bash
alembic downgrade d9b1c3e5f702
alembic upgrade head
```
- [x] `alembic current` → `e3f9a7c1b204 (head)`.
- [x] `alembic check` → `No new upgrade operations detected.`
- [x] `python -m scripts.check_db` lista `token_refresco`.
- [x] Índices presentes: `usuario_id`, `familia`, `fecha_expiracion`.

---

## 8. Endurecimiento posterior (no bloquea el MVP)

- [ ] `COOKIE_SECURE=true` en producción.
- [ ] Rate limiting en `/auth/login`, `/auth/register`, `/auth/refresh`.
- [ ] Purga periódica de `token_refresco` expirados (`delete_expired`).
- [ ] Revocar todas las sesiones ante cambio de contraseña.
- [ ] No loguear tokens ni payloads de cookies.
- [ ] Considerar límite de sesiones activas por usuario.

---

## 9. Orden recomendado

1. Puertos (`security.py` + `refresh_token_repository.py`).
2. `jwt_adapter` con `jti`/`family`.
3. Repositorio en memoria.
4. Casos de uso y sus tests.
5. HTTP + cookies + tests de flujo.
6. Repo SQLModel + test de integración.
7. Composición en `main.py`.
8. Documentación y migración cuando haya red.

---

## 10. Criterios de aceptación

- [x] Login y registro devuelven `{user}` y setean las 2 cookies con los atributos de la tabla.
- [x] `/auth/refresh` funciona por cookie y por body.
- [x] Cada refresh invalida el token anterior y emite uno nuevo de la misma familia.
- [x] Reusar un token usado ⇒ 401 y toda la familia queda revocada.
- [x] Logout revoca la familia y borra ambas cookies.
- [x] `/auth/me` y `/documents/*` siguen funcionando con el access token.
- [x] `pytest` verde y `pyright` sin errores.
- [x] `alembic check` sin diferencias (cuando Neon esté migrado).

---

## 11. Riesgos / bloqueos

| Riesgo | Mitigación |
|---|---|
| Tabla migrada sin el índice de expiración | Recreada con `downgrade` + `upgrade`; `alembic check` limpio |
| Dos refresh simultáneos | `claim` atómico implementado y probado con hilos en D |
| Datetimes naive vs aware | Normalizar a UTC en el adaptador |
| Tests viejos con la firma anterior | Actualizarlos en el mismo cambio del puerto |
| Front sin auto-refresh | Documentar el flujo `me → 401 → refresh` |
