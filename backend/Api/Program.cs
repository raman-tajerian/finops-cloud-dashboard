using Core;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();

// Generate shared mock resources once on startup
var cachedResources = ResourceGenerator.GenerateResources(42);

var app = builder.Build();

app.UseHttpsRedirection();

// Dashboard API endpoint with filters
app.MapGet("/api/v1/dashboard", (int? range, string? providers, string? env, string? team) =>
{
    int days = range ?? 30;
    var filtered = cachedResources.AsEnumerable();

    if (!string.IsNullOrEmpty(providers))
    {
        var provList = providers.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        filtered = filtered.Where(r => provList.Contains(r.Provider, StringComparer.OrdinalIgnoreCase));
    }

    if (!string.IsNullOrEmpty(env))
    {
        var envList = env.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        filtered = filtered.Where(r => envList.Contains(r.Environment, StringComparer.OrdinalIgnoreCase));
    }

    if (!string.IsNullOrEmpty(team))
    {
        var teamList = team.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        filtered = filtered.Where(r => teamList.Contains(r.Team, StringComparer.OrdinalIgnoreCase));
    }

    var resourcesList = filtered.ToList();

    double totalCost = CostCalculator.GetTotalCost(resourcesList, days);
    var byProvider = CostCalculator.GetCostByProvider(resourcesList, days);
    var byService = CostCalculator.GetCostByService(resourcesList, days);
    var byTeam = CostCalculator.GetCostByTeam(resourcesList, days);

    return Results.Ok(new
    {
        TotalCost = totalCost,
        CostByProvider = byProvider,
        CostByService = byService,
        CostByTeam = byTeam,
        ResourceCount = resourcesList.Count
    });
})
.WithName("GetDashboard");

// Resources API endpoint
app.MapGet("/api/v1/resources", (string? search, string? provider, string? environment, string? team) =>
{
    var filtered = cachedResources.AsEnumerable();

    if (!string.IsNullOrEmpty(search))
    {
        filtered = filtered.Where(r => 
            r.Name.Contains(search, StringComparison.OrdinalIgnoreCase) || 
            r.Id.Contains(search, StringComparison.OrdinalIgnoreCase));
    }

    if (!string.IsNullOrEmpty(provider))
    {
        var provList = provider.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        filtered = filtered.Where(r => provList.Contains(r.Provider, StringComparer.OrdinalIgnoreCase));
    }

    if (!string.IsNullOrEmpty(environment))
    {
        var envList = environment.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        filtered = filtered.Where(r => envList.Contains(r.Environment, StringComparer.OrdinalIgnoreCase));
    }

    if (!string.IsNullOrEmpty(team))
    {
        var teamList = team.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        filtered = filtered.Where(r => teamList.Contains(r.Team, StringComparer.OrdinalIgnoreCase));
    }

    return Results.Ok(filtered.ToList());
})
.WithName("GetResources");

app.Run();
