import { SetMetadata } from '@nestjs/common';

export const VERIFIED_CONSUMER_KEY = 'requireVerifiedConsumer';
export const STUDENT_PROFILE_APPROVED_KEY = 'requireApprovedStudent';

export const RequireVerifiedConsumer = () => SetMetadata(VERIFIED_CONSUMER_KEY, true);
export const RequireApprovedStudent = () => SetMetadata(STUDENT_PROFILE_APPROVED_KEY, true);