import { tool } from "ai";
import { z } from "zod";

const PRODUCT_QUERIES_API_BASE_URL = process.env.PRODUCT_QUERIES_API_BASE_URL;
const API_TOKEN = process.env.API_TOKEN;
const ORDER_ORIGIN_URL = process.env.ORDER_ORIGIN_URL;

interface ProductSkuDetails {
  skuCode: string;
  barcode: string;
  manufacturerCode: string;
  imageUrl: string;
}

interface ProductDetails {
  productName: string;
  productDescription: string;
  productCode: string;
  brandName: string;
  imageUrl: string;
  skus: ProductSkuDetails[];
  totalSkuCount: number;
}

interface ProductSearchResponse {
  products: ProductDetails[];
  totalCount: number;
}

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: any;
  queryParams?: Record<string, any>;
}

async function callProductAPI(
  endpoint: string,
  options: ApiRequestOptions = {}
) {
  if (!PRODUCT_QUERIES_API_BASE_URL || !API_TOKEN) {
    return {
      error: "Product API configuration is missing. Please check environment variables (PRODUCT_QUERIES_API_BASE_URL, API_TOKEN).",
    };
  }

  const url = new URL(endpoint, PRODUCT_QUERIES_API_BASE_URL);

  // Add query parameters if provided
  if (options.queryParams) {
    Object.entries(options.queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${API_TOKEN}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "AI-Chatbot/1.0",
  };

  if (ORDER_ORIGIN_URL) {
    headers.Origin = ORDER_ORIGIN_URL;
    headers.Referer = ORDER_ORIGIN_URL;
  }

  try {
    const fetchOptions: RequestInit = {
      method: options.method || "GET",
      headers,
    };

    if (options.body && (options.method === "POST" || options.method === "PUT")) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    console.log(`[Product API] Calling: ${url.toString()}`);
    console.log(`[Product API] Method: ${fetchOptions.method}`);
    console.log(`[Product API] Body:`, options.body);

    const response = await fetch(url.toString(), fetchOptions);

    console.log(`[Product API] Response status: ${response.status}`);

    if (!response.ok) {
      let errorMessage = `API request failed with status ${response.status}`;
      try {
        const responseText = await response.text();

        // Try to parse as JSON
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // Not JSON, use text as-is
          errorMessage = responseText || errorMessage;
        }
      } catch (e) {
        // Could not read error response
        errorMessage = `${errorMessage} (Could not read error details)`;
      }

      return {
        error: errorMessage,
        status: response.status,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      error: `Failed to connect to product API: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

// Tool to search products
export const searchProducts = tool({
  description:
    "Search for products by search string with pagination. Returns product details including name, description, code, brand, images, and SKU information (SKU codes, barcodes, manufacturer codes).",
  inputSchema: z.object({
    searchString: z
      .string()
      .optional()
      .describe("Search string to filter products by name or code (leave empty to get all products)"),
    pageIndex: z
      .number()
      .optional()
      .describe("Page number for pagination (default: 1)"),
    pageSize: z
      .number()
      .optional()
      .describe("Number of products per page (default: 10, max: 100)"),
  }),
  execute: async (input) => {
    const requestBody = {
      SearchString: input.searchString || "",
      PageIndex: input.pageIndex || 1,
      PageSize: Math.min(input.pageSize || 10, 100), // Enforce max page size
    };

    const result = await callProductAPI("/products/search", {
      method: "POST",
      body: requestBody,
    });

    if (result.error) {
      return {
        error: result.error,
        message: "Failed to search products. Please check the search criteria and try again.",
      };
    }

    // Parse the API response
    const apiResponse = result.data as any;

    console.log('[Product Tool] Full API Response:', JSON.stringify(apiResponse, null, 2));

    if (!apiResponse.response) {
      console.log('[Product Tool] ERROR: Missing response property');
      return {
        error: "Unexpected response format",
        message: "Could not parse product search results. The API did not return data in the expected format.",
      };
    }

    const responseData = apiResponse.response;
    const totalCount = responseData.totalRecords || 0;
    const productsData = responseData.data || [];

    const products: ProductDetails[] = productsData.map((productElement: any) => {
      const product: ProductDetails = {
        productName: productElement.name || "",
        productDescription: productElement.description || "",
        productCode: productElement.code || "",
        brandName: productElement.brandName || "",
        imageUrl: productElement.imageTag || "",
        totalSkuCount: productElement.totalSkuCount || 0,
        skus: [],
      };

      // Parse SKUs if available
      if (productElement.skus && Array.isArray(productElement.skus)) {
        product.skus = productElement.skus.map((skuElement: any) => ({
          skuCode: skuElement.skuCode || "",
          barcode: skuElement.barcode || "",
          manufacturerCode: skuElement.manufacturerCode || "",
          imageUrl: skuElement.imageUrl || "",
        }));
      }

      return product;
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / (input.pageSize || 10));

    const toolResult = {
      products,
      pagination: {
        totalCount,
        pageIndex: input.pageIndex || 1,
        pageSize: input.pageSize || 10,
        totalPages,
        productsOnPage: products.length,
      },
      searchCriteria: {
        searchString: input.searchString || "(all products)",
      },
      message: `Found ${totalCount} products (showing page ${input.pageIndex || 1} of ${totalPages})`,
    };

    console.log('[Product Tool] Returning result:', JSON.stringify(toolResult, null, 2));

    return toolResult;
  },
});
