import { useState } from 'react';
import { FiMail, FiPhone, FiMapPin, FiMessageSquare, FiSend } from 'react-icons/fi';
import Navbar from '../../components/landing/Navbar';
import Footer from '../../components/landing/Footer';
import './SupportPages.css';
import './ContactUs.css';

const CATEGORIES = [
  'Account & Login',
  'Deposits & Withdrawals',
  'Markets & Predictions',
  'Fantasy Sports',
  'Tickets & Store',
  'KYC & Verification',
  'Safety & Responsible Play',
  'Other',
];

function ContactUs() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', category: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1200);
  }

  return (
    <div className="sp-page">
      <Navbar />

      <div className="sp-hero">
        <span className="sp-hero__badge">Contact Us</span>
        <h1 className="sp-hero__title">We are here <span>to help.</span></h1>
        <p className="sp-hero__sub">Reach out via the form below or use any of our direct contact channels. Our team responds within 2 hours during operating hours.</p>
      </div>

      <section className="sp-section contact-layout">

        {/* Contact form */}
        <div className="contact-form-wrap">
          <h2 className="contact-form-title">Send us a message</h2>

          {submitted ? (
            <div className="contact-success">
              <FiMessageSquare className="contact-success-icon" />
              <h3>Message received!</h3>
              <p>Thank you, <strong>{form.name}</strong>. We will get back to you at <strong>{form.email}</strong> within 2 hours during operating hours (8 AM – 10 PM EAT).</p>
              <button className="sp-btn sp-btn--ghost" onClick={() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', category: '', subject: '', message: '' }); }}>Send another message</button>
            </div>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="contact-row">
                <div className="contact-field">
                  <label htmlFor="name">Full Name *</label>
                  <input id="name" name="name" type="text" required value={form.name} onChange={handleChange} placeholder="e.g. Nakato Sarah" />
                </div>
                <div className="contact-field">
                  <label htmlFor="email">Email Address *</label>
                  <input id="email" name="email" type="email" required value={form.email} onChange={handleChange} placeholder="you@email.com" />
                </div>
              </div>

              <div className="contact-row">
                <div className="contact-field">
                  <label htmlFor="phone">Phone Number</label>
                  <input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+256 7XX XXX XXX" />
                </div>
                <div className="contact-field">
                  <label htmlFor="category">Topic *</label>
                  <select id="category" name="category" required value={form.category} onChange={handleChange}>
                    <option value="">Select a topic…</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="contact-field">
                <label htmlFor="subject">Subject *</label>
                <input id="subject" name="subject" type="text" required value={form.subject} onChange={handleChange} placeholder="Brief description of your issue" />
              </div>

              <div className="contact-field">
                <label htmlFor="message">Message *</label>
                <textarea id="message" name="message" rows={5} required value={form.message} onChange={handleChange} placeholder="Please describe your issue in as much detail as possible. Include transaction IDs, error messages, or screenshots where relevant." />
              </div>

              <button type="submit" className="sp-btn sp-btn--primary contact-submit" disabled={loading}>
                {loading ? 'Sending…' : <><FiSend /> Send Message</>}
              </button>
            </form>
          )}
        </div>

        {/* Contact info sidebar */}
        <aside className="contact-sidebar">
          <h2 className="contact-form-title">Other ways to reach us</h2>

          <div className="contact-info-cards">
            <a href="mailto:support@leagueos.ug" className="contact-info-card">
              <div className="contact-info-icon"><FiMail /></div>
              <div>
                <strong>Email Support</strong>
                <span>support@leagueos.ug</span>
                <small>Response within 2 hours (8 AM – 10 PM)</small>
              </div>
            </a>

            <a href="tel:+256800210000" className="contact-info-card">
              <div className="contact-info-icon"><FiPhone /></div>
              <div>
                <strong>Phone / WhatsApp</strong>
                <span>0800 210 000</span>
                <small>Free call · Mon – Sun, 8 AM – 8 PM</small>
              </div>
            </a>

            <div className="contact-info-card">
              <div className="contact-info-icon"><FiMapPin /></div>
              <div>
                <strong>Head Office</strong>
                <span>Kampala, Uganda</span>
                <small>Plot 23, Nakasero Hill Road</small>
              </div>
            </div>
          </div>

          <div className="contact-hours">
            <h3>Operating Hours</h3>
            <table>
              <tbody>
                <tr><td>Monday – Friday</td><td>8:00 AM – 10:00 PM</td></tr>
                <tr><td>Saturday</td><td>9:00 AM – 8:00 PM</td></tr>
                <tr><td>Sunday</td><td>10:00 AM – 6:00 PM</td></tr>
                <tr className="contact-hours-note"><td colSpan={2}>All times East Africa Time (EAT / UTC+3)</td></tr>
              </tbody>
            </table>
          </div>

          <div className="contact-faq-prompt">
            <p>Looking for a quick answer?</p>
            <a href="/help" className="sp-btn sp-btn--ghost" style={{ width: '100%', justifyContent: 'center' }}>Browse Help Center</a>
          </div>
        </aside>
      </section>

      <Footer />
    </div>
  );
}

export default ContactUs;
