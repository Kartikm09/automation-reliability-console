export const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers":
    "authorization, apikey, content-type, x-client-info, x-correlation-id, x-webhook-key, x-webhook-signature, x-webhook-timestamp, x-internal-token",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

export function correlationId(request: Request): string {
  const supplied = request.headers.get("x-correlation-id");
  return supplied && /^[0-9a-f-]{36}$/i.test(supplied)
    ? supplied
    : crypto.randomUUID();
}

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  requestCorrelationId: string,
): Response {
  return jsonResponse(
    {
      error: { code, message },
      correlation_id: requestCorrelationId,
    },
    status,
    { "x-correlation-id": requestCorrelationId },
  );
}

export function optionsResponse(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function safeErrorDetails(
  error: unknown,
): { code: string; message: string } {
  if (error instanceof Error) {
    return { code: error.name, message: error.message.slice(0, 300) };
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    return {
      code: typeof record.code === "string" ? record.code : "unknown",
      message: typeof record.message === "string"
        ? record.message.slice(0, 300)
        : "unknown",
    };
  }
  return { code: "unknown", message: "unknown" };
}

export async function safeJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new InputError("malformed_json", "Request body must be valid JSON.");
  }
}

export class InputError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}
