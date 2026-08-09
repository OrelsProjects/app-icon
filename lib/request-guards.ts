import { NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export const MAX_AI_BODY_BYTES = 64_000;
export const MAX_LOGO_SUMMARY_CHARS = 4_000;
export const MAX_MESSAGE_CHARS = 2_000;
export const MAX_MESSAGES = 24;

export const rateLimitResponse = (retryAfterSec: number) =>
  NextResponse.json(
    { error: "Too many requests. Please try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "Cache-Control": "no-store",
      },
    },
  );

export const enforceRateLimit = (
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
) => {
  const ip = clientIp(request);
  const result = checkRateLimit(`${scope}:${ip}`, limit, windowMs);
  if (!result.ok) {
    return { ok: false as const, response: rateLimitResponse(result.retryAfterSec) };
  }
  return { ok: true as const, ip, remaining: result.remaining };
};

export const rejectOversizedBody = (request: Request, maxBytes: number) => {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > maxBytes) {
    return NextResponse.json(
      { error: "Request too large." },
      { status: 413 },
    );
  }
  return null;
};

const tooLargeResponse = () =>
  NextResponse.json({ error: "Request too large." }, { status: 413 });

/** Stream-read JSON and abort once the byte cap is exceeded. */
export const readJsonBody = async <T,>(
  request: Request,
  maxBytes: number,
): Promise<
  | { ok: true; data: T }
  | { ok: false; response: NextResponse }
> => {
  const headerReject = rejectOversizedBody(request, maxBytes);
  if (headerReject) return { ok: false, response: headerReject };

  const reader = request.body?.getReader();
  if (!reader) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      ),
    };
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, response: tooLargeResponse() };
      }
      chunks.push(value);
    }
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      ),
    };
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const text = new TextDecoder("utf-8").decode(merged);
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      ),
    };
  }
};

export const clampText = (value: unknown, max: number) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
};
