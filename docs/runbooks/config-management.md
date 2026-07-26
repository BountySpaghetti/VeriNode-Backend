# Runbook: Configuration Reload Failure

1. Check `verinode_config_reload_failed_total` and service logs for the validation
   error path.
2. Revert the failing config key or restore the last known-good config artifact.
3. Send `SIGHUP` to one canary instance and verify `reload_complete`.
4. Continue with a rolling or blue-green promotion after canary P99 latency and
   error rate stay within SLO.
5. Open a security review if the changed keys include credentials, TLS, mTLS,
   remote config endpoints, or feature flags that alter access control.
