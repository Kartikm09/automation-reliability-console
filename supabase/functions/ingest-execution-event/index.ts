import {
  correlationId,
  errorResponse,
  jsonResponse,
  optionsResponse,
  safeErrorDetails,
} from "../_shared/http.ts";
import { constantTimeEqual, hmacSha256, sha256 } from "../_shared/crypto.ts";
import { serviceClient } from "../_shared/supabase.ts";

const maximumBodyBytes = 1024 * 1024;
const signatureWindowSeconds = 300;

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
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (contentLength > maximumBodyBytes) {
      return errorResponse(
        413,
        "request_too_large",
        "Payload exceeds 1 MiB.",
        requestCorrelationId,
      );
    }

    const credential = request.headers.get("x-webhook-key") ?? "";
    const timestampHeader = request.headers.get("x-webhook-timestamp") ?? "";
    const suppliedSignature = (request.headers.get("x-webhook-signature") ?? "")
      .replace(/^sha256=/, "")
      .toLowerCase();
    const [prefix] = credential.split(".", 1);
    if (!/^wh_[a-zA-Z0-9]{10}$/.test(prefix ?? "")) {
      return errorResponse(
        401,
        "invalid_credential",
        "Webhook credential is invalid.",
        requestCorrelationId,
      );
    }

    const timestampSeconds = Number(timestampHeader);
    if (
      !Number.isInteger(timestampSeconds) ||
      Math.abs(Date.now() / 1000 - timestampSeconds) > signatureWindowSeconds
    ) {
      return errorResponse(
        401,
        "expired_timestamp",
        "Webhook timestamp is outside the accepted window.",
        requestCorrelationId,
      );
    }

    const rawBytes = new Uint8Array(await request.arrayBuffer());
    if (rawBytes.byteLength > maximumBodyBytes) {
      return errorResponse(
        413,
        "request_too_large",
        "Payload exceeds 1 MiB.",
        requestCorrelationId,
      );
    }
    const rawBody = new TextDecoder().decode(rawBytes);

    const supabase = serviceClient();
    const { data: source, error: sourceError } = await supabase
      .from("integration_sources")
      .select("id, organization_id, provider_type, status, webhook_key_hash")
      .eq("webhook_key_prefix", prefix)
      .maybeSingle();
    if (sourceError) throw sourceError;
    if (!source || source.status !== "active" || !source.webhook_key_hash) {
      return errorResponse(
        401,
        "invalid_credential",
        "Webhook credential is invalid.",
        requestCorrelationId,
      );
    }

    const credentialHash = await sha256(credential);
    if (!constantTimeEqual(credentialHash, source.webhook_key_hash)) {
      return errorResponse(
        401,
        "invalid_credential",
        "Webhook credential is invalid.",
        requestCorrelationId,
      );
    }
    const expectedSignature = await hmacSha256(
      credential,
      `${timestampHeader}.${rawBody}`,
    );
    if (!constantTimeEqual(expectedSignature, suppliedSignature)) {
      return errorResponse(
        401,
        "invalid_signature",
        "Webhook signature is invalid.",
        requestCorrelationId,
      );
    }

    let payload: Record<string, unknown>;
    try {
      const parsed = JSON.parse(rawBody);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error();
      }
      payload = parsed as Record<string, unknown>;
    } catch {
      return errorResponse(
        400,
        "malformed_json",
        "Payload must be a JSON object.",
        requestCorrelationId,
      );
    }

    const externalEventId = typeof payload.event_id === "string"
      ? payload.event_id
      : typeof payload.id === "string"
      ? payload.id
      : null;
    const payloadHash = await sha256(rawBytes);
    const { data: inserted, error: insertError } = await supabase
      .from("raw_execution_events")
      .insert({
        correlation_id: requestCorrelationId,
        event_timestamp: typeof payload.event_timestamp === "string"
          ? payload.event_timestamp
          : typeof payload.timestamp === "string"
          ? payload.timestamp
          : null,
        event_type: typeof payload.event_type === "string"
          ? payload.event_type
          : "execution.updated",
        external_event_id: externalEventId,
        integration_source_id: source.id,
        organization_id: source.organization_id,
        original_payload: payload,
        payload_hash: payloadHash,
        provider_type: source.provider_type,
        signature_valid: true,
        source_schema_version: typeof payload.schema_version === "string"
          ? payload.schema_version
          : "unknown",
      })
      .select("id")
      .single();

    if (insertError?.code === "23505") {
      return jsonResponse(
        { status: "duplicate", correlation_id: requestCorrelationId },
        200,
        { "x-correlation-id": requestCorrelationId },
      );
    }
    if (insertError || !inserted) {
      throw insertError ?? new Error("Raw event insert failed.");
    }

    const { error: queueError } = await supabase.rpc("enqueue_platform_job", {
      queue_name: "raw_event_normalization",
      payload: {
        correlation_id: requestCorrelationId,
        raw_event_id: inserted.id,
      },
    });
    if (queueError) throw queueError;

    await supabase
      .from("webhook_credentials")
      .update({ last_used_at: new Date().toISOString() })
      .eq("integration_source_id", source.id)
      .eq("status", "active");

    return jsonResponse(
      {
        status: "accepted",
        event_id: inserted.id,
        correlation_id: requestCorrelationId,
      },
      202,
      { "x-correlation-id": requestCorrelationId },
    );
  } catch (error) {
    const details = safeErrorDetails(error);
    console.error(
      JSON.stringify({
        level: "error",
        event: "webhook_ingest_failed",
        correlation_id: requestCorrelationId,
        error_code: details.code,
        message: details.message,
      }),
    );
    return errorResponse(
      500,
      "ingest_failed",
      "The event could not be accepted.",
      requestCorrelationId,
    );
  }
});
