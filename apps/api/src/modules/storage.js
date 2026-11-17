import {
  randomBytes,
  randomUUID,
  createHash,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import { problem } from "./policy.js";
export const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
export function normalizeFilename(name) {
  if (typeof name !== "string") throw problem(400, "ชื่อไฟล์ไม่ถูกต้อง");
  let result = name;
  if (
    [...name].some((c) => c.charCodeAt(0) > 127) &&
    [...name].every((c) => c.charCodeAt(0) <= 255)
  ) {
    try {
      result = new TextDecoder("utf-8", { fatal: true }).decode(
        Buffer.from(name, "latin1"),
      );
    } catch {}
  }
  return result.normalize("NFC");
}
export function inspectUpload(buffer, name, type) {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length === 0 ||
    buffer.length > 10 * 1024 * 1024
  )
    throw problem(400, "ไฟล์ต้องมีขนาด 1 byte ถึง 10 MB");
  if (
    typeof name !== "string" ||
    /[\/\\\x00-\x1f\u202a-\u202e\u2066-\u2069]/.test(name) ||
    name.length > 200
  )
    throw problem(400, "ชื่อไฟล์ไม่ถูกต้อง");
  const ext = path.extname(name).toLowerCase();
  if (
    ext === ".pdf" &&
    type === "application/pdf" &&
    buffer.subarray(0, 5).toString() === "%PDF-" &&
    buffer.subarray(-1024).includes(Buffer.from("%%EOF"))
  )
    return "application/pdf";
  if (ext === ".txt" && type === "text/plain") {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      throw problem(400, "ไฟล์ข้อความต้องเป็น UTF-8");
    }
    if (!buffer.includes(0)) return "text/plain";
  }
  throw problem(400, "รองรับ PDF และข้อความ UTF-8 ที่ชนิดไฟล์ตรงกันเท่านั้น");
}
export function clamScanner(buffer, { port = 3310, timeout = 5000 } = {}) {
  return new Promise((resolve) => {
    let result = "unavailable",
      output = "";
    const socket = net.connect({ host: "127.0.0.1", port });
    const done = (value) => {
      result = value;
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeout, () => done("unavailable"));
    socket.on("error", () => done("unavailable"));
    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      for (let offset = 0; offset < buffer.length; offset += 65536) {
        const chunk = buffer.subarray(offset, offset + 65536),
          size = Buffer.alloc(4);
        size.writeUInt32BE(chunk.length);
        socket.write(size);
        socket.write(chunk);
      }
      socket.end(Buffer.alloc(4));
    });
    socket.on("data", (chunk) => {
      output += chunk.toString();
      if (output.length > 4096) done("unavailable");
    });
    socket.on("end", () =>
      done(
        /: OK\x00?$/.test(output.trim())
          ? "clean"
          : output.includes(" FOUND")
            ? "infected"
            : "unavailable",
      ),
    );
  });
}
export class SecureStorage {
  constructor({ root, key, scan = clamScanner }) {
    this.root = path.resolve(root);
    this.key = Buffer.from(key || "", "base64");
    this.scan = scan;
    if (this.key.length !== 32)
      throw new Error(
        "Secure storage requires a distinct 32-byte base64 TEST key",
      );
    if (
      this.root.toLowerCase().includes("/public") ||
      this.root.toLowerCase().includes("\\public")
    )
      throw new Error("Storage cannot be public");
  }
  async put(buffer) {
    await fs.mkdir(this.root, { recursive: true, mode: 0o700 });
    const objectKey = randomUUID(),
      iv = randomBytes(12),
      cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const bytes = Buffer.concat([cipher.update(buffer), cipher.final()]);
    await fs.writeFile(
      path.join(this.root, objectKey),
      Buffer.concat([iv, cipher.getAuthTag(), bytes]),
      { flag: "wx", mode: 0o600 },
    );
    return { objectKey, sha256: sha256(buffer), size: buffer.length };
  }
  async read(objectKey, expected) {
    if (!/^[0-9a-f-]{36}$/.test(objectKey)) throw problem(404, "ไม่พบไฟล์");
    let raw;
    try {
      raw = await fs.readFile(path.join(this.root, objectKey));
      const d = createDecipheriv("aes-256-gcm", this.key, raw.subarray(0, 12));
      d.setAuthTag(raw.subarray(12, 28));
      const bytes = Buffer.concat([d.update(raw.subarray(28)), d.final()]);
      if (sha256(bytes) !== expected) throw new Error("Digest mismatch");
      return bytes;
    } catch {
      throw problem(409, "ไฟล์ไม่ผ่านการตรวจความสมบูรณ์");
    }
  }
}
