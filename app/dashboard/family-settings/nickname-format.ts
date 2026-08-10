export interface PlaceholderOption {
  key: string;
  description: string;
  example: string;
}

export interface PlaceholderQuery {
  start: number;
  end: number;
  query: string;
}

export function getPlaceholderQuery(value: string, caret: number): PlaceholderQuery | null {
  const beforeCaret = value.slice(0, caret);
  const start = beforeCaret.lastIndexOf("{");
  if (start < 0) return null;

  const query = beforeCaret.slice(start + 1);
  if (!/^[a-z_]*$/i.test(query)) return null;

  return { start, end: caret, query: query.toLowerCase() };
}

export function filterPlaceholders(
  placeholders: readonly PlaceholderOption[],
  query: string,
): PlaceholderOption[] {
  return placeholders.filter((placeholder) =>
    placeholder.key.slice(1, -1).toLowerCase().includes(query.toLowerCase()),
  );
}

export function insertPlaceholder(
  value: string,
  query: PlaceholderQuery,
  placeholder: string,
): { value: string; caret: number } {
  const nextValue = `${value.slice(0, query.start)}${placeholder}${value.slice(query.end)}`;
  return { value: nextValue, caret: query.start + placeholder.length };
}
