import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { RosterSignupQuestion } from "@/lib/api/types/roster";
import { SignupQuestionsEditor } from "./SignupQuestionsEditor";

const question: RosterSignupQuestion = {
  id: "sub-question",
  label: "Do you want to be a sub?",
  type: "boolean",
  required: false,
  order: 0,
};

describe("SignupQuestionsEditor", () => {
  it("hides question IDs and permits keyboard reordering from the drag handle", () => {
    const onChange = vi.fn();
    render(<SignupQuestionsEditor questions={[question, { ...question, id: "second", order: 1 }]} onChange={onChange} />);
    expect(screen.queryByText(question.id)).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("button", { name: "Move question 2" }), { key: "ArrowUp" });
    expect(onChange.mock.calls[0][0].map((item: RosterSignupQuestion) => item.id)).toEqual(["second", question.id]);
  });
  it("adds family clans as separate editable dropdown options", () => {
    const onChange = vi.fn();
    render(<SignupQuestionsEditor questions={[]} onChange={onChange} clans={[{ name: "Clan A", tag: "#P0Y" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Family clans" }));
    expect(onChange.mock.calls[0][0][0]).toMatchObject({ type: "single_select", options: ["Clan A (#P0Y)"] });
  });
  it("renders individual option inputs without splitting comma-containing values", () => {
    const onChange = vi.fn();
    render(<SignupQuestionsEditor questions={[{ ...question, type: "single_select", options: ["One", "Two"] }]} onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Question 1 option 1" }), { target: { value: "One, two" } });
    expect(onChange.mock.calls[0][0][0].options).toEqual(["One, two", "Two"]);
  });
  it("keeps the account selector fixed and adds a configurable question", () => {
    const onChange = vi.fn();
    render(<SignupQuestionsEditor questions={[]} onChange={onChange} />);

    expect(screen.getByText("Clash account")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add question" }));

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0][0]).toEqual([
      expect.objectContaining({ type: "text", order: 0 }),
    ]);
  });

  it("warns that deleting a question also deletes its answers", () => {
    const onChange = vi.fn();
    render(<SignupQuestionsEditor questions={[question]} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Delete question 1" }));
    expect(screen.getByText(/existing answers from every member/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete question and answers" }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("does not allow more than four configurable questions", () => {
    const questions = Array.from({ length: 4 }, (_, order) => ({
      ...question,
      id: `question-${order}`,
      order,
    }));
    render(<SignupQuestionsEditor questions={questions} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Add question" })).toBeDisabled();
  });
});
