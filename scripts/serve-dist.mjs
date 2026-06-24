import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const indexPath = path.join(root, "index.html");
const buildIdPath = path.join(root, "build-id.txt");

const port = Number(process.env.PORT) || 5000;
const host = "0.0.0.0";

if (!process.env.PORT) {
  console.warn("[serve-dist] PORT not set; defaulting to 5000");
}

if (!fs.existsSync(indexPath)) {
  console.error(`ERROR: ${indexPath} not found. Run npm run build first.`);
  process.exit(1);
}

const indexHtml = fs.readFileSync(indexPath, "utf8");
const buildId = fs.existsSync(buildIdPath)
  ? fs.readFileSync(buildIdPath, "utf8").trim()
  : "missing";

console.log(`[serve-dist] build-id=${buildId}`);
console.log(`[serve-dist] starting on ${host}:${port} (PORT=${process.env.PORT})`);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function sendHtml(res, html) {
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-cache, no-store, must-revalidate",
  });
  res.end(html);
}

function resolveFilePath(pathname) {
  const relative =
    pathname === "/" || pathname === "" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.resolve(root, relative);
  if (filePath !== root && !filePath.startsWith(root + path.sep)) {
    return null;
  }
  return filePath;
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url || "/", "http://localhost").pathname);
  } catch {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }

  if (pathname === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("ok");
    return;
  }

  if (pathname === "/build-id.txt") {
    if (fs.existsSync(buildIdPath)) {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(fs.readFileSync(buildIdPath, "utf8"));
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("not found");
    return;
  }

  if (pathname === "/" || pathname === "") {
    sendHtml(res, indexHtml);
    return;
  }

  const filePath = resolveFilePath(pathname);
  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // SPA client routes only — never return index.html for asset paths.
      if (path.extname(pathname)) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      sendHtml(res, indexHtml);
      return;
    }

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        console.error(`Failed to read ${filePath}:`, readErr.message);
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control":
          ext === ".html"
            ? "no-cache, no-store, must-revalidate"
            : "public, max-age=31536000, immutable",
      });
      res.end(data);
    });
  });
});

server.on("error", (err) => {
  console.error("Server error:", err);
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`[serve-dist] serving ${root}`);
});
