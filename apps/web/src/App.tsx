import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoadingState } from "./components/States";
import { AuthProvider } from "./context/AuthContext";
import { OrganizationProvider } from "./context/OrganizationContext";
import { ToastProvider } from "./context/ToastContext";

const ApprovalsPage = lazy(() =>
  import("./pages/ApprovalsPage").then((module) => ({
    default: module.ApprovalsPage,
  })),
);
const AuditPage = lazy(() =>
  import("./pages/AuditPage").then((module) => ({ default: module.AuditPage })),
);
const AuthPages = import("./pages/AuthPages");
const AuthCallbackPage = lazy(() =>
  AuthPages.then((module) => ({ default: module.AuthCallbackPage })),
);
const ResetPasswordPage = lazy(() =>
  AuthPages.then((module) => ({ default: module.ResetPasswordPage })),
);
const SignInPage = lazy(() =>
  AuthPages.then((module) => ({ default: module.SignInPage })),
);
const SignUpPage = lazy(() =>
  AuthPages.then((module) => ({ default: module.SignUpPage })),
);
const UnauthorizedPage = lazy(() =>
  AuthPages.then((module) => ({ default: module.UnauthorizedPage })),
);
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const IncidentDetailPage = lazy(() =>
  import("./pages/IncidentDetailPage").then((module) => ({
    default: module.IncidentDetailPage,
  })),
);
const IncidentsPage = lazy(() =>
  import("./pages/IncidentsPage").then((module) => ({
    default: module.IncidentsPage,
  })),
);
const IntegrationsPage = lazy(() =>
  import("./pages/IntegrationsPage").then((module) => ({
    default: module.IntegrationsPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("./pages/NotFoundPage").then((module) => ({
    default: module.NotFoundPage,
  })),
);
const RunDetailPage = lazy(() =>
  import("./pages/RunDetailPage").then((module) => ({
    default: module.RunDetailPage,
  })),
);
const RunsPage = lazy(() =>
  import("./pages/RunsPage").then((module) => ({ default: module.RunsPage })),
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);
const WorkflowDetailPage = lazy(() =>
  import("./pages/WorkflowDetailPage").then((module) => ({
    default: module.WorkflowDetailPage,
  })),
);
const WorkflowsPage = lazy(() =>
  import("./pages/WorkflowsPage").then((module) => ({
    default: module.WorkflowsPage,
  })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15_000,
      refetchOnWindowFocus: true,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <OrganizationProvider>
              <Suspense fallback={<LoadingState label="Loading secure view" />}>
                <Routes>
                  <Route path="/sign-in" element={<SignInPage />} />
                  <Route path="/sign-up" element={<SignUpPage />} />
                  <Route
                    path="/reset-password"
                    element={<ResetPasswordPage />}
                  />
                  <Route path="/auth/callback" element={<AuthCallbackPage />} />
                  <Route path="/unauthorized" element={<UnauthorizedPage />} />
                  <Route element={<ProtectedRoute />}>
                    <Route element={<AppShell />}>
                      <Route index element={<DashboardPage />} />
                      <Route path="workflows" element={<WorkflowsPage />} />
                      <Route
                        path="workflows/:workflowId"
                        element={<WorkflowDetailPage />}
                      />
                      <Route path="runs" element={<RunsPage />} />
                      <Route path="runs/:runId" element={<RunDetailPage />} />
                      <Route path="incidents" element={<IncidentsPage />} />
                      <Route
                        path="incidents/:incidentId"
                        element={<IncidentDetailPage />}
                      />
                      <Route path="approvals" element={<ApprovalsPage />} />
                      <Route
                        path="integrations"
                        element={<IntegrationsPage />}
                      />
                      <Route path="audit" element={<AuditPage />} />
                      <Route path="settings" element={<SettingsPage />} />
                      <Route path="*" element={<NotFoundPage />} />
                    </Route>
                  </Route>
                </Routes>
              </Suspense>
            </OrganizationProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
