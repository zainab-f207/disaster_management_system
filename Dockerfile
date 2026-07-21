# Stage 1: Build the application
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files and restore dependencies
COPY ["DisasterPreparedness&ResponseSystem/DisasterPreparedness&ResponseSystem.API/DisasterPreparedness&ResponseSystem.API.csproj", "DisasterPreparedness&ResponseSystem/DisasterPreparedness&ResponseSystem.API/"]
COPY ["DisasterPreparedness&ResponseSystem/DisasterPreparedness&ResponseSystem.Core/DisasterPreparedness&ResponseSystem.Core.csproj", "DisasterPreparedness&ResponseSystem/DisasterPreparedness&ResponseSystem.Core/"]
COPY ["DisasterPreparedness&ResponseSystem/DisasterPreparedness&ResponseSystem.Infrastructure/DisasterPreparedness&ResponseSystem.Infrastructure.csproj", "DisasterPreparedness&ResponseSystem/DisasterPreparedness&ResponseSystem.Infrastructure/"]

RUN dotnet restore "DisasterPreparedness&ResponseSystem/DisasterPreparedness&ResponseSystem.API/DisasterPreparedness&ResponseSystem.API.csproj"

# Copy full source and build the API
COPY . .
WORKDIR "/src/DisasterPreparedness&ResponseSystem/DisasterPreparedness&ResponseSystem.API"
RUN dotnet build "DisasterPreparedness&ResponseSystem.API.csproj" -c Release -o /app/build

# Stage 2: Publish the application
FROM build AS publish
RUN dotnet publish "DisasterPreparedness&ResponseSystem.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Expose common port for free hosting providers
ENV ASPNETCORE_URLS=http://+:8080
ENV DOTNET_USE_POLLING_FILE_WATCHER=1
EXPOSE 8080

ENTRYPOINT ["dotnet", "DisasterPreparedness&ResponseSystem.API.dll"]
