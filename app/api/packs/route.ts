import { NextResponse } from "next/server";
import { fetchCollections } from "@/lib/iconify";
import { enforceRateLimit } from "@/lib/request-guards";

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, "packs", 20, 60_000);
  if (!limited.ok) return limited.response;

  try {
    const packs = await fetchCollections();
    return NextResponse.json({ packs });
  } catch {
    return NextResponse.json(
      { error: "Failed to load packs" },
      { status: 500 },
    );
  }
}
