import apiClient from "../apiClient.ts";
import { normalizeApiList } from "../apiUtils.ts";
import type { Market, MarketCategory, SportingEvent } from "../../types/api.ts";

export type PublicSport = string;
export interface PublicMarketCard {
  id: string;
  sport: PublicSport;
  teams: string[];
  subject: string;
  question: string;
  status: string;
  closesAt: string;
  outcomes: string[];
  result?: string;
  sportingEventId?: string;
}
export function adaptPublicMarket(market: Market): PublicMarketCard {
  const sport = market.sport?.name || "Other";
  const teams = (market.sporting_event?.participants || [])
    .map((entry) => entry.participant.name)
    .filter(Boolean);
  const winner = market.outcomes.find(
    (outcome) => outcome.id === market.winning_outcome,
  )?.label;
  return {
    id: market.id,
    sport,
    teams,
    subject: teams.length ? teams.join(" vs ") : market.subject.name,
    question: market.question,
    status: market.status,
    closesAt: market.closes_at,
    outcomes: market.outcomes.map((outcome) => outcome.label),
    result: market.status === "VOIDED" ? "Voided" : winner,
    sportingEventId: market.sporting_event?.id,
  };
}
const markets = async (params: Record<string, string>) =>
  normalizeApiList<Market>(
    (await apiClient.get("/markets/", { params })).data,
  ).map(adaptPublicMarket);
export const fetchOpenMarkets = () => markets({ status: "OPEN" });
export const fetchFeaturedMarkets = () =>
  markets({ status: "OPEN", is_featured: "true" });
export const fetchResolvedMarkets = () => markets({ status: "RESOLVED" });
export const fetchMarketCategories = async () =>
  normalizeApiList<MarketCategory>(
    (await apiClient.get("/markets/categories/")).data,
  );
export const fetchMarketEvents = async () =>
  normalizeApiList<SportingEvent>(
    (await apiClient.get("/market-events/")).data,
  );
export const fetchMarketDiscovery = async () =>
  (await apiClient.get("/markets/discovery/")).data;
export async function fetchPublicMarkets(signal?: AbortSignal) {
  const config = { signal };
  const [categories, open] = await Promise.all([
    apiClient.get("/markets/categories/", config),
    apiClient.get("/markets/", { ...config, params: { status: "OPEN" } }),
  ]);
  const [featured, resolved, events, discovery] = await Promise.allSettled([
    apiClient.get("/markets/", {
      ...config,
      params: { status: "OPEN", is_featured: true },
    }),
    apiClient.get("/markets/", { ...config, params: { status: "RESOLVED" } }),
    apiClient.get("/market-events/", config),
    apiClient.get("/markets/discovery/", config),
  ]);
  return {
    categories: normalizeApiList<MarketCategory>(categories.data),
    open: normalizeApiList<Market>(open.data).map(adaptPublicMarket),
    featured:
      featured.status === "fulfilled"
        ? normalizeApiList<Market>(featured.value.data).map(adaptPublicMarket)
        : [],
    resolved:
      resolved.status === "fulfilled"
        ? normalizeApiList<Market>(resolved.value.data).map(adaptPublicMarket)
        : [],
    events:
      events.status === "fulfilled"
        ? normalizeApiList<SportingEvent>(events.value.data)
        : [],
    discovery: discovery.status === "fulfilled" ? discovery.value.data : null,
    optionalErrors: {
      featured: featured.status === "rejected",
      resolved: resolved.status === "rejected",
      events: events.status === "rejected",
      discovery: discovery.status === "rejected",
    },
  };
}
