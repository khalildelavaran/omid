import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import worker from "./index.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("serves the built frontend through the ASSETS binding instead of the legacy demo", async () => {
  let requestedUrl;
  const assets = {
    fetch: async (request) => {
      requestedUrl = request.url;
      return new Response("<main>React application</main>", {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }
  };

  const response = await worker.fetch(
    new Request("https://omid.example/"),
    { ASSETS: assets }
  );

  assert.equal(response.status, 200);
  assert.equal(requestedUrl, "https://omid.example/");
  assert.match(await response.text(), /React application/);
});

test("API requests are handled by the API proxy before static assets", async () => {
  let assetCalled = false;
  const response = await worker.fetch(
    new Request("https://omid.example/api/v1/health/"),
    { ASSETS: { fetch: async () => { assetCalled = true; return new Response("asset"); } } }
  );

  assert.equal(response.status, 503);
  assert.equal(assetCalled, false);
});

test("API routes return a non-cacheable 503 until backend origin is configured", async () => {
  const request = new Request("https://omid.example/api/v1/health/");
  const response = await worker.fetch(request, {});

  assert.equal(response.status, 503);
  assert.match(response.headers.get("content-type") || "", /application\/json/i);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match((await response.json()).detail, /OMID_API_ORIGIN/);
});

test("proxy rejects non-HTTPS backend origins before making an upstream request", async () => {
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response("unexpected");
  };

  const request = new Request("https://omid.example/api/v1/health/");
  const response = await worker.fetch(request, {
    OMID_API_ORIGIN: "http://backend.example"
  });

  assert.equal(response.status, 500);
  assert.equal(called, false);
  assert.match((await response.json()).detail, /HTTPS/);
});

test("proxy rejects backend URLs that contain a path or credentials", async () => {
  for (const origin of [
    "https://backend.example/api",
    "https://user:password@backend.example"
  ]) {
    const response = await worker.fetch(
      new Request("https://omid.example/api/v1/health/"),
      { OMID_API_ORIGIN: origin }
    );
    assert.equal(response.status, 500);
  }
});

test("proxy forwards method, cookies, CSRF and same-origin metadata, and prevents caching", async () => {
  let observed;
  globalThis.fetch = async (request) => {
    observed = {
      url: request.url,
      method: request.method,
      cookie: request.headers.get("Cookie"),
      csrf: request.headers.get("X-CSRFToken"),
      origin: request.headers.get("Origin"),
      forwardedHost: request.headers.get("X-Forwarded-Host"),
      forwardedProto: request.headers.get("X-Forwarded-Proto"),
      body: await request.text()
    };
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": "sessionid=test-session; HttpOnly; Secure; SameSite=Lax",
        "Cache-Control": "public, max-age=300"
      }
    });
  };

  const request = new Request("https://omid.example/api/v1/auth/login/?from=ui", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": "csrftoken=test-csrf",
      "X-CSRFToken": "test-csrf-token",
      "Origin": "https://omid.example"
    },
    body: JSON.stringify({ username: "worker", password: "not-a-real-password" })
  });
  const response = await worker.fetch(request, {
    OMID_API_ORIGIN: "https://backend.example"
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(observed.url, "https://backend.example/api/v1/auth/login/?from=ui");
  assert.equal(observed.method, "POST");
  assert.equal(observed.cookie, "csrftoken=test-csrf");
  assert.equal(observed.csrf, "test-csrf-token");
  assert.equal(observed.origin, "https://omid.example");
  assert.equal(observed.forwardedHost, "omid.example");
  assert.equal(observed.forwardedProto, "https");
  assert.equal(JSON.parse(observed.body).username, "worker");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("set-cookie") || "", /HttpOnly/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("same-backend redirects are rewritten to stay on the Worker origin", async () => {
  globalThis.fetch = async () => new Response(null, {
    status: 302,
    headers: { Location: "https://backend.example/api/v1/auth/login/?next=1" }
  });

  const response = await worker.fetch(
    new Request("https://omid.example/api/v1/auth/me/"),
    { OMID_API_ORIGIN: "https://backend.example" }
  );

  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "https://omid.example/api/v1/auth/login/?next=1");
});
