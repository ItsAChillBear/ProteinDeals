const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export async function GET() {
  try {
    const response = await fetch(`${API_BASE_URL}/internal/scrapers/vouchercodes/stream`, {
      method: "GET",
      cache: "no-store",
      headers: {
        accept: "text/event-stream",
      },
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to reach scraper API",
      })}\n\n`,
      {
        status: 500,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      }
    );
  }
}
