# Documentación — Frontend

Frontend de ResumeDoc: interfaz web para convertir documentos PDF e imágenes en texto consultable, resúmenes y visualizaciones. Construido con **React + TypeScript + Vite + Tailwind**. El código de esta parte vive en `apps/web/`.

> Este documento cubre únicamente el frontend. El arranque general del proyecto está en el [README principal](../README.md).

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

Vite mostrará la URL local (normalmente http://localhost:5173). También puedes lanzar solo el frontend con `./dev.ps1 web`, que entra en `apps/web` y ejecuta el mismo script.

## Comprobaciones

```bash
npm run typecheck
npm run build
```

## Estructura

```
apps/web/
├── src/
│   ├── components/   # componentes reutilizables
│   ├── pages/        # vistas/rutas
│   ├── services/     # comunicación HTTP (apiClient, authService, etc.)
│   ├── contexts/     # estado transversal (AuthContext, WorkspaceContext)
│   ├── types/        # tipos compartidos del frontend
│   ├── styles/       # estilos globales y tokens
│   └── utils/        # utilidades
├── package.json      # dependencias y scripts de Vite
├── vite.config.ts
└── tsconfig*.json
```

## Autenticación y configuración de la API

La interfaz incluye login, registro y panel de trabajo. Mientras la API no esté integrada, `VITE_USE_MOCK_AUTH=true` permite probar el flujo visual con una sesión de demostración. El modo mock **no es autenticación real ni debe usarse en producción**.

Para conectar con la API:

1. Define `VITE_USE_MOCK_AUTH=false` en `apps/web/.env`.
2. Configura `VITE_API_URL` con la URL base del backend (por defecto, `http://localhost:8000`).
3. Mantén alineadas las rutas y el formato JSON de [`src/services/authService.ts`](../apps/web/src/services/authService.ts).

El contrato de endpoints, cookies y refresco de sesión está descrito en [docs/api-auth-frontend.md](../docs/api-auth-frontend.md).

## Convenciones

- Componentes reutilizables en `src/components`.
- Vistas/rutas en `src/pages`.
- Comunicación HTTP en `src/services`.
- Estado transversal en `src/contexts`.
- Tipos compartidos de frontend en `src/types`.
- Estilos globales y tokens en `src/styles`.
