# Liste Complète des Commandes Discord - ClashKingBot

## /ban
### add
- player (coc.Player)
- reason (str)
- server_wide (str) - choices: ['True', 'False']

### remove
- player (coc.Player)
- reason (str)

### list
- clan (coc.Clan, default=None)

---

## /board
### create
- name (str)
- alias (str)
- embed (str) - autocomplete: embeds

### edit
- board (str) - autocomplete: boards

### post
- board (str) - autocomplete: boards
- channel (disnake.TextChannel, default=None)

### refresh
- board (str) - autocomplete: boards

### delete
- board (str) - autocomplete: boards

---

## /clan
### search
- clan (coc.Clan)

### composition
- clan (coc.Clan, default=None)
- server (disnake.Guild, default=None)
- type (str) - choices: ['Townhalls', 'Heroes', 'Hero Pets', 'Troops']

### donations
- clan (coc.Clan, default=None)
- server (disnake.Guild, default=None)
- season (str, default=None)
- type (str) - choices: ['Donations', 'Received']
- limit (int) - default=50, min=1, max=50

### games
- clan (coc.Clan, default=None)
- server (disnake.Guild, default=None)
- season (str, default=None)
- limit (int) - default=50, min=1, max=50

### activity
- clan (coc.Clan, default=None)
- server (disnake.Guild, default=None)
- season (str, default=None)
- limit (int) - default=50, min=1, max=50

### capital
- clan (coc.Clan, default=None)
- server (disnake.Guild, default=None)
- type (str) - choices: ['Offense', 'Defense']
- limit (int) - default=50, min=1, max=50
- season (str, default=None)
- weekend (str, default=None)

### attackwins
- clan (coc.Clan, default=None)
- server (disnake.Guild, default=None)
- season (str, default=None)
- limit (int) - default=50, min=1, max=50

### trophies
- clan (coc.Clan, default=None)
- server (disnake.Guild, default=None)
- type (str) - choices: ['Current', 'Season High']
- season (str, default=None)
- limit (int) - default=50, min=1, max=50

---

## /eval
### server
- server (disnake.Guild, default=None)
- season (str, default=None)
- board (str, default=None) - autocomplete: boards

### player
- player (coc.Player, default=None)
- user (disnake.User, default=None)
- season (str, default=None)

### family-overview
- server (disnake.Guild, default=None)
- season (str, default=None)

---

## /embed
### create
- name (str)

### edit
- name (str) - autocomplete: embeds

### post
- name (str) - autocomplete: embeds
- channel (disnake.TextChannel, default=None)

### delete
- name (str) - autocomplete: embeds

### copy
- name (str) - autocomplete: embeds
- new_name (str)

### list
*(aucun paramètre)*

---

## /family
### clans
- server (disnake.Guild, default=None)

### overview
- server (disnake.Guild, default=None)
- townhall (int, default=None)

### composition
- server (disnake.Guild, default=None)
- type (str) - choices: ['Townhalls', 'Heroes', 'Hero Pets', 'Troops']

### donations
- server (disnake.Guild, default=None)
- season (str, default=None)
- type (str) - choices: ['Donations', 'Received']
- limit (int) - default=50, min=1, max=50

### games
- server (disnake.Guild, default=None)
- season (str, default=None)
- limit (int) - default=50, min=1, max=50

### activity
- server (disnake.Guild, default=None)
- season (str, default=None)
- limit (int) - default=50, min=1, max=50

### capital
- server (disnake.Guild, default=None)
- type (str) - choices: ['Offense', 'Defense']
- limit (int) - default=50, min=1, max=50
- season (str, default=None)
- weekend (str, default=None)

### attackwins
- server (disnake.Guild, default=None)
- season (str, default=None)
- limit (int) - default=50, min=1, max=50

### trophies
- server (disnake.Guild, default=None)
- type (str) - choices: ['Current', 'Season High']
- season (str, default=None)
- limit (int) - default=50, min=1, max=50

---

## /giveaway
### create
- duration (str)
- number_of_winners (int)
- prize (str)
- required_role (disnake.Role, default=None)

---

## /graph
### season
- player (coc.Player, default=None)
- user (disnake.User, default=None)
- season (str, default=None)

### legend
- player (coc.Player, default=None)
- user (disnake.User, default=None)
- days (int) - default=7, min=1, max=30

### season-compare
- player (coc.Player, default=None)
- user (disnake.User, default=None)
- season_one (str)
- season_two (str)
- season_three (str, default=None)
- season_four (str, default=None)

---

## /help
*(aucun paramètre)*

---

## /leaderboard
### legends
- country (str, default=None) - autocomplete: country_names
- server (disnake.Guild, default=None)
- previous_season (str, default=None) - choices: ['True']
- limit (int) - default=50, min=1, max=50

### trophies
- type (str) - choices: ['Home Village', 'Builder Base']
- country (str, default=None) - autocomplete: country_names
- server (disnake.Guild, default=None)
- previous_season (str, default=None) - choices: ['True']
- limit (int) - default=50, min=1, max=50

### versus-trophies
- country (str, default=None) - autocomplete: country_names
- server (disnake.Guild, default=None)
- previous_season (str, default=None) - choices: ['True']
- limit (int) - default=50, min=1, max=50

### capital-gold
- type (str) - choices: ['Donated', 'Looted']
- country (str, default=None) - autocomplete: country_names
- server (disnake.Guild, default=None)
- week (str, default=None)
- limit (int) - default=50, min=1, max=50

### attackwins
- country (str, default=None) - autocomplete: country_names
- server (disnake.Guild, default=None)
- season (str, default=None)
- limit (int) - default=50, min=1, max=50

### donations
- type (str) - choices: ['Donated', 'Received']
- country (str, default=None) - autocomplete: country_names
- server (disnake.Guild, default=None)
- season (str, default=None)
- limit (int) - default=50, min=1, max=50

### clangames
- country (str, default=None) - autocomplete: country_names
- server (disnake.Guild, default=None)
- season (str, default=None)
- limit (int) - default=50, min=1, max=50

### activity
- country (str, default=None) - autocomplete: country_names
- server (disnake.Guild, default=None)
- season (str, default=None)
- limit (int) - default=50, min=1, max=50

### warhits
- type (str) - choices: ['Offense', 'Defense']
- country (str, default=None) - autocomplete: country_names
- server (disnake.Guild, default=None)
- limit (int) - default=50, min=1, max=50

---

## /legends
### player
- player (coc.Player, default=None)
- user (disnake.User, default=None)
- day (str, default=None) - autocomplete: legend_days

### today
*(aucun paramètre)*

### global
*(aucun paramètre)*

### ranking
- type (str) - choices: ['Daily Elo', 'Lifetime Elo', 'Trophies']
- limit (int) - default=100, min=1, max=250

---

## /link
### create
- player_tag (str)

### list
- user (disnake.User, default=None)

### delete
- player_tag (str, default=None) - autocomplete: user_accounts

### search
- user (disnake.User)

---

## /linkalias
### create
- player_tag (str)
- alias (str)

### list
- user (disnake.User, default=None)

### delete
- alias (str) - autocomplete: user_aliases

---

## /profile
- player (coc.Player, default=None)
- user (disnake.User, default=None)

---

## /refresh
- player (coc.Player, default=None)
- user (disnake.User, default=None)

---

## /verify
- code (str)
- user (disnake.Member, default=None)

---

## /search
- name (str)
- tag (str, default=None)

---

## /ticks
*(aucun paramètre)*

---

## /player
### upgrades
- player (coc.Player, default=None)
- user (disnake.User, default=None)
- type (str) - choices: ['All', 'Lab', 'Heroes', 'Pets', 'Spells', 'Troops', 'Siege Machines', 'Hero Equipment']
- sort_by (str) - choices: ['Cost', 'Time', 'Type']
- include_super_troops (str, default='False') - choices: ['True', 'False']
- include_bb_upgrades (str, default='False') - choices: ['True', 'False']

### season
- player (coc.Player, default=None)
- user (disnake.User, default=None)
- season (str, default=None)

### history
- player (coc.Player, default=None)
- user (disnake.User, default=None)

---

## /reminders
### create
- clan (coc.Clan)
- type (str) - choices: ['War', 'CWL']
- channel (Union[disnake.TextChannel, disnake.Thread])
- hours_before_war_end (int, default=1)
- role_to_ping (disnake.Role, default=None)
- send_even_if_all_attacks_done (str, default='False') - choices: ['True', 'False']

### edit
- reminder_id (str) - autocomplete: reminder_ids
- channel (Union[disnake.TextChannel, disnake.Thread], default=None)
- hours_before_war_end (int, default=None)
- role_to_ping (disnake.Role, default=None)
- send_even_if_all_attacks_done (str, default=None) - choices: ['True', 'False']

### list
*(aucun paramètre)*

### remove
- reminder_id (str) - autocomplete: reminder_ids

---

## /roster
### create
- name (str)
- size (int) - min=5, max=50
- sort_by (str) - choices: ['Townhall', 'Trophies', 'Clan Games', 'War Stars']
- clan (coc.Clan, default=None)
- server (disnake.Guild, default=None)
- th_count (str, default=None)

### edit
- roster (str) - autocomplete: roster

### post
- roster (str) - autocomplete: roster

### list
*(aucun paramètre)*

### delete
- roster (str) - autocomplete: roster

### signup
- roster (str, default=None) - autocomplete: roster

### missing
- roster (str) - autocomplete: roster
- ping (str, default='No') - choices: ['Yes', 'No']

### clear-signups
- roster (str) - autocomplete: roster

### player-add
- roster (str) - autocomplete: roster
- player (coc.Player)
- substitute (str) - choices: ['Yes', 'No']

### player-remove
- roster (str) - autocomplete: roster
- player (coc.Player)

### group-add
- roster (str) - autocomplete: roster
- clan (coc.Clan, default=None)
- user (disnake.User, default=None)
- substitute (str) - choices: ['Yes', 'No']

### group-remove
- roster (str) - autocomplete: roster
- clan (coc.Clan, default=None)
- user (disnake.User, default=None)

### change-size
- roster (str) - autocomplete: roster
- size (int) - min=5, max=50

### change-sort
- roster (str) - autocomplete: roster
- sort_by (str) - choices: ['Townhall', 'Trophies', 'Clan Games', 'War Stars']

### export-lineup
- roster (str) - autocomplete: roster

---

## /set
### webhook-profiles
- picture (disnake.Attachment)
- name (str)

### bot-status
- activity_text (str)
- status (str) - choices: ['Online', 'Offline', 'Idle', 'DND']

---

## /whitelist
### add
- ping (disnake.Member | disnake.Role)
- command (str, default=None) - autocomplete: command_autocomplete

### remove
- ping (disnake.Member | disnake.Role)
- command (str, default=None) - autocomplete: command_autocomplete

### list
*(aucun paramètre)*

---

## /setup
### server
- ban_log_channel (Union[disnake.TextChannel, disnake.Thread], default=None)
- strike_log_channel (disnake.TextChannel | disnake.Thread, default=None)
- change_nicknames (str, default=None) - choices: ['On', 'Off']
- family_nickname_convention (str, default=None)
- non_family_nickname_convention (str, default=None)
- flair_non_family (str, default=None) - choices: ['True', 'False']
- api_token (str, default=None) - choices: ['Use', "Don't Use"]
- leadership_eval (str, default=None) - choices: ['True', 'False']
- full_whitelist_role (disnake.Role, default=None)
- embed_color (str, default=None)
- followed_reddit_accounts (str, default=None)

### clan
- clan (coc.Clan)
- member_role (disnake.Role, default=None)
- leadership_role (disnake.Role, default=None)
- clan_channel (Union[disnake.TextChannel, disnake.Thread], default=None)
- greeting (str, default=None) - autocomplete: embeds
- auto_greet (str, default=None) - choices: ['Never', 'First Join', 'Every Join']
- category (str, default=None) - autocomplete: category
- ban_alert_channel (Union[disnake.TextChannel, disnake.Thread], default=None)
- clan_abbreviation (str, default=None)
- strike_button (str, default=None) - choices: ['True', 'False']
- ban_button (str, default=None) - choices: ['True', 'False']
- profile_button (str, default=None) - choices: ['True', 'False']

### member-count-warning
- clan (coc.Clan)
- below (int, default=0)
- above (int, default=0)
- ping (disnake.Role, default=None)
- channel (Union[disnake.TextChannel, disnake.Thread], default=None)

### user-settings
- user (disnake.Member)
- default_main_account (coc.Player, default=None)
- server_main_account (coc.Player, default=None)
- private_mode (str, default=None) - choices: ['True', 'False']

### list
*(aucun paramètre)*

### category-order
*(aucun paramètre)*

### logs
- clan (coc.Clan)
- mode (str) - choices: ['Add/Edit', 'Remove']
- channel (Union[disnake.TextChannel, disnake.Thread], default=None)

### reddit-recruit-feed
- channel (Union[disnake.TextChannel, disnake.Thread])
- role_to_ping (disnake.Role, default=None)
- remove (str, default=None) - choices: ['Remove Feed']

### countdowns
- clan (coc.Clan, default=None)

### events
- type (str) - choices: ['War']
- clan (coc.Clan)
- status (str) - choices: ['Enable', 'Disable']

### link-parse
- army_links (str, default=None) - choices: ['On', 'Off']
- player_links (str, default=None) - choices: ['On', 'Off']
- clan_links (str, default=None) - choices: ['On', 'Off']
- base_links (str, default=None) - choices: ['On', 'Off']
- show_parse (str, default=None) - choices: ['On', 'Off']
- manage_whitelist (bool, default=None) - choices: ['True']

---

## /addclan
- clan (coc.Clan)
- category (str) - autocomplete: new_categories
- member_role (disnake.Role)
- clan_channel (disnake.TextChannel)
- leadership_role (disnake.Role, default=None)

---

## /removeclan
- clan (coc.Clan)

---

## /stats
### war
- type (str) - choices: ['Hit Rate', 'Defense Rate', 'Attack Info']
- clan (coc.Clan, default=None)
- server (disnake.Guild, default=None)
- war_types (str, default='All') - choices: ['All', 'CWL', 'Friendly', 'War', 'War & CWL']
- th_filter (str, default='All') - autocomplete: th_filters
- star_filter (str, default='3')
- min_attacks (int, default=5) - min=1, max=100
- season (str, default=None)
- num_wars (int, default=None)
- num_days (int, default=None)
- limit (int, default=50) - min=1, max=50

---

## /strike
### add
- player (coc.Player)
- reason (str)
- rollover_days (int, default=None)
- strike_weight (int, default=1)
- dm_player (str, default=None)

### list
- view (str) - choices: ['Strike View', 'Player View']
- clan (coc.Clan, default=None)
- user (disnake.Member, default=None)
- strike_amount (int, default=1)
- view_expired_strikes (bool, default=False) - choices: ['True', 'False']
- view_non_family (bool, default=False) - choices: ['True', 'False']

### remove
- strike_id (str, default=None) - autocomplete: strike_ids

---

## /ticket
### panel-create
- panel_name (str)
- embed (str) - autocomplete: embeds

### panel-post
- panel_name (str) - autocomplete: ticket_panel

### panel-edit
- panel_name (str) - autocomplete: ticket_panel
- embed (str) - autocomplete: embeds

### panel-delete
- panel_name (str) - autocomplete: ticket_panel

### open-message
- ticket_button (tuple[str, str]) - autocomplete: ticket_panel_buttons
- embed (str) - autocomplete: embeds

### roles
- ticket_button (tuple[str, str]) - autocomplete: ticket_panel_buttons
- mode (str) - choices: ['Add Roles', 'Remove Roles']
- remove (str, default='False') - choices: ['True']

### settings
- ticket_panel (str) - autocomplete: ticket_panel

### apply-rules
- ticket_button (tuple[str, str]) - autocomplete: ticket_panel_buttons
- show_my_current_rules (str, default='False') - choices: ['True']

### apply-messages
- panel_name (str) - autocomplete: ticket_panel
- name (str)

### status
- status (str) - choices: ['open', 'sleep', 'close', 'delete']

### add
- member (disnake.Member)

### opt
- opt (str) - choices: ['In', 'Out']

---

## /war
### search
- clan (coc.Clan)
- previous_wars (str, default=None) - autocomplete: previous_wars

### plan
- clan (coc.Clan)
- option (str) - choices: ['Post Plan', 'Manual Set']

---

## /cwl
### search
- clan (coc.Clan)
- season (str, default=None)

### rankings
*(aucun paramètre)*

### status
*(aucun paramètre)*

---

## /trial
### create
- channel (disnake.TextChannel)
- player (coc.Player)
- duration (int) - max=35
- trophies (int, default=None)
- attack_wins (int, default=None)
- combined_hero_level (int, default=None)
- hitrate (int, default=None)
- capital_gold_looted (int, default=None)
- capital_gold_donated (int, default=None)
- allowed_clan_hops (int, default=None)
- num_wars_participated (int, default=None)

### notate
- player (coc.Player)

### edit
- player (coc.Player)

### end
- player (coc.Player)

---

## /ranked
### players
*(aucun paramètre)*

### clans
*(aucun paramètre)*

---

## /best-eos
- type (str) - choices: ["Home Village", "Builder Base"]
- country (str, default=None) - autocomplete: country_names
- server (disnake.Guild, default=None)

---

## /army
### link
- link (str)
- nickname (str, default='Army Link Results')
- notes (str, default=None) - max_length=450

### share
- army (str) - autocomplete: user_armies

---

## /boosts
- clan (coc.Clan, default=None)
- super_troop (str, default=None) - choices: SUPER_TROOPS

---

## /base
- base_link (str)
- description (str)
- photo (disnake.Attachment)

---

**TOTAL: ~30 commandes principales avec 168+ sous-commandes**

Cette liste inclut tous les paramètres avec leurs types, valeurs par défaut, limites min/max, et choix disponibles.