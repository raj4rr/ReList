import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const mobileSchema = z.string().regex(/^\d{10,15}$/);

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  mobile: mobileSchema,
  password: z.string().min(6),
  city_id: z.coerce.number().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

 /**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - mobile
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *               email:
 *                 type: string
 *                 format: email
 *               mobile:
 *                 type: string
 *                 pattern: '^\d{10,15}$'
 *               password:
 *                 type: string
 *                 minLength: 6
 *               city_id:
 *                 type: number
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *     responses:
 *       200:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                 token:
 *                   type: string
 *       409:
 *         description: Email or mobile already in use
 *       400:
 *         description: Validation error
 */
router.post("/register", async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await query("SELECT id FROM users WHERE email = ? OR mobile = ?", [data.email, data.mobile]);
    if (existing.length) return res.status(409).json({ error: "Email or mobile already used" });

    const passwordHash = await bcrypt.hash(data.password, 10);
    const result = await query(
      "INSERT INTO users(name, email, mobile, password_hash, city_id, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        data.name,
        data.email,
        data.mobile,
        passwordHash,
        data.city_id || null,
        Number.isFinite(data.latitude) ? data.latitude : null,
        Number.isFinite(data.longitude) ? data.longitude : null,
      ],
    );

    const token = jwt.sign({ id: result.insertId, email: data.email }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const users = await query(
      `SELECT u.id, u.name, u.email, u.mobile, u.role, u.status, u.city_id, c.name AS city, u.latitude, u.longitude
       FROM users u
       LEFT JOIN cities c ON c.id = u.city_id
       WHERE u.id = ?`,
      [result.insertId],
    );
    res.status(201).json({ token, user: users[0] });
  } catch (err) {
    next(err);
  }
});

 /**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email or mobile number
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account not active
 *       400:
 *         description: Validation error
 */
router.post("/login", async (req, res, next) => {
  try {
    const data = z.object({ identifier: z.string().min(3), password: z.string().min(6) }).parse(req.body);
    const users = await query(
      `SELECT u.*, c.name AS city
       FROM users u
       LEFT JOIN cities c ON c.id = u.city_id
       WHERE u.email = ? OR u.mobile = ?
       LIMIT 1`,
      [data.identifier, data.identifier],
    );
    if (!users.length) return res.status(401).json({ error: "Invalid credentials" });

    const user = users[0];
    if (user.status !== "active") return res.status(403).json({ error: "User account is not active" });
    const ok = await bcrypt.compare(data.password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        city: user.city,
        city_id: user.city_id,
        role: user.role,
        status: user.status,
        latitude: user.latitude,
        longitude: user.longitude,
      },
    });
  } catch (err) {
    next(err);
  }
});

 /**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const users = await query(
      `SELECT u.id, u.name, u.email, u.mobile, u.city_id, u.role, u.status, c.name AS city, u.latitude, u.longitude, u.created_at
       FROM users u
       LEFT JOIN cities c ON c.id = u.city_id
       WHERE u.id = ?`,
      [req.user.id],
    );
    if (!users.length) return res.status(404).json({ error: "User not found" });
    res.json(users[0]);
  } catch (err) {
    next(err);
  }
});

 /**
 * @swagger
 * /api/auth/profile:
 *   patch:
 *     summary: Update user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *               email:
 *                 type: string
 *                 format: email
 *               mobile:
 *                 type: string
 *                 pattern: '^\d{10,15}$'
 *               city_id:
 *                 type: number
 *                 nullable: true
 *               latitude:
 *                 type: number
 *                 nullable: true
 *               longitude:
 *                 type: number
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Email or mobile already in use
 *       400:
 *         description: Validation error
 */
router.patch("/profile", requireAuth, async (req, res, next) => {
  try {
    const data = z
      .object({
        name: z.string().min(2).optional(),
        email: z.string().email().optional(),
        mobile: mobileSchema.optional(),
        city_id: z.coerce.number().nullable().optional(),
        latitude: z.coerce.number().nullable().optional(),
        longitude: z.coerce.number().nullable().optional(),
      })
      .refine((v) => Object.keys(v).length > 0, "No profile changes provided")
      .parse(req.body);

    if (data.email) {
      const rows = await query("SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1", [data.email, req.user.id]);
      if (rows.length) return res.status(409).json({ error: "Email already used" });
    }
    if (data.mobile) {
      const rows = await query("SELECT id FROM users WHERE mobile = ? AND id != ? LIMIT 1", [data.mobile, req.user.id]);
      if (rows.length) return res.status(409).json({ error: "Mobile already used" });
    }

    const fields = [];
    const params = [];
    for (const [k, v] of Object.entries(data)) {
      fields.push(`${k} = ?`);
      params.push(v ?? null);
    }

    await query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, [...params, req.user.id]);

    const users = await query(
      `SELECT u.id, u.name, u.email, u.mobile, u.city_id, u.role, u.status, c.name AS city, u.latitude, u.longitude, u.created_at
       FROM users u
       LEFT JOIN cities c ON c.id = u.city_id
       WHERE u.id = ?`,
      [req.user.id],
    );
    res.json(users[0]);
  } catch (err) {
    next(err);
  }
});

router.patch("/change-password", requireAuth, async (req, res, next) => {
  try {
    const data = z
      .object({
        current_password: z.string().min(6),
        new_password: z.string().min(6),
      })
      .parse(req.body);

    const users = await query("SELECT id, password_hash FROM users WHERE id = ? LIMIT 1", [req.user.id]);
    if (!users.length) return res.status(404).json({ error: "User not found" });

    const ok = await bcrypt.compare(data.current_password, users[0].password_hash);
    if (!ok) return res.status(400).json({ error: "Current password is incorrect" });

    const newHash = await bcrypt.hash(data.new_password, 10);
    await query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
