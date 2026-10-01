# Backend Guide: Provider Pages and Agent/Landlord Access

## Purpose

Implement the backend contract that lets an authenticated user deliberately switch from the student experience to the agent or landlord experience by creating a provider Page. The Page and the account role must agree, a user must not have active student and provider access at the same time, and provider home creation remains locked until the Page is verified.

This workspace contains the frontend, not the API service. This document is an implementation handoff for the backend/API repository; it does not claim the backend behavior is already implem

## Product Rules

1. Each account has one active account mode: `STUDENT`, `AGENT`, or `LANDLORD`. `ADMIN` is a privileged role, not a customer mode.
2. A user can have at most one provider Page.
3. Creating a provider Page is the explicit action that starts the provider account-mode transition. Do not require the account to already have an `AGENT` or `LANDLORD` role before allowing that action.
4. A student must explicitly consent before converting to provider mode. Do not silently discard student data. Preserve it as inactive/archived data according to the product's retention rules, but make student-only actions unavailable while provider mode is active.
5. Creating a Page grants access to the provider workspace, not permission to publish homes. Home creation is permitted only after the Page reaches `VERIFIED`.
6. The server generates the provider business registration number. It is not accepted from the client, editable by the user, or used as proof that a government registration was validated.
7. Frontend checks are for navigation and usability only. The API authorizes every operation from the authenticated user and persisted state.

## Account-Mode Transition

The current signup form does not send an account role. Signup should therefore create a student/default account (or another explicitly documented neutral mode). The provider Page creation request must be the route into provider mode.

Recommended request addition:

```json
{
  "providerType": "AGENT",
  "switchAccountToProvider": true
}
```

The existing provider Page payload fields remain in the request. `switchAccountToProvider` is required only when the current active mode is `STUDENT`; it is a consent signal, not an authorization claim. The server must derive the target role from validated `providerType`, never trust a `role` value supplied by the client.

In one database transaction, `POST /provider-pages` should:

1. Lock or otherwise serialize changes for the authenticated user.
2. Reject `ADMIN` and unsupported role transitions with a clear error.
3. If the user is currently `STUDENT`, require `switchAccountToProvider: true` and check product-specific blockers such as an active booking or unresolved financial obligation. Return a conflict instead of silently changing modes when blocked.
4. Reject creation if the user already has a Page, including concurrent duplicate requests.
5. Generate and persist the business registration number.
6. Create the Page in `DRAFT` state.
7. Set the account's active role to `AGENT` or `LANDLORD`, matching `providerType`.
8. Mark any student profile inactive for authorization purposes; preserve its data rather than deleting it.
9. Commit all changes together. If any step fails, neither the Page nor role transition should be partially applied.

If account conversion needs a separate confirmation screen, add that UI/API contract before enforcing the consent field. Do not implement an implicit switch that can lock a student out of their existing account experience.

On provider-to-student conversion, use a separate explicit operation with equivalent checks. Do not infer a role downgrade from Page rejection, Page edits, or a missing Page response.

## Provider Page Data

### Client-provided fields

Continue validating the current Page fields on the server:

- `displayName`: required, 3-120 characters.
- `providerType`: required enum `AGENT` or `LANDLORD`.
- `proofOfLicense`: required media/reference ID accepted by the media service.
- `profilePicture`: required media/reference ID accepted by the media service.
- `payoutAccounts`: 1-10 entries; `provider`, `accountName`, and `accountNumber` required. Account number must be 8-20 digits, stored as a string to preserve leading zeroes.
- Optional description: at most 2,000 characters.
- Optional phone: at most 30 characters.
- Optional business name, address, additional contact numbers, and social links: validate lengths and formats server-side.

Sensitive license proof must use private media delivery/access rules. Do not expose a private document as a public URL. Confirm uploaded media belongs to this user and has the correct purpose before accepting it.

### Server-generated business registration number

- Remove `businessRegNumber` from create/update DTOs, validation schemas, and writable model properties. Ignore or reject attempts to provide it; never persist a client-supplied value.
- Generate it in the Page creation transaction using a backend-owned, documented format. The client treats it as opaque and must not parse it.
- Enforce a database unique constraint. Handle generator collisions by retrying safely or failing the transaction with an operational error.
- Make the value immutable after creation. If the Page is replaced after rejection, define whether a new Page receives a new identifier; do not recycle identifiers.
- Return the generated value in Page responses only if the product intends providers/admins to see it. Label it as a SafeCrib reference, not as verified government company registration.
- Backfill existing records before adding a non-null constraint. Detect and resolve duplicates before creating the unique index.

Suggested internal implementation:

```text
createProviderPage(authenticatedUser, dto):
  validate dto and uploaded media
  transaction:
    lock authenticated user
    check account-mode conversion consent and blockers
    check no existing provider Page
    reference = generateUniqueProviderReference()
    page = insert Page(status=DRAFT, reference=reference, owner=user.id, ...)
    set user.role = dto.providerType
    deactivate student profile for active authorization
    write audit event
  return page
```

The pseudocode is illustrative; follow the backend's actual ORM and transaction conventions.

## Page Lifecycle and API Contract

| Endpoint | Behavior |
|---|---|
| `GET /users/me` | Return canonical active role and account identity. |
| `GET /provider-pages/me` | Return the authenticated user's Page, including `id`, `providerType`, `status`, review notes when available, and generated reference when exposed. With no Page, consistently return either `200 { "data": null }` or `404`; document the chosen behavior. |
| `POST /provider-pages` | Create a `DRAFT`, generate its reference, and perform the account-mode transition atomically. Enforce one Page per user. |
| `PATCH /provider-pages/me` | Allow only the owner while status is `DRAFT` or `REJECTED`. Do not allow changes to owner, generated reference, role, or review fields. Editing a rejected Page returns it to `DRAFT`. |
| `POST /provider-pages/me/submit` | Validate all required fields and media, transition `DRAFT` to `SUBMITTED`, write an audit event, and enqueue the admin review item. Make duplicate submission safe/idempotent or return a documented conflict. |
| `GET /provider-pages/admin/pending` | Admin-only review queue. |
| `PATCH /provider-pages/:id/verify` | Admin-only; accept only reviewable statuses and transition to `VERIFIED`. |
| `PATCH /provider-pages/:id/reject` | Admin-only; require a non-empty reason, transition to `REJECTED`, and expose the reason as `verificationNotes` (or one consistently named field). |

State transitions:

```text
No Page --create--> DRAFT --submit--> SUBMITTED --admin approve--> VERIFIED
                                      \--admin reject--> REJECTED --edit--> DRAFT
```

`SUBMITTED` Pages cannot be edited or resubmitted while pending. A rejection does not revoke the user's provider role or remove the provider workspace; it allows correction and resubmission. Approval unlocks provider home creation.

Use database constraints and transactional checks for one Page per user and valid transitions. A controller-level check without a transaction is insufficient under concurrent requests.

## Authorization and Dashboard Boundaries

Use the authenticated principal plus persisted account/Page state for authorization:

- Student-only profile, bookmark, and student workflows require active `STUDENT` mode.
- Provider workspace/Page management requires an owned provider Page and active role matching its `providerType`.
- Listing creation and listing media mutation require an owned Page in `VERIFIED` state.
- Provider listing reads return only listings owned by the authenticated provider.
- Admin review and fraud resolution endpoints require `ADMIN`; never expose them through provider authorization.
- `GET /listings` for public search returns only `VERIFIED` listings.
- Return `401` for missing/expired authentication, `403` for authenticated but disallowed actions, `404` when a resource is absent or not owned (choose a consistent anti-enumeration policy), and `409` for incompatible state/concurrent creation.

The frontend has a separate provider workspace at `/page`; login routing may use the canonical role and `GET /provider-pages/me`, but neither controls security. The backend must reject direct API access that violates these rules even if a user edits browser state or calls endpoints manually.

## Listing Engine Handoff

When the provider Page is `VERIFIED`:

- `POST /listings` creates a `DRAFT` owned by the authenticated user. Ignore client-supplied owner, review status, availability status, trust score, and moderation flags.
- Require title (3-200 chars), positive integer price, valid latitude/longitude, and validate optional description (max 2,000), discount (non-negative and no greater than price), campus (max 200), address (max 500), and location reference (max 500).
- Require either a human-readable address or `locationReference` before submit. Coordinates remain required in all location modes.
- Permit provider edits and submit only while listing status is `DRAFT` or `REJECTED`; submitted and verified states are server-controlled.
- Require at least one attached photo or video before submit; enforce at most five photos and one video. Count only successfully attached, `READY` media.
- Validate media ownership, purpose, entity ID, and readiness. Confirm video readiness through the trusted media webhook; do not accept client confirmation as proof.
- Submission moves the listing to `SUBMITTED`, records an audit event, and enqueues review. Do not optimistically mark a listing `VERIFIED`.
- Keep `availabilityStatus` derived from booking/listing state. It is not a provider-editable field and does not imply payment processing.
- Never use `DELETE /listings/:id` as an undocumented soft-hide operation. Add an explicit deactivate transition if providers need one.

### Duplicate and fraud engine

- Duplicate signals are review hints, not automatic proof of fraud. A duplicate flag must not silently reject a listing, change public visibility, or alter trust without an explicit reviewed policy.
- Ensure worker comparison states include the actual public state (`VERIFIED`) or a deliberately defined comparison set. Do not rely on a sweep that only compares `ACTIVE`/`FLAGGED` if approved listings remain `VERIFIED`.
- Document which photo hashes are compared and enqueue pHash work only when the server has image bytes. Signed-media attachments without source bytes must not be reported as image-hash checked.
- Keep admin-only duplicate/report queues and resolutions behind admin authorization. A confirmed fraud report may transition a listing to `FLAGGED`; duplicate resolution alone should follow its separately documented behavior.

## Response and Error Requirements

Return a consistent response envelope and stable machine-readable error codes, for example:

```json
{
  "statusCode": 409,
  "code": "ACCOUNT_MODE_CONFLICT",
  "message": "This account has an active student profile. Confirm account conversion before creating a provider Page."
}
```

At minimum define codes for `ACCOUNT_MODE_CONFLICT`, `PROVIDER_PAGE_EXISTS`, `PROVIDER_PAGE_NOT_VERIFIED`, `INVALID_PAGE_TRANSITION`, `MEDIA_NOT_READY`, `MEDIA_PURPOSE_MISMATCH`, and `LISTING_MEDIA_LIMIT_REACHED`. Do not make the frontend infer the reason from generic text alone.

After successful create/update/submit, return the persisted resource/status. On submit, return the actual Page `SUBMITTED` state only after the database transition and review-queue/outbox event have committed. If review queue delivery is asynchronous, use a transactional outbox so a committed submission cannot be lost between database write and job enqueue.

## Required Backend Tests

### Unit tests

- Reference generator output is valid, unique under concurrent generation, immutable on update, and never sourced from request data.
- Each Page state transition is allowed or rejected correctly.
- Role-to-Page provider type mismatch is rejected.
- Account mode cannot authorize both student and provider workflows simultaneously.
- DTO validators reject invalid payout numbers, media references, locations, prices, and discounts.

### Integration tests

- A new/default student account can create a Page only through the explicit provider conversion flow; success changes role and creates exactly one `DRAFT` Page atomically.
- Conversion without consent or with a blocking active student obligation returns `409` and changes neither role nor Page data.
- Concurrent Page creation yields one Page and one deterministic conflict, with no duplicate generated reference.
- A user cannot create or read another user's Page/listings/media.
- A `DRAFT`/`REJECTED` provider cannot create a home; a `VERIFIED` provider can.
- Page submit validates proof, profile picture, payout, and provider fields; repeated submit does not enqueue duplicate review work.
- Rejection requires a reason, exposes it to the owner, permits edits, and resubmits to `SUBMITTED`.
- Provider routes cannot invoke admin review or fraud operations.
- Public listing search excludes `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `REJECTED`, and `FLAGGED` listings.
- Photo/video caps, readiness, ownership, duplicate attachments, and submit media requirements are enforced server-side.
- Listing and Page review actions write auditable events.

## Deployment Checklist

1. Agree on the account-conversion consent and active-booking policy with product/frontend before enforcing role changes.
2. Add generated reference column/sequence or generator and backfill existing Pages; detect duplicates before adding uniqueness.
3. Add transactional Page creation and account-mode transition, Page ownership constraints, and role/state authorization guards.
4. Add stable API error codes and contract/integration tests.
5. Update OpenAPI with request DTO changes (`businessRegNumber` removed; conversion consent documented), response fields, role behavior, state transitions, and errors.
6. Deploy backend compatibility before relying on frontend removal of `businessRegNumber`. During rollout, ignore or reject old client values without persisting them.
7. Verify login on a fresh account, explicit student-to-provider conversion, provider Page pending state, approved listing access, and rejection/resubmission end to end.

## Current Frontend Contract Notes

- Signup sends email, password, and display name only; it does not choose an account role.
- Provider setup reads `/users/me` and `/provider-pages/me`. `STUDENT` accounts also read `/student-profiles/status`; active providers do not call that student-only endpoint. The observed API role error omits `UNVERIFIED`, so the frontend avoids the student-status request for that role. If the same error comes from a provider-Page endpoint, the backend must permit `UNVERIFIED` for the documented setup workflow; the frontend must not bypass that authorization.
- A `STUDENT` must confirm the provider-mode conversion before the frontend sends `switchAccountToProvider: true` on Page create/update. The client does not change the active role; approval and subsequent API reads are authoritative.
- Provider proof and profile images use signed uploads and retain media IDs. Proof documents are not converted to public URLs in the form.
- Provider Page form sends `providerType`, Page details, media references, and payout data. It never sends `businessRegNumber`.
- The form calls `POST /provider-pages` (or `PATCH /provider-pages/me` for a draft/rejected Page), then `POST /provider-pages/me/submit`. The API must make retries safe and allow first-time Page creation for eligible non-provider roles.
- The frontend expects `GET /provider-pages/me` to return the Page or no Page (`null`/404). Home creation remains locked until the response reports `VERIFIED`.
- Direct browser/API test cases and the current live OpenAPI discrepancies are recorded in [Provider workflow direct testing](provider-workflow-testing.md).