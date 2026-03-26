import { RequestHandler } from 'express';
import { deductCredits } from '../services/credits';

/**
 * Returns middleware that deducts `cost` credits before the AI handler runs.
 * On insufficient balance: 402 with { error: 'insufficient_credits', creditsRequired, creditsRemaining, upgradeUrl }
 */
export function requireCredits(cost: number): RequestHandler {
  return async (req, res, next) => {
    try {
      const userId = (req.user as any)!.id;
      const result = await deductCredits(userId, cost);

      if (!result.ok) {
        return res.status(402).json({
          error: 'insufficient_credits',
          message: `This action requires ${cost} credits. You have ${result.creditsRemaining} remaining.`,
          creditsRequired: cost,
          creditsRemaining: result.creditsRemaining,
          upgradeUrl: '/billing',
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
