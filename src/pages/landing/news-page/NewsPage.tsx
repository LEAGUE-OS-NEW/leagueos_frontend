import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    Circle,
    Bookmark,
    Clock,
    ArrowDown,
    Check,
} from "lucide-react";
import "./NewsPage.css";
import Navbar from "../../../components/landing/Navbar";
import Footer from "../../../components/landing/Footer";
import { fetchApprovedStories, type AdminStory } from "../../../services/newsAdminService";

/* ---------- Constants ---------- */

const filters = ["All", "Football", "Rugby", "Basketball"] as const;

/* ---------- Component ---------- */

const NewsPage: React.FC = () => {
    const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("All");
    const [email, setEmail] = useState("");
    const [stories, setStories] = useState<AdminStory[]>([]);

    useEffect(() => {
        let cancelled = false;

        fetchApprovedStories().then((result) => {
            if (!cancelled) setStories(result);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    const heroStory: AdminStory | undefined = stories.find((s) => s.isFeatured) ?? stories[0];

    const flaggedTrending = stories.filter((s) => s.isTrending);
    const trendingStories = (flaggedTrending.length > 0 ? flaggedTrending : stories).slice(0, 5);

    const INITIAL_COUNT = 6;
    const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);

    // Reset count when filter changes so we always start at 2 rows
    const handleFilterChange = (f: (typeof filters)[number]) => {
        setActiveFilter(f);
        setVisibleCount(INITIAL_COUNT);
    };

    const visibleStories =
        activeFilter === "All" ? stories : stories.filter((s) => s.category === activeFilter);

    const displayedStories = visibleStories.slice(0, visibleCount);
    const hasMore = visibleCount < visibleStories.length;

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

                            {heroStory && (
                                <div className="news-hero-card">
                                    <img
                                        src={heroStory.image}
                                        alt={heroStory.title}
                                        className="news-hero-card__image"
                                    />

                                    <div className="news-hero-card__overlay" />

                                    <div className="news-hero-card__content">
                                        <span className="news-badge news-badge--top-story">
                                            TOP STORY
                                        </span>

                                        <h2 className="news-hero-card__title">
                                            {heroStory.title}
                                        </h2>

                                        <p className="news-hero-card__desc">
                                            {heroStory.description}
                                        </p>

                                        <div className="news-hero-card__meta">
                                            <Clock size={14} />
                                            <span>{heroStory.time}</span>
                                            <span className="news-dot">•</span>
                                            <span>{heroStory.category}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Filters */}
                        <div className="filters">
                            {filters.map((f) => (
                                <button
                                    key={f}
                                    className={`filter-pill ${activeFilter === f ? "filter-pill--active" : ""}`}
                                    onClick={() => handleFilterChange(f)}
                                >
                                    {f === "All" && null}
                                    {f === "Football" && <Circle size={16} />}
                                    {f === "Rugby" && <Circle size={16} />}
                                    {f === "Basketball" && <Circle size={16} />}
                                    {f}
                                </button>
                            ))}
                        </div>

                        {/* Story grid */}
                        <div className="story-grid">
                            {displayedStories.map((story) => (
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

                        {hasMore ? (
                            <button
                                className="load-more"
                                onClick={() => setVisibleCount((c) => c + INITIAL_COUNT)}
                            >
                                Load more stories <ArrowDown size={16} />
                            </button>
                        ) : visibleCount > INITIAL_COUNT ? (
                            <button
                                className="load-more"
                                onClick={() => setVisibleCount(INITIAL_COUNT)}
                            >
                                View less <ArrowDown size={16} style={{ transform: 'rotate(180deg)' }} />
                            </button>
                        ) : null}
                    </div>

                    {/* Sidebar */}
                    <aside className="news-sidebar">
                        {/* Trending */}
                        <div className="panel">
                            <div className="panel__header">
                                <h3>TOP 5 TRENDING STORIES</h3>
                            </div>
                            <ul className="trending-list">
                                {trendingStories.map((story, index) => (
                                    <Link to={`/news/${story.id}`} className="trending-item-link" key={story.id}>
                                    <li className="trending-item">
                                        <span className="trending-item__rank">{index + 1}</span>
                                        <img src={story.image} alt={story.title} className="trending-item__image" />
                                        <div className="trending-item__body">
                                            <p className="trending-item__title">{story.title}</p>
                                            <span className="trending-item__time">{story.time}</span>
                                        </div>
                                    </li>
                                    </Link>
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
