import {
  Activity,
  Bell,
  Blocks,
  BookOpenCheck,
  ChevronDown,
  CircleGauge,
  FileClock,
  ListChecks,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Workflow,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useOrganization } from "../context/OrganizationContext";
import { useToast } from "../context/ToastContext";
import { errorMessage } from "../lib/errors";
import { initials, titleCase } from "../lib/format";
import { useRealtimeOrganization } from "../hooks/useRealtimeOrganization";

const navigation = [
  { label: "Dashboard", path: "/", icon: CircleGauge },
  { label: "Workflows", path: "/workflows", icon: Workflow },
  { label: "Runs", path: "/runs", icon: Activity },
  { label: "Incidents", path: "/incidents", icon: ShieldCheck },
  { label: "Approvals", path: "/approvals", icon: ListChecks },
  { label: "Integrations", path: "/integrations", icon: Blocks },
  { label: "Audit", path: "/audit", icon: FileClock },
] as const;

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { membership, memberships, organization, selectOrganization } =
    useOrganization();
  const { notify } = useToast();
  const realtimeStatus = useRealtimeOrganization();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      notify(errorMessage(error), "error");
    }
  };

  return (
    <div className="app-frame">
      <aside className={`sidebar ${menuOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar__brand">
          <div className="brand-mark" aria-hidden="true">
            <Activity size={19} />
          </div>
          <div>
            <strong>Automation</strong>
            <span>Reliability Console</span>
          </div>
          <button
            className="icon-button sidebar__close"
            type="button"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <nav aria-label="Primary navigation">
          {navigation.map(({ icon: Icon, label, path }) => (
            <NavLink
              className={({ isActive }) =>
                `nav-link ${isActive ? "nav-link--active" : ""}`
              }
              end={path === "/"}
              key={path}
              onClick={() => setMenuOpen(false)}
              to={path}
            >
              <Icon aria-hidden="true" size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__bottom">
          <NavLink
            className={({ isActive }) =>
              `nav-link ${isActive ? "nav-link--active" : ""}`
            }
            to="/settings"
          >
            <Settings aria-hidden="true" size={18} />
            Settings
          </NavLink>
          <a
            className="nav-link"
            href="https://github.com/Kartikm09/automation-reliability-console"
            rel="noreferrer"
            target="_blank"
          >
            <BookOpenCheck aria-hidden="true" size={18} />
            Repository
          </a>
        </div>
      </aside>

      <div
        className={`sidebar-backdrop ${menuOpen ? "sidebar-backdrop--visible" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      <section className="app-main">
        <header className="topbar">
          <button
            className="icon-button topbar__menu"
            type="button"
            aria-label="Open navigation"
            onClick={() => setMenuOpen(true)}
          >
            <Menu aria-hidden="true" size={20} />
          </button>
          <label className="organization-select">
            <span className="sr-only">Current organization</span>
            <select
              value={organization?.id ?? ""}
              onChange={(event) => selectOrganization(event.target.value)}
            >
              {memberships.map((item) => (
                <option value={item.organization_id} key={item.organization_id}>
                  {item.organizations.name}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" size={15} />
          </label>
          <div className={`connection connection--${realtimeStatus}`}>
            <span aria-hidden="true" />
            {titleCase(realtimeStatus)}
          </div>
          <div className="topbar__spacer" />
          <NavLink
            className="icon-button"
            to="/settings?view=notifications"
            aria-label="Notifications"
          >
            <Bell aria-hidden="true" size={18} />
          </NavLink>
          <div className="user-menu">
            <div className="avatar" aria-hidden="true">
              {initials(
                user?.user_metadata.display_name ?? user?.email ?? "User",
              )}
            </div>
            <div className="user-menu__copy">
              <strong>
                {user?.user_metadata.display_name ?? user?.email?.split("@")[0]}
              </strong>
              <span>{membership ? titleCase(membership.role) : "Member"}</span>
            </div>
            <button
              className="icon-button"
              type="button"
              aria-label="Sign out"
              title="Sign out"
              onClick={() => void handleSignOut()}
            >
              <LogOut aria-hidden="true" size={17} />
            </button>
          </div>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </section>
    </div>
  );
}
