# Load Tests (k6)

## Prerequisites

Install k6: https://k6.io/docs/getting-started/installation/

## Running Tests

```bash
# trip-engine load test (50 VUs, 60s)
K6_BASE_URL=https://your-project.supabase.co \
K6_SERVICE_ROLE_KEY=your-service-role-key \
k6 run tests/load/trip-engine.js

# activate-license load test (20 VUs, 60s)
K6_BASE_URL=https://your-project.supabase.co \
K6_SERVICE_ROLE_KEY=your-service-role-key \
k6 run tests/load/activate-license.js
```

## Thresholds

| Test             | Metric                 | Threshold |
| ---------------- | ---------------------- | --------- |
| trip-engine      | p95 response time      | < 500ms   |
| trip-engine      | error rate             | < 1%      |
| activate-license | p95 response time      | < 1000ms  |
| activate-license | error rate (excl. 429) | < 1%      |

## Notes

- `K6_BASE_URL`: Your Supabase project URL (e.g. `https://abc.supabase.co`)
- `K6_SERVICE_ROLE_KEY`: Service role key from Supabase dashboard
- Rate limit errors (HTTP 429) are **expected** and excluded from error rate calculations
- Run against staging environment, never production
