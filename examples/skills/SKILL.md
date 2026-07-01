# 🛠️ SKILL — API Rate Limiting (Next.js + Prisma + PostgreSQL)

## Purpose
This skill documents the pattern for implementing per-tenant API rate limiting in a Next.js SaaS application. Read this before modifying any middleware, rate limit logic, or tenant quota management.

## Scope
- `src/lib/rateLimit.ts` — core rate limit checker
- `src/middleware.ts` — Next.js edge middleware for enforcement
- `src/app/api/` — API route handlers
- `prisma/schema.prisma` — RateLimitLog and TenantPlan models
- `src/lib/db.ts` — Prisma client singleton

---

## Folder Structure
```text
src/
├── lib/
│   ├── db.ts                  # Prisma singleton — always import from here
│   ├── rateLimit.ts           # Core: check, increment, reset logic
│   └── tenantPlan.ts          # Resolve tenant's plan limits
├── middleware.ts               # Next.js middleware — runs on edge
└── app/
    └── api/
        └── [...route]/
            └── route.ts       # Route handlers — call rateLimit() at top
prisma/
├── schema.prisma              # Models: RateLimitLog, TenantPlan
└── migrations/                # Never edit manually — use prisma migrate
```

## Naming Conventions
- Rate limit functions: verb + noun — `checkRateLimit()`, `incrementUsage()`, `resetWindow()`
- Middleware helpers: `withRateLimit()` as HOF wrapper
- Prisma models: PascalCase — `RateLimitLog`, `TenantPlan`
- DB fields: snake_case in schema, camelCase in TS via Prisma
- Window keys: `{tenantId}:{windowStart}` — e.g. `tenant_abc:2024-01-15T10:00:00Z`

## Architectural Patterns

### 1. Prisma Client Singleton
**Rule:** Never instantiate `new PrismaClient()` directly in route files. Always import from `src/lib/db.ts`.
**Example:**
```typescript
// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### 2. Per-Tenant Window-Based Counting
**Rule:** Rate limits are tracked per `tenantId` in fixed time windows (e.g., 1 hour). Each request upserts a `RateLimitLog` row. Counts are checked before incrementing.
**Example:**
```typescript
export async function checkRateLimit(tenantId: string): Promise<RateLimitResult> {
  const windowStart = getWindowStart(); // truncated to current hour
  const log = await prisma.rateLimitLog.findUnique({
    where: { tenantId_windowStart: { tenantId, windowStart } },
  });
  const limit = await getTenantLimit(tenantId);
  const current = log?.requestCount ?? 0;
  return {
    allowed: current < limit,
    remaining: Math.max(0, limit - current),
    resetAt: getWindowEnd(windowStart),
  };
}
```

### 3. Upsert Increment (Atomic)
**Rule:** Always use `upsert` with `increment` to avoid race conditions. Never read-then-write.
**Example:**
```typescript
await prisma.rateLimitLog.upsert({
  where: { tenantId_windowStart: { tenantId, windowStart } },
  update: { requestCount: { increment: 1 } },
  create: { tenantId, windowStart, requestCount: 1 },
});
```

### 4. Response Headers Convention
**Rule:** All rate-limited API routes must return these headers on every response (not just on 429).
**Example:**
```typescript
headers: {
  "X-RateLimit-Limit": String(limit),
  "X-RateLimit-Remaining": String(result.remaining),
  "X-RateLimit-Reset": result.resetAt.toISOString(),
}
```

### 5. Middleware vs Route-Level Enforcement
**Rule:** Middleware (`src/middleware.ts`) handles fast-path rejection using Redis/KV for edge performance. Route-level `checkRateLimit()` handles DB-accurate counting. Both must exist — middleware guards, route logs.

---

## Error Handling
- `checkRateLimit()` returns a typed `RateLimitResult` object — never throws
- If DB is unreachable → fail open (allow request, log error to console)
- If tenant plan is not found → apply default free-tier limit, do not throw
- 429 responses must include `Retry-After` header in seconds

## Response Format
```typescript
// RateLimitResult type
type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
};

// 429 Response body
{
  "error": "Rate limit exceeded",
  "retryAfter": 3542,       // seconds until window resets
  "resetAt": "2024-01-15T11:00:00.000Z"
}
```

## Dependencies
- `@prisma/client` → ORM for RateLimitLog upsert and tenant plan lookup
- `next/server` → `NextRequest`, `NextResponse` in middleware
- No external rate-limit libraries — logic is custom and tenant-aware

## Anti-Patterns — Do NOT Replicate
1. **Instantiating PrismaClient in route files** — causes connection pool exhaustion in serverless. Always use the singleton from `src/lib/db.ts`.
2. **Read-then-write for counters** — race condition under concurrent requests. Use `upsert` with `increment` instead.
3. **Throwing exceptions from `checkRateLimit()`** — callers don't expect it; use typed return values.
4. **Hardcoding plan limits in middleware** — limits must come from DB/config, not source code.
5. **Skipping headers on non-429 responses** — clients need rate limit headers on every response to implement backoff.

## Quick Reference
- To add rate limiting to a new route → call `checkRateLimit(tenantId)` at the top of the handler, check `result.allowed`, return 429 if false
- To change window duration → update `getWindowStart()` in `src/lib/rateLimit.ts` and update the migration
- To add a new tenant plan tier → insert a row in `TenantPlan` table, no code change needed
- To test rate limiting locally → set `RATE_LIMIT_OVERRIDE=true` in `.env.local` to bypass (dev only)
- To reset a tenant's window manually → delete the `RateLimitLog` row for that `tenantId + windowStart`