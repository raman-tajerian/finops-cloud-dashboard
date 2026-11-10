namespace Api;

public static class SampleData
{
    static KpiValue K(double value, double previous, params double[] spark) => new(value, previous, spark);

    public static DashboardDto Dashboard() => new(
        Providers: new[] { "AWS", "Azure", "GCP" },
        Kpis: new KpiBundle(
            new SpendBlock(63533, 3.7, 5294, 166194),
            new WasteBlock(23296, 4100, 9800, 9396),
            new AnomalyDto[] { new("anom-1", "Azure Blob · blob-media-egress", 184, 925, "2026-10-10", "Azure") },
            new UnitBlock(0.0268, 0.000077, 2370000, 825000000, 1.24, 0.018)),
        Services: new CostByDimension[] {
            new("EC2", 17500), new("EKS", 11900), new("RDS", 9800), new("Azure VM", 8200),
            new("AKS", 6100), new("Blob", 4300), new("GKE", 3200), new("BigQuery", 2533) },
        Regions: new RegionCost[] {
            new("us-east-1", 22000, 0, 0), new("eu-west-1", 17200, 0, 0),
            new("westeurope", 0, 18600, 0), new("europe-west1", 0, 0, 5733) },
        Daily: new DailyCost[] {
            new("2026-10-06", 5000), new("2026-10-07", 5050), new("2026-10-08", 5100),
            new("2026-10-09", 5150), new("2026-10-10", 5200), new("2026-10-11", 5230), new("2026-10-12", 5294) },
        Recommendations: new SavingItemDto[] {
            new("rec-1", "Delete 11 idle resources", "Idle for 14+ days", 23296, "High Impact", "Platform",
                "Idle resources", "Low", "Low", 92, "EC2", new[] { "res-001", "res-002" }),
            new("rec-2", "Right-size oversized EC2 instances", "CPU average below 25%", 11200, "Quick Win", "Data",
                "Right-sizing", "Medium", "Low", 85, "EC2", new[] { "res-003" }) },
        Cluster: new ClusterDto("prod-k8s-cluster-01", "us-east-1", "1.31", 12, 74, 62, 148, 150),
        Ticker: new[] { "Auto-scaler removed 3 idle nodes 12 min ago", "Deployment api-gateway rolled out" },
        Forecast: new ForecastPoint[] {
            new("2026-10-12", 5294, new double[] { 5100, 5500 }, 5294),
            new("2026-10-13", 5300, new double[] { 5000, 5600 }, null),
            new("2026-10-14", 5310, new double[] { 4950, 5700 }, null) },
        Carbon: new CarbonRegionDto[] {
            new("eu-north-1", "AWS", 28, "A", 2.1), new("westeurope", "Azure", 268, "C", 8.7), new("us-east-1", "AWS", 380, "D", 14.2) },
        Topology: new TopologyDto(
            new TopoNodeDto[] {
                new("us-east-1", "us-east-1", "region", "anomaly", 50, 40, 0, 22000),
                new("prod-k8s-01", "prod-k8s-01", "cluster", "oversized", 70, 60, 0, 11900),
                new("vpc-data", "vpc-data", "vpc", "ok", 30, 65, 0, 9800) },
            new TopoEdgeDto[] { new("us-east-1", "prod-k8s-01"), new("us-east-1", "vpc-data") }),
        Resources: new ResourceDto[] {
            new("res-001", "legacy-batch-ec2", "AWS", "EC2", "us-east-1", 1200, "Idle"),
            new("res-010", "blob-media-egress", "Azure", "Blob", "westeurope", 1825, "Warning") },
        Overview: new OverviewKpis(
            TotalSpend: K(63533, 61260, 5000, 5050, 5100, 5150, 5200, 5230, 5294),
            ForecastEom: K(166194, 153180, 150000, 152000, 155000, 158000, 161000, 164000, 166194),
            DailyBurn: K(5294, 5105, 5000, 5050, 5100, 5150, 5200, 5230, 5294),
            Savings: K(52171, 38584, 38000, 40000, 43000, 46000, 48000, 50000, 52171),
            IdleWaste: K(23296, 21755, 21000, 21500, 22000, 22400, 22800, 23000, 23296),
            Anomalies: K(2, 2, 1, 1, 1, 2, 2, 2, 2),
            CostPerUser: K(0.0268, 0.0259, 0.0255, 0.0258, 0.0260, 0.0262, 0.0264, 0.0266, 0.0268),
            CostPerRequest: K(0.000077, 0.000074, 0.000073, 0.000074, 0.000075, 0.000075, 0.000076, 0.000076, 0.000077),
            IdleCount: 11),
        Trend: new ProviderDaily[] {
            new("2026-10-10", 3100, 1450, 500, 5050, null, null, "Azure Blob egress spike"),
            new("2026-10-11", 3150, 1480, 520, 5150, null, null, null),
            new("2026-10-12", 3200, 1500, 530, 5230, null, null, null),
            new("2026-10-13", 3200, 1500, 530, 5230, 5300, new double[] { 5000, 5600 }, null) },
        Teams: new CostByDimension[] {
            new("Platform", 24000), new("Data", 18000), new("FinOps", 9000), new("Media", 12533) },
        Movers: new MoversDto(
            new Mover[] {
                new("res-010", "blob-media-egress", "Azure", "Blob", 1825, 900, 925),
                new("res-011", "checkout-eks-prod-4", "AWS", "EKS", 2214, 2000, 214) },
            new Mover[] {
                new("res-020", "legacy-ec2-batch", "AWS", "EC2", 300, 520, -220) }),
        Totals: new TotalsDto(63533, new CostByDimension[] {
            new("AWS", 39200), new("Azure", 18600), new("GCP", 5733) })
    );
}
