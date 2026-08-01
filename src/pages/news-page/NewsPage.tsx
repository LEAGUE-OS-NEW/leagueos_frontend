import React, { useState } from "react";
import {
    Trophy,
    Circle,
    Shield,
    BarChart3,
    Bookmark,
    Clock,
    ArrowDown,
    ArrowRight,
    Star,
    Check,
} from "lucide-react";
import "./NewsPage.css";
import Navbar from "../../components/landing/Navbar";
import Footer from "../../components/landing/Footer";

/* ---------- Small inline brand icons (lucide dropped these) ---------- */





/* ---------- Types ---------- */

interface Story {
    id: string;
    category: "Football" | "Rugby" | "Basketball" | "Clubs" | "Markets" | "Fantasy";
    time: string;
    image: string;
    title: string;
    description: string;
    author: string;
    avatar: string;
}

interface TrendingStory {
    rank: number;
    image: string;
    title: string;
    time: string;
}

interface LiveMatch {
    status: "LIVE" | "HT" | "FT";
    minute: string;
    homeTeam: string;
    homeScore: number;
    homeCrest: string;
    awayTeam: string;
    awayScore: number;
    awayCrest: string;
    league: string;
}

/* ---------- Sample content ---------- */

const filters = ["All", "Football", "Rugby", "Basketball", "Clubs", "Markets", "Fantasy"] as const;

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

const stories: Story[] = [
    {
        id: "s1",
        category: "Football",
        time: "2h ago",
        image: "/images/vipersvs.jfif",
        title: "Vipers edge KCCA in title race clash",
        description:
            "A late strike from Allan Okello sealed all three points for Vipers SC in a tense encounter at St. Mary's Stadium.",
        author: "Brian Ssempijja",
        avatar: "https://i.pravatar.cc/40?img=12",
    },
    {
        id: "s2",
        category: "Rugby",
        time: "4h ago",
        image:  "/images/rugby-cranes.jfif",
        title: "Rugby Cranes begin preparations for regional championship",
        description:
            "The national side has entered a two-week training camp ahead of the Africa Cup qualifiers next month.",
        author: "Ivan Mugisha",
        avatar: "https://i.pravatar.cc/40?img=33",
    },
    {
        id: "s3",
        category: "Basketball",
        time: "5h ago",
        image: "/images/city-oilers.jfif",
        title: "City Oilers chase another statement win",
        description:
            "City Oilers look to extend their winning run in the NBL Uganda against a resurgent Namuwongo Blazers side.",
        author: "Gloria Nankya",
        avatar: "https://i.pravatar.cc/40?img=45",
    },
    {
        id: "s4",
        category: "Fantasy",
        time: "6h ago",
        image:
            "/images/fantasy.jfif",
        title: "Fantasy tips for Gameweek 28",
        description:
            "Top picks, differential players and captain shouts for a big Gameweek in the Uganda Premier League.",
        author: "Fantasy Guru",
        avatar: "https://i.pravatar.cc/40?img=8",
    },
    {
        id: "s5",
        category: "Markets",
        time: "7h ago",
        image:
            "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=600&auto=format&fit=crop",
        title: "Open markets to watch this week",
        description:
            "Key match markets with strong moves and smart money activity across the weekend fixtures.",
        author: "Market Analyst",
        avatar: "https://i.pravatar.cc/40?img=15",
    },
    {
        id: "s6",
        category: "Clubs",
        time: "8h ago",
        image:
            "https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=600&auto=format&fit=crop",
        title: "Express FC unveil new home jersey",
        description: "The Red Eagles reveal their 2024/25 home kit in style.",
        author: "Nicholas Kasozi",
        avatar: "https://i.pravatar.cc/40?img=22",
    },
];

const liveMatches: LiveMatch[] = [
    {
        status: "LIVE",
        minute: "78'",
        homeTeam: "Vipers SC",
        homeScore: 2,
        homeCrest: "🛡️",
        awayTeam: "KCCA FC",
        awayScore: 1,
        awayCrest: "🟡",
        league: "StarTimes Premier League",
    },
    {
        status: "LIVE",
        minute: "62'",
        homeTeam: "SC Villa",
        homeScore: 1,
        homeCrest: "🔴",
        awayTeam: "Maroons FC",
        awayScore: 0,
        awayCrest: "🟤",
        league: "StarTimes Premier League",
    },
    {
        status: "HT",
        minute: "HT",
        homeTeam: "BUL FC",
        homeScore: 0,
        homeCrest: "🟨",
        awayTeam: "URA FC",
        awayScore: 0,
        awayCrest: "🔵",
        league: "StarTimes Premier League",
    },
];

const scoreTabs = ["Football", "Rugby", "Basketball"] as const;

/* ---------- Component ---------- */

const NewsPage: React.FC = () => {
    const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("All");
    const [activeScoreTab, setActiveScoreTab] =
        useState<(typeof scoreTabs)[number]>("Football");
    const [email, setEmail] = useState("");

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
                                    {f === "All" && <BarChart3 size={16} />}
                                    {f === "Football" && <Circle size={16} />}
                                    {f === "Rugby" && <Circle size={16} />}
                                    {f === "Basketball" && <Circle size={16} />}
                                    {f === "Clubs" && <Shield size={16} />}
                                    {f === "Markets" && <BarChart3 size={16} />}
                                    {f === "Fantasy" && <Trophy size={16} />}
                                    {f}
                                </button>
                            ))}
                        </div>

                        {/* Story grid */}
                        <div className="story-grid">
                            {visibleStories.map((story) => (
                                <article className="story-card" key={story.id}>
                                    <div className="story-card__image-wrap">
                                        <img src={story.image} alt={story.title} className="story-card__image" />
                                        <span
                                            className={`badge badge--category badge--${story.category.toLowerCase()}`}
                                        >
                                            {story.category.toUpperCase()}
                                        </span>
                                        <span className="story-card__time">{story.time}</span>
                                    </div>
                                    <div className="story-card__body">
                                        <h3 className="story-card__title">{story.title}</h3>
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

                        {/* Live scores */}
                        <div className="panel">
                            <div className="panel__header">
                                <h3>LIVE SCORES</h3>
                                <a href="#view-all" className="panel__link">
                                    View all
                                </a>
                            </div>
                            <div className="score-tabs">
                                {scoreTabs.map((tab) => (
                                    <button
                                        key={tab}
                                        className={`score-tab ${activeScoreTab === tab ? "score-tab--active" : ""
                                            }`}
                                        onClick={() => setActiveScoreTab(tab)}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                            <ul className="match-list">
                                {liveMatches.map((m, idx) => (
                                    <li className="match-item" key={idx}>
                                        <div className="match-item__status">
                                            <span
                                                className={`status-pill ${m.status === "LIVE" ? "status-pill--live" : "status-pill--ht"
                                                    }`}
                                            >
                                                {m.status}
                                            </span>
                                            <span className="match-item__minute">{m.minute}</span>
                                        </div>
                                        <div className="match-item__teams">
                                            <div className="match-item__team">
                                                <span className="crest">{m.homeCrest}</span>
                                                <span className="team-name">{m.homeTeam}</span>
                                                <span className="team-score">{m.homeScore}</span>
                                            </div>
                                            <div className="match-item__team">
                                                <span className="crest">{m.awayCrest}</span>
                                                <span className="team-name">{m.awayTeam}</span>
                                                <span className="team-score">{m.awayScore}</span>
                                            </div>
                                            <span className="match-item__league">{m.league}</span>
                                        </div>
                                        <button className="icon-btn" aria-label="Favorite match">
                                            <Star size={16} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <a href="#view-all-scores" className="view-all-link">
                                View all live scores <ArrowRight size={14} />
                            </a>
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
