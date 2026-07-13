/* =========================================================================
   Resend — server-only. Order confirmation for the PayPal direct-checkout
   path only: Shopify's own hosted-checkout orders already get Shopify's
   automatic confirmation email, so this only fires for orders Shopify never
   sees (see lib/paypal.ts + api/paypal/orders/capture).
   ========================================================================= */

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM_EMAIL;

export function isEmailConfigured(): boolean {
  return Boolean(API_KEY && FROM);
}

export interface OrderConfirmationLine {
  title: string;
  size: string;
  quantity: number;
  attributes: { key: string; value: string }[];
}

export interface OrderConfirmationInput {
  toEmail: string;
  customerName?: string;
  orderId: string;
  amountUsd: number;
  lines: OrderConfirmationLine[];
}

function renderLine(line: OrderConfirmationLine): string {
  const personalization = line.attributes
    .filter((a) => !a.key.startsWith("_") && a.value)
    .map((a) => `${a.key}: ${a.value}`)
    .join(" · ");
  return `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee;">
        <div>${line.title} — Size ${line.size} × ${line.quantity}</div>
        ${personalization ? `<div style="color:#666;font-size:13px;">${personalization}</div>` : ""}
      </td>
    </tr>`;
}

export async function sendOrderConfirmationEmail(input: OrderConfirmationInput): Promise<void> {
  if (!isEmailConfigured()) throw new Error("Resend is not configured");

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="letter-spacing:0.05em;">HUNCH</h2>
      <p>Thanks${input.customerName ? `, ${input.customerName}` : ""} — your order is confirmed.</p>
      <table style="width:100%;border-collapse:collapse;">${input.lines.map(renderLine).join("")}</table>
      <p style="margin-top:16px;"><strong>Total: $${input.amountUsd.toFixed(2)}</strong></p>
      <p style="color:#999;font-size:12px;">Order reference: ${input.orderId}</p>
    </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      from: `HUNCH <${FROM}>`,
      to: [input.toEmail],
      subject: "Your HUNCH order is confirmed",
      html,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Resend send failed: ${JSON.stringify(json)}`);
}
