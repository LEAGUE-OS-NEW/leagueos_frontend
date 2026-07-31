import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";
import {
  Trophy,
  Target,
  Eye,
  Users,
  Globe,
  Shield,
  Zap,
  HeartHandshake,
  Compass,
  Radio,
  TrendingUp,
  Smartphone,
  Ticket,
  Newspaper,
  Award,
  CalendarClock,
  Gamepad2,
} from 'lucide-react';
import './AboutUs.css';

const AboutUs = () => {
  return (
    <div className="about">
      <Navbar />

      <main className="about__main">
        {/* 1. Hero */}
        <header className="about-hero">
          <div className="about-hero__field" aria-hidden="true">
            <span className="about-hero__line about-hero__line--halfway" />
            <span className="about-hero__line about-hero__line--circle" />
          </div>

          <div className="about-hero__inner">
            <span className="about-hero__label">About League OS</span>
            <h1 className="about-hero__heading">
              Powering the future of <span>African sport.</span>
            </h1>
            <p className="about-hero__text">
              League OS is building a connected digital ecosystem where fans, leagues, clubs, and
              sports communities can engage, compete, and grow together through technology.
            </p>
            <div className="about-hero__actions">
              <a href="#platform" className="about-btn about-btn--primary">
                Explore the Platform
              </a>
              <a href="#contact" className="about-btn about-btn--ghost">
                Get in Touch
              </a>
            </div>
          </div>
        </header>

        {/* By The Numbers */}
        <section className="about-section stats">
          <div className="stats__grid">
            <div className="stats__item">
              <span className="stats__value">3</span>
              <span className="stats__label">Sports on one platform</span>
              <span className="stats__sub">Football, Basketball &amp; Rugby</span>
            </div>
            <div className="stats__item">
              <span className="stats__value">2</span>
              <span className="stats__label">Mobile money partners</span>
              <span className="stats__sub">MTN &amp; Airtel</span>
            </div>
            <div className="stats__item">
              <span className="stats__value">2026</span>
              <span className="stats__label">MVP launch year</span>
              <span className="stats__sub">News, fantasy &amp; ticketing, unified</span>
            </div>
            <div className="stats__item">
              <span className="stats__value">1</span>
              <span className="stats__label">Digital home for sport</span>
              <span className="stats__sub">Fans, clubs, leagues &amp; sponsors</span>
            </div>
          </div>
        </section>

        {/* 2. Who We Are */}
        <section className="about-section who">
          <div className="who__grid">
            <div className="who__text">
              <span className="about-eyebrow">Who We Are</span>
              <h2 className="about-heading">Built pitch-side, not boardroom-side.</h2>
              <p>
                League OS is a Ugandan-built sports technology platform, designed from the terraces
                up to modernize how fans experience the game.
              </p>
              <ul className="who__list">
                <li>Focused on accessibility, community, and everyday innovation</li>
                <li>Created for passionate fans and the organizations that serve them</li>
                <li>Engineered for the realities of African sport, from stadium to smartphone</li>
              </ul>
            </div>

            <div className="who__card">
              <span className="who__card-mark" aria-hidden="true">
                ”
              </span>
              <blockquote className="who__quote">
                League OS exists to bring every sports fan closer to the game they love.
              </blockquote>
              <div className="who__accent" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <span className="who__origin">Designed &amp; built in Kampala, Uganda</span>
            </div>
          </div>
        </section>

        {/* 3. Mission & Vision */}
        <section className="about-section mv">
          <div className="mv__grid">
            <article className="mv__card">
              <div className="mv__icon">
                <Target size={26} strokeWidth={1.75} />
              </div>
              <h3>Our Mission</h3>
              <p>
                To make sports engagement accessible, interactive, and rewarding for every fan
                across Africa by connecting communities through technology.
              </p>
            </article>

            <article className="mv__card">
              <div className="mv__icon">
                <Eye size={26} strokeWidth={1.75} />
              </div>
              <h3>Our Vision</h3>
              <p>
                To become Africa&apos;s leading digital platform for fan engagement, league
                operations, and sports community growth.
              </p>
            </article>
          </div>
        </section>

        {/* 4. Why League OS Exists */}
        <section className="about-section why">
          <div className="about-section__head">
            <span className="about-eyebrow">Why League OS Exists</span>
            <h2 className="about-heading">Every gap in the game, closed.</h2>
          </div>

          <div className="why__grid">
            <article className="why__card">
              <div className="why__icon why__icon--purple">
                <Users size={22} strokeWidth={1.75} />
              </div>
              <h3>Connected Communities</h3>
              <p>Bringing fans, clubs, and leagues together on one shared platform.</p>
            </article>

            <article className="why__card">
              <div className="why__icon why__icon--blue">
                <Globe size={22} strokeWidth={1.75} />
              </div>
              <h3>African Innovation</h3>
              <p>Built in Uganda, with solutions designed for African sports ecosystems.</p>
            </article>

            <article className="why__card">
              <div className="why__icon why__icon--purple">
                <Shield size={22} strokeWidth={1.75} />
              </div>
              <h3>Trusted Digital Experience</h3>
              <p>Secure authentication, ticketing, and platform governance you can rely on.</p>
            </article>

            <article className="why__card">
              <div className="why__icon why__icon--blue">
                <Zap size={22} strokeWidth={1.75} />
              </div>
              <h3>Real-Time Engagement</h3>
              <p>Live updates, fantasy competitions, polls, and interactive fan experiences.</p>
            </article>
          </div>
        </section>

        {/* How League OS Works */}
        <section className="about-section how">
          <div className="about-section__head">
            <span className="about-eyebrow">How It Works</span>
            <h2 className="about-heading">From kickoff to community, in three moves.</h2>
          </div>

          <div className="how__grid">
            <article className="how__step">
              <span className="how__index">01</span>
              <div className="how__icon">
                <Compass size={22} strokeWidth={1.75} />
              </div>
              <h3>Discover</h3>
              <p>
                Fans find fixtures, results, news, and clubs across football, basketball, and
                rugby, all in one place.
              </p>
            </article>

            <article className="how__step">
              <span className="how__index">02</span>
              <div className="how__icon">
                <Radio size={22} strokeWidth={1.75} />
              </div>
              <h3>Engage</h3>
              <p>
                Buy tickets, join fantasy leagues, follow live updates, and connect with fellow
                supporters in real time.
              </p>
            </article>

            <article className="how__step">
              <span className="how__index">03</span>
              <div className="how__icon">
                <TrendingUp size={22} strokeWidth={1.75} />
              </div>
              <h3>Grow</h3>
              <p>
                Clubs, leagues, and sponsors turn that engagement into memberships, loyalty, and
                lasting community.
              </p>
            </article>
          </div>
        </section>

        {/* 5. Our Story */}
        <section className="about-section story">
          <div className="about-section__head">
            <span className="about-eyebrow">Our Story</span>
            <h2 className="about-heading">From kickoff to platform.</h2>
          </div>

          <ol className="story__timeline">
            <li className="story__item">
              <div className="story__marker" aria-hidden="true" />
              <div className="story__card">
                <span className="story__year">2025</span>
                <h3>The Beginning</h3>
                <p>
                  Identified the gap in fan engagement and league management tools for Ugandan
                  sports.
                </p>
              </div>
            </li>

            <li className="story__item">
              <div className="story__marker" aria-hidden="true" />
              <div className="story__card">
                <span className="story__year">2026</span>
                <h3>League OS MVP</h3>
                <p>
                  Launched a unified platform combining news, fantasy, ticketing, and community
                  engagement.
                </p>
              </div>
            </li>

            <li className="story__item">
              <div className="story__marker" aria-hidden="true" />
              <div className="story__card">
                <span className="story__year">Next</span>
                <h3>The Road Ahead</h3>
                <p>
                  Expanding into a scalable ecosystem that can support sports organizations and fan
                  communities across Africa.
                </p>
              </div>
            </li>
          </ol>
        </section>

        {/* 6. Sports We Support */}
        <section id="sports" className="about-section sports">
          <div className="about-section__head">
            <span className="about-eyebrow">The Sports We Support</span>
            <h2 className="about-heading">One platform, three codes.</h2>
          </div>

          <div className="sports__grid">
            <article className="sports__card sports__card--football">
              <Trophy size={24} strokeWidth={1.75} />
              <h3>Football</h3>
              <p>The heartbeat of African sport.</p>
            </article>

            <article className="sports__card sports__card--basketball">
              <Trophy size={24} strokeWidth={1.75} />
              <h3>Basketball</h3>
              <p>Fast-growing communities and youth participation.</p>
            </article>

            <article className="sports__card sports__card--rugby">
              <Trophy size={24} strokeWidth={1.75} />
              <h3>Rugby</h3>
              <p>Competitive, passionate, and community-driven.</p>
            </article>
          </div>
        </section>

        {/* Built For Everyone */}
        <section className="about-section audience">
          <div className="about-section__head">
            <span className="about-eyebrow">Built For Everyone</span>
            <h2 className="about-heading">One platform, every seat in the stadium.</h2>
          </div>

          <div className="audience__grid">
            <article className="audience__card">
              <div className="audience__icon">
                <Users size={22} strokeWidth={1.75} />
              </div>
              <h3>Fans</h3>
              <p>Follow every fixture, join fantasy leagues, and support your club from anywhere.</p>
            </article>

            <article className="audience__card">
              <div className="audience__icon">
                <Trophy size={22} strokeWidth={1.75} />
              </div>
              <h3>Clubs &amp; Leagues</h3>
              <p>Run ticketing, memberships, and fixtures on infrastructure built for African sport.</p>
            </article>

            <article className="audience__card">
              <div className="audience__icon">
                <HeartHandshake size={22} strokeWidth={1.75} />
              </div>
              <h3>Sponsors &amp; Partners</h3>
              <p>Reach engaged fan communities through a trusted, data-driven digital ecosystem.</p>
            </article>
          </div>
        </section>

        {/* What's Inside League OS */}
        <section id="platform" className="about-section platform">
          <div className="about-section__head">
            <span className="about-eyebrow">What&apos;s Inside League OS</span>
            <h2 className="about-heading">Everything a fan community needs, unified.</h2>
          </div>

          <div className="platform__grid">
            <div className="platform__item">
              <Gamepad2 size={20} strokeWidth={1.75} />
              <span>Fantasy Sports</span>
            </div>
            <div className="platform__item">
              <Ticket size={20} strokeWidth={1.75} />
              <span>Ticketing &amp; Access Control</span>
            </div>
            <div className="platform__item">
              <Award size={20} strokeWidth={1.75} />
              <span>Memberships &amp; Loyalty</span>
            </div>
            <div className="platform__item">
              <CalendarClock size={20} strokeWidth={1.75} />
              <span>Live Fixtures &amp; Results</span>
            </div>
            <div className="platform__item">
              <Newspaper size={20} strokeWidth={1.75} />
              <span>Sports News</span>
            </div>
            <div className="platform__item">
              <Smartphone size={20} strokeWidth={1.75} />
              <span>MTN &amp; Airtel Mobile Money</span>
            </div>
          </div>
        </section>

        {/* 7. Our Values */}
        <section className="about-section values">
          <div className="about-section__head">
            <span className="about-eyebrow about-eyebrow--icon">
              <HeartHandshake size={18} strokeWidth={1.75} />
              Our Values
            </span>
            <h2 className="about-heading">What we play by.</h2>
          </div>

          <div className="values__grid">
            <div className="values__item">Passion for Sport</div>
            <div className="values__item">Community First</div>
            <div className="values__item">Innovation</div>
            <div className="values__item">Integrity</div>
            <div className="values__item">Accessibility</div>
            <div className="values__item">Growth Through Collaboration</div>
          </div>
        </section>

        {/* 8. Final CTA */}
        <section id="contact" className="about-section cta">
          <div className="cta__inner">
            <h2>Join the League OS journey.</h2>
            <p>
              Whether you are a fan, club, league, sponsor, or technology partner, League OS is
              creating the digital home for African sport.
            </p>
            <a href="/signup" className="about-btn about-btn--light">
              Get Started
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutUs;
