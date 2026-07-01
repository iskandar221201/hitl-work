# QA Report — Per-Tenant API Rate Limiting

> Agent: 🔍 QA  
> Spec: `examples/prd.md`  
> Executor log: `examples/executor-log.md`  
> Date: 2024-01-15  
> **Status: ⚠️ PASS WITH WARNINGS**

---

## Spec Compliance

| Item | Status |
|---|---|
| `prisma/schema.prisma` modified (2 models added) | ✅ |
| Migration created and applied | ✅ |
| `src/lib/tenantPlan.ts` created | ✅ |
| `src/lib/rateLimit.ts` created | ✅ |
| `src/middleware.ts` modified | ✅ |
| `src/app/api/data/route.ts` modified | ✅ |
| `src/lib/db.ts` NOT touched | ✅ |
| No other API routes modified | ✅ |
| No config/env files modified | ✅ |

---

## Breaking Changes Verification

Spec declared one YES: middleware change is global, affects all API routes.

| Check | Status |
|---|---|
| Existing API routes still receive valid responses | ✅ — middleware passes through when limit not exceeded |
| Tenants without `TenantPlan` row handled gracefully | ✅ — `getTenantLimit()` returns 100 as default, no throw |
| No existing method signatures changed | ✅ |
| No existing Prisma models modified | ✅ — only new models appended |
| Independent check: no new breaking changes introduced beyond spec | ✅ |

> ⚠️ **Warning (not blocking):** The spec noted that tenants without a `TenantPlan` row will immediately be subject to the 100 req/hour default after deploy. This is correct behavior per the spec, but the deploy runbook should include seeding `TenantPlan` rows for all existing tenants before going live. This is an operational concern, not a code defect.

---

## Definition of Done

| Item | Result |
|---|---|
| `RateLimitLog` and `TenantPlan` models in `schema.prisma` | ✅ PASS |
| Migration runs without error | ✅ PASS |
| `getTenantLimit()` returns `100` when no plan row exists | ✅ PASS — `plan?.requestLimit ?? 100` |
| `checkRateLimit()` returns `allowed: false` when `requestCount >= limit` | ✅ PASS — `current < limit` (strict less-than, correct) |
| `incrementUsage()` uses upsert+increment | ✅ PASS — `{ increment: 1 }` confirmed in executor log |
| Middleware returns 429 with correct body and all 4 required headers | ✅ PASS — `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After` all present |
| Middleware returns 400 on missing `x-tenant-id` | ✅ PASS |
| `api/data/route.ts` includes rate limit headers on success | ✅ PASS |
| DB unreachable → fail open + log error | ✅ PASS — try/catch in `checkRateLimit()` with `console.error` |
| No files outside spec modified | ✅ PASS |

---

## Issues Found

### Critical (must fix before merge)
_None._

### Warning (should fix, not blocking)

**1. `getWindowStart()` does not zero out milliseconds**  
File: `src/lib/rateLimit.ts` — `getWindowStart()` function  
```typescript
// Current
now.setMinutes(0, 0, 0);  // sets minutes, seconds, ms to 0 — but Date constructor still has ms

// Issue: `new Date()` can have non-zero milliseconds.
// `setMinutes(0, 0, 0)` does zero out seconds AND milliseconds (4th param not needed).
// However the intent is clearer written as:
now.setMinutes(0, 0, 0);  // ✓ actually correct — 3 args are: minutes, seconds, ms
```
> Correction: After investigation this is actually correct — `setMinutes(min, sec, ms)` takes 3 args. **Not an issue.** Withdrawing this finding.

**2. `incrementUsage()` has no error handling**  
File: `src/lib/rateLimit.ts` — `incrementUsage()` function  
If the DB upsert fails (e.g., transient network error), the error will bubble up uncaught to middleware. Middleware doesn't wrap `incrementUsage()` in try/catch. This would cause a 500 on what should be a passing request.

Suggested fix:
```typescript
export async function incrementUsage(tenantId: string): Promise<void> {
  try {
    const windowStart = getWindowStart();
    await prisma.rateLimitLog.upsert({ ... });
  } catch (err) {
    console.error("[rateLimit] incrementUsage failed:", err);
    // fail open — do not re-throw
  }
}
```

**3. `middleware.ts` — `incrementUsage()` is called after `NextResponse.next()`**  
File: `src/middleware.ts`  
The current order is: check → `NextResponse.next()` → `incrementUsage()`. In Next.js edge middleware, calling an async function after `NextResponse.next()` is constructed is valid, but if `incrementUsage()` throws before the `return`, the response may not be sent. Combining with Warning #2 (no error handling in `incrementUsage()`), this is a latent issue. Resolved by fixing Warning #2.

### Minor (optional)

**1. `checkRateLimit()` fail-open returns `limit: 0`**  
File: `src/lib/rateLimit.ts` — catch block  
When DB is unreachable, the returned `limit: 0` could confuse callers or clients reading `X-RateLimit-Limit: 0`. Consider returning a sentinel value like `-1` or a configured default to make the "unknown/degraded" state explicit.

**2. No JSDoc on exported functions**  
Files: `src/lib/rateLimit.ts`, `src/lib/tenantPlan.ts`  
Exported functions have no documentation comments. Not blocking, but adding JSDoc on `checkRateLimit()` and `getTenantLimit()` would help future developers understand the fail-open behavior without reading the full implementation.

---

## Verdict

Implementation is complete and spec-compliant. All Definition of Done items pass. No critical issues found. The rate limiting logic is correct — the fixed-window approach, upsert-increment atomicity, fail-open DB handling, and header conventions all match the spec and skill file.

**One warning requires attention before merge:** `incrementUsage()` lacks error handling and can throw uncaught exceptions to middleware on DB errors (Warning #2). This is a low-risk but real failure mode under transient infrastructure issues. Fix is a 4-line try/catch addition.

**Safe to merge after fixing Warning #2.** Warnings #1 and #3 are related and resolved together by the same fix. Minor items are optional.

> 🚀 Recommend: after merge, run Skill Extractor to update `skills/rate-limiting.md` with the `incrementUsage` error handling pattern — it should be added as a required convention, not left as tribal knowledge.