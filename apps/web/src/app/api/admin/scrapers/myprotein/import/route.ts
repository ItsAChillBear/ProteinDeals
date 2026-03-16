import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const body = await request.text();

  try {
    const response = await fetch(
      `${API_BASE_URL}/internal/scrapers/myprotein/import-records?${searchParams.toString()}`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body,
      }
    );

    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to reach import API",
      },
      { status: 500 }
    );
  }
}
