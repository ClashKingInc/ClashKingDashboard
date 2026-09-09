/** Player API client backed by the shared endpoint contracts. */

import {
  ProxyPlayerEndpoint,
} from "@clashking/api-contracts";

import { BaseApiClient } from "../core/base-client";

export class PlayerClient extends BaseApiClient {
  async getPlayerInfo(
    playerTag: string,
  ) {
    return this.executeEndpoint(ProxyPlayerEndpoint, {
      path: { playerTag },
      query: {},
      body: {},
    });
  }
}
