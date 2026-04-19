import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT c.id, c.listing_id,
              COALESCE(l.title, CONCAT('Direct chat with ', CASE WHEN c.buyer_id = ? THEN seller.name ELSE buyer.name END)) AS title,
              CASE WHEN c.buyer_id = ? THEN seller.name ELSE buyer.name END AS other_user,
              (SELECT body FROM messages m WHERE m.chat_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message,
              (SELECT created_at FROM messages m WHERE m.chat_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message_at,
              (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id AND m.sender_id != ? AND m.is_read = 0) AS unread_count
       FROM chats c
       LEFT JOIN listings l ON l.id = c.listing_id
       JOIN users buyer ON buyer.id = c.buyer_id
       JOIN users seller ON seller.id = c.seller_id
       WHERE c.buyer_id = ? OR c.seller_id = ?
       ORDER BY COALESCE(last_message_at, c.created_at) DESC`,
      [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id],
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get("/notifications/unread", async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT COUNT(*) AS unread_count
       FROM messages m
       JOIN chats c ON c.id = m.chat_id
       WHERE (c.buyer_id = ? OR c.seller_id = ?) AND m.sender_id != ? AND m.is_read = 0`,
      [req.user.id, req.user.id, req.user.id],
    );
    res.json(rows[0] || { unread_count: 0 });
  } catch (err) {
    next(err);
  }
});

router.get("/users/suggest", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!q || q.length < 2) return res.json([]);

    if (!["admin", "support"].includes(req.user.role)) return res.json([]);

    const rows = await query(
      `SELECT id, name, email, mobile
       FROM users
       WHERE id != ? AND status = 'active' AND (name LIKE ? OR email LIKE ? OR mobile LIKE ?)
       ORDER BY name ASC
       LIMIT 10`,
      [req.user.id, `%${q}%`, `%${q}%`, `%${q}%`],
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/direct/start", async (req, res, next) => {
  try {
    if (!["admin", "support"].includes(req.user.role)) {
      return res.status(403).json({ error: "Only admin/support can start direct chats" });
    }

    const { target_user_id } = z.object({ target_user_id: z.coerce.number() }).parse(req.body);
    if (target_user_id === req.user.id) return res.status(400).json({ error: "Cannot chat with yourself" });

    const users = await query("SELECT id FROM users WHERE id = ? AND status = 'active' LIMIT 1", [target_user_id]);
    if (!users.length) return res.status(404).json({ error: "Target user not found" });

    const buyerId = Math.min(req.user.id, target_user_id);
    const sellerId = Math.max(req.user.id, target_user_id);

    const existing = await query(
      "SELECT id FROM chats WHERE listing_id IS NULL AND buyer_id = ? AND seller_id = ? LIMIT 1",
      [buyerId, sellerId],
    );
    if (existing.length) return res.status(201).json({ chat_id: existing[0].id });

    const insert = await query("INSERT INTO chats(listing_id, buyer_id, seller_id) VALUES (NULL, ?, ?)", [buyerId, sellerId]);
    res.status(201).json({ chat_id: insert.insertId });
  } catch (err) {
    next(err);
  }
});

router.post("/start", async (req, res, next) => {
  try {
    const { listing_id } = z.object({ listing_id: z.coerce.number() }).parse(req.body);
    const listings = await query("SELECT id, user_id FROM listings WHERE id = ?", [listing_id]);
    if (!listings.length) return res.status(404).json({ error: "Listing not found" });

    const sellerId = listings[0].user_id;
    if (sellerId === req.user.id) return res.status(400).json({ error: "Cannot chat with yourself" });

    await query("INSERT IGNORE INTO chats(listing_id, buyer_id, seller_id) VALUES (?, ?, ?)", [listing_id, req.user.id, sellerId]);
    const chats = await query(
      "SELECT id FROM chats WHERE listing_id = ? AND buyer_id = ? AND seller_id = ? LIMIT 1",
      [listing_id, req.user.id, sellerId],
    );
    res.status(201).json({ chat_id: chats[0].id });
  } catch (err) {
    next(err);
  }
});

router.get("/:chatId/messages", async (req, res, next) => {
  try {
    const chatId = Number(req.params.chatId);
    const chats = await query("SELECT * FROM chats WHERE id = ?", [chatId]);
    if (!chats.length) return res.status(404).json({ error: "Chat not found" });

    const chat = chats[0];
    if (chat.buyer_id !== req.user.id && chat.seller_id !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await query(
      "UPDATE messages SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE chat_id = ? AND sender_id != ? AND is_read = 0",
      [chatId, req.user.id],
    );

    const rows = await query(
      `SELECT m.id, m.body, m.sender_id, m.created_at, u.name AS sender_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.chat_id = ?
       ORDER BY m.id ASC`,
      [chatId],
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/:chatId/messages", async (req, res, next) => {
  try {
    const chatId = Number(req.params.chatId);
    const { body } = z.object({ body: z.string().min(1).max(1000) }).parse(req.body);

    const chats = await query("SELECT * FROM chats WHERE id = ?", [chatId]);
    if (!chats.length) return res.status(404).json({ error: "Chat not found" });
    const chat = chats[0];

    if (chat.buyer_id !== req.user.id && chat.seller_id !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const result = await query("INSERT INTO messages(chat_id, sender_id, body) VALUES (?, ?, ?)", [chatId, req.user.id, body]);
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    next(err);
  }
});

router.patch("/messages/:messageId", async (req, res, next) => {
  try {
    const messageId = Number(req.params.messageId);
    const { body } = z.object({ body: z.string().min(1).max(1000) }).parse(req.body);

    const rows = await query(
      `SELECT m.id, m.sender_id, m.created_at, c.buyer_id, c.seller_id
       FROM messages m
       JOIN chats c ON c.id = m.chat_id
       WHERE m.id = ? LIMIT 1`,
      [messageId],
    );
    if (!rows.length) return res.status(404).json({ error: "Message not found" });
    const row = rows[0];
    if (row.buyer_id !== req.user.id && row.seller_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });
    if (row.sender_id !== req.user.id) return res.status(403).json({ error: "You can edit only your own messages" });

    const ageMinutes = (Date.now() - new Date(row.created_at).getTime()) / 60000;
    if (ageMinutes > 15) return res.status(400).json({ error: "Message can only be edited within 15 minutes" });

    await query("UPDATE messages SET body = ? WHERE id = ?", [body, messageId]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/:chatId", async (req, res, next) => {
  try {
    const chatId = Number(req.params.chatId);
    const chats = await query("SELECT * FROM chats WHERE id = ? LIMIT 1", [chatId]);
    if (!chats.length) return res.status(404).json({ error: "Chat not found" });
    const chat = chats[0];
    if (chat.buyer_id !== req.user.id && chat.seller_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });

    await query("DELETE FROM chats WHERE id = ?", [chatId]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
