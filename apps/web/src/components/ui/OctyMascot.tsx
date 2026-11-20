export type OctyPose =
  | "neutral"
  | "waving"
  | "thinking"
  | "celebrating"
  | "error";

interface OctyMascotProps {
  pose?: OctyPose;
  size?: number;
  className?: string;
  label?: string;
}

export function OctyMascot({
  pose = "neutral",
  size = 120,
  className = "",
  label = "Octy, asistente de ResumeDoc",
}: OctyMascotProps) {
  const isWaving = pose === "waving";
  const isThinking = pose === "thinking";
  const isCelebrating = pose === "celebrating";
  const isError = pose === "error";

  // Brazo izquierdo según la pose
  const leftArmPath = isWaving
    ? "M38 59 C25 56 17 45 20 35 C22 29 29 30 30 37 C31 44 35 50 42 54 Z"
    : isCelebrating
      ? "M38 58 C24 51 18 38 22 29 C25 23 32 25 32 33 C32 41 36 48 42 53 Z"
      : isThinking
        ? "M38 60 C25 63 23 76 34 78 C41 79 46 74 47 68 Z"
        : "M38 58 C26 62 19 72 22 80 C24 85 30 85 33 79 C36 73 38 68 43 65 Z";

  // Brazo derecho según la pose
  const rightArmPath = isCelebrating
    ? "M82 58 C96 51 102 38 98 29 C95 23 88 25 88 33 C88 41 84 48 78 53 Z"
    : isError
      ? "M82 58 C94 59 102 67 99 75 C97 80 91 80 88 74 C86 70 83 67 77 65 Z"
      : "M82 58 C94 62 101 72 98 80 C96 85 90 85 87 79 C84 73 82 68 77 65 Z";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={label}
      className={className}
    >
      {/* Tentáculos traseros (profundidad) */}
      <path
        d="M39 64 C34 75 31 85 34 90 C36 93 41 91 42 85 C43 79 44 72 46 67 Z"
        fill="#1E5A9C"
      />
      <path
        d="M81 64 C86 75 89 85 86 90 C84 93 79 91 78 85 C77 79 76 72 74 67 Z"
        fill="#1E5A9C"
      />

      {/* Tentáculos frontales inferiores */}
      <path
        d="M44 65 C42 78 40 90 44 96 C47 100 53 98 53 92 C53 84 53 75 55 68 Z"
        fill="#3E8FD6"
        stroke="#1E5A9C"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M76 65 C78 78 80 90 76 96 C73 100 67 98 67 92 C67 84 67 75 65 68 Z"
        fill="#3E8FD6"
        stroke="#1E5A9C"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Brazos laterales (cambian según pose) */}
      <path
        d={leftArmPath}
        fill="#3E8FD6"
        stroke="#1E5A9C"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d={rightArmPath}
        fill="#3E8FD6"
        stroke="#1E5A9C"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Cabeza / Manto principal */}
      <path
        d="M32 52 C32 30 43 18 60 18 C77 18 88 30 88 52 C88 65 78 72 60 72 C42 72 32 65 32 52 Z"
        fill="#3E8FD6"
        stroke="#1E5A9C"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Brillo superior tecnológico */}
      <path
        d="M40 36 C42 28 49 23 57 22.5"
        stroke="#7FC4F2"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="63.5" cy="23" r="1.8" fill="#BFE3FA" />

      {/* Visor facial consistente */}
      <rect x="39" y="38" width="42" height="22" rx="11" fill="#1E5A9C" />

      {/* Expresión facial según pose */}
      {pose === "neutral" && (
        <g>
          <rect x="47.5" y="44" width="5" height="8" rx="2.5" fill="#EAF6FF" />
          <rect x="67.5" y="44" width="5" height="8" rx="2.5" fill="#EAF6FF" />
          <path
            d="M56 54.5 C58 56.5 62 56.5 64 54.5"
            stroke="#7FC4F2"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      )}

      {pose === "waving" && (
        <g>
          <rect x="47.5" y="44" width="5" height="8" rx="2.5" fill="#EAF6FF" />
          <path
            d="M66.5 48.5 C68 45 72 45 73.5 48.5"
            stroke="#EAF6FF"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d="M55 54 C57.5 57 62.5 57 65 54"
            stroke="#7FC4F2"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* Ondas sutiles de saludo */}
          <path
            d="M14 33 C11.5 37 11.5 42 14 46"
            stroke="#7FC4F2"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M10 36 C8.5 38.5 8.5 41.5 10 44"
            stroke="#BFE3FA"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      )}

      {pose === "thinking" && (
        <g>
          {/* Ojos mirando hacia arriba a la derecha */}
          <rect x="50" y="42.5" width="4.5" height="7" rx="2.25" fill="#EAF6FF" />
          <rect x="69.5" y="43.5" width="4.5" height="5" rx="2.25" fill="#7FC4F2" />
          <path
            d="M56.5 54.5 L63 53.5"
            stroke="#7FC4F2"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Burbujas geométricas de pensamiento */}
          <circle cx="88" cy="24" r="2.2" fill="#7FC4F2" />
          <circle
            cx="95"
            cy="18"
            r="3.2"
            fill="#BFE3FA"
            stroke="#3E8FD6"
            strokeWidth="1.5"
          />
          <circle
            cx="103"
            cy="11.5"
            r="4.2"
            fill="#EAF6FF"
            stroke="#3E8FD6"
            strokeWidth="1.5"
          />
        </g>
      )}

      {pose === "celebrating" && (
        <g>
          <path
            d="M46.5 49 C48 45 52 45 53.5 49"
            stroke="#EAF6FF"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M66.5 49 C68 45 72 45 73.5 49"
            stroke="#EAF6FF"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M54 53.5 C56.5 57.5 63.5 57.5 66 53.5"
            stroke="#7FC4F2"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          {/* Destellos geométricos de éxito */}
          <path
            d="M17 15 L18.5 19.5 L23 21 L18.5 22.5 L17 27 L15.5 22.5 L11 21 L15.5 19.5 Z"
            fill="#7FC4F2"
          />
          <path
            d="M103 15 L104.5 19.5 L109 21 L104.5 22.5 L103 27 L101.5 22.5 L97 21 L101.5 19.5 Z"
            fill="#3E8FD6"
          />
        </g>
      )}

      {pose === "error" && (
        <g>
          {/* Ojos asimétricos de duda / error */}
          <circle cx="49.5" cy="48" r="3.5" fill="#EAF6FF" />
          <rect x="66.5" y="46.8" width="6.5" height="2.8" rx="1.4" fill="#7FC4F2" />
          {/* Boca ondulada de incertidumbre */}
          <path
            d="M54 55 C56 53.5 58 56.5 60 55 C62 53.5 64 56.5 66 55"
            stroke="#7FC4F2"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Espiral geométrica de confusión (sin texto) */}
          <path
            d="M91 22 C94 17 101 18.5 99.5 24 C98.5 27.5 93.5 27 94 24"
            stroke="#3E8FD6"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="95.5" cy="30" r="1.4" fill="#7FC4F2" />
        </g>
      )}
    </svg>
  );
}