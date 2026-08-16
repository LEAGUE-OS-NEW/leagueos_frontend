import { Link } from 'react-router-dom';
import { GiTicket } from 'react-icons/gi';
import { useDashboardSection } from '../../../components/fan/dashboard/useDashboardSection';
import DashboardSkeleton from '../../../components/fan/dashboard/DashboardSkeleton';
import DashboardNotice from '../../../components/fan/dashboard/DashboardNotice';
import { fetchTickets } from '../../../services/fanDashboardService';
import './MyTickets.css';

function MyTickets() {
  const { data: tickets, isLoading, error, retry } = useDashboardSection(fetchTickets);

  return (
    <div className="my-tickets dashboard-card">
      <div className="dashboard-card-heading-row">
        <h2 className="dashboard-card-heading">My Tickets</h2>
        <Link to="/fan/tickets" className="dashboard-card-link">
          View all
        </Link>
      </div>

      {isLoading ? (
        <DashboardSkeleton rows={2} />
      ) : error ? (
        <DashboardNotice tone="error" title="Couldn't load your tickets" message={error} onRetry={retry} />
      ) : tickets && tickets.length === 0 ? (
        <DashboardNotice tone="empty" title="No upcoming tickets" message="Buy a ticket to see it here." />
      ) : (
        <>
          <p className="tickets-count">
            <strong>{tickets?.length ?? 0}</strong> Upcoming Events
          </p>

          <div className="tickets-list">
            {(tickets ?? []).map((ticket) => (
              <Link to="/fan/tickets" className="ticket-row" key={ticket.match}>
                <div className="ticket-date">
                  <span className="ticket-date-month">{ticket.month}</span>
                  <span className="ticket-date-day">{ticket.day}</span>
                </div>

                <div className="ticket-details">
                  <div className="ticket-details-top">
                    <span className="ticket-match">{ticket.match}</span>
                    <span className="ticket-time">{ticket.time}</span>
                  </div>
                  <p className="ticket-competition">{ticket.competition}</p>
                  <p className="ticket-seat">{ticket.seat}</p>
                </div>

                <GiTicket className="ticket-icon" />
              </Link>
            ))}
          </div>

          <Link to="/fan/tickets" className="tickets-manage-btn">
            Manage Tickets
          </Link>
        </>
      )}
    </div>
  );
}

export default MyTickets;
