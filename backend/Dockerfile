FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["Api/Api.csproj", "Api/"]
COPY ["Core/Core.csproj", "Core/"]
COPY ["Tests/Tests.csproj", "Tests/"]
RUN dotnet restore "Api/Api.csproj"

COPY . .
RUN dotnet build "Api/Api.csproj" -c Release -o /app/build
RUN dotnet test "Tests/Tests.csproj" -c Release

FROM build AS publish
RUN dotnet publish "Api/Api.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 8080
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Api.dll"]
