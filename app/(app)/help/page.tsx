import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ViewTransition } from "react";
import en from "@/docs/guide/en.md";
import id from "@/docs/guide/id.md";
import { Contents, RememberLanguage } from "@/components/help/contents";
import { Band } from "@/components/shell/band";
import { type Block, parseGuide, parseInline } from "@/lib/guide";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Guide" };

const GUIDES = {
  en: { label: "English", title: "Guide", contents: "Contents", sections: parseGuide(en) },
  id: { label: "Indonesia", title: "Panduan", contents: "Daftar isi", sections: parseGuide(id) },
};

function Inline({ text }: { text: string }) {
  return parseInline(text).map((part, i) =>
    part.kind === "bold" ? (
      <strong key={i} className="font-semibold">{part.text}</strong>
    ) : part.kind === "key" ? (
      <kbd key={i} className="figure rounded-sm bg-field px-1.5 py-px text-[0.875em]">{part.text}</kbd>
    ) : (
      part.text
    ),
  );
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return blocks.map((block, i) =>
    block.kind === "h3" ? (
      <h3 key={i} className="mt-4 font-medium first:mt-0">{block.text}</h3>
    ) : block.kind === "p" ? (
      <p key={i} className="mt-2 first:mt-0"><Inline text={block.text} /></p>
    ) : (
      <ul key={i} className={cn("mt-2 flex flex-col gap-1.5 pl-5 first:mt-0", block.kind === "ol" ? "list-decimal" : "list-disc")}>
        {block.items.map((item, j) => (
          <li key={j} className="pl-1"><Inline text={item} /></li>
        ))}
      </ul>
    ),
  );
}

export default async function HelpPage({ searchParams }: PageProps<"/help">) {
  // The link's choice, else the last one used (RememberLanguage).
  const asked = (await searchParams).lang ?? (await cookies()).get("guide-lang")?.value;
  const lang = asked === "id" ? "id" : "en";
  const guide = GUIDES[lang];
  const intro = guide.sections.find((s) => !s.title);
  const sections = guide.sections.filter((s) => s.title);

  return (
    <div lang={lang}>
      <RememberLanguage lang={lang} />
      <Band>
        <div className="mt-3 flex items-center justify-between gap-3">
          <h1 className="text-[1.375rem] font-medium">{guide.title}</h1>
          <nav aria-label="Language" className="flex rounded-button bg-window p-1 text-sm">
            {(Object.keys(GUIDES) as (keyof typeof GUIDES)[]).map((key) => (
              <Link
                key={key}
                href={`/help?lang=${key}`}
                lang={key}
                transitionTypes={["band-resize"]}
                aria-current={key === lang ? "page" : undefined}
                className={cn("relative rounded-[10px] px-3 py-1.5 transition-colors", key === lang ? "font-medium" : "text-muted-foreground hover:text-foreground")}
              >
                {key === lang && (
                  // Named, so the fill slides to the other language, like the sidebar's current item.
                  <ViewTransition name="lang-current">
                    <span aria-hidden className="absolute inset-0 rounded-[10px] bg-secondary" />
                  </ViewTransition>
                )}
                {/* Named too, so mid-slide the labels stay above the fill. */}
                <span className="relative" style={{ viewTransitionName: `lang-${key}` }}>{GUIDES[key].label}</span>
              </Link>
            ))}
          </nav>
        </div>
        {intro && <div className="mt-3 max-w-2xl text-[0.9375rem]"><Blocks blocks={intro.blocks} /></div>}
      </Band>

      <main className="mx-auto max-w-5xl px-5 text-[0.9375rem] lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:items-start lg:gap-8 lg:px-8">
        <Contents label={guide.contents} sections={sections.map(({ id, title }) => ({ id, title }))} />
        <div>
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="mt-[22px] scroll-mt-20 lg:scroll-mt-6">
              <h2 className="mb-2 text-sm font-semibold">{s.title}</h2>
              <div className="max-w-2xl rounded-panel bg-panel px-4 py-4"><Blocks blocks={s.blocks} /></div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
