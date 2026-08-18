"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2, UserRound } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { RosterQuestionType, RosterSignupQuestion } from "@/lib/api/types/roster";

interface SignupQuestionsEditorProps {
  readonly questions: RosterSignupQuestion[];
  readonly onChange: (questions: RosterSignupQuestion[]) => void;
}

function questionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `question-${Date.now()}`;
}

function createQuestion(order: number): RosterSignupQuestion {
  return {
    id: questionId(),
    label: "",
    type: "text",
    required: false,
    order,
  };
}

export function SignupQuestionsEditor({ questions, onChange }: SignupQuestionsEditorProps) {
  const [pendingRemoval, setPendingRemoval] = useState<RosterSignupQuestion>();

  const update = (id: string, patch: Partial<RosterSignupQuestion>) => {
    onChange(
      questions.map((question) =>
        question.id === id ? { ...question, ...patch } : question,
      ),
    );
  };

  const remove = () => {
    if (!pendingRemoval) return;
    onChange(
      questions
        .filter((question) => question.id !== pendingRemoval.id)
        .map((question, order) => ({ ...question, order })),
    );
    setPendingRemoval(undefined);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">Signup form</p>
            <Badge variant="outline">Discord modal</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            The account selector always uses the first slot. Configure up to four additional questions.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={questions.length >= 4}
          onClick={() => onChange([...questions, createQuestion(questions.length)])}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add question
        </Button>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <UserRound className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">Clash account</p>
          <p className="text-xs text-muted-foreground">Required account dropdown · fixed first component</p>
        </div>
        <Badge className="ml-auto">Required</Badge>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground">
          No extra questions. Signup will only ask the member to choose an account.
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((question, index) => (
            <div key={question.id} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-4 flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Badge variant="secondary">Question {index + 1}</Badge>
                <span className="truncate font-mono text-[10px] text-muted-foreground">{question.id}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="ml-auto h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label={`Delete question ${index + 1}`}
                  onClick={() => setPendingRemoval(question)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`question-label-${question.id}`}>Question</Label>
                  <Input
                    id={`question-label-${question.id}`}
                    value={question.label}
                    maxLength={45}
                    placeholder="Do you want to be a sub?"
                    onChange={(event) => update(question.id, { label: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Answer type</Label>
                  <Select
                    value={question.type}
                    onValueChange={(type: RosterQuestionType) =>
                      update(question.id, {
                        type,
						options: type === "single_select"
                          ? (question.options ?? ["Option 1", "Option 2"])
                          : undefined,
                      })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="boolean">Yes / No</SelectItem>
                      <SelectItem value="single_select">Dropdown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

			  {question.type === "single_select" && (
                <div className="mt-4 space-y-1.5">
                  <Label htmlFor={`question-options-${question.id}`}>Dropdown options</Label>
                  <Input
                    id={`question-options-${question.id}`}
                    value={(question.options ?? []).join(", ")}
                    placeholder="Clan A, Clan B, No preference"
                    onChange={(event) =>
                      update(question.id, {
                        options: event.target.value
                          .split(",")
                          .map((option) => option.trim())
                          .filter(Boolean)
                          .slice(0, 25),
                      })
                    }
                  />
                </div>
              )}

			  <div className="mt-4 flex justify-end">
                <div className="flex items-center gap-2 pb-2">
                  <Switch
                    id={`question-required-${question.id}`}
                    checked={question.required}
                    onCheckedChange={(required) => update(question.id, { required })}
                  />
                  <Label htmlFor={`question-required-${question.id}`}>Required</Label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={Boolean(pendingRemoval)} onOpenChange={(open) => !open && setPendingRemoval(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this signup question?</AlertDialogTitle>
            <AlertDialogDescription>
              Saving this change will permanently remove this question and its existing answers from every member on this roster.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep question</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Delete question and answers</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
