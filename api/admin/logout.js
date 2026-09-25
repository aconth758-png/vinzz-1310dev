import { clearCookie } from "../_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST method is allowed" });
  }
  clearCookie(res);
  return res.status(200).json({ success: true, message: "Logout berhasil" });
}
