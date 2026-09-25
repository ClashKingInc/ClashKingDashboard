import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { expect, it } from "vitest";
import { EventOffsetInput } from "./EventOffsetInput";

it("uses positive day counts and remembers Before when starting at zero", () => {
  function Example() { const [value, setValue] = useState(0); return <><EventOffsetInput value={value} onChange={setValue} /><output>{value}</output></>; }
  render(<Example />);
  fireEvent.click(screen.getByRole("button", { name: "Before" }));
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "3" } });
  expect(screen.getByRole("spinbutton")).toHaveValue(3);
  expect(screen.getByRole("status")).toHaveTextContent("-3");
  fireEvent.click(screen.getByRole("button", { name: "After" }));
  expect(screen.getByRole("status")).toHaveTextContent("3");
  expect(screen.getByRole("button", { name: "After" })).toHaveAttribute("aria-pressed", "true");
});

it("keeps an existing positive direction when clearing and retyping the day count", () => {
  function Example() { const [value, setValue] = useState(4); return <><EventOffsetInput value={value} onChange={setValue} /><output>{value}</output></>; }
  render(<Example />);
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "" } });
  expect(screen.getByRole("button", { name: "After" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "6" } });
  expect(screen.getByRole("status")).toHaveTextContent("6");
});
