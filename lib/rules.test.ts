import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdown } from "./rules";

describe("parseInline", () => {
  it("gras et italique", () => {
    expect(parseInline("a **b** c *d*")).toEqual([{ text: "a " }, { text: "b", bold: true }, { text: " c " }, { text: "d", italic: true }]);
  });
  it("laisse le HTML comme texte brut", () => {
    expect(parseInline("<script>alert(1)</script>")).toEqual([{ text: "<script>alert(1)</script>" }]);
  });
});

describe("parseMarkdown", () => {
  it("paragraphes et listes", () => {
    const b = parseMarkdown("Intro\n- un\n- **deux**\n\nFin");
    expect(b.map((x) => x.type)).toEqual(["p", "ul", "p"]);
    expect(b[1].type === "ul" && b[1].items).toHaveLength(2);
  });
  it("texte vide", () => expect(parseMarkdown("  \n ")).toEqual([]));
});
