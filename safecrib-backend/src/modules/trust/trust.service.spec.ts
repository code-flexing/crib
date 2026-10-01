import { describe, expect, it, vi } from 'vitest';
import { computeUserVerificationStage, TrustService } from './trust.service.js';
import type { PrismaService } from '../../infra/prisma/prisma.service.js';

describe('computeUserVerificationStage', () => {
  it('promotes a fully verified agent to the provider badge', () => {
    const result = computeUserVerificationStage({
      userId: 'user_1',
      role: 'AGENT',
      identityVerified: true,
      trustScore: 78,
      providerPageVerified: true,
      studentProfileApproved: false,
      confirmedFraudCount: 0,
      recentFraudCount: 0,
      flaggedForReview: false,
    });

    expect(result.stage).toBe('AGENT_VERIFIED');
    expect(result.badgeColor).toBe('blue');
    expect(result.criteria.some((item) => item.key === 'provider')).toBe(true);
  });

  it('promotes a top trust agent to the crown badge', () => {
    const result = computeUserVerificationStage({
      userId: 'user_2',
      role: 'AGENT',
      identityVerified: true,
      trustScore: 92,
      providerPageVerified: true,
      studentProfileApproved: false,
      confirmedFraudCount: 0,
      recentFraudCount: 0,
      flaggedForReview: false,
    });

    expect(result.stage).toBe('TRUST_CROWN');
    expect(result.badgeColor).toBe('gold');
    expect(result.badge).toBe('GOLD_CROWN');
  });

  it('blocks escalation when confirmed fraud exists', () => {
    const result = computeUserVerificationStage({
      userId: 'user_3',
      role: 'AGENT',
      identityVerified: true,
      trustScore: 90,
      providerPageVerified: true,
      studentProfileApproved: false,
      confirmedFraudCount: 2,
      recentFraudCount: 2,
      flaggedForReview: true,
    });

    expect(result.riskBlocked).toBe(true);
    expect(result.stage).toBe('PROFILE_VERIFIED');
  });
});

describe('TrustService verification badge emails', () => {
  it('queues a badge email once when a user first reaches a new stage', async () => {
    const emailQueue = { add: vi.fn().mockResolvedValue(undefined) };
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user_4',
          email: 'provider@example.com',
          displayName: 'A Provider',
          role: 'AGENT',
          identityVerified: true,
          trustScore: 78,
          providerPage: { verificationState: 'VERIFIED' },
          studentProfile: null,
          verification: {
            stage: 'PROFILE_VERIFIED',
            identityVerified: true,
          },
        }),
      },
      fraudReport: { count: vi.fn().mockResolvedValue(0) },
      userVerification: { upsert: vi.fn().mockResolvedValue({}) },
    } as unknown as PrismaService;
    const service = new TrustService(prisma, emailQueue as never);
    vi.spyOn(service, 'getTrustScore').mockResolvedValue({
      score: 78,
      breakdown: {},
      flaggedForReview: false,
      lastUpdated: new Date(),
      eventCount: 0,
    });

    await service.getVerificationStage('user_4');

    expect(emailQueue.add).toHaveBeenCalledWith(
      'verification-badge-awarded',
      expect.objectContaining({
        type: 'verification-badge',
        to: 'provider@example.com',
        stage: 'AGENT_VERIFIED',
        badge: 'BLUE_SHIELD',
      }),
      expect.objectContaining({ jobId: 'email:verification-badge:user_4:AGENT_VERIFIED' }),
    );
  });

  it('does not queue another email when the user remains at the same stage', async () => {
    const emailQueue = { add: vi.fn() };
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user_5',
          email: 'provider@example.com',
          displayName: null,
          role: 'AGENT',
          identityVerified: true,
          trustScore: 78,
          providerPage: { verificationState: 'VERIFIED' },
          studentProfile: null,
          verification: {
            stage: 'AGENT_VERIFIED',
            identityVerified: true,
          },
        }),
      },
      fraudReport: { count: vi.fn().mockResolvedValue(0) },
      userVerification: { upsert: vi.fn().mockResolvedValue({}) },
    } as unknown as PrismaService;
    const service = new TrustService(prisma, emailQueue as never);
    vi.spyOn(service, 'getTrustScore').mockResolvedValue({
      score: 78,
      breakdown: {},
      flaggedForReview: false,
      lastUpdated: new Date(),
      eventCount: 0,
    });

    await service.getVerificationStage('user_5');

    expect(emailQueue.add).not.toHaveBeenCalled();
  });
});
