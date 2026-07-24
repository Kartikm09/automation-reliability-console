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
    const decision = requiredString(body.decision, "decision", 20);
    if (!["approved", "rejected"].includes(decision)) {
      return errorResponse(
        400,
        "invalid_decision",
        "Decision must be approved or rejected.",
        requestCorrelationId,
      );
    }
    const supabase = userClient(request);
    await requireUser(supabase);
    const { data, error } = await supabase.rpc("decide_approval", {
      target_approval_id: requiredUuid(body.approval_id, "approval_id"),
      decision,
      note: typeof body.note === "string" ? body.note.slice(0, 1000) : null,
    });
    if (error) {
      const status = error.code === "42501"
        ? 403
        : error.code === "P0002"
        ? 404
        : 409;
      return errorResponse(
        status,
        "approval_rejected",
        error.message,
        requestCorrelationId,
      );
    }
    return jsonResponse({
      approval_request: data,
      correlation_id: requestCorrelationId,
    });
  } catch (error) {
    const status = error instanceof AuthorizationError ? 401 : 400;
    return errorResponse(
      status,
      status === 401 ? "unauthorized" : "invalid_request",
      error instanceof Error ? error.message : "Approval decision failed.",
      requestCorrelationId,
    );
  }
});
