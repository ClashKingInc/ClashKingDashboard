import { BaseApiClient } from '../core/base-client';
import type { ApiResponse } from '../types/common';
import type { ServerPanel, UpdatePanelRequest } from '../types/panels';

export class PanelsClient extends BaseApiClient {
  async getPanel(serverId: string | number): Promise<ApiResponse<ServerPanel>> {
    return this.request(`/v2/server/${serverId}/panel`, { method: 'GET' });
  }

  async updatePanel(serverId: string | number, data: UpdatePanelRequest): Promise<ApiResponse<ServerPanel>> {
    return this.request(`/v2/server/${serverId}/panel`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}
