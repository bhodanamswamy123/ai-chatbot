using ModelContextProtocol.Server;
using System.ComponentModel;
using System.Text.Json;
using RestSharp;
using Microsoft.Extensions.DependencyInjection;

namespace TestMCP
{
    public class ProductSearchRequest
    {
        public string SearchString { get; set; } = string.Empty;
        public int PageIndex { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class ProductSearchResponse
    {
        public List<ProductDetails> Products { get; set; } = [];
        public int TotalCount { get; set; }
    }

    public class ProductDetails
    {
        public string ProductName { get; set; } = string.Empty;
        public string ProductDescription { get; set; } = string.Empty;
        public string ProductCode { get; set; } = string.Empty;
        public string BrandName { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        public List<ProductSkuDetails> Skus { get; set; } = [];
        public int TotalSkuCount { get; set; }
    }

    public class ProductSkuDetails
    {
        public string SkuCode { get; set; } = string.Empty;
        public string Barcode { get; set; } = string.Empty;
        public string ManufacturerCode { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
    }

    [McpServerToolType]
    public static class ProductQueryTools
    {
        [McpServerTool, Description("Search for products by search string with pagination. Returns product details including SKU information.")]
        public static async Task<string> SearchProducts(
            IServiceProvider serviceProvider,
            [Description("Search string to filter products by name or code")] string searchString = "",
            [Description("Page number for pagination (default: 1)")] int pageIndex = 1,
            [Description("Number of products per page (default: 10, max: 100)")] int pageSize = 10)
        {
            try
            {
                // Manually resolve the keyed service
                var client = serviceProvider.GetRequiredKeyedService<RestClient>("ProductQueriesClient");

                // Debug: Log the base URL to verify correct client
                var baseUrl = client.Options?.BaseUrl?.ToString() ?? "Unknown";

                // Create RestSharp request
                var request = new RestRequest("/products/search", Method.Post);

                // Add JSON body with search parameters
                request.AddJsonBody(new ProductSearchRequest
                {
                    SearchString = searchString,
                    PageIndex = pageIndex,
                    PageSize = Math.Min(pageSize, 100) // Enforce max page size
                });

                // Execute the request and get response
                using var jsonDocument = await client.ExecuteAndGetJsonAsync(request);
                var jsonElement = jsonDocument.RootElement;

                // Parse the response
                var responseData = jsonElement.GetProperty("response");

                var searchResponse = new ProductSearchResponse
                {
                    TotalCount = responseData.TryGetProperty("totalRecords", out var totalCountProp)
                        ? totalCountProp.GetInt32()
                        : 0
                };

                // Parse products array
                if (responseData.TryGetProperty("data", out var productsArray))
                {
                    foreach (var productElement in productsArray.EnumerateArray())
                    {
                        var product = new ProductDetails
                        {
                            ProductName = productElement.TryGetProperty("name", out var productName) && productName.ValueKind != JsonValueKind.Null
                                ? productName.GetString() ?? string.Empty
                                : string.Empty,
                            ProductDescription = productElement.TryGetProperty("description", out var productDesc) && productDesc.ValueKind != JsonValueKind.Null
                                ? productDesc.GetString() ?? string.Empty
                                : string.Empty,
                            ProductCode = productElement.TryGetProperty("code", out var productCode) && productCode.ValueKind != JsonValueKind.Null
                                ? productCode.GetString() ?? string.Empty
                                : string.Empty,
                            BrandName = productElement.TryGetProperty("brandName", out var brandName) && brandName.ValueKind != JsonValueKind.Null
                                ? brandName.GetString() ?? string.Empty
                                : string.Empty,
                            ImageUrl = productElement.TryGetProperty("imageTag", out var imageUrl) && imageUrl.ValueKind != JsonValueKind.Null
                                ? imageUrl.GetString() ?? string.Empty
                                : string.Empty,
                            TotalSkuCount = productElement.TryGetProperty("totalSkuCount", out var skuCount)
                                ? skuCount.GetInt32()
                                : 0
                        };

                        // Parse SKUs array
                        if (productElement.TryGetProperty("skus", out var skusArray) && skusArray.ValueKind != JsonValueKind.Null && skusArray.ValueKind != JsonValueKind.Undefined)
                        {
                            foreach (var skuElement in skusArray.EnumerateArray())
                            {
                                var sku = new ProductSkuDetails
                                {
                                    SkuCode = skuElement.TryGetProperty("skuCode", out var skuCode) && skuCode.ValueKind != JsonValueKind.Null
                                        ? skuCode.GetString() ?? string.Empty
                                        : string.Empty,
                                    Barcode = skuElement.TryGetProperty("barcode", out var barcode) && barcode.ValueKind != JsonValueKind.Null
                                        ? barcode.GetString() ?? string.Empty
                                        : string.Empty,
                                    ManufacturerCode = skuElement.TryGetProperty("manufacturerCode", out var mfgCode) && mfgCode.ValueKind != JsonValueKind.Null
                                        ? mfgCode.GetString() ?? string.Empty
                                        : string.Empty,
                                    ImageUrl = skuElement.TryGetProperty("imageUrl", out var skuImageUrl) && skuImageUrl.ValueKind != JsonValueKind.Null
                                        ? skuImageUrl.GetString() ?? string.Empty
                                        : string.Empty
                                };

                                product.Skus.Add(sku);
                            }
                        }

                        searchResponse.Products.Add(product);
                    }
                }

                // Format the response as a readable string
                var result = new System.Text.StringBuilder();
                result.AppendLine($"🔍 Product Search Results");
                result.AppendLine($"Search: \"{searchString}\" | Page {pageIndex} | Page Size: {pageSize}");
                result.AppendLine($"Total Products Found: {searchResponse.TotalCount}");
                result.AppendLine($"─────────────────────────────────────");
                result.AppendLine();

                if (searchResponse.Products.Count == 0)
                {
                    result.AppendLine("No products found matching the search criteria.");
                }
                else
                {
                    foreach (var product in searchResponse.Products)
                    {
                        result.AppendLine($"📦 Product: {product.ProductName}");
                        result.AppendLine($"   Code: {product.ProductCode}");
                        result.AppendLine($"   Brand: {product.BrandName}");
                        if (!string.IsNullOrEmpty(product.ProductDescription))
                        {
                            result.AppendLine($"   Description: {product.ProductDescription}");
                        }
                        if (!string.IsNullOrEmpty(product.ImageUrl))
                        {
                            result.AppendLine($"   Image: {product.ImageUrl}");
                        }
                        result.AppendLine($"   Total SKUs: {product.TotalSkuCount}");

                        if (product.Skus.Count > 0)
                        {
                            result.AppendLine($"   SKUs ({product.Skus.Count} shown):");
                            foreach (var sku in product.Skus)
                            {
                                result.AppendLine($"      • SKU: {sku.SkuCode}");
                                if (!string.IsNullOrEmpty(sku.Barcode))
                                {
                                    result.AppendLine($"        Barcode: {sku.Barcode}");
                                }
                                if (!string.IsNullOrEmpty(sku.ManufacturerCode))
                                {
                                    result.AppendLine($"        Mfg Code: {sku.ManufacturerCode}");
                                }
                                if (!string.IsNullOrEmpty(sku.ImageUrl))
                                {
                                    result.AppendLine($"        Image: {sku.ImageUrl}");
                                }
                            }
                        }

                        result.AppendLine();
                    }
                }

                return result.ToString();
            }
            catch (Exception ex)
            {
                return $"❌ Error searching products: {ex.Message}\n\nStack Trace:\n{ex.StackTrace}";
            }
        }
    }
}
