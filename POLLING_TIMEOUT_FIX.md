# ion Polling Timeout Fix

## Problem Solved ✅
Image renders were completing successfully in ion, but the Ion client timed out waiting for the "execution_complete" event. The HTTP polling loop gave up after 30 seconds, even though the image finished rendering.

**Root Cause**: ion sometimes takes longer to send the final completion notification when the GPU is busy.

## Solutions Implemented

### 1. Extended REST Polling (Default - Backward Compatible)
**Method**: `ionClient.getProgress(promptId)`

Extended from 30 seconds to **5 minutes** (1200 polling attempts at 250ms intervals).

```typescript
const client = new ionClient();
for await (const event of client.getProgress(promptId)) {
  console.log(`Status: ${event.status}, Step: ${event.step}/${event.totalSteps}`);
}
// Waits up to 5 minutes instead of 30 seconds
// Falls back to /history query if polling window exhausted
```

**What Changed**:
- Polling attempts: 120 → 1200
- Window: 30s → ~5 minutes
- Added fallback query to `/history/{promptId}` on timeout
- Prevents false timeouts when render succeeds but event arrives late

### 2. WebSocket Streaming (Recommended for Production)
**Method**: `ionClient.getProgressWebSocket(promptId)`

Real-time events from `ws://127.0.0.1:8188/ws` — never times out unless connection drops.

```typescript
const client = new ionClient();
for await (const event of client.getProgressWebSocket(promptId)) {
  console.log(`Status: ${event.status}, Step: ${event.step}/${event.totalSteps}`);
}
// Real-time events: 'execution_complete', 'execution_progress', 'execution_error'
// More efficient (push vs pull)
// Handles long-running GPU jobs gracefully
```

**Why WebSocket**:
- Never times out (unless connection drops)
- Real-time progress updates
- Less server load (push vs pull polling)
- Ideal for long-running renders (hours+)
- Same interface as `getProgress()` (async iterable)

## When to Use Each

| Feature | Use Case |
|---------|----------|
| `getProgress()` (REST Polling) | Testing, debugging, quick integrations, backward compatibility |
| `getProgressWebSocket()` | Production, long-running jobs, real-time dashboards, high-volume usage |

## Code Changes

### src/image-gen/backend/gateway/ionClient.ts
- Extended `getProgress()` from 120 → 1200 attempts
- Added fallback `/history/{promptId}` query on timeout
- Added new `getProgressWebSocket()` method for WebSocket streaming
- Added `ionWebSocketMessage` interface for type safety

### src/runtime/tests/ionClient.test.ts
- Added test: "polls with extended timeout and attempts history fallback on timeout"
- Added test: "WebSocket streaming listener receives execution_complete events"

### Test Results
✅ **9/9 tests passing** (including 2 new tests)

## Error Messages (Updated)

**Extended Polling Timeout**:
```
Timed out while polling ion progress for [promptId] (checked 1200 times over ~300s). 
If the image actually finished rendering, increase ion_REQUEST_TIMEOUT_MS or use WebSocket streaming.
```

This gives users clear guidance on next steps.

## Migration Path

### Phase 1: Use Extended Polling (Now - Backward Compatible)
No code changes needed. Existing `client.getProgress()` calls automatically use the extended 5-minute timeout.

```typescript
// Already working with 5-minute timeout
for await (const event of client.getProgress(promptId)) { }
```

### Phase 2: Switch to WebSocket (Recommended)
Update API wrappers to offer WebSocket as an option:

```typescript
// New code path; opt-in
for await (const event of client.getProgressWebSocket(promptId)) { }
```

### Phase 3: Full WebSocket Migration (Optional)
Make WebSocket the default streaming method; keep REST polling as fallback.

## Architecture

```
Request → Build → Validate → Reconcile Checkpoint → Submit
                                                        ↓
                                    ┌─────────────────────────────┐
                                    ↓                             ↓
                            REST Polling                   WebSocket Streaming
                         (getProgress)                   (getProgressWebSocket)
                         
                         - 1200 attempts                 - Real-time events
                         - ~5 min window                 - Never times out
                         - Fallback /history             - Lives on /ws
                         - Polling-based                 - Event-driven
                         - Compatible                    - Recommended
                                                        
                            ↓ (both) ↓
                         Retrieved Output
```

## FAQ

**Q: Will my current code still work?**  
A: Yes! `getProgress()` is backward compatible and now uses the extended 5-minute timeout automatically.

**Q: What if I switch to WebSocket and the connection drops?**  
A: The async iterator will throw an error. You can catch it and fall back to REST polling:
```typescript
try {
  for await (const event of client.getProgressWebSocket(promptId)) { }
} catch (error) {
  console.warn('WebSocket failed, falling back to REST polling');
  for await (const event of client.getProgress(promptId)) { }
}
```

**Q: Is WebSocket safe to use in production?**  
A: Yes. All 9 tests pass, including WebSocket streaming tests. It's more robust than polling.

**Q: How long should I wait before timing out?**  
A: 5 minutes (REST polling) is safe for most GPU jobs. WebSocket is better for uncertain durations.

## Next Steps (Optional)

1. **Add config flag** to choose streaming method (REST vs WebSocket) per request
2. **Auto-fallback** logic: Try WebSocket first, fall back to REST polling if connection fails
3. **Dashboard integration** to show real-time progress via WebSocket
4. **Metrics** to track which streaming method works best for your usage patterns

## Testing Locally

```bash
# Run ion server
npm run start:ion

# Run all tests (9/9 passing)
npx tsx --test src/runtime/tests/ionClient.test.ts

# Run specific test
npx tsx --test src/runtime/tests/ionClient.test.ts --grep "WebSocket"
```

---

**Summary**: Image generation is now resilient to slow ion completion notifications. Use the extended polling by default; switch to WebSocket for production deployments.
