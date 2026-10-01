import { ConflictException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { StudentProfileService } from '../student-profiles/student-profiles.service.js';
import { TrustService } from '../trust/trust.service.js';
import type { CreateProviderPageDto } from './dto/provider-page.dto.js';
import { generateBusinessReference, ProviderPagesService } from './provider-pages.service.js';

const createDto = (overrides: Record<string, unknown> = {}) => ({
  displayName: 'Amina Homes',
  proofOfLicense: 'private-license-media-id',
  profilePicture: 'profile-media-id',
  payoutAccounts: [{
    provider: 'Bank',
    accountName: 'Amina Homes',
    accountNumber: '0123456789',
  }],
  providerType: 'AGENT',
  ...overrides,
}) as CreateProviderPageDto;

function createService(role: string) {
  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'user-id',
        email: 'amina@example.com',
        displayName: 'Amina Homes',
        role,
      }),
    },
    providerPage: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'page-id', ...data })),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  const service = new ProviderPagesService(
    prisma as unknown as PrismaService,
    {} as TrustService,
    {} as StudentProfileService,
    {} as Queue,
  );
  return { prisma, service };
}

describe('generateBusinessReference', () => {
  it('generates unique opaque SafeCrib references', () => {
    const references = Array.from({ length: 1000 }, generateBusinessReference);

    expect(references.every((reference) => /^SC-[A-F0-9]{32}$/.test(reference))).toBe(true);
    expect(new Set(references).size).toBe(references.length);
  });
});

describe('ProviderPagesService.create', () => {
  it('requires explicit consent before a verified student starts provider mode', async () => {
    const { prisma, service } = createService('STUDENT');

    await expect(service.create('user-id', createDto())).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.providerPage.create).not.toHaveBeenCalled();
  });

  it('ignores any client reference and generates one for an unverified account', async () => {
    const { prisma, service } = createService('UNVERIFIED');
    const page = await service.create(
      'user-id',
      createDto({ businessRegNumber: 'CLIENT-SUPPLIED', switchAccountToProvider: false }),
    );
    const savedData = prisma.providerPage.create.mock.calls[0][0].data;

    expect(savedData.businessRegNumber).toMatch(/^SC-[A-F0-9]{32}$/);
    expect(savedData.businessRegNumber).not.toBe('CLIENT-SUPPLIED');
    expect(page.businessRegNumber).toBe(savedData.businessRegNumber);
  });

  it('persists explicit conversion consent for an approved student', async () => {
    const { prisma, service } = createService('STUDENT');

    await service.create('user-id', createDto({ switchAccountToProvider: true }));

    expect(prisma.providerPage.create.mock.calls[0][0].data.accountModeConversionConsented).toBe(true);
  });
});