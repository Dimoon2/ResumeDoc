import type { SummaryDocument, User } from "../types/summary";

export const WORKSPACE_USERS: User[] = [
  {
    id: "user-carlos",
    name: "Carlos Mendoza",
    initials: "CM",
    role: "Director Jurídico",
    department: "Cumplimiento y Legal",
    email: "carlos.mendoza@resumedoc.io",
  },
  {
    id: "user-lucia",
    name: "Lucía Fernández",
    initials: "LF",
    role: "VP de Finanzas",
    department: "Planificación Financiera",
    email: "lucia.fernandez@resumedoc.io",
  },
  {
    id: "user-mateo",
    name: "Mateo Ruiz",
    initials: "MR",
    role: "Arquitecto Principal",
    department: "Infraestructura Cloud",
    email: "mateo.ruiz@resumedoc.io",
  },
  {
    id: "user-sofia",
    name: "Sofía Navarro",
    initials: "SN",
    role: "Líder de Talento",
    department: "Personas y Cultura",
    email: "sofia.navarro@resumedoc.io",
  },
];

export function buildInitialDocuments(currentUser: User): SummaryDocument[] {
  return [
    {
      id: "doc-1",
      title: "Auditoría de Cumplimiento GDPR y Gobernanza de Datos Q4",
      fileName: "Auditoria_GDPR_Q4_2026.pdf",
      fileType: "PDF",
      fileSizeLabel: "2.4 MB",
      createdAt: "14 nov 2026",
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      isOwnedByMe: true,
      executiveSummary:
        "La revisión trimestral de privacidad confirma un nivel de conformidad del 96% en los flujos de procesamiento documental europeos, con tres brechas menores asociadas a la retención automática de registros temporales en entornos de prueba.\n\nSe recomienda ejecutar la purga automatizada cada 14 días y actualizar el anexo de subencargados antes del cierre fiscal para mantener la certificación ISO 27701 sin observaciones.",
      keyPoints: [
        "El cifrado en reposo AES-256 cubre el 100% de los repositorios documentales activos.",
        "Los tiempos medios de respuesta ante solicitudes de supresión bajaron de 11 días a 3.4 días.",
        "Tres entornos de staging conservan copias anonimizadas con metadatos de sesión superiores a 30 días.",
      ],
      actionItems: [
        {
          owner: "Seguridad de la Información",
          task: "Implementar política TTL de 14 días en buckets de staging.",
          priority: "Alta",
        },
        {
          owner: "Legal Corporativo",
          task: "Renovar cláusulas contractuales tipo (SCC) con proveedores externos.",
          priority: "Media",
        },
      ],
      topics: ["Cumplimiento GDPR", "Gobernanza", "Seguridad"],
      wordCountOriginal: 6420,
      wordCountSummary: 198,
      readingTimeMinutes: 2,
      sourceExcerpt:
        "Sección 4.2 — Controles de Retención y Minimización: Durante el ejercicio Q4 2026 se auditaron 18 repositorios productivos y 4 entornos de preproducción...",
      sharedWith: [
        { userId: "user-carlos", permission: "Editor", sharedAt: "14 nov 2026" },
        { userId: "user-lucia", permission: "Exportar", sharedAt: "15 nov 2026" },
      ],
    },
    {
      id: "doc-2",
      title: "Acuerdo Marco de Nivel de Servicio — Proveedor Cloud Iberia",
      fileName: "SLA_Cloud_Iberia_2027.pdf",
      fileType: "PDF",
      fileSizeLabel: "1.1 MB",
      createdAt: "11 nov 2026",
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      isOwnedByMe: true,
      executiveSummary:
        "El nuevo contrato de infraestructura establece una disponibilidad garantizada del 99.95% para clústeres críticos de procesamiento, reduciendo la ventana máxima de mantenimiento programado a 90 minutos mensuales.\n\nLas penalizaciones por incumplimiento escalan al 15% de la factura mensual cuando el tiempo de recuperación supera los 45 minutos.",
      keyPoints: [
        "Disponibilidad mensual garantizada de 99.95% con créditos automáticos.",
        "RTO comprometido de 30 minutos y RPO de 5 minutos.",
        "Congelación de tarifas por volumen durante 24 meses.",
      ],
      actionItems: [
        {
          owner: "Compras TI",
          task: "Validar anexo de precios por terabyte antes de la firma.",
          priority: "Alta",
        },
      ],
      topics: ["Contratos SLA", "Infraestructura", "Proveedores"],
      wordCountOriginal: 4890,
      wordCountSummary: 175,
      readingTimeMinutes: 2,
      sourceExcerpt:
        "Cláusula 7 — Créditos de Servicio y Continuidad: En caso de indisponibilidad verificada superior a 21.6 minutos acumulados en un mes calendario...",
      sharedWith: [
        { userId: "user-mateo", permission: "Editor", sharedAt: "12 nov 2026" },
      ],
    },
    {
      id: "doc-3",
      title: "Planificación Presupuestaria y Eficiencia Operativa 2027",
      fileName: "Presupuesto_Operativo_2027.pdf",
      fileType: "PDF",
      fileSizeLabel: "3.8 MB",
      createdAt: "08 nov 2026",
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      isOwnedByMe: true,
      executiveSummary:
        "La proyección financiera 2027 prioriza un crecimiento neto del 18% en margen operativo mediante la consolidación de licencias redundantes y la automatización de flujos documentales internos.",
      keyPoints: [
        "Ahorro anual estimado de 148.000 € por racionalización de herramientas.",
        "Retorno positivo de inversión proyectado para el segundo trimestre.",
      ],
      actionItems: [
        {
          owner: "Finanzas",
          task: "Presentar desglose por centro de coste al comité ejecutivo.",
          priority: "Alta",
        },
      ],
      topics: ["Presupuesto 2027", "Margen Operativo", "Eficiencia"],
      wordCountOriginal: 8150,
      wordCountSummary: 162,
      readingTimeMinutes: 2,
      sourceExcerpt:
        "Resumen Financiero Consolidado: Los ingresos recurrentes anuales proyectados alcanzan los 14.2M €...",
      sharedWith: [
        { userId: "user-lucia", permission: "Editor", sharedAt: "09 nov 2026" },
      ],
    },
    {
      id: "doc-shared-1",
      title: "Dictamen Legal sobre Firma Electrónica Cualificada eIDAS 2",
      fileName: "Dictamen_eIDAS2_Firma.pdf",
      fileType: "PDF",
      fileSizeLabel: "1.9 MB",
      createdAt: "15 nov 2026",
      ownerId: "user-carlos",
      ownerName: "Carlos Mendoza",
      isOwnedByMe: false,
      sharedByUserId: "user-carlos",
      sharedPermission: "Exportar",
      executiveSummary:
        "El reglamento eIDAS 2 introduce la Cartera Europea de Identidad Digital con validez transfronteriza obligatoria antes de finales de 2027.\n\nNuestra arquitectura actual es compatible en un 85%, requiriendo sellos temporales certificados adicionales.",
      keyPoints: [
        "Validez jurídica equivalente a firma manuscrita en los 27 Estados miembros.",
        "Conservación probatoria ampliada a 10 años para expedientes contractuales.",
      ],
      actionItems: [
        {
          owner: "Carlos Mendoza",
          task: "Homologar prestador cualificado de sellado de tiempo.",
          priority: "Alta",
        },
      ],
      topics: ["eIDAS 2", "Firma Digital", "Regulación UE"],
      wordCountOriginal: 5310,
      wordCountSummary: 156,
      readingTimeMinutes: 2,
      sourceExcerpt:
        "Conclusión Jurídica: La transición hacia la Cartera de Identidad Digital Europea exige interoperabilidad API antes del Q3 2027...",
      sharedWith: [],
    },
    {
      id: "doc-shared-2",
      title: "Cierre Financiero Q3 y Previsión de Flujo de Caja",
      fileName: "Cierre_Q3_Cashflow_2026.pdf",
      fileType: "PDF",
      fileSizeLabel: "4.1 MB",
      createdAt: "13 nov 2026",
      ownerId: "user-lucia",
      ownerName: "Lucía Fernández",
      isOwnedByMe: false,
      sharedByUserId: "user-lucia",
      sharedPermission: "Exportar",
      executiveSummary:
        "El cierre del tercer trimestre supera en un 6.4% el objetivo de flujo de caja operativo gracias a la mejora en el periodo medio de cobro.",
      keyPoints: [
        "EBITDA ajustado alcanza el 24.8% sobre facturación neta trimestral.",
        "Reducción del 14% en morosidad superior a 60 días.",
      ],
      actionItems: [
        {
          owner: "Tesorería",
          task: "Reinvertir excedente a corto plazo en instrumentos de liquidez diaria.",
          priority: "Media",
        },
      ],
      topics: ["EBITDA", "Tesorería", "Cierre Q3"],
      wordCountOriginal: 7240,
      wordCountSummary: 152,
      readingTimeMinutes: 2,
      sourceExcerpt:
        "Estado de Flujos de Efectivo: La generación neta de caja operativa ascendió a 1.84M €...",
      sharedWith: [],
    },
    {
      id: "doc-shared-3",
      title: "Arquitectura de Búsqueda Vectorial Híbrida",
      fileName: "RFC_019_Busqueda_Hibrida.pdf",
      fileType: "JPG",
      fileSizeLabel: "980 KB",
      createdAt: "12 nov 2026",
      ownerId: "user-mateo",
      ownerName: "Mateo Ruiz",
      isOwnedByMe: false,
      sharedByUserId: "user-mateo",
      sharedPermission: "Editor",
      executiveSummary:
        "La propuesta técnica define la transición hacia un índice híbrido BM25 + embeddings densos para mejorar la precisión de recuperación en documentos extensos.",
      keyPoints: [
        "Reducción de latencia p95 a 85 ms en pruebas de carga.",
        "Particionamiento por tenant para aislamiento estricto de índices.",
      ],
      actionItems: [
        {
          owner: "Mateo Ruiz",
          task: "Ejecutar benchmark final con 500k fragmentos indexados.",
          priority: "Alta",
        },
      ],
      topics: ["Arquitectura", "Búsqueda Híbrida", "Latencia"],
      wordCountOriginal: 3980,
      wordCountSummary: 149,
      readingTimeMinutes: 2,
      sourceExcerpt:
        "Motivación: Los usuarios que buscan referencias normativas exactas junto con preguntas semánticas requieren índices híbridos...",
      sharedWith: [],
    },
    {
      id: "doc-shared-4",
      title: "Informe de Encuesta de Clima y Capacitación 2026",
      fileName: "Clima_Laboral_2026.pdf",
      fileType: "PNG",
      fileSizeLabel: "1.6 MB",
      createdAt: "06 nov 2026",
      ownerId: "user-sofia",
      ownerName: "Sofía Navarro",
      isOwnedByMe: false,
      sharedByUserId: "user-sofia",
      sharedPermission: "Lectura",
      executiveSummary:
        "La encuesta anual registró una participación del 91% y un eNPS de +48, destacando la claridad estratégica como principal fortaleza.",
      keyPoints: [
        "Satisfacción general con herramientas de productividad alcanza 4.6 sobre 5.",
        "Retención voluntaria anual mejora 4 puntos respecto al ejercicio anterior.",
      ],
      actionItems: [
        {
          owner: "Sofía Navarro",
          task: "Lanzar programa de mentoría cruzada en enero de 2027.",
          priority: "Media",
        },
      ],
      topics: ["Clima Laboral", "Formación", "eNPS"],
      wordCountOriginal: 4100,
      wordCountSummary: 145,
      readingTimeMinutes: 1,
      sourceExcerpt:
        "Resultados por Dimensión: El índice de alineamiento con objetivos corporativos obtuvo un 88% de respuestas favorables...",
      sharedWith: [],
    },
  ];
}