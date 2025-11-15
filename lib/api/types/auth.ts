/**
 * Authentication-related types
 */

export interface UserInfo {
  user_id: string;
  username: string;
  avatar_url: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: UserInfo;
}

export interface EmailRegisterRequest {
  email: string;
  password: string;
  username: string;
  device_id?: string;
}

export interface EmailAuthRequest {
  email: string;
  password: string;
  device_id?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
  device_id?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  reset_code: string;
  new_password: string;
  device_id?: string;
}

export interface DiscordAuthRequest {
  code: string;
  code_verifier: string;
  device_id?: string;
  device_name?: string;
  redirect_uri?: string;
}

export interface LinkDiscordRequest {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  device_id?: string;
  device_name?: string;
}
