import { AdminNav } from "../AdminNav";
import { signOut } from "../actions";

/* Shared CMS shell: persistent sidebar navigation + slim top bar. The
   full-screen Kit Editor (/admin/kits/...) and the login page live outside
   this route group and keep their own layouts. Auth is enforced upstream by
   the /admin/:path* proxy guard — route groups are invisible to the URL. */
export default function DashLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="adm-layout">
      <AdminNav />
      <div className="adm-main">
        <header className="adm-bar adm-bar--dash">
          <span className="adm-bar__title">Store management</span>
          <form action={signOut} style={{ marginLeft: "auto" }}>
            <button type="submit" className="adm-bar__signout">Sign out</button>
          </form>
        </header>
        {children}
      </div>
    </div>
  );
}
