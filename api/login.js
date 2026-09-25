import bcrypt from "bcryptjs";
import { sql } from "./_db.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Only POST method is allowed",
      maintenance: false,
      maintenance_msg: ""
    });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const deviceID = String(body.deviceID || "").trim();

    const settings = await sql`
      SELECT setting_key, setting_value
      FROM settings
      WHERE setting_key IN ('maintenance', 'maintenance_msg')
    `;

    const map = Object.fromEntries(settings.map(x => [x.setting_key, x.setting_value]));
    const maintenance = map.maintenance === "1";
    const maintenance_msg = map.maintenance_msg || "Server sedang maintenance.";

    if (maintenance) {
      return res.status(503).json({
        success: false,
        message: maintenance_msg,
        maintenance: true,
        maintenance_msg
      });
    }

    if (!username || !password || !deviceID) {
      return res.status(400).json({
        success: false,
        message: "Username, password, dan deviceID wajib diisi.",
        maintenance: false,
        maintenance_msg: ""
      });
    }

    const rows = await sql`
      SELECT id, username, password_hash, device_limit, status, created_at, valid_until
      FROM users
      WHERE username = ${username}
      LIMIT 1
    `;

    if (!rows.length) {
      return res.status(401).json({
        success: false,
        message: "Username atau password salah.",
        maintenance: false,
        maintenance_msg: ""
      });
    }

    const user = rows[0];

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Akun tidak aktif.",
        maintenance: false,
        maintenance_msg: ""
      });
    }

    if (new Date(user.valid_until).getTime() <= Date.now()) {
      return res.status(403).json({
        success: false,
        message: "Masa berlaku akun sudah habis.",
        maintenance: false,
        maintenance_msg: ""
      });
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      return res.status(401).json({
        success: false,
        message: "Username atau password salah.",
        maintenance: false,
        maintenance_msg: ""
      });
    }

    const existing = await sql`
      SELECT id FROM devices
      WHERE user_id = ${user.id} AND device_id = ${deviceID}
      LIMIT 1
    `;

    if (!existing.length) {
      const countRows = await sql`
        SELECT COUNT(*)::int AS count
        FROM devices
        WHERE user_id = ${user.id}
      `;
      const count = countRows[0].count;

      if (count >= user.device_limit) {
        return res.status(403).json({
          success: false,
          message: "Batas device akun sudah tercapai.",
          maintenance: false,
          maintenance_msg: ""
        });
      }

      await sql`
        INSERT INTO devices (user_id, device_id)
        VALUES (${user.id}, ${deviceID})
      `;
    }

    return res.status(200).json({
      success: true,
      message: "Login berhasil",
      maintenance: false,
      maintenance_msg: "",
      user: {
        username: user.username,
        status: user.status,
        validUntil: new Date(user.valid_until).toISOString(),
        registered_date: new Date(user.created_at).toISOString()
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Database/server error.",
      maintenance: false,
      maintenance_msg: ""
    });
  }
}
