import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Markets from "./Markets.tsx";
import { fetchPublicMarkets } from "../../services/markets/publicMarketsService.ts";

vi.mock("../../components/landing/Navbar", () => ({
  default: () => <nav>Navigation</nav>,
}));
vi.mock("../../components/landing/Footer", () => ({
  default: () => <footer>Footer</footer>,
}));
vi.mock("../../services/markets/publicMarketsService.ts", () => ({
  fetchPublicMarkets: vi.fn(),
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

const openMarket = {
  id: "market-1",
  sport: "Football",
  teams: ["KCCA FC", "SC Villa"],
  subject: "KCCA FC vs SC Villa",
  question: "Will KCCA FC win?",
  status: "OPEN",
  closesAt: "2026-08-06T12:00:00Z",
  outcomes: ["Yes", "No"],
};

function renderMarkets() {
  return render(
    <MemoryRouter>
      <Markets />
    </MemoryRouter>,
  );
}

describe("Markets API states", () => {
  beforeEach(() => vi.mocked(fetchPublicMarkets).mockReset());

  it("shows the existing loading state", async () => {
    let resolveRequest!: (value: typeof emptyResponse) => void;
    vi.mocked(fetchPublicMarkets).mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    renderMarkets();
    expect(screen.getByText("Loading live markets…")).toBeInTheDocument();
    resolveRequest(emptyResponse);
    await screen.findByText("No open markets for this sport right now.");
  });

  it("shows the existing empty state after a successful empty response", async () => {
    vi.mocked(fetchPublicMarkets).mockResolvedValue(emptyResponse);
    renderMarkets();
    expect(
      await screen.findByText("No open markets for this sport right now."),
    ).toBeInTheDocument();
  });

  it("shows a retryable error when the primary request fails", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchPublicMarkets)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(emptyResponse);
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
    let resolveRetry!: (value: typeof emptyResponse) => void;
    vi.mocked(fetchPublicMarkets)
      .mockRejectedValueOnce(new Error("offline"))
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveRetry = resolve;
        }),
      );
    renderMarkets();
    await user.click(await screen.findByRole("button", { name: "Retry" }));
    expect(screen.getByText("Loading live markets…")).toBeInTheDocument();
    expect(fetchPublicMarkets).toHaveBeenCalledTimes(2);
    resolveRetry(emptyResponse);
    await screen.findByText("No open markets for this sport right now.");
  });

  it("shows permission-aware copy for a 403 instead of the raw response", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchPublicMarkets)
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 403, data: { detail: "raw axios forbidden" } },
      })
      .mockResolvedValueOnce(emptyResponse);
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

  it("keeps open markets visible when optional sections fail", async () => {
    vi.mocked(fetchPublicMarkets).mockResolvedValue({
      ...emptyResponse,
      open: [openMarket],
      optionalErrors: {
        featured: true,
        resolved: true,
        events: true,
        discovery: true,
      },
    });
    renderMarkets();
    expect(await screen.findByText("KCCA FC vs SC Villa")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByText("No open markets for this sport right now."),
      ).not.toBeInTheDocument(),
    );
  });
});
