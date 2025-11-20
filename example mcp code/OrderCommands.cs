using ModelContextProtocol.Server;
using System.ComponentModel;
using System.Text.Json;
using RestSharp;
using Microsoft.Extensions.DependencyInjection;

namespace TestMCP;

/// <summary>
/// Request model for updating order status
/// </summary>
public class OrderStatusUpdateModel
{
    public long OrderDetailId { get; set; }
    public long OrderStatus { get; set; }
}

[McpServerToolType]
public static class OrderCommandTools
{
    [McpServerTool, Description("Update the status of an order. This is a command operation that modifies order data.")]
    public static async Task<string> UpdateOrderStatus(
        IServiceProvider serviceProvider,
        [Description("The unique identifier for the order detail")] long orderDetailId,
        [Description("The new status ID to set for the order")] long newStatusId)
    {
        try
        {
            // Manually resolve the keyed service
            var client = serviceProvider.GetRequiredKeyedService<RestClient>("OrderCommandsClient");
            
            // Debug: Log the base URL to verify correct client
            var baseUrl = client.Options?.BaseUrl?.ToString() ?? "Unknown";
            
            // Create RestSharp request
            var request = new RestRequest("/orders/updateorderstatus", Method.Post);
            
            // Add JSON body
            request.AddJsonBody(new OrderStatusUpdateModel
            {
                OrderDetailId = orderDetailId,
                OrderStatus = newStatusId
            });

            // Execute the request and get response
            using var jsonDocument = await client.ExecuteAndGetJsonAsync(request);
            var jsonElement = jsonDocument.RootElement;
            
            // Parse the response - the response is a boolean value directly
            var responseData = jsonElement.GetProperty("response");
            
            // The API returns a boolean directly in the response property
            bool isSuccess = responseData.ValueKind == JsonValueKind.True;

            // Format the response
            var result = new System.Text.StringBuilder();
            result.AppendLine(isSuccess ? "✅ Order Status Updated Successfully" : "❌ Order Status Update Failed");
            result.AppendLine($"─────────────────────────────────────");
            result.AppendLine($"Order Detail ID: {orderDetailId}");
            result.AppendLine($"New Status ID: {newStatusId}");
            result.AppendLine($"Debug: Base URL used: {baseUrl}");

            return result.ToString();
        }
        catch (Exception ex)
        {
            return $"❌ Error updating status for Order Detail ID {orderDetailId}: {ex.Message}\n\nStack Trace:\n{ex.StackTrace}";
        }
    }
}
