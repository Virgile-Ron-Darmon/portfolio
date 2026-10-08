local g = import 'g.libsonnet';

g.dashboard.new('Overview')
+ g.dashboard.withRefresh('30s')
+ g.dashboard.withPanels([
  g.panel.timeSeries.new('Requests per second')
  + g.panel.timeSeries.queryOptions.withTargets([
    g.query.prometheus.new('Prometheus', 'sum(rate(http_requests_total[5m]))'),
  ]),
  g.panel.stat.new('Error budget remaining')
  + g.panel.stat.queryOptions.withTargets([
    g.query.prometheus.new('Prometheus', 'slo:error_budget_remaining:ratio'),
  ]),
])
