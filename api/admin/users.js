import bcrypt from "bcryptjs";
import { sql } from "../_db.js";
import { requireAdmin } from "../_auth.js";

export default async function handler(req, res) {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    if (req.method === "GET") {
      const rows = await sql`
        SELECT
          u.id, u.username, u.device_limit, u.status,
          u.created_at, u.valid_until,
          COUNT(d.id)::int AS device_count
        FROM users u
        LEFT JOIN devices d ON d.user_id = u.id
        GROUP BY u.id
        ORDER BY u.id DESC
      `;
      return res.status(200).json({ success: true, users: rows });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const username = String(body.username || "").trim();
      const password = String(body.password || "");
      const days = Number(body.days);
      const deviceLimit = Number(body.device_limit || 1);

      if (!username || !password || !Number.isInteger(days) || days < 1 || days > 36500 ||
          !Number.isInteger(deviceLimit) || deviceLimit < 1 || deviceLimit > 100) {
        return res.status(400).json({ success: false, message: "Data user tidak valid." });
      }

      const hash = await bcrypt.hash(password, 12);
      const rows = await sql`
        INSERT INTO users (username, password_hash, device_limit, status, valid_until)
        VALUES (${username}, ${hash}, ${deviceLimit}, 'active', NOW() + (${days} * INTERVAL '1 day'))
        RETURNING id, username, device_limit, status, created_at, valid_until
      `;

      return res.status(201).json({ success: true, message: "User berhasil dibuat.", user: rows[0] });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (err) {
    console.error(err);
    if (err.code === "23505") {
      return res.status(409).json({ success: false, message: "Username sudah digunakan." });
    }
    return res.status(500).json({ success: false, message: "Server error." });
  }
}
