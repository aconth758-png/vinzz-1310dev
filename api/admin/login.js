import bcrypt from "bcryptjs";
import { sql } from "../_db.js";
import { setCookie } from "../_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST method is allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    const rows = await sql`
      SELECT id, username, password_hash
      FROM admins
      WHERE username = ${username}
      LIMIT 1
    `;

    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return res.status(401).json({ success: false, message: "Username/password admin salah." });
    }

    setCookie(res, rows[0].id);
    return res.status(200).json({
      success: true,
      message: "Login admin berhasil",
      admin: { username: rows[0].username }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
}
