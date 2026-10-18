import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../site/", import.meta.url));
const PORT = Number(process.env.PORT ?? 8083);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };

createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const file = normalize(join(ROOT, path.endsWith("/") ? `${path}index.html` : path));
  if (!file.startsWith(normalize(ROOT))) {
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
