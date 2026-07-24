import { z } from "zod";

const environmentSchema = z.object({
  VITE_API_BASE_URL: z.url().default("http://127.0.0.1:8000"),
  VITE_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1)
    .default("local-development-publishable-key"),
  VITE_SUPABASE_URL: z.url().default("http://127.0.0.1:54321"),
});

export const environment = environmentSchema.parse(import.meta.env);
