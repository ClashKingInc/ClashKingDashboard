/** Authentication API client backed by the shared endpoint contracts. */

import {
  AuthForgotPasswordEndpoint,
  AuthMeEndpoint,
  AuthRegisterEndpoint,
  AuthResendVerificationEndpoint,
  AuthWebDiscordEndpoint,
  AuthWebEmailEndpoint,
  AuthWebLogoutEndpoint,
  AuthWebRefreshEndpoint,
  AuthWebResetPasswordEndpoint,
  AuthWebVerifyEmailEndpoint,
} from "@clashking/api-contracts";

import { BaseApiClient } from "../core/base-client";
import type { ApiResponse } from "../types/common";
import type {
  AuthResponse,
  DiscordAuthRequest,
  EmailAuthRequest,
  EmailRegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  UserInfo,
} from "../types/auth";

const emptyRequest = { path: {}, query: {}, body: {} } as const;

export class AuthClient extends BaseApiClient {
  async verifyEmailCode(email: string, code: string): Promise<ApiResponse<AuthResponse>> {
    return this.executeEndpoint(AuthWebVerifyEmailEndpoint, {
      path: {},
      query: {},
      body: { email, code },
    });
  }

  async getCurrentUser(): Promise<ApiResponse<UserInfo>> {
    return this.executeEndpoint(AuthMeEndpoint, emptyRequest);
  }

  async authenticateWithDiscord(data: DiscordAuthRequest): Promise<ApiResponse<AuthResponse>> {
    return this.executeEndpoint(AuthWebDiscordEndpoint, {
      path: {},
      query: {},
      body: data,
    });
  }

  async refreshToken(): Promise<ApiResponse<{ access_token: string }>> {
    return this.executeEndpoint(AuthWebRefreshEndpoint, emptyRequest);
  }

  async registerWithEmail(
    data: EmailRegisterRequest,
  ): Promise<ApiResponse<{ message: string; verification_code?: string }>> {
    return this.executeEndpoint(AuthRegisterEndpoint, {
      path: {},
      query: {},
      body: data,
    });
  }

  async resendVerification(
    email: string,
  ): Promise<ApiResponse<{ message: string; verification_code?: string }>> {
    return this.executeEndpoint(AuthResendVerificationEndpoint, {
      path: {},
      query: {},
      body: { email },
    });
  }

  async loginWithEmail(data: EmailAuthRequest): Promise<ApiResponse<AuthResponse>> {
    return this.executeEndpoint(AuthWebEmailEndpoint, {
      path: {},
      query: {},
      body: data,
    });
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<ApiResponse<{ message: string }>> {
    return this.executeEndpoint(AuthForgotPasswordEndpoint, {
      path: {},
      query: {},
      body: data,
    });
  }

  async resetPassword(data: ResetPasswordRequest): Promise<ApiResponse<AuthResponse>> {
    return this.executeEndpoint(AuthWebResetPasswordEndpoint, {
      path: {},
      query: {},
      body: data,
    });
  }

  async logout(): Promise<ApiResponse<null>> {
    const response = await this.executeEndpoint(AuthWebLogoutEndpoint, emptyRequest);
    if (response.error !== undefined) {
      return { error: response.error, errorData: response.errorData, status: response.status };
    }
    return { data: null, status: response.status };
  }
}
