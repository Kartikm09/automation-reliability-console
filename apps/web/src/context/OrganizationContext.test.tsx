import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { OrganizationProvider, useOrganization } from "./OrganizationContext";

const { load } = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("./AuthContext", () => ({
  useAuth: () => ({ user: { id: "synthetic-user" } }),
}));
vi.mock("../lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ order: load }) }) }),
    }),
  },
}));
afterEach(() => {
  cleanup();
  localStorage.clear();
});

it("resolves a stale saved tenant before exposing a loaded workspace", async () => {
  localStorage.setItem("arc:selected-organization", "removed-tenant");
  load.mockResolvedValue({
    data: [
      {
        id: "membership-a",
        organization_id: "tenant-a",
        role: "owner",
        membership_status: "active",
        organizations: {
          id: "tenant-a",
          name: "Synthetic Apex",
          slug: "apex",
          status: "active",
        },
      },
    ],
    error: null,
  });
  const observed: Array<{ loading: boolean; organization: string | null }> = [];
  function Probe() {
    const state = useOrganization();
    observed.push({
      loading: state.loading,
      organization: state.organization?.id ?? null,
    });
    return <p>{state.organization?.name ?? "No workspace"}</p>;
  }
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <OrganizationProvider>
        <Probe />
      </OrganizationProvider>
    </QueryClientProvider>,
  );
  await screen.findByText("Synthetic Apex");
  expect(
    observed.filter((state) => !state.loading && state.organization === null),
  ).toEqual([]);
});

it("keeps a valid saved membership instead of choosing the first", async () => {
  localStorage.setItem("arc:selected-organization", "tenant-b");
  load.mockResolvedValue({
    data: ["a", "b"].map((key) => ({
      id: `membership-${key}`,
      organization_id: `tenant-${key}`,
      role: "owner",
      membership_status: "active",
      organizations: {
        id: `tenant-${key}`,
        name: `Synthetic ${key}`,
        slug: key,
        status: "active",
      },
    })),
    error: null,
  });
  function Probe() {
    return <p>{useOrganization().organization?.name ?? "No workspace"}</p>;
  }
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <OrganizationProvider>
        <Probe />
      </OrganizationProvider>
    </QueryClientProvider>,
  );
  await screen.findByText("Synthetic b");
  expect(screen.queryByText("Synthetic a")).toBeNull();
  expect(localStorage.getItem("arc:selected-organization")).toBe("tenant-b");
});

it("preserves the empty state when no active memberships exist", async () => {
  load.mockResolvedValue({ data: [], error: null });
  function Probe() {
    const state = useOrganization();
    return (
      <p>
        {state.loading
          ? "Loading"
          : (state.organization?.name ?? "No workspace")}
      </p>
    );
  }
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <OrganizationProvider>
        <Probe />
      </OrganizationProvider>
    </QueryClientProvider>,
  );
  await screen.findByText("No workspace");
});
