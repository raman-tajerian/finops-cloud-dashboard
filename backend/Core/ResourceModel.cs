namespace Core;

public record Resource(
    string Id,
    string Name,
    string Provider,
    string Service,
    string Environment,
    string Team,
    double MonthlyCost,
    Dictionary<string, double> DailyCosts
);

public static class ResourceGenerator
{
    public static List<Resource> GenerateResources(uint seed = 42)
    {
        var rng = new StableRandom(seed);
        var providers = new[] { "Azure", "AWS", "GCP" };
        var services = new Dictionary<string, string[]>
        {
            ["Azure"] = new[] { "Virtual Machines", "Azure SQL", "App Service", "Blob Storage", "Kubernetes Service" },
            ["AWS"] = new[] { "EC2", "RDS", "S3", "Lambda", "EKS" },
            ["GCP"] = new[] { "Compute Engine", "Cloud SQL", "Cloud Storage", "Cloud Functions", "GKE" }
        };
        var environments = new[] { "Production", "Staging", "Development" };
        var teams = new[] { "Core Platform", "Data Engineering", "Frontend Web", "Mobile App", "Security Ops" };

        var resources = new List<Resource>();
        int resourceCount = 60;

        for (int i = 1; i <= resourceCount; i++)
        {
            string provider = providers[rng.Next(0, providers.Length)];
            var providerServices = services[provider];
            string service = providerServices[rng.Next(0, providerServices.Length)];
            string environment = environments[rng.Next(0, environments.Length)];
            string team = teams[rng.Next(0, teams.Length)];
            
            string id = $"res-{provider.ToLower()}-{i:D3}";
            string name = $"{service.ToLower().Replace(" ", "-")}-{i}";

            double baseMonthlyCost = rng.Next(500, 15000);
            
            // Generate 90 days of daily costs starting 90 days ago
            var dailyCosts = new Dictionary<string, double>();
            var startDate = DateTime.UtcNow.Date.AddDays(-90);
            
            for (int day = 0; day < 90; day++)
            {
                var dateStr = startDate.AddDays(day).ToString("yyyy-MM-dd");
                double dailyBase = baseMonthlyCost / 30.0;
                double fluctuation = (rng.NextDouble() * 0.4) - 0.2; // +/- 20%
                double cost = Math.Round(dailyBase * (1 + fluctuation), 2);
                dailyCosts[dateStr] = Math.Max(0, cost);
            }

            double totalCost = dailyCosts.Values.Sum();

            resources.Add(new Resource(id, name, provider, service, environment, team, totalCost, dailyCosts));
        }

        return resources;
    }
}
