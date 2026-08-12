import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    Circle,
    Shield,
    Bookmark,
    Clock,
    ArrowDown,
    Check,
} from "lucide-react";
import "./NewsPage.css";
import Navbar from "../../../components/landing/Navbar";
import Footer from "../../../components/landing/Footer";
import { fetchNews, type Story } from "../../../services/newsService";





/* ---------- Types ---------- */

interface TrendingStory {
    rank: number;
    image: string;
    title: string;
    time: string;
}

/* ---------- Sample content ---------- */

const filters = ["All", "Football", "Rugby", "Basketball", "Clubs"] as const;

const trendingStories: TrendingStory[] = [
    {
        rank: 1,
        image:  "/images/vipersvs.jfif",
        title: "Vipers edge KCCA in title race clash",
        time: "2h ago",
    },
    {
        rank: 2,
        image:
            "https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=200&auto=format&fit=crop",
        title: "City Oilers strengthen roster ahead of NBL second round",
        time: "4h ago",
    },
    {
        rank: 3,
        image:
            "https://images.unsplash.com/photo-1518063319789-7217e6706b04?q=80&w=200&auto=format&fit=crop",
        title: "SC Villa prepare for crucial Uganda Premier League clash",
        time: "5h ago",
    },
    {
        rank: 4,
        image:
            "/images/fantasy.jfif",
        title: "Fantasy tips for Gameweek 28",
        time: "6h ago",
    },
    {
        rank: 5,
        image:
            "/images/express-fc.jfif",
        title: "Express FC unveil new home jersey",
        time: "8h ago",
    },
];

/* ---------- Component ---------- */

const NewsPage: React.FC = () => {
    const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("All");
    const [email, setEmail] = useState("");
    const [stories, setStories] = useState<Story[]>([]);

    useEffect(() => {
        let cancelled = false;

        fetchNews().then((result) => {
            if (!cancelled) setStories(result);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    const visibleStories =
        activeFilter === "All" ? stories : stories.filter((s) => s.category === activeFilter);

    return (
        <div className="news-page">
            {/* Header */}
            <Navbar />

            <main className="news-main">
                <div className="news-layout">
                    {/* Left / Center column */}
                    <div className="news-content">
                        {/* Hero */}
                        <section className="news-hero">
    <h1 className="news-hero__title">
        The latest from{" "}
        <span className="news-hero__title-accent">
            Ugandan sport.
        </span>
    </h1>

    <p className="news-hero__subtitle">
        Stories, match previews, results, transfers and fan updates across football,
        rugby and basketball.
    </p>

    <div className="news-hero-card">
        <img
            src="/images/vipersvs.jfif"
            alt="Vipers edge KCCA in title race clash"
            className="news-hero-card__image"
        />

        <div className="news-hero-card__overlay" />

        <div className="news-hero-card__content">
            <span className="news-badge news-badge--top-story">
                TOP STORY
            </span>

            <h2 className="news-hero-card__title">
                Vipers edge KCCA in title race clash
            </h2>

            <p className="news-hero-card__desc">
                A late strike from Allan Okello sealed all three points for Vipers SC in a
                tense encounter at St. Mary's Stadium.
            </p>

            <div className="news-hero-card__meta">
                <Clock size={14} />
                <span>2h ago</span>
                <span className="news-dot">•</span>
                <span>Football</span>
            </div>
        </div>
    </div>
</section>

                        {/* Filters */}
                        <div className="filters">
                            {filters.map((f) => (
                                <button
                                    key={f}
                                    className={`filter-pill ${activeFilter === f ? "filter-pill--active" : ""}`}
                                    onClick={() => setActiveFilter(f)}
                                >
                                    {f === "All" && null}
                                    {f === "Football" && <Circle size={16} />}
                                    {f === "Rugby" && <Circle size={16} />}
                                    {f === "Basketball" && <Circle size={16} />}
                                    {f === "Clubs" && <Shield size={16} />}
                                    {f}
                                </button>
                            ))}
                        </div>

                        {/* Story grid */}
                        <div className="story-grid">
                            {visibleStories.map((story) => (
                                <article className="story-card" key={story.id}>
                                    <div className="story-card__image-wrap">
                                        <Link to={`/news/${story.id}`} className="story-card__image-link">
                                            <img src={story.image} alt={story.title} className="story-card__image" />
                                        </Link>
                                        <span
                                            className={`badge badge--category badge--${story.category.toLowerCase()}`}
                                        >
                                            {story.category.toUpperCase()}
                                        </span>
                                        <span className="story-card__time">{story.time}</span>
                                    </div>
                                    <div className="story-card__body">
                                        <h3 className="story-card__title">
                                            <Link to={`/news/${story.id}`} className="story-card__title-link">
                                                {story.title}
                                            </Link>
                                        </h3>
                                        <p className="story-card__desc">{story.description}</p>
                                        <div className="story-card__footer">
                                            <div className="story-card__author">
                                                <img src={story.avatar} alt={story.author} />
                                                <span>By {story.author}</span>
                                            </div>
                                            <button className="icon-btn" aria-label="Bookmark">
                                                <Bookmark size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>

                        <button className="load-more">
                            Load more stories <ArrowDown size={16} />
                        </button>
                    </div>

                    {/* Sidebar */}
                    <aside className="news-sidebar">
                        {/* Trending */}
                        <div className="panel">
                            <div className="panel__header">
                                <h3>TRENDING STORIES</h3>
                                <a href="#view-all" className="panel__link">
                                    View all
                                </a>
                            </div>
                            <ul className="trending-list">
                                {trendingStories.map((t) => (
                                    <li className="trending-item" key={t.rank}>
                                        <span className="trending-item__rank">{t.rank}</span>
                                        <img src={t.image} alt={t.title} className="trending-item__image" />
                                        <div className="trending-item__body">
                                            <p className="trending-item__title">{t.title}</p>
                                            <span className="trending-item__time">{t.time}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Newsletter */}
                        <div className="panel newsletter">
                            <h3 className="newsletter__title">STAY IN THE GAME</h3>
                            <p className="newsletter__desc">
                                Get the biggest stories, match previews and updates straight to your inbox.
                            </p>
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="newsletter__input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <button className="btn btn--primary btn--full">Subscribe now</button>
                            <div className="newsletter__note">
                                <Check size={14} />
                                <span>Join 25,000+ Ugandan fans</span>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            {/* Footer */}
          <Footer />
        </div>
    );
};

export default NewsPage;
