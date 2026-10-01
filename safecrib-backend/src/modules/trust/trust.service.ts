import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { EMAIL_QUEUE } from '../../infra/queue/queue.constants.js';
import { computeTrustScore } from '../../domain/trust/trust-score.engine.js';
import type { EmailJobData } from '../../infra/mail/mail-job.types.js';
import type { TrustEvent } from '../../domain/trust/trust-score.engine.js';

export type VerificationStageName = 'PROFILE_VERIFIED' | 'AGENT_VERIFIED' | 'TRUST_CROWN';
export type VerificationBadge = 'GREEN_CHECK' | 'BLUE_SHIELD' | 'GOLD_CROWN';
export type VerificationBadgeColor = 'green' | 'blue' | 'gold';

export interface VerificationStageCriterion {
  key: 'identity' | 'provider' | 'student' | 'trust';
  label: string;
  met: boolean;
  required: boolean;
}

export interface VerificationStageResult {
  userId: string;
  role: string | null;
  stage: VerificationStageName;
  badge: VerificationBadge;
  badgeColor: VerificationBadgeColor;
  riskBlocked: boolean;
  nextMilestone: string | null;
  criteria: VerificationStageCriterion[];
  generatedAt: Date;
}

export interface ComputeUserVerificationStageInput {
  userId: string;
  role?: string | null;
  identityVerified?: boolean;
  trustScore?: number | null;
  providerPageVerified?: boolean;
  studentProfileApproved?: boolean;
  confirmedFraudCount?: number;
  recentFraudCount?: number;
  flaggedForReview?: boolean;
}

export function computeUserVerificationStage(
  input: ComputeUserVerificationStageInput,
): VerificationStageResult {
  const role = input.role ?? null;
  const confirmedFraudCount = Math.max(0, input.confirmedFraudCount ?? 0);
  const recentFraudCount = Math.max(0, input.recentFraudCount ?? 0);
  const flaggedForReview = input.flaggedForReview === true;
  const riskBlocked = confirmedFraudCount > 0 || recentFraudCount > 0 || flaggedForReview;

  const identityMet = input.identityVerified === true;
  const providerMet = ['AGENT', 'LANDLORD'].includes(role ?? '') && input.providerPageVerified === true;
  const studentMet = role === 'STUDENT' && input.studentProfileApproved === true;
  const trustMet = (input.trustScore ?? 0) >= 85;

  const criteria: VerificationStageCriterion[] = [
    { key: 'identity', label: 'Identity verified', met: identityMet, required: true },
    { key: 'provider', label: 'Provider verification', met: providerMet, required: false },
    { key: 'student', label: 'Student verification', met: studentMet, required: false },
    { key: 'trust', label: 'Trust score threshold', met: trustMet, required: false },
  ];

  let stage: VerificationStageName = 'PROFILE_VERIFIED';
  let badge: VerificationBadge = 'GREEN_CHECK';
  let badgeColor: VerificationBadgeColor = 'green';
  let nextMilestone: string | null = null;

  if (riskBlocked) {
    stage = 'PROFILE_VERIFIED';
    badge = 'GREEN_CHECK';
    badgeColor = 'green';
    nextMilestone = 'Resolve reported fraud and restore account health';
  } else if (!identityMet) {
    stage = 'PROFILE_VERIFIED';
    badge = 'GREEN_CHECK';
    badgeColor = 'green';
    nextMilestone = 'Complete identity verification';
  } else if (providerMet && trustMet) {
    stage = 'TRUST_CROWN';
    badge = 'GOLD_CROWN';
    badgeColor = 'gold';
    nextMilestone = null;
  } else if (providerMet) {
    stage = 'AGENT_VERIFIED';
    badge = 'BLUE_SHIELD';
    badgeColor = 'blue';
    nextMilestone = 'Reach a trust score of 85 for the crown badge';
  } else {
    stage = 'PROFILE_VERIFIED';
    badge = 'GREEN_CHECK';
    badgeColor = 'green';
    if (['AGENT', 'LANDLORD'].includes(role ?? '')) {
      nextMilestone = 'Submit and verify your provider profile';
    } else {
      nextMilestone = 'Complete profile verification to unlock recognition';
    }
  }

  return {
    userId: input.userId,
    role,
    stage,
    badge,
    badgeColor,
    riskBlocked,
    nextMilestone,
    criteria,
    generatedAt: new Date(),
  };
}

export interface TrustScoreResult {
  score: number | null;
  breakdown: Record<string, number>;
  flaggedForReview: boolean;
  lastUpdated: Date | null;
  eventCount: number;
}

@Injectable()
export class TrustService {
  private readonly logger = new Logger(TrustService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue<EmailJobData>,
  ) {}

  async getVerificationStage(userId: string): Promise<VerificationStageResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        identityVerified: true,
        trustScore: true,
        providerPage: {
          select: { verificationState: true },
        },
        studentProfile: {
          select: { status: true },
        },
        verification: {
          select: {
            stage: true,
            badge: true,
            badgeColor: true,
            riskBlocked: true,
            identityVerified: true,
            nextMilestone: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const trustScore = await this.getTrustScore(userId);
    const confirmedFraudCount = await this.prisma.fraudReport.count({
      where: { targetUserId: userId, status: 'CONFIRMED' },
    });
    const recentFraudCount = await this.prisma.fraudReport.count({
      where: {
        targetUserId: userId,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    const computed = computeUserVerificationStage({
      userId: user.id,
      role: user.role,
      identityVerified: user.identityVerified,
      trustScore: user.trustScore ?? trustScore.score ?? 0,
      providerPageVerified: user.providerPage?.verificationState === 'VERIFIED',
      studentProfileApproved: user.studentProfile?.status === 'APPROVED',
      confirmedFraudCount,
      recentFraudCount,
      flaggedForReview: trustScore.flaggedForReview,
    });

    await this.prisma.userVerification.upsert({
      where: { userId },
      update: {
        stage: computed.stage,
        badge: computed.badge,
        badgeColor: computed.badgeColor,
        riskBlocked: computed.riskBlocked,
        identityVerified: computed.criteria.some((criterion) => criterion.key === 'identity' && criterion.met),
        providerVerified: computed.criteria.some((criterion) => criterion.key === 'provider' && criterion.met),
        studentProfileApproved: computed.criteria.some((criterion) => criterion.key === 'student' && criterion.met),
        trustScore: computed.stage === 'TRUST_CROWN' ? Math.max(85, Number(user.trustScore ?? trustScore.score ?? 0)) : Number(user.trustScore ?? trustScore.score ?? 0),
        nextMilestone: computed.nextMilestone,
        lastComputedAt: new Date(),
      },
      create: {
        userId,
        stage: computed.stage,
        badge: computed.badge,
        badgeColor: computed.badgeColor,
        riskBlocked: computed.riskBlocked,
        identityVerified: computed.criteria.some((criterion) => criterion.key === 'identity' && criterion.met),
        providerVerified: computed.criteria.some((criterion) => criterion.key === 'provider' && criterion.met),
        studentProfileApproved: computed.criteria.some((criterion) => criterion.key === 'student' && criterion.met),
        trustScore: Number(user.trustScore ?? trustScore.score ?? 0),
        nextMilestone: computed.nextMilestone,
      },
    });

    this.enqueueBadgeAwardIfNew(user, computed, Number(user.trustScore ?? trustScore.score ?? 0));

    return { ...computed, generatedAt: new Date() };
  }

  private enqueueBadgeAwardIfNew(
    user: {
      id: string;
      email: string;
      displayName: string | null;
      verification: { stage: VerificationStageName; identityVerified: boolean } | null;
    },
    computed: VerificationStageResult,
    trustScore: number,
  ) {
    if (computed.riskBlocked) return;

    const previous = user.verification;
    const identityMet = computed.criteria.some((criterion) => criterion.key === 'identity' && criterion.met);
    const newlyAwarded =
      (computed.stage === 'TRUST_CROWN' && previous?.stage !== 'TRUST_CROWN') ||
      (computed.stage === 'AGENT_VERIFIED' && previous?.stage !== 'AGENT_VERIFIED' && previous?.stage !== 'TRUST_CROWN') ||
      (computed.stage === 'PROFILE_VERIFIED' && identityMet && previous?.identityVerified !== true);

    if (!newlyAwarded) return;

    void this.emailQueue
      .add('verification-badge-awarded', {
        type: 'verification-badge',
        to: user.email,
        displayName: user.displayName,
        stage: computed.stage,
        badge: computed.badge,
        badgeColor: computed.badgeColor,
        trustScore,
      }, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
        jobId: `email:verification-badge:${user.id}:${computed.stage}`,
      })
      .catch((error: Error) => {
        this.logger.error(`Unable to queue verification badge email for ${user.email}: ${error.message}`, error.stack);
      });
  }

  async getTrustScore(userId: string): Promise<TrustScoreResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        trustScore: true,
        trustScoreUpdatedAt: true,
        _count: { select: { trustEvents: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.trustScore === null || user.trustScoreUpdatedAt === null) {
      const result = await this.recomputeScore(userId);
      return result;
    }

    return {
      score: user.trustScore,
      breakdown: {},
      flaggedForReview: false,
      lastUpdated: user.trustScoreUpdatedAt,
      eventCount: user._count.trustEvents,
    };
  }

  async recomputeScore(userId: string): Promise<TrustScoreResult> {
    const events = await this.prisma.trustEvent.findMany({
      where: { userId },
      orderBy: { occurredAt: 'desc' },
    });

    const domainEvents: TrustEvent[] = events.map((e) => ({
      type: e.eventType as TrustEvent['type'],
      weight: e.weight,
      occurredAt: e.occurredAt,
      reviewerTrustFactor: (e.payload as any)?.reviewerTrustFactor,
    }));

    const result = computeTrustScore(domainEvents, new Date());

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        trustScore: result.score,
        trustScoreUpdatedAt: new Date(),
      },
    });

    return {
      score: result.score,
      breakdown: result.breakdown,
      flaggedForReview: result.flaggedForReview,
      lastUpdated: new Date(),
      eventCount: events.length,
    };
  }

  async recordTrustEvent(
    userId: string,
    eventType: TrustEvent['type'],
    weight: number,
    payload?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.trustEvent.create({
      data: {
        userId,
        eventType,
        weight,
        payload: payload ?? undefined as any,
      },
    });
  }

  async getTrustScoreBreakdown(userId: string): Promise<{
    score: number;
    breakdown: Record<string, number>;
    flaggedForReview: boolean;
    events: Array<{ type: string; weight: number; occurredAt: Date }>;
  }> {
    const events = await this.prisma.trustEvent.findMany({
      where: { userId },
      orderBy: { occurredAt: 'desc' },
    });

    const domainEvents: TrustEvent[] = events.map((e) => ({
      type: e.eventType as TrustEvent['type'],
      weight: e.weight,
      occurredAt: e.occurredAt,
      reviewerTrustFactor: (e.payload as any)?.reviewerTrustFactor,
    }));

    const result = computeTrustScore(domainEvents, new Date());

    return {
      score: result.score,
      breakdown: result.breakdown,
      flaggedForReview: result.flaggedForReview,
      events: events.map((e) => ({
        type: e.eventType,
        weight: e.weight,
        occurredAt: e.occurredAt,
      })),
    };
  }
}
