import { tool } from "ai";
import { z } from "zod";

const ORDER_QUERIES_API_BASE_URL = process.env.ORDER_QUERIES_API_BASE_URL;
const ORDER_COMMANDS_API_BASE_URL = process.env.ORDER_COMMANDS_API_BASE_URL;
const ORDER_API_TOKEN = process.env.ORDER_API_TOKEN;
const ORDER_ORIGIN_URL = process.env.ORDER_ORIGIN_URL;

// Order status code mapping
const ORDER_STATUS_CODES = {
  Draft: 1,
  AwaitingApproval: 2,
  ApprovalRejected: 3,
  New: 4,
  InReview: 5,
  Processing: 6,
  InProgress: 7,
  WaitingForDropshipment: 8,
  WaitingForAcknowledgment: 9,
  WaitingForShipment: 10,
  PartiallyShipped: 11,
  Shipped: 12,
  Delivered: 13,
  Completed: 14,
  Canceled: 15,
  Returned: 16,
  PartiallyReturned: 17,
  CancellationRequested: 18,
} as const;

// Reverse mapping for status code to name
const STATUS_CODE_TO_NAME = Object.entries(ORDER_STATUS_CODES).reduce(
  (acc, [name, code]) => {
    acc[code] = name;
    return acc;
  },
  {} as Record<number, string>
);

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
    "Get detailed information and current status of a specific order by its order number. This includes order detail ID, items, shipping information, payment status, and order history.",
  inputSchema: z.object({
    orderNumber: z
      .string()
      .describe("The order number to get details for (e.g., 'ORD12', 'ORD15')"),
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
      const orderData = apiResponse.response;
      return {
        orderNumber: input.orderNumber,
        orderDetailId: orderData.orderDetailId || orderData.id,
        status: orderData.status || orderData.orderStatus,
        orderDate: orderData.orderDate,
        customer: orderData.customerName || orderData.customer,
        total: orderData.total || orderData.orderTotal,
        itemCount: orderData.itemCount || orderData.items?.length,
        fullDetails: orderData,
        message: `Order details for ${input.orderNumber} (Detail ID: ${orderData.orderDetailId || orderData.id})`,
      };
    }

    return result.data;
  },
});

// Tool to get order status specifically
export const getOrderStatus = tool({
  description:
    "Get the current status of a specific order by order number. Returns status information and the order detail ID needed for updates.",
  inputSchema: z.object({
    orderNumber: z
      .string()
      .describe("The order number to check status for (e.g., 'ORD12', 'ORD15')"),
  }),
  execute: async (input) => {
    // Get the full order details to extract status and orderDetailId
    const result = await callOrderAPI(`/Orders/${input.orderNumber}`);

    if (result.error) {
      return {
        error: result.error,
        message: `Could not retrieve status for order: ${input.orderNumber}`,
      };
    }

    // Extract status from order details
    const apiResponse = result.data as any;
    if (apiResponse.isSuccess && apiResponse.response) {
      const orderData = apiResponse.response;
      return {
        orderNumber: input.orderNumber,
        orderDetailId: orderData.orderDetailId || orderData.id,
        status: orderData.status || orderData.orderStatus || "Unknown",
        statusCode: orderData.statusCode,
        orderDate: orderData.orderDate,
        customer: orderData.customerName || orderData.customer,
        total: orderData.total || orderData.orderTotal,
        itemCount: orderData.itemCount || orderData.items?.length,
        message: `Order ${input.orderNumber} status: ${orderData.status || orderData.orderStatus} (Detail ID: ${orderData.orderDetailId || orderData.id})`,
      };
    }

    return {
      error: "Unexpected response format",
      message: `Could not parse status for order: ${input.orderNumber}`,
    };
  },
});

// Tool to update order status
export const updateOrderStatus = tool({
  description:
    "Update the status of an order using its order detail ID. You must first get the order details to obtain the orderDetailId, then use it to update the status.",
  inputSchema: z.object({
    orderDetailId: z
      .string()
      .describe("The order detail ID (obtained from getOrderStatus or getOrderDetails)"),
    status: z
      .string()
      .describe(
        "The new status name (e.g., 'Processing', 'Shipped', 'Delivered', 'Canceled', 'CancellationRequested')"
      ),
  }),
  execute: async (input) => {
    // Convert status name to status code
    let statusCode: number | undefined;

    // Check if input is a status name
    const statusName = input.status.replace(/\s+/g, ""); // Remove spaces
    const matchingStatus = Object.keys(ORDER_STATUS_CODES).find(
      (key) => key.toLowerCase() === statusName.toLowerCase()
    );

    if (matchingStatus) {
      statusCode =
        ORDER_STATUS_CODES[matchingStatus as keyof typeof ORDER_STATUS_CODES];
    } else {
      // Try parsing as a number
      const parsedCode = parseInt(input.status);
      if (!isNaN(parsedCode) && parsedCode >= 1 && parsedCode <= 18) {
        statusCode = parsedCode;
      }
    }

    if (!statusCode) {
      return {
        error: `Invalid status: ${input.status}`,
        message: `Please use one of: ${Object.keys(ORDER_STATUS_CODES).join(", ")}`,
        availableStatuses: Object.entries(ORDER_STATUS_CODES).map(
          ([name, code]) => ({
            code,
            name,
          })
        ),
      };
    }

    // Call the commands API to update status using orderDetailId
    const result = await callOrderAPI(
      `/Orders/${input.orderDetailId}/Status`,
      {
        method: "PUT",
        body: {
          statusCode: statusCode,
        },
      },
      true // Use commands API
    );

    if (result.error) {
      return {
        error: result.error,
        message: `Failed to update status for order detail ID ${input.orderDetailId}. Make sure you're using the orderDetailId (not orderNumber).`,
      };
    }

    const apiResponse = result.data as any;
    if (apiResponse.isSuccess) {
      return {
        success: true,
        orderDetailId: input.orderDetailId,
        newStatus: STATUS_CODE_TO_NAME[statusCode],
        statusCode: statusCode,
        message: `Order (Detail ID: ${input.orderDetailId}) status updated to ${STATUS_CODE_TO_NAME[statusCode]} (code: ${statusCode})`,
      };
    }

    return {
      error: "Failed to update status",
      message: `Could not update status for order detail ID ${input.orderDetailId}`,
      response: apiResponse,
    };
  },
});
