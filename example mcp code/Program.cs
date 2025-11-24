using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ModelContextProtocol;
using RestSharp;
using RestSharp.Authenticators;

var builder = Host.CreateEmptyApplicationBuilder(settings: null);

builder.Services.AddMcpServer()
    .WithStdioServerTransport()
    .WithToolsFromAssembly();

// Read common configuration
var authToken = Environment.GetEnvironmentVariable("API_TOKEN")
    ?? "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlxdWVfbmFtZSI6Im5peWl3NTMzNDVAN3R1bC5jb20iLCJlbWFpbCI6Im5peWl3NTMzNDVAN3R1bC5jb20iLCJuYW1laWQiOiJjMTU1NzM1Mi1kMGE0LTRlMDktYTgzMi1kMGYzNDE5OGM2MWEiLCJGaXJzdE5hbWUiOiJSYW1lc2giLCJMYXN0TmFtZSI6IkJvbGxhIiwiU2Vzc2lvbiI6ImM4N2FkNDYwLTMxM2ItNGJkOC04MDhlLWNjMjU3YThjYThjOSIsIk9yaWdpbiI6Im9yZGVyc2RlbW8uZWFzeWZhc3Rub3cuY29tIiwiQXBwUmVmZXJlbmNlIjoiMmQxMzJkYmEtNTFmNC00YmU1LTk4YTItYmRlZTM4MjgyNmI2IiwiYXVkIjpbIkNDUUFBbGxvY2F0aW9uQ29tbWFuZEFQSSIsIkNDUUFBbGxvY2F0aW9uUXVlcmllc0FQSSIsIkNDUUFDYXJ0UXVlcmllc0FQSSIsIkNDUUFDYXJ0Q29tbWFuZHNBUEkiLCJDQ1FBUXVvdGVDb21tYW5kc0FQSSIsIkNDUUFRdW90ZVF1ZXJpZXNBUEkiLCJDQ1FBV2lzaGxpc3RBUEkiLCJDQ1FBRXhwb3J0c1F1ZXJpZXNBUEkiLCJDQ1FBRXhwb3J0c0NvbW1hbmRBUEkiLCJRQU9uZVNvdXJjZUFQSSIsIk5vZGVDb21tb25TZXJ2aWNlIiwiQ0NRQUNNU1F1ZXJpZXNBUEkiLCJDQ1FBQ01TQ29tbWFuZEFQSSIsIkNDUUFBY2NvdW50Q29tbWFuZEFQSSIsIkNDUUFBY2NvdXRRdWVyaWVzQVBJIiwiQ0NRQUF1dGhTeW5jQ29tbWFuZEFQSSIsIkNDUUFDb3JlQ29udHJvbENvbW1hbmRBUEkiLCJDQ1FBQ29yZUNvbnRyb2xRdWVyaWVzQVBJIiwiQ0NRQUN1c3RvbWVyQ29tbWFuZEFQSSIsIkNDUUFDdXN0b21lclF1ZXJpZXNBUEkiLCJDQ1FBUGF5bWVudENvbmZpZ0NvbW1hbmRBUEkiLCJDQ1FBUGF5bWVudENvbmZpZ1F1ZXJpZXNBUEkiLCJDQ1FBUE1Db21tYW5kQVBJIiwiQ0NRQVBNUXVlcmllc0FQSSIsIkNDUUFQcm9kdWN0c0NvbW1hbmRBUEkiLCJDQ1FBUnVsZUNvbW1hbmRBUEkiLCJDQ1FBUnVsZVF1ZXJpZXNBUEkiLCJDQ1FBU2FsZXNDb21tYW5kQVBJIiwiQ0NRQVNlYXJjaENvbW1hbmRBUEkiLCJDQ1FBU2VhcmNoUXVlcmllc0FQSSIsIkNDUUFTaGlwcGluZ0NvbW1hbmRBUEkiLCJDQ1FBU2hpcHBpbmdRdWVyaWVzQVBJIiwiQ0NRQVRheENvbmZpZ0NvbW1hbmRBUEkiLCJDQ1FBVGF4Q29uZmlnUXVlcmllc0FQSSIsIkNDUUFVTVF1ZXJpZXNBUEkiLCJDQ1FBV0lDb21tYW5kQVBJIiwiQ0NRQVdJUXVlcmllc0FQSSIsIkNDUUFXZWJzaXRlQ29tbWFuZEFQSSIsIkNDUUFXZWJzaXRlUXVlcmllc0FQSSIsIkNDUUFNYXJrZXRpbmdDb21tYW5kQVBJIiwiQ0NRQU1hcmtldGluZ1F1ZXJpZXNBUEkiLCJDQ1FBSW1wb3J0c0NvbW1hbmRBUEkiLCJDQ1FBSW1wb3J0c1F1ZXJpZXNBUEkiLCJDQ1FBTWFjcm9zQ29tbWFuZEFQSSIsIkNDUUFNYWNyb3NRdWVyaWVzQVBJIiwiQ0NRQUV2ZW50UmVnaXN0ZXJDb21tYW5kQVBJIiwiQ0NRQU9yZGVyQ29tbWFuZHNBUEkiLCJDQ1FBT3JkZXJRdWVyaWVzQVBJIl0sInNjb3BlIjoiIiwibmJmIjoxNzYzOTY3NjA2LCJleHAiOjE3NjQwNTQwMDYsImlhdCI6MTc2Mzk2NzYwNiwiaXNzIjoiZWRnZS1xYS1pc3N1ZXIifQ.PWdYVqhvT6gK9hhuvtOvoETUzfsdovfxOuBPITSadbw4OCrrdie1MEIXx7UZV9KtpxSQIwyWeg-H5FzJI_8Cbwwwbm3xaNwLbEd-yA4xeuDtYh1vn4Kz6Q9KJyARxWqrm8ucKPbdXj30KynrFFOr7pxgtyiYDZkVkBoey51foTwoE87LuaigSpxsSX6-kNtYMS3lf25aGUsGBJCuYBXTO866lVfUMm5y7_RymLcEriuWIWlsxEW6OSj7dVgZfipdZrS6sv2m568f6jG6SVbK8B9hXj42BF1p7IRbKKYc_NGIDxKdHZqleisR2VSGN05eqvX6rPY8dFqrIfY4qRmyRw";
var originUrl = Environment.GetEnvironmentVariable("ORDER_ORIGIN_URL") 
    ?? "https://ordersdemo.easyfastnow.com";

// Register RestClient for Order Queries API
builder.Services.AddKeyedSingleton("OrderQueriesClient", (sp, key) =>
{
    var baseUrl = Environment.GetEnvironmentVariable("ORDER_QUERIES_API_BASE_URL") 
        ?? "https://orders-queryservice.easyfastnow.com";

    var options = new RestClientOptions(baseUrl)
    {
        Authenticator = new JwtAuthenticator(authToken)
    };

    var client = new RestClient(options);
    client.AddDefaultHeader("User-Agent", "order-tool/1.0");
    client.AddDefaultHeader("X-Origin-Url", originUrl);
    
    return client;
});

// Register RestClient for Order Commands API
builder.Services.AddKeyedSingleton("OrderCommandsClient", (sp, key) =>
{
    var baseUrl = Environment.GetEnvironmentVariable("ORDER_COMMANDS_API_BASE_URL") 
        ?? "https://orders-commandservice.easyfastnow.com";

    var options = new RestClientOptions(baseUrl)
    {
        Authenticator = new JwtAuthenticator(authToken)
    };

    var client = new RestClient(options);
    client.AddDefaultHeader("User-Agent", "order-tool/1.0");
    client.AddDefaultHeader("X-Origin-Url", originUrl);
    
    return client;
});

// Register RestClient for Product Queries API
builder.Services.AddKeyedSingleton("ProductQueriesClient", (sp, key) =>
{
    var baseUrl = Environment.GetEnvironmentVariable("PRODUCT_QUERIES_API_BASE_URL")
        ?? "https://qaproducts_commandsapi.easyfastnow.com";

    var options = new RestClientOptions(baseUrl)
    {
        Authenticator = new JwtAuthenticator(authToken)
    };

    var client = new RestClient(options);
    client.AddDefaultHeader("User-Agent", "product-tool/1.0");
    client.AddDefaultHeader("X-Origin-Url", originUrl);

    return client;
});

// Keep the default singleton for backward compatibility (points to Queries)
builder.Services.AddSingleton(sp => sp.GetRequiredKeyedService<RestClient>("OrderQueriesClient"));

var app = builder.Build();

await app.RunAsync();
