import {
  correlationId,
  errorResponse,
  jsonResponse,
  optionsResponse,
  safeJson,
} from "../_shared/http.ts";
import {
  AuthorizationError,
  requireUser,
  userClient,
} from "../_shared/supabase.ts";
import { objectBody, requiredUuid } from "../_shared/validation.ts";

Deno.serve(async (request) => {
  const requestCorrelationId = correlationId(request);
  if (request.method === "OPTIONS") return optionsResponse();
  if (request.method !== "POST") {
    return errorResponse(
      405,
      "method_not_allowed",
      "Use POST.",
      requestCorrelationId,
    );
  }
  try {
    const body = objectBody(await safeJson(request));
    const artifactId = requiredUuid(body.artifact_id, "artifact_id");
    const supabase = userClient(request);
    await requireUser(supabase);
    const { data: artifact, error: artifactError } = await supabase
      .from("run_artifacts")
      .select("id, storage_path")
      .eq("id", artifactId)
      .maybeSingle();
    if (artifactError) throw artifactError;
    if (!artifact) {
      return errorResponse(
        404,
        "artifact_not_found",
        "Artifact is unavailable.",
        requestCorrelationId,
      );
    }
    const { data, error } = await supabase.storage
      .from("execution-artifacts")
      .createSignedUrl(artifact.storage_path, 60);
    if (error || !data) throw error ?? new Error("Signed URL creation failed.");
    return jsonResponse(
      {
        artifact_id: artifact.id,
        signed_url: data.signedUrl,
        expires_in_seconds: 60,
        correlation_id: requestCorrelationId,
      },
      200,
      { "cache-control": "no-store" },
    );
  } catch (error) {
    const status = error instanceof AuthorizationError ? 401 : 400;
    return errorResponse(
      status,
      status === 401 ? "unauthorized" : "artifact_request_failed",
      error instanceof Error ? error.message : "Artifact request failed.",
      requestCorrelationId,
    );
  }
});
