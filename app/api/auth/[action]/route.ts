import type { NextRequest } from "next/server";

const authPaths = new Map([
  ["sign-in", "/api/auth/sign-in/email"],
  ["sign-up", "/api/auth/sign-up/email"],
  ["sign-out", "/api/auth/sign-out"],
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  const authPath = authPaths.get(action);
  if (!authPath) {
    return new Response(null, { status: 404 });
  }

  const apiOrigin = process.env.PAWPRINT_API_ORIGIN;
  if (!apiOrigin) {
    return Response.json({ message: "Authentication is unavailable." }, { status: 503 });
  }

  const origin = request.headers.get("origin");
  if (!origin || origin !== process.env.BETTER_AUTH_URL) {
    return Response.json({ message: "Invalid request origin." }, { status: 403 });
  }

  try {
    const upstream = await fetch(new URL(authPath, apiOrigin), {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("content-type") ?? "application/json",
        Origin: origin,
        Cookie: request.headers.get("cookie") ?? "",
      },
      body: await request.text(),
      cache: "no-store",
      redirect: "manual",
    });

    const headers = new Headers({ "Cache-Control": "no-store" });
    const contentType = upstream.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);
    for (const cookie of upstream.headers.getSetCookie()) {
      headers.append("Set-Cookie", cookie);
    }

    if (upstream.ok) {
      await upstream.body?.cancel();
      return new Response(null, { status: 204, headers });
    }

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return Response.json({ message: "Authentication is unavailable." }, { status: 503 });
  }
}
