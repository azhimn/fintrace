import type { NextRequest } from "next/server";
import { today } from "@/lib/calendar";
import type { Suggestion } from "@/lib/record";
import { getDal } from "@/lib/session";

// GET, not a Server Action: suggestions run on every keystroke, and actions queue one at a time.
export async function GET(request: NextRequest) {
  const dal = await getDal();
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  const date = today();
  const cycle = await dal.cycleOn(date);
  const { history, plan, wishes } = await dal.suggestItems(q, date, cycle?.id);

  const flow = (r: (typeof history)[number] | (typeof plan)[number]) => ({
    item: r.item,
    type: r.type,
    location: r.location,
    sourceAccountId: r.sourceAccountId,
    destAccountId: r.destAccountId,
    sourceEnvelopeId: r.sourceEnvelopeId,
    destEnvelopeId: r.destEnvelopeId,
    amount: r.amount,
    quantity: r.quantity,
    discount: r.discount,
    unit: r.unit,
    subcategoryId: r.subcategoryId,
    classification: r.classification,
  });
  const all: Suggestion[] = [
    // A plan item comes first when it shares a name, so the record links to the plan.
    ...plan.map((p) => ({ key: `plan:${p.id}`, item: p.item, from: "plan" as const, fill: { ...flow(p), planItemId: p.id } })),
    ...history.map((t) => ({ key: `history:${t.id}`, item: t.item, from: "history" as const, fill: { ...flow(t), tags: t.tags } })),
    ...wishes.map((w) => ({
      key: `wishlist:${w.id}`,
      item: w.item,
      from: "wishlist" as const,
      fill: { item: w.item, type: "expense" as const, amount: w.price, quantity: w.quantity, discount: w.discount, unit: w.unit },
    })),
  ];
  const seen = new Set<string>();
  const unique = all.filter((s) => !seen.has(s.item.toLowerCase()) && seen.add(s.item.toLowerCase()));
  return Response.json(unique.slice(0, 8), { headers: { "Cache-Control": "private, no-store" } });
}
