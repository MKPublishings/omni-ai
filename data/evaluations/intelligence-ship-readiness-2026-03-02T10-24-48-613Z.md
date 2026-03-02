# Omni Ship Readiness (2026-03-02T10:24:48.613Z)

- Status: **RED**
- Baseline score: 0.705
- Adjusted score: 0.345
- Risk penalty: 0.36

## Risk Signals

- Open tokens: 3
- High-priority open: 1
- In-progress open: 0
- Escalations: 1
- Reopen count: 4

## Blockers

- 1 open high-priority token(s)
- 1 escalation token(s)
- observability below target (runtime log coverage too low)
- reliability below watch threshold

## Recommendations

- Clear high-priority and escalation tokens before production ship.
- Increase runtime telemetry depth to improve observability confidence.
- Re-run `npm run mind:baseline` after fixes and verify readiness score trend.
