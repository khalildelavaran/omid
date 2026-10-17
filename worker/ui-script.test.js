import assert from "node:assert/strict";
import vm from "node:vm";
import { test } from "node:test";

import worker from "./index.js";

test("generated Omid page contains browser scripts that parse successfully", async () => {
  const response = await worker.fetch(
    new Request("https://omid.example/"),
    {}
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .filter((source) => source.trim().length > 0);

  assert.ok(scripts.length > 0, "expected at least one inline browser script");
  for (const [index, source] of scripts.entries()) {
    assert.doesNotThrow(
      () => new vm.Script(source, { filename: "omid-inline-" + index + ".js" }),
      "inline script " + index + " should be valid JavaScript"
    );
  }
});
