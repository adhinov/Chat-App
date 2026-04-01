/**
 * 📚 EXAMPLES: How to use Neon-optimized Prisma queries
 * 
 * These examples show how to handle Neon's auto-suspend behavior
 * and connection issues gracefully using retry logic.
 */

import prisma from "../lib/prisma";
import { retryOperation } from "../lib/db-utils";
import { Request, Response } from "express";

// ════════════════════════════════════════════════════════════════
// ❌ BEFORE (Without Retry - Prone to Neon connection errors)
// ════════════════════════════════════════════════════════════════
export async function getUsersOldWay(req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
}

// ════════════════════════════════════════════════════════════════
// ✅ AFTER (With Retry - Handles Neon auto-suspend gracefully)
// ════════════════════════════════════════════════════════════════
export async function getUsersNewWay(req: Request, res: Response) {
  try {
    const users = await retryOperation(async () => {
      return await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
          avatar: true,
          createdAt: true,
        },
      });
    });

    res.json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    res.status(500).json({ 
      error: "Failed to fetch users",
      message: "Database connection error. Please try again."
    });
  }
}

// ════════════════════════════════════════════════════════════════
// 📝 More Examples
// ════════════════════════════════════════════════════════════════

// Example 1: Create user with retry
export async function createUserWithRetry(email: string, username: string) {
  return await retryOperation(async () => {
    return await prisma.user.create({
      data: {
        email,
        username,
        role: "USER",
      },
    });
  });
}

// Example 2: Update with retry
export async function updateUserWithRetry(userId: number, data: any) {
  return await retryOperation(async () => {
    return await prisma.user.update({
      where: { id: userId },
      data,
    });
  });
}

// Example 3: Complex query with retry
export async function getMessagesWithSenderWithRetry(limit = 50) {
  return await retryOperation(async () => {
    return await prisma.messages.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });
  });
}

// Example 4: Transaction with retry
export async function createMessageTransactionWithRetry(
  senderId: number,
  text: string
) {
  return await retryOperation(async () => {
    return await prisma.$transaction(async (tx) => {
      // Create message
      const message = await tx.messages.create({
        data: {
          text,
          senderId,
        },
      });

      // Update user's last activity
      await tx.user.update({
        where: { id: senderId },
        data: { lastLogin: new Date() },
      });

      return message;
    });
  });
}

// Example 5: Raw SQL with retry (for complex queries)
export async function rawQueryWithRetry() {
  return await retryOperation(async () => {
    return await prisma.$queryRaw`
      SELECT u.username, COUNT(m.id) as message_count
      FROM "User" u
      LEFT JOIN "Messages" m ON m."senderId" = u.id
      GROUP BY u.id, u.username
      ORDER BY message_count DESC
      LIMIT 10
    `;
  });
}

// Example 6: Pagination with retry
export async function getMessagesPaginatedWithRetry(
  page: number = 1,
  limit: number = 20
) {
  return await retryOperation(async () => {
    const skip = (page - 1) * limit;
    
    const [messages, total] = await Promise.all([
      prisma.messages.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.messages.count(),
    ]);

    return {
      data: messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });
}

// Example 7: Upsert with retry
export async function upsertUserWithRetry(email: string, data: any) {
  return await retryOperation(async () => {
    return await prisma.user.upsert({
      where: { email },
      update: data,
      create: {
        email,
        ...data,
      },
    });
  });
}

// Example 8: Delete with retry
export async function deleteMessageWithRetry(messageId: number) {
  return await retryOperation(async () => {
    return await prisma.messages.delete({
      where: { id: messageId },
    });
  });
}

// Example 9: Aggregate with retry
export async function getUserStatsWithRetry(userId: number) {
  return await retryOperation(async () => {
    const messageCount = await prisma.messages.count({
      where: { senderId: userId },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    return {
      ...user,
      messageCount,
    };
  });
}

// Example 10: Batch operations with retry
export async function batchCreateMessagesWithRetry(messages: any[]) {
  return await retryOperation(async () => {
    return await prisma.messages.createMany({
      data: messages,
    });
  });
}