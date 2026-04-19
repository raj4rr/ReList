import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { upload } from "../utils/upload.js";
import { addWatermark } from "../utils/image.js";

const router = Router();
const countWords = (value) => value.trim().split(/\s+/).filter(Boolean).length;

const listingSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10).refine((v) => countWords(v) >= 30, "Description must be at least 30 words."),
  price: z.coerce.number().nonnegative(),
  category_id: z.coerce.number().optional(),
  city_id: z.coerce.number().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  item_condition: z.enum(["new", "like_new", "good", "fair", "poor"]).optional(),
});

const listingEditSchema = listingSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update.");

router.get("/categories", async (_req, res, next) => {
  try {
    const categories = await query("SELECT id, name FROM categories ORDER BY name ASC");
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

router.post("/categories", requireAuth, async (req, res, next) => {
  try {
    const { name } = z.object({ name: z.string().trim().min(2).max(120) }).parse(req.body);
    await query("INSERT IGNORE INTO categories(name) VALUES (?)", [name]);
    const rows = await query("SELECT id, name FROM categories WHERE name = ? LIMIT 1", [name]);
    if (!rows.length) return res.status(500).json({ error: "Failed to create category" });
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get("/cities", async (_req, res, next) => {
  try {
    const cities = await query("SELECT id, name FROM cities ORDER BY name ASC");
    res.json(cities);
  } catch (err) {
    next(err);
  }
});

router.post("/cities", async (req, res, next) => {
  try {
    const { name } = z.object({ name: z.string().trim().min(2).max(120) }).parse(req.body);
    await query("INSERT IGNORE INTO cities(name) VALUES (?)", [name]);
    const rows = await query("SELECT id, name FROM cities WHERE name = ? LIMIT 1", [name]);
    if (!rows.length) return res.status(500).json({ error: "Failed to create city" });
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const pageNum = Number.parseInt(String(req.query.page || "1"), 10);
    const limitNum = Number.parseInt(String(req.query.limit || "20"), 10);
    const page = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1;
    const limit = Number.isFinite(limitNum) && limitNum > 0 ? Math.min(limitNum, 50) : 20;
    const offset = (page - 1) * limit;

    const rows = await query(
      `SELECT l.id, l.title, l.price, l.status, l.created_at, ci.name AS city,
              (SELECT image_url FROM listing_images li WHERE li.listing_id = l.id ORDER BY sort_order ASC, id ASC LIMIT 1) AS image
       FROM listings l
       LEFT JOIN cities ci ON ci.id = l.city_id
       WHERE l.user_id = ?
       ORDER BY l.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [req.user.id],
    );
    res.json({ page, limit, items: rows });
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const rawCityId = typeof req.query.city_id === "string" ? req.query.city_id.trim() : "";
    const rawCityName = typeof req.query.city === "string" ? req.query.city.trim() : "";
    const cityId = rawCityId && rawCityId !== "undefined" ? Number(rawCityId) : null;
    const categoryId = req.query.category_id ? Number(req.query.category_id) : null;
    const minPrice = req.query.min_price ? Number(req.query.min_price) : null;
    const maxPrice = req.query.max_price ? Number(req.query.max_price) : null;
    const userLat = req.query.user_lat ? Number(req.query.user_lat) : null;
    const userLng = req.query.user_lng ? Number(req.query.user_lng) : null;

    const pageNum = Number.parseInt(String(req.query.page || "1"), 10);
    const limitNum = Number.parseInt(String(req.query.limit || "20"), 10);
    const page = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1;
    const limit = Number.isFinite(limitNum) && limitNum > 0 ? Math.min(limitNum, 50) : 20;
    const offset = (page - 1) * limit;

    const filters = ["l.status = 'active'"];
    const params = [];

    if (q && q !== "undefined") {
      filters.push("(l.title LIKE ? OR l.description LIKE ?)");
      params.push(`%${q}%`, `%${q}%`);
    }
    if (Number.isFinite(cityId)) {
      filters.push("l.city_id = ?");
      params.push(cityId);
    } else if (rawCityName && rawCityName !== "undefined") {
      filters.push("ci.name LIKE ?");
      params.push(`%${rawCityName}%`);
    }
    if (Number.isFinite(categoryId)) {
      filters.push("l.category_id = ?");
      params.push(categoryId);
    }
    if (Number.isFinite(minPrice)) {
      filters.push("l.price >= ?");
      params.push(minPrice);
    }
    if (Number.isFinite(maxPrice)) {
      filters.push("l.price <= ?");
      params.push(maxPrice);
    }
    const where = filters.join(" AND ");

    const hasGeo = Number.isFinite(userLat) && Number.isFinite(userLng);
    const distanceExpr = hasGeo
      ? `111.111 * DEGREES(ACOS(LEAST(1.0, COS(RADIANS(${userLat})) * COS(RADIANS(l.latitude)) * COS(RADIANS(${userLng} - l.longitude)) + SIN(RADIANS(${userLat})) * SIN(RADIANS(l.latitude)))))`
      : "NULL";
    const orderBy = hasGeo
      ? `CASE WHEN l.latitude IS NULL OR l.longitude IS NULL THEN 1 ELSE 0 END ASC, ${distanceExpr} ASC, l.created_at DESC`
      : "l.created_at DESC";

    const rows = await query(
      `SELECT l.id, l.title, l.price, ci.name AS city, l.item_condition, l.created_at,
              c.name AS category_name,
              u.name AS seller_name,
              ${distanceExpr} AS distance_km,
              (SELECT image_url FROM listing_images li WHERE li.listing_id = l.id ORDER BY sort_order ASC, id ASC LIMIT 1) AS image
       FROM listings l
       LEFT JOIN categories c ON c.id = l.category_id
       LEFT JOIN cities ci ON ci.id = l.city_id
       JOIN users u ON u.id = l.user_id
       WHERE ${where}
       ORDER BY ${orderBy}
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    res.json({ page, limit, items: rows });
  } catch (err) {
    next(err);
  }
});

router.get("/suggestions", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!q || q.length < 2) return res.json([]);

    const rows = await query(
      `SELECT l.title
       FROM listings l
       WHERE l.status = 'active' AND l.title LIKE ?
       GROUP BY l.title
       ORDER BY MAX(l.created_at) DESC
       LIMIT 8`,
      [`%${q}%`],
    );

    res.json(rows.map((r) => r.title));
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const rows = await query(
      `SELECT l.*, ci.name AS city, c.name AS category_name, u.name AS seller_name, u.id AS seller_id, usc.name AS seller_city
       FROM listings l
       LEFT JOIN categories c ON c.id = l.category_id
       LEFT JOIN cities ci ON ci.id = l.city_id
       JOIN users u ON u.id = l.user_id
       LEFT JOIN cities usc ON usc.id = u.city_id
       WHERE l.id = ?`,
      [id],
    );

    if (!rows.length) return res.status(404).json({ error: "Listing not found" });

    const images = await query(
      "SELECT id, image_url FROM listing_images WHERE listing_id = ? ORDER BY sort_order ASC, id ASC",
      [id],
    );
    res.json({ ...rows[0], images });
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, upload.array("images", 10), async (req, res, next) => {
  try {
    const data = listingSchema.parse(req.body);
    const result = await query(
      "INSERT INTO listings(user_id, category_id, title, description, price, item_condition, city_id, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        req.user.id,
        data.category_id || null,
        data.title,
        data.description,
        data.price,
        data.item_condition || "good",
        data.city_id || null,
        Number.isFinite(data.latitude) ? data.latitude : null,
        Number.isFinite(data.longitude) ? data.longitude : null,
      ],
    );

    const listingId = result.insertId;
    const files = req.files || [];
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      await addWatermark(file.path, "R4R");
      const imageUrl = `/uploads/${file.filename}`;
      await query("INSERT INTO listing_images(listing_id, image_url, sort_order) VALUES (?, ?, ?)", [listingId, imageUrl, i]);
    }

    res.status(201).json({ id: listingId });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = listingEditSchema.parse(req.body);

    const listings = await query("SELECT id, user_id FROM listings WHERE id = ? LIMIT 1", [id]);
    if (!listings.length) return res.status(404).json({ error: "Listing not found" });
    if (listings[0].user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const fields = [];
    const params = [];
    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      params.push(value);
    }

    if (!fields.length) return res.status(400).json({ error: "No changes provided" });
    await query(`UPDATE listings SET ${fields.join(", ")} WHERE id = ?`, [...params, id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/deactivate", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const listings = await query("SELECT id, user_id FROM listings WHERE id = ? LIMIT 1", [id]);
    if (!listings.length) return res.status(404).json({ error: "Listing not found" });
    if (listings[0].user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    await query("UPDATE listings SET status = 'hidden' WHERE id = ?", [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const listings = await query("SELECT id, user_id FROM listings WHERE id = ? LIMIT 1", [id]);
    if (!listings.length) return res.status(404).json({ error: "Listing not found" });
    if (listings[0].user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    await query("DELETE FROM listings WHERE id = ?", [id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/sold", requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await query("UPDATE listings SET status='sold' WHERE id = ? AND user_id = ?", [id, req.user.id]);
    if (!result.affectedRows) return res.status(404).json({ error: "Listing not found" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
