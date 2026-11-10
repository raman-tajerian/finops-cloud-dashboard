namespace Tests;

using Core;
using Xunit;

public class CostCalculatorTests
{
    [Fact]
    public void TotalCost_Matches_SumOfProvidersServicesAndTeams()
    {
        var resources = ResourceGenerator.GenerateResources(42);
        int days = 30;

        double totalCost = CostCalculator.GetTotalCost(resources, days);
        var providerCosts = CostCalculator.GetCostByProvider(resources, days);
        var serviceCosts = CostCalculator.GetCostByService(resources, days);
        var teamCosts = CostCalculator.GetCostByTeam(resources, days);

        double sumByProvider = Math.Round(providerCosts.Values.Sum(), 2);
        double sumByService = Math.Round(serviceCosts.Values.Sum(), 2);
        double sumByTeam = Math.Round(teamCosts.Values.Sum(), 2);

        Assert.Equal(totalCost, sumByProvider, precision: 2);
        Assert.Equal(totalCost, sumByService, precision: 2);
        Assert.Equal(totalCost, sumByTeam, precision: 2);
    }
}
