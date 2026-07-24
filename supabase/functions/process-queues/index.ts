import { constantTimeEqual } from "../_shared/crypto.ts";
import {
  correlationId,
  errorResponse,
  jsonResponse,
  optionsResponse,
} from "../_shared/http.ts";
import { normalizeProviderEvent } from "../_shared/normalization.ts";
import { serviceClient } from "../_shared/supabase.ts";

interface QueueMessage {
  msg_id: number;
  read_ct: number;
  message: Record<string, unknown>;
}

async function archive(
  supabase: ReturnType<typeof serviceClient>,
  queueName: string,
  messageId: number,
): Promise<void> {
  const { error } = await supabase.rpc("archive_platform_job", {
    queue_name: queueName,
    message_id: messageId,
  });
  if (error) throw error;
}

async function deadLetter(
  supabase: ReturnType<typeof serviceClient>,
  queueName: string,
  message: QueueMessage,
  failure: string,
): Promise<void> {
  const { error } = await supabase.rpc("dead_letter_platform_job", {
    queue_name: queueName,
    message_id: message.msg_id,
    payload: message.message,
    failure_message: failure,
  });
  if (error) throw error;
}

async function processRawEvents(
  supabase: ReturnType<typeof serviceClient>,
): Promise<{ failed: number; processed: number }> {
  const { data, error } = await supabase.rpc("read_platform_jobs", {
    queue_name: "raw_event_normalization",
    visibility_timeout_seconds: 60,
    batch_size: 10,
  });
  if (error) throw error;

  let processed = 0;
  let failed = 0;
  for (const message of (data ?? []) as QueueMessage[]) {
    try {
      const rawEventId = String(message.message.raw_event_id ?? "");
      const { data: rawEvent, error: rawError } = await supabase
        .from("raw_execution_events")
        .select("id, provider_type, original_payload")
        .eq("id", rawEventId)
        .single();
      if (rawError || !rawEvent) {
        throw rawError ?? new Error("Raw event was not found.");
      }

      const canonical = normalizeProviderEvent(
        rawEvent.provider_type,
        rawEvent.original_payload,
      );
      const { data: result, error: applyError } = await supabase.rpc(
        "apply_canonical_event",
        { target_raw_event_id: rawEvent.id, canonical },
      );
      if (applyError) throw applyError;
      if (result?.outcome === "failed") {
        throw new Error(
          String(result.error_message ?? "Canonical event failed."),
        );
      }
      await archive(supabase, "raw_event_normalization", message.msg_id);
      processed += 1;
    } catch (processingError) {
      failed += 1;
      if (message.read_ct >= 5) {
        await deadLetter(
          supabase,
          "raw_event_normalization",
          message,
          processingError instanceof Error
            ? processingError.message
            : "unknown",
        );
      }
    }
  }
  return { failed, processed };
}

async function processReplays(
  supabase: ReturnType<typeof serviceClient>,
): Promise<{ failed: number; processed: number }> {
  const { data, error } = await supabase.rpc("read_platform_jobs", {
    queue_name: "replay_jobs",
    visibility_timeout_seconds: 60,
    batch_size: 10,
  });
  if (error) throw error;

  let processed = 0;
  let failed = 0;
  for (const message of (data ?? []) as QueueMessage[]) {
    try {
      const { data: result, error: replayError } = await supabase.rpc(
        "process_replay_job",
        {
          target_replay_request_id: String(
            message.message.replay_request_id ?? "",
          ),
        },
      );
      if (replayError) throw replayError;
      if (result?.outcome === "failed") {
        throw new Error(String(result.error_message ?? "Replay failed."));
      }
      await archive(supabase, "replay_jobs", message.msg_id);
      processed += 1;
    } catch (processingError) {
      failed += 1;
      if (message.read_ct >= 5) {
        await deadLetter(
          supabase,
          "replay_jobs",
          message,
          processingError instanceof Error
            ? processingError.message
            : "unknown",
        );
      }
    }
  }
  return { failed, processed };
}

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

  const expectedToken = Deno.env.get("INTERNAL_FUNCTION_TOKEN") ?? "";
  const suppliedToken = request.headers.get("x-internal-token") ?? "";
  if (
    expectedToken.length < 32 ||
    !constantTimeEqual(expectedToken, suppliedToken)
  ) {
    return errorResponse(
      401,
      "unauthorized",
      "Internal token is invalid.",
      requestCorrelationId,
    );
  }

  try {
    const supabase = serviceClient();
    const [events, replays] = await Promise.all([
      processRawEvents(supabase),
      processReplays(supabase),
    ]);
    return jsonResponse({
      correlation_id: requestCorrelationId,
      events,
      replays,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "queue_consumer_failed",
        correlation_id: requestCorrelationId,
        message: error instanceof Error
          ? error.message.slice(0, 300)
          : "unknown",
      }),
    );
    return errorResponse(
      500,
      "queue_consumer_failed",
      "Queue processing failed.",
      requestCorrelationId,
    );
  }
});
