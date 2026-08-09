import { NextResponse } from "next/server";
import { clientIp } from "@/lib/rate-limit";

const VERIFIED_TTL_MS = 24 * 60 * 60 * 1000;

/** IPs that already passed CAPTCHA (per serverless instance). */
const verifiedIps = new Map<string, number>();

const turnstileConfigured = () =>
  Boolean(
    process.env.TURNSTILE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  );

export const isCaptchaEnabled = () => turnstileConfigured();

export const isIpCaptchaVerified = (ip: string) => {
  const expiresAt = verifiedIps.get(ip);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    verifiedIps.delete(ip);
    return false;
  }
  return true;
};

export const markIpCaptchaVerified = (ip: string) => {
  verifiedIps.set(ip, Date.now() + VERIFIED_TTL_MS);
};

export const verifyTurnstileToken = async (
  token: string,
  ip: string,
): Promise<boolean> => {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !token) return false;

  try {
    const body = new URLSearchParams({
      secret,
      response: token,
      remoteip: ip,
    });
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      },
    );
    const data = (await res.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch {
    return false;
  }
};

/**
 * First AI request per IP must include a valid Turnstile token.
 * Later requests from that IP skip CAPTCHA for 24h (best-effort in-memory).
 */
export const enforceAiCaptcha = async (request: Request) => {
  if (!isCaptchaEnabled()) {
    return { ok: true as const, ip: clientIp(request) };
  }

  const ip = clientIp(request);
  if (isIpCaptchaVerified(ip)) {
    return { ok: true as const, ip };
  }

  const token = request.headers.get("x-captcha-token")?.trim();
  if (!token) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "Please complete the CAPTCHA to continue.",
          code: "captcha_required",
        },
        { status: 403 },
      ),
    };
  }

  const valid = await verifyTurnstileToken(token, ip);
  if (!valid) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "CAPTCHA verification failed. Please try again.",
          code: "captcha_failed",
        },
        { status: 403 },
      ),
    };
  }

  markIpCaptchaVerified(ip);
  return { ok: true as const, ip };
};
