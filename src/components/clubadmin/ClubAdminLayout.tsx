import { useState, type ReactNode } from 'react';
import ClubAdminSidebar from './ClubAdminSidebar';
import ClubAdminTopbar from './ClubAdminTopbar';
import './ClubAdminLayout.css';

export default function ClubAdminLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="ca-layout">
      <ClubAdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="ca-layout-main">
        <ClubAdminTopbar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="ca-layout-content">{children}</main>
      </div>
    </div>
  );
}
