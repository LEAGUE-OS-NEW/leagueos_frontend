import { Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { verifyTicketPayment } from "../../../services/ticketCheckoutService";
import styles from "./TicketCheckoutPage.module.css";

function TicketPaymentProcessingPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();

    const txRef = useMemo(() => {
        const stateTxRef = (location.state as { tx_ref?: string } | null)?.tx_ref;
        const storedCheckout = localStorage.getItem("league_os_pending_ticket_checkout");

        if (stateTxRef) return stateTxRef;
        if (searchParams.get("tx_ref")) return searchParams.get("tx_ref") ?? "";
        if (searchParams.get("reference")) return searchParams.get("reference") ?? "";

        if (storedCheckout) {
            try {
                const parsed = JSON.parse(storedCheckout) as { tx_ref?: string };
                return parsed.tx_ref ?? "";
            } catch {
                return "";
            }
        }

        return "";
    }, [location.state, searchParams]);

    useEffect(() => {
        let isMounted = true;

        const timeoutId = window.setTimeout(() => {
            async function verifyPayment() {
                if (!txRef) {
                    navigate("/tickets/payment/failed", {
                        replace: true,
                        state: {
                            message: "Missing Flutterwave transaction reference.",
                        },
                    });
                    return;
                }

                try {
                    const response = await verifyTicketPayment(txRef);

                    if (!isMounted) return;

                    localStorage.removeItem("league_os_pending_ticket_checkout");

                    navigate("/tickets/payment/success", {
                        replace: true,
                        state: response,
                    });
                } catch {
                    if (!isMounted) return;

                    navigate("/tickets/payment/failed", {
                        replace: true,
                        state: {
                            message:
                                "Flutterwave payment verification failed. Please retry or contact support.",
                            tx_ref: txRef,
                        },
                    });
                }
            }

            void verifyPayment();
        }, 0);

        return () => {
            isMounted = false;
            window.clearTimeout(timeoutId);
        };
    }, [navigate, txRef]);

    return (
        <section className={styles.statePage}>
            <div className={styles.stateCard}>
                <span>
                    <Loader2 size={46} strokeWidth={2.3} aria-hidden="true" />
                </span>

                <h1>Verifying Ticket Payment</h1>
                <p>
                    Please wait while League OS confirms your Flutterwave payment and
                    issues your ticket QR codes.
                </p>

                <div className={styles.stateNote}>
                    <ShieldCheck size={18} strokeWidth={2.3} aria-hidden="true" />
                    Do not close this page until verification is complete.
                </div>
            </div>
        </section>
    );
}

export default TicketPaymentProcessingPage;
