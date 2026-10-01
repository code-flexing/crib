export interface VerificationEmailJobData {
  type: 'verification';
  to: string;
  token: string;
}

export interface PasswordResetEmailJobData {
  type: 'password-reset';
  to: string;
  token: string;
}

export interface WelcomeEmailJobData {
  type: 'welcome';
  to: string;
  displayName?: string | null;
}

export interface StudentApprovalEmailJobData {
  type: 'student-approval';
  to: string;
}

export interface StudentRejectionEmailJobData {
  type: 'student-rejection';
  to: string;
  reason: string;
}

export interface LandlordApprovalEmailJobData {
  type: 'landlord-approval';
  to: string;
}

export interface LandlordRejectionEmailJobData {
  type: 'landlord-rejection';
  to: string;
  reason: string;
}

export interface VerificationBadgeEmailJobData {
  type: 'verification-badge';
  to: string;
  displayName?: string | null;
  stage: 'PROFILE_VERIFIED' | 'AGENT_VERIFIED' | 'TRUST_CROWN';
  badge: 'GREEN_CHECK' | 'BLUE_SHIELD' | 'GOLD_CROWN';
  badgeColor: 'green' | 'blue' | 'gold';
  trustScore: number;
}

export interface ProviderContactEmailJobData {
  type: 'provider-contact';
  to: string;
  studentName: string;
  studentEmail: string;
  message: string;
  listingTitle?: string;
}

export interface SupportMessageEmailJobData {
  type: 'support-message';
  to: string;
  conversationId: string;
  message: string;
}

export type EmailJobData =
  | VerificationEmailJobData
  | PasswordResetEmailJobData
  | WelcomeEmailJobData
  | StudentApprovalEmailJobData
  | StudentRejectionEmailJobData
  | LandlordApprovalEmailJobData
  | LandlordRejectionEmailJobData
  | VerificationBadgeEmailJobData
  | ProviderContactEmailJobData
  | SupportMessageEmailJobData;

  