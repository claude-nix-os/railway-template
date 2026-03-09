import type {
  Memory,
  MemoryGraph,
  AddMemoryRequest,
  SearchMemoriesRequest,
  ApiError,
} from '../types';

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_SEARCH_LIMIT = 10;

/* ------------------------------------------------------------------ */
/*  API Client Options                                                 */
/* ------------------------------------------------------------------ */

export interface MemoryApiClientOptions {
  /** Base URL of the Mem0 API (e.g., http://localhost:8000) */
  baseUrl: string;

  /** Authentication token for Bearer token auth */
  authToken: string;

  /** Optional request timeout in milliseconds */
  timeout?: number;
}

/* ------------------------------------------------------------------ */
/*  Memory API Client                                                  */
/* ------------------------------------------------------------------ */

/**
 * HTTP client for interacting with the Mem0 memory backend
 *
 * Provides methods for:
 * - Fetching memory graphs and individual memories
 * - Adding new memories
 * - Searching through memories
 * - Deleting memories
 *
 * Uses fetch API with Bearer token authentication.
 */
export class MemoryApiClient {
  private baseUrl: string;
  private authToken: string;
  private timeout: number;

  constructor(options: MemoryApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.authToken = options.authToken;
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
  }

  /* ------------------------------------------------------------------ */
  /*  Configuration Management                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Update the authentication token
   *
   * @param token New authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Update the base URL
   *
   * @param url New base URL
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, '');
  }

  /* ------------------------------------------------------------------ */
  /*  Memory Graph Operations                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Fetch the complete memory graph for a user
   *
   * @param userId User ID to fetch graph for
   * @returns Promise resolving to the memory graph
   * @throws Error if the request fails
   */
  async fetchGraph(userId: string): Promise<MemoryGraph> {
    const url = `${this.baseUrl}/api/memories/graph`;
    const params = new URLSearchParams({ user_id: userId });

    return this.makeRequest<MemoryGraph>(`${url}?${params}`);
  }

  /* ------------------------------------------------------------------ */
  /*  Memory List Operations                                             */
  /* ------------------------------------------------------------------ */

  /**
   * Fetch all memories for a user
   *
   * @param userId User ID to fetch memories for
   * @returns Promise resolving to array of memories
   * @throws Error if the request fails
   */
  async fetchAll(userId: string): Promise<Memory[]> {
    const url = `${this.baseUrl}/api/memories`;
    const params = new URLSearchParams({ user_id: userId });

    return this.makeRequest<Memory[]>(`${url}?${params}`);
  }

  /* ------------------------------------------------------------------ */
  /*  Memory Creation                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * Add a new memory
   *
   * @param text Memory text content
   * @param userId User ID to associate with the memory
   * @param metadata Optional metadata
   * @returns Promise resolving to the created memory
   * @throws Error if the request fails
   */
  async addMemory(
    text: string,
    userId: string,
    metadata?: Record<string, unknown>
  ): Promise<Memory> {
    const url = `${this.baseUrl}/api/memories`;
    const payload: AddMemoryRequest = {
      text,
      user_id: userId,
      metadata,
    };

    return this.makeRequest<Memory>(url, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Memory Search                                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Search memories using a query string
   *
   * @param query Search query
   * @param userId User ID to filter results
   * @param limit Optional limit on number of results (default: 10)
   * @returns Promise resolving to array of matching memories
   * @throws Error if the request fails
   */
  async searchMemories(
    query: string,
    userId: string,
    limit?: number
  ): Promise<Memory[]> {
    const url = `${this.baseUrl}/api/memories/search`;
    const payload: SearchMemoriesRequest = {
      query,
      user_id: userId,
      limit: limit || DEFAULT_SEARCH_LIMIT,
    };

    return this.makeRequest<Memory[]>(url, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Memory Deletion                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * Delete a memory by ID
   *
   * @param id Memory ID to delete
   * @throws Error if the request fails
   */
  async deleteMemory(id: string): Promise<void> {
    const url = `${this.baseUrl}/api/memories/${id}`;

    await this.makeRequest<void>(url, {
      method: 'DELETE',
    });
  }

  /* ------------------------------------------------------------------ */
  /*  HTTP Request Handler                                               */
  /* ------------------------------------------------------------------ */

  /**
   * Make an HTTP request to the API
   *
   * @param url Request URL
   * @param options Fetch options
   * @returns Promise resolving to the parsed response data
   * @throws Error if the request fails or times out
   */
  private async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Merge default headers with custom options
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.authToken}`,
        ...options.headers,
      };

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-2xx responses
      if (!response.ok) {
        const errorBody = await this.parseErrorResponse(response);
        throw new Error(
          errorBody.message ||
            `HTTP ${response.status}: ${response.statusText}`
        );
      }

      // Handle 204 No Content (e.g., for DELETE)
      if (response.status === 204) {
        return undefined as T;
      }

      // Parse and return JSON response
      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        // Handle fetch abort (timeout)
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.timeout}ms`);
        }

        // Re-throw other errors
        throw error;
      }

      // Handle unknown errors
      throw new Error('An unknown error occurred');
    }
  }

  /**
   * Parse error response from the API
   *
   * @param response Fetch response object
   * @returns Parsed error object
   */
  private async parseErrorResponse(response: Response): Promise<ApiError> {
    try {
      const errorData = await response.json();
      return errorData as ApiError;
    } catch {
      return {
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Health Check                                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Check if the API is reachable and healthy
   *
   * @returns Promise resolving to true if healthy, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/health`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
