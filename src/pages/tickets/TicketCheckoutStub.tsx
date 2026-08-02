import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiClock } from 'react-icons/fi';
import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import { TICKET_EVENTS, formatUGX } from '../../data/ticketEvents';
import './TicketCheckoutStub.css';

function TicketCheckoutStub() {
  const { id } = useParams<{ id: string }>();
  const event = TICKET_EVENTS.find((item) => item.id === id);

  return (
    <div className="checkout-stub-page">
      <Navbar />

      <main className="checkout-stub-main">
        <div className="checkout-stub-card">
          <span className="checkout-stub-icon">
            <FiClock aria-hidden="true" />
          </span>

          <h1>Checkout is coming soon</h1>
          <p>
            Online ticket checkout is launching soon. We&rsquo;ll email you when tickets for this
            match go live.
          </p>

          {event && (
            <div className="checkout-stub-summary">
              <b>
                {event.teamA} vs {event.teamB}
              </b>
              <span>
                {event.date} &bull; {event.time}
              </span>
              <span>
                {event.venue}, {event.city}
              </span>
              <span className="checkout-stub-price">From {formatUGX(event.priceFrom)}</span>
            </div>
          )}

          <button type="button" className="checkout-stub-disabled-btn" disabled>
            Payment coming soon
          </button>

          <Link to="/tickets" className="checkout-stub-back-link">
            <FiArrowLeft /> Back to Tickets
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default TicketCheckoutStub;
