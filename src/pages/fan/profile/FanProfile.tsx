import { useEffect, useState } from 'react';
import Sidebar from '../../../components/fan/Sidebar';
import Topbar from '../sections/Topbar';
import Footer from '../../../components/landing/Footer';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import ProfileForm from './sections/ProfileForm';
import './FanProfile.css';

function FanProfile() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { currentUser, profile, isLoading } = useCurrentUser();

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  return (
    <div className="fan-profile">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="fan-profile-main">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <div className="fan-profile-content">
          <div className="fan-profile-inner">
            <div className="fan-profile-header">
              <p className="fan-profile-eyebrow">Account</p>
              <h1>My Profile</h1>
              <p>Update your details, photo, and how other fans see you as {currentUser.name}.</p>
            </div>

            <ProfileForm profile={profile} isLoading={isLoading} />
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default FanProfile;
