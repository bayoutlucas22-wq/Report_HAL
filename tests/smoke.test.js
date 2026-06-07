const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { after, before, test } = require("node:test");

const rootDir = path.resolve(__dirname, "..");
const publicDir = path.join(rootDir, "public");

let baseUrl;
let serverProcess;
let serverOutput = "";

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function waitForServer(url, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return;
    } catch {
      // The process may still be binding the port.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Server did not become ready.\n${serverOutput}`);
}

async function getJson(route) {
  const response = await fetch(`${baseUrl}${route}`);
  assert.equal(response.status, 200, `${route} returned ${response.status}`);
  return response.json();
}

before(async () => {
  const port = await getFreePort();
  baseUrl = `http://127.0.0.1:${port}`;
  serverProcess = spawn(process.execPath, ["api/server.js"], {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: String(port),
      MONGO_URL: "mongodb://127.0.0.1:1/?serverSelectionTimeoutMS=200",
      GMAIL_USER: "",
      GMAIL_PASS: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout.on("data", (chunk) => {
    serverOutput += chunk;
  });
  serverProcess.stderr.on("data", (chunk) => {
    serverOutput += chunk;
  });

  await waitForServer(baseUrl);
});

after(() => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill("SIGTERM");
  }
});

test("package scripts do not reference missing Node entrypoints", () => {
  const packageJson = require(path.join(rootDir, "package.json"));
  const missing = [];

  for (const [name, command] of Object.entries(packageJson.scripts || {})) {
    for (const match of command.matchAll(/\bnode\s+([^\s;&|]+)/g)) {
      if (match[1].startsWith("-")) continue;
      const entrypoint = path.resolve(rootDir, match[1]);
      if (!fs.existsSync(entrypoint)) {
        missing.push(`${name}: ${match[1]}`);
      }
    }
  }

  assert.deepEqual(missing, []);
});

test("landing page and dashboard return valid HTML shells", async () => {
  for (const route of ["/", "/dashboard"]) {
    const response = await fetch(`${baseUrl}${route}`);
    const html = await response.text();

    assert.equal(response.status, 200, `${route} returned ${response.status}`);
    assert.match(response.headers.get("content-type") || "", /text\/html/);
    assert.equal((html.match(/<title\b/gi) || []).length, 1, `${route} must have one title`);
    assert.equal((html.match(/<\/title>/gi) || []).length, 1, `${route} must close its title`);
    assert.match(html, /CIS - CORTEX Reporting/);
  }
});

test("local assets referenced by HTML exist", () => {
  const missing = [];

  for (const fileName of ["index.html", "dashboard.html"]) {
    const html = fs.readFileSync(path.join(publicDir, fileName), "utf8");
    const references = html.matchAll(/(?:src|href)=["']([^"'?#]+\.[a-z0-9]+)["']/gi);

    for (const [, reference] of references) {
      if (/^(?:https?:)?\/\//.test(reference)) continue;
      const assetPath = path.join(publicDir, reference.replace(/^\//, ""));
      if (!fs.existsSync(assetPath)) {
        missing.push(`${fileName}: ${reference}`);
      }
    }
  }

  assert.deepEqual(missing, []);
});

test("health and static fallback data APIs respond", async () => {
  const health = await getJson("/api/health");
  assert.equal(health.status, "ok");

  const stats = await getJson("/api/stats");
  assert.ok(Number(stats.total) > 0, "stats should include records");

  const incidents = await getJson("/api/hal-incidents?limit=1");
  assert.ok(Number(incidents.total) > 0, "incidents should include records");
  assert.equal(incidents.items.length, 1);

  const norway = await getJson("/api/norway-stats");
  assert.equal(typeof norway, "object");
});

test("Aramco analysis still has its retained text corpus", async () => {
  const analysis = await getJson("/api/aramco/2025/analyze");
  assert.ok(Array.isArray(analysis.raw_filings));
  assert.ok(analysis.raw_filings.length > 0, "2025 filings should be discoverable");
});
