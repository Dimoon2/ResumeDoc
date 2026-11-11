import { ArrowRight, BarChart3, FileSearch, FileText, FolderOpen, ScanText, Sparkles, UploadCloud } from "lucide-react";
import { Link } from "react-router-dom";
import SiteHeader from "../components/layout/SiteHeader";

const features = [
  {
    icon: ScanText,
    title: "Texto listo para consultar",
    description: "Extrae el contenido de PDFs e imágenes mediante reconocimiento óptico de caracteres (OCR).",
  },
  {
    icon: FileText,
    title: "Resúmenes claros",
    description: "Encuentra las ideas principales sin tener que leer cada página del documento.",
  },
  {
    icon: BarChart3,
    title: "Información visual",
    description: "Comprende patrones, fechas y palabras clave con gráficos sencillos.",
  },
  {
    icon: FolderOpen,
    title: "Todo organizado",
    description: "Mantén tus documentos disponibles y localiza la información que necesitas.",
  },
];

export default function LandingPage() {
  return (
    <div className="landing-page">
      <SiteHeader />
      <main>
        <section className="hero-section">
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="eyebrow"><span className="eyebrow-dot" /> ANÁLISIS DOCUMENTAL MÁS SIMPLE</div>
              <h1>Tus documentos.<br /><span>Más claros.</span></h1>
              <p className="hero-description">
                Convierte documentos extensos o escaneados en resúmenes claros y visuales.
                Encuentra lo importante, sin perder tiempo.
              </p>
              <div className="hero-actions">
                <Link to="/registro" className="button button-primary">
                  Comenzar ahora <ArrowRight size={17} />
                </Link>
                <a href="#como-funciona" className="button button-secondary">Conocer más</a>
              </div>
              <div className="hero-note"><Sparkles size={15} /> De documentos complejos a ideas claras.</div>
            </div>

            <div className="hero-visual" aria-label="Vista ilustrativa de un resumen y gráficos">
              <div className="visual-orbit orbit-one" />
              <div className="visual-orbit orbit-two" />
              <div className="dashboard-preview">
                <div className="preview-header">
                  <div className="preview-brand"><span className="mini-brand-mark"><FileText size={13} /></span> Resumen del documento</div>
                  <span className="status-pill"><span /> Procesado</span>
                </div>
                <div className="preview-file"><div className="file-icon"><FileText size={19} /></div><div><strong>Informe_anual.pdf</strong><small>Documento PDF · 12 páginas</small></div></div>
                <div className="preview-divider" />
                <div className="preview-section-label">RESUMEN GENERAL</div>
                <div className="preview-text-line wide" /><div className="preview-text-line" /><div className="preview-text-line medium" />
                <div className="preview-bottom">
                  <div className="preview-chart">
                    <div className="preview-section-label">PALABRAS CLAVE</div>
                    <div className="bar-chart"><i /><i /><i /><i /><i /></div>
                    <div className="chart-legend"><span>Datos del documento</span></div>
                  </div>
                  <div className="preview-insight"><div className="insight-icon"><BarChart3 size={16} /></div><strong>Vista rápida</strong><small>Ideas y tendencias principales</small></div>
                </div>
              </div>
              <div className="floating-chip"><UploadCloud size={16} /> PDF e imágenes</div>
              <div className="floating-spark"><Sparkles size={17} /></div>
            </div>
          </div>
          <div className="hero-wave" />
        </section>

        <section className="features-section section-pad" id="beneficios">
          <div className="container">
            <div className="section-heading">
              <span className="eyebrow">UNA FORMA MÁS INTELIGENTE DE LEER</span>
              <h2>Lo importante, <span>de un vistazo.</span></h2>
              <p>Una experiencia sencilla para transformar información extensa en conocimiento útil.</p>
            </div>
            <div className="features-grid">
              {features.map(({ icon: Icon, title, description }) => (
                <article className="feature-card" key={title}>
                  <div className="feature-icon"><Icon size={22} strokeWidth={1.8} /></div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="how-section section-pad" id="como-funciona">
          <div className="container how-grid">
            <div className="how-copy">
              <span className="eyebrow">ASÍ DE FÁCIL</span>
              <h2>De un archivo a una visión completa.</h2>
              <p>ResumeDoc acompaña el proceso para que puedas centrarte en entender la información.</p>
              <Link to="/registro" className="text-link">Prueba la plataforma <ArrowRight size={16} /></Link>
            </div>
            <div className="steps-list">
              <div className="step-item"><span className="step-number">01</span><div><h3>Sube tu documento</h3><p>Selecciona un archivo PDF, PNG o JPG.</p></div><UploadCloud size={21} /></div>
              <div className="step-item"><span className="step-number">02</span><div><h3>Procesamos el contenido</h3><p>El sistema extrae y organiza el texto.</p></div><FileSearch size={21} /></div>
              <div className="step-item"><span className="step-number">03</span><div><h3>Consulta el resultado</h3><p>Visualiza el resumen y los datos principales.</p></div><BarChart3 size={21} /></div>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="container cta-inner">
            <div><span className="eyebrow">EMPIEZA HOY</span><h2>Haz que cada documento cuente.</h2><p>La información que necesitas, más cerca y más clara.</p></div>
            <Link to="/registro" className="button button-white">Crear mi cuenta <ArrowRight size={17} /></Link>
          </div>
        </section>
      </main>
      <footer className="site-footer"><div className="container footer-inner"><Link to="/" className="brand"><span className="brand-mark"><FileText size={18} /></span><span>Resume<span className="brand-accent">Doc</span></span></Link><span>© 2026 ResumeDoc. Plataforma de análisis documental.</span></div></footer>
    </div>
  );
}
