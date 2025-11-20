import { tool } from "ai";
import { z } from "zod";

const ORDER_QUERIES_API_BASE_URL = process.env.ORDER_QUERIES_API_BASE_URL;
const ORDER_COMMANDS_API_BASE_URL = process.env.ORDER_COMMANDS_API_BASE_URL;
const ORDER_API_TOKEN = process.env.ORDER_API_TOKEN;
const ORDER_ORIGIN_URL = process.env.ORDER_ORIGIN_URL;

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: any;
  queryParams?: Record<string, any>;
}

async function callOrderAPI(
  endpoint: string,
  options: ApiRequestOptions = {},
  useCommandsApi: boolean = false
) {
  const baseUrl = useCommandsApi
    ? ORDER_COMMANDS_API_BASE_URL
    : ORDER_QUERIES_API_BASE_URL;

  if (!baseUrl || !ORDER_API_TOKEN) {
    return {
      error: "Order API configuration is missing. Please check environment variables.",
    };
  }

  const url = new URL(endpoint, baseUrl);

  // Add query parameters if provided
  if (options.queryParams) {
    Object.entries(options.queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${ORDER_API_TOKEN}`,
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

    const response = await fetch(url.toString(), fetchOptions);

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
      error: `Failed to connect to order API: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

// Tool to list/search orders
export const queryOrders = tool({
  description:
    "Search and list orders from the order management system. Use this to find orders by various criteria like customer name, order number, status, or date range.",
  inputSchema: z.object({
    orderNumber: z
      .string()
      .optional()
      .describe("Specific order number to search for"),
    customerId: z.string().optional().describe("Customer ID to filter orders"),
    customerName: z
      .string()
      .optional()
      .describe("Customer name to search for"),
    email: z.string().optional().describe("Customer email to search for"),
    status: z
      .string()
      .optional()
      .describe(
        "Order status filter (e.g., 'Pending', 'Processing', 'Completed', 'Shipped', 'Cancelled')"
      ),
    startDate: z
      .string()
      .optional()
      .describe("Start date for filtering orders (ISO format: YYYY-MM-DD)"),
    endDate: z
      .string()
      .optional()
      .describe("End date for filtering orders (ISO format: YYYY-MM-DD)"),
    pageSize: z
      .number()
      .optional()
      .describe("Number of results per page (default: 20, max: 100)"),
    pageNumber: z.number().optional().describe("Page number (default: 1)"),
  }),
  execute: async (input) => {
    const queryParams: Record<string, any> = {
      pageSize: Math.min(input.pageSize || 20, 100),
      pageNumber: input.pageNumber || 1,
    };

    if (input.orderNumber) queryParams.orderNumber = input.orderNumber;
    if (input.customerId) queryParams.customerId = input.customerId;
    if (input.customerName) queryParams.customerName = input.customerName;
    if (input.email) queryParams.email = input.email;
    if (input.status) queryParams.status = input.status;
    if (input.startDate) queryParams.startDate = input.startDate;
    if (input.endDate) queryParams.endDate = input.endDate;

    // Try common .NET API endpoint patterns
    const result = await callOrderAPI("/Orders", { queryParams });

    if (result.error) {
      return {
        error: result.error,
        message: "Failed to retrieve orders. Please check the search criteria and try again.",
      };
    }

    // Extract and format the response
    const apiResponse = result.data as any;
    if (apiResponse.isSuccess && apiResponse.response) {
      return {
        orders: apiResponse.response.orders || [],
        pagination: {
          totalCount: apiResponse.response.totalCount,
          page: apiResponse.response.page,
          pageSize: apiResponse.response.pageSize,
          totalPages: apiResponse.response.totalPages,
        },
        message: `Found ${apiResponse.response.totalCount} orders (showing page ${apiResponse.response.page} of ${apiResponse.response.totalPages})`,
      };
    }

    return result.data;
  },
});

// Tool to get order details and status
export const getOrderDetails = tool({
  description:
    "Get detailed information and current status of a specific order by its order number or ID. This includes order items, shipping information, payment status, and order history.",
  inputSchema: z.object({
    orderNumber: z
      .string()
      .describe("The order number or order ID to get details for"),
  }),
  execute: async (input) => {
    const result = await callOrderAPI(`/Orders/${input.orderNumber}`);

    if (result.error) {
      return {
        error: result.error,
        message: `Could not find order with number: ${input.orderNumber}`,
      };
    }

    // Extract order details from response
    const apiResponse = result.data as any;
    if (apiResponse.isSuccess && apiResponse.response) {
      return {
        order: apiResponse.response,
        message: `Order details for ${input.orderNumber}`,
      };
    }

    return result.data;
  },
});

// Tool to get order status specifically
export const getOrderStatus = tool({
  description:
    "Get the current status of a specific order. Returns status information like 'Pending', 'Processing', 'Shipped', 'Delivered', or 'Cancelled'.",
  inputSchema: z.object({
    orderNumber: z
      .string()
      .describe("The order number or order ID to check status for"),
  }),
  execute: async (input) => {
    const result = await callOrderAPI(
      `/Orders/${input.orderNumber}/Status`
    );

    if (result.error) {
      // If status endpoint doesn't exist, try getting full details
      const detailsResult = await callOrderAPI(
        `/Orders/${input.orderNumber}`
      );

      if (detailsResult.error) {
        return {
          error: detailsResult.error,
          message: `Could not retrieve status for order: ${input.orderNumber}`,
        };
      }

      // Extract status from full order details
      const apiResponse = detailsResult.data as any;
      if (apiResponse.isSuccess && apiResponse.response) {
        const orderData = apiResponse.response;
        return {
          orderNumber: input.orderNumber,
          status: orderData.status || orderData.orderStatus,
          orderDate: orderData.orderDate,
          statusHistory: orderData.statusHistory || [],
        };
      }
    }

    // Extract status from API response
    const apiResponse = result.data as any;
    if (apiResponse.isSuccess && apiResponse.response) {
      return {
        orderNumber: input.orderNumber,
        status: apiResponse.response.status || apiResponse.response,
      };
    }

    return result.data;
  },
});
