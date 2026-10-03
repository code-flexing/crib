import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserService } from './users.service.js';
import { UpdateUserDto, ChangePasswordDto, UserResponseDto } from './dto/user.dto.js';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @Roles('UNVERIFIED', 'STUDENT', 'AGENT', 'LANDLORD', 'ADMIN')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  getProfile(@CurrentUser() user: { id: string }) {
    return this.userService.getProfile(user.id);
  }

  @Get('discover')
  @Roles('UNVERIFIED', 'STUDENT', 'AGENT', 'LANDLORD', 'ADMIN')
  @ApiOperation({ summary: 'Search verified users and provider pages' })
  discover(@CurrentUser() user: { id: string }, @Query('q') query = '') {
    return this.userService.discoverPeople(query, user.id);
  }

  @Get('me/engagement-stats')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Get private student activity totals' })
  getStudentEngagementStats(@CurrentUser() user: { id: string }) {
    return this.userService.getStudentEngagementStats(user.id);
  }

  @Post(':id/follow')
  @Roles('UNVERIFIED', 'STUDENT', 'AGENT', 'LANDLORD', 'ADMIN')
  followUser(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.userService.followUser(user.id, id);
  }

  @Delete(':id/follow')
  @Roles('UNVERIFIED', 'STUDENT', 'AGENT', 'LANDLORD', 'ADMIN')
  unfollowUser(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.userService.unfollowUser(user.id, id);
  }

  @Post('pages/:id/follow')
  @Roles('UNVERIFIED', 'STUDENT', 'AGENT', 'LANDLORD', 'ADMIN')
  followPage(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.userService.followPage(user.id, id);
  }

  @Delete('pages/:id/follow')
  @Roles('UNVERIFIED', 'STUDENT', 'AGENT', 'LANDLORD', 'ADMIN')
  unfollowPage(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.userService.unfollowPage(user.id, id);
  }

  @Get(':id/public-profile')
  @Roles('UNVERIFIED', 'STUDENT', 'AGENT', 'LANDLORD', 'ADMIN')
  @ApiOperation({ summary: 'Get a safe, public profile for a verified account' })
  @ApiResponse({ status: 200, description: 'Public profile and verified provider listings' })
  @ApiResponse({ status: 404, description: 'Public profile is unavailable' })
  getPublicProfile(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.userService.getPublicProfile(id, user.id);
  }

  @Patch('me')
  @Roles('UNVERIFIED', 'STUDENT', 'AGENT', 'LANDLORD', 'ADMIN')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  updateProfile(@CurrentUser() user: { id: string }, @Body() dto: UpdateUserDto) {
    return this.userService.updateProfile(user.id, dto);
  }

  @Post('me/change-password')
  @Roles('UNVERIFIED', 'STUDENT', 'AGENT', 'LANDLORD', 'ADMIN')
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 400, description: 'Current password invalid' })
  changePassword(@CurrentUser() user: { id: string }, @Body() dto: ChangePasswordDto) {
    return this.userService.changePassword(user.id, dto);
  }
}
