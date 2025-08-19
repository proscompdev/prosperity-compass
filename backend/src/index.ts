import "dotenv/config";
import express from "express";
import cors from "cors";
import { z } from "zod";
import { prisma } from "./db";
import { hashPassword, verifyPassword, signToken, verifyToken } from "./auth";
import { Prisma } from "@prisma/client";

const app = express();

// tiny request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// CORS for Next dev
app.use(cors({
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

// Health
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "prosperity-compass-backend", time: new Date().toISOString() });
});

/** ---------- AUTH ---------- **/

// signup
const SignupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  password: z.string().min(6),
});
app.post("/auth/signup", async (req, res) => {
  const parsed = SignupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, name, password } = parsed.data;
  try {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, name, passwordHash },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    const token = signToken({ sub: user.id });
    res.status(201).json({ user, token });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || "Signup failed" });
  }
});

// login
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
app.post("/auth/login", async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;
  const userRow = await prisma.user.findUnique({ where: { email } });
  if (!userRow) return res.status(401).json({ error: "Invalid email or password" });

  const ok = await verifyPassword(password, userRow.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });

  const user = { id: userRow.id, email: userRow.email, name: userRow.name, createdAt: userRow.createdAt };
  const token = signToken({ sub: userRow.id });
  res.json({ user, token });
});

// auth middleware
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const decoded = verifyToken(token) as { sub: string };
    (req as any).userId = decoded.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// who am I
app.get("/me", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  res.json({ user });
});

/** ---------- USERS (demo) ---------- **/

app.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  res.json(users);
});

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  password: z.string().min(6),
});
app.post("/users", async (req, res) => {
  const parsed = CreateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, name, password } = parsed.data;
  const passwordHash = await hashPassword(password);
  try {
    const created = await prisma.user.create({
      data: { email, name, passwordHash },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    res.status(201).json(created);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || "Failed to create user" });
  }
});

/** ---------- ACCOUNTS ---------- **/

const CreateAccountSchema = z.object({
  name: z.string().min(1),
  institution: z.string().optional(),
  type: z.string().min(1),      // e.g. "depository"
  subtype: z.string().optional(), // e.g. "checking"
  mask: z.string().optional(),
});

app.get("/accounts", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  res.json(accounts);
});

app.post("/accounts", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const parsed = CreateAccountSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const account = await prisma.account.create({
    data: { userId, ...parsed.data },
  });
  res.status(201).json(account);
});

/** ---------- TRANSACTIONS ---------- **/

const CreateTxSchema = z.object({
  accountId: z.string().min(1),
  postedAt: z.coerce.date(),      // accepts ISO or yyyy-mm-dd
  amount: z.coerce.number(),      // positive=credit, negative=debit
  pending: z.boolean().optional(),
  merchant: z.string().optional(),
  category: z.string().optional(),
  note: z.string().optional(),
});

app.get("/transactions", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const accountId = req.query.accountId as string | undefined;

  const where: any = { userId };
  if (accountId) where.accountId = accountId;

  const txs = await prisma.transaction.findMany({
    where,
    orderBy: { postedAt: "desc" },
    take: 100,
  });
  res.json(txs);
});

app.post("/transactions", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const parsed = CreateTxSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  // ensure the account belongs to this user
  const account = await prisma.account.findFirst({
    where: { id: parsed.data.accountId, userId },
    select: { id: true },
  });
  if (!account) return res.status(403).json({ error: "Account not found or not yours" });

  const tx = await prisma.transaction.create({
    data: {
      userId,
      accountId: parsed.data.accountId,
      postedAt: parsed.data.postedAt,
      pending: parsed.data.pending ?? false,
      amount: new Prisma.Decimal(parsed.data.amount),
      currency: "USD",
      merchant: parsed.data.merchant,
      category: parsed.data.category,
      note: parsed.data.note,
    },
  });
  res.status(201).json(tx);
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
