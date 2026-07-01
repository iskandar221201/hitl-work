# Executor Log — Per-Tenant API Rate Limiting

> Agent: ⚙️ Executor  
> Spec: `examples/prd.md`  
> Stack: Next.js + Prisma + PostgreSQL

---

## Pre-Execution Checklist
- [x] Read entire `prd.md` spec
- [x] Identified all files to modify and create
- [x] Read "What NOT to Touch" — `db.ts`, other routes, config files
- [x] Read "Breaking Changes" — middleware change is global, noted
- [x] No ambiguous steps found — proceeding

---

### Step 1: Add Prisma Models
**File:** `prisma/schema.prisma`  
**Change:** Append `TenantPlan` and `RateLimitLog` models at end of file

```prisma
model TenantPlan {
  id           String   @id @default(cuid())
  tenantId     String   @unique
  planName     String   @default("free")
  requestLimit Int      @default(1000)
  windowHours  Int      @default(1)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model RateLimitLog {
  id           String   @id @default(cuid())
  tenantId     String
  windowStart  DateTime
  requestCount Int      @default(0)
  updatedAt    DateTime @updatedAt

  @@unique([tenantId, windowStart])
  @@index([tenantId])
}
```

✓ Step 1 done: Two models appended to schema.prisma

---

### Step 2: Run Prisma Migration
**Command:** `npx prisma migrate dev --name add_rate_limit_tables`  
**Output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "saas_dev", schema "public"

Applying migration `20240115103000_add_rate_limit_tables`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20240115103000_add_rate_limit_tables/
    └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client
```

✓ Step 2 done: Migration ran successfully, Prisma client regenerated

---

### Step 3: Create `src/lib/tenantPlan.ts`
**File:** `src/lib/tenantPlan.ts` (new file)  
**Change:** Export `getTenantLimit()` with fallback default

```typescript
import { prisma } from "./db";

export async function getTenantLimit(tenantId: string): Promise<number> {
  const plan = await prisma.tenantPlan.findUnique({
    where: { tenantId },
  });
  return plan?.requestLimit ?? 100;
}
```

✓ Step 3 done: `tenantPlan.ts` created with default fallback of 100

---

### Step 4: Create `src/lib/rateLimit.ts`
**File:** `src/lib/rateLimit.ts` (new file)  
**Change:** Export `RateLimitResult` type, `checkRateLimit()`, and `incrementUsage()`

```typescript
import { prisma } from "./db";
import { getTenantLimit } from "./tenantPlan";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
};

function getWindowStart(): Date {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return now;
}

function getWindowEnd(windowStart: Date): Date {
  const end = new Date(windowStart);
  end.setHours(end.getHours() + 1);
  return end;
}

export async function checkRateLimit(
  tenantId: string
): Promise<RateLimitResult> {
  try {
    const limit = await getTenantLimit(tenantId);
    const windowStart = getWindowStart();

    const log = await prisma.rateLimitLog.findUnique({
      where: { tenantId_windowStart: { tenantId, windowStart } },
    });

    const current = log?.requestCount ?? 0;

    return {
      allowed: current < limit,
      remaining: Math.max(0, limit - current),
      resetAt: getWindowEnd(windowStart),
      limit,
    };
  } catch (err) {
    console.error("[rateLimit] checkRateLimit failed, failing open:", err);
    return {
      allowed: true,
      remaining: 0,
      resetAt: getWindowEnd(getWindowStart()),
      limit: 0,
    };
  }
}

export async function incrementUsage(tenantId: string): Promise<void> {
  const windowStart = getWindowStart();

  await prisma.rateLimitLog.upsert({
    where: { tenantId_windowStart: { tenantId, windowStart } },
    update: { requestCount: { increment: 1 } },
    create: { tenantId, windowStart, requestCount: 1 },
  });
}
```

✓ Step 4 done: `rateLimit.ts` created — check uses try/catch fail-open, increment uses upsert

---

### Step 5: Modify `src/middleware.ts`
**File:** `src/middleware.ts`  
**Change:** Add tenant header extraction, rate limit check, 429 response, and header injection

> Note: Existing middleware only had a `matcher` config and a passthrough. Reading file first to match existing style before modifying.

Existing file before change:
```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
```

Modified file:
```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, incrementUsage } from "./lib/rateLimit";

export async function middleware(request: NextRequest) {
  const tenantId = request.headers.get("x-tenant-id");

  if (!tenantId) {
    return NextResponse.json(
      { error: "Missing x-tenant-id header" },
      { status: 400 }
    );
  }

  const result = await checkRateLimit(tenantId);

  const rateLimitHeaders = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": result.resetAt.toISOString(),
  };

  if (!result.allowed) {
    const retryAfter = Math.ceil(
      (result.resetAt.getTime() - Date.now()) / 1000
    );
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        retryAfter,
        resetAt: result.resetAt.toISOString(),
      },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders,
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  await incrementUsage(tenantId);

  const response = NextResponse.next();
  Object.entries(rateLimitHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
```

✓ Step 5 done: Middleware updated — 400 on missing header, 429 with all required headers on limit exceeded, headers attached on pass-through

---

### Step 6: Modify `src/app/api/data/route.ts`
**File:** `src/app/api/data/route.ts`  
**Change:** Add rate limit headers to success response; defensive 400 if tenant header missing

> Reading existing file first to match style.

Existing file before change:
```typescript
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const data = { items: [{ id: 1, name: "Sample" }] };
  return NextResponse.json(data);
}
```

Modified file:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get("x-tenant-id");

  if (!tenantId) {
    return NextResponse.json(
      { error: "Missing x-tenant-id header" },
      { status: 400 }
    );
  }

  const rateLimitState = await checkRateLimit(tenantId);

  const data = { items: [{ id: 1, name: "Sample" }] };

  return NextResponse.json(data, {
    headers: {
      "X-RateLimit-Limit": String(rateLimitState.limit),
      "X-RateLimit-Remaining": String(rateLimitState.remaining),
      "X-RateLimit-Reset": rateLimitState.resetAt.toISOString(),
    },
  });
}
```

✓ Step 6 done: Route updated — rate limit headers on success, defensive 400 if header missing, does not call `incrementUsage()` (middleware handles it)

---

## Execution Complete

### What was done:
- `prisma/schema.prisma` → added `TenantPlan` and `RateLimitLog` models
- `prisma/migrations/20240115103000_add_rate_limit_tables/` → generated and applied
- `src/lib/tenantPlan.ts` → created, exports `getTenantLimit()`
- `src/lib/rateLimit.ts` → created, exports `checkRateLimit()`, `incrementUsage()`, `RateLimitResult`
- `src/middleware.ts` → updated with rate limit enforcement
- `src/app/api/data/route.ts` → updated with rate limit headers on success

### What was NOT done:
- Nothing skipped

### Ready for QA ✓