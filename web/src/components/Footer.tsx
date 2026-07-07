import Link from "next/link";
import { FooterMark } from "./motion/FooterMark";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__grid">
        <div className="footer__col">
          <h4>HUNCH</h4>
          <p className="footer__note">
            Authentic matchwear, sourced and pressed with the care of an
            atelier. The shirt is the product — everything else is restraint.
          </p>
        </div>
        <div className="footer__col">
          <h4>Shop</h4>
          <nav aria-label="Shop">
            <Link href="/shop">All Jerseys</Link>
            <Link href="/shop?kind=club">Clubs 26/27</Link>
            <Link href="/shop?kind=national">World Cup 2026</Link>
          </nav>
        </div>
        <div className="footer__col">
          <h4>The House</h4>
          <nav aria-label="The House">
            <Link href="/house">Our Story</Link>
            <Link href="/house#craft">Personalisation</Link>
            <Link href="/house#sizing">Size Guide</Link>
          </nav>
        </div>
        <div className="footer__col">
          <h4>Support</h4>
          <nav aria-label="Support">
            <a href="mailto:studio@hunch.co">Contact Studio</a>
            <Link href="#">Shipping &amp; Returns</Link>
            <Link href="#">FAQ</Link>
          </nav>
        </div>
      </div>

      <FooterMark />

      <div className="footer__legal">
        <span>© {year} HUNCH Studio Ltd. All rights reserved.</span>
        <span>Authentic · Player Version · Made to order</span>
      </div>
    </footer>
  );
}
