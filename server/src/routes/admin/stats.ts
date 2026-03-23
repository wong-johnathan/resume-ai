import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { ActivityAction } from '../../services/activityLog';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const [
      totalUsers,
      resumesByStatus,
      totalJobs,
      resumesDeletedCount,
      resumesArchivedCount,
      aiTailorCount,
      aiCoverLetterCount,
      aiInterviewPrepCount,
      aiSummaryCount,
      uniqueVisitorsResult,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.resume.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.jobApplication.count(),
      prisma.activityLog.count({ where: { action: ActivityAction.RESUME_DELETED } }),
      prisma.activityLog.count({ where: { action: ActivityAction.RESUME_ARCHIVED } }),
      prisma.activityLog.count({ where: { action: ActivityAction.AI_TAILOR } }),
      prisma.activityLog.count({ where: { action: ActivityAction.AI_COVER_LETTER } }),
      prisma.activityLog.count({ where: { action: ActivityAction.AI_INTERVIEW_PREP } }),
      prisma.activityLog.count({ where: { action: ActivityAction.AI_SUMMARY } }),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT "userId") as count FROM "ActivityLog" WHERE action = 'LOGIN'
      `,
    ]);

    const resumeStatusMap = Object.fromEntries(
      resumesByStatus.map((r) => [r.status, r._count.status])
    );

    res.json({
      totalUsers,
      resumes: {
        draft: resumeStatusMap['DRAFT'] ?? 0,
        final: resumeStatusMap['FINAL'] ?? 0,
        archived: resumeStatusMap['ARCHIVED'] ?? 0,
      },
      resumesDeleted: resumesDeletedCount,
      resumesArchived: resumesArchivedCount,
      totalJobs,
      uniqueVisitors: Number(uniqueVisitorsResult[0]?.count ?? 0),
      aiUsage: {
        tailor: aiTailorCount,
        coverLetter: aiCoverLetterCount,
        interviewPrep: aiInterviewPrepCount,
        summary: aiSummaryCount,
      },
    });
  } catch (err) { next(err); }
});

export default router;
