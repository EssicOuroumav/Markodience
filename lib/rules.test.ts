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

import { RULE_SECTIONS, RULE_TEMPLATES, RULE_HINTS } from "./rules";
describe("modèles de règles", () => {
  it("chaque section a un modèle et une aide", () => {
    for (const { key } of RULE_SECTIONS) {
      expect(parseMarkdown(RULE_TEMPLATES[key]).length).toBeGreaterThan(0);
      expect(RULE_HINTS[key].length).toBeGreaterThan(10);
    }
  });
  it("les modèles ne contiennent aucun HTML", () => {
    for (const { key } of RULE_SECTIONS) expect(RULE_TEMPLATES[key]).not.toMatch(/<[a-z]/i);
  });
});
