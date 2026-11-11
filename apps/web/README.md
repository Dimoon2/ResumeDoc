# ResumeDoc — Frontend

Frontend de ResumeDoc, una plataforma web para convertir documentos PDF e imágenes en texto consultable, resúmenes y visualizaciones.

## Requisitos

- Node.js 20.19+ o 22.12+
- npm 10+

## Instalación

Desde la **raíz del repositorio**, ejecuta un solo comando:

```bash
npm install
```

Las dependencias de la aplicación web se declaran en `apps/web/package.json`. La raíz utiliza npm workspaces para instalarlas todas en una única operación.

## Desarrollo

```bash
npm run dev
```

Vite mostrará la URL local (normalmente http://localhost:5173).

## Comprobaciones

```bash
npm run typecheck
npm run build
```

## Estructura

```text
.
├── apps/
│   ├── web/                  # Aplicación React + TypeScript + Tailwind
│   └── api/                  # Backend FastAPI + Python
├── packages/
│   ├── shared/               # Tipos y esquemas compartidos
│   └── db/                   # Trabajo del integrante de base de datos
├── package.json              # Workspaces; no instala dependencias propias
└── tsconfig.base.json
```

## Autenticación y backend

La interfaz incluye login, registro y recuperación de contraseña. Mientras el backend no esté integrado, `VITE_USE_MOCK_AUTH=true` permite probar el flujo visual con una sesión de demostración. El modo mock **no es autenticación real ni debe usarse en producción**.

Cuando FastAPI esté listo:

1. Define `VITE_USE_MOCK_AUTH=false` en `apps/web/.env`.
2. Configura `VITE_API_URL` con la URL base del backend.
3. Alinea con backend las rutas y el formato JSON descritos en `apps/web/src/services/authService.ts` (`POST /auth/login`, `POST /auth/register`, `POST /auth/forgot-password` y `GET /auth/me`).
4. Implementa en backend validación de credenciales, hash de contraseñas, autorización y gestión segura de sesión. El frontend no debe almacenar contraseñas.

## Convenciones

- Componentes reutilizables en `src/components`.
- Vistas/rutas en `src/pages`.
- Comunicación HTTP en `src/services`.
- Estado transversal en `src/contexts`.
- Tipos compartidos de frontend en `src/types`.
- Estilos globales y tokens en `src/styles`.

No se implementa OCR, persistencia documental ni lógica de negocio del backend en este repositorio frontend.
