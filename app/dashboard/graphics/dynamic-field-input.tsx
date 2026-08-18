"use client";

import { useMemo, useRef, useState } from "react";
import { ImageIcon, Type } from "lucide-react";
import {
  filterPlaceholders,
  getPlaceholderQuery,
  insertPlaceholder,
  type PlaceholderQuery,
} from "@/app/dashboard/family-settings/nickname-format";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { bindingToken, type DynamicField } from "./dynamic-fields";

interface DynamicFieldInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onImageField: (field: DynamicField) => void;
  fields: readonly DynamicField[];
  rows?: number;
  placeholder?: string;
  className?: string;
}

function getDynamicFieldQuery(value: string, caret: number): PlaceholderQuery | null {
  const existingQuery = getPlaceholderQuery(value, caret);
  if (existingQuery) return existingQuery;

  const beforeCaret = value.slice(0, caret);
  const start = beforeCaret.lastIndexOf("[");
  if (start < 0) return null;
  const query = beforeCaret.slice(start + 1);
  if (!/^[a-z_]*$/i.test(query)) return null;
  return { start, end: caret, query: query.toLowerCase() };
}

export function DynamicFieldInput({
  id,
  value,
  onChange,
  onImageField,
  fields,
  rows = 4,
  placeholder = "Type [ to insert a field",
  className,
}: DynamicFieldInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<PlaceholderQuery | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const matches = useMemo(() => {
    if (!query) return [];
    const autocompleteOptions = fields.map((field) => ({
      key: bindingToken(field.key),
      description: field.description,
      example: field.placeholder,
    }));
    const keys = new Set(filterPlaceholders(autocompleteOptions, query.query).map((option) => option.key));
    return fields.filter((field) => keys.has(bindingToken(field.key)));
  }, [fields, query]);
  const isOpen = Boolean(query && matches.length);

  const updateQuery = (nextValue: string, caret: number | null) => {
    setQuery(getDynamicFieldQuery(nextValue, caret ?? nextValue.length));
    setActiveIndex(0);
  };

  const chooseField = (field: DynamicField) => {
    if (!query) return;
    if (field.kind === "image") {
      const nextValue = `${value.slice(0, query.start)}${value.slice(query.end)}`;
      onChange(nextValue);
      onImageField(field);
      setQuery(null);
      return;
    }

    const inserted = insertPlaceholder(value, query, bindingToken(field.key));
    onChange(inserted.value);
    setQuery(null);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(inserted.caret, inserted.caret);
    });
  };

  return (
    <div className="relative">
      <Textarea
        ref={inputRef}
        id={id}
        value={value}
        rows={rows}
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={`${id}-suggestions`}
        placeholder={placeholder}
        className={cn("resize-none border-0 bg-muted/55 font-mono text-sm shadow-sm shadow-black/5", className)}
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
            chooseField(matches[activeIndex]);
          } else if (event.key === "Escape") {
            event.preventDefault();
            setQuery(null);
          }
        }}
        onBlur={() => setQuery(null)}
      />

      {isOpen && (
        <div
          id={`${id}-suggestions`}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 max-h-72 overflow-y-auto rounded-2xl border border-border/60 bg-popover p-1.5 shadow-xl shadow-black/15"
        >
          {matches.map((field, index) => (
            <button
              key={field.key}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                index === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
              )}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => chooseField(field)}
            >
              <span className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                field.kind === "image" ? "bg-sky-500/12 text-sky-500" : "bg-primary/10 text-primary",
              )}>
                {field.kind === "image" ? <ImageIcon className="h-4 w-4" /> : <Type className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{field.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{field.description}</span>
              </span>
              <code className="hidden shrink-0 text-xs text-muted-foreground sm:block">{bindingToken(field.key)}</code>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
