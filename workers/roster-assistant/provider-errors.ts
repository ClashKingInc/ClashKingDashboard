import { AssistantApiError } from "./api-client";

export function assistantErrorMessage(error: unknown): string {
  if (error instanceof AssistantApiError) return error.message;
  const value = error as { statusCode?: number; message?: string } | null;
  if (value?.statusCode === 429 && /credits|quota|billing/i.test(value.message ?? "")) {
    return "The AI service is out of provider credits. Please contact ClashKing support.";
  }
  if (value?.statusCode === 429) return "The AI service is busy. Please try again shortly.";
  return "The AI service could not complete this request. Please try again shortly.";
}

export function logAssistantFailure(requestId: string, error: unknown): void {
  const value = error as { name?: string; statusCode?: number } | null;
  // Provider errors can contain the full prompt, request headers and response.
  // Log only classification, never serialize the error object or request body.
  console.error(JSON.stringify({ event: "roster_provider_failed", requestId,
    name: value?.name ?? "Error", status: value?.statusCode,
    message: assistantErrorMessage(error) }));
}
