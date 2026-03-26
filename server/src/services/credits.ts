import { prisma } from '../config/prisma';

/**
 * Atomically deducts `cost` credits from the user's subscription.
 * Returns { ok: true } if deducted, { ok: false, creditsRemaining } if insufficient.
 *
 * Uses a raw UPDATE with WHERE creditsRemaining >= cost to prevent negative balances
 * without needing a transaction.
 */
export async function deductCredits(
  userId: string,
  cost: number
): Promise<{ ok: boolean; creditsRemaining: number }> {
  // Ensure subscription row exists (lazy creation for pre-existing users)
  await prisma.subscription.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  // Atomic conditional decrement — only updates if balance is sufficient
  const result = await prisma.$executeRaw`
    UPDATE "Subscription"
    SET "creditsRemaining" = "creditsRemaining" - ${cost},
        "updatedAt" = NOW()
    WHERE "userId" = ${userId}
      AND "creditsRemaining" >= ${cost}
  `;

  if (result === 0) {
    // No row was updated — insufficient credits
    const sub = await prisma.subscription.findUnique({
      where: { userId },
      select: { creditsRemaining: true },
    });
    return { ok: false, creditsRemaining: sub?.creditsRemaining ?? 0 };
  }

  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { creditsRemaining: true },
  });
  return { ok: true, creditsRemaining: sub?.creditsRemaining ?? 0 };
}
