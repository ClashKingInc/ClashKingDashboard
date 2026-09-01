import { describe, expect, it } from "vitest";

import englishMessages from "@/messages/en.json";
import germanMessages from "@/messages/de.json";
import { withEnglishFallback } from "./message-catalog";

describe("withEnglishFallback", () => {
  it("keeps translated namespaces and explicitly falls back for untranslated connected-app copy", () => {
    const messages = withEnglishFallback(germanMessages);

    expect(messages.Navigation.settings).toBe(germanMessages.Navigation.settings);
    expect(messages.ConnectedApps).toEqual(englishMessages.ConnectedApps);
    expect(Object.hasOwn(germanMessages, "ConnectedApps")).toBe(false);
  });
});
