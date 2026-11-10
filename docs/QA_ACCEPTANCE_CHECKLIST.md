# Chicken Road QA Acceptance Checklist

## 1. Gameplay Correctness

- [ ] Multiplier starts at exactly `1.00x`.
- [ ] Multiplier increases monotonically during a running round; it never decreases, skips backward, or resets before crash.
- [ ] Multiplier is calculated and settled by the server, not by client-supplied time or values.

### Cash-out payout

- [ ] **Given** a running round with a pending bet of `B` and authoritative multiplier `M`, **when** the player cashes out successfully, **then** payout equals `B × M`, rounded according to the documented monetary precision.
- [ ] **Given** a successful cash-out, **when** the same request is retried, **then** the original result is returned and no additional payout is credited.
- [ ] **Given** a pending bet, **when** two concurrent cash-out requests are submitted, **then** exactly one request succeeds and exactly one payout is credited.

### Crash behavior

- [ ] **Given** a round reaches its authoritative crash point, **when** a cash-out request arrives at or after that point, **then** the request is rejected and no payout is credited.
- [ ] **Given** a player has a pending bet when the round crashes, **when** settlement completes, **then** the bet is marked lost and no payout is credited.
- [ ] **Given** a player has already cashed out, **when** the round crashes, **then** the settled payout remains unchanged and the bet is not marked lost.

## 2. Provably Fair

- [ ] Server seed commitment hash is generated before betting opens.
- [ ] Commitment hash is included in the pre-round state and is visible to connected clients.
- [ ] Plain server seed is not exposed before the round reaches the post-crash reveal stage.
- [ ] Server seed is revealed after the round crashes and is persisted with the completed round.

### Verification

- [ ] **Given** a completed round with its server seed, server seed hash, client seed, nonce, and house edge, **when** an independent verifier recalculates the result, **then** the commitment hash and exact crash multiplier match the persisted values.
- [ ] **Given** a server seed is modified, **when** verification runs, **then** commitment verification fails.
- [ ] **Given** a client seed or nonce is modified, **when** verification runs, **then** the derived multiplier no longer matches the round result.

### Nonce

- [ ] **Given** a new round is created under the active seed sequence, **when** the round is committed, **then** its nonce is exactly the next expected nonce.
- [ ] Nonces increment once per round and never repeat within the same seed sequence.
- [ ] A failed or voided round follows the documented nonce policy consistently and does not silently reuse a nonce.

## 3. Wallet Integrity

- [ ] Wallet balances use fixed monetary precision and never rely on binary floating-point arithmetic for ledger settlement.
- [ ] Every balance mutation has a corresponding immutable transaction record.

### Concurrent operations

- [ ] **Given** one pending bet, **when** multiple concurrent cash-out requests arrive, **then** row locking or an equivalent atomic mechanism allows only one successful state transition and one credit.
- [ ] **Given** a wallet balance equal to the wager amount, **when** a bet is placed, **then** the debit succeeds exactly once and the resulting balance is correct.
- [ ] **Given** insufficient funds, **when** a bet is placed, **then** the debit and bet creation both fail atomically with no partial transaction.

### Voided rounds and wallet types

- [ ] **Given** a round is voided, **when** settlement completes, **then** every eligible wager is refunded exactly once to its original wallet.
- [ ] **Given** a bet uses the bonus wallet, **when** it is placed, **then** bonus-wallet wagering rules and eligibility limits are enforced.
- [ ] Main-wallet funds cannot be debited or credited through a bonus-wallet transaction, and vice versa.
- [ ] Bonus balances cannot be converted to withdrawable funds unless the configured wagering rules permit it.

### Reconciliation

- [ ] **Given** a wallet and its complete transaction history, **when** reconciliation runs, **then** the opening balance plus signed transactions equals the stored wallet balance.
- [ ] Reconciliation detects missing, duplicated, reversed, or orphaned transaction records.
- [ ] Reconciliation reports discrepancies without silently rewriting financial history.

## 4. Real-Time Synchronization

### Load and drift

- [ ] **Given** 10,000 simulated concurrent clients connected to the round room, **when** the round runs at 10 ticks per second, **then** client tick drift remains below 100 ms.
- [ ] Tick sequence numbers are monotonic and clients discard stale or duplicate ticks.
- [ ] Server-authoritative timestamps are present on tick payloads.
- [ ] WebSocket p95 latency remains below the agreed operational threshold under the 10,000-client test.

### Reconnection

- [ ] **Given** a client disconnects mid-round, **when** it reconnects and sends `state:resync`, **then** the server returns the current round state and that player's bet state.
- [ ] **Given** a client reconnects after a crash, **when** resynchronization completes, **then** the client sees the persisted crash and settlement outcome rather than a stale running state.
- [ ] A resynchronized client joins only the current `round:${roundId}` room.

### Server failure

- [ ] **Given** the round leader crashes mid-round, **when** the failure detector and recovery process complete, **then** the round is marked voided according to policy.
- [ ] **Given** a round is voided after a server failure, **when** settlement completes, **then** all eligible wagers are refunded exactly once.
- [ ] No replacement leader can publish duplicate ticks or settle the same round twice.
- [ ] Clients receive a clear void/refund state and do not remain indefinitely in `RUNNING`.

## 5. Auto Bet / Auto Cash Out

### Auto cash-out

- [ ] **Given** an active bet with an auto-cash-out target `T`, **when** the authoritative multiplier reaches `T`, **then** the server cashes out at the documented target semantics and credits exactly once.
- [ ] **Given** the crash point is below target `T`, **when** the round crashes, **then** auto cash-out does not execute after the crash and the bet is settled as lost.
- [ ] Auto cash-out uses server ticks and never depends on browser timers.
- [ ] Auto cash-out requests are idempotent and produce the same result when retried.

### Stop conditions

- [ ] Maximum auto-bet round count stops new bets after the configured count.
- [ ] Profit-limit stop condition halts auto betting once the configured profit threshold is reached.
- [ ] Loss-limit stop condition halts auto betting once the configured loss threshold is reached.
- [ ] Stop conditions persist across reconnects and cannot be bypassed by refreshing the client.
- [ ] Auto-bet state changes are visible to the player and auditable.

### Balance and notifications

- [ ] **Given** insufficient balance for the next auto bet, **when** the auto-bet worker attempts placement, **then** no bet is created, auto betting halts, and the player receives a clear notification.
- [ ] Auto betting resumes only after an explicit user action when the configured policy requires manual restart.

## 6. Telegram Mini App

### `initData` authentication

- [ ] **Given** valid Telegram `initData` signed with the configured bot token and within the freshness window, **when** authentication is requested, **then** verification succeeds and a JWT is issued.
- [ ] **Given** a modified field, invalid hash, missing user data, stale `auth_date`, or excessive future timestamp, **when** authentication is requested, **then** verification fails with no session issued.
- [ ] Telegram secrets, raw tokens, and full `initData` values are not written to logs.
- [ ] Replayed authentication data is rejected according to the configured replay-prevention policy.

### Mini App integration

- [ ] Successful cash-out triggers Telegram haptic feedback when the Telegram haptic API is available.
- [ ] Cash-out remains functional without haptics when the API is unavailable.
- [ ] Telegram Back Button is registered, behaves consistently, and is cleaned up when the page unmounts.
- [ ] Telegram theme parameters are applied without reducing text or control contrast below accessibility requirements.
- [ ] Telegram viewport changes, safe-area insets, keyboard appearance, and orientation changes do not hide primary controls.
- [ ] The app behaves safely in a normal browser where Telegram APIs are absent.

## 7. Accessibility and Motion

- [ ] **Given** `prefers-reduced-motion: reduce`, **when** the game loads, **then** bird animation is disabled or replaced with a static background.
- [ ] **Given** `prefers-reduced-motion: reduce`, **when** the multiplier changes, **then** multiplier pulse and nonessential transition animations are disabled.
- [ ] Reduced-motion preference can be changed while the app is open without leaving the UI in a broken state.
- [ ] Every interactive button is reachable by keyboard focus.
- [ ] Focus order follows the visual and task order.
- [ ] Every icon-only control has an accurate `aria-label`.
- [ ] Disabled controls expose disabled state to assistive technology.
- [ ] Status, countdown, crash, cash-out result, and error messages are announced appropriately without excessive repetition.
- [ ] Text and controls meet the required color contrast ratio in light, dark, and Telegram theme variants.
- [ ] Keyboard users can place bets, cash out, navigate, and recover from validation errors without a pointer.

## 8. Performance

### Rendering

- [ ] **Given** a mid-range Android device representative of the supported audience, **when** the game background is running, **then** background rendering consumes no more than 3 ms per frame in the measured test window.
- [ ] Background animation does not create sustained dropped frames during a running round.
- [ ] Reduced-motion mode avoids initializing unnecessary animation/rendering resources.
- [ ] Page visibility handling pauses or throttles nonessential animation when the app is backgrounded.
- [ ] No sustained memory growth or object-allocation spike occurs during a 30-minute session.

### Network and loading

- [ ] Largest Contentful Paint is below 2.5 seconds on the agreed mobile test profile.
- [ ] WebSocket round-trip latency is below 200 ms at p95 under representative production load.
- [ ] Initial JavaScript and image payloads are within the agreed mobile budget.
- [ ] Slow network conditions show a usable loading, reconnecting, and failure state.
- [ ] Reconnect backoff prevents connection storms after service recovery.

## 9. Security

### Authentication and authorization

- [ ] **Given** a non-public endpoint request without a valid JWT, **when** the request is received, **then** it is rejected with `401 Unauthorized`.
- [ ] **Given** a JWT for another user, **when** the user attempts to access or cash out another player's bet, **then** the request is rejected with no data or balance mutation.
- [ ] Public endpoints expose only intentionally public round, history, verification, and leaderboard data.
- [ ] Administrative endpoints require both authentication and administrative authorization.

### Rate limiting and abuse controls

- [ ] Per-user rate limits are enforced for bet placement and cash-out commands.
- [ ] Per-IP rate limits are enforced for authentication and public endpoints.
- [ ] Rate-limit responses include a safe retry indication without leaking internal details.
- [ ] WebSocket command floods are throttled and do not block other players.
- [ ] Rate-limit counters work consistently across horizontally scaled instances.

### Input and output security

- [ ] SQL injection payloads in query parameters, JSON bodies, headers, and path parameters are rejected or safely parameterized.
- [ ] XSS payloads are escaped or rejected in usernames, seeds, profile fields, and displayed game messages.
- [ ] Unknown DTO fields are rejected or stripped according to the API validation policy.
- [ ] Wagers, multipliers, IDs, pagination values, and enum fields enforce type, range, and format constraints.
- [ ] Error responses do not disclose stack traces, SQL statements, secrets, or internal topology.
- [ ] CORS allows only configured origins when credentials are enabled.

### Auditability

- [ ] **Given** an administrator changes game settings, **when** the request succeeds, **then** an audit log records actor, action, resource, timestamp, request ID, and before/after values.
- [ ] Failed administrative actions are also logged with the denial reason and actor identity.
- [ ] Audit logs are append-only for application users and protected from ordinary admin deletion.
- [ ] Security-sensitive events include a correlation/request ID for incident investigation.

## Release Acceptance

- [ ] All critical Given/When/Then cases pass in automated or reproducible integration tests.
- [ ] Load, latency, rendering, and LCP measurements are attached to the release test report.
- [ ] Wallet reconciliation completes with zero unexplained discrepancies.
- [ ] Provably-fair verification succeeds for a representative sample of completed rounds.
- [ ] No high or critical security findings remain open.
- [ ] Production rollback and round-void/refund procedures have been rehearsed.
- [ ] QA, engineering, product, and operations sign off on the release.
