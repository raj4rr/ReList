import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireAdmin);
const countWords = (value) => value.trim().split(/\s+/).filter(Boolean).length;
const PROTECTED_ADMIN_EMAIL = "admin@r4r.local";

const listingUpdateSchema = z
  .object({
    title: z.string().min(3).optional(),
    description: z.string().min(10).refine((v) => countWords(v) >= 30, "Description must be at least 30 words.").optional(),
    price: z.coerce.number().nonnegative().optional(),
    category_id: z.coerce.number().nullable().optional(),
    city_id: z.coerce.number().nullable().optional(),
    item_condition: z.enum(["new", "like_new", "good", "fair", "poor"]).optional(),
    status: z.enum(["active", "sold", "hidden"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update.");

router.get("/suggestions", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!q || q.length < 2) return res.json([]);

    const users = await query(
      `SELECT id, name AS label, 'user' AS type
       FROM users
       WHERE name LIKE ? OR email LIKE ? OR mobile LIKE ?
       LIMIT 5`,
      [`%${q}%`, `%${q}%`, `%${q}%`],
    );
    const listings = await query(
      `SELECT id, title AS label, 'listing' AS type
       FROM listings
       WHERE title LIKE ?
       LIMIT 5`,
      [`%${q}%`],
    );

    res.json([...users, ...listings]);
  } catch (err) {
    next(err);
  }
});

router.get("/listings", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const sellerId = req.query.seller_id ? Number(req.query.seller_id) : null;
    const pageNum = Number.parseInt(String(req.query.page || "1"), 10);
    const limitNum = Number.parseInt(String(req.query.limit || "20"), 10);
    const page = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1;
    const limit = Number.isFinite(limitNum) && limitNum > 0 ? Math.min(limitNum, 50) : 20;
    const offset = (page - 1) * limit;
    const filters = ["1=1"];
    const params = [];
    if (q) {
      filters.push("(l.title LIKE ? OR u.name LIKE ? OR u.email LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (Number.isFinite(sellerId)) {
      filters.push("l.user_id = ?");
      params.push(sellerId);
    }

    const rows = await query(
      `SELECT l.id, l.title, l.price, l.status, l.created_at, u.name AS seller_name, u.id AS seller_id
       FROM listings l
       JOIN users u ON u.id = l.user_id
       WHERE ${filters.join(" AND ")}
       ORDER BY l.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    res.json({ page, limit, items: rows });
  } catch (err) {
    next(err);
  }
});

router.get("/users/:id/listings", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const pageNum = Number.parseInt(String(req.query.page || "1"), 10);
    const limitNum = Number.parseInt(String(req.query.limit || "20"), 10);
    const page = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1;
    const limit = Number.isFinite(limitNum) && limitNum > 0 ? Math.min(limitNum, 50) : 20;
    const offset = (page - 1) * limit;
    const rows = await query(
      `SELECT l.id, l.title, l.price, l.status, l.created_at
       FROM listings l
       WHERE l.user_id = ?
       ORDER BY l.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [id],
    );
    res.json({ page, limit, items: rows });
  } catch (err) {
    next(err);
  }
});

router.patch("/listings/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = listingUpdateSchema.parse(req.body);
    const fields = [];
    const params = [];

    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      params.push(value);
    }

    const result = await query(`UPDATE listings SET ${fields.join(", ")} WHERE id = ?`, [...params, id]);
    if (!result.affectedRows) return res.status(404).json({ error: "Listing not found" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.patch("/listings/:id/deactivate", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await query("UPDATE listings SET status = 'hidden' WHERE id = ?", [id]);
    if (!result.affectedRows) return res.status(404).json({ error: "Listing not found" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/listings/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await query("DELETE FROM listings WHERE id = ?", [id]);
    if (!result.affectedRows) return res.status(404).json({ error: "Listing not found" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const pageNum = Number.parseInt(String(req.query.page || "1"), 10);
    const limitNum = Number.parseInt(String(req.query.limit || "20"), 10);
    const page = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1;
    const limit = Number.isFinite(limitNum) && limitNum > 0 ? Math.min(limitNum, 50) : 20;
    const offset = (page - 1) * limit;
    const filters = ["1=1"];
    const params = [];
    if (q) {
      filters.push("(u.name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const rows = await query(
      `SELECT u.id, u.name, u.email, u.mobile, u.role, u.status, u.created_at,
              (SELECT COUNT(*) FROM listings l WHERE l.user_id = u.id) AS listings_count
       FROM users u
       WHERE ${filters.join(" AND ")}
       ORDER BY u.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );
    res.json({ page, limit, items: rows });
  } catch (err) {
    next(err);
  }
});

router.patch("/users/:id/role", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { role } = z.object({ role: z.enum(["user", "support", "admin"]) }).parse(req.body);
    const target = await query("SELECT id, email FROM users WHERE id = ? LIMIT 1", [id]);
    if (!target.length) return res.status(404).json({ error: "User not found" });
    if (target[0].email === PROTECTED_ADMIN_EMAIL) {
      return res.status(403).json({ error: "Protected admin account cannot be modified" });
    }
    const result = await query("UPDATE users SET role = ? WHERE id = ?", [role, id]);
    if (!result.affectedRows) return res.status(400).json({ error: "No changes made" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.patch("/users/:id/block", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const target = await query("SELECT id, email FROM users WHERE id = ? LIMIT 1", [id]);
    if (!target.length) return res.status(404).json({ error: "User not found" });
    if (target[0].email === PROTECTED_ADMIN_EMAIL) {
      return res.status(403).json({ error: "Protected admin account cannot be modified" });
    }
    const result = await query("UPDATE users SET status = 'blocked' WHERE id = ?", [id]);
    if (!result.affectedRows) return res.status(400).json({ error: "No changes made" });
    await query("UPDATE listings SET status = 'hidden' WHERE user_id = ?", [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.patch("/users/:id/unblock", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const target = await query("SELECT id, email FROM users WHERE id = ? LIMIT 1", [id]);
    if (!target.length) return res.status(404).json({ error: "User not found" });
    if (target[0].email === PROTECTED_ADMIN_EMAIL) {
      return res.status(403).json({ error: "Protected admin account cannot be modified" });
    }
    const result = await query("UPDATE users SET status = 'active' WHERE id = ?", [id]);
    if (!result.affectedRows) return res.status(400).json({ error: "No changes made" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/users/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: "Cannot delete your own account" });
    const target = await query("SELECT id, email FROM users WHERE id = ? LIMIT 1", [id]);
    if (!target.length) return res.status(404).json({ error: "User not found" });
    if (target[0].email === PROTECTED_ADMIN_EMAIL) {
      return res.status(403).json({ error: "Protected admin account cannot be modified" });
    }

    const result = await query("UPDATE users SET status = 'inactive' WHERE id = ?", [id]);
    if (!result.affectedRows) return res.status(400).json({ error: "No changes made" });
    await query("UPDATE listings SET status = 'hidden' WHERE user_id = ?", [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
