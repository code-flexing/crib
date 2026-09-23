export type SupportStatus = "OPEN" | "RESOLVED";
export type SupportSenderRole = "USER" | "ADMIN";

export type SupportMessage = {
  id: string;
  conversationId: string;
  senderId?: string;
  senderRole: SupportSenderRole;
  body: string;
  createdAt: string;
};

export type SupportConversation = {
  id: string;
  userId?: string;
  status: SupportStatus;
  subject?: string | null;
  lastMessageAt?: string;
  createdAt?: string;
  messages?: SupportMessage[];
  user?: { id?: string; displayName?: string; email?: string };
  latestMessage?: SupportMessage;
};

export function unwrapSupportList(value: unknown): SupportConversation[] {
  if (Array.isArray(value)) return value as SupportConversation[];
  if (typeof value === "object" && value !== null && "items" in value && Array.isArray(value.items)) return value.items as SupportConversation[];
  return [];
}

export function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function supportTimestamp(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}
