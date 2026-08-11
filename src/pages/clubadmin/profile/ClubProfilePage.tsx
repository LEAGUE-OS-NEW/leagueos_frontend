import { useState } from 'react';
import { FiGlobe, FiInstagram, FiTwitter, FiYoutube, FiLinkedin, FiDownload, FiSave } from 'react-icons/fi';
import ClubAdminLayout from '../../../components/clubadmin/ClubAdminLayout';
import '../../../components/clubadmin/ClubAdminLayout.css';
import './ClubProfilePage.css';

const PALETTE = ['#FFD700', '#1A1A1A', '#7C3AED', '#FFFFFF', '#22C55E'];

const RECENT_BRANDING = [
  { text: 'Primary logo updated', time: '2 May 2026' },
  { text: 'Brand palette locked for Season 25/26', time: '28 Apr 2026' },
  { text: 'Club bio updated by James Okello', time: '20 Apr 2026' },
  { text: 'Social handles verified', time: '15 Apr 2026' },
];

type FormData = {
  clubName: string; email: string; phone: string; website: string;
  founded: string; nickname: string; ground: string; colours: string; bio: string;
};

const INIT_FORM: FormData = {
  clubName: 'KCCA FC',
  email: 'info@kccafc.co.ug',
  phone: '+256 414 000 000',
  website: 'www.kccafc.co.ug',
  founded: '1936',
  nickname: 'The Kasasiro Boys',
  ground: 'StarTimes Stadium, Lugogo',
  colours: 'Yellow & Black',
  bio: 'KCCA FC — Kampala Capital City Authority Football Club — is Uganda\'s most decorated football club, playing in the Uganda Premier League. Known as The Kasasiro Boys.',
};

export default function ClubProfilePage() {
  const [form, setForm] = useState<FormData>(INIT_FORM);
  const [saved, setSaved] = useState<FormData>(INIT_FORM);
  const [toast, setToast] = useState('');
  const [dirty, setDirty] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleChange = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setDirty(true);
  };

  const saveChanges = () => {
    setSaved(form);
    setDirty(false);
    showToast('Club profile saved successfully');
  };

  const discard = () => {
    setForm(saved);
    setDirty(false);
    showToast('Changes discarded');
  };

  const FIELDS: { label: string; key: keyof FormData; type?: string }[] = [
    { label: 'Club Name', key: 'clubName' },
    { label: 'Official Email', key: 'email', type: 'email' },
    { label: 'Phone Number', key: 'phone', type: 'tel' },
    { label: 'Website', key: 'website' },
    { label: 'Founded', key: 'founded' },
    { label: 'Nickname', key: 'nickname' },
    { label: 'Home Ground', key: 'ground' },
    { label: 'Home Colours', key: 'colours' },
  ];

  return (
    <ClubAdminLayout>
      {toast && <div className="ca-toast">{toast}</div>}

      <div className="ca-page-header">
        <div>
          <p className="ca-page-eyebrow">CA-01</p>
          <h1 className="ca-page-title">Club Profile &amp; Branding</h1>
          <p className="ca-page-subtitle">Manage club identity, brand assets, descriptions and public-facing details.</p>
        </div>
        <div className="ca-page-actions">
          {dirty && (
            <button type="button" className="ca-btn ca-btn-secondary" onClick={discard}>Discard</button>
          )}
          <button type="button" className="ca-btn ca-btn-secondary" onClick={() => showToast('Brand guidelines downloaded')}>
            <FiDownload /> Download Guidelines
          </button>
          <button type="button" className="ca-btn ca-btn-primary" onClick={saveChanges} disabled={!dirty}
            style={{ opacity: dirty ? 1 : 0.5 }}>
            <FiSave /> Save Changes
          </button>
        </div>
      </div>

      <div className="ca-content-grid">
        <div className="ca-content-main">
          <div className="ca-panel">
            <div className="ca-panel-header">
              <h2 className="ca-panel-title">General Club Information</h2>
              {dirty && <span style={{ fontSize: '0.72rem', color: '#f97316', fontWeight: 700 }}>Unsaved changes</span>}
            </div>
            <div className="ca-profile-form-grid">
              {FIELDS.map(({ label, key, type }) => (
                <div key={key} className="ca-form-field">
                  <label className="ca-form-label">{label}</label>
                  <input
                    className="ca-form-input"
                    type={type || 'text'}
                    value={form[key]}
                    onChange={handleChange(key)}
                  />
                </div>
              ))}
              <div className="ca-form-field ca-form-field-full">
                <label className="ca-form-label">Club Bio</label>
                <textarea
                  className="ca-form-input ca-form-textarea"
                  rows={3}
                  value={form.bio}
                  onChange={handleChange('bio')}
                />
              </div>
            </div>
          </div>

          <div className="ca-panel">
            <div className="ca-panel-header"><h2 className="ca-panel-title">Social &amp; Public Presence</h2></div>
            <div className="ca-profile-social-grid">
              {[
                { icon: FiInstagram, platform: 'Instagram', handle: '@KCCAFC',          followers: '124K' },
                { icon: FiTwitter,   platform: 'Twitter/X', handle: '@KCCAFC',          followers: '89K' },
                { icon: FiYoutube,   platform: 'YouTube',   handle: 'KCCA FC Official', followers: '42K' },
                { icon: FiLinkedin,  platform: 'LinkedIn',  handle: 'KCCA FC',          followers: '11K' },
                { icon: FiGlobe,     platform: 'Website',   handle: form.website,        followers: '96K monthly' },
              ].map(({ icon: Icon, platform, handle, followers }) => (
                <div key={platform} className="ca-social-row">
                  <Icon className="ca-social-icon" />
                  <div className="ca-social-info">
                    <span className="ca-social-platform">{platform}</span>
                    <span className="ca-social-handle">{handle}</span>
                  </div>
                  <span className="ca-social-followers">{followers}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="ca-content-aside">
          <div className="ca-panel">
            <div className="ca-panel-header"><h2 className="ca-panel-title">Brand Guidelines</h2></div>
            <div className="ca-brand-preview-box">
              <div className="ca-brand-badge">KC</div>
              <span className="ca-brand-club-name">{form.clubName}</span>
              <span className="ca-brand-season">Season 2025/26</span>
            </div>
            <button type="button" className="ca-btn ca-btn-secondary" style={{ width: '100%', marginTop: 12 }}
              onClick={() => showToast('Brand guidelines downloaded')}>
              <FiDownload /> Download Guidelines
            </button>
          </div>

          <div className="ca-panel">
            <div className="ca-panel-header"><h2 className="ca-panel-title">Brand Palette</h2></div>
            <div className="ca-palette-row">
              {PALETTE.map(color => (
                <div key={color} className="ca-palette-swatch" style={{ background: color }} title={color} />
              ))}
            </div>
          </div>

          <div className="ca-panel">
            <div className="ca-panel-header"><h2 className="ca-panel-title">Certification</h2></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['FUFA Licensed Club',  'Verified', 'green'],
                ['CAF Member Club',     'Verified', 'green'],
                ['League OS Verified',  'Verified', 'purple'],
                ['Financial Compliance','Pending',  'orange'],
              ].map(([label, status, color]) => (
                <div key={label} className="ca-cert-row">
                  <span className="ca-cert-label">{label}</span>
                  <span className={`ca-pill ca-pill-${color}`}>{status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ca-panel">
            <div className="ca-panel-header"><h2 className="ca-panel-title">Recent Branding Activity</h2></div>
            <div className="ca-activity-list">
              {RECENT_BRANDING.map((r, i) => (
                <div key={i} className="ca-activity-item">
                  <div className="ca-activity-dot" />
                  <div>
                    <p className="ca-activity-text">{r.text}</p>
                    <p className="ca-activity-time">{r.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ClubAdminLayout>
  );
}
