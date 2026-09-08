import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Markets from "./Markets.tsx";
import {
  fetchMarketStats,
  fetchPublicMarkets,
} from "../../services/markets/publicMarketsService.ts";
import { fetchPublishedMarkets } from "../../services/marketAdminService.ts";
import type { Market } from "../../services/marketAdminService.ts";

vi.mock("../../components/landing/Navbar", () => ({
  default: () => <nav>Navigation</nav>,
}));
vi.mock("../../components/landing/Footer", () => ({
  default: () => <footer>Footer</footer>,
}));
vi.mock("../../services/markets/publicMarketsService.ts", () => ({
  fetchPublicMarkets: vi.fn(),
  fetchMarketStats: vi.fn(),
}));
vi.mock("../../services/marketAdminService.ts", () => ({
  fetchPublishedMarkets: vi.fn(),
}));

const emptyResponse = {
  categories: [],
  open: [],
  featured: [],
  resolved: [],
  events: [],
  discovery: null,
  optionalErrors: {
    featured: false,
    resolved: false,
    events: false,
    discovery: false,
  },
};

const openMarket: Market = {
  faceValueUgx: 10000,
  id: "market-1",
  eventLabel: "KCCA FC vs SC Villa",
  competition: "Uganda Premier League",
  venue: "Philip Omondi Stadium",
  kickoff: "2026-08-06T12:00:00Z",
  category: "Football",
  question: "Will KCCA FC win?",
  description: "",
  tags: [],
  outcomes: [
    { id: "YES", label: "Yes", description: "", probabilityPct: 55, price: 550, openingProbabilityPct: 55, openingPrice: 550, bestBid: null, bestAsk: null, lastTrade: null },
    { id: "NO", label: "No", description: "", probabilityPct: 45, price: 450, openingProbabilityPct: 45, openingPrice: 450, bestBid: null, bestAsk: null, lastTrade: null },
  ],
  parameters: {
    opensAt: "2026-08-01T00:00:00Z",
    closesAt: "2026-08-06T11:50:00Z",
    settlesBy: "2026-08-06T15:00:00Z",
    initialLiquidityUgx: 500_000,
    liquiditySource: 'PLATFORM_TREASURY', openingSpreadBps: 100,
    minTradeUgx: 1_000,
    maxTradeUgx: 500_000,
    featured: false,
    trending: false,
    recommended: false,
    inPlayTrading: false,
  },
  status: "Live",
  createdBy: "Test Admin",
  createdAt: "2026-08-01T00:00:00Z",
  auditHistory: [],
  isSettled: false,
  isRefunded: false,
};

function renderMarkets() {
  return render(
    <MemoryRouter>
      <Markets />
    </MemoryRouter>,
  );
}

describe("Markets API states", () => {
  beforeEach(() => {
    vi.mocked(fetchPublicMarkets).mockReset().mockResolvedValue(emptyResponse);
    vi.mocked(fetchMarketStats).mockReset().mockResolvedValue({
      total_markets: 22,
      open_markets: 18,
      live_markets: 3,
      featured_open_markets: 5,
      total_volume_ugx: "0.00",
      trader_count: 0,
      sports: [
        {
          id: "football-id",
          name: "Football",
          code: "FOOTBALL",
          slug: "football",
          total_markets: 11,
          open_markets: 9,
          live_markets: 2,
          featured_open_markets: 2,
          total_volume_ugx: "0.00",
          trader_count: 0,
        },
        {
          id: "rugby-id",
          name: "Rugby",
          code: "RUGBY",
          slug: "rugby",
          total_markets: 7,
          open_markets: 6,
          live_markets: 1,
          featured_open_markets: 2,
          total_volume_ugx: "0.00",
          trader_count: 0,
        },
        {
          id: "basketball-id",
          name: "Basketball",
          code: "BASKETBALL",
          slug: "basketball",
          total_markets: 4,
          open_markets: 3,
          live_markets: 0,
          featured_open_markets: 1,
          total_volume_ugx: "0.00",
          trader_count: 0,
        },
      ],
    });
    vi.mocked(fetchPublishedMarkets).mockReset();
  });

  it("renders sport counts from the live market stats API", async () => {
    vi.mocked(fetchPublishedMarkets).mockResolvedValue([]);

    renderMarkets();

    expect(await screen.findByText("11 markets")).toBeInTheDocument();
    expect(screen.getByText("7 markets")).toBeInTheDocument();
    expect(screen.getByText("4 markets")).toBeInTheDocument();

    expect(fetchMarketStats).toHaveBeenCalledTimes(1);
  });

  it("shows authoritative prices without fabricating contract-derived metrics", async () => {
    vi.mocked(fetchPublishedMarkets).mockResolvedValue([openMarket]);
    renderMarkets();

    expect(
      await screen.findAllByText("UGX 550/share"),
    ).not.toHaveLength(0);

    expect(
      screen.getAllByText("UGX 450/share"),
    ).not.toHaveLength(0);

    expect(
      screen.getByText("Not traded yet"),
    ).toBeInTheDocument();

    expect(
      screen.queryByText("55% likely YES"),
    ).not.toBeInTheDocument();
  });

  it("shows the existing loading state", async () => {
    let resolveRequest!: (value: Market[]) => void;
    vi.mocked(fetchPublishedMarkets).mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    renderMarkets();
    expect(screen.getByText("Loading live markets…")).toBeInTheDocument();
    resolveRequest([]);
    await screen.findByText("No open markets for this sport right now.");
  });

  it("shows the existing empty state after a successful empty response", async () => {
    vi.mocked(fetchPublishedMarkets).mockResolvedValue([]);
    renderMarkets();
    expect(
      await screen.findByText("No open markets for this sport right now."),
    ).toBeInTheDocument();
  });

  it("shows a retryable error when the primary request fails", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchPublishedMarkets)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([]);
    renderMarkets();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to reach League OS. Please try again.",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText("Loading live markets…")).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("No open markets for this sport right now.");
  });

  it("returns to loading when retry is invoked", async () => {
    const user = userEvent.setup();
    let resolveRetry!: (value: Market[]) => void;
    vi.mocked(fetchPublishedMarkets)
      .mockRejectedValueOnce(new Error("offline"))
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveRetry = resolve;
        }),
      );
    renderMarkets();
    await user.click(await screen.findByRole("button", { name: "Retry" }));
    expect(screen.getByText("Loading live markets…")).toBeInTheDocument();
    expect(fetchPublishedMarkets).toHaveBeenCalledTimes(2);
    resolveRetry([]);
    await screen.findByText("No open markets for this sport right now.");
  });

  it("shows permission-aware copy for a 403 instead of the raw response", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchPublishedMarkets)
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 403, data: { detail: "raw axios forbidden" } },
      })
      .mockResolvedValueOnce([]);
    renderMarkets();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "You do not have permission to view these markets.",
    );
    expect(alert).not.toHaveTextContent("raw axios forbidden");
    await waitFor(() =>
      expect(screen.queryByText("Loading live markets…")).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("No open markets for this sport right now.");
  });

  it("keeps open markets visible when the fixtures widget fails", async () => {
    vi.mocked(fetchPublicMarkets).mockRejectedValue(new Error("fixtures endpoint down"));
    vi.mocked(fetchPublishedMarkets).mockResolvedValue([openMarket]);
    renderMarkets();
    expect(await screen.findByText("KCCA FC vs SC Villa")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByText("No open markets for this sport right now."),
      ).not.toBeInTheDocument(),
    );
  });
});
