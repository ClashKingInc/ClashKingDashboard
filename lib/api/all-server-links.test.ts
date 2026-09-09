import { describe, expect, it, vi } from 'vitest';
import { fetchAllServerLinks } from './all-server-links';

const member = (id: number) => ({ user_id:String(id),username:'member',display_name:'Member',avatar_url:'',linked_accounts:[],account_count:0 });
const page = (members: ReturnType<typeof member>[], count = 6001) => ({members,filtered_members:count,total_members:count,roles:[],members_with_links:0,total_linked_accounts:0,verified_accounts:0});

describe('complete server links reads', () => {
  it('reads beyond 5000 members and preserves filters on later pages', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(page(Array.from({length:5000},(_,i)=>member(i))))
      .mockResolvedValueOnce(page(Array.from({length:1001},(_,i)=>member(5000+i))));
    const result = await fetchAllServerLinks(fetch,{query:'hello',account_filter:'none'});
    expect(result.members).toHaveLength(6001);
    expect(fetch).toHaveBeenNthCalledWith(2,{query:'hello',account_filter:'none',limit:5000,offset:5000});
  });
  it('does not request extra pages for an empty guild', async () => {
    const fetch = vi.fn().mockResolvedValue(page([],0));
    expect((await fetchAllServerLinks(fetch)).members).toEqual([]);
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('fails clearly on a non-advancing or shifted list instead of silently truncating', async () => {
    for (const second of [[],[member(1)]]) {
      const fetch = vi.fn().mockResolvedValueOnce(page([member(1)],2)).mockResolvedValueOnce(page(second,2));
      await expect(fetchAllServerLinks(fetch)).rejects.toThrow('member list changed');
    }
  });
});
