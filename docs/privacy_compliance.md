# Privacy Compliance Notes

ClashKing Dashboard is a public web surface and authenticated server-management application. It stores browser session data and displays Discord-linked Clash of Clans information, so it must stay aligned with the mobile app privacy controls and backend retention processes.

## Controls added

- Updated `/privacy` to cover mobile, dashboard, Discord bot, admin tooling, push notifications, crash reporting, international transfers, children, California rights, and retention.
- The public policy now states that ClashKing does not sell personal data or share it for cross-context behavioral advertising.
- The policy documents user rights for access, correction, deletion, portability, restriction, objection, and push opt-out.

## Dashboard implementation requirements

- Store OAuth PKCE state in `sessionStorage` and clear it after callback completion.
- Store dashboard tokens only as long as needed for the signed-in session and clear them on logout or failed refresh.
- Treat Discord IDs, usernames, avatars, guild IDs, role IDs, player links, rosters, tickets, reminders, and local column preferences as personal data.
- Do not add analytics, advertising SDKs, heatmaps, or session replay without updating consent, policy, and store disclosures first.
- Keep API routes as token-forwarding boundaries only; do not log bearer tokens or Discord OAuth secrets.
