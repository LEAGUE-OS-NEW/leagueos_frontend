import { useState, type ReactNode } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import Footer from '../landing/Footer';
import './AdminLayout.css';

function AdminLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="admin-shell">
      <div className="admin-layout">
        <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <div className="admin-layout__main">
          <AdminTopbar onMenuClick={() => setIsSidebarOpen(true)} />
          <main className="admin-layout__content">{children}</main>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default AdminLayout;
