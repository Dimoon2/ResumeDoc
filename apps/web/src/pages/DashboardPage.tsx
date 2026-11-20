import { WorkspaceProvider } from "../contexts/WorkspaceContext";
import { DashboardWorkspace } from "../components/dashboard/DashboardWorkspace";

export default function DashboardPage() {
  return (
    <WorkspaceProvider>
      <DashboardWorkspace />
    </WorkspaceProvider>
  );
}