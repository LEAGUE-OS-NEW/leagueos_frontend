import { CheckCircle2, Ticket } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { VerifyTicketPaymentResponse } from "../../../services/ticketCheckoutService";
import styles from "./TicketCheckoutPage.module.css";

function TicketPaymentSuccessPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const paymentState = location.state as VerifyTicketPaymentResponse | null;

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            navigate("/dashboard/tickets", { replace: true });
        }, 2500);

        return () => window.clearTimeout(timeoutId);
    }, [navigate]);

    return (
        <section className={styles.statePage}>
            <div className={styles.stateCard}>
                <span className={styles.successIcon}>
                    <CheckCircle2 size={52} strokeWidth={2.3} aria-hidden="true" />
                </span>

                <h1>Ticket Payment Successful</h1>
                <p>
                    Your payment has been verified and your ticket QR codes are ready in
                    My Tickets. We will redirect you to your ticket dashboard.
                </p>

                {paymentState?.order ? (
                    <dl className={styles.successSummary}>
                        <div>
                            <dt>Order ID</dt>
                            <dd>#{paymentState.order.id}</dd>
                        </div>
                        <div>
                            <dt>Total Paid</dt>
                            <dd>
                                {paymentState.order.currency} {paymentState.order.total_amount}
                            </dd>
                        </div>
                        <div>
                            <dt>Tickets Issued</dt>
                            <dd>{paymentState.tickets?.length ?? paymentState.order.tickets_count ?? 0}</dd>
                        </div>
                    </dl>
                ) : null}

                <div className={styles.stateActions}>
                    <Link to="/dashboard/tickets">
                        <Ticket size={18} strokeWidth={2.4} aria-hidden="true" />
                        View My Tickets Now
                    </Link>
                    <Link to="/tickets">Buy More Tickets</Link>
                </div>
            </div>
        </section>
    );
}

export default TicketPaymentSuccessPage;
