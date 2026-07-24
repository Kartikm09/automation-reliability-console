import { generateWebhookCredential, sha256 } from "./crypto.ts";
import {
  correlationId,
  errorResponse,
  jsonResponse,
  optionsResponse,
  safeErrorDetails,
  safeJson,
} from "./http.ts";
import { AuthorizationError, requireUser, userClient } from "./supabase.ts";
import { objectBody, requiredUuid } from "./validation.ts";

export async function handleCredentialRequest(
  request: Request,
): Promise<Response> {
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
    const sourceId = requiredUuid(
      body.integration_source_id,
      "integration_source_id",
    );
    const supabase = userClient(request);
    await requireUser(supabase);
    const { credential, prefix } = generateWebhookCredential();
    const { data, error } = await supabase.rpc("store_integration_credential", {
      target_source_id: sourceId,
      new_key_prefix: prefix,
      new_key_hash: await sha256(credential),
    });
    if (error) {
      if (error.code === "42501") {
        return errorResponse(
          403,
          "forbidden",
          "Credential management is not permitted.",
          requestCorrelationId,
        );
      }
      throw error;
    }
    return jsonResponse(
      {
        credential,
        credential_id: data,
        prefix,
        warning: "This credential is displayed once and cannot be recovered.",
        correlation_id: requestCorrelationId,
      },
      201,
      { "cache-control": "no-store", "x-correlation-id": requestCorrelationId },
    );
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return errorResponse(
        401,
        "unauthorized",
        error.message,
        requestCorrelationId,
      );
    }
    const details = safeErrorDetails(error);
    console.error(
      JSON.stringify({
        level: "error",
        event: "credential_request_failed",
        correlation_id: requestCorrelationId,
        error_code: details.code,
        message: details.message,
      }),
    );
    return errorResponse(
      400,
      "credential_request_failed",
      error instanceof Error ? error.message : "Credential request failed.",
      requestCorrelationId,
    );
  }
}
