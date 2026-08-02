import {
    AlertTriangle,
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    CreditCard,
    Loader2,
    MapPin,
    ShieldCheck,
    Ticket,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import SafeImage from "../../../components/SafeImage/SafeImage";
import {
    getPublicFixtures,
    type PublicFixtureApi,
} from "../../../services/publicDashboardService";
import {
    getMatchTicketTypes,
    initializeTicketCheckout,
} from "../../../services/ticketCheckoutService";
import type { MatchTicketTypesResponse, TicketTypeApi } from "../../../services/ticketCheckoutService";
import styles from "./TicketCheckoutPage.module.css";

type ApiError = {
    response?: {
        data?: {
            detail?: string;
            message?: string;
            error?: string;
            ticket_type_id?: string[] | string;
            ticket_type?: string[] | string;
            quantity?: string[] | string;
            non_field_errors?: string[];
        };
    };
};

function formatCurrency(amount: number, currency = "UGX") {
    return `${currency} ${amount.toLocaleString()}`;
}

function firstApiMessage(value?: string | string[]) {
    if (Array.isArray(value)) return value[0];
    return value;
}

function getCheckoutErrorMessage(error: unknown) {
    const data = (error as ApiError).response?.data;

    return (
        firstApiMessage(data?.detail) ||
        firstApiMessage(data?.message) ||
        firstApiMessage(data?.error) ||
        firstApiMessage(data?.ticket_type_id) ||
        firstApiMessage(data?.ticket_type) ||
        firstApiMessage(data?.quantity) ||
        firstApiMessage(data?.non_field_errors) ||
        "Ticket checkout could not be initialized. Confirm the backend has active ticket types for this match and try again."
    );
}

function formatMatchDate(rawDate?: string | null) {
    if (!rawDate) {
        return { date: "Date to be confirmed", time: "Time to be confirmed" };
    }

    const date = new Date(rawDate);

    if (Number.isNaN(date.getTime())) {
        return { date: "Date to be confirmed", time: "Time to be confirmed" };
    }

    return {
        date: new Intl.DateTimeFormat("en-UG", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).format(date),
        time: new Intl.DateTimeFormat("en-UG", {
            hour: "numeric",
            minute: "2-digit",
        }).format(date),
    };
}

function splitMatchLabel(label: string) {
    const normalized = label.replace(/\s+v\s+/i, " vs ");
    const [home, away] = normalized.split(/\s+vs\s+/i);

    return {
        home: home?.trim() || "Home Team",
        away: away?.trim() || "Away Team",
    };
}

function teamInitials(name: string) {
    return (
        name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("") || "LO"
    );
}

function CheckoutTeam({ name, logo }: { name: string; logo?: string | null }) {
    return (
        <div className={styles.checkoutTeam}>
            <SafeImage
                src={logo}
                alt={name}
                className={styles.checkoutTeamLogo}
                fallbackClassName={styles.checkoutTeamFallback}
                fallback={teamInitials(name)}
            />
            <strong>{name}</strong>
        </div>
    );
}

function findFixture(fixtures: PublicFixtureApi[], matchId: string) {
    return fixtures.find((fixture) => String(fixture.id) === String(matchId)) ?? null;
}

function TicketCheckoutPage() {
    const { matchId = "" } = useParams();
    const navigate = useNavigate();

    const [matchResponse, setMatchResponse] = useState<MatchTicketTypesResponse | null>(null);
    const [publicFixture, setPublicFixture] = useState<PublicFixtureApi | null>(null);
    const [ticketTypes, setTicketTypes] = useState<TicketTypeApi[]>([]);
    const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<number | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pageMessage, setPageMessage] = useState("");

    const selectedTicketType = useMemo(() => {
        return (
            ticketTypes.find((ticketType) => ticketType.id === selectedTicketTypeId) ??
            ticketTypes[0] ??
            null
        );
    }, [selectedTicketTypeId, ticketTypes]);

    const fallbackMatchLabel =
        matchResponse?.match.label ?? selectedTicketType?.match_label ?? "Match Ticket";
    const fallbackTeams = splitMatchLabel(fallbackMatchLabel);
    const homeTeam = publicFixture?.home_club_name ?? fallbackTeams.home;
    const awayTeam = publicFixture?.away_club_name ?? fallbackTeams.away;
    const matchLabel = `${homeTeam} vs ${awayTeam}`;
    const matchDate = formatMatchDate(publicFixture?.match_date ?? matchResponse?.match.match_date ?? null);
    const ticketPrice = Number(selectedTicketType?.price ?? 0);
    const totalAmount = ticketPrice * quantity;
    const remainingQuantity = selectedTicketType?.remaining_quantity ?? 0;
    const maxQuantity = Math.max(1, Math.min(10, remainingQuantity || 1));
    const venue = publicFixture?.venue || matchResponse?.match.venue || "Venue to be confirmed";
    const competitionName = publicFixture?.competition_name || "League OS Match Ticket";

    useEffect(() => {
        let isMounted = true;

        async function loadTicketTypes() {
            setIsLoading(true);
            setPageMessage("");

            try {
                const [response, fixtures] = await Promise.all([
                    getMatchTicketTypes(matchId),
                    getPublicFixtures().catch(() => [] as PublicFixtureApi[]),
                ]);

                if (!isMounted) return;

                const activeTypes = response.ticket_types.filter(
                    (ticketType) => ticketType.status === "ACTIVE",
                );

                setMatchResponse(response);
                setPublicFixture(findFixture(fixtures, matchId));
                setTicketTypes(activeTypes);
                setSelectedTicketTypeId(activeTypes[0]?.id ?? null);

                if (!activeTypes.length) {
                    setPageMessage(
                        "This match exists, but it does not currently have active ticket types.",
                    );
                }
            } catch {
                if (!isMounted) return;

                setMatchResponse(null);
                setPublicFixture(null);
                setTicketTypes([]);
                setSelectedTicketTypeId(null);
                setPageMessage(
                    "Ticket types could not be loaded for this match. Confirm the match and ticket types exist in staging.",
                );
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        void loadTicketTypes();

        return () => {
            isMounted = false;
        };
    }, [matchId]);

    async function handleCheckout() {
        if (!selectedTicketType) {
            setPageMessage("Please select a ticket type before continuing.");
            return;
        }

        setIsSubmitting(true);
        setPageMessage("");

        try {
            const response = await initializeTicketCheckout({
                ticket_type_id: selectedTicketType.id,
                quantity,
            });

            localStorage.setItem(
                "league_os_pending_ticket_checkout",
                JSON.stringify({
                    tx_ref: response.tx_ref,
                    order_id: response.order.id,
                    match_id: matchId,
                    ticket_type_id: selectedTicketType.id,
                    quantity,
                }),
            );

            if (response.checkout_url) {
                window.location.assign(response.checkout_url);
                return;
            }

            navigate("/tickets/payment/processing", {
                replace: true,
                state: { tx_ref: response.tx_ref },
            });
        } catch (error) {
            setPageMessage(getCheckoutErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className={styles.page}>
            <div className={styles.breadcrumb}>
                <Link to="/tickets">
                    <ArrowLeft size={16} strokeWidth={2.3} aria-hidden="true" />
                    Back to tickets
                </Link>
            </div>

            <header className={styles.pageHeader}>
                <div>
                    <span className={styles.eyebrow}>Secure Checkout</span>
                    <h1>Complete your match ticket order</h1>
                    <p>
                        Select your ticket category and quantity. Flutterwave will handle
                        the secure Mobile Money or card payment.
                    </p>
                </div>
            </header>

            {pageMessage ? (
                <div className={styles.notice} role="alert">
                    <AlertTriangle size={18} strokeWidth={2.3} aria-hidden="true" />
                    {pageMessage}
                </div>
            ) : null}

            <div className={styles.layoutGrid}>
                <main className={styles.mainColumn}>
                    <section className={styles.matchCard}>
                        <div className={styles.matchCardTopline}>
                            <span>{competitionName}</span>
                            <em>{matchResponse?.match.status ?? publicFixture?.status ?? "SCHEDULED"}</em>
                        </div>

                        <div className={styles.checkoutMatchTeams}>
                            <CheckoutTeam
                                name={homeTeam}
                                logo={publicFixture?.home_club_logo_url}
                            />
                            <b>VS</b>
                            <CheckoutTeam
                                name={awayTeam}
                                logo={publicFixture?.away_club_logo_url}
                            />
                        </div>

                        <h2>{matchLabel}</h2>

                        <div className={styles.matchMeta}>
                            <p>
                                <CalendarDays size={16} strokeWidth={2.3} aria-hidden="true" />
                                {matchDate.date} • {matchDate.time}
                            </p>
                            <p>
                                <MapPin size={16} strokeWidth={2.3} aria-hidden="true" />
                                {venue}
                            </p>
                        </div>
                    </section>

                    <section className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <div>
                                <h2>Select Ticket Type</h2>
                                <p>Choose one of the active ticket categories available for this match.</p>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className={styles.loadingBox}>
                                <Loader2 size={24} strokeWidth={2.3} aria-hidden="true" />
                                Loading ticket types...
                            </div>
                        ) : ticketTypes.length ? (
                            <div className={styles.ticketTypeGrid}>
                                {ticketTypes.map((ticketType) => {
                                    const isSelected = ticketType.id === selectedTicketTypeId;

                                    return (
                                        <button
                                            type="button"
                                            key={ticketType.id}
                                            className={
                                                isSelected
                                                    ? `${styles.ticketTypeCard} ${styles.selectedTicketType}`
                                                    : styles.ticketTypeCard
                                            }
                                            onClick={() => {
                                                setSelectedTicketTypeId(ticketType.id);
                                                setQuantity(1);
                                            }}
                                        >
                                            <span>
                                                <Ticket size={22} strokeWidth={2.3} aria-hidden="true" />
                                            </span>

                                            <div>
                                                <h3>{ticketType.name}</h3>
                                                <p>{ticketType.description || "Match access ticket."}</p>
                                            </div>

                                            <strong>
                                                {formatCurrency(Number(ticketType.price), ticketType.currency)}
                                            </strong>
                                            <small>{ticketType.remaining_quantity} tickets available</small>

                                            {isSelected ? (
                                                <em>
                                                    <CheckCircle2 size={15} strokeWidth={2.4} />
                                                    Selected
                                                </em>
                                            ) : null}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className={styles.loadingBox}>No active ticket types are available.</div>
                        )}
                    </section>
                </main>

                <aside className={styles.checkoutPanel}>
                    <div className={styles.sideHeader}>
                        <span>
                            <CreditCard size={24} strokeWidth={2.3} aria-hidden="true" />
                        </span>
                        <div>
                            <h2>Order Summary</h2>
                            <p>Review your ticket order before payment.</p>
                        </div>
                    </div>

                    <dl className={styles.summaryList}>
                        <div>
                            <dt>Match</dt>
                            <dd>{matchLabel}</dd>
                        </div>
                        <div>
                            <dt>Ticket Type</dt>
                            <dd>{selectedTicketType?.name ?? "Select a ticket type"}</dd>
                        </div>
                        <div>
                            <dt>Unit Price</dt>
                            <dd>{formatCurrency(ticketPrice, selectedTicketType?.currency)}</dd>
                        </div>
                    </dl>

                    <label className={styles.quantityField}>
                        Quantity
                        <select
                            value={quantity}
                            onChange={(event) => setQuantity(Number(event.target.value))}
                            disabled={!selectedTicketType}
                        >
                            {Array.from({ length: maxQuantity }, (_, index) => index + 1).map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className={styles.totalRow}>
                        <span>Total</span>
                        <strong>{formatCurrency(totalAmount, selectedTicketType?.currency)}</strong>
                    </div>

                    <button
                        type="button"
                        className={styles.checkoutButton}
                        onClick={() => void handleCheckout()}
                        disabled={isLoading || isSubmitting || !selectedTicketType}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={18} strokeWidth={2.4} aria-hidden="true" />
                                Redirecting...
                            </>
                        ) : (
                            <>
                                <ShieldCheck size={18} strokeWidth={2.4} aria-hidden="true" />
                                Pay with Flutterwave
                            </>
                        )}
                    </button>

                    <p className={styles.secureNote}>
                        You will be redirected to Flutterwave checkout, then returned to
                        League OS for payment verification.
                    </p>
                </aside>
            </div>
        </section>
    );
}

export default TicketCheckoutPage;
