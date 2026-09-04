import {
  CreateServerEmbedEndpoint,
  CreateTicketButtonEndpoint,
  CreateTicketPanelEndpoint,
  DeleteServerEmbedEndpoint,
  DeleteTicketButtonEndpoint,
  DeleteTicketPanelEndpoint,
  ServerEmbedsEndpoint,
  TicketPanelsEndpoint,
  UpdateServerEmbedEndpoint,
  UpdateTicketApproveMessagesEndpoint,
  UpdateTicketButtonAppearanceEndpoint,
  UpdateTicketButtonSettingsEndpoint,
  UpdateTicketPanelEndpoint,
} from "@clashking/api-contracts";

import { BaseApiClient } from '../core/base-client';
import type { ApiResponse } from '../types/common';
import type {
  CreateButtonRequest,
  CreatePanelRequest,
  ServerEmbedsResponse,
  TicketPanelsResponse,
  UpdateApproveMessagesRequest,
  UpdateButtonAppearanceRequest,
  UpdateButtonSettingsRequest,
  UpdateTicketPanelRequest,
  UpsertEmbedRequest,
} from '../types/tickets';

export class TicketsClient extends BaseApiClient {
  async getPanels(serverId: string): Promise<ApiResponse<TicketPanelsResponse>> {
    return this.executeEndpoint(TicketPanelsEndpoint, {
      path: { serverId },
      query: {},
      body: {},
    });
  }

  async createPanel(
    serverId: string,
    data: CreatePanelRequest,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.executeEndpoint(CreateTicketPanelEndpoint, {
      path: { serverId },
      query: {},
      body: data,
    });
  }

  async deletePanel(
    serverId: string,
    panelName: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.executeEndpoint(DeleteTicketPanelEndpoint, {
      path: { serverId, panelName },
      query: {},
      body: {},
    });
  }

  async createButton(
    serverId: string,
    panelName: string,
    data: CreateButtonRequest,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.executeEndpoint(CreateTicketButtonEndpoint, {
      path: { serverId, panelName },
      query: {},
      body: data,
    });
  }

  async deleteButton(
    serverId: string,
    panelName: string,
    customId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.executeEndpoint(DeleteTicketButtonEndpoint, {
      path: { serverId, panelName, customId },
      query: {},
      body: {},
    });
  }

  async updateButtonAppearance(
    serverId: string,
    panelName: string,
    customId: string,
    data: UpdateButtonAppearanceRequest,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.executeEndpoint(UpdateTicketButtonAppearanceEndpoint, {
      path: { serverId, panelName, customId },
      query: {},
      body: data,
    });
  }

  async updatePanel(
    serverId: string,
    panelName: string,
    data: UpdateTicketPanelRequest,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.executeEndpoint(UpdateTicketPanelEndpoint, {
      path: { serverId, panelName },
      query: {},
      body: data,
    });
  }

  async updateButtonSettings(
    serverId: string,
    panelName: string,
    customId: string,
    data: UpdateButtonSettingsRequest,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.executeEndpoint(UpdateTicketButtonSettingsEndpoint, {
      path: { serverId, panelName, customId },
      query: {},
      body: data,
    });
  }

  async updateApproveMessages(
    serverId: string,
    panelName: string,
    data: UpdateApproveMessagesRequest,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.executeEndpoint(UpdateTicketApproveMessagesEndpoint, {
      path: { serverId, panelName },
      query: {},
      body: data,
    });
  }

  async getEmbeds(serverId: string): Promise<ApiResponse<ServerEmbedsResponse>> {
    return this.executeEndpoint(ServerEmbedsEndpoint, {
      path: { serverId },
      query: {},
      body: {},
    });
  }

  async createEmbed(
    serverId: string,
    data: UpsertEmbedRequest,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.executeEndpoint(CreateServerEmbedEndpoint, {
      path: { serverId },
      query: {},
      body: data,
    });
  }

  async updateEmbed(
    serverId: string,
    embedName: string,
    data: UpsertEmbedRequest,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.executeEndpoint(UpdateServerEmbedEndpoint, {
      path: { serverId, embedName },
      query: {},
      body: data,
    });
  }

  async deleteEmbed(
    serverId: string,
    embedName: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.executeEndpoint(DeleteServerEmbedEndpoint, {
      path: { serverId, embedName },
      query: {},
      body: {},
    });
  }
}
