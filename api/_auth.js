import crypto from "crypto";
import { sql } from "./_db.js";

const COOKIE_NAME = "vinzz_admin";
const MAX_AGE = 60 * 60 * 24 * 7;

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(value) {
  return crypto
    .createHmac("sha256", process.env.ADMIN_COOKIE_SECRET || "")
    .update(value)
    .digest("base64url");
}

export function setCookie(res, adminId) {
  const payload = `${adminId}.${Date.now()}`;
  const token = `${b64url(payload)}.${sign(payload)}`;
  res.setHeader("Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`
  );
}

export function clearCookie(res) {
  res.setHeader("Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  );
}

export function getCookie(req) {
  const raw = req.headers.cookie || "";
  const part = raw.split(";").map(x => x.trim()).find(x => x.startsWith(COOKIE_NAME + "="));
  return part ? decodeURIComponent(part.slice(COOKIE_NAME.length + 1)) : null;
}

export function getAdminId(req) {
  const token = getCookie(req);
  if (!token) return null;

  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;

  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  let payload;
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expected = sign(payload);
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;

  const [id, issued] = payload.split(".");
  const issuedAt = Number(issued);
  if (!id || !Number.isFinite(issuedAt)) return null;
  if (Date.now() - issuedAt > MAX_AGE * 1000) return null;

  return id;
}

export async function requireAdmin(req, res) {
  if (!process.env.ADMIN_COOKIE_SECRET) {
    res.status(500).json({ success: false, message: "ADMIN_COOKIE_SECRET belum dikonfigurasi" });
    return null;
  }

  const adminId = getAdminId(req);
  if (!adminId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return null;
  }

  const rows = await sql`
    SELECT id, username FROM admins WHERE id = ${adminId} LIMIT 1
  `;
  if (!rows.length) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return null;
  }

  return rows[0];
}

export function json(res, status, body) {
  res.status(status).json(body);
}
