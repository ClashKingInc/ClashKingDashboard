import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";

import { TenorMedia } from "./tenor-media";

const executeSharedEndpoint = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/shared-client", () => ({ executeSharedEndpoint }));

describe("TenorMedia", () => {
  it("renders only the media URL returned by the typed API contract", async () => {
    executeSharedEndpoint.mockResolvedValue({
      provider: "tenor",
      id: "tenor-42",
      media_url: "https://media.tenor.example/tenor-42.gif",
      width: 498,
      height: 280,
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <TenorMedia url="https://tenor.com/view/example-42" alt="Custom GIF" />
      </QueryClientProvider>,
    );

    const image = await screen.findByRole("img", { name: "Custom GIF" });
    expect(image).toHaveAttribute("src", "https://media.tenor.example/tenor-42.gif");
    expect(executeSharedEndpoint).toHaveBeenCalledWith(
      expect.objectContaining({ operationId: "resolveTenorMedia" }),
      {
        body: { url: "https://tenor.com/view/example-42" },
        path: {},
        query: {},
      },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
