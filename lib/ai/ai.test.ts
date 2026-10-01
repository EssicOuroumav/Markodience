import { describe, expect, it } from "vitest";
import { extractJson } from "./json";
import { generateRequest, identityOutput, pillarsOutput, questionnaireSchema } from "./schemas";
import { mockIdentity, mockPillars } from "./mock";

describe("extractJson", () => {
  it("lit du JSON pur", () => expect(extractJson('{"a":1}')).toEqual({ a: 1 }));
  it("retire les balises markdown", () => expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 }));
  it("ignore le texte autour", () => expect(extractJson('Voici : {"a":1} fin')).toEqual({ a: 1 }));
  it("rejette l'absence de JSON", () => expect(() => extractJson("rien")).toThrow());
});

describe("schémas", () => {
  it("valide les mocks", () => {
    expect(() => identityOutput.parse(mockIdentity())).not.toThrow();
    expect(() => pillarsOutput.parse(mockPillars())).not.toThrow();
  });
  it("refuse moins de 3 piliers", () => {
    expect(pillarsOutput.safeParse({ pillars: [{ name: "a", description: "", examples: [] }] }).success).toBe(false);
  });
  it("exige 3 mots de personnalité", () => {
    const q = { brand_name: "A", offer: "x", segments: ["s"], problem: "p", differentiation: "d", personality: ["a", "b"], goal: "notoriete", channels: ["Facebook"] };
    expect(questionnaireSchema.safeParse(q).success).toBe(false);
  });
  it("refuse un type inconnu", () => {
    expect(generateRequest.safeParse({ type: "hack", brand_profile_id: "x" }).success).toBe(false);
  });
});

import { liveScriptsOutput, liveStructureOutput } from "./schemas";
import { mockLiveScripts, mockLiveStructure } from "./mock";
import { OBJECTIVES, OBJECTIVE_STRUCTURE, moveItem } from "../lives";

describe("lives", () => {
  it("valide les mocks", () => {
    expect(() => liveStructureOutput.parse(mockLiveStructure())).not.toThrow();
    expect(() => liveScriptsOutput.parse(mockLiveScripts())).not.toThrow();
  });
  it("chaque objectif a sa propre trame", () => {
    const sets = OBJECTIVES.map((o) => OBJECTIVE_STRUCTURE[o].join("|"));
    expect(new Set(sets).size).toBe(OBJECTIVES.length);
  });
  it("moveItem", () => {
    expect(moveItem([1, 2, 3], 0, 2)).toEqual([2, 3, 1]);
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
  });
});
