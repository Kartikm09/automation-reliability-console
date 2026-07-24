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
import {
  objectBody,
  requiredString,
  requiredUuid,
} from "../_shared/validation.ts";

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
    const supabase = userClient(request);
    await requireUser(supabase);
    const { data, error } = await supabase.rpc("request_replay", {
      target_run_id: requiredUuid(body.workflow_run_id, "workflow_run_id"),
      replay_reason: requiredString(body.reason, "reason"),
      request_idempotency_key: typeof body.idempotency_key === "string"
        ? body.idempotency_key
        : crypto.randomUUID(),
    });
    if (error) {
      const status = error.code === "42501"
        ? 403
        : error.code === "P0002"
        ? 404
        : 409;
      return errorResponse(
        status,
        "replay_rejected",
        error.message,
        requestCorrelationId,
      );
    }
    return jsonResponse(
      {
        replay_request: data,
        correlation_id: requestCorrelationId,
      },
      202,
    );
  } catch (error) {
    const status = error instanceof AuthorizationError ? 401 : 400;
    return errorResponse(
      status,
      status === 401 ? "unauthorized" : "invalid_request",
      error instanceof Error ? error.message : "Replay request failed.",
      requestCorrelationId,
    );
  }
});
