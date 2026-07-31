export type THRequirement = Record<string, number>;

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
  townhall_requirement_fields: string[];
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
