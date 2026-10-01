import http from "node:http";

const target = new URL("http://localhost:3000/webhook/telegram");
const server = http.createServer((request, response) => {
  if (request.method !== "POST" || request.url !== "/webhook/telegram") {
    response.writeHead(404, { "content-type": "text/plain", "cache-control": "no-store" });
    response.end("Not found");
    return;
  }

  const upstream = http.request(target, {
    method: "POST",
    headers: {
      "content-type": request.headers["content-type"] || "application/json",
      "content-length": request.headers["content-length"] || "0",
      "x-telegram-bot-api-secret-token": request.headers["x-telegram-bot-api-secret-token"] || "",
    },
  }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode || 502, {
      "content-type": upstreamResponse.headers["content-type"] || "text/plain",
      "cache-control": "no-store",
    });
    upstreamResponse.pipe(response);
  });

  upstream.on("error", () => {
    response.writeHead(502, { "content-type": "text/plain", "cache-control": "no-store" });
    response.end("Webhook unavailable");
  });
  request.pipe(upstream);
});

server.listen(3001, "127.0.0.1", () => {
  process.stdout.write("Telegram webhook gateway listening on http://127.0.0.1:3001\n");
});
