import { describe, expect, it } from "vitest";

import germanMessages from "@/messages/de.json";
import { withEnglishFallback } from "./message-catalog";

describe("withEnglishFallback", () => {
  it("keeps translated namespaces when a locale is merged with the base catalog", () => {
    const messages = withEnglishFallback(germanMessages);

    expect(messages.Navigation.settings).toBe(germanMessages.Navigation.settings);
  });
});
