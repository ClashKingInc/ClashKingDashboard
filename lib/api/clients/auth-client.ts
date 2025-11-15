/**
 * Authentication API client
 */

import { BaseApiClient } from '../core/base-client';
import type { ApiResponse } from '../types/common';
import type {
  AuthResponse,
  UserInfo,
  EmailRegisterRequest,
  EmailAuthRequest,
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  DiscordAuthRequest,
  LinkDiscordRequest,
} from '../types/auth';

export class AuthClient extends BaseApiClient {
  /**
   * POST /v2/auth/verify-email-code
   */
  async verifyEmailCode(email: string, code: string): Promise<ApiResponse<AuthResponse>> {
    return this.request('/v2/auth/verify-email-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  /**
   * GET /v2/auth/me
   */
  async getCurrentUser(): Promise<ApiResponse<UserInfo>> {
    return this.request('/v2/auth/me', { method: 'GET' });
  }

  /**
   * POST /v2/auth/discord
   */
  async authenticateWithDiscord(data: DiscordAuthRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request('/v2/auth/discord', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * POST /v2/auth/refresh
   */
  async refreshToken(data: RefreshTokenRequest): Promise<ApiResponse<{ access_token: string }>> {
    return this.request('/v2/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * POST /v2/auth/register
   */
  async registerWithEmail(data: EmailRegisterRequest): Promise<ApiResponse<{ message: string; verification_code?: string }>> {
    return this.request('/v2/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * POST /v2/auth/resend-verification
   */
  async resendVerification(email: string): Promise<ApiResponse<{ message: string; verification_code?: string }>> {
    return this.request('/v2/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /**
   * POST /v2/auth/email
   */
  async loginWithEmail(data: EmailAuthRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request('/v2/auth/email', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * POST /v2/auth/link-discord
   */
  async linkDiscord(data: LinkDiscordRequest): Promise<ApiResponse<{ detail: string }>> {
    return this.request('/v2/auth/link-discord', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * POST /v2/auth/link-email
   */
  async linkEmail(data: EmailRegisterRequest): Promise<ApiResponse<{ detail: string }>> {
    return this.request('/v2/auth/link-email', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * POST /v2/auth/forgot-password
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<ApiResponse<{ message: string }>> {
    return this.request('/v2/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * POST /v2/auth/reset-password
   */
  async resetPassword(data: ResetPasswordRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request('/v2/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}
