import englishMessages from "@/messages/en.json";

export type MessageCatalog = typeof englishMessages;
export type LocalizedMessageCatalog = Partial<MessageCatalog>;

export function withEnglishFallback(messages: unknown): MessageCatalog {
  return {
    ...englishMessages,
    ...(messages as LocalizedMessageCatalog),
  };
}
