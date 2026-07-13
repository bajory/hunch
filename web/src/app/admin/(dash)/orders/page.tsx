import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Orders — HUNCH Admin" };

interface OrderLineItem {
  title: string;
  size: string;
  quantity: number;
  attributes: { key: string; value: string }[];
}

interface OrderRow {
  id: number;
  paypal_order_id: string;
  paypal_capture_id: string | null;
  status: "created" | "captured" | "failed";
  amount_usd: number;
  amount_qar: number;
  customer_email: string | null;
  customer_name: string | null;
  line_items: OrderLineItem[];
  created_at: string;
}

export default async function OrdersPage() {
  const admin = createAdminClient();
  if (!admin) {
    return (
      <div className="adm-page">
        <div className="adm-table__empty">Add SUPABASE_SERVICE_ROLE_KEY to .env.local to view orders.</div>
      </div>
    );
  }

  const { data: rows } = await admin.from("orders").select("*").order("created_at", { ascending: false });
  const orders = (rows as OrderRow[]) ?? [];

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <h1>Orders</h1>
      </div>
      <p className="adm-hint" style={{ marginBottom: 16 }}>
        Direct PayPal / Apple Pay / Google Pay / card orders only — these bypass Shopify entirely, so
        Shopify&rsquo;s own order list never shows them. Shopify-checkout orders live in your Shopify admin as usual.
      </p>

      {orders.length === 0 ? (
        <div className="adm-table__empty">No PayPal-path orders yet.</div>
      ) : (
        <table className="adm-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{new Date(o.created_at).toLocaleString()}</td>
                <td>
                  <div className="adm-table__name">{o.customer_name ?? "—"}</div>
                  <div className="adm-table__sub">{o.customer_email ?? o.paypal_order_id}</div>
                </td>
                <td>
                  {o.line_items.map((li, i) => (
                    <div key={i} className="adm-table__sub">
                      {li.quantity}× {li.title} ({li.size})
                    </div>
                  ))}
                </td>
                <td>${Number(o.amount_usd).toFixed(2)}</td>
                <td>
                  {o.status === "captured"
                    ? <span className="adm-pill is-good">Captured</span>
                    : o.status === "failed"
                      ? <span className="adm-pill is-bad">Failed</span>
                      : <span className="adm-pill is-warn">Created</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
