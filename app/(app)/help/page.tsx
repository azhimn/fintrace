import type { Metadata } from "next";
import Link from "next/link";
import en from "@/docs/guide/en.md";
import id from "@/docs/guide/id.md";
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
  const lang = (await searchParams).lang === "id" ? "id" : "en";
  const guide = GUIDES[lang];
  const intro = guide.sections.find((s) => !s.title);
  const sections = guide.sections.filter((s) => s.title);

  return (
    <div lang={lang}>
      <Band>
        <div className="mt-3 flex items-center justify-between gap-3">
          <h1 className="text-[1.375rem] font-medium">{guide.title}</h1>
          <nav aria-label="Language" className="flex rounded-button bg-window p-1 text-sm">
            {(Object.keys(GUIDES) as (keyof typeof GUIDES)[]).map((key) => (
              <Link
                key={key}
                href={key === "en" ? "/help" : `/help?lang=${key}`}
                lang={key}
                aria-current={key === lang ? "page" : undefined}
                className={cn("rounded-[10px] px-3 py-1.5", key === lang ? "bg-secondary font-medium" : "text-muted-foreground hover:text-foreground")}
              >
                {GUIDES[key].label}
              </Link>
            ))}
          </nav>
        </div>
        {intro && <div className="mt-3 max-w-2xl text-[0.9375rem]"><Blocks blocks={intro.blocks} /></div>}
      </Band>

      <main className="mx-auto max-w-5xl px-5 text-[0.9375rem] lg:px-8">
        <nav aria-label={guide.contents} className="mt-[22px]">
          <h2 className="mb-2 text-sm font-semibold">{guide.contents}</h2>
          <ol className="flex flex-wrap gap-2">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-button bg-panel px-3 py-2 hover:bg-accent">{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="mt-[22px] scroll-mt-20">
            <h2 className="mb-2 text-sm font-semibold">{s.title}</h2>
            <div className="max-w-2xl rounded-panel bg-panel px-4 py-4"><Blocks blocks={s.blocks} /></div>
          </section>
        ))}
      </main>
    </div>
  );
}
