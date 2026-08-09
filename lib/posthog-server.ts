import { PostHog } from "posthog-node";

const token =
  process.env.NEXT_PUBLIC_POSTHOG_KEY ??
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

const host =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

export const getPostHogServer = () => {
  if (!token) return null;
  return new PostHog(token, {
    host,
    flushAt: 1,
    flushInterval: 0,
  });
};

export const captureServerEvent = async (
  distinctId: string,
  event: string,
  properties?: Record<string, string | number | boolean | null | undefined>,
) => {
  const client = getPostHogServer();
  if (!client) return;

  try {
    client.capture({
      distinctId,
      event,
      properties: {
        ...properties,
        $lib: "posthog-node",
      },
    });
    await client.shutdown();
  } catch {
    // Never fail the request because analytics failed.
  }
};

export const distinctIdFromRequest = (request: Request) => {
  const headerId = request.headers.get("x-posthog-distinct-id");
  if (headerId) return headerId;

  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)ph_phc_[^=]+_posthog=([^;]+)/);
  if (!match?.[1]) return "anonymous";

  try {
    const parsed = JSON.parse(
      decodeURIComponent(match[1]),
    ) as { distinct_id?: string };
    return parsed.distinct_id ?? "anonymous";
  } catch {
    return "anonymous";
  }
};
