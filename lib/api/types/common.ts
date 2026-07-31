/**
 * Common types and interfaces used across the API
 */

export interface ApiConfig {
  baseUrl: string;
  accessToken?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  errorData?: unknown;
  status: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total?: number;
  page?: number;
  limit?: number;
}
