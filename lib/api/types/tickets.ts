export interface THRequirement {
  TH: number;
  BK: number;
  AQ: number;
  GW: number;
  RC: number;
  WARST: number;
}

export interface TicketButton {
  custom_id: string;
  label: string;
  style: number;
  emoji?: { id?: string; name?: string; animated?: boolean } | null;
  type: number;
}

export interface TicketButtonSettings {
  questions: string[];
  mod_role: string[];
  no_ping_mod_role: string[];
  private_thread: boolean;
  th_min: number;
  num_apply: number;
  naming: string;
  account_apply: boolean;
  player_info: boolean;
  apply_clans: string[];
  roles_to_add: string[];
  roles_to_remove: string[];
  townhall_requirements: Record<string, THRequirement>;
  new_message: string | null;
}

export interface ApproveMessage {
  name: string;
  message: string;
}

export interface TicketPanel {
  name: string;
  server_id: number;
  embed_name: string | null;
  components: TicketButton[];
  button_settings: Record<string, TicketButtonSettings>;
  open_category: string | null;
  sleep_category: string | null;
  closed_category: string | null;
  status_change_log: string | null;
  ticket_button_click_log: string | null;
  ticket_close_log: string | null;
  approve_messages: ApproveMessage[];
}

export interface TicketPanelsResponse {
  items: TicketPanel[];
  total: number;
  available_embeds: string[];
}

export interface LinkedAccount {
  player_tag: string;
  player_name: string | null;
  town_hall: number | null;
}

export interface OpenTicket {
  channel: string;
  channel_exists: boolean;
  user: string;
  discord_username: string | null;
  discord_display_name: string | null;
  discord_avatar_url: string | null;
  thread: string | null;
  server: string;
  status: 'open' | 'sleep' | 'closed' | 'delete';
  number: number;
  apply_account: string | null;
  panel: string;
  category_id: string | null;
  category_name: string | null;
  set_clan: string | null;
  linked_accounts?: LinkedAccount[] | null;
}

export interface OpenTicketsResponse {
  items: OpenTicket[];
  total: number;
}

export interface UpdateOpenTicketStatusRequest {
  status: 'open' | 'sleep' | 'closed' | 'delete';
}

export interface UpdateOpenTicketClanRequest {
  set_clan: string | null;
}

export interface UpdateTicketPanelRequest {
  open_category?: string | null;
  sleep_category?: string | null;
  closed_category?: string | null;
  status_change_log?: string | null;
  ticket_button_click_log?: string | null;
  ticket_close_log?: string | null;
  embed_name?: string | null;
}

export interface UpdateButtonSettingsRequest {
  questions: string[];
  mod_role: string[];
  no_ping_mod_role: string[];
  private_thread: boolean;
  th_min: number;
  num_apply: number;
  naming: string;
  account_apply: boolean;
  player_info: boolean;
  apply_clans: string[];
  roles_to_add: string[];
  roles_to_remove: string[];
  townhall_requirements: Record<string, THRequirement>;
  new_message: string | null;
}

export interface UpdateApproveMessagesRequest {
  messages: ApproveMessage[];
}

export interface ServerEmbed {
  name: string;
  data: Record<string, any> | null;
}

export interface ServerEmbedsResponse {
  items: ServerEmbed[];
  total: number;
}

export interface UpsertEmbedRequest {
  name: string;
  data: Record<string, any>;
}

export interface CreatePanelRequest {
  name: string;
}

export interface CreateButtonRequest {
  label: string;
  style: number;
  emoji?: { id?: string; name?: string; animated?: boolean } | null;
}

export interface UpdateButtonAppearanceRequest {
  label: string;
  style: number;
  emoji?: { id?: string; name?: string; animated?: boolean } | null;
}
