import { Building2 } from "lucide-react";
import { useState } from "react";

import { Button } from "../components/Button";
import { useToast } from "../context/ToastContext";
import { errorMessage } from "../lib/errors";
import { supabase } from "../lib/supabase";

export function OrganizationSetup() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const { notify } = useToast();

  const createOrganization = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc("create_organization_with_owner", {
        organization_name: name,
        organization_slug: slug,
      });
      if (error) throw error;
      notify("Organization workspace created.");
      window.location.reload();
    } catch (error) {
      notify(errorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-layout">
      <section className="auth-panel">
        <div className="auth-panel__mark">
          <Building2 aria-hidden="true" size={23} />
        </div>
        <p className="eyebrow">Workspace setup</p>
        <h1>Create your organization</h1>
        <p>
          This creates an isolated tenant with development and production
          environments. You become its owner.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void createOrganization();
          }}
        >
          <label>
            Organization name
            <input
              required
              minLength={2}
              maxLength={160}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setSlug(
                  event.target.value
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/(^-|-$)/g, ""),
                );
              }}
            />
          </label>
          <label>
            Workspace slug
            <input
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              value={slug}
              onChange={(event) => setSlug(event.target.value.toLowerCase())}
            />
          </label>
          <Button loading={loading} type="submit">
            Create workspace
          </Button>
        </form>
      </section>
    </main>
  );
}
