# Monitoring stack

Metrics, logs and alerting for every service in the environment, defined as code and started with one command.

```bash
docker compose up -d
```

| Service | Port | Purpose |
|---|---|---|
| Prometheus | 9090 | Scrapes and stores metrics |
| Loki | 3100 | Stores logs |
| Grafana | 3000 | Dashboards and alert routing |

## Alerting philosophy

Alerts page a human only when users are affected. The [rules](prometheus/rules/alerts.yml) use error budget burn rates over two windows instead of raw thresholds, which removes most of the noise from short spikes.

Dashboards are generated from Jsonnet in [`dashboards/`](dashboards/overview.jsonnet), so every panel is reviewed in a pull request like any other change.
