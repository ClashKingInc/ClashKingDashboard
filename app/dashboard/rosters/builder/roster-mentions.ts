type MentionableRoster = {
  id: string;
  alias: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function rosterMentionIds(text: string, rosters: MentionableRoster[]): string[] {
  return rosters
    .map((roster) => ({
      id: roster.id,
      index: text.search(new RegExp(`@${escapeRegExp(roster.alias)}(?![\\p{L}\\p{N}_])`, "iu")),
    }))
    .filter((match) => match.index >= 0)
    .sort((left, right) => left.index - right.index)
    .map((match) => match.id);
}

export function mergeRosterContextIds(selectedIds: string[], mentionedIds: string[]): string[] {
  return [...new Set([...selectedIds, ...mentionedIds])];
}

type AtomicMention = {
  id: string;
  label: string;
};

export function removeAtomicMention(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  key: "Backspace" | "Delete",
  mentions: AtomicMention[],
): { text: string; caret: number; removedIds: string[] } | null {
  const normalizedText = text.toLocaleLowerCase();
  let removeStart = selectionStart;
  let removeEnd = selectionEnd;
  const removedIds: string[] = [];

  for (const mention of mentions) {
    const mentionStart = normalizedText.indexOf(mention.label.toLocaleLowerCase());
    if (mentionStart < 0) continue;
    const mentionEnd = mentionStart + mention.label.length;
    const trailingSpaceEnd = text[mentionEnd] === " " ? mentionEnd + 1 : mentionEnd;
    const collapsed = selectionStart === selectionEnd;
    const touchesMention = collapsed
      ? key === "Backspace"
        ? (selectionStart > mentionStart && selectionStart <= trailingSpaceEnd)
        : (selectionStart >= mentionStart && selectionStart < mentionEnd)
      : selectionStart < mentionEnd && selectionEnd > mentionStart;
    if (!touchesMention) continue;

    removeStart = Math.min(removeStart, mentionStart);
    removeEnd = Math.max(removeEnd, trailingSpaceEnd);
    removedIds.push(mention.id);
  }

  if (removedIds.length === 0) return null;
  if (removeEnd === text.length && removeStart > 0 && text[removeStart - 1] === " ") removeStart -= 1;
  return {
    text: `${text.slice(0, removeStart)}${text.slice(removeEnd)}`,
    caret: removeStart,
    removedIds,
  };
}
