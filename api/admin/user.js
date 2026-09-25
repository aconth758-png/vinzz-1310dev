import bcrypt from "bcryptjs";
import { sql } from "../_db.js";
import { requireAdmin } from "../_auth.js";

function userId(req) {
  const raw = req.query?.id;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default async function handler(req, res) {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const id = userId(req);
    if (!id) return res.status(400).json({ success: false, message: "ID user tidak valid." });

    if (req.method === "DELETE") {
      await sql`DELETE FROM users WHERE id = ${id}`;
      return res.status(200).json({ success: true, message: "User dihapus." });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const action = String(body.action || "");

      if (action === "extend") {
        const days = Number(body.days);
        if (!Number.isInteger(days) || days < 1 || days > 36500) {
          return res.status(400).json({ success: false, message: "Jumlah hari tidak valid." });
        }
        const rows = await sql`
          UPDATE users
          SET valid_until =
            CASE
              WHEN valid_until > NOW()
                THEN valid_until + (${days} * INTERVAL '1 day')
              ELSE NOW() + (${days} * INTERVAL '1 day')
            END
          WHERE id = ${id}
          RETURNING id, username, valid_until
        `;
        if (!rows.length) return res.status(404).json({ success: false, message: "User tidak ditemukan." });
        return res.status(200).json({ success: true, message: "Masa berlaku diperpanjang.", user: rows[0] });
      }

      if (action === "status") {
        const status = body.status === "active" ? "active" : "disabled";
        const rows = await sql`
          UPDATE users SET status = ${status}
          WHERE id = ${id}
          RETURNING id, username, status
        `;
        if (!rows.length) return res.status(404).json({ success: false, message: "User tidak ditemukan." });
        return res.status(200).json({ success: true, message: "Status user diperbarui.", user: rows[0] });
      }

      if (action === "password") {
        const password = String(body.password || "");
        if (password.length < 6) {
          return res.status(400).json({ success: false, message: "Password minimal 6 karakter." });
        }
        const hash = await bcrypt.hash(password, 12);
        await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${id}`;
        return res.status(200).json({ success: true, message: "Password user diperbarui." });
      }

      return res.status(400).json({ success: false, message: "Action tidak dikenal." });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
}
