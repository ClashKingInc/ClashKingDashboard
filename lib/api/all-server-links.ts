import { ServerLinksEndpoint, type EndpointResponse } from '@clashking/api-contracts';

type LinksResponse = EndpointResponse<typeof ServerLinksEndpoint>;
type PageQuery = { limit: number; offset: number; query?: string; account_filter?: 'none' };

/** Keep HTTP pages bounded while exports/statistics cover the complete guild. */
export async function fetchAllServerLinks(
  fetchPage: (query: PageQuery) => Promise<LinksResponse>,
  filters: Pick<PageQuery, 'query' | 'account_filter'> = {},
): Promise<LinksResponse> {
  const first = await fetchPage({ ...filters, limit: 5000, offset: 0 });
  const members = [...first.members];
  let offset = members.length;
  while (offset < first.filtered_members) {
    const next = await fetchPage({ ...filters, limit: 5000, offset });
    if (next.members.length === 0) throw new Error('The member list changed while loading. Please try again.');
    members.push(...next.members);
    offset += next.members.length;
  }
  if (new Set(members.map(member => member.user_id)).size !== members.length) {
    throw new Error('The member list changed while loading. Please try again.');
  }
  return { ...first, members };
}
