import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "../apiClient.ts";
import {
  adaptPublicMarket,
  fetchPublicMarkets,
} from "./publicMarketsService.ts";
import type { Market } from "../../types/api.ts";

vi.mock("../apiClient.ts", () => ({ default: { get: vi.fn() } }));
const get = vi.mocked(apiClient.get);

const market = {
  id: "m1",
  question: "Will the home team win?",
  scope_type: "EVENT",
  status: "OPEN",
  opens_at: "2026-01-01",
  closes_at: "2026-01-02",
  is_featured: true,
  sport: { id: "s1", name: "Football" },
  category: { id: "c1", name: "Result" },
  sporting_event: {
    id: "e1",
    name: "A v B",
    event_type: "MATCH",
    status: "SCHEDULED",
    starts_at: "2026-01-02",
    sport: { id: "s1", name: "Football" },
    participants: [
      { role: "HOME", position: 1, participant: { id: "p1", name: "A" } },
      { role: "AWAY", position: 2, participant: { id: "p2", name: "B" } },
    ],
  },
  subject: { type: "EVENT", id: "e1", name: "A v B" },
  outcomes: [
    { id: "yes", side: "YES", position: 1, label: "Yes" },
    { id: "no", side: "NO", position: 2, label: "No" },
  ],
  winning_outcome: null,
  is_watchlisted: false,
} as Market;

describe("public market adapter", () => {
  it("uses backend sport, participants, outcomes, status and close time", () =>
    expect(adaptPublicMarket(market)).toMatchObject({
      sport: "Football",
      subject: "A vs B",
      outcomes: ["Yes", "No"],
      status: "OPEN",
      closesAt: "2026-01-02",
    }));
  it("falls back to the backend subject without inventing teams", () =>
    expect(
      adaptPublicMarket({
        ...market,
        sporting_event: null,
        subject: { type: "CUSTOM", id: null, name: "League champion" },
      }).subject,
    ).toBe("League champion"));
  it("labels voided markets honestly", () =>
    expect(adaptPublicMarket({ ...market, status: "VOIDED" }).result).toBe(
      "Voided",
    ));
  it("preserves an unknown backend sport name", () =>
    expect(
      adaptPublicMarket({
        ...market,
        sport: { id: "s2", name: "Cricket" },
      }).sport,
    ).toBe("Cricket"));
});

describe("public markets loading resilience", () => {
  beforeEach(() => get.mockReset());

  it("keeps primary categories and open markets when optional endpoints fail", async () => {
    get
      .mockResolvedValueOnce({ data: [{ id: "c1", name: "Winner" }] })
      .mockResolvedValueOnce({ data: [market] })
      .mockRejectedValueOnce(new Error("featured unavailable"))
      .mockRejectedValueOnce(new Error("resolved unavailable"))
      .mockRejectedValueOnce(new Error("events unavailable"))
      .mockRejectedValueOnce(new Error("discovery unavailable"));
    const result = await fetchPublicMarkets();
    expect(result.categories).toHaveLength(1);
    expect(result.open).toHaveLength(1);
    expect(result.featured).toEqual([]);
    expect(result.events).toEqual([]);
    expect(result.discovery).toBeNull();
    expect(result.optionalErrors.discovery).toBe(true);
  });

  it("fails when the primary open-market request fails", async () => {
    get
      .mockResolvedValueOnce({ data: [] })
      .mockRejectedValueOnce(new Error("open unavailable"));
    await expect(fetchPublicMarkets()).rejects.toThrow("open unavailable");
  });
});
