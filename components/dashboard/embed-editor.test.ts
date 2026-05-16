import { describe, expect, it } from "vitest";

import {
  parseDiscohookUrl,
  requiresDiscohookResolve,
  stateToPayload,
  serializeComponentState,
  parseComponentState,
  payloadToMessages,
  EMPTY_MESSAGE_PROFILE,
} from "@/components/dashboard/embed-editor";
import { IS_COMPONENTS_V2_FLAG, type ContainerComponent } from "@/components/dashboard/discord-embed-preview";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type MessageState = Parameters<typeof stateToPayload>[0][number];
type EmbedState = MessageState["embeds"][number];

function uid(): string {
  return "test-uid";
}

function createEmbedState(overrides: Partial<EmbedState> = {}): EmbedState {
  return {
    editorId: uid(),
    openSections: { author: false, body: false, fields: false, images: false, footer: false },
    color: "#5865f2",
    authorName: "", authorIconUrl: "", authorUrl: "",
    title: "", titleUrl: "",
    description: "",
    fields: [],
    thumbnailUrl: "", imageUrl: "",
    footerText: "", footerIconUrl: "",
    includeTimestamp: false,
    ...overrides,
  };
}

function createV1Message(overrides: Partial<EmbedState> = {}, content = ""): MessageState {
  return { id: uid(), mode: "v1", embeds: [createEmbedState(overrides)], content, components: [] };
}

function getFirstMessageData(payload: Record<string, unknown>): Record<string, unknown> {
  const messages = payload.messages;
  if (!Array.isArray(messages)) throw new Error("Expected messages array");
  const firstMessage = messages[0] as { data?: Record<string, unknown> } | undefined;
  if (!firstMessage?.data) throw new Error("Expected first message data");
  return firstMessage.data;
}

function encodeBase64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

function encodeBase64Url(value: string): string {
  return encodeBase64(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("stateToPayload", () => {
  it("writes bot-compatible top-level fields and Discohook messages format", () => {
    const payload = stateToPayload(
      [createV1Message({ title: "Ticket Opened" }, "Welcome to the ticket")],
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
    const payload = stateToPayload([createV1Message({ description: "Only embed body" })]);

    expect(payload.content).toBeNull();
    expect(payload.embeds).toMatchObject([{ description: "Only embed body" }]);

    const messageData = getFirstMessageData(payload);
    expect(messageData.content).toBeNull();
    expect(messageData.embeds).toMatchObject([{ description: "Only embed body" }]);
  });
});

describe("v2 components", () => {
  it("serializes a v2 container message with IS_COMPONENTS_V2_FLAG", () => {
    const msg: MessageState = {
      id: "1",
      mode: "v2",
      embeds: [],
      content: "",
      components: [{ id: "c1", type: "container", accentColor: "#5865f2", children: [{ id: "t1", type: "text_display", content: "Hello" }] }],
    };
    const payload = stateToPayload([msg]);
    expect(payload.flags).toBe(IS_COMPONENTS_V2_FLAG);
    const firstComponents = payload.components as ContainerComponent[];
    expect(firstComponents[0].type).toBe(17);
    expect((firstComponents[0] as ContainerComponent).components[0]).toMatchObject({ type: 10, content: "Hello" });
  });

  it("round-trips a container component through parseComponentState / serializeComponentState", () => {
    const original: ContainerComponent = {
      type: 17,
      accent_color: 0x5865f2,
      components: [{ type: 10, content: "Hi" }],
    };
    const state = parseComponentState(original);
    expect(state.type).toBe("container");
    const back = serializeComponentState(state);
    expect(back.type).toBe(17);
    expect((back as ContainerComponent).components[0]).toMatchObject({ type: 10, content: "Hi" });
  });

  it("round-trips a separator component", () => {
    const state = parseComponentState({ type: 14, divider: true, spacing: 2 });
    expect(state.type).toBe("separator");
    if (state.type !== "separator") throw new Error("wrong type");
    expect(state.spacing).toBe("large");
    const back = serializeComponentState(state);
    expect(back).toMatchObject({ type: 14, divider: true, spacing: 2 });
  });

  it("round-trips a media gallery component", () => {
    const state = parseComponentState({ type: 12, items: [{ media: { url: "https://example.com/img.png" }, description: "test" }] });
    expect(state.type).toBe("media_gallery");
    if (state.type !== "media_gallery") throw new Error("wrong type");
    expect(state.items[0].url).toBe("https://example.com/img.png");
  });

  it("round-trips action_row with buttons", () => {
    const msg = createV1Message();
    msg.mode = "v2";
    msg.components = [
      {
        id: "ar1",
        type: "action_row",
        buttons: [
          { id: "b1", label: "Click me", style: 1, url: "", disabled: false },
          { id: "b2", label: "Visit", style: 5, url: "https://example.com", disabled: false },
        ],
      },
    ];
    const payload = stateToPayload([msg], EMPTY_MESSAGE_PROFILE);
    const comp = (payload as any).components?.[0];
    expect(comp?.type).toBe(1);
    expect(comp?.components).toHaveLength(2);
    expect(comp?.components[0]).toMatchObject({ type: 2, style: 1, label: "Click me" });
    expect(comp?.components[1]).toMatchObject({ type: 2, style: 5, label: "Visit", url: "https://example.com" });
    const [reparsed] = payloadToMessages(payload).messages;
    const ar = reparsed.components[0];
    expect(ar.type).toBe("action_row");
    if (ar.type === "action_row") {
      expect(ar.buttons).toHaveLength(2);
      expect(ar.buttons[0].label).toBe("Click me");
      expect(ar.buttons[1].url).toBe("https://example.com");
    }
  });
});

describe("parseDiscohookUrl", () => {
  it("parses plain base64 discohook payloads", () => {
    const payload = { version: "d2", messages: [{ data: { content: "Hello" } }] };
    const encoded = encodeBase64(JSON.stringify(payload));

    expect(parseDiscohookUrl(`https://discohook.app/?data=${encoded}`)).toEqual(payload);
  });

  it("parses base64url discohook payloads", () => {
    const payload = { version: "d2", messages: [{ data: { content: "Hello from share" } }] };
    const encoded = encodeBase64Url(JSON.stringify(payload));

    expect(parseDiscohookUrl(`https://discohook.app/?data=${encoded}`)).toEqual(payload);
  });
});

describe("requiresDiscohookResolve", () => {
  it("detects Discohook share URLs that need server-side resolution", () => {
    expect(requiresDiscohookResolve("https://share.discohook.app/go/abc123")).toBe(true);
    expect(requiresDiscohookResolve("https://discohook.app/?share=abc123")).toBe(true);
    expect(requiresDiscohookResolve("https://discohook.app/?data=abc123")).toBe(false);
  });
});
