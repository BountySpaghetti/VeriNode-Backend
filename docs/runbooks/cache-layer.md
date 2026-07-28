# Cache Layer Runbook

## Redis unavailable

1. Confirm `verinode_cache_redis_available` is `0` on `/metrics`.
2. Check Redis service health, network ACLs, and `CACHE_REDIS_URL` secret rotation history.
3. Keep traffic live if API latency remains within SLO; the process falls back to in-memory cache.
4. After Redis recovery, restart or roll pods to re-establish Redis clients.

## Elevated cache latency

1. Inspect P99 for `cache.operation_duration_ms` and Redis server CPU/memory.
2. Reduce TTL only if stale data risk is the incident driver; otherwise increase TTL to lower backend pressure.
3. If Redis is saturated, scale Redis or temporarily route through memory fallback by removing `CACHE_REDIS_URL` during a controlled rollout.

## Canary checklist

- Confirm P99 critical-path latency remains below 100ms.
- Confirm cache error rate is below 1% of cache operations.
- Confirm hit/miss ratio is stable or improving after warmup.
- Promote only after blue and green metrics agree for the full canary window.
