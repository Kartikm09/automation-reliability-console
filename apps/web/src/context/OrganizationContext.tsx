import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";
import type { Membership, Organization } from "../types";
import { useAuth } from "./AuthContext";

interface OrganizationContextValue {
  loading: boolean;
  membership: Membership | null;
  memberships: Membership[];
  organization: Organization | null;
  selectOrganization: (organizationId: string) => void;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(
  null,
);
const storageKey = "arc:selected-organization";

async function loadMemberships(userId: string): Promise<Membership[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select(
      "id, organization_id, role, membership_status, organizations!inner(id, name, slug, status)",
    )
    .eq("user_id", userId)
    .eq("membership_status", "active")
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((item) => ({
    ...item,
    organizations: Array.isArray(item.organizations)
      ? (item.organizations[0] as Organization)
      : (item.organizations as Organization),
  })) as Membership[];
}

export function OrganizationProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState(
    () => window.localStorage.getItem(storageKey) ?? "",
  );
  const query = useQuery({
    queryKey: ["memberships", user?.id],
    queryFn: () => loadMemberships(user!.id),
    enabled: Boolean(user),
  });
  const memberships = query.data ?? [];

  useEffect(() => {
    if (!memberships.length) return;
    if (!memberships.some((item) => item.organization_id === selectedId)) {
      const fallback = memberships[0]?.organization_id ?? "";
      setSelectedId(fallback);
      window.localStorage.setItem(storageKey, fallback);
    }
  }, [memberships, selectedId]);

  const membership =
    memberships.find((item) => item.organization_id === selectedId) ?? null;
  const value = useMemo<OrganizationContextValue>(
    () => ({
      loading: query.isLoading,
      memberships,
      membership,
      organization: membership?.organizations ?? null,
      selectOrganization: (organizationId: string) => {
        if (
          !memberships.some((item) => item.organization_id === organizationId)
        ) {
          return;
        }
        setSelectedId(organizationId);
        window.localStorage.setItem(storageKey, organizationId);
      },
    }),
    [membership, memberships, query.isLoading],
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization(): OrganizationContextValue {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization must be used within OrganizationProvider");
  }
  return context;
}
