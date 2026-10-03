export type VerificationStage = "PROFILE_VERIFIED" | "AGENT_VERIFIED" | "TRUST_CROWN";

export type VerificationCriterion = {
  key: string;
  label?: string;
  met: boolean;
  required?: boolean;
};

export type VerificationStageResult = {
  userId?: string;
  role?: string;
  eligible: boolean;
  stage: VerificationStage;
  badge: "GREEN_CHECK" | "BLUE_SHIELD" | "GOLD_CROWN";
  badgeColor: "green" | "blue" | "gold";
  riskBlocked: boolean;
  nextMilestone: string | null;
  criteria: VerificationCriterion[];
  generatedAt?: string;
};

const stageConfig = {
  PROFILE_VERIFIED: {
    badge: "GREEN_CHECK",
    color: "green",
    label: "Verified",
    tone: "border-[#2ECC71]/35 bg-[#2ECC71]/10 text-[#0B3D1E]",
  },
  AGENT_VERIFIED: {
    badge: "BLUE_SHIELD",
    color: "blue",
    label: "Verified provider",
    tone: "border-[#3B82F6]/35 bg-[#3B82F6]/10 text-[#1E3A8A]",
  },
  TRUST_CROWN: {
    badge: "GOLD_CROWN",
    color: "gold",
    label: "Trusted provider",
    tone: "border-[#F4C430]/45 bg-[#F4C430]/15 text-[#7A4B00]",
  },
} as const;

const criterionLabels: Record<string, string> = {
  identity: "Identity verified",
  provider: "Provider verification",
  student: "Student verification",
  trust: "Trust score threshold",
  followers: "Followers",
};

function recordValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

export function normalizeVerificationStage(value: unknown): VerificationStageResult | null {
  const outer = recordValue(value);
  const response = recordValue(outer.data ?? value);
  const originalStage = response.stage;
  if (originalStage !== "PROFILE_VERIFIED" && originalStage !== "AGENT_VERIFIED" && originalStage !== "TRUST_CROWN") return null;

  const riskBlocked = response.riskBlocked === true;
  const stage: VerificationStage = riskBlocked ? "PROFILE_VERIFIED" : originalStage;
  const config = stageConfig[stage];
  const criteria = Array.isArray(response.criteria)
    ? response.criteria.flatMap((item): VerificationCriterion[] => {
        const criterion = recordValue(item);
        if (typeof criterion.key !== "string" || typeof criterion.met !== "boolean") return [];
        return [{
          key: criterion.key,
          label: typeof criterion.label === "string" ? criterion.label : criterionLabels[criterion.key] ?? criterion.key,
          met: criterion.met,
          required: typeof criterion.required === "boolean" ? criterion.required : undefined,
        }];
      })
    : [];

  return {
    userId: typeof response.userId === "string" ? response.userId : undefined,
    role: typeof response.role === "string" ? response.role : undefined,
    eligible: response.eligible === true || (
      response.eligible !== false &&
      Array.isArray(response.criteria) &&
      response.criteria.some((item) => {
        const criterion = recordValue(item);
        return criterion.key === "identity" && criterion.met === true;
      }) &&
      response.criteria.some((item) => {
        const criterion = recordValue(item);
        const role = String(response.role ?? "").toUpperCase();
        return (role === "STUDENT" && criterion.key === "student" && criterion.met === true)
          || (["AGENT", "LANDLORD"].includes(role) && criterion.key === "provider" && criterion.met === true)
          || (role === "ADMIN" && criterion.key === "identity" && criterion.met === true);
      })
    ),
    stage,
    badge: config.badge,
    badgeColor: config.color,
    riskBlocked,
    nextMilestone: typeof response.nextMilestone === "string" ? response.nextMilestone : null,
    criteria,
    generatedAt: typeof response.generatedAt === "string" ? response.generatedAt : undefined,
  };
}

export function VerificationBadge({ verification, compact = false, iconOnly = false }: { verification: VerificationStageResult; compact?: boolean; iconOnly?: boolean }) {
  if (!verification.eligible) return null;

  const config = stageConfig[verification.stage];

  return (
    <span
      title={`${config.label}${verification.riskBlocked ? ". Advanced badge upgrade is blocked for review." : ""}`}
      aria-label={`${config.label}${verification.riskBlocked ? ", risk review required" : ""}`}
      className={`inline-flex w-fit items-center gap-2 rounded-full border font-semibold ${config.tone} ${iconOnly ? "h-5 w-5 justify-center p-0" : compact ? "px-2 py-0.5 text-[0.7rem]" : "px-3 py-1.5 text-sm"}`}
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" className={`shrink-0 ${iconOnly ? "h-3 w-3" : compact ? "h-3.5 w-3.5" : "h-4 w-4"}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {verification.stage === "PROFILE_VERIFIED" && <path d="m4 10 4 4 8-9" />}
        {verification.stage === "AGENT_VERIFIED" && <path d="m4 10 4 4 8-9" />}
        {verification.stage === "TRUST_CROWN" && <path d="m2.5 6 4.3 3.2L10 3l3.2 6.2L17.5 6l-1.2 9H3.7L2.5 6Zm1.2 12h12.6" />}
      </svg>
      <span className={iconOnly ? "sr-only" : undefined}>{config.label}</span>
    </span>
  );
}

export function criterionLabel(key: string, providedLabel?: string) {
  return providedLabel || criterionLabels[key] || key;
}
