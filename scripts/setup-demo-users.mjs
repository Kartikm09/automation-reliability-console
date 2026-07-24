import { createClient } from "@supabase/supabase-js";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
};

const supabase = createClient(
  required("SUPABASE_URL"),
  required("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const users = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    email: process.env.E2E_ADMIN_EMAIL ?? "admin@atlas-automation.test",
    password: required("E2E_ADMIN_PASSWORD"),
    displayName: "Mira Atlas",
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
    email: process.env.E2E_SECOND_ORG_EMAIL ?? "owner@northstar-workflow.test",
    password: required("E2E_SECOND_ORG_PASSWORD"),
    displayName: "Noah North",
  },
];

for (const user of users) {
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: { display_name: user.displayName },
  });
  if (error) throw error;
}

console.log(`Configured ${users.length} environment-controlled demo users.`);
