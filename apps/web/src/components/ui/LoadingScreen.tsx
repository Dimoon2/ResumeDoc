export default function LoadingScreen() {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <span className="spinner" />
      <span>Preparando tu espacio...</span>
    </div>
  );
}
