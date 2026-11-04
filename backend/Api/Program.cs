var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(o => o.AddPolicy("frontend", p => p
    .WithOrigins("http://localhost:5173", "http://localhost:8080")
    .AllowAnyHeader()
    .AllowAnyMethod()));

var app = builder.Build();

app.UseCors("frontend");

app.MapGet("/api/v1/health", () => Results.Ok(new { status = "ok" }));

app.Run();
