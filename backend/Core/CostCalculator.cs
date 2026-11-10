namespace Core;

public static class CostCalculator
{
    public static double GetTotalCost(IEnumerable<Resource> resources, int days = 30)
    {
        var cutoffDate = DateTime.UtcNow.Date.AddDays(-days);
        double total = 0;

        foreach (var resource in resources)
        {
            foreach (var kvp in resource.DailyCosts)
            {
                if (DateTime.TryParse(kvp.Key, out var date) && date >= cutoffDate)
                {
                    total += kvp.Value;
                }
            }
        }

        return Math.Round(total, 2);
    }

    public static Dictionary<string, double> GetCostByProvider(IEnumerable<Resource> resources, int days = 30)
    {
        var cutoffDate = DateTime.UtcNow.Date.AddDays(-days);
        var result = new Dictionary<string, double>();

        foreach (var resource in resources)
        {
            double resourceTotal = 0;
            foreach (var kvp in resource.DailyCosts)
            {
                if (DateTime.TryParse(kvp.Key, out var date) && date >= cutoffDate)
                {
                    resourceTotal += kvp.Value;
                }
            }

            if (!result.ContainsKey(resource.Provider))
            {
                result[resource.Provider] = 0;
            }
            result[resource.Provider] += resourceTotal;
        }

        return result.ToDictionary(k => k.Key, v => Math.Round(v.Value, 2));
    }

    public static Dictionary<string, double> GetCostByService(IEnumerable<Resource> resources, int days = 30)
    {
        var cutoffDate = DateTime.UtcNow.Date.AddDays(-days);
        var result = new Dictionary<string, double>();

        foreach (var resource in resources)
        {
            double resourceTotal = 0;
            foreach (var kvp in resource.DailyCosts)
            {
                if (DateTime.TryParse(kvp.Key, out var date) && date >= cutoffDate)
                {
                    resourceTotal += kvp.Value;
                }
            }

            if (!result.ContainsKey(resource.Service))
            {
                result[resource.Service] = 0;
            }
            result[resource.Service] += resourceTotal;
        }

        return result.ToDictionary(k => k.Key, v => Math.Round(v.Value, 2));
    }

    public static Dictionary<string, double> GetCostByTeam(IEnumerable<Resource> resources, int days = 30)
    {
        var cutoffDate = DateTime.UtcNow.Date.AddDays(-days);
        var result = new Dictionary<string, double>();

        foreach (var resource in resources)
        {
            double resourceTotal = 0;
            foreach (var kvp in resource.DailyCosts)
            {
                if (DateTime.TryParse(kvp.Key, out var date) && date >= cutoffDate)
                {
                    resourceTotal += kvp.Value;
                }
            }

            if (!result.ContainsKey(resource.Team))
            {
                result[resource.Team] = 0;
            }
            result[resource.Team] += resourceTotal;
        }

        return result.ToDictionary(k => k.Key, v => Math.Round(v.Value, 2));
    }
}
