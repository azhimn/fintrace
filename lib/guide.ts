/**
 * The usage guide's Markdown, cut down to what docs/guide/*.md uses: ## sections, ### headings,
 * paragraphs, "1." and "-" lists, **bold** and `keys`. Nothing is rendered as HTML.
 */
export type Block = { kind: "h3"; text: string } | { kind: "p"; text: string } | { kind: "ol" | "ul"; items: string[] };
export type GuideSection = { id: string; title: string; blocks: Block[] };

const slug = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Splits the guide into its ## sections; text before the first one is a section with no title. */
export function parseGuide(md: string): GuideSection[] {
  const sections: GuideSection[] = [{ id: "", title: "", blocks: [] }];
  let open = null as Block | null;
  for (const raw of md.split("\n")) {
    const line = raw.trim();
    const blocks = sections[sections.length - 1].blocks;
    const item = /^(\d+\.|-) (.*)$/.exec(line);
    if (!line) open = null;
    else if (line.startsWith("## ")) {
      const title = line.slice(3);
      sections.push({ id: slug(title), title, blocks: [] });
      open = null;
    } else if (line.startsWith("### ")) {
      blocks.push({ kind: "h3", text: line.slice(4) });
      open = null;
    } else if (item) {
      const kind = item[1] === "-" ? "ul" : "ol";
      if (!open || open.kind !== kind) blocks.push((open = { kind, items: [] }));
      if ("items" in open) open.items.push(item[2]);
    } else if (open?.kind === "p") open.text += " " + line;
    else if (open && "items" in open) open.items[open.items.length - 1] += " " + line;
    else blocks.push((open = { kind: "p", text: line }));
  }
  return sections.filter((s) => s.title || s.blocks.length);
}

/** Splits a line into plain text, **bold** and `key` runs. */
export function parseInline(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/)
    .filter(Boolean)
    .map((part) =>
      part.startsWith("**") && part.endsWith("**") && part.length > 4
        ? { kind: "bold" as const, text: part.slice(2, -2) }
        : part.startsWith("`") && part.endsWith("`") && part.length > 2
          ? { kind: "key" as const, text: part.slice(1, -1) }
          : { kind: "text" as const, text: part },
    );
}
