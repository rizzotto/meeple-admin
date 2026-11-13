import type { Template } from "./scoring";
export const duneScoringPtBR: Record<string, string> = {};
const fields: Template["fields"] = [
  {
    id: "vp",
    label: "Victory points",
    hint: "Complete final VP, including expansion and endgame card effects. Do not add track points twice.",
    total: true,
    min: 0,
  },
];
const tieBreakers: NonNullable<Template["tieBreakers"]> = [
  { id: "spice", label: "Spice", hint: "Remaining spice.", total: false, min: 0, direction: "higher" },
  { id: "solari", label: "Solari", hint: "Remaining Solari.", total: false, min: 0, direction: "higher" },
  { id: "water", label: "Water", hint: "Remaining water.", total: false, min: 0, direction: "higher" },
  { id: "troops", label: "Garrison troops", hint: "Troops in your garrison.", total: false, min: 0, direction: "higher" },
];
export const duneExpansionTemplates: Record<string, Template> = {};
for (const [suffix, expansionIds, title] of [
  ["ix", ["dune-ix"], "Rise of Ix"],
  ["immortality", ["dune-immortality"], "Immortality"],
  ["ix-immortality", ["dune-ix", "dune-immortality"], "Ix + Immortality"],
] as const) {
  for (const mode of [
    "standard",
    ...(suffix.includes("ix") ? ["epic"] : []),
    ...(suffix.includes("immortality") ? ["long"] : []),
  ]) {
    const id = `dune-${suffix}-${mode}-v1`;
    const modeLabel =
      mode === "epic" ? "Epic" : mode === "long" ? "Go to 11" : "Standard";
    const modePt =
      mode === "epic" ? "Épico" : mode === "long" ? "Até 11" : "Padrão";
    duneExpansionTemplates[id] = {
      id,
      version: 1,
      engineVersion: 1,
      title: `Dune: Imperium · ${title} · ${modeLabel}`,
      edition: `Original Imperium + ${title} · ${modeLabel} · 1–4 players`,
      source: "https://direwolfdigital.com/dune-imperium/resources/",
      expansionIds: [...expansionIds],
      minPlayers: 1,
      maxPlayers: 4,
      fields,
      tieBreakers,
      endCondition:
        (mode === "epic"
          ? "Epic: use the Epic setup and 12 VP endgame threshold. "
          : mode === "long"
            ? "Go to 11 variant: 3 players play to 11 VP; 4 players start at 0 and play to 10. "
            : "Standard: use the 10 VP endgame threshold. ") +
        "Check at Recall, or end when the Conflict deck is empty. Resolve endgame Intrigue and expansion effects before entering final VP. " +
        (mode === "epic" && suffix.includes("immortality")
          ? "With Immortality, put Control the Spice in the discard pile instead of replacing a starting card. "
          : "") +
        "Record totals resolved at the table; this sheet does not simulate card effects. For solo games, include Rival scores or override the winner after resolving House Hagal rules at the table.",
    };
    const template = duneExpansionTemplates[id];
    duneScoringPtBR[template.title] = `Dune: Imperium · ${title} · ${modePt}`;
    duneScoringPtBR[template.edition] =
      `Imperium original + ${title} · ${modePt} · 1–4 jogadores`;
    duneScoringPtBR[template.endCondition] =
      (mode === "epic"
        ? "Épico: use a preparação épica e o limite de 12 PV. "
        : mode === "long"
          ? "Variante Até 11: 3 jogadores jogam até 11 PV; 4 jogadores começam em 0 e jogam até 10. "
          : "Padrão: use o limite de 10 PV. ") +
      "Verifique na fase de Recolher, ou encerre quando o baralho de Conflito acabar. Resolva as Intrigas de fim de jogo e os efeitos das expansões antes de informar os PV finais. " +
      (mode === "epic" && suffix.includes("immortality")
        ? "Com Immortality, coloque Control the Spice no descarte em vez de substituir uma carta inicial. "
        : "") +
      "Registre os totais resolvidos na mesa; o modelo não simula efeitos de cartas. Em partidas solo, inclua os pontos dos rivais ou ajuste o vencedor após resolver as regras da Casa Hagal na mesa.";
  }
}
