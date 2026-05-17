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

  it("round-trips action_row with buttons", () => {    const msg = createV1Message();
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

  it("round-trips a container with spoiler=true", () => {
    const original: ContainerComponent = {
      type: 17,
      accent_color: null,
      spoiler: true,
      components: [{ type: 10, content: "Surprise!" }],
    };
    const state = parseComponentState(original);
    if (state.type !== "container") throw new Error("wrong type");
    expect(state.spoiler).toBe(true);
    const back = serializeComponentState(state);
    expect((back as any).spoiler).toBe(true);
  });

  it("round-trips a string select component", () => {
    const state = parseComponentState({
      type: 3,
      custom_id: "my_select",
      placeholder: "Choose...",
      min_values: 1,
      max_values: 2,
      options: [
        { label: "Option A", value: "a", description: "First option" },
        { label: "Option B", value: "b", default: true },
      ],
    } as any);
    expect(state.type).toBe("string_select");
    if (state.type !== "string_select") throw new Error("wrong type");
    expect(state.customId).toBe("my_select");
    expect(state.placeholder).toBe("Choose...");
    expect(state.maxValues).toBe(2);
    expect(state.options).toHaveLength(2);
    expect(state.options[1].isDefault).toBe(true);
    const back = serializeComponentState(state as any);
    expect((back as any).type).toBe(1);
    expect((back as any).components[0].type).toBe(3);
    expect((back as any).components[0].custom_id).toBe("my_select");
    expect((back as any).components[0].options).toHaveLength(2);
  });

  it("round-trips a user select component", () => {
    const state = parseComponentState({ type: 5, custom_id: "user_picker", placeholder: "Pick user" } as any);
    expect(state.type).toBe("user_select");
    if (state.type !== "user_select") throw new Error("wrong type");
    expect(state.customId).toBe("user_picker");
    const back = serializeComponentState(state as any);
    expect((back as any).type).toBe(1);
    expect((back as any).components[0].type).toBe(5);
    expect((back as any).components[0].custom_id).toBe("user_picker");
  });

  it("returns null for empty action row (no buttons, no select)", () => {
    const state = parseComponentState({ type: 1, components: [] } as any);
    expect(state.type).toBe("action_row");
    const result = serializeComponentState(state as any);
    expect(result).toBeNull();
  });

  it("wraps standalone select menus in an action row during serialization", () => {
    const state = parseComponentState({ type: 5, custom_id: "u_sel", placeholder: "Pick" } as any);
    expect(state.type).toBe("user_select");
    const back = serializeComponentState(state as any);
    expect((back as any)?.type).toBe(1);
    expect((back as any)?.components[0].type).toBe(5);
    expect((back as any)?.components[0].custom_id).toBe("u_sel");
  });

  it("filters empty action rows and wraps standalone selects in stateToPayload", () => {
    const msg: MessageState = {
      id: "m1",
      mode: "v2",
      embeds: [],
      content: "",
      components: [
        { id: "ar1", type: "action_row", buttons: [] }, // empty → filtered
        { id: "us1", type: "user_select", customId: "sel1", placeholder: "", minValues: 1, maxValues: 1, disabled: false }, // wrapped
      ],
    };
    const payload = stateToPayload([msg], EMPTY_MESSAGE_PROFILE);
    const comps = (payload as any).components as any[];
    expect(comps).toHaveLength(1);
    expect(comps[0].type).toBe(1); // action row wrapper
    expect(comps[0].components[0].type).toBe(5); // user select inside
  });

  it("round-trips an action row with a string select", () => {
    const state = parseComponentState({
      type: 1,
      components: [{ type: 3, custom_id: "sel", options: [{ label: "A", value: "a" }] }],
    } as any);
    expect(state.type).toBe("action_row");
    if (state.type !== "action_row") throw new Error("wrong type");
    expect(state.selectMenu?.type).toBe("string_select");
    expect(state.buttons).toHaveLength(0);
    const back = serializeComponentState(state as any);
    expect((back as any).type).toBe(1);
    expect((back as any).components[0].type).toBe(3);
  });

  it("round-trips a section with button accessory", () => {
    const state = parseComponentState({
      type: 9,
      components: [{ type: 10, content: "Click the button" }],
      accessory: { type: 2, style: 1, label: "Go!" },
    } as any);
    expect(state.type).toBe("section");
    if (state.type !== "section") throw new Error("wrong type");
    expect(state.accessoryType).toBe("button");
    expect(state.buttonLabel).toBe("Go!");
    expect(state.buttonStyle).toBe(1);
    const back = serializeComponentState(state as any);
    expect((back as any).type).toBe(9);
    expect((back as any).accessory?.type).toBe(2);
    expect((back as any).accessory?.label).toBe("Go!");
  });

  it("omits accessory when section accessoryType is none", () => {
    const state = parseComponentState({
      type: 9,
      components: [{ type: 10, content: "No accessory" }],
    } as any);
    expect(state.type).toBe("section");
    if (state.type !== "section") throw new Error("wrong type");
    expect(state.accessoryType).toBe("none");
    const back = serializeComponentState(state as any);
    expect((back as any).accessory).toBeUndefined();
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
