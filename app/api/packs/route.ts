import { NextResponse } from "next/server";
import { fetchCollections } from "@/lib/iconify";

export async function GET() {
  try {
    const packs = await fetchCollections();
    return NextResponse.json({ packs });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load packs" },
      { status: 500 },
    );
  }
}
