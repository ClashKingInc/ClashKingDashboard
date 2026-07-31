import { describe, expect, it } from "vitest";

import type { RoleSettingsUpdate } from "./roles";
import type { ClanSettingsUpdate, LinkParseSettings, ServerSettings, ServerSettingsUpdate } from "./server";

describe("migration-003 settings contracts", () => {
  it("keeps only the five canonical link-parse booleans", () => {
    const linkParse: LinkParseSettings = {
      clan: true,
      army: false,
      player: true,
      base: false,
      show: true,
    };
    const update: ServerSettingsUpdate = { embed_color: 0xd90709, link_parse: linkParse };

    expect(update.link_parse).toEqual(linkParse);
    expect(update.link_parse).not.toHaveProperty("channels");
  });

  it("rejects retired server, role, and clan settings fields at compile time", () => {
    const retiredServerResponse: ServerSettings = {
      server: "123",
      // @ts-expect-error migration-003 retired this server settings field
      api_token: true,
    };
    const retiredServerUpdate: ServerSettingsUpdate = {
      // @ts-expect-error migration-003 retired this server settings field
      greeting: "Welcome",
    };
    const retiredRoleUpdate: RoleSettingsUpdate = {
      // @ts-expect-error migration-003 retired this role settings field
      blacklisted_roles: ["456"],
    };
    const retiredClanUpdate: ClanSettingsUpdate = {
      // @ts-expect-error migration-003 retired this clan settings field
      ban_alert_channel: "789",
    };
    const retiredLinkParse: LinkParseSettings = {
      // @ts-expect-error migration-003 retired link-parse channel targeting
      channels: ["456"],
    };

    expect(retiredServerResponse).toHaveProperty("api_token");
    expect(retiredServerUpdate).toHaveProperty("greeting");
    expect(retiredRoleUpdate).toHaveProperty("blacklisted_roles");
    expect(retiredClanUpdate).toHaveProperty("ban_alert_channel");
    expect(retiredLinkParse).toHaveProperty("channels");
  });
});
