"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import Image from "@/components/app-image";
import { townHallImageUrl } from "@/lib/clash-asset-urls";

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
import { hasInvalidDropdownOptions } from "../_lib/signup-questions";

interface SignupQuestionsEditorProps {
  readonly questions: RosterSignupQuestion[];
  readonly onChange: (questions: RosterSignupQuestion[]) => void;
  readonly clans?: readonly { name: string; tag: string }[];
  readonly context?: "roster" | "ticket";
  readonly accountEnabled?: boolean;
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
    options: [],
    order,
  };
}

export function SignupQuestionsEditor({ questions, onChange, clans = [], context = "roster", accountEnabled = true }: SignupQuestionsEditorProps) {
  const isTicket = context === "ticket";
  const maxQuestions = isTicket && !accountEnabled ? 5 : 4;
  const inputClass = isTicket ? "rounded-xl border-0 bg-muted/55 shadow-sm shadow-black/5" : undefined;
  const [pendingRemoval, setPendingRemoval] = useState<RosterSignupQuestion>();
  const [dragged, setDragged] = useState<string>();
  const move = (from: number, to: number) => {
    if (from < 0 || to < 0 || to >= questions.length) return;
    const reordered = [...questions]; const [item] = reordered.splice(from, 1);
    reordered.splice(to, 0, item); onChange(reordered.map((question, order) => ({ ...question, order })));
  };

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
            <p className="text-sm font-semibold">{isTicket ? "Application form" : "Signup form"}</p>
            <Badge variant="secondary" className={isTicket ? "border-0" : undefined}>Discord modal</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {accountEnabled ? "The account selector uses the first modal slot. Add up to four questions." : "Add up to five questions to the modal."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">{(!isTicket || clans.length > 0) && <Button type="button" size="sm" variant="secondary" disabled={questions.length >= maxQuestions || clans.length === 0 || clans.length > 25}
          title={clans.length > 25 ? "Choose up to 25 clans using dropdown options" : "Adds the server's current family clans as editable options"}
          onClick={() => onChange([...questions, { ...createQuestion(questions.length), label: "Which clan would you like to join?", type: "single_select", options: clans.map(clan => `${clan.name} (${clan.tag})`.slice(0, 100)) }])}>Family clans</Button>}<Button
          type="button"
          size="sm"
          variant={isTicket ? "secondary" : "outline"}
          disabled={questions.length >= maxQuestions}
          onClick={() => onChange([...questions, createQuestion(questions.length)])}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add question
        </Button></div>
      </div>

      {accountEnabled && <div className="flex items-center gap-3 rounded-xl bg-muted/35 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Image src={townHallImageUrl(18)} alt="" width={32} height={32} />
        </div>
        <div>
          <p className="text-sm font-medium">Clash account</p>
          <p className="text-xs text-muted-foreground">Choose a linked account</p>
        </div>
        <Badge className="ml-auto">Required</Badge>
      </div>}

      {questions.length === 0 ? (
        <div className="rounded-xl bg-muted/25 px-6 py-6 text-center text-sm text-muted-foreground">
          {accountEnabled ? "No extra questions. Members only choose their account." : "No questions configured."}
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((question, index) => (
            <div key={question.id} className="rounded-2xl bg-muted/35 p-4" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); move(questions.findIndex(item => item.id === dragged), index); setDragged(undefined); }}>
              <div className="mb-4 flex items-center gap-2">
                <button type="button" draggable aria-label={`Move question ${index + 1}`} className="cursor-grab rounded p-1 text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" onDragStart={event => { setDragged(question.id); event.dataTransfer.setData("text/plain", question.id); }} onDragEnd={() => setDragged(undefined)} onKeyDown={event => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); move(index, index + (event.key === "ArrowUp" ? -1 : 1)); } }}><GripVertical className="h-4 w-4" /></button>
                <Badge variant="secondary">Question {index + 1}</Badge>
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
                    className={inputClass}
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
                          ? (question.options?.length ? question.options : ["Option 1", "Option 2"])
                          : [],
                      })
                    }
                  >
                    <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
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
                  {(question.options ?? []).map((option, optionIndex) => <div key={optionIndex} className="flex items-center gap-2">
                    <Input className={inputClass} aria-label={`Question ${index + 1} option ${optionIndex + 1}`} value={option} maxLength={100} onChange={event => update(question.id, { options: question.options!.map((value, i) => i === optionIndex ? event.target.value : value) })} />
                    <Button type="button" variant="ghost" size="icon" aria-label={`Remove option ${optionIndex + 1}`} onClick={() => update(question.id, { options: question.options!.filter((_, i) => i !== optionIndex) })}><Trash2 className="h-4 w-4" /></Button>
                  </div>)}
                  <Button type="button" variant="secondary" size="sm" disabled={(question.options?.length ?? 0) >= 25} onClick={() => update(question.id, { options: [...(question.options ?? []), ""] })}>Add option ({question.options?.length ?? 0}/25)</Button>
                  {hasInvalidDropdownOptions([question]) && <p role="alert" className="text-xs text-destructive">Enter text for every dropdown option before saving.</p>}
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
            <AlertDialogTitle>Delete this {isTicket ? "application" : "signup"} question?</AlertDialogTitle>
            <AlertDialogDescription>
              {isTicket ? "This changes future applications. Existing ticket answers are kept." : "Saving question changes will clear all existing answers from every member on this roster. You will be asked to confirm when saving."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep question</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>{isTicket ? "Delete question" : "Delete question and answers"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
