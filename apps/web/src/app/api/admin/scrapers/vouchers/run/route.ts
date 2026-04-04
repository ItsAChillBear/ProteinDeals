import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export async function POST() {
  try {
    const response = await fetch(`${API_BASE_URL}/internal/scrapers/vouchercodes/run`, {
      method: "POST",
      cache: "no-store",
    });

    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to reach voucher scraper API",
      },
      { status: 500 }
    );
  }
}
