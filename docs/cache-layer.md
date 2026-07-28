# In-memory Cache Layer with Redis and Configurable TTL

## Architecture

VeriNode exposes a system-wide cache abstraction in `src/cache/cache_layer.ts`. The cache uses Redis when `CACHE_REDIS_URL` or `REDIS_URL` is configured and falls back to a bounded in-process memory cache when Redis is disabled or becomes unavailable. Values are JSON encoded, namespaced, and stored with an explicit TTL on every write.

## Configuration

| Environment variable | Default | Description |
| --- | ---: | --- |
| `CACHE_REDIS_URL` | unset | Redis connection URL for the primary distributed cache backend. |
| `REDIS_URL` | unset | Secondary Redis URL fallback when `CACHE_REDIS_URL` is unset. |
| `CACHE_DEFAULT_TTL_SECONDS` | `300` | Default TTL used when a call does not provide a per-entry TTL. |
| `CACHE_NAMESPACE` | `verinode` | Prefix for cache keys; invalid key-prefix characters are replaced with `_`. |
| `CACHE_MAX_ENTRIES` | `10000` | Maximum local memory entries per process before oldest-entry eviction. |

## Operating model

- Prefer `getOrSet(key, loader, { ttlSeconds })` for critical paths to keep cache misses explicit and measured.
- Use low TTL values for frequently changing authorization, balance, and configuration-derived values.
- Use namespaced keys such as `service:entity:id` to avoid collisions.
- Redis outages degrade to local in-memory cache instead of failing requests, preserving availability while reducing cross-node cache hit rate.

## Monitoring and alerting

The cache emits OpenTelemetry counters and histograms for requests, hits, misses, writes, backend errors, and operation latency. The `/metrics` scrape endpoint also includes local gauges:

- `verinode_cache_entries` for in-memory entry count.
- `verinode_cache_redis_available` for Redis backend availability.

Recommended alerts:

- P99 `cache.operation_duration_ms` above 100ms for 5 minutes.
- `cache.errors_total` increase above 1% of cache operations for 5 minutes.
- `verinode_cache_redis_available == 0` in production for more than 2 minutes.

## Deployment

Deploy cache usage behind existing blue-green and canary release controls. Start with Redis configured, a conservative default TTL, and a small percentage of traffic. During canary analysis, compare P99 latency, Redis availability, cache hit rate, and backend error rate before promoting the green environment.
