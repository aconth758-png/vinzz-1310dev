import bcrypt from "bcryptjs";
import { sql } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const countRows = await sql`SELECT COUNT(*)::int AS count FROM admins`;
    if (countRows[0].count > 0) {
      return res.status(409).json({ success: false, message: "Admin sudah pernah dibuat." });
    }

    const username = String(process.env.BOOTSTRAP_ADMIN_USERNAME || "").trim();
    const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || "");

    if (!username || !password) {
      return res.status(500).json({
        success: false,
        message: "BOOTSTRAP_ADMIN_USERNAME dan BOOTSTRAP_ADMIN_PASSWORD belum diatur."
      });
    }

    const hash = await bcrypt.hash(password, 12);
    await sql`
      INSERT INTO admins (username, password_hash)
      VALUES (${username}, ${hash})
    `;

    return res.status(200).json({
      success: true,
      message: "Admin pertama berhasil dibuat. Hapus BOOTSTRAP_ADMIN_PASSWORD dari Vercel lalu redeploy."
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Setup admin gagal." });
  }
}
