import { NextResponse } from "next/server";
import { loadPicker, searchIcons } from "@/lib/iconify";
import { clampText, enforceRateLimit } from "@/lib/request-guards";

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, "icons", 60, 60_000);
  if (!limited.ok) return limited.response;

  const { searchParams } = new URL(request.url);
  const query = clampText(searchParams.get("query") ?? "", 80);
  const prefix = clampText(searchParams.get("prefix") ?? "", 64) || null;
  const start = Number(searchParams.get("start") ?? "0");
  const mode = searchParams.get("mode") ?? "picker";

  try {
    if (mode === "search" || (query && start > 0)) {
      const result = await searchIcons({
        query: query || "a",
        prefix: prefix || undefined,
        limit: 96,
        start: Number.isFinite(start) ? Math.max(0, Math.min(start, 5000)) : 0,
      });
      return NextResponse.json(result);
    }

    const result = await loadPicker({
      query,
      prefix,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
