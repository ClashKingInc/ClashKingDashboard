import {
  ServerPanelEndpoint,
  UpdateServerPanelEndpoint,
} from "@clashking/api-contracts";

import { BaseApiClient } from '../core/base-client';
import type { ApiResponse } from '../types/common';
import type { ServerPanel, UpdatePanelRequest } from '../types/panels';

export class PanelsClient extends BaseApiClient {
  async getPanel(serverId: string): Promise<ApiResponse<ServerPanel>> {
    return this.executeEndpoint(ServerPanelEndpoint, {
      path: { serverId },
      query: {},
      body: {},
    });
  }

  async updatePanel(serverId: string, data: UpdatePanelRequest): Promise<ApiResponse<ServerPanel>> {
    return this.executeEndpoint(UpdateServerPanelEndpoint, {
      path: { serverId },
      query: {},
      body: data,
    });
  }
}
