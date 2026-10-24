import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice } from '../api'
import { BulldogMark, Marquee, Reveal, Stamp } from '../components/Brand'
import ProductCard from '../components/ProductCard'
import { useChat } from '../chatContext'
import { useProducts } from '../useProducts'

const FEATURED = [
  'basic-hoodie-big-yale',
  'berkeley-1-4-zip',
  '2025-yale-vs-harvard-t-shirt',
  'brooks-brothers-bomber-jacket-yale',
]

// Hung on the shop-window clothesline in the hero.
const WINDOW = ['district-vit-crewneck-vintage-bulldog', 'basic-hoodie-big-yale', 'yale-mom-hoodie']

const SLOGANS = [
  'Lux et Veritas',
  'Made to order in New Haven',
  'Residential college pride',
  'Game-day ready',
  'Gifts for the whole Yale family',
  'Open online 24/7',
]

const PENNANT_COLORS = ['#00356b', '#0a1f3d', '#286dc0', '#00356b', '#0a1f3d']

const PATCHES: { name: string; letter: string; blurb: string }[] = [
  { name: 'Residential Colleges', letter: 'RC', blurb: 'Berkeley to Trumbull' },
  { name: 'Sports', letter: 'Y', blurb: 'Every varsity Bulldog' },
  { name: 'Relatives', letter: 'MOM', blurb: 'Proud Yale families' },
  { name: 'Graduate & Professional Schools', letter: 'GS', blurb: 'Law, SOM, Med & more' },
]

export default function Home() {
  const { data } = useProducts()
  const { askAbout } = useChat()
  const byId = new Map(data?.products.map((p) => [p.product_id, p]))
  const featured = FEATURED.map((id) => byId.get(id)).filter((p) => p !== undefined)
  const hanging = WINDOW.map((id) => byId.get(id)).filter((p) => p !== undefined)

  const categoryTiles = (data?.categories ?? []).map((c) => ({
    name: c,
    count: data!.products.filter((p) => p.category === c).length,
    image: data!.products.find((p) => p.category === c)?.image_url,
    from: Math.min(...data!.products.filter((p) => p.category === c).map((p) => p.price)),
  }))

  return (
    <>
      {/* ---------- Hero: the shop window ---------- */}
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="varsity-eyebrow">Campus Customs · New Haven</span>
            <h1>
              Wear your <em>Bulldog</em> pride, every day of the year.
            </h1>
            <p>
              Hoodies, crewnecks, quarter-zips and tees for students, alumni, and every proud Yale family. Printed to
              order just off campus.
            </p>
            <div className="hero-actions">
              <Link to="/products" className="btn btn-light btn-lg">
                Shop the collection
              </Link>
              <button className="btn btn-outline-light btn-lg" onClick={() => askAbout('What would make a good gift for a Yale parent?')}>
                <BulldogMark size={22} /> Ask the Bulldog
              </button>
            </div>
            <ul className="hero-proof">
              <li>
                <strong>{data?.count ?? 102}</strong> styles
              </li>
              <li>
                <strong>11</strong> residential colleges
              </li>
              <li>
                <strong>24/7</strong> shopping help
              </li>
            </ul>
          </div>

          <div className="shop-window" aria-label="Featured in the window">
            <div className="clothesline" aria-hidden />
            <div className="hanging-row">
              {hanging.map((p, i) => (
                <Link key={p.product_id} to={`/products/${p.product_id}`} className={`hanging hanging-${i}`}>
                  <span className="pin" aria-hidden />
                  <img src={p.image_url} alt={p.name} />
                  <span className="hanging-tag">{formatPrice(p.price)}</span>
                </Link>
              ))}
            </div>
            <div className="window-stamp">
              <Stamp text="OFFICIALLY LICENSED ✦ MADE IN NEW HAVEN ✦ " size={118}>
                <BulldogMark size={46} />
              </Stamp>
            </div>
            <span className="window-sign">Now in the window</span>
          </div>
        </div>
      </section>

      <Marquee items={SLOGANS} />

      {/* ---------- Categories as felt pennants ---------- */}
      <section className="container section">
        <Reveal>
          <div className="section-head">
            <div>
              <span className="varsity-eyebrow dark">Shop by category</span>
              <h2>Pick your layer</h2>
            </div>
            <Link to="/products">View all →</Link>
          </div>
        </Reveal>
        <div className="pennant-rope" aria-hidden />
        <div className="pennant-row">
          {categoryTiles.map((c, i) => (
            <Reveal key={c.name} delay={i * 80}>
              <Link
                to={`/products?category=${encodeURIComponent(c.name)}`}
                className="pennant"
                style={{ '--pennant': PENNANT_COLORS[i % PENNANT_COLORS.length] } as CSSProperties}
              >
                <span className="pennant-flag">
                  <span className="pennant-name">{c.name}</span>
                  <span className="pennant-meta">
                    {c.count} styles · from {formatPrice(c.from)}
                  </span>
                </span>
                {c.image && <img className="pennant-photo" src={c.image} alt="" />}
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Favorites ---------- */}
      <section className="container section">
        <Reveal>
          <div className="section-head">
            <div>
              <span className="varsity-eyebrow dark">Staff picks</span>
              <h2>Bulldog favorites</h2>
            </div>
            <Link to="/products">Browse the catalogue →</Link>
          </div>
        </Reveal>
        <div className="product-grid">
          {featured.map((p, i) => (
            <Reveal key={p.product_id} delay={i * 90}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Collections as chenille letter patches ---------- */}
      <section className="band">
        <div className="container section">
          <Reveal>
            <span className="varsity-eyebrow dark">Collections</span>
            <h2>Find your crew</h2>
          </Reveal>
          <div className="patch-grid">
            {PATCHES.map((c, i) => (
              <Reveal key={c.name} delay={i * 90}>
                <Link to={`/products?collection=${encodeURIComponent(c.name)}`} className="patch">
                  <span className="patch-letter">{c.letter}</span>
                  <strong>{c.name}</strong>
                  <span>{c.blurb}</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- The Bulldog: AI shopping help, shown not told ---------- */}
      <section className="container section">
        <Reveal>
          <div className="ask-band">
            <div className="ask-copy">
              <span className="varsity-eyebrow">Meet the Bulldog</span>
              <h2>Ask about sizes, stock, and gifts, and get a straight answer.</h2>
              <p>
                Our shopping assistant checks live inventory before it answers, puts matching items right on the page,
                and remembers your last chat when you log in.
              </p>
              <div className="ask-chips">
                {['What hoodies do you have?', 'Gift for my grandpa?', 'Navy crewnecks under $60'].map((q) => (
                  <button key={q} onClick={() => askAbout(q)}>
                    “{q}”
                  </button>
                ))}
              </div>
            </div>
            <div className="ask-demo" aria-hidden>
              <div className="demo-msg user">Do you have the Morse 1/4 Zip in a large?</div>
              <div className="demo-msg bot">
                <BulldogMark size={28} />
                <span>
                  <b>Size L is sold out</b>, but these are in stock in L: Benjamin Franklin, Berkeley, and Branford
                  1/4 Zips, same price.
                </span>
              </div>
              <div className="demo-verified">✓ prices checked against live inventory</div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="container section promise">
        {[
          { icon: '🧵', title: 'Made for you', text: 'Every order is printed after you buy it, usually within 5–8 business days.' },
          { icon: '✓', title: 'Honest answers', text: 'Prices and stock come straight from our inventory. What you see is what we have.' },
          { icon: '☾', title: 'Open around the clock', text: 'Shop and chat any time. The online store never closes.' },
        ].map((b, i) => (
          <Reveal key={b.title} delay={i * 90}>
            <div className="promise-item">
              <span className="promise-icon">{b.icon}</span>
              <h3>{b.title}</h3>
              <p>{b.text}</p>
            </div>
          </Reveal>
        ))}
      </section>
    </>
  )
}
