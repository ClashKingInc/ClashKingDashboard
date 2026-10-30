import type { RosterSignupQuestion } from "@/lib/api/types/roster";

export function hasInvalidDropdownOptions(questions: readonly RosterSignupQuestion[]): boolean {
  return questions.some((question) => question.type === "single_select"
    && (!question.options?.length || question.options.some((option) => option.trim().length === 0)));
}
