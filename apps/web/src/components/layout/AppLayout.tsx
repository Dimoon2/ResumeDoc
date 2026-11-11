import { Outlet, Navigate } from "react-router-dom";

// Contenedor de rutas privadas. Se amplía con navegación del área de documentos.
export default function AppLayout() {
  return <Outlet />;
}
