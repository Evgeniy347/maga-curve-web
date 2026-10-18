import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../site/", import.meta.url));
const BROWSER_TESTS = fileURLToPath(new URL("../tests/browser/", import.meta.url));
const PORT = Number(process.env.PORT ?? 8083);
const GATEWAY = process.env.GATEWAY_URL ?? "http://192.168.0.147:8082";
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };

createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  if (path.startsWith("/core/")) {
    const upstream = await fetch(`${GATEWAY}${path}`);
    response.writeHead(upstream.status, { "Content-Type": upstream.headers.get("content-type") ?? "text/plain" }).end(Buffer.from(await upstream.arrayBuffer()));
    return;
  }
  const [root, relative] = path.startsWith("/__tests__/") ? [BROWSER_TESTS, path.slice("/__tests__".length)] : [ROOT, path];
  const file = normalize(join(root, relative.endsWith("/") ? `${relative}index.html` : relative));
  if (!file.startsWith(normalize(root))) {
    response.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(file);
    response.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" }).end(body);
  } catch {
    response.writeHead(404).end("not found");
  }
}).listen(PORT, () => console.log(`site/ on http://localhost:${PORT}/`));
