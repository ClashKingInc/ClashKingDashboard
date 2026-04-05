import { BaseApiClient } from '../core/base-client';
import type { ApiResponse } from '../types/common';
import type {
  CreateButtonRequest,
  CreatePanelRequest,
  OpenTicketsResponse,
  ServerEmbedsResponse,
  TicketPanelsResponse,
  UpdateApproveMessagesRequest,
  UpdateButtonAppearanceRequest,
  UpdateButtonSettingsRequest,
  UpdateOpenTicketClanRequest,
  UpdateOpenTicketStatusRequest,
  UpdateTicketPanelRequest,
  UpsertEmbedRequest,
} from '../types/tickets';

export class TicketsClient extends BaseApiClient {
  async getPanels(serverId: string | number): Promise<ApiResponse<TicketPanelsResponse>> {
    return this.request(`/v2/server/${serverId}/tickets`, { method: 'GET' });
  }

  async createPanel(
    serverId: string | number,
    data: CreatePanelRequest,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/v2/server/${serverId}/tickets`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deletePanel(
    serverId: string | number,
    panelName: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/v2/server/${serverId}/tickets/${encodeURIComponent(panelName)}`, {
      method: 'DELETE',
    });
  }

  async createButton(
    serverId: string | number,
    panelName: string,
    data: CreateButtonRequest,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(
      `/v2/server/${serverId}/tickets/${encodeURIComponent(panelName)}/buttons`,
      { method: 'POST', body: JSON.stringify(data) },
    );
  }

  async deleteButton(
    serverId: string | number,
    panelName: string,
    customId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(
      `/v2/server/${serverId}/tickets/${encodeURIComponent(panelName)}/buttons/${encodeURIComponent(customId)}`,
      { method: 'DELETE' },
    );
  }

  async updateButtonAppearance(
    serverId: string | number,
    panelName: string,
    customId: string,
    data: UpdateButtonAppearanceRequest,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(
      `/v2/server/${serverId}/tickets/${encodeURIComponent(panelName)}/buttons/${encodeURIComponent(customId)}`,
      { method: 'PATCH', body: JSON.stringify(data) },
    );
  }

  async updatePanel(
    serverId: string | number,
    panelName: string,
    data: UpdateTicketPanelRequest,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/v2/server/${serverId}/tickets/${encodeURIComponent(panelName)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateButtonSettings(
    serverId: string | number,
    panelName: string,
    customId: string,
    data: UpdateButtonSettingsRequest,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(
      `/v2/server/${serverId}/tickets/${encodeURIComponent(panelName)}/buttons/${encodeURIComponent(customId)}`,
      { method: 'PUT', body: JSON.stringify(data) },
    );
  }

  async updateApproveMessages(
    serverId: string | number,
    panelName: string,
    data: UpdateApproveMessagesRequest,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(
      `/v2/server/${serverId}/tickets/${encodeURIComponent(panelName)}/approve-messages`,
      { method: 'PUT', body: JSON.stringify(data) },
    );
  }

  async getOpenTickets(
    serverId: string | number,
    status?: string,
  ): Promise<ApiResponse<OpenTicketsResponse>> {
    const query = status ? this.buildQueryString({ status }) : '';
    return this.request(`/v2/server/${serverId}/tickets/open${query}`, { method: 'GET' });
  }

  async updateOpenTicketStatus(
    serverId: string | number,
    channelId: string,
    data: UpdateOpenTicketStatusRequest,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/v2/server/${serverId}/tickets/open/${channelId}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateOpenTicketClan(
    serverId: string | number,
    channelId: string,
    data: UpdateOpenTicketClanRequest,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/v2/server/${serverId}/tickets/open/${channelId}/clan`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteOpenTicket(
    serverId: string | number,
    channelId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/v2/server/${serverId}/tickets/open/${channelId}`, { method: 'DELETE' });
  }

  async getEmbeds(serverId: string | number): Promise<ApiResponse<ServerEmbedsResponse>> {
    return this.request(`/v2/server/${serverId}/embeds`, { method: 'GET' });
  }

  async createEmbed(
    serverId: string | number,
    data: UpsertEmbedRequest,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/v2/server/${serverId}/embeds`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEmbed(
    serverId: string | number,
    embedName: string,
    data: UpsertEmbedRequest,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/v2/server/${serverId}/embeds/${encodeURIComponent(embedName)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEmbed(
    serverId: string | number,
    embedName: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/v2/server/${serverId}/embeds/${encodeURIComponent(embedName)}`, {
      method: 'DELETE',
    });
  }
}
