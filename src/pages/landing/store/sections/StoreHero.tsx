import './StoreHero.css';

function StoreHero() {
  return (
    <section className="store-hero">
      <img className="store-hero-image" src="/images/sstore.jpg" alt="" aria-hidden="true" />
      <div className="store-hero-overlay" aria-hidden="true" />

      <div className="store-hero-inner">
        <p className="store-hero-eyebrow">League OS Store</p>
        <h1 className="store-hero-heading">
          Official Club
          <br />
          Merchandise.
          <br />
          <span className="store-hero-heading-gradient">Made For Africa.</span>
        </h1>
        <p className="store-hero-subtext">
          Represent your club. Wear your pride. Support African sport. Football. Rugby. Basketball. One Nation. One
          Passion.
        </p>
      </div>
    </section>
  );
}

export default StoreHero;
