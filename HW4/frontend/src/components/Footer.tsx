import { Link } from 'react-router-dom'
import { BulldogMark, Marquee } from './Brand'

const COLLEGES = [
  'Benjamin Franklin', 'Berkeley', 'Branford', 'Davenport', 'Grace Hopper', 'Jonathan Edwards',
  'Morse', 'Pierson', 'Saybrook', 'Timothy Dwight', 'Trumbull',
]

export default function Footer() {
  return (
    <footer className="site-footer">
      <Marquee items={COLLEGES} variant="cream" />
      <div className="container footer-grid">
        <div className="footer-brand">
          <BulldogMark size={56} />
          <p className="footer-wordmark">Boola Boola</p>
          <p>Officially licensed Yale apparel, printed in New Haven and shipped wherever Bulldogs live.</p>
        </div>
        <div>
          <h4>Shop</h4>
          <Link to="/products">All products</Link>
          <Link to="/products?category=Hoodies">Hoodies</Link>
          <Link to="/products?collection=Residential%20Colleges">Residential colleges</Link>
          <Link to="/products?collection=Relatives">For the family</Link>
        </div>
        <div>
          <h4>Help</h4>
          <Link to="/about#shipping">Shipping</Link>
          <Link to="/about#returns">Returns</Link>
          <a href="mailto:orderdept@campuscustoms.com">orderdept@campuscustoms.com</a>
          <a href="tel:+14753014205">(475) 301-4205</a>
        </div>
        <div>
          <h4>Home base</h4>
          <p>
            57 Broadway
            <br />
            New Haven, CT 06511
          </p>
          <p className="footer-open">
            <span className="live-dot" /> Online store open 24/7
          </p>
        </div>
      </div>
      <div className="footer-bottom">© 2026 Campus Customs · For Bulldogs, by New Haven · Class project demo store</div>
    </footer>
  )
}
