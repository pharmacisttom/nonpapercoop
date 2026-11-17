import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeFilename,
  inspectUpload,
} from "../../apps/api/src/modules/storage.js";
test("Thai multipart filename is normalized without corrupting native Unicode", () => {
  const name = "เอกสารสมมติ.txt";
  assert.equal(
    normalizeFilename(Buffer.from(name, "utf8").toString("latin1")),
    name,
  );
  assert.equal(normalizeFilename(name), name);
});
test("path traversal and bidi-spoofed filenames are rejected", () => {
  for (const name of ["../test.txt", "test\u202Etxt.exe.txt", "test\r\n.txt"])
    assert.throws(() => inspectUpload(Buffer.from("test"), name, "text/plain"));
});
test("extension or media type cannot disguise active content as PDF", () =>
  assert.throws(() =>
    inspectUpload(
      Buffer.from("<script>test</script>"),
      "test.pdf",
      "application/pdf",
    ),
  ));
