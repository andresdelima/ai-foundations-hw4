import { Link } from 'react-router-dom'

export default function About() {
  return (
    <div className="container page about">
      <section className="about-intro">
        <span className="eyebrow">About us</span>
        <h1>Bulldog spirit, printed just down the street.</h1>
        <p className="lead">
          Campus Customs is a New Haven shop that makes officially licensed Yale apparel. We design and print gear for the
          whole Yale community: first-years finding their college, varsity fans packing the Bowl, alumni coming back for
          reunions, and the families who cheer them on.
        </p>
      </section>

      <section className="about-grid">
        <div className="card">
          <h3>What we make</h3>
          <p>
            Tees, crewnecks, hoodies, quarter-zips, and fleece jackets, with collections for the residential colleges,
            Yale sports, the graduate and professional schools, and proud relatives.
          </p>
        </div>
        <div className="card">
          <h3>Officially licensed</h3>
          <p>Everything we sell carries an official Yale license, so the crests, colors, and marks are the real thing.</p>
        </div>
        <div className="card">
          <h3>Always open online</h3>
          <p>
            Our store runs online 24/7. Browse any time, and use the chat in the corner to ask about sizes, stock, and
            prices.
          </p>
        </div>
      </section>

      <section className="policy" id="shipping">
        <h2>Shipping</h2>
        <ul>
          <li>Each item is made to order. Most orders are printed within 5–8 business days, and a little longer in busy seasons.</li>
          <li>Delivery time starts after printing and depends on where you are and the shipping speed you pick.</li>
          <li>Most US orders ship with UPS, and we email tracking as soon as your package leaves.</li>
          <li>We ship internationally. Any customs duties or import fees are paid by the customer.</li>
        </ul>
      </section>

      <section className="policy" id="returns">
        <h2>Returns and exchanges</h2>
        <ul>
          <li>You have 30 days from the ship date to send an item back.</li>
          <li>Items should be unworn and unused, with the original tags still on.</li>
          <li>Custom pieces and final-sale items can't be returned or exchanged.</li>
          <li>
            If we sent the wrong item or something went wrong, we cover return shipping. If you simply changed your mind,
            return shipping is on you.
          </li>
          <li>Refunds don't include the original shipping cost and usually appear within 2–10 business days.</li>
          <li>
            To start a return, send the item with a trackable carrier and email the tracking number to{' '}
            <a href="mailto:orderdept@campuscustoms.com">orderdept@campuscustoms.com</a>.
          </li>
        </ul>
      </section>

      <section className="contact-card">
        <div>
          <h2>Say hello</h2>
          <p>
            Email <a href="mailto:orderdept@campuscustoms.com">orderdept@campuscustoms.com</a> or call{' '}
            <a href="tel:+14753014205">(475) 301-4205</a>.
          </p>
          <p>Home base: 57 Broadway, New Haven, CT 06511</p>
        </div>
        <Link to="/products" className="btn btn-primary">
          Start shopping
        </Link>
      </section>
    </div>
  )
}
