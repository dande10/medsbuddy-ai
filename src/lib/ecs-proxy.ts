const DEFAULT_ECS_BASE_URL = "http://47.88.54.108";

function getEcsBaseUrl(): string {
  const configured =
    process.env.MEDSBUDDY_API_BASE_URL?.trim() ||
    process.env.VITE_MEDSBUDDY_API_BASE_URL?.trim() ||
    DEFAULT_ECS_BASE_URL;
  return configured.replace(/\/$/, "");
}

export async function proxyEcsJson(request: Request, path: string): Promise<Response> {
  const body = await request.text();
  const upstream = await fetch(`${getEcsBaseUrl()}${path}`, {
    method: request.method,
    headers: {
      "Content-Type": request.headers.get("content-type") || "application/json",
    },
    body: body || undefined,
  });
  const responseBody = await upstream.arrayBuffer();
  return new Response(responseBody, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export async function proxyEcsRequest(request: Request, path: string): Promise<Response> {
  const body = await request.arrayBuffer();
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  const upstream = await fetch(`${getEcsBaseUrl()}${path}`, {
    method: request.method,
    headers,
    body: body.byteLength ? body : undefined,
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "no-store",
    },
  });
}
