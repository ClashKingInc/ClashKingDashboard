import { TicketPanelMessage } from "@clashking/api-contracts";
import { Schema } from "effect";

/** Convert the shared editor's Discohook envelope into one panel-owned message. */
export function nativePanelMessage(payload: Record<string, unknown>, panelId?: string): typeof TicketPanelMessage.Type {
  let message = payload;
  if (Array.isArray(payload.messages)) {
    if (payload.messages.length !== 1) throw new Error("Ticket panels support one message");
    const entry = payload.messages[0] as { data?: Record<string, unknown> } | undefined;
    if (!entry?.data) throw new Error("Missing ticket panel message");
    message = entry.data;
  }
  if (message.flags !== undefined && message.flags !== 0 && message.flags !== 32768) throw new Error("Unsupported message flags");
  const bindMenus = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(bindMenus);
    if (value === null || typeof value !== "object") return value;
    const node = value as Record<string, unknown>;
    const normalized = { ...node };
    if (panelId && [2, 3].includes(Number(node.type))) delete normalized.disabled;
    if (panelId && node.type === 3) {
      normalized.min_values = 1;
      normalized.max_values = 1;
      delete normalized.disabled;
    }
    return { ...normalized,
      ...(panelId && node.type === 3 && typeof node.custom_id === "string" && !node.custom_id.startsWith(`ck:ticket:menu:${panelId}:`)
        ? { custom_id: `ck:ticket:menu:${panelId}:${node.custom_id.replace(/[^a-z0-9-]/giu, "").slice(0, 40) || crypto.randomUUID()}` } : {}),
      ...(node.components ? { components: bindMenus(node.components) } : {}),
      ...(node.accessory ? { accessory: bindMenus(node.accessory) } : {}),
    };
  };
  return Schema.decodeUnknownSync(TicketPanelMessage)({
    ...(message.flags === 32768 ? { flags: 32768 } : {}),
    ...(Array.isArray(message.components) && message.components.length ? { components: bindMenus(message.components) } : {}),
    ...(typeof message.content === "string" && message.content ? { content: message.content } : {}),
    ...(Array.isArray(message.embeds) && message.embeds.length ? { embeds: message.embeds } : {}),
  });
}
