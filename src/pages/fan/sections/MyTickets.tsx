import { Link } from 'react-router-dom';
import { GiTicket } from 'react-icons/gi';
import './MyTickets.css';

type Ticket = {
  month: string;
  day: string;
  match: string;
  time: string;
  competition: string;
  seat: string;
};

const TICKETS: Ticket[] = [
  {
    month: 'AUG',
    day: '24',
    match: 'Vipers SC vs Express FC',
    time: '4:00 PM',
    competition: 'Uganda Premier League',
    seat: 'VIP Lounge • Row A • Seat 12',
  },
  {
    month: 'AUG',
    day: '30',
    match: 'City Oilers vs Patriots BC',
    time: '7:00 PM',
    competition: 'NBL Uganda',
    seat: 'Lower Bowl • Row C • Seat 8',
  },
];

function MyTickets() {
  return (
    <div className="my-tickets dashboard-card">
      <div className="dashboard-card-heading-row">
        <h2 className="dashboard-card-heading">My Tickets</h2>
        <Link to="/tickets" className="dashboard-card-link">
          View all
        </Link>
      </div>

      <p className="tickets-count">
        <strong>{TICKETS.length}</strong> Upcoming Events
      </p>

      <div className="tickets-list">
        {TICKETS.map((ticket) => (
          <Link to="/tickets" className="ticket-row" key={ticket.match}>
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

      <Link to="/tickets" className="tickets-manage-btn">
        Manage Tickets
      </Link>
    </div>
  );
}

export default MyTickets;
