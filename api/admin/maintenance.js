import { sql } from "../_db.js";
import { requireAdmin } from "../_auth.js";

export default async function handler(req, res) {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    if (req.method === "GET") {
      const rows = await sql`
        SELECT setting_key, setting_value
        FROM settings
        WHERE setting_key IN ('maintenance', 'maintenance_msg')
      `;
      const map = Object.fromEntries(rows.map(x => [x.setting_key, x.setting_value]));
      return res.status(200).json({
        success: true,
        maintenance: map.maintenance === "1",
        maintenance_msg: map.maintenance_msg || ""
      });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const enabled = body.maintenance ? "1" : "0";
      const message = String(body.maintenance_msg || "Server sedang maintenance. Silakan coba lagi nanti.").slice(0, 500);

      await sql`
        INSERT INTO settings (setting_key, setting_value)
        VALUES ('maintenance', ${enabled})
        ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
      `;
      await sql`
        INSERT INTO settings (setting_key, setting_value)
        VALUES ('maintenance_msg', ${message})
        ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
      `;

      return res.status(200).json({ success: true, maintenance: enabled === "1", maintenance_msg: message });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
}
