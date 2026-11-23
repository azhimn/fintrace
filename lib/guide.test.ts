import { describe, expect, it } from "vitest";
import { parseGuide, parseInline } from "./guide";

describe("guide Markdown", () => {
  it("splits sections and groups lines into blocks", () => {
    const md = [
      "Intro line one",
      "and two.",
      "",
      "## Record a transaction",
      "### Quick",
      "1. Tap **Record**",
      "2. Type the amount,",
      "   like `50rb`",
      "- a bullet",
      "",
      "Closing words.",
    ].join("\n");
    expect(parseGuide(md)).toEqual([
      { id: "", title: "", blocks: [{ kind: "p", text: "Intro line one and two." }] },
      {
        id: "record-a-transaction",
        title: "Record a transaction",
        blocks: [
          { kind: "h3", text: "Quick" },
          { kind: "ol", items: ["Tap **Record**", "Type the amount, like `50rb`"] },
          { kind: "ul", items: ["a bullet"] },
          { kind: "p", text: "Closing words." },
        ],
      },
    ]);
  });

  it("drops an empty intro", () => {
    expect(parseGuide("## Only\ntext").map((s) => s.id)).toEqual(["only"]);
  });

  it("marks bold and keys, and leaves stray markers as text", () => {
    expect(parseInline("Press `R` to **Record** a * thing")).toEqual([
      { kind: "text", text: "Press " },
      { kind: "key", text: "R" },
      { kind: "text", text: " to " },
      { kind: "bold", text: "Record" },
      { kind: "text", text: " a * thing" },
    ]);
  });
});
