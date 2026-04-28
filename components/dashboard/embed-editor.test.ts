import { describe, expect, it } from "vitest";

import { stateToPayload } from "@/components/dashboard/embed-editor";

type EmbedStates = Parameters<typeof stateToPayload>[0];

function createState(overrides: Partial<EmbedStates[number]> = {}): EmbedStates[number] {
  return {
    editorId: "embed-1",
    openSections: {
      author: false,
      body: false,
      fields: false,
      images: false,
      footer: false,
    },
    color: "#5865f2",
    authorName: "",
    authorIconUrl: "",
    authorUrl: "",
    title: "",
    titleUrl: "",
    description: "",
    fields: [],
    thumbnailUrl: "",
    imageUrl: "",
    footerText: "",
    footerIconUrl: "",
    includeTimestamp: false,
    ...overrides,
  };
}

function getFirstMessageData(payload: Record<string, unknown>): Record<string, unknown> {
  const messages = payload.messages;
  if (!Array.isArray(messages)) {
    throw new Error("Expected messages array");
  }
  const firstMessage = messages[0] as { data?: Record<string, unknown> } | undefined;
  if (!firstMessage?.data) {
    throw new Error("Expected first message data");
  }
  return firstMessage.data;
}

describe("stateToPayload", () => {
  it("writes bot-compatible top-level fields and Discohook messages format", () => {
    const payload = stateToPayload(
      [createState({ title: "Ticket Opened" })],
      "Welcome to the ticket",
      { name: "ClashKing", avatarUrl: "https://example.com/avatar.png" },
    );

    expect(payload).toMatchObject({
      version: "d2",
      content: "Welcome to the ticket",
      embeds: [{ title: "Ticket Opened" }],
      username: "ClashKing",
      avatar_url: "https://example.com/avatar.png",
    });

    const messageData = getFirstMessageData(payload);
    expect(messageData).toMatchObject({
      content: "Welcome to the ticket",
      embeds: [{ title: "Ticket Opened" }],
      username: "ClashKing",
      avatar_url: "https://example.com/avatar.png",
    });
  });

  it("keeps null content when only embeds are present", () => {
    const payload = stateToPayload([createState({ description: "Only embed body" })], "");

    expect(payload.content).toBeNull();
    expect(payload.embeds).toMatchObject([{ description: "Only embed body" }]);

    const messageData = getFirstMessageData(payload);
    expect(messageData.content).toBeNull();
    expect(messageData.embeds).toMatchObject([{ description: "Only embed body" }]);
  });
});
