import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useOrganization } from "../context/OrganizationContext";
import { LoadingState } from "./States";
import { OrganizationSetup } from "../pages/OrganizationSetup";

export function ProtectedRoute() {
  const { loading, user } = useAuth();
  const organizationContext = useOrganization();
  if (loading || (user && organizationContext.loading)) {
    return (
      <div className="centered-state">
        <LoadingState label="Checking your secure workspace" />
      </div>
    );
  }
  if (!user) return <Navigate to="/sign-in" replace />;
  if (!organizationContext.organization) return <OrganizationSetup />;
  return <Outlet />;
}
