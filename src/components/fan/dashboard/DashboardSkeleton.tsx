// Renders inside a section that already provides FanDashboard.css's
// `.dashboard-skeleton`/`.dashboard-skeleton-row` classes — no separate
// stylesheet needed here, same as the section components it's used in.

function DashboardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="dashboard-skeleton" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="dashboard-skeleton-row" key={index} />
      ))}
    </div>
  );
}

export default DashboardSkeleton;
