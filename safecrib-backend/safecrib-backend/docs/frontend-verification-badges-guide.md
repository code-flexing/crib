# Frontend verification badge implementation guide

This guide defines the frontend contract for verification recognition, trust stages, and account protection rules for users, students, agents, landlords, and admins.

## 1. Verification model

The backend enforces a strict account model with a single identity record and separate verified profile records:

- `users` = shared authentication identity, neutral and unverified by default
- `student_profiles` = verified student profile data
- `provider_pages` = verified provider/agent/landlord profile data
- `admin_profiles` = admin-only records

A user may have a verified student identity, a verified provider identity, or admin access, but the frontend must never infer these from the browser alone. The backend is the source of truth.

## 2. Badge stages

The backend exposes a verification stage result through:

- `GET /trust/users/:userId/verification-stage`
- `GET /trust/me/verification-stage`

The result includes:

- `stage`: `PROFILE_VERIFIED` | `AGENT_VERIFIED` | `TRUST_CROWN`
- `badge`: `GREEN_CHECK` | `BLUE_SHIELD` | `GOLD_CROWN`
- `badgeColor`: `green` | `blue` | `gold`
- `riskBlocked`: boolean
- `nextMilestone`: string | null
- `criteria`: list of required checks
- `generatedAt`: timestamp

### Stage logic

1. `PROFILE_VERIFIED`
   - Base recognition after identity verification is complete
   - Green check badge
   - Used for general users, general student accounts, or any account flagged for risk review

2. `AGENT_VERIFIED`
   - Applies to verified agents/landlords only
   - Blue badge
   - Requires:
     - `identityVerified = true`
     - provider page is `VERIFIED`
     - no active fraud risk or blocked state

3. `TRUST_CROWN`
   - Highest verification tier
   - Gold crown badge
   - Requires:
     - provider page verified
     - identity verified
     - trust score threshold reached (backend target: `>= 85`)
     - no fraud risk or review blocking

### Mandatory risk block

The backend blocks escalation when any of these are true:

- confirmed fraud count > 0
- recent fraud count > 0
- trust review flagged

If any of those issues exist, the badge should not upgrade beyond the base green verification state.

## 3. Badge colors and UI tokens

Use the exact brand-safe colors below for consistent frontend rendering.

### Recommended palette

- Green check: `#2ECC71` or `#1DB954`
- Blue shield: `#3B82F6` or `#2F6FED`
- Gold crown: `#F4C430` or `#F5B301`
- Dark neutral text: `#111827`
- Soft neutral background: `#F3F4F6`
- Success label text: `#0B3D1E`
- Warning text for risk state: `#7A4B00`

### Recommended UI usage

- Green = base verified profile
- Blue = verified provider/agent/landlord
- Gold = trusted crown tier

### Crown note

The crown must be gold. The backend uses `GOLD_CROWN` and `badgeColor: 'gold'` for this tier. The frontend should never render the crown in blue or green.

## 4. Frontend rendering rules

### Render state map

| Stage | Badge | Color | Meaning |
|---|---|---|---|
| `PROFILE_VERIFIED` | Green check | green | Basic verified account |
| `AGENT_VERIFIED` | Blue shield | blue | Verified agent/landlord |
| `TRUST_CROWN` | Gold crown | gold | High-trust agent/landlord |

### Recommended badge components

- `VerificationBadge` with `stage` and `badgeColor`
- `VerificationPill` for compact profile chips
- `VerificationTooltip` for criteria details

### Safe policy

Do not calculate these badges in the browser from raw trust score alone. Use the backend response as the source of truth. The backend should be the single source for:

- active stage
- badge type
- risk block state
- milestone messaging

This prevents inconsistent UI states and accidental cross-user profile reads in large-scale usage.

## 5. Trust score thresholds

The backend currently uses a trust score model from `computeTrustScore()`. The staged verification engine uses a high-trust threshold of `>= 85` for the crown tier.

Use these numbers as the frontend defaults:

- base verified profile: no score threshold required
- agent verified badge: provider verified + identity verified
- crown badge: trust score >= 85

A user should also be prevented from displaying crown status when:

- reported fraud is confirmed
- recent fraud report is active
- trust review is flagged

## 6. Badge criteria and labels

The backend criteria array is intended for UI detail rendering.

### Criteria keys

- `identity` -> "Identity verified"
- `provider` -> "Provider verification"
- `student` -> "Student verification"
- `trust` -> "Trust score threshold"

### Example frontend mapping

```ts
const badgeConfig = {
  PROFILE_VERIFIED: {
    label: 'Verified',
    icon: 'check',
    color: 'green',
    tone: '#2ECC71',
  },
  AGENT_VERIFIED: {
    label: 'Verified agent',
    icon: 'shield',
    color: 'blue',
    tone: '#3B82F6',
  },
  TRUST_CROWN: {
    label: 'Trusted agent',
    icon: 'crown',
    color: 'gold',
    tone: '#F4C430',
  },
};
```

## 7. Settings and profile tracking

The frontend should add a verification section under account settings for agent and landlord profiles.

### Required settings entries

- Verification stage
- Badge status
- Trust score
- Identity verification status
- Provider page verification status
- Fraud risk status
- Next milestone
- Last updated time

### Recommended structure

```json
{
  "verificationStage": "TRUST_CROWN",
  "badge": "GOLD_CROWN",
  "badgeColor": "gold",
  "riskBlocked": false,
  "nextMilestone": null,
  "criteria": [
    { "key": "identity", "met": true },
    { "key": "provider", "met": true },
    { "key": "trust", "met": true }
  ]
}
```

This gives the user a clear tracking path and supports encouragement messages.

## 8. Recognition and encouragement emails

The backend should send an email at each milestone stage so the user feels recognized and encouraged.

### Recommended email flow

1. `PROFILE_VERIFIED`
   - subject: "Your profile is verified"
   - message: praise for completing account verification

2. `AGENT_VERIFIED`
   - subject: "Your agent profile has been verified"
   - message: highlight verified provider status and trust-building benefits

3. `TRUST_CROWN`
   - subject: "You earned the Gold Crown badge"
   - message: congratulatory recognition for strong trust performance

4. Risk warning / blocked stage
   - subject: "Verification review required"
   - message: report issues, explain next step, offer support

### Email rules

- Send only when the stage changes or a user first achieves a new milestone.
- Do not spam a user on every page load.
- Use a backend-owned event history to determine whether a recognition email has already been sent for the current milestone.

## 9. Strict backend rules for scale and safety

The backend should enforce these rules before showing or granting a stage upgrade:

- Only use the authenticated user’s own `userId` for stage computation
- Never compute the stage by scanning other users or arbitrary profile lists
- Never promote a profile based only on UI state
- Always treat confirmed fraud and recent active fraud as a blocking condition
- Always confirm provider verification and identity verification before awarding the blue or gold badge
- Only award the crown if the trust score threshold is reached and the account is not blocked

This is important because when millions of users exist, a loose or broad query can accidentally read the wrong profile and mislabel someone.

## 10. Frontend acceptance checklist

- The default validated state shows a green check for verified baseline accounts
- Agent/landlord verification renders a blue badge
- High-trust provider status renders a gold crown
- The crown stays gold in all layouts and themes
- User settings show objective verification status and next milestone
- Fraud reports block badge escalation
- Backend API is the source of truth, not browser-derived logic
- Recognition emails are tied to defined verification stages

## 11. Required verification endpoints

The frontend must use the backend routes below as the source of truth for verification status and account progression.

### 11.1 Profile and account status

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/users/me` | `GET` | required | Get the logged-in account, role, trust score, identity status, and student profile state |
| `/trust/me` | `GET` | required | Get the current trust score |
| `/trust/me/verification-stage` | `GET` | required | Get the current persisted verification state, badge, and risk block |
| `/trust/users/:userId/verification-stage` | `GET` | required | Get the same stage payload for a specific user |
| `/trust/users/:userId/breakdown` | `GET` | admin only | Detailed trust breakdown for admin review |

### 11.2 Student verification flow

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/student-profiles/complete` | `POST` | required | Submit or finish a student profile |
| `/student-profiles/status` | `GET` | required | Check the current student profile review state |
| `/student-profiles/me` | `GET` | required | Fetch the current student profile |
| `/student-profiles/:id` | `GET` | admin or owner as allowed | Fetch a specific student submission |

Expected `GET /users/me` fields relevant to verification:

```json
{
  "id": "user_123",
  "role": "STUDENT",
  "identityVerified": true,
  "trustScore": 88,
  "studentProfileStatus": "APPROVED"
}
```

Expected verification stage response:

```json
{
  "userId": "user_123",
  "role": "STUDENT",
  "stage": "PROFILE_VERIFIED",
  "badge": "GREEN_CHECK",
  "badgeColor": "green",
  "riskBlocked": false,
  "nextMilestone": null,
  "criteria": [
    { "key": "identity", "label": "Identity verified", "met": true, "required": true },
    { "key": "student", "label": "Student verification", "met": true, "required": false }
  ],
  "generatedAt": "2026-09-27T00:00:00.000Z"
}
```

### 11.3 Provider verification flow

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/provider-pages` | `POST` | required | Create a provider page in draft state |
| `/provider-pages/me` | `GET` | required | Fetch current provider page |
| `/provider-pages/me` | `PATCH` | required | Update provider page draft |
| `/provider-pages/me/submit` | `POST` | required | Submit provider page for admin review |
| `/provider-pages/admin/pending` | `GET` | admin only | List pending provider review queue |
| `/provider-pages/:id/verify` | `PATCH` | admin only | Approve provider page |
| `/provider-pages/:id/reject` | `PATCH` | admin only | Reject provider page |

Provider page approval must set the provider identity to `AGENT` or `LANDLORD` at the backend. The frontend should refresh `GET /users/me` immediately after approval.

Example stage response for a verified agent:

```json
{
  "userId": "user_456",
  "role": "AGENT",
  "stage": "AGENT_VERIFIED",
  "badge": "BLUE_SHIELD",
  "badgeColor": "blue",
  "riskBlocked": false,
  "nextMilestone": "Reach a trust score of 85 for the crown badge",
  "criteria": [
    { "key": "identity", "label": "Identity verified", "met": true, "required": true },
    { "key": "provider", "label": "Provider verification", "met": true, "required": false },
    { "key": "trust", "label": "Trust score threshold", "met": false, "required": false }
  ],
  "generatedAt": "2026-09-27T00:00:00.000Z"
}
```

Example stage response for a crown-tier agent:

```json
{
  "userId": "user_456",
  "role": "AGENT",
  "stage": "TRUST_CROWN",
  "badge": "GOLD_CROWN",
  "badgeColor": "gold",
  "riskBlocked": false,
  "nextMilestone": null,
  "criteria": [
    { "key": "identity", "label": "Identity verified", "met": true, "required": true },
    { "key": "provider", "label": "Provider verification", "met": true, "required": false },
    { "key": "trust", "label": "Trust score threshold", "met": true, "required": false }
  ],
  "generatedAt": "2026-09-27T00:00:00.000Z"
}
```

### 11.4 Risk and fraud gating

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/fraud/reports` | `POST` | required | Submit fraud report against a listing or user |
| `/fraud/reports/pending` | `GET` | admin only | View pending fraud reports |
| `/fraud/reports/:id/resolve` | `PATCH` | admin only | Confirm or dismiss a report |
| `/fraud/duplicates/pending` | `GET` | admin only | View pending duplicate flags |
| `/fraud/duplicates/:id/resolve` | `PATCH` | admin only | Resolve duplicate flag |

When a confirmed fraud or recent active fraud exists, the frontend must stop rendering advanced provider badges and display only the standard green verification state with the warning milestone.

### 11.5 persisted verification table contract

The backend stores the current stage in `user_verifications`.

The persisted row contains:

```json
{
  "userId": "user_456",
  "stage": "TRUST_CROWN",
  "badge": "GOLD_CROWN",
  "badgeColor": "gold",
  "riskBlocked": false,
  "identityVerified": true,
  "providerVerified": true,
  "studentProfileApproved": false,
  "trustScore": 92,
  "nextMilestone": null,
  "lastComputedAt": "2026-09-27T00:00:00.000Z"
}
```

This table is what keeps stage data scalable and separate from role-only classification.

## 12. Suggested implementation summary

For implementation, the frontend should:

- call `GET /users/me` after login and after verification changes
- call `GET /trust/me/verification-stage` to get the badge state and milestone
- refresh provider and student profile state after admin review
- block advanced badge rendering when `riskBlocked` is true
- use the backend response as the single source of truth for all verification UI
- never infer badge state from role alone
- never compute badge state by scanning or combining unrelated profiles

This gives a consistent, scalable, backend-authoritative badge system for users, students, agents, landlords, and admin review workflows.
- store the returned `stage`, `badge`, `badgeColor`, and `nextMilestone`
- render the correct icon and color from the backend payload
- show the criteria list in settings/profile details
- disable crown rendering if `riskBlocked` is true
- show a support or warning message for any blocked risk state

This gives a consistent, backend-authoritative, polished verification experience that matches the platform’s trust model and scales safely.
