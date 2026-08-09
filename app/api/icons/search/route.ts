import { NextResponse } from "next/server";
import { loadPicker, searchIcons } from "@/lib/iconify";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") ?? "";
  const prefix = searchParams.get("prefix");
  const start = Number(searchParams.get("start") ?? "0");
  const mode = searchParams.get("mode") ?? "picker";

  try {
    if (mode === "search" || (query && start > 0)) {
      const result = await searchIcons({
        query: query || "a",
        prefix: prefix || undefined,
        limit: 96,
        start: Number.isFinite(start) ? start : 0,
      });
      return NextResponse.json(result);
    }

    const result = await loadPicker({
      query,
      prefix: prefix || null,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 },
    );
  }
}
