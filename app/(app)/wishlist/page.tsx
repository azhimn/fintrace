import type { Metadata } from "next";
import { RecordBar } from "@/components/overview/record-bar";
import { AddressWindow, Band } from "@/components/shell/band";
import { Money } from "@/components/shell/bits";
import { Wishlist } from "@/components/wishlist/wishlist";
import { getDal } from "@/lib/session";

export const metadata: Metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const items = await (await getDal()).wishlist();
  const open = items.filter((w) => !w.acquired);
  const top = open[0];

  return (
    <>
      <Band>
        <h1 className="mt-3 text-[1.375rem] font-medium">Wishlist</h1>
        <AddressWindow label="Wishlist total">
          <p className="text-[0.8125rem] font-medium text-kraft-ink">Everything still on the list</p>
          <Money
            value={open.reduce((s, w) => s + (w.total ?? 0), 0)}
            className="mt-0.5 block text-[2.125rem] leading-tight font-semibold tracking-[-0.01em]"
          />
          <dl className="mt-2 grid grid-cols-2 gap-3 text-[0.8125rem]">
            <div>
              <dt className="text-kraft-ink">Next up</dt>
              <dd className="truncate">{top ? top.item : <span className="text-kraft-ink">Nothing yet</span>}</dd>
            </div>
            <div>
              <dt className="text-kraft-ink">Wishes</dt>
              <dd>
                {open.length} open · {items.length - open.length} acquired
              </dd>
            </div>
          </dl>
        </AddressWindow>
      </Band>

      <main className="mx-auto max-w-5xl px-5 lg:px-8">
        <RecordBar placement="page" />
        <Wishlist items={items} />
      </main>
    </>
  );
}
