function getApiOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_API_ORIGIN
    ?? process.env.NEXT_PUBLIC_API_URL
    ?? process.env.NEXT_PUBLIC_BACKEND_URL
    ?? "https://safecrib.onrender.com";

  return configured.replace(/\/+$/, "");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const apiOrigin = getApiOrigin();

  const response = await fetch(`${apiOrigin}/api/v1/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();

  return new Response(text, {
    status: response.status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
