import { OAuth2Client } from "google-auth-library";
export function googleVerifier(clientId) {
  const client = new OAuth2Client(clientId);
  return async (credential) =>
    (
      await client.verifyIdToken({ idToken: credential, audience: clientId })
    ).getPayload();
}
export function validateIdentity(
  p,
  { clientId, nonce, issuedAt, now = Date.now() },
) {
  const t = Math.floor(now / 1000);
  const checks = [
    ["PAYLOAD", Boolean(p)],
    [
      "ISSUER",
      ["accounts.google.com", "https://accounts.google.com"].includes(p?.iss),
    ],
    ["AUDIENCE", p?.aud === clientId],
    ["AUTHORIZED_PARTY", !p?.azp || p.azp === clientId],
    [
      "SUBJECT",
      typeof p?.sub === "string" && p.sub.length > 0 && p.sub.length <= 255,
    ],
    [
      "EMAIL",
      p?.email_verified === true &&
        typeof p.email === "string" &&
        p.email.includes("@"),
    ],
    ["EXPIRY", typeof p?.exp === "number" && p.exp > t],
    [
      "ISSUED_AT",
      typeof p?.iat === "number" &&
        p.iat <= t + 60 &&
        p.iat >= Math.floor(issuedAt / 1000) - 60,
    ],
    ["NONCE", Boolean(nonce) && p?.nonce === nonce],
    [
      "CHALLENGE_EXPIRED",
      Number.isFinite(issuedAt) && now - issuedAt <= 300000,
    ],
  ];
  const failed = checks.find(([, passed]) => !passed);
  if (failed) {
    const retry = [
      "NONCE",
      "CHALLENGE_EXPIRED",
      "ISSUED_AT",
      "EXPIRY",
    ].includes(failed[0]);
    const error = new Error(
      retry
        ? "คำขอเข้าสู่ระบบหมดอายุหรือไม่ตรงกัน กรุณาเริ่มเข้าสู่ระบบใหม่"
        : "ไม่สามารถยืนยันบัญชี Google ได้ กรุณาลองใหม่หรือติดต่อผู้ดูแล",
    );
    error.status = 401;
    error.code = "GOOGLE_" + failed[0];
    throw error;
  }
  return {
    sub: p.sub,
    email: p.email.toLowerCase(),
    authoritative:
      p.email.toLowerCase().endsWith("@gmail.com") || Boolean(p.hd),
  };
}
