import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { TrustService } from './trust.service.js';

@ApiTags('Trust')
@ApiBearerAuth('access-token')
@Controller('trust')
export class TrustController {
  constructor(private readonly trustService: TrustService) {}

  @Get('users/:userId')
  @Roles('STUDENT', 'AGENT', 'LANDLORD', 'ADMIN')
  @ApiOperation({ summary: 'Get trust score for a user (visible in profile)' })
  @ApiResponse({ status: 200, description: 'Trust score result' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserTrustScore(@Param('userId') userId: string) {
    return this.trustService.getTrustScore(userId);
  }

  @Get('users/:userId/verification-stage')
  @Roles('STUDENT', 'AGENT', 'LANDLORD', 'ADMIN')
  @ApiOperation({ summary: 'Get the staged verification badge state for a user' })
  @ApiResponse({ status: 200, description: 'Verification stage result' })
  getUserVerificationStage(@Param('userId') userId: string) {
    return this.trustService.getVerificationStage(userId);
  }

  @Get('users/:userId/breakdown')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get full trust score breakdown for a user (admin)' })
  @ApiResponse({ status: 200, description: 'Full trust event breakdown' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserTrustBreakdown(@Param('userId') userId: string) {
    return this.trustService.getTrustScoreBreakdown(userId);
  }

  @Get('me')
  @Roles('STUDENT', 'AGENT', 'LANDLORD')
  @ApiOperation({ summary: 'Get your own trust score' })
  @ApiResponse({ status: 200, description: 'Trust score result' })
  getMyTrustScore(@CurrentUser() user: { id: string }) {
    return this.trustService.getTrustScore(user.id);
  }

  @Get('me/verification-stage')
  @Roles('STUDENT', 'AGENT', 'LANDLORD', 'ADMIN')
  @ApiOperation({ summary: 'Get your own verification badge state' })
  @ApiResponse({ status: 200, description: 'Verification stage result' })
  getMyVerificationStage(@CurrentUser() user: { id: string }) {
    return this.trustService.getVerificationStage(user.id);
  }

  @Post('me/activity')
  @Roles('AGENT', 'LANDLORD')
  @ApiOperation({ summary: 'Record a provider active day for discovery ranking' })
  recordMyActivity(@CurrentUser() user: { id: string }) {
    return this.trustService.recordProviderActivity(user.id);
  }

  @Get('me/recommendations')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'List providers recommended by the current student' })
  getMyRecommendations(@CurrentUser() user: { id: string }) {
    return this.trustService.getMyRecommendations(user.id);
  }

  @Post('users/:userId/recommendation')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Recommend a provider to other students' })
  recommendProvider(@Param('userId') providerId: string, @CurrentUser() user: { id: string }) {
    return this.trustService.recommendProvider(user.id, providerId);
  }

  @Delete('users/:userId/recommendation')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Remove a provider recommendation' })
  removeProviderRecommendation(@Param('userId') providerId: string, @CurrentUser() user: { id: string }) {
    return this.trustService.removeProviderRecommendation(user.id, providerId);
  }

  @Get('users/:userId/discovery-stats')
  @Roles('STUDENT', 'AGENT', 'LANDLORD', 'ADMIN')
  @ApiOperation({ summary: 'Get public provider discovery signals' })
  getProviderDiscoveryStats(@Param('userId') providerId: string) {
    return this.trustService.getProviderDiscoveryStats(providerId);
  }
}
