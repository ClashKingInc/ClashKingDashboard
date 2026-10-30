// Reserve the last model step for an answer, even after failed tool attempts.
export const assistantStepLimit = 4;
export function completionStep(stepNumber: number): { toolChoice: "none" } | undefined {
  return stepNumber >= assistantStepLimit - 1 ? { toolChoice: "none" } : undefined;
}

export function emptyResponseMessage(text: string, hasArtifact: boolean, error?: string): string | undefined {
  if (text.trim() || hasArtifact) return undefined;
  return error
    ? `I couldn't complete this request because a roster tool failed: ${error}. Please try again.`
    : "The assistant finished without returning an answer. Please try again.";
}
