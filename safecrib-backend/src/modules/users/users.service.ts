import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { computeUserVerificationStage } from '../trust/trust.service.js';
import type { UpdateUserDto } from './dto/user.dto.js';
import type { ChangePasswordDto } from './dto/user.dto.js';
import type { Role } from '../../common/roles.decorator.js';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        profilePicture: true,
        role: true,
        emailVerified: true,
        identityVerified: true,
        trustScore: true,
        trustScoreUpdatedAt: true,
        createdAt: true,
        providerPage: {
          select: {
            verificationState: true,
          },
        },
        studentProfile: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { studentProfile, ...rest } = user;
    const verificationStage = computeUserVerificationStage({
      userId: user.id,
      role: user.role,
      identityVerified: user.identityVerified,
      trustScore: user.trustScore ?? 0,
      providerPageVerified: user.providerPage?.verificationState === 'VERIFIED',
      studentProfileApproved: studentProfile?.status === 'APPROVED',
      confirmedFraudCount: 0,
      recentFraudCount: 0,
      flaggedForReview: false,
    });

    return {
      ...rest,
      studentProfileStatus: studentProfile?.status ?? 'NOT_SUBMITTED',
      verificationStage,
    };
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.role && dto.role !== user.role && user.role !== 'ADMIN') {
      throw new BadRequestException('Cannot change own role');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName ?? undefined,
        profilePicture: dto.profilePicture ?? undefined,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        profilePicture: true,
        role: true,
        emailVerified: true,
        identityVerified: true,
        trustScore: true,
        createdAt: true,
      },
    });
  }

  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        profilePicture: true,
        role: true,
        identityVerified: true,
        createdAt: true,
        studentProfile: {
          select: { status: true, profilePicture: true },
        },
        providerPage: {
          select: {
            displayName: true,
            description: true,
            providerType: true,
            businessName: true,
            profilePicture: true,
            verificationState: true,
            verifiedAt: true,
            socialLinks: true,
            listings: {
              where: { status: { in: ['VERIFIED', 'ACTIVE'] } },
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                title: true,
                description: true,
                price: true,
                discountAmount: true,
                campus: true,
                address: true,
                createdAt: true,
                photos: { select: { id: true, url: true } },
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Public profile unavailable');
    const providerVerified =
      ['AGENT', 'LANDLORD'].includes(user.role) &&
      user.providerPage?.verificationState === 'VERIFIED';
    const studentVerified =
      user.role === 'STUDENT' && user.studentProfile?.status === 'APPROVED';
    if (!providerVerified && !studentVerified) {
      throw new NotFoundException('Public profile unavailable');
    }

    const providerPage = providerVerified ? user.providerPage : null;
    return {
      id: user.id,
      displayName: providerPage?.displayName ?? user.displayName,
      role: user.role,
      createdAt: user.createdAt,
      identityVerified: user.identityVerified,
      profilePicture:
        user.profilePicture ??
        providerPage?.profilePicture ??
        (studentVerified ? user.studentProfile?.profilePicture : null),
      provider: providerPage
        ? {
            displayName: providerPage.displayName,
            description: providerPage.description,
            providerType: providerPage.providerType,
            businessName: providerPage.businessName,
            verifiedAt: providerPage.verifiedAt,
            socialLinks: providerPage.socialLinks,
          }
        : null,
      listings: providerPage?.listings ?? [],
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const valid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!valid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
      timeCost: 3,
      memoryCost: 8192,
      parallelism: 2,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password changed successfully' };
  }

  async setUserRole(userId: string, role: Role) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });
  }
}
