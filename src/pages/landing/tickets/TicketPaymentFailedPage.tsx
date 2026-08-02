import { AlertTriangle, RefreshCw } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import styles from "./TicketCheckoutPage.module.css";

function TicketPaymentFailedPage() {
    const location = useLocation();
    const state = location.state as { message?: string; tx_ref?: string } | null;

    return (
        <section className={styles.statePage}>
            <div className={styles.stateCard}>
                <span className={styles.failedIcon}>
                    <AlertTriangle size={52} strokeWidth={2.3} aria-hidden="true" />
                </span>

                <h1>Ticket Payment Not Completed</h1>
                <p>
                    {state?.message ??
                        "We could not confirm your ticket payment. You can retry checkout or contact support."}
                </p>

                {state?.tx_ref ? (
                    <div className={styles.stateNote}>Reference: {state.tx_ref}</div>
                ) : null}

                <div className={styles.stateActions}>
                    <Link to="/tickets">
                        <RefreshCw size={18} strokeWidth={2.4} aria-hidden="true" />
                        Retry Checkout
                    </Link>
                    <Link to="/profile/support">Contact Support</Link>
                </div>
            </div>
        </section>
    );
}

export default TicketPaymentFailedPage;
