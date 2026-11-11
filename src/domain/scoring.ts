import { duneExpansionTemplates } from "./dune-templates";
import { rankedTemplates, rankedTemplateId } from "./ranked-templates";
import type { Game } from "./model";
export type Field = {
  id: string;
  label: string;
  hint: string;
  total: boolean;
  min: number;
  max?: number;
  roleIds?: string[];
};
export type Template = {
  id: string;
  version: number;
  engineVersion: 1 | 2;
  resultMode?: "declared" | "cooperative" | "race";
  title: string;
  edition: string;
  source: string;
  minPlayers: number;
  maxPlayers: number;
  fields: Field[];
  tieBreakers: string[];
  endCondition: string;
  roles?: { id: string; label: string }[];
  lowestWins?: boolean;
  expansionIds?: string[];
};
const field = (
  id: string,
  label: string,
  hint: string,
  total = true,
  min = 0,
): Field => ({ id, label, hint, total, min });
export const templates: Record<string, Template> = {
  ...rankedTemplates,
  ...duneExpansionTemplates,
  "win-loss-v1": {
    id: "win-loss-v1", version: 1, engineVersion: 2,
    resultMode: "declared", title: "Win/loss only", edition: "Competitive",
    source: "", minPlayers: 1, maxPlayers: 12,
    fields: [field("outcome", "Outcome", "Choose victory or defeat for each player.", true, 0)],
    tieBreakers: [], endCondition: "Confirm the final outcome for every player.",
  },
  "cooperative-win-loss-v1": {
    id: "cooperative-win-loss-v1", version: 1, engineVersion: 2,
    resultMode: "cooperative", title: "Cooperative win/loss", edition: "Cooperative",
    source: "", minPlayers: 1, maxPlayers: 12,
    fields: [field("outcome", "Outcome", "Choose the outcome for the whole group.", true, 0)],
    tieBreakers: [], endCondition: "Confirm the final outcome for the group.",
  },
  "manual-v1": {
    id: "manual-v1",
    version: 1,
    engineVersion: 1,
    title: "Manual score",
    edition: "Highest score · shared ties",
    source: "",
    minPlayers: 2,
    maxPlayers: 12,
    fields: [
      field(
        "score",
        "Final score",
        "Enter the complete final score.",
        true,
        -100000,
      ),
    ],
    tieBreakers: [],
    endCondition: "Confirm that scoring is complete.",
  },
  "everdell-v1": {
    id: "everdell-v1",
    version: 1,
    engineVersion: 1,
    title: "Everdell",
    edition: "Base game · competitive multiplayer",
    source:
      "https://cdn.shopify.com/s/files/1/0559/8245/6947/files/Everdell_Core_Game_Rulebook-web_res.pdf?v=1647463603",
    minPlayers: 2,
    maxPlayers: 4,
    fields: [
      field(
        "cards",
        "Printed card points",
        "Printed base points only, including Prosperity cards.",
      ),
      field("tokens", "Point tokens", "All collected point tokens."),
      field(
        "events",
        "Event points",
        "Points from basic and special Events; not the number of Events.",
      ),
      field(
        "journey",
        "Journey points",
        "Points from workers on Journey spaces.",
      ),
      field(
        "prosperity",
        "Prosperity bonuses",
        "Bonus points only; printed base points belong above.",
      ),
      field(
        "eventCount",
        "Events achieved",
        "Number of Events, used only if scores tie.",
        false,
      ),
      field(
        "resources",
        "Leftover resources",
        "Total remaining twigs, resin, pebbles and berries.",
        false,
      ),
    ],
    tieBreakers: ["eventCount", "resources"],
    endCondition:
      "All players have finished and final bonuses have been counted.",
  },
  "dune-v1": {
    id: "dune-v1",
    version: 1,
    engineVersion: 1,
    title: "Dune: Imperium",
    edition: "Original base game · 1–4 players",
    source: "https://www.direwolfdigital.com/dune-imperium/resources/",
    minPlayers: 1,
    maxPlayers: 4,
    fields: [
      field(
        "vp",
        "Victory points",
        "Final VP after endgame Intrigue cards and all final scoring.",
      ),
      field("spice", "Spice", "Remaining spice; first tie-breaker.", false),
      field("solari", "Solari", "Remaining Solari; second tie-breaker.", false),
      field("water", "Water", "Remaining water; third tie-breaker.", false),
      field(
        "troops",
        "Garrison troops",
        "Troops in your garrison; final tie-breaker.",
        false,
      ),
    ],
    tieBreakers: ["spice", "solari", "water", "troops"],
    endCondition:
      "At Recall, 10+ VP or an empty Conflict deck triggers the endgame. Resolve endgame Intrigue cards before final scoring. Reaching 10 VP does not immediately declare a winner.",
  },
};
export type Player = {
  id: string;
  name: string;
  userId?: string;
  roleId?: string;
  scores: Record<string, number | null>;
};
export type Result = {
  rows: { playerId: string; total: number; place: number }[];
  winnerIds: string[];
  explanation: string;
  overridden: boolean;
};
export type Override = { winnerIds: string[]; reason: string };

export function evaluate(
  template: Template,
  players: Player[],
  finalScoringConfirmed: boolean,
  override?: Override,
): Result {
  if (template.engineVersion !== 1 && template.engineVersion !== 2)
    throw new Error("Unsupported scoring engine version.");
  if (
    players.length < template.minPlayers ||
    players.length > template.maxPlayers
  )
    throw new Error(
      `Use ${template.minPlayers}–${template.maxPlayers} players for this template.`,
    );
  if (new Set(players.map((p) => p.id)).size !== players.length)
    throw new Error("Players must have unique IDs.");
  if (!finalScoringConfirmed)
    throw new Error("Confirm that the game and final scoring are complete.");
  const totals = players.map((p) => {
    if (!p.name.trim() || p.name.length > 60)
      throw new Error("Enter a player name of 1–60 characters.");
    if (
      template.roles?.length &&
      !template.roles.some((r) => r.id === p.roleId)
    )
      throw new Error(`${p.name}: select a role or faction.`);
    let total = 0;
    for (const f of fieldsForPlayer(template, p).filter((f) => f.total)) {
      const value = p.scores[f.id];
      if (value === null || value === undefined)
        throw new Error(`${p.name}: enter ${f.label.toLowerCase()}.`);
      validate(value, f, p.name);
      total += value;
    }
    for (const f of fieldsForPlayer(template, p).filter((f) => !f.total)) {
      const value = p.scores[f.id];
      if (value != null) validate(value, f, p.name);
    }
    return { playerId: p.id, total, keys: [] as number[] };
  });
  if (template.resultMode) {
    const mode = template.resultMode;
    const outcomes = players.map((p) => p.scores.outcome);
    if (mode !== "race" && outcomes.some((v) => v !== 0 && v !== 1))
      throw new Error(
        "Record an outcome for every player: 1 for victory, 0 for defeat.",
      );
    if (mode === "cooperative" && new Set(outcomes).size !== 1)
      throw new Error("All players must have the same cooperative outcome.");
    if (
      mode === "race" &&
      new Set(totals.map((p) => p.total)).size !== totals.length
    )
      throw new Error("Race finishing positions must be unique.");
    const rows = totals
      .map((row, i) => ({
        playerId: row.playerId,
        total: row.total,
        place: mode === "race" ? row.total : outcomes[i] === 1 ? 1 : 2,
      }))
      .sort((a, b) => a.place - b.place || b.total - a.total);
    if (override)
      throw new Error(
        "Correct the recorded outcome or finishing position instead of overriding it.",
      );
    return {
      rows,
      winnerIds: rows.filter((r) => r.place === 1).map((r) => r.playerId),
      explanation:
        mode === "race"
          ? "Race result recorded by finishing position. An unlisted driver may win."
          : mode === "cooperative"
            ? outcomes[0] === 1
              ? "Cooperative victory: all players win."
              : "Cooperative defeat: no player wins."
            : "Result recorded from the table. Scores are kept for reference; resolve victory conditions and ties using the rules.",
      overridden: false,
    };
  }
  // Resolve only tied groups, requesting each next criterion only if still tied.
  let groups = [...new Set(totals.map((p) => p.total))]
    .sort((a, b) => (template.lowestWins ? a - b : b - a))
    .map((n) => totals.filter((p) => p.total === n));
  const used: string[] = [];
  for (const key of template.tieBreakers) {
    const f = template.fields.find((f) => f.id === key)!;
    groups = groups.flatMap((group) => {
      if (group.length === 1) return [group];
      used.push(f.label);
      for (const row of group) {
        const player = players.find((p) => p.id === row.playerId)!;
        const value = player.scores[key];
        if (value == null)
          throw new Error(
            `${player.name}: enter ${f.label.toLowerCase()} to resolve the tie.`,
          );
        validate(value, f, player.name);
        row.keys.push(value);
      }
      return [...new Set(group.map((r) => r.keys.at(-1)!))]
        .sort((a, b) => b - a)
        .map((v) => group.filter((r) => r.keys.at(-1) === v));
    });
  }
  let place = 1;
  const rows = groups.flatMap((group) => {
    const ranked = group.map((r) => ({
      playerId: r.playerId,
      total: r.total,
      place,
    }));
    place += group.length;
    return ranked;
  });
  const winnerIds = rows.filter((r) => r.place === 1).map((r) => r.playerId);
  let explanation = used.length
    ? `Scores compared, then ${[...new Set(used)].join(", ")} in order. Remaining ties share a place.`
    : `${template.lowestWins ? "Lowest" : "Highest"} total wins. Equal final results share a place.`;
  if (override) {
    if (
      !override.reason.trim() ||
      override.reason.length > 500 ||
      !override.winnerIds.length ||
      new Set(override.winnerIds).size !== override.winnerIds.length ||
      override.winnerIds.some((id) => !players.some((p) => p.id === id))
    )
      throw new Error("Choose valid winners and enter an override reason.");
    explanation = `Manual result override: ${override.reason.trim()}. Calculated placements are retained below.`;
  }
  return {
    rows,
    winnerIds: override?.winnerIds ?? winnerIds,
    explanation,
    overridden: !!override,
  };
}
function validate(value: number, field: Field, name: string) {
  if (
    !Number.isSafeInteger(value) ||
    value < field.min ||
    value > (field.max ?? 100000)
  )
    throw new Error(
      `${name}: ${field.label} must be a whole number from ${field.min} to ${field.max ?? 100000}.`,
    );
}

export function fieldsForPlayer(template: Template, player: Player) {
  return template.fields.filter(
    (f) =>
      !f.roleIds?.length ||
      (!!player.roleId && f.roleIds.includes(player.roleId)),
  );
}
export function validateTemplate(t: Template) {
  if (t.engineVersion !== 1 && t.engineVersion !== 2)
    throw new Error("Unsupported scoring engine version.");
  if (t.resultMode) {
    if (t.engineVersion !== 2)
      throw new Error("Outcome templates require scoring engine version 2.");
    const outcome = t.fields.find((f) => f.id === "outcome");
    const totals = t.fields.filter((f) => f.total);
    if (t.resultMode === "race") {
      if (totals.length !== 1 || totals[0].min < 1 || t.tieBreakers.length)
        throw new Error("Race templates require one finishing-position field.");
    } else if (
      !outcome ||
      outcome.min !== 0 ||
      outcome.max !== 1 ||
      outcome.roleIds?.length ||
      t.tieBreakers.length ||
      (t.resultMode === "cooperative" &&
        (totals.length !== 1 || totals[0].id !== "outcome"))
    )
      throw new Error("Outcome templates require a shared 0–1 outcome field.");
  }
  if (t.source && !/^https:\/\//.test(t.source))
    throw new Error("Use an HTTPS rules URL.");
  if (
    !t.title.trim() ||
    t.title.length > 80 ||
    t.edition.length > 200 ||
    t.endCondition.length > 1000 ||
    t.source.length > 500
  )
    throw new Error("Check template title and descriptions.");
  if (
    !Number.isInteger(t.minPlayers) ||
    !Number.isInteger(t.maxPlayers) ||
    t.minPlayers < 1 ||
    t.maxPlayers > 12 ||
    t.minPlayers > t.maxPlayers
  )
    throw new Error("Use 1�12 players.");
  if (
    !t.fields.length ||
    t.fields.length > 30 ||
    new Set(t.fields.map((f) => f.id)).size !== t.fields.length
  )
    throw new Error("Use 1�30 unique categories.");
  const roles = t.roles ?? [];
  if (
    roles.length > 12 ||
    new Set(roles.map((r) => r.id)).size !== roles.length ||
    roles.some(
      (r) =>
        !r.label.trim() ||
        r.label.length > 60 ||
        !/^[a-zA-Z0-9_-]{1,40}$/.test(r.id),
    )
  )
    throw new Error("Check role names.");
  for (const f of t.fields) {
    if (
      !/^[a-zA-Z0-9_-]{1,40}$/.test(f.id) ||
      !f.label.trim() ||
      f.label.length > 80 ||
      f.hint.length > 300 ||
      !Number.isSafeInteger(f.min) ||
      f.min < -100000 ||
      f.min > 100000 ||
      (f.max !== undefined &&
        (!Number.isSafeInteger(f.max) || f.max < f.min || f.max > 100000)) ||
      f.roleIds?.some((id) => !roles.some((r) => r.id === id))
    )
      throw new Error("Check scoring categories.");
  }
  for (const role of roles.length ? roles : [{ id: "" }])
    if (
      !t.fields.some(
        (f) => f.total && (!f.roleIds?.length || f.roleIds.includes(role.id)),
      )
    )
      throw new Error("Each role needs at least one scoring category.");
  if (
    new Set(t.tieBreakers).size !== t.tieBreakers.length ||
    t.tieBreakers.some(
      (id) =>
        !t.fields.some((f) => f.id === id && !f.total && !f.roleIds?.length),
    )
  )
    throw new Error("Tie-breakers must be shared categories, in order.");
}

/** Bind by verified provider ID or preserved starter identity, never by name. */
export function builtInTemplateForGame(
  game?: Pick<Game, "id" | "ludopediaId" | "templateId">,
): Template | undefined {
  if (!game) return undefined;
  if (
    game.id === "everdell" ||
    game.ludopediaId === 16788 ||
    game.id === "ludo-16788"
  )
    return templates["everdell-v1"];
  if (
    game.id === "dune" ||
    game.ludopediaId === 25941 ||
    game.id === "ludo-25941"
  )
    return templates["dune-v1"];
  const id = rankedTemplateId(
    game.ludopediaId ??
      (/^ludo-\d+$/.test(game.id) ? Number(game.id.slice(5)) : undefined),
  );
  return id ? templates[id] : undefined;
}
export function builtInTemplatesForGame(
  game?: Pick<Game, "id" | "ludopediaId" | "templateId">,
): Template[] {
  const dedicated = builtInTemplateForGame(game);
  return [
    templates["manual-v1"],
    templates["win-loss-v1"],
    templates["cooperative-win-loss-v1"],
    ...(dedicated ? [dedicated] : []),
    ...(dedicated?.id === "dune-v1"
      ? Object.values(duneExpansionTemplates)
      : []),
  ];
}

export function templateMatchesExpansions(
  template: Template,
  expansions: Game[],
): boolean {
  if (template.id === "dune-v1") return expansions.length === 0;
  return (
    !template.expansionIds ||
    (template.expansionIds.length === expansions.length &&
      template.expansionIds.every((id) =>
        expansions.some((game) => game.id === id),
      ))
  );
}

export function isGenericTemplate(template: Template): boolean {
  return ["manual-v1", "win-loss-v1", "cooperative-win-loss-v1"].includes(template.id);
}

/** Prefer compatible game sheets; generic scoring is a fallback. */
export function scoringChoices<T extends { data: Template; label: string }>(
  choices: T[],
  expansions: Game[] = [],
): T[] {
  const compatible = choices.filter(({ data }) => templateMatchesExpansions(data, expansions));
  const dedicated = compatible.filter(({ data }) => !isGenericTemplate(data));
  return dedicated.length ? dedicated : compatible;
}
