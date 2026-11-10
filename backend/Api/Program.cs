using Api;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(o => o.AddPolicy("frontend", p => p
    .WithOrigins("http://localhost:5173", "http://localhost:8080")
    .AllowAnyHeader()
    .AllowAnyMethod()));

var app = builder.Build();

app.UseCors("frontend");

app.MapGet("/api/v1/health", () => Results.Ok(new { status = "ok" }));

// Filters are accepted but ignored for now: range, providers (comma-joined), env, team.
app.MapGet("/api/v1/dashboard", (string? range, string? providers, string? env, string? team) =>
    Results.Ok(SampleData.Dashboard()));

app.Run();
