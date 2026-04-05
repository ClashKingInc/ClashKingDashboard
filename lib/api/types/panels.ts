export const BUTTON_TYPES = [
  "Link Button",
  "Link Help Button",
  "Refresh Button",
  "To-Do Button",
  "Roster Button",
] as const;

export type ButtonType = (typeof BUTTON_TYPES)[number];

export const BUTTON_COLORS = ["Blue", "Green", "Grey", "Red"] as const;
export type ButtonColor = (typeof BUTTON_COLORS)[number];

export interface ServerPanel {
  embed_name: string | null;
  buttons: string[];
  button_color: string;
  welcome_channel: number | null;
}

export interface UpdatePanelRequest {
  embed_name: string | null;
  buttons: string[];
  button_color: string;
  welcome_channel: number | null;
}
