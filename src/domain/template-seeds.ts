import { initialGames, type Game } from "./model";
import { rankingSnapshot, rankedTemplateId } from "./ranked-templates";
import { templates, type Template } from "./scoring";

/** Import source only. Runtime official templates are read from Convex. */
export const officialTemplateSeeds: { game: Game; data: Template }[] = [
  ...initialGames
    .filter((game) => game.id === "everdell" || game.id === "dune")
    .map((game) => ({
      game,
      data: { ...templates[game.templateId], expansionIds: undefined },
    })),
  ...rankingSnapshot.games
    .filter((game) => ![16788, 25941].includes(game.ludopediaId))
    .map((game) => ({
      game: {
        id: `ludo-${game.ludopediaId}`,
        ludopediaId: game.ludopediaId,
        title: game.en,
        description: "",
        minPlayers: 1,
        maxPlayers: Math.min(game.maxPlayers, 12),
        minutes: null,
        templateId: "manual-v1",
        year: game.year,
        sourceUrl: game.sourceUrl,
      } satisfies Game,
      data: templates[rankedTemplateId(game.ludopediaId)!],
    })),
];
