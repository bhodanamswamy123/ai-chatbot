using ModelContextProtocol.Server;
using System.ComponentModel;
using System.Text.Json;
using RestSharp;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;

namespace TestMCP;

/// <summary>
/// Response model containing paginated order list
/// </summary>
public class OrderListResponse
{
    public List<OrderSummary> Orders { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
}

/// <summary>
/// Summary information for a single order
/// </summary>
public class OrderSummary
{
    public long OrderId { get; set; }
    public Guid OrderKey { get; set; }
    public string? OrderNumber { get; set; }
    public short Status { get; set; }
    public string? StatusText { get; set; }
    public DateTime? OrderDate { get; set; }
    public DateTime? CreatedDate { get; set; }
    public DateTime? ModifiedDate { get; set; }

    // Additional details
    public int ItemCount { get; set; }
    public long OrderDetailId { get; set; }
}

public class CurrentOrderStatusResponse
{
    public long OrderDetailId { get; set; }
    public long OrderStatusId { get; set; }
    public string OrderStatusName { get; set; } = string.Empty;
}

internal static class RestClientExt
{
    public static async Task<JsonDocument> ExecuteAndGetJsonAsync(this RestClient client, RestRequest request)
    {
        var response = await client.ExecuteAsync(request);

        if (!response.IsSuccessful)
        {
            throw new Exception($"Request failed with status {response.StatusCode}: {response.ErrorMessage}");
        }

        if (string.IsNullOrEmpty(response.Content))
        {
            throw new Exception("Response content is empty");
        }

        return JsonDocument.Parse(response.Content);
    }

    public static async Task<T?> ExecuteAndDeserializeAsync<T>(this RestClient client, RestRequest request)
    {
        var response = await client.ExecuteAsync<T>(request);

        if (!response.IsSuccessful)
        {
            throw new Exception($"Request failed with status {response.StatusCode}: {response.ErrorMessage}");
        }

        return response.Data;
    }
}

[McpServerToolType]
public static class OrderTools
{
    [McpServerTool, Description("Retrieve a paginated list of orders from the Order Management System. This tool allows you to query orders with various filters including customer, status, pagination, and sorting options.")]
    public static async Task<string> GetOrders(
        IServiceProvider serviceProvider,
        [Description("Page number for pagination (default: 1)")] int page = 1,
        [Description("Number of orders per page (default: 20, max: 100)")] int pageSize = 20,
        [Description("Field to sort by (OrderNumber, CreatedDate, Status, TotalAmount). Default: CreatedDate")] string sortBy = "CreatedDate",
        [Description("Sort direction (Asc or Desc). Default: Desc")] string sortDirection = "Desc",
        [Description("Optional: Filter orders by customer GUID")] string? customerKey = null,
        [Description("Optional: Filter orders by status code")] int? status = null)
    {
        try
        {
            // Manually resolve the keyed service
            var client = serviceProvider.GetRequiredKeyedService<RestClient>("OrderQueriesClient");
            
            //logger.LogInformation("GetOrders called with page={Page}, pageSize={PageSize}, sortBy={SortBy}", page, pageSize, sortBy);

            // Create RestSharp request
            var request = new RestRequest("/orders", Method.Get);

            // Add query parameters
            request.AddQueryParameter("page", page.ToString());
            request.AddQueryParameter("pageSize", Math.Min(pageSize, 100).ToString()); // Enforce max page size
            request.AddQueryParameter("sortBy", sortBy);
            request.AddQueryParameter("sortDirection", sortDirection);

            if (!string.IsNullOrWhiteSpace(customerKey) && Guid.TryParse(customerKey, out var custKey))
            {
                request.AddQueryParameter("customerKey", custKey.ToString());
                //logger.LogDebug("Filtering by customerKey: {CustomerKey}", custKey);
            }

            if (status.HasValue)
            {
                request.AddQueryParameter("status", status.Value.ToString());
                //logger.LogDebug("Filtering by status: {Status}", status.Value);
            }

            //logger.LogDebug("Executing API request to: {Resource}", request.Resource);

            // Execute the request and get response
            using var jsonDocument = await client.ExecuteAndGetJsonAsync(request);
            var jsonElement = jsonDocument.RootElement;

            //logger.LogDebug("API request successful, parsing response");

            // Parse the response - adjust based on your actual API response structure
            var responseData = jsonElement.GetProperty("response");

            var orderListResponse = new OrderListResponse
            {
                Page = page,
                PageSize = pageSize,
                TotalCount = responseData.TryGetProperty("totalCount", out var totalCountProp)
                    ? totalCountProp.GetInt32()
                    : 0
            };

            // Parse orders array
            if (responseData.TryGetProperty("orders", out var ordersArray))
            {
                foreach (var orderElement in ordersArray.EnumerateArray())
                {
                    var order = new OrderSummary
                    {
                        OrderId = orderElement.TryGetProperty("orderId", out var orderId)
                            ? orderId.GetInt64()
                            : 0,
                        OrderKey = orderElement.TryGetProperty("orderKey", out var orderKey)
                            ? orderKey.GetGuid()
                            : Guid.Empty,
                        OrderNumber = orderElement.TryGetProperty("orderNumber", out var orderNum) && orderNum.ValueKind != JsonValueKind.Null
                            ? orderNum.GetString()
                            : null,
                        Status = orderElement.TryGetProperty("status", out var statusProp)
                            ? statusProp.GetInt16()
                            : (short)0,
                        StatusText = orderElement.TryGetProperty("statusText", out var statusText) && statusText.ValueKind != JsonValueKind.Null
                            ? statusText.GetString()
                            : null,
                        OrderDate = orderElement.TryGetProperty("orderDate", out var orderDate) && orderDate.ValueKind != JsonValueKind.Null
                            ? orderDate.GetDateTime()
                            : null,
                        CreatedDate = orderElement.TryGetProperty("createdDate", out var createdDate) && createdDate.ValueKind != JsonValueKind.Null
                            ? createdDate.GetDateTime()
                            : null,
                        ModifiedDate = orderElement.TryGetProperty("modifiedDate", out var modifiedDate) && modifiedDate.ValueKind != JsonValueKind.Null
                            ? modifiedDate.GetDateTime()
                            : null,


                        // Additional details
                        ItemCount = orderElement.TryGetProperty("itemCount", out var itemCount)
                            ? itemCount.GetInt32()
                            : 0,
                        OrderDetailId = orderElement.TryGetProperty("orderDetailId", out var orderDetailId)
                            ? orderDetailId.GetInt64()
                            : 0
                    };

                    orderListResponse.Orders.Add(order);
                }
            }

            //logger.LogInformation("Successfully retrieved {Count} orders out of {TotalCount}", orderListResponse.Orders.Count, orderListResponse.TotalCount);

            // Format the response as a readable string for Claude
            var result = new System.Text.StringBuilder();
            result.AppendLine($"📦 Order List (Page {orderListResponse.Page} of {orderListResponse.TotalPages})");
            result.AppendLine($"Total Orders: {orderListResponse.TotalCount}");
            result.AppendLine();

            if (orderListResponse.Orders.Count == 0)
            {
                result.AppendLine("No orders found matching the criteria.");
            }
            else
            {
                foreach (var order in orderListResponse.Orders)
                {
                    result.AppendLine($"─────────────────────────────────────");
                    result.AppendLine($"Order #{order.OrderNumber} (ID: {order.OrderId}), (OrderDetailID: {order.OrderDetailId})");
                    result.AppendLine($"Status: {order.StatusText ?? order.Status.ToString()}");
                    result.AppendLine($"Date: {order.OrderDate?.ToString("yyyy-MM-dd HH:mm") ?? "N/A"}");

                    result.AppendLine($"Items: {order.ItemCount}");

                    result.AppendLine();
                }
            }

            return result.ToString();
        }
        catch (Exception ex)
        {
            //logger.LogError(ex, "Error occurred while getting orders");
            return $"❌ Error: {ex.Message}\n\nStack Trace:\n{ex.StackTrace}";
        }
    }

    [McpServerTool, Description("Retrieves status of a particular order based on the provided detail ID")]
    public static async Task<string> GetOrderStatus(
        IServiceProvider serviceProvider,
        [Description("The unique identifier for the order detail")] long orderDetailId)
    {
        try
        {
            // Manually resolve the keyed service
            var client = serviceProvider.GetRequiredKeyedService<RestClient>("OrderQueriesClient");
            
            // Debug: Log the base URL to verify correct client
            var baseUrl = client.Options?.BaseUrl?.ToString() ?? "Unknown";
            
            // Create RestSharp request
            var request = new RestRequest($"/orderstatus", Method.Get);
            // Add query parameters
            request.AddQueryParameter("orderDetailId", orderDetailId.ToString());
            
            // Execute the request and get response
            using var jsonDocument = await client.ExecuteAndGetJsonAsync(request);
            var jsonElement = jsonDocument.RootElement;
            
            // Parse the response using CurrentOrderStatusResponse model
            var responseData = jsonElement.GetProperty("response");

            var statusResponse = new CurrentOrderStatusResponse
            {
                OrderDetailId = responseData.TryGetProperty("orderDetailId", out var detailId)
                    ? detailId.GetInt64()
                    : orderDetailId,
                OrderStatusId = responseData.TryGetProperty("orderStatusId", out var statusId)
                    ? statusId.GetInt64()
                    : 0,
                OrderStatusName = responseData.TryGetProperty("orderStatusName", out var statusName) && statusName.ValueKind != JsonValueKind.Null
                    ? statusName.GetString() ?? string.Empty
                    : string.Empty
            };

            // Format the response
            var result = new System.Text.StringBuilder();
            result.AppendLine($"📋 Order Status Information");
            result.AppendLine($"─────────────────────────────────────");
            result.AppendLine($"Order Detail ID: {statusResponse.OrderDetailId}");
            result.AppendLine($"Status ID: {statusResponse.OrderStatusId}");
            result.AppendLine($"Status Name: {statusResponse.OrderStatusName}");
            result.AppendLine($"Debug: Base URL used: {baseUrl}");

            return result.ToString();
        }
        catch (Exception ex)
        {
            return $"❌ Error retrieving status for Order Detail ID {orderDetailId}: {ex.Message}\n\nStack Trace:\n{ex.StackTrace}";
        }
    }
}