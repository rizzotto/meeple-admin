import type { Game } from "./model";
export const duneExpansions: Game[] = [
  {
    id: "dune-ix",
    image:
      "https://shop.direwolfdigital.com/cdn/shop/files/di_riseofix_store_1000x1000.png?v=1695680892",
    bggId: 342031,
    ludopediaId: 32273,
    title: "Dune: Imperium – Rise of Ix",
    description:
      "Adds technology, shipping, dreadnoughts and new leaders. Requires Dune: Imperium.",
    minPlayers: 3,
    maxPlayers: 4,
    minutes: 120,
    templateId: "manual-v1",
    kind: "expansion",
    baseGameId: "dune",
    year: 2022,
    sourceUrl:
      "https://shop.direwolfdigital.com/products/dune-imperium-rise-of-ix",
  },
  {
    id: "dune-immortality",
    image:
      "https://shop.direwolfdigital.com/cdn/shop/files/di_immortality_store_1000x1000.png?v=1695681111",
    bggId: 367466,
    ludopediaId: 40510,
    title: "Dune: Imperium – Immortality",
    description:
      "Adds research, Tleilaxu cards and grafting. Requires Dune: Imperium; can also be combined with Rise of Ix.",
    minPlayers: 3,
    maxPlayers: 4,
    minutes: 120,
    templateId: "manual-v1",
    kind: "expansion",
    baseGameId: "dune",
    year: 2022,
    sourceUrl:
      "https://shop.direwolfdigital.com/products/dune-imperium-immortality",
  },
];
export function sameGame(a: Game, b: Game): boolean {
  return (
    a.id === b.id ||
    !!(a.ludopediaId && a.ludopediaId === b.ludopediaId) ||
    !!(a.bggId && a.bggId === b.bggId)
  );
}
export function expansionsForGame(game: Game, games: Game[]): Game[] {
  return [
    ...new Map(
      games
        .filter(
          (g) =>
            g.kind === "expansion" &&
            ([g.baseGameId, ...(g.baseGameIds ?? [])].includes(game.id) ||
              g.baseGameId === `ludo-${game.ludopediaId}` ||
              g.baseGameId === `bgg-${game.bggId}`),
        )
        .map((g) => [g.id, g]),
    ).values(),
  ];
}
export function validateExpansions(game: Game, expansions: Game[]): void {
  if (expansions.length > 20) throw new Error("Choose at most 20 expansions.");
  if (game.kind === "expansion" && !game.standalone)
    throw new Error("Start this expansion from its base game.");
  if (
    expansions.some((g, i) =>
      expansions.slice(0, i).some((other) => sameGame(g, other)),
    )
  )
    throw new Error("Duplicate expansion.");
  if (expansionsForGame(game, expansions).length !== expansions.length)
    throw new Error("Choose expansions for this base game.");
}
