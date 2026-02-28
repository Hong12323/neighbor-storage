import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { pool } from "./db";
import {
  users,
  items,
  rentals,
  transactions,
  reviews,
  chatRooms,
  chatMessages,
  signupSchema,
  loginSchema,
} from "@shared/schema";
import { eq, desc, and, or, sql, ne } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

function requireAuth(req: Request, res: Response, next: () => void) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "로그인이 필요합니다" });
  }
  next();
}

async function requireAdmin(req: Request, res: Response, next: () => void) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "로그인이 필요합니다" });
  }
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, req.session.userId));
  if (!user?.isAdmin) {
    return res.status(403).json({ message: "관리자 권한이 필요합니다" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  const PgSession = connectPgSimple(session);

  app.use(
    session({
      store: new PgSession({
        pool: pool as any,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "neighbor-storage-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      },
    }),
  );

  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const parsed = signupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ message: "입력 정보를 확인해주세요", errors: parsed.error.flatten() });
      }
      const { email, password, nickname } = parsed.data;

      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      if (existing.length > 0) {
        return res.status(409).json({ message: "이미 가입된 이메일입니다" });
      }

      const hashed = await bcrypt.hash(password, 10);
      const [newUser] = await db
        .insert(users)
        .values({ email, password: hashed, nickname })
        .returning();

      await db.insert(transactions).values({
        userId: newUser.id,
        type: "CHARGE",
        amount: 100000,
        description: "회원가입 환영 보너스",
      });
      await db
        .update(users)
        .set({ balance: 100000 })
        .where(eq(users.id, newUser.id));

      req.session.userId = newUser.id;
      const { password: _, ...userWithoutPassword } = newUser;
      userWithoutPassword.balance = 100000;
      return res.status(201).json(userWithoutPassword);
    } catch (err) {
      console.error("Signup error:", err);
      return res.status(500).json({ message: "서버 오류가 발생했습니다" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ message: "이메일과 비밀번호를 확인해주세요" });
      }
      const { email, password } = parsed.data;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      if (!user) {
        return res
          .status(401)
          .json({ message: "이메일 또는 비밀번호가 올바르지 않습니다" });
      }

      if (user.isBanned) {
        return res.status(403).json({ message: "이용이 정지된 계정입니다" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res
          .status(401)
          .json({ message: "이메일 또는 비밀번호가 올바르지 않습니다" });
      }

      req.session.userId = user.id;
      const { password: _, ...userWithoutPassword } = user;
      return res.json(userWithoutPassword);
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ message: "서버 오류가 발생했습니다" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ message: "로그아웃 되었습니다" });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "로그인이 필요합니다" });
    }
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId));
    if (!user) {
      return res.status(401).json({ message: "사용자를 찾을 수 없습니다" });
    }
    const { password: _, ...u } = user;
    return res.json(u);
  });

  app.put(
    "/api/auth/profile",
    requireAuth,
    async (req: Request, res: Response) => {
      const { nickname, avatarUrl, bio, location } = req.body;
      const updates: Record<string, any> = {};
      if (nickname) updates.nickname = nickname;
      if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
      if (bio !== undefined) updates.bio = bio;
      if (location !== undefined) updates.location = location;

      const [updated] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, req.session.userId!))
        .returning();
      const { password: _, ...u } = updated;
      return res.json(u);
    },
  );

  app.get("/api/wallet", requireAuth, async (req: Request, res: Response) => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId!));
    const txns = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, req.session.userId!))
      .orderBy(desc(transactions.createdAt));
    return res.json({ balance: user?.balance || 0, transactions: txns });
  });

  app.post(
    "/api/wallet/topup",
    requireAuth,
    async (req: Request, res: Response) => {
      const amount = req.body.amount || 50000;
      await db
        .update(users)
        .set({ balance: sql`${users.balance} + ${amount}` })
        .where(eq(users.id, req.session.userId!));
      await db.insert(transactions).values({
        userId: req.session.userId!,
        type: "CHARGE",
        amount,
        description: `충전 ${amount.toLocaleString()}원`,
      });
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.session.userId!));
      return res.json({ balance: user?.balance || 0, message: "충전 완료!" });
    },
  );

  app.post(
    "/api/wallet/withdraw",
    requireAuth,
    async (req: Request, res: Response) => {
      const amount = req.body.amount || 0;
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.session.userId!));
      if (!user || user.balance < amount) {
        return res.status(400).json({ message: "잔액이 부족합니다" });
      }
      await db
        .update(users)
        .set({ balance: sql`${users.balance} - ${amount}` })
        .where(eq(users.id, req.session.userId!));
      await db.insert(transactions).values({
        userId: req.session.userId!,
        type: "WITHDRAW",
        amount: -amount,
        description: `출금 요청 ${amount.toLocaleString()}원`,
      });
      return res.json({
        balance: (user.balance || 0) - amount,
        message: "출금 요청 완료",
      });
    },
  );

  app.get("/api/items", async (req: Request, res: Response) => {
    const { category, search, owner } = req.query;
    let query = db
      .select()
      .from(items)
      .where(eq(items.isDeleted, false))
      .orderBy(desc(items.createdAt));

    const allItems = await query;
    let filtered = allItems;

    if (category && category !== "전체") {
      filtered = filtered.filter((i) => i.category === category);
    }
    if (search) {
      const q = (search as string).toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q),
      );
    }
    if (owner) {
      filtered = filtered.filter((i) => i.ownerId === owner);
    }
    return res.json(filtered);
  });

  app.get("/api/items/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const [item] = await db.select().from(items).where(eq(items.id, id));
    if (!item || item.isDeleted) {
      return res.status(404).json({ message: "물건을 찾을 수 없습니다" });
    }
    await db
      .update(items)
      .set({ viewCount: sql`${items.viewCount} + 1` })
      .where(eq(items.id, id));
    return res.json(item);
  });

  app.post("/api/items", requireAuth, async (req: Request, res: Response) => {
    const { title, category, pricePerDay, deposit, canTeach, canDeliver, images, description, location } = req.body;
    const [user] = await db.select().from(users).where(eq(users.id, req.session.userId!));
    const [newItem] = await db
      .insert(items)
      .values({
        ownerId: req.session.userId!,
        title,
        category,
        pricePerDay,
        deposit: deposit || 0,
        isProItem: user?.isShopOwner || false,
        canTeach: canTeach || false,
        canDeliver: canDeliver || false,
        images: images || [],
        description: description || "",
        location: location || user?.location || "오전동",
      })
      .returning();
    return res.status(201).json(newItem);
  });

  app.post(
    "/api/rentals",
    requireAuth,
    async (req: Request, res: Response) => {
      const { itemId, days, isDelivery } = req.body;
      const [item] = await db
        .select()
        .from(items)
        .where(eq(items.id, itemId));
      if (!item) {
        return res.status(404).json({ message: "물건을 찾을 수 없습니다" });
      }
      const deliveryFee = isDelivery ? 3000 : 0;
      const totalFee = item.pricePerDay * days + deliveryFee;
      const totalCost = totalFee + item.deposit;

      const [borrower] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.session.userId!));
      if (!borrower || borrower.balance < totalCost) {
        return res.status(400).json({
          message: "잔액이 부족합니다. 충전 후 다시 시도해주세요.",
          required: totalCost,
          current: borrower?.balance || 0,
        });
      }

      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + days);

      const [rental] = await db
        .insert(rentals)
        .values({
          itemId,
          borrowerId: req.session.userId!,
          ownerId: item.ownerId,
          status: "requested",
          startDate: today.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
          totalFee,
          depositHeld: item.deposit,
          isDelivery: isDelivery || false,
          deliveryFee,
        })
        .returning();

      return res.status(201).json(rental);
    },
  );

  app.get(
    "/api/rentals",
    requireAuth,
    async (req: Request, res: Response) => {
      const userId = req.session.userId!;
      const allRentals = await db
        .select()
        .from(rentals)
        .where(or(eq(rentals.borrowerId, userId), eq(rentals.ownerId, userId)))
        .orderBy(desc(rentals.createdAt));
      return res.json(allRentals);
    },
  );

  app.put(
    "/api/rentals/:id/status",
    requireAuth,
    async (req: Request, res: Response) => {
      const rentalId = parseInt(req.params.id);
      const { status } = req.body;
      const userId = req.session.userId!;

      const [rental] = await db
        .select()
        .from(rentals)
        .where(eq(rentals.id, rentalId));
      if (!rental) {
        return res.status(404).json({ message: "대여 정보를 찾을 수 없습니다" });
      }

      const validTransitions: Record<string, { next: string; who: string }[]> =
        {
          requested: [
            { next: "accepted", who: "owner" },
            { next: "cancelled", who: "borrower" },
          ],
          accepted: [{ next: "paid", who: "borrower" }],
          paid: [{ next: "renting", who: "owner" }],
          renting: [{ next: "returned", who: "borrower" }],
          returned: [{ next: "completed", who: "owner" }],
        };

      const allowed = validTransitions[rental.status];
      if (!allowed) {
        return res
          .status(400)
          .json({ message: "상태를 변경할 수 없습니다" });
      }
      const transition = allowed.find((t) => t.next === status);
      if (!transition) {
        return res
          .status(400)
          .json({ message: `${rental.status}에서 ${status}로 변경할 수 없습니다` });
      }

      const isOwner = rental.ownerId === userId;
      const isBorrower = rental.borrowerId === userId;

      if (transition.who === "owner" && !isOwner) {
        return res
          .status(403)
          .json({ message: "소유자만 이 작업을 수행할 수 있습니다" });
      }
      if (transition.who === "borrower" && !isBorrower) {
        return res
          .status(403)
          .json({ message: "대여자만 이 작업을 수행할 수 있습니다" });
      }

      if (status === "paid") {
        const totalCost = rental.totalFee + rental.depositHeld;
        const [borrower] = await db
          .select()
          .from(users)
          .where(eq(users.id, rental.borrowerId));
        if (!borrower || borrower.balance < totalCost) {
          return res
            .status(400)
            .json({ message: "잔액이 부족합니다" });
        }
        await db
          .update(users)
          .set({ balance: sql`${users.balance} - ${totalCost}` })
          .where(eq(users.id, rental.borrowerId));
        await db.insert(transactions).values({
          userId: rental.borrowerId,
          type: "PAYMENT",
          amount: -totalCost,
          description: `대여료 ${rental.totalFee.toLocaleString()}원 + 보증금 ${rental.depositHeld.toLocaleString()}원`,
          relatedRentalId: rental.id,
        });
      }

      if (status === "completed") {
        await db
          .update(users)
          .set({ balance: sql`${users.balance} + ${rental.depositHeld}` })
          .where(eq(users.id, rental.borrowerId));
        await db.insert(transactions).values({
          userId: rental.borrowerId,
          type: "REFUND",
          amount: rental.depositHeld,
          description: `보증금 환불 ${rental.depositHeld.toLocaleString()}원`,
          relatedRentalId: rental.id,
        });

        await db
          .update(users)
          .set({ balance: sql`${users.balance} + ${rental.totalFee}` })
          .where(eq(users.id, rental.ownerId));
        await db.insert(transactions).values({
          userId: rental.ownerId,
          type: "EARNING",
          amount: rental.totalFee,
          description: `대여 수익 ${rental.totalFee.toLocaleString()}원`,
          relatedRentalId: rental.id,
        });
      }

      if (status === "cancelled") {
        await db
          .update(rentals)
          .set({ status: "cancelled" })
          .where(eq(rentals.id, rentalId));
        const [updated] = await db
          .select()
          .from(rentals)
          .where(eq(rentals.id, rentalId));
        return res.json(updated);
      }

      await db
        .update(rentals)
        .set({ status })
        .where(eq(rentals.id, rentalId));
      const [updated] = await db
        .select()
        .from(rentals)
        .where(eq(rentals.id, rentalId));
      return res.json(updated);
    },
  );

  app.get(
    "/api/chat/rooms",
    requireAuth,
    async (req: Request, res: Response) => {
      const userId = req.session.userId!;
      const rooms = await db
        .select()
        .from(chatRooms)
        .where(
          or(eq(chatRooms.user1Id, userId), eq(chatRooms.user2Id, userId)),
        )
        .orderBy(desc(chatRooms.lastMessageTime));

      const enriched = await Promise.all(
        rooms.map(async (room) => {
          const otherUserId =
            room.user1Id === userId ? room.user2Id : room.user1Id;
          const [otherUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, otherUserId));
          const roomItem = room.itemId
            ? (
                await db
                  .select()
                  .from(items)
                  .where(eq(items.id, room.itemId))
              )[0]
            : null;
          const { password: _, ...safeUser } = otherUser || ({} as any);
          return { ...room, otherUser: safeUser, item: roomItem };
        }),
      );

      return res.json(enriched);
    },
  );

  app.post(
    "/api/chat/rooms",
    requireAuth,
    async (req: Request, res: Response) => {
      const { otherUserId, itemId } = req.body;
      const userId = req.session.userId!;

      const existing = await db
        .select()
        .from(chatRooms)
        .where(
          and(
            or(
              and(
                eq(chatRooms.user1Id, userId),
                eq(chatRooms.user2Id, otherUserId),
              ),
              and(
                eq(chatRooms.user1Id, otherUserId),
                eq(chatRooms.user2Id, userId),
              ),
            ),
            eq(chatRooms.itemId, itemId),
          ),
        );

      if (existing.length > 0) {
        return res.json(existing[0]);
      }

      const [room] = await db
        .insert(chatRooms)
        .values({ user1Id: userId, user2Id: otherUserId, itemId })
        .returning();
      return res.status(201).json(room);
    },
  );

  app.get(
    "/api/chat/rooms/:id/messages",
    requireAuth,
    async (req: Request, res: Response) => {
      const roomId = parseInt(req.params.id);
      const msgs = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.roomId, roomId))
        .orderBy(chatMessages.createdAt);
      return res.json(msgs);
    },
  );

  app.post(
    "/api/chat/rooms/:id/messages",
    requireAuth,
    async (req: Request, res: Response) => {
      const roomId = parseInt(req.params.id);
      const { text: msgText, isSystem } = req.body;
      const [msg] = await db
        .insert(chatMessages)
        .values({
          roomId,
          senderId: isSystem ? "system" : req.session.userId!,
          text: msgText,
          isSystem: isSystem || false,
        })
        .returning();

      await db
        .update(chatRooms)
        .set({ lastMessage: msgText, lastMessageTime: new Date() })
        .where(eq(chatRooms.id, roomId));

      return res.status(201).json(msg);
    },
  );

  app.get(
    "/api/reviews/item/:itemId",
    async (req: Request, res: Response) => {
      const itemId = parseInt(req.params.itemId);
      const rvs = await db
        .select()
        .from(reviews)
        .where(eq(reviews.itemId, itemId))
        .orderBy(desc(reviews.createdAt));
      return res.json(rvs);
    },
  );

  app.get("/api/users/:id", async (req: Request, res: Response) => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.params.id));
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다" });
    }
    const { password: _, ...u } = user;
    return res.json(u);
  });

  app.get(
    "/api/admin/stats",
    requireAdmin,
    async (_req: Request, res: Response) => {
      const [userCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users);
      const [activeRentals] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(rentals)
        .where(
          or(
            eq(rentals.status, "renting"),
            eq(rentals.status, "paid"),
            eq(rentals.status, "requested"),
          ),
        );
      const [heldMoney] = await db
        .select({
          total: sql<number>`coalesce(sum(${rentals.depositHeld} + ${rentals.totalFee}), 0)::int`,
        })
        .from(rentals)
        .where(
          or(eq(rentals.status, "paid"), eq(rentals.status, "renting")),
        );
      return res.json({
        totalUsers: userCount?.count || 0,
        activeRentals: activeRentals?.count || 0,
        totalHeldMoney: heldMoney?.total || 0,
      });
    },
  );

  app.get(
    "/api/admin/users",
    requireAdmin,
    async (_req: Request, res: Response) => {
      const allUsers = await db
        .select({
          id: users.id,
          email: users.email,
          nickname: users.nickname,
          balance: users.balance,
          trustScore: users.trustScore,
          isAdmin: users.isAdmin,
          isBanned: users.isBanned,
          isShopOwner: users.isShopOwner,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt));
      return res.json(allUsers);
    },
  );

  app.put(
    "/api/admin/users/:id/ban",
    requireAdmin,
    async (req: Request, res: Response) => {
      const { banned } = req.body;
      await db
        .update(users)
        .set({ isBanned: banned })
        .where(eq(users.id, req.params.id));
      return res.json({ message: banned ? "계정 정지 완료" : "정지 해제 완료" });
    },
  );

  app.get(
    "/api/admin/items",
    requireAdmin,
    async (_req: Request, res: Response) => {
      const allItems = await db
        .select()
        .from(items)
        .orderBy(desc(items.createdAt));
      return res.json(allItems);
    },
  );

  app.delete(
    "/api/admin/items/:id",
    requireAdmin,
    async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      await db
        .update(items)
        .set({ isDeleted: true })
        .where(eq(items.id, id));
      return res.json({ message: "삭제 완료" });
    },
  );

  app.get(
    "/api/admin/transactions",
    requireAdmin,
    async (_req: Request, res: Response) => {
      const txns = await db
        .select()
        .from(transactions)
        .orderBy(desc(transactions.createdAt))
        .limit(100);
      return res.json(txns);
    },
  );

  app.get(
    "/api/admin/rentals",
    requireAdmin,
    async (_req: Request, res: Response) => {
      const allRentals = await db
        .select()
        .from(rentals)
        .orderBy(desc(rentals.createdAt));
      return res.json(allRentals);
    },
  );

  const httpServer = createServer(app);
  return httpServer;
}
