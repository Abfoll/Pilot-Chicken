# Chicken Road Backend Specification

This document is the implementation contract for the Chicken Road backend. It
defines module boundaries, HTTP and WebSocket contracts, round authority,
provable fairness, wallet settlement, persistence, validation, security, and
horizontal scaling.

The target stack is:

- NestJS with TypeScript
- REST for commands and query endpoints
- Socket.IO WebSockets for round fan-out and player events
- PostgreSQL as the source of truth
- Redis for locks, rate limits, idempotency, and pub/sub
- JWT for application sessions
- Telegram Mini App `initData` verification for identity bootstrap
- Prisma as the target data-access schema

The current repository contains TypeORM entities and an older event naming
surface. During migration, adapters may preserve existing clients, but all new
code must implement the contracts below.

## 1. Module Map

### AuthModule

**Responsibilities**

- Verify Telegram Mini App `initData`.
- Create or load the local user identity.
- Issue and rotate JWT access tokens.
- Expose the JWT guard and current-user decorator.
- Reject stale, malformed, replayed, or tampered Telegram data.

**Key services and providers**

- `AuthService`
- `TelegramInitDataService`
- `JwtStrategy`
- `JwtAuthGuard`
- `RefreshTokenService` (if refresh tokens are enabled)

**Dependencies**

- `UserModule`
- `ConfigModule`
- Redis for nonce/replay keys
- PostgreSQL through Prisma

### WalletModule

**Responsibilities**

- Maintain available main and bonus balances.
- Reserve wagers and credit payouts atomically.
- Write immutable double-entry transaction records.
- Provide balance snapshots and balance update events.
- Never mutate a balance without a transaction reference.

**Key services and providers**

- `WalletService`
- `LedgerService`
- `WalletTransactionService`
- `BalanceEventPublisher`

**Dependencies**

- `UserModule`
- `PrismaService`
- Redis for idempotency locks
- `FraudModule` for withdrawal or abuse policy checks

### GameModule

**Responsibilities**

- Own the single global round execution loop.
- Elect one round leader.
- Advance the server-authoritative multiplier.
- Route betting, cash-out, and resynchronization commands.
- Publish round events to Redis and Socket.IO.

**Key services and providers**

- `GameGateway`
- `GameOrchestrator`
- `RoundLeaderService`
- `RoundStatePublisher`
- `GameCommandService`

**Dependencies**

- `RoundModule`
- `WalletModule`
- `ProvablyFairModule`
- `BetModule` (or the betting portion of `GameModule`)
- Redis lock and pub/sub

### RoundModule

**Responsibilities**

- Persist round records and lifecycle transitions.
- Enforce legal state transitions.
- Store committed and revealed fairness material.
- Provide current-round and historical-round queries.

**Key services and providers**

- `RoundService`
- `RoundStateMachine`
- `RoundQueryService`
- `RoundRepository`

**Dependencies**

- `PrismaService`
- `ProvablyFairModule`
- `GameModule`
- `AdminModule` for per-round configuration snapshots

### ProvablyFairModule

**Responsibilities**

- Generate cryptographically secure server seeds.
- Publish a commitment hash before betting opens.
- Derive the crash multiplier deterministically.
- Reveal the server seed after the round crashes.
- Verify completed rounds independently.

**Key services and providers**

- `ProvablyFairService`
- `SeedCommitmentService`
- `FairnessVerificationService`

**Dependencies**

- Node.js `crypto`
- `PrismaService`
- `AdminModule` for immutable house-edge snapshots

### LeaderboardModule

**Responsibilities**

- Serve ranked player summaries.
- Maintain aggregate winnings, bets, and rounds played.
- Use read replicas or precomputed aggregates for public reads.
- Avoid querying the live settlement path for every leaderboard request.

**Key services and providers**

- `LeaderboardService`
- `LeaderboardQueryService`
- `LeaderboardProjector`

**Dependencies**

- `PrismaService`
- Read replica or Redis sorted sets
- `WalletModule` and `BetModule` events

### AdminModule

**Responsibilities**

- Protect operational configuration and administrative commands.
- Configure house edge, maximum multiplier, limits, and maintenance mode.
- Apply configuration only to newly committed rounds.
- Record every administrative action in `AuditLog`.

**Key services and providers**

- `AdminService`
- `GameSettingsService`
- `AdminGuard`
- `AuditLogService`

**Dependencies**

- `AuthModule`
- `PrismaService`
- Redis configuration cache

### AnalyticsModule

**Responsibilities**

- Produce aggregate game, wallet, and operational metrics.
- Consume immutable domain events asynchronously.
- Keep analytics queries off the primary settlement database where possible.

**Key services and providers**

- `AnalyticsService`
- `MetricsPublisher`
- `AnalyticsProjector`

**Dependencies**

- PostgreSQL read replica or warehouse
- Redis streams/pub-sub or a durable event transport
- `RoundModule`, `WalletModule`, `FraudModule`

### FraudModule

**Responsibilities**

- Detect multi-accounting, impossible timing, abnormal cash-out patterns,
  wallet cycling, and rate-limit abuse.
- Create reviewable `FraudSignal` records.
- Apply soft blocks or hard blocks through policy, never by silently changing
  settlement results.

**Key services and providers**

- `FraudService`
- `FraudRulesEngine`
- `RiskScoringService`
- `FraudSignalRepository`

**Dependencies**

- `AuthModule`
- `WalletModule`
- `AnalyticsModule`
- Redis counters
- `PrismaService`

## 2. HTTP API Conventions

- Base path: `/api/v1`.
- JSON request and response bodies use camelCase.
- Monetary values are decimal strings at the persistence boundary and numbers
  only in explicitly documented response fields. The recommended API contract
  uses strings for money to avoid IEEE-754 rounding.
- Multipliers are decimal numbers rounded to two decimal places.
- All mutating endpoints accept an `Idempotency-Key` header unless noted
  otherwise.
- Errors use NestJS standard status codes and this shape:

```typescript
interface ApiError {
  statusCode: number;
  code: string;
  message: string;
  requestId: string;
}
```

Required endpoints:

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/auth/telegram` | Public | Verify `initData`, issue JWT |
| `GET` | `/api/v1/me` | JWT | Current user |
| `GET` | `/api/v1/wallet` | JWT | Balance snapshot |
| `GET` | `/api/v1/rounds/current` | Public | Current round state |
| `GET` | `/api/v1/rounds/:id` | Public | Public round detail |
| `POST` | `/api/v1/rounds/:id/bets` | JWT | REST betting fallback |
| `POST` | `/api/v1/rounds/:id/cashout` | JWT | Idempotent cash-out |
| `GET` | `/api/v1/rounds/:id/verify` | Public | Provably-fair verification |
| `GET` | `/api/v1/leaderboard` | Public | Ranked players |
| `GET` | `/api/v1/admin/settings` | Admin | Read settings |
| `PATCH` | `/api/v1/admin/settings` | Admin | Update future-round settings |

## 3. WebSocket Gateway Design

The gateway is Socket.IO at namespace `/game`. Authentication occurs during
the handshake with `auth.accessToken` or a bearer token. A valid socket joins
exactly one global round room:

```text
round:${roundId}
```

The server may additionally use private user rooms:

```text
user:${userId}
```

No client may select a round room. The server chooses the current round and
moves sockets when the lifecycle changes.

### 3.1 Server-to-client events

```typescript
export interface RoundCountdownPayload {
  roundId: string;
  roundNumber: number;
  state: 'COUNTDOWN';
  countdownSeconds: number;
  serverSeedHash: string;
  bettingClosesAt: string; // ISO-8601 UTC
  emittedAt: string;
}

export interface RoundStartPayload {
  roundId: string;
  roundNumber: number;
  state: 'RUNNING';
  startedAt: string;
  multiplier: number; // always 1.00 at start
  serverTimeMs: number;
}

export interface RoundTickPayload {
  roundId: string;
  state: 'RUNNING';
  multiplier: number;
  serverTimeMs: number;
  tickNumber: number;
}

export interface RoundCrashPayload {
  roundId: string;
  roundNumber: number;
  state: 'CRASHED';
  crashMultiplier: number;
  crashedAt: string;
  serverSeed: string;
  serverSeedHash: string;
}

export interface RoundSettledPayload {
  roundId: string;
  roundNumber: number;
  state: 'SETTLING' | 'WAITING';
  settledAt: string;
  nextRoundId?: string;
}

export interface PlayerCashoutPayload {
  roundId: string;
  userId: string;
  betId: string;
  multiplier: number;
  payout: string;
  occurredAt: string;
}

export interface BalanceUpdatePayload {
  userId: string;
  mainBalance: string;
  bonusBalance: string;
  availableBalance: string;
  transactionId: string;
  reason: 'BET_RESERVED' | 'CASHOUT' | 'REFUND' | 'ADMIN_ADJUSTMENT';
  occurredAt: string;
}
```

`player:cashout` is broadcast to the round room. `balance:update` is sent only
to the affected user's private room.

### 3.2 Client-to-server events

```typescript
export interface BetPlacePayload {
  roundId: string;
  wager: string;
  walletType: 'MAIN' | 'BONUS';
  autoCashoutMultiplier?: number;
  clientSeed?: string;
  requestId: string;
}

export interface CashoutRequestPayload {
  roundId: string;
  betId: string;
  idempotencyKey: string;
  requestId: string;
}

export interface StateResyncPayload {
  lastEventId?: string;
  clientObservedAt?: number;
}

export interface BetState {
  betId: string;
  roundId: string;
  wager: string;
  walletType: 'MAIN' | 'BONUS';
  status: 'PENDING' | 'CASHED_OUT' | 'LOST' | 'REFUNDED';
  autoCashoutMultiplier: number | null;
  cashoutMultiplier: number | null;
  payout: string | null;
}

export interface CurrentRoundState {
  roundId: string;
  roundNumber: number;
  state: 'WAITING' | 'COUNTDOWN' | 'RUNNING' | 'CRASHED' | 'SETTLING';
  multiplier: number;
  crashMultiplier: number | null;
  serverSeedHash: string | null;
  serverSeed: string | null;
  serverTimeMs: number;
  countdownEndsAt: string | null;
  playerBets: BetState[];
}

export interface StateResyncResponse {
  type: 'state:resync';
  state: CurrentRoundState;
  balance: BalanceUpdatePayload | null;
  latestEventId: string;
}
```

The gateway handlers return an acknowledgement envelope:

```typescript
export interface CommandAck<T> {
  requestId: string;
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
```

### 3.3 Cadence and authority

- The leader evaluates and publishes ticks at 10 ticks per second.
- The multiplier is calculated from server monotonic time and the immutable
  round configuration, not from client timestamps.
- Clients may interpolate between ticks for rendering but may not settle bets.
- A tick includes `serverTimeMs`; clients use it only to estimate display
  latency.
- Auto-cash-out is evaluated on the leader using the same authoritative
  multiplier path as manual cash-out.
- Every command is checked against the database/leader state; a client event
  is never evidence that a bet or payout succeeded.

### 3.4 Reconnect protocol

1. Client reconnects and authenticates the Socket.IO handshake.
2. Client emits `state:resync` with its last received event ID.
3. Server joins `round:${currentRoundId}`.
4. Server sends `StateResyncResponse`, including the current round and only the
   authenticated player's bets.
5. If the event ID is still in the Redis replay window, the server may replay
   missed events after the snapshot. Otherwise the snapshot is authoritative.
6. Client discards events for an older `roundId` or lower `tickNumber`.

## 4. Round Lifecycle State Machine

The only legal transitions are:

```text
WAITING -> COUNTDOWN -> RUNNING -> CRASHED -> SETTLING -> WAITING
```

| State | Entry trigger | Duration/exit | Emits |
|---|---|---|---|
| `WAITING` | Previous round settled or startup | Until a leader creates the next round | `round:settled` with `WAITING` |
| `COUNTDOWN` | Seed committed and round row inserted | Fixed `COUNTDOWN_SECONDS`, default 5 s | `round:countdown` every second |
| `RUNNING` | Countdown timer expires | Until authoritative multiplier reaches crash point | `round:start`, then `round:tick` |
| `CRASHED` | Multiplier reaches crash point | Immediate transition after crash event | `round:crash`, seed reveal |
| `SETTLING` | Crash transaction committed | Until all pending bets are lost and payouts complete | `round:settled` |

Transition requirements:

1. `WAITING -> COUNTDOWN`: acquire the round-leader lock, generate the seed,
   snapshot house edge and limits, persist the commitment, then publish
   `round:countdown`.
2. `COUNTDOWN -> RUNNING`: atomically update the round row with
   `startedAt`; reject all new bets after this write; publish `round:start`.
3. `RUNNING -> CRASHED`: stop accepting cash-outs at or after the crash
   multiplier, mark pending bets lost, reveal `serverSeed`, and publish
   `round:crash`.
4. `CRASHED -> SETTLING`: complete the settlement transaction and mark the
   round `SETTLING`.
5. `SETTLING -> WAITING`: publish the final settlement, release the leader
   lock, and allow creation of the next round.

The server seed is never sent during `COUNTDOWN` or `RUNNING`; only the
commitment hash is public. The plain seed is revealed in `round:crash`, after
the crash point is fixed and persisted.

## 5. ProvablyFairService

The service uses a 32-byte random server seed encoded as hexadecimal. The
commitment is SHA-256 of the UTF-8 seed string. The first four HMAC bytes form
an unsigned big-endian integer. The multiplier is floored to two decimal
places, then clamped to `[1.00, maxMultiplier]`.

```typescript
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export interface CrashDerivation {
  rawUint32: number;
  uniform: number;
  rawMultiplier: number;
  multiplier: number;
}

export class ProvablyFairService {
  generateServerSeed(): { serverSeed: string; serverSeedHash: string } {
    const serverSeed = randomBytes(32).toString('hex');
    return {
      serverSeed,
      serverSeedHash: this.commit(serverSeed),
    };
  }

  commit(serverSeed: string): string {
    return createHash('sha256').update(serverSeed, 'utf8').digest('hex');
  }

  deriveCrashMultiplier(
    serverSeed: string,
    clientSeed: string,
    nonce: bigint,
    houseEdge: number,
    maxMultiplier = 10_000,
  ): CrashDerivation {
    if (!Number.isFinite(houseEdge) || houseEdge <= 0 || houseEdge >= 1) {
      throw new Error('houseEdge must be between 0 and 1');
    }
    if (!Number.isFinite(maxMultiplier) || maxMultiplier < 1) {
      throw new Error('maxMultiplier must be at least 1');
    }

    const message = `${clientSeed}:${nonce.toString()}`;
    const digest = createHmac('sha256', serverSeed)
      .update(message, 'utf8')
      .digest();
    const rawUint32 = digest.readUInt32BE(0);
    const uniform = rawUint32 / 0x1_0000_0000;
    const rawMultiplier = (1 - houseEdge) / (1 - uniform);
    const floored = Math.floor(rawMultiplier * 100) / 100;
    const multiplier = Math.min(maxMultiplier, Math.max(1, floored));

    return { rawUint32, uniform, rawMultiplier, multiplier };
  }

  verifyCommit(serverSeed: string, expectedHash: string): boolean {
    const actual = Buffer.from(this.commit(serverSeed), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');
    return actual.length === expected.length &&
      timingSafeEqual(actual, expected);
  }
}
```

`GET /api/v1/rounds/:id/verify` returns:

```typescript
export interface VerifyRoundResponse {
  roundId: string;
  roundNumber: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: string;
  houseEdge: number;
  rawUint32: number;
  uniform: number;
  computedMultiplier: number;
  storedMultiplier: number;
  verified: boolean;
}
```

Verification returns `verified: true` only when the commitment, derivation, and
stored crash multiplier all match. It must not reveal a seed for a round that
has not reached `CRASHED` or `SETTLING`.

## 6. Cash-Out Contract

### 6.1 HTTP endpoint

```http
POST /api/v1/rounds/:id/cashout
Authorization: Bearer <jwt>
Idempotency-Key: 6c3c0e0e-5b3e-4e31-b0fb-4bdb56c0a927
Content-Type: application/json
```

```typescript
export class CashoutRequestDto {
  @IsUUID()
  betId!: string;
}

export interface CashoutResponse {
  multiplier: number;
  payout: string;
  newBalance: string;
}
```

The returned `newBalance` is the balance for the wallet from which the bet was
placed. A repeated request with the same idempotency key returns the original
successful response. Reusing an idempotency key with a different user, round,
bet, or request body is rejected with `409 IDEMPOTENCY_KEY_REUSED`.

### 6.2 Atomic settlement

The recommended implementation is PostgreSQL row locking because the bet,
wallet, cash-out, and ledger rows must commit together:

```sql
BEGIN;

SELECT r.id, r.status, r."crashMultiplier"
FROM rounds r
WHERE r.id = $1
FOR UPDATE;

SELECT b.id, b."userId", b."walletId", b.wager, b.status
FROM bets b
WHERE b.id = $2 AND b."roundId" = $1 AND b."userId" = $3
FOR UPDATE;

-- Application rejects unless round.status = RUNNING and bet.status = PENDING.
-- multiplier is read from the leader's authoritative state and checked against
-- the persisted crash multiplier before this transaction is committed.

UPDATE wallets
SET balance = balance + $4, "updatedAt" = NOW()
WHERE id = $5;

UPDATE bets
SET status = 'CASHED_OUT',
    "cashoutMultiplier" = $6,
    payout = $4,
    "cashedOutAt" = NOW()
WHERE id = $2 AND status = 'PENDING';

INSERT INTO cash_outs ("betId", multiplier, payout, "idempotencyKey")
VALUES ($2, $6, $4, $7);

INSERT INTO transactions ("walletId", type, amount, reference, metadata)
VALUES ($5, 'CASHOUT', $4, $2, $8);

COMMIT;
```

The application must reject:

- round state other than `RUNNING`;
- a bet that does not belong to the authenticated user and round;
- a bet that is not `PENDING`;
- a multiplier greater than or equal to the persisted crash point;
- duplicate or conflicting idempotency keys;
- malformed, negative, zero, or over-limit wager/payout values.

Redis locks may reduce duplicate work, but Redis alone must not be the source
of financial truth. If Redis Lua is used for a fast-path lock, PostgreSQL still
performs the final conditional update and ledger commit.

## 7. Prisma Schema

The following schema is the target persistence contract. `Decimal` values must
be converted explicitly at the API boundary.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum WalletType { MAIN BONUS }
enum WalletTransactionType { BET_RESERVATION CASHOUT REFUND ADMIN_ADJUSTMENT }
enum RoundStatus { WAITING COUNTDOWN RUNNING CRASHED SETTLING }
enum BetStatus { PENDING CASHED_OUT LOST REFUNDED }
enum CashOutStatus { COMPLETED IDEMPOTENT_REPLAY }
enum FraudSeverity { LOW MEDIUM HIGH CRITICAL }
enum FraudStatus { OPEN REVIEWED DISMISSED ACTIONED }

model User {
  id          String   @id @default(uuid()) @db.Uuid
  telegramId  String   @unique
  username    String?
  firstName   String?
  lastName    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  wallets     Wallet[]
  bets        Bet[]
  auditLogs   AuditLog[]
  fraudSignals FraudSignal[]
  leaderboard Leaderboard?
}

model Wallet {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @db.Uuid
  type         WalletType
  balance      Decimal  @db.Decimal(18, 2)
  version      Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  user         User     @relation(fields: [userId], references: [id])
  bets         Bet[]
  transactions Transaction[]
  @@unique([userId, type])
  @@index([userId])
}

model Transaction {
  id             String   @id @default(uuid()) @db.Uuid
  walletId       String   @db.Uuid
  type           WalletTransactionType
  amount         Decimal  @db.Decimal(18, 2)
  reference      String
  idempotencyKey String?  @unique
  metadata       Json?
  createdAt      DateTime @default(now())
  wallet         Wallet   @relation(fields: [walletId], references: [id])
  @@index([walletId, createdAt])
  @@index([reference])
}

model Round {
  id              String   @id @default(uuid()) @db.Uuid
  roundNumber     Int      @unique
  status          RoundStatus
  serverSeedHash  String
  serverSeed      String?
  clientSeed      String
  nonce           BigInt
  houseEdge       Decimal  @db.Decimal(8, 6)
  maxMultiplier   Decimal  @db.Decimal(12, 2)
  crashMultiplier Decimal? @db.Decimal(12, 2)
  countdownAt     DateTime?
  startedAt       DateTime?
  crashedAt       DateTime?
  settledAt       DateTime?
  createdAt       DateTime @default(now())
  bets            Bet[]
  @@index([status, createdAt])
}

model Bet {
  id                    String    @id @default(uuid()) @db.Uuid
  userId                String    @db.Uuid
  roundId               String    @db.Uuid
  walletId              String    @db.Uuid
  wager                 Decimal   @db.Decimal(18, 2)
  walletType            WalletType
  autoCashoutMultiplier Decimal?  @db.Decimal(12, 2)
  cashoutMultiplier     Decimal?  @db.Decimal(12, 2)
  payout                Decimal?  @db.Decimal(18, 2)
  status                BetStatus @default(PENDING)
  createdAt             DateTime  @default(now())
  cashedOutAt           DateTime?
  user                  User      @relation(fields: [userId], references: [id])
  round                Round     @relation(fields: [roundId], references: [id])
  wallet               Wallet    @relation(fields: [walletId], references: [id])
  cashOut              CashOut?
  @@unique([userId, roundId])
  @@index([roundId, status])
  @@index([userId, createdAt])
}

model CashOut {
  id             String         @id @default(uuid()) @db.Uuid
  betId          String         @unique @db.Uuid
  multiplier     Decimal        @db.Decimal(12, 2)
  payout         Decimal        @db.Decimal(18, 2)
  idempotencyKey String         @unique
  status         CashOutStatus  @default(COMPLETED)
  createdAt      DateTime       @default(now())
  bet            Bet            @relation(fields: [betId], references: [id])
  @@index([createdAt])
}

model Leaderboard {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @unique @db.Uuid
  totalWinnings Decimal @db.Decimal(18, 2)
  totalBets    Int      @default(0)
  roundsPlayed Int      @default(0)
  rank         Int?
  updatedAt    DateTime @updatedAt
  user         User     @relation(fields: [userId], references: [id])
  @@index([totalWinnings(sort: Desc)])
  @@index([totalBets(sort: Desc)])
}

model AuditLog {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String?  @db.Uuid
  action     String
  resource   String
  resourceId String?
  ipAddress  String?
  metadata   Json?
  createdAt  DateTime @default(now())
  user       User?    @relation(fields: [userId], references: [id])
  @@index([action, createdAt])
  @@index([resource, resourceId])
}

model FraudSignal {
  id          String        @id @default(uuid()) @db.Uuid
  userId      String?       @db.Uuid
  type        String
  severity    FraudSeverity
  score       Int
  status      FraudStatus   @default(OPEN)
  evidence    Json
  createdAt   DateTime      @default(now())
  reviewedAt  DateTime?
  user        User?         @relation(fields: [userId], references: [id])
  @@index([userId, status])
  @@index([severity, status, createdAt])
}
```

## 8. Validation and Security

### 8.1 Bet DTOs

```typescript
import { Type } from 'class-transformer';
import {
  IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, Min,
  MinLength, MaxLength,
} from 'class-validator';

export class PlaceBetDto {
  @IsUUID()
  roundId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  wager!: string;

  @IsIn(['MAIN', 'BONUS'])
  walletType!: 'MAIN' | 'BONUS';

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1.01)
  @Max(10_000)
  autoCashoutMultiplier?: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  clientSeed?: string;
}

export class CashoutDto {
  @IsUUID()
  betId!: string;
}
```

Use a custom `IsMoney` validator for `wager` in production. It must reject
scientific notation, more than two decimal places, negative values, zero, and
values outside the configured per-bet limits. `ValidationPipe` must use:

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
```

### 8.2 Rate limiting

Use `@nestjs/throttler` globally, with stricter named limits for commands:

```typescript
ThrottlerModule.forRoot([
  {
    name: 'short',
    ttl: 1_000,
    limit: 10,
  },
  {
    name: 'long',
    ttl: 60_000,
    limit: 120,
  },
]);
```

Recommended effective limits:

| Scope | Endpoint/action | Limit |
|---|---|---|
| IP | Telegram auth | 10/minute |
| User | Bet placement | 20/second and 120/minute |
| User | Cash-out | 20/second and 300/minute |
| IP | Public reads | 120/minute |
| Socket | Any command | 20/second |

Behind a proxy, configure trusted proxy handling and derive the real client IP
from the platform's trusted forwarding header only. Never accept an arbitrary
client-supplied IP header.

### 8.3 JWT and Telegram verification flow

1. Client sends Telegram `initData` to `POST /auth/telegram`.
2. Server parses the query string without decoding and re-encoding values in a
   different form.
3. Remove `hash`, sort remaining `key=value` pairs lexicographically, and join
   with `\n`.
4. Derive the Mini App secret:

```typescript
const secret = createHmac('sha256', 'WebAppData')
  .update(process.env.TELEGRAM_BOT_TOKEN!, 'utf8')
  .digest();
const expected = createHmac('sha256', secret)
  .update(dataCheckString, 'utf8')
  .digest('hex');
```

5. Compare the supplied hash with `timingSafeEqual`.
6. Require a numeric `auth_date` no older than 24 hours and reject dates too
   far in the future (five minutes of clock skew maximum).
7. Parse the signed `user` JSON and upsert by `telegramId`.
8. Issue a short-lived JWT containing only `sub`, `telegramId`, `iat`, and
   `exp`. Do not put balances or authorization decisions in the token.
9. Protect private REST routes with `JwtAuthGuard` and administrative routes
   with `JwtAuthGuard` plus `AdminGuard`.
10. For WebSockets, verify the same JWT during the handshake and disconnect
    with an authentication error if verification fails.

Secrets must come from environment or a secret manager. They must never be
logged, returned in errors, or committed to the repository.

## 9. Horizontal Scaling and Operations

### Socket fan-out

Do not rely on process-local Socket.IO broadcasts. Use the Socket.IO Redis
adapter backed by Redis pub/sub so every node receives the leader's events.
Sticky sessions are optional when the adapter is correctly configured, but
sticky sessions alone are not sufficient for correctness.

Recommended flow:

```text
leader node -> Redis pub/sub -> all gateway nodes -> round:${roundId}
```

### Round ownership

Exactly one node owns the round loop. Use a short-lived Redis lock:

```text
SET chicken-road:round-leader <instanceId> NX PX 3000
```

The leader renews the lock at least every second. If renewal fails, it stops
publishing ticks and settlement commands immediately. A replacement leader
reads the persisted round state and resumes only after fencing/ownership
checks. Include a monotonically increasing fencing token in leader commands so
an old leader cannot settle after losing the lock.

### Database connections

- Use Prisma connection pooling with a bounded pool per node.
- Size the aggregate pool below PostgreSQL's connection limit; horizontal node
  count must be included in the calculation.
- Use the primary for bets, wallet writes, round transitions, and cash-outs.
- Use a read replica for leaderboard, history, and analytics queries.
- Never use a replica for a balance or bet decision because replication lag can
  accept a stale state.
- Add query timeouts and circuit breakers for analytics and public reads.

### Failure and recovery rules

- A leader crash must not create a second active round; the database state and
  Redis fencing token are authoritative.
- A reconnecting client always receives a snapshot before relying on live ticks.
- A crash during settlement is retried idempotently from `PENDING` rows.
- Wallet mutations are recoverable from the immutable transaction ledger.
- Operational alerts must cover missing ticks, lock loss, settlement age,
  database pool exhaustion, Redis failures, and repeated fraud signals.

## 10. Required Invariants

1. There is at most one `Bet` per user per round.
2. A bet can be placed only during `COUNTDOWN`.
3. A cash-out can succeed only during `RUNNING`, before the crash point.
4. A wallet balance is changed only in the same transaction as its ledger row.
5. A round's house edge, seed, nonce, and maximum multiplier never change after
   commitment.
6. The client never determines the multiplier, crash point, payout, or state.
7. A revealed server seed always hashes to the pre-round commitment.
8. Every successful cash-out is idempotent and has exactly one `CashOut` row.
9. All administrative and balance-affecting actions are auditable.
10. No secret seed is exposed before the round reaches `CRASHED`.
