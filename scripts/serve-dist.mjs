import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const indexPath = path.join(root, "index.html");
const port = Number(process.env.PORT) || 5000;
const host = "0.0.0.0";

if (!fs.existsSync(indexPath)) {
  console.error(`ERROR: ${indexPath} not found. Run npm run build first.`);
  process.exit(1);
}

console.log(`Starting static server on ${host}:${port} (PORT=${process.env.PORT ?? "unset"})`);

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
};

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

  let filePath = resolveFilePath(pathname);
  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      filePath = indexPath;
    }

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        console.error(`Failed to read ${filePath}:`, readErr.message);
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const isHtml = ext === ".html" || filePath === indexPath;
      res.writeHead(200, {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": isHtml
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
  console.log(`Serving ${root} on http://${host}:${port}`);
});
