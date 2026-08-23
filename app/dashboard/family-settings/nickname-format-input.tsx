"use client";

import React, { useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import {
  filterPlaceholders,
  getPlaceholderQuery,
  insertPlaceholder,
  type PlaceholderOption,
  type PlaceholderQuery,
} from "./nickname-format";

interface NicknameFormatInputProps {
  id: string;
  label: string;
  value: string;
  preview: string;
  previewLabel: string;
  autocompleteHint: string;
  placeholders: readonly PlaceholderOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
  onCommit: () => void;
}

export function NicknameFormatInput({
  id,
  label,
  value,
  preview,
  previewLabel,
  autocompleteHint,
  placeholders,
  disabled = false,
  onChange,
  onCommit,
}: NicknameFormatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState<PlaceholderQuery | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const matches = useMemo(
    () => (query ? filterPlaceholders(placeholders, query.query) : []),
    [placeholders, query],
  );
  const isOpen = query !== null && matches.length > 0;

  const updateQuery = (nextValue: string, caret: number | null) => {
    const nextQuery = getPlaceholderQuery(nextValue, caret ?? nextValue.length);
    setQuery(nextQuery);
    setActiveIndex(0);
  };

  const choosePlaceholder = (placeholder: PlaceholderOption) => {
    if (!query) return;
    const inserted = insertPlaceholder(value, query, placeholder.key);
    onChange(inserted.value);
    setQuery(null);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(inserted.caret, inserted.caret);
    });
  };

  return (
    <div className="rounded-[22px] bg-card p-4 shadow-sm shadow-black/5 md:p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <Label htmlFor={id} className="text-sm font-semibold">
          {label}
        </Label>
        <span className="text-xs text-muted-foreground">{autocompleteHint}</span>
      </div>

      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          value={value}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={`${id}-suggestions`}
          className="border-0 bg-muted/55 font-mono shadow-sm shadow-black/5 focus-visible:bg-muted/70"
          onChange={(event) => {
            onChange(event.target.value);
            updateQuery(event.target.value, event.target.selectionStart);
          }}
          onClick={(event) => updateQuery(value, event.currentTarget.selectionStart)}
          onKeyUp={(event) => {
            if (!["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(event.key)) {
              updateQuery(value, event.currentTarget.selectionStart);
            }
          }}
          onKeyDown={(event) => {
            if (!isOpen) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => (index + 1) % matches.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => (index - 1 + matches.length) % matches.length);
            } else if (event.key === "Enter" || event.key === "Tab") {
              event.preventDefault();
              choosePlaceholder(matches[activeIndex]);
            } else if (event.key === "Escape") {
              event.preventDefault();
              setQuery(null);
            }
          }}
          onBlur={() => {
            setQuery(null);
            onCommit();
          }}
        />

        {isOpen && (
          <div
            id={`${id}-suggestions`}
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-40 max-h-64 overflow-y-auto rounded-2xl border border-border/60 bg-popover p-1.5 shadow-xl shadow-black/15"
          >
            {matches.map((placeholder, index) => (
              <button
                key={placeholder.key}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                  index === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choosePlaceholder(placeholder)}
              >
                <code className="shrink-0 text-xs font-semibold text-primary">{placeholder.key}</code>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {placeholder.description}
                </span>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                  {placeholder.example}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex min-w-0 items-center gap-2 rounded-xl bg-muted/40 px-3 py-2">
        <span className="shrink-0 text-xs font-medium text-muted-foreground">{previewLabel}</span>
        <span className="truncate font-mono text-sm text-foreground">{preview || "—"}</span>
      </div>
    </div>
  );
}
