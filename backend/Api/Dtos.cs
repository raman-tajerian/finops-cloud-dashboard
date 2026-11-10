using System.Text.Json.Serialization;

namespace Api;

public record SpendBlock(double Total, double Mom, double Burn, double Projected);
public record WasteBlock(double Total, double Ebs, double Rds, double Ec2);
public record AnomalyDto(string Id, string Title, double Change, double Impact, string Since, string Provider);
public record UnitBlock(double PerUser, double PerRequest, double ActiveUsers, double Requests, double PerDeployment, double PerSession);
public record KpiBundle(SpendBlock Spend, WasteBlock Waste, AnomalyDto[] Anomalies, UnitBlock Unit);

public record CostByDimension(string Name, double Value);

public record RegionCost(
    string Region,
    [property: JsonPropertyName("AWS")] double Aws,
    [property: JsonPropertyName("Azure")] double Azure,
    [property: JsonPropertyName("GCP")] double Gcp);

public record DailyCost(string Day, double Spend);
public record ForecastPoint(string Day, double Forecast, double[] Band, double? Actual);

public record SavingItemDto(
    string Id, string Title, string Detail, double Savings, string Impact, string Team,
    string Category, string Effort, string Risk, double Confidence, string Service, string[] ResourceIds);

public record ClusterDto(string Name, string Region, string Version, int Nodes, double Cpu, double Memory, int PodsHealthy, int PodsTotal);
public record CarbonRegionDto(string Region, string Provider, double Intensity, string Rating, double Tons);
public record TopoNodeDto(string Id, string Label, string Kind, string Health, double X, double Y, double Z, double Cost);
public record TopoEdgeDto(string From, string To);
public record TopologyDto(TopoNodeDto[] Nodes, TopoEdgeDto[] Edges);
public record ResourceDto(string Id, string Name, string Provider, string Type, string Region, double MonthlyCost, string Status);

public record KpiValue(double Value, double Previous, double[] Spark);
public record OverviewKpis(
    KpiValue TotalSpend, KpiValue ForecastEom, KpiValue DailyBurn, KpiValue Savings, KpiValue IdleWaste,
    KpiValue Anomalies, KpiValue CostPerUser, KpiValue CostPerRequest, int IdleCount);

public record ProviderDaily(
    string Day,
    [property: JsonPropertyName("AWS")] double Aws,
    [property: JsonPropertyName("Azure")] double Azure,
    [property: JsonPropertyName("GCP")] double Gcp,
    double Total,
    double? Forecast,
    double[]? Band,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Anomaly);

public record Mover(string Id, string Name, string Provider, string Service, double Current, double Previous, double Delta);
public record MoversDto(Mover[] Up, Mover[] Down);
public record TotalsDto(double Total, CostByDimension[] ByProvider);

public record DashboardDto(
    string[] Providers,
    KpiBundle Kpis,
    CostByDimension[] Services,
    RegionCost[] Regions,
    DailyCost[] Daily,
    SavingItemDto[] Recommendations,
    ClusterDto Cluster,
    string[] Ticker,
    ForecastPoint[] Forecast,
    CarbonRegionDto[] Carbon,
    TopologyDto Topology,
    ResourceDto[] Resources,
    OverviewKpis Overview,
    ProviderDaily[] Trend,
    CostByDimension[] Teams,
    MoversDto Movers,
    TotalsDto Totals);
