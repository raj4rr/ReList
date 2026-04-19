import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT l.id, l.title, l.price, ci.name AS city,
              (SELECT image_url FROM listing_images li WHERE li.listing_id = l.id ORDER BY sort_order ASC, id ASC LIMIT 1) AS image
       FROM favorites f
       JOIN listings l ON l.id = f.listing_id
       LEFT JOIN cities ci ON ci.id = l.city_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [req.user.id],
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/:listingId", async (req, res, next) => {
  try {
    await query("INSERT IGNORE INTO favorites(user_id, listing_id) VALUES (?, ?)", [req.user.id, Number(req.params.listingId)]);
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/:listingId", async (req, res, next) => {
  try {
    await query("DELETE FROM favorites WHERE user_id = ? AND listing_id = ?", [req.user.id, Number(req.params.listingId)]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
