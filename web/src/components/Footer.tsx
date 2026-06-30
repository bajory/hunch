import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__inner">
        {/* Brand */}
        <div>
          <div className="footer__brand-name">HUNCH</div>
          <p className="footer__brand-desc">
            Luxury match jerseys, made to your name. Atelier-pressed to the
            exact specification of the game.
          </p>
        </div>

        {/* Shop */}
        <div>
          <div className="footer__col-title">Shop</div>
          <nav className="footer__links" aria-label="Shop">
            <Link href="/collections">All Collections</Link>
            <Link href="/jerseys/barcelona">FC Barcelona</Link>
            <Link href="/jerseys/real-madrid">Real Madrid</Link>
            <Link href="/jerseys/man-city">Manchester City</Link>
            <Link href="/jerseys/liverpool">Liverpool</Link>
          </nav>
        </div>

        {/* Atelier */}
        <div>
          <div className="footer__col-title">Atelier</div>
          <nav className="footer__links" aria-label="Atelier">
            <Link href="/atelier">How It Works</Link>
            <Link href="/the-house">The House</Link>
            <Link href="/atelier#materials">Materials</Link>
            <Link href="/atelier#sizing">Size Guide</Link>
          </nav>
        </div>

        {/* Support */}
        <div>
          <div className="footer__col-title">Support</div>
          <nav className="footer__links" aria-label="Support">
            <a href="mailto:studio@hunch.co">Contact Studio</a>
            <Link href="#">Shipping &amp; Returns</Link>
            <Link href="#">Size Guide</Link>
            <Link href="#">FAQ</Link>
          </nav>
        </div>
      </div>

      <div className="footer__bottom">
        <span>© {year} HUNCH Studio Ltd. All rights reserved.</span>
        <div className="footer__legal">
          <Link href="#">Privacy</Link>
          <Link href="#">Terms</Link>
          <Link href="#">Cookies</Link>
        </div>
      </div>
    </footer>
  );
}
