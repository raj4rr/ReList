import jwt from "jsonwebtoken";
import { query } from "../db.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const users = await query(
      "SELECT id, email, name, role, status FROM users WHERE id = ? LIMIT 1",
      [payload.id],
    );
    if (!users.length) return res.status(401).json({ error: "Unauthorized" });
    if (users[0].status !== "active") return res.status(403).json({ error: "User account is not active" });
    req.user = users[0];
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}
