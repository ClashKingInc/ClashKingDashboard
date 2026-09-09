import type {
  AuthForgotPasswordEndpoint,
  AuthMeEndpoint,
  AuthRegisterEndpoint,
  AuthWebDiscordEndpoint,
  AuthWebEmailEndpoint,
  AuthWebResetPasswordEndpoint,
  EndpointRequest,
  EndpointResponse,
} from "@clashking/api-contracts";

type WebAuthUser = EndpointResponse<typeof AuthWebDiscordEndpoint>["user"];

/** The optional admin claim is returned to Dashboard sessions but is not yet in AuthMeEndpoint. */
export type UserInfo = WebAuthUser & {
  readonly account_summary?: EndpointResponse<typeof AuthMeEndpoint>["account_summary"];
  readonly is_admin?: boolean;
};

export type AuthResponse = EndpointResponse<typeof AuthWebDiscordEndpoint>;
export type EmailRegisterRequest = EndpointRequest<typeof AuthRegisterEndpoint>["body"];
export type EmailAuthRequest = Extract<
  EndpointRequest<typeof AuthWebEmailEndpoint>["body"],
  { readonly email: string; readonly password: string }
>;
export type ForgotPasswordRequest = EndpointRequest<typeof AuthForgotPasswordEndpoint>["body"];
export type ResetPasswordRequest = Extract<
  EndpointRequest<typeof AuthWebResetPasswordEndpoint>["body"],
  { readonly reset_code: string }
>;
export type DiscordAuthRequest = Extract<
  EndpointRequest<typeof AuthWebDiscordEndpoint>["body"],
  { readonly code: string; readonly code_verifier: string }
>;
