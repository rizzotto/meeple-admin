import type { Field, Template } from "./scoring";
import rankedGames from "./ranked-games.json";

/** Snapshot captured from both live ranking pages on 2026-11-09 (São Paulo). */
export const rankingSnapshot = {
  capturedOn: "2026-11-09",
  sources: [
    "https://ludopedia.com.br/ranking?pagina=1",
    "https://ludopedia.com.br/ranking?pagina=2",
  ],
  games: rankedGames,
};
export const scoringPtBR: Record<string, string> = {};
function bilingual(en: string, pt: string) {
  scoringPtBR[en] = pt;
  return en;
}
const pointsHint = bilingual(
  "Enter points already calculated for this category, not counts of pieces. Enter 0 when absent.",
  "Informe os pontos já calculados nesta categoria, não a quantidade de peças. Informe 0 quando não houver.",
);
const signedHint = bilingual(
  "Enter the signed point subtotal, including any negative points. Enter 0 when absent.",
  "Informe o subtotal de pontos com sinal, incluindo pontos negativos. Informe 0 quando não houver.",
);
function points(id: string, en: string, pt: string, signed = false): Field {
  return {
    id,
    label: bilingual(en, pt),
    hint: signed ? signedHint : pointsHint,
    total: true,
    min: signed ? -100000 : 0,
  };
}
function tie(
  id: string,
  en: string,
  pt: string,
  enHint: string,
  ptHint: string,
): Field {
  return {
    id,
    label: bilingual(en, pt),
    hint: bilingual(enHint, ptHint),
    total: false,
    min: 0,
  };
}
const outcome = (total = false): Field => ({
  id: "outcome",
  label: bilingual("Recorded outcome", "Resultado registrado"),
  hint: bilingual(
    "Enter 1 for a victory or 0 for a defeat, after resolving the rules. Shared winners each enter 1.",
    "Informe 1 para vitória ou 0 para derrota, após resolver as regras. Cada vencedor de uma vitória compartilhada informa 1.",
  ),
  total,
  min: 0,
  max: 1,
});
const manualEdition = bilingual(
  "Final totals · result confirmed at the table",
  "Totais finais · resultado confirmado na mesa",
);
const categoryEdition = bilingual(
  "Category subtotals · result confirmed at the table",
  "Subtotais por categoria · resultado confirmado na mesa",
);
const verifiedEdition = bilingual(
  "Base game · category points",
  "Jogo base · pontos por categoria",
);
const manualEnd = bilingual(
  "Finish all scoring and resolve the edition's victory conditions and tie-breakers at the table. Enter the final total and each player's actual outcome. This sheet does not automate game rules or expansion effects.",
  "Conclua a pontuação e resolva as condições de vitória e os desempates da edição na mesa. Informe o total final e o resultado real de cada jogador. Este modelo não automatiza as regras nem os efeitos de expansões.",
);
const cooperativeEnd = bilingual(
  "Resolve the scenario using its rules. Record the same team outcome for every player: 1 for victory, 0 for defeat. This sheet records the scenario result, not experience, campaign progress, or individual performance.",
  "Resolva o cenário conforme as regras. Registre o mesmo resultado da equipe para todos: 1 para vitória, 0 para derrota. Este modelo registra o resultado do cenário, não experiência, progresso de campanha nem desempenho individual.",
);
const declaredEnd = bilingual(
  "Resolve the scenario, objectives, instant victories, eliminations, and tie-breakers using the rules. Record each player's actual outcome. Multiple winners or no winners are allowed; points alone do not determine victory.",
  "Resolva o cenário, os objetivos, as vitórias imediatas, as eliminações e os desempates conforme as regras. Registre o resultado real de cada jogador. Pode haver vários vencedores ou nenhum; os pontos sozinhos não determinam a vitória.",
);
const cooperativeEdition = bilingual(
  "Cooperative scenario · shared outcome",
  "Cenário cooperativo · resultado compartilhado",
);
const declaredEdition = bilingual(
  "Scenario / objective result · manual confirmation",
  "Resultado de cenário / objetivo · confirmação manual",
);
const raceEdition = bilingual(
  "Single race · finishing positions",
  "Corrida única · posições de chegada",
);
bilingual(
  "Cooperative victory: all players win.",
  "Vitória cooperativa: todos os jogadores vencem.",
);
bilingual(
  "Cooperative defeat: no player wins.",
  "Derrota cooperativa: nenhum jogador vence.",
);
bilingual(
  "Result recorded from the table. Scores are kept for reference; resolve victory conditions and ties using the rules.",
  "Resultado registrado na mesa. Os pontos ficam como referência; resolva as condições de vitória e os desempates conforme as regras.",
);
bilingual(
  "Race result recorded by finishing position. An unlisted driver may win.",
  "Resultado da corrida registrado pela posição de chegada. Um piloto fora da lista pode vencer.",
);
bilingual(
  "Record an outcome for every player: 1 for victory, 0 for defeat.",
  "Registre o resultado de todos: 1 para vitória, 0 para derrota.",
);
bilingual(
  "All players must have the same cooperative outcome.",
  "Todos os jogadores devem ter o mesmo resultado cooperativo.",
);
bilingual(
  "Race finishing positions must be unique.",
  "As posições de chegada devem ser diferentes.",
);
bilingual(
  "Correct the recorded outcome or finishing position instead of overriding it.",
  "Corrija o resultado registrado ou a posição de chegada em vez de sobrescrevê-los.",
);
bilingual("Scoring reference", "Referência da pontuação");
bilingual("Solari", "Solari");
bilingual("No player won", "Nenhum jogador venceu");
bilingual("Victory", "Vitória");
bilingual("Defeat", "Derrota");
bilingual("Position", "Posição");

export const rankedTemplates: Record<string, Template> = {};
for (const game of rankedGames) {
  bilingual(game.en, game.ptBR);
  if (game.ludopediaId === 16788 || game.ludopediaId === 25941) continue;
  const id = `ranked-${game.ludopediaId}-v1`;
  const cooperative = game.mode === "cooperative";
  const race = game.mode === "race";
  const declared = game.mode === "declared";
  const hasScenarioScore = [
    37012, 17559, 14910, 8285, 15950, 503, 11178, 170, 39229, 39037,
  ].includes(game.ludopediaId);
  rankedTemplates[id] = {
    id,
    version: 1,
    engineVersion: 2,
    title: game.en,
    edition: cooperative
      ? cooperativeEdition
      : race
        ? raceEdition
        : declared
          ? declaredEdition
          : manualEdition,
    source: game.sourceUrl,
    minPlayers: [50577, 25979, 48].includes(game.ludopediaId)
      ? 3
      : cooperative && game.ludopediaId !== 51377
        ? 1
        : 2,
    maxPlayers: game.maxPlayers,
    fields: cooperative
      ? [outcome(true)]
      : race
        ? [
            {
              id: "position",
              label: bilingual("Finishing position", "Posição de chegada"),
              hint: bilingual(
                "Enter the official finishing position, after resolving the finish-line order. Include unlisted drivers when counting positions.",
                "Informe a posição oficial após resolver a ordem de chegada. Conte também os pilotos que não estão na lista.",
              ),
              total: true,
              min: 1,
              max: game.maxPlayers,
            },
          ]
        : declared && !hasScenarioScore
          ? [outcome(true)]
          : [
              points("score", "Final score", "Pontuação final", true),
              outcome(),
            ],
    resultMode: cooperative ? "cooperative" : race ? "race" : "declared",
    ...(race ? { lowestWins: true } : {}),
    tieBreakRules: [],
    endCondition: cooperative
      ? cooperativeEnd
      : declared
        ? declaredEnd
        : race
          ? bilingual(
              "Finish one race and resolve the official finishing order before recording positions. Championship points and expansion circuits are outside this sheet.",
              "Conclua uma corrida e resolva a ordem oficial de chegada antes de registrar as posições. Pontos de campeonato e circuitos de expansões não fazem parte deste modelo.",
            )
          : manualEnd,
  };
}
function configure(
  ludopediaId: number,
  fields: Field[],
  source: string,
  endEn: string,
  endPt: string,
  automatic = false,
  tieBreakers: string[] = [],
) {
  const template = rankedTemplates[`ranked-${ludopediaId}-v1`];
  template.fields = automatic ? fields : [...fields, outcome()];
  template.source = source;
  template.edition = automatic ? verifiedEdition : categoryEdition;
  if (automatic) delete template.resultMode;
  template.tieBreakRules = tieBreakers.map((fieldId) => ({ fieldId, direction: "higher" }));
  template.endCondition = bilingual(endEn, endPt);
}
configure(
  64469,
  [
    points(
      "track",
      "Points before final scoring",
      "Pontos antes da pontuação final",
    ),
    points("cards", "Endgame card points", "Pontos finais das cartas"),
    points("gold", "Gold scoring tiles", "Peças de pontuação douradas"),
    points(
      "aliens",
      "Alien endgame adjustments",
      "Ajustes finais dos alienígenas",
      true,
    ),
  ],
  "https://czechgames.com/files/rules/seti-rules-en.pdf",
  "After round five, score cards, gold tiles, and species effects. Enter each source once. If a species modifies the final total, enter that change as a signed adjustment after calculating it. Equal totals share victory.",
  "Após a quinta rodada, pontue cartas, peças douradas e efeitos das espécies. Registre cada fonte uma vez. Se uma espécie modificar o total final, calcule e registre a diferença com sinal. Totais iguais compartilham a vitória.",
  true,
);
configure(
  13749,
  [
    points(
      "track",
      "Points before final scoring",
      "Pontos antes da pontuação final",
    ),
    points("objectives", "Final scoring tiles", "Peças de pontuação final"),
    points("research", "Research points", "Pontos de pesquisa"),
    points(
      "resources",
      "Resource conversion points",
      "Pontos da conversão de recursos",
    ),
  ],
  "https://www.feuerland-spiele.de/fileadmin/game/Gaia_Project/GAIA_PROJECT_EN_rules_Web.pdf",
  "After round six, calculate final tile rankings (including neutral satellites where applicable), research, and resource conversion. Enter points, not resource counts. Equal final totals share victory. Multiplayer only.",
  "Após a sexta rodada, calcule as classificações finais (incluindo satélites neutros quando aplicável), a pesquisa e a conversão de recursos. Informe pontos, não quantidades de recursos. Totais finais iguais compartilham a vitória. Apenas multijogador.",
  true,
);
configure(
  8858,
  [
    points("tr", "Terraform rating", "Índice de terraformação"),
    points("awards", "Award points", "Pontos dos prêmios"),
    points("milestones", "Milestone points", "Pontos dos marcos"),
    points("greenery", "Greenery points", "Pontos das vegetações"),
    points("cities", "City points", "Pontos das cidades"),
    points("cards", "Card points", "Pontos das cartas", true),
    tie(
      "money",
      "Remaining M€",
      "M€ restantes",
      "Remaining money, used only to break a tie.",
      "Dinheiro restante, usado apenas para desempatar.",
    ),
  ],
  "https://fryxgames.se/wp-content/uploads/2023/04/TMRULESFINAL.pdf",
  "Complete the generation in which all global parameters are met, then final greenery placement and all scoring. Do not add the final track total again: start with TR before scoring awards, milestones, tiles, and cards. Ties compare remaining M€. Base game multiplayer only.",
  "Conclua a geração em que os parâmetros globais são atingidos, depois a colocação final de vegetações e a pontuação. Não some novamente o total final da trilha: comece pelo índice antes de pontuar prêmios, marcos, peças e cartas. Empates comparam M€ restantes. Apenas jogo base multijogador.",
  true,
  ["money"],
);
configure(
  63306,
  [
    points("landscapes", "Landscape points", "Pontos das paisagens"),
    points("animals", "Animal card points", "Pontos das cartas de animais"),
    tie(
      "cubes",
      "Animal cubes placed",
      "Cubos de animais colocados",
      "Count placed animal cubes; used only to break a tie.",
      "Conte os cubos de animais colocados; usado apenas para desempatar.",
    ),
  ],
  "https://cdn.svc.asmodee.net/production-libellud/uploads/2024/12/HARMONIES_Rules_EN.pdf",
  "Complete the final round so everyone has equal turns, then score landscapes and animal cards. Ties compare animal cubes placed, then share victory. Standard multiplayer game; nature spirits are not included.",
  "Conclua a rodada final para que todos tenham o mesmo número de turnos e pontue paisagens e cartas de animais. Empates comparam cubos de animais colocados e, se persistirem, compartilham a vitória. Multijogador padrão; espíritos da natureza não incluídos.",
  true,
  ["cubes"],
);
configure(
  25895,
  [
    points(
      "research",
      "Research token points",
      "Pontos dos marcadores de pesquisa",
    ),
    points("temple", "Temple tile points", "Pontos das peças de templo"),
    points(
      "idols",
      "Idols and empty idol slots",
      "Ídolos e espaços de ídolos vazios",
    ),
    points("guardians", "Guardian points", "Pontos dos guardiões"),
    points(
      "cards",
      "Item and artifact card points",
      "Pontos das cartas de itens e artefatos",
    ),
    points("fear", "Fear penalties", "Penalidades de medo", true),
  ],
  "https://filemanager.czechgames.com/storage/files/lost-ruins-of-arnak/rules/lost-ruins-of-arnak-rules-en.pdf",
  "After round five, enter all scoring categories, including negative fear points. Resolve ties by earliest arrival at the Lost Temple; if nobody arrived, compare research points. Record the resulting winner(s) manually. Multiplayer base game only.",
  "Após a quinta rodada, informe todas as categorias, incluindo os pontos negativos de medo. Desempate pela primeira chegada ao Templo Perdido; se ninguém chegou, compare os pontos de pesquisa. Registre manualmente o(s) vencedor(es). Apenas jogo base multijogador.",
);
configure(
  1860,
  [
    points("animals", "Animal points", "Pontos dos animais"),
    points(
      "missing",
      "Missing animal penalties",
      "Penalidades por animais ausentes",
      true,
    ),
    points("grain", "Grain points", "Pontos dos cereais"),
    points("vegetables", "Vegetable points", "Pontos dos vegetais"),
    points("rubies", "Ruby points", "Pontos dos rubis"),
    points("dwarfs", "Dwarf points", "Pontos dos anões"),
    points(
      "spaces",
      "Unused space penalties",
      "Penalidades por espaços não utilizados",
      true,
    ),
    points(
      "tiles",
      "Furnishings, pastures and mines",
      "Mobílias, pastos e minas",
    ),
    points("gold", "Gold points", "Pontos do ouro"),
    points("bonuses", "Furnishing bonus points", "Pontos extras das mobílias"),
    points("begging", "Begging penalties", "Penalidades de mendicância", true),
  ],
  "https://www.lookout-spiele.de/upload/en_caverna.html_Rules_Caverna_EN.pdf",
  "Complete the last harvest and use the scoring pad. Enter grain points after rounding, not grain counts. Keep printed tile points separate from furnishing bonuses. Enter penalties as negative points. Equal totals share victory. Multiplayer only.",
  "Conclua a última colheita e use o bloco de pontuação. Informe os pontos dos cereais após arredondar, não a quantidade de cereais. Separe os pontos impressos das peças dos bônus das mobílias. Informe penalidades como pontos negativos. Totais iguais compartilham a vitória. Apenas multijogador.",
  true,
);
configure(
  8627,
  [
    points(
      "culture",
      "Culture before final scoring",
      "Cultura antes da pontuação final",
      true,
    ),
    points(
      "events",
      "Final Age III event points",
      "Pontos finais dos eventos da Era III",
      true,
    ),
    points(
      "bonuses",
      "Other endgame culture bonuses",
      "Outros bônus finais de cultura",
      true,
    ),
  ],
  "https://czechgames.com/files/rules/through-the-ages-new-story-rules-en.pdf",
  "Full game only. Finish the final round, resolve all Age III events in both event decks and all endgame card bonuses. Enter changes separately from the culture already earned. Equal totals share victory. Introductory-game scoring is different.",
  "Apenas jogo completo. Conclua a rodada final, resolva todos os eventos da Era III nos dois baralhos e os bônus finais das cartas. Separe esses ajustes da cultura já obtida. Totais iguais compartilham a vitória. A pontuação da partida introdutória é diferente.",
  true,
);
configure(
  25894,
  [
    points(
      "wildlife",
      "Wildlife scoring cards",
      "Cartas de pontuação da fauna",
    ),
    points(
      "habitats",
      "Habitat corridors and majority bonuses",
      "Corredores de habitats e bônus de maioria",
    ),
    points(
      "nature",
      "Unused nature token points",
      "Pontos das fichas de natureza não utilizadas",
    ),
  ],
  "https://www.alderac.com/cascadia/",
  "Use the base-game scoresheet and selected wildlife cards. Enter habitat points including majority bonuses and nature points separately. Resolve the final tie-breaker at the table and record the outcome. Multiplayer only; Landmarks and solo scenarios use different rules.",
  "Use o bloco do jogo base e as cartas de fauna selecionadas. Informe os pontos dos habitats com os bônus de maioria e, separadamente, os pontos de natureza. Resolva o desempate final na mesa e registre o resultado. Apenas multijogador; Landmarks e cenários solo usam regras diferentes.",
);

configure(
  20418,
  [
    points("birds", "Bird card points", "Pontos das cartas de aves"),
    points("bonus", "Bonus card points", "Pontos das cartas de bônus"),
    points(
      "rounds",
      "End-of-round goal points",
      "Pontos dos objetivos de fim de rodada",
    ),
    points("eggs", "Egg points", "Pontos dos ovos"),
    points("cached", "Cached food points", "Pontos dos alimentos armazenados"),
    points("tucked", "Tucked card points", "Pontos das cartas sobrepostas"),
    tie(
      "food",
      "Unused food tokens",
      "Fichas de alimento não utilizadas",
      "Count unused food in your supply, not food cached on birds. Tie-breaker only.",
      "Conte os alimentos não utilizados na reserva, não os armazenados nas aves. Apenas para desempatar.",
    ),
  ],
  "https://cs.uwaterloo.ca/~dtompkin/archive/dtlib/base/Wingspan.pdf",
  "After round four, score the six categories once each. Compare unused food only if totals tie, then share victory. Base game multiplayer only; Asia duet, nectar, and expansion powers are outside this sheet.",
  "Após a quarta rodada, pontue as seis categorias uma única vez. Compare alimentos não utilizados apenas em caso de empate e, se persistir, compartilhe a vitória. Apenas jogo base multijogador; dueto da Ásia, néctar e poderes de expansões não fazem parte deste modelo.",
  true,
  ["food"],
);
configure(
  61700,
  [
    points("guild", "Dragon Guild points", "Pontos da Guilda dos Dragões"),
    points("dragons", "Printed dragon points", "Pontos impressos dos dragões"),
    points(
      "endgame",
      "Dragon endgame ability points",
      "Pontos das habilidades finais dos dragões",
    ),
    points("eggs", "Egg points", "Pontos dos ovos"),
    points(
      "cached",
      "Cached resource points",
      "Pontos dos recursos armazenados",
    ),
    points("tucked", "Tucked dragon points", "Pontos dos dragões sobrepostos"),
    points(
      "objectives",
      "Public objective points",
      "Pontos dos objetivos públicos",
    ),
    points(
      "excess",
      "Excess item and coin points",
      "Pontos dos itens excedentes e moedas",
    ),
    tie(
      "visible",
      "Visible dragons",
      "Dragões visíveis",
      "Count visible dragons on your mat, not tucked cards. Tie-breaker only.",
      "Conte os dragões visíveis no tabuleiro, não as cartas sobrepostas. Apenas para desempatar.",
    ),
  ],
  "https://desktopgames.com.ua/games/8254/Wyr_Rulebook_eng_compressed.pdf",
  "Finish round four and resolve endgame abilities before counting all categories. Convert excess items and coins using the rulebook before entering points. Ties compare visible dragons, then share victory. Base game multiplayer only.",
  "Conclua a quarta rodada e resolva as habilidades finais antes de contar as categorias. Converta os itens excedentes e as moedas conforme as regras antes de informar os pontos. Empates comparam dragões visíveis e, se persistirem, compartilham a vitória. Apenas jogo base multijogador.",
  true,
  ["visible"],
);
configure(
  25979,
  [
    points("wonder", "Wonder stage points", "Pontos das etapas da maravilha"),
    points("treasury", "Treasury points", "Pontos do tesouro"),
    points(
      "military",
      "Military conflict points",
      "Pontos dos conflitos militares",
      true,
    ),
    points("blue", "Civilian building points", "Pontos das construções civis"),
    points(
      "yellow",
      "Commercial building points",
      "Pontos das construções comerciais",
    ),
    points("green", "Science points", "Pontos de ciência"),
    points("purple", "Guild points", "Pontos das guildas"),
    tie(
      "coins",
      "Remaining coins",
      "Moedas restantes",
      "Total coins in your treasury, not their converted points. Tie-breaker only.",
      "Total de moedas no tesouro, não os pontos convertidos. Apenas para desempatar.",
    ),
  ],
  "https://cdn.svc.asmodee.net/production-rprod/storage/downloads/games/7wonders/en/sev-en02-rules-1716388903zBEZx.pdf",
  "After Age III military conflicts, total the seven scoring categories. Convert coins and science symbols to points before entry. Ties compare treasury coins, then share victory. Second edition base game, 3–7 players only.",
  "Após os conflitos militares da Era III, some as sete categorias. Converta moedas e símbolos de ciência em pontos antes de informar os valores. Empates comparam moedas do tesouro e, se persistirem, compartilham a vitória. Apenas jogo base da segunda edição, com 3–7 jogadores.",
  true,
  ["coins"],
);
configure(
  187,
  [
    points(
      "track",
      "Points before final scoring",
      "Pontos antes da pontuação final",
    ),
    points(
      "goods",
      "Unsold goods points",
      "Pontos das mercadorias não vendidas",
    ),
    points("silver", "Silverling points", "Pontos dos silverlings"),
    points(
      "workers",
      "Remaining worker points",
      "Pontos dos trabalhadores restantes",
    ),
    points(
      "knowledge",
      "Knowledge tile endgame points",
      "Pontos finais das peças de conhecimento",
    ),
  ],
  "https://cdn.1j1ju.com/medias/04/f5/f9-the-castles-of-burgundy-rulebook.pdf",
  "After phase five, add leftover goods, Silverlings, converted workers, and scoring knowledge tiles to points already earned. Resolve ties by fewest empty estate spaces, then later turn order, and record the outcome. Original base game only.",
  "Após a quinta fase, some mercadorias restantes, silverlings, trabalhadores convertidos e peças de conhecimento aos pontos já obtidos. Desempate pelo menor número de espaços vazios na propriedade e depois pela posição mais tardia na ordem do turno. Registre o resultado. Apenas jogo base original.",
);
const europeFields = () => [
  points("routes", "Route points", "Pontos das rotas"),
  points(
    "tickets",
    "Destination ticket points",
    "Pontos dos bilhetes de destino",
    true,
  ),
  points(
    "stations",
    "Unused station points",
    "Pontos das estações não utilizadas",
  ),
  points("express", "European Express bonus", "Bônus Expresso Europeu"),
];
configure(
  29022,
  [
    ...europeFields(),
    tie(
      "completed",
      "Completed destination tickets",
      "Bilhetes de destino concluídos",
      "Number of completed tickets. First tie-breaker.",
      "Quantidade de bilhetes concluídos. Primeiro desempate.",
    ),
    tie(
      "unused",
      "Unused stations",
      "Estações não utilizadas",
      "Number of stations not built. Second tie-breaker.",
      "Quantidade de estações não construídas. Segundo desempate.",
    ),
    tie(
      "expressholder",
      "European Express holder",
      "Portador do Expresso Europeu",
      "Enter 1 if you received the European Express bonus, otherwise 0. Final tie-breaker.",
      "Informe 1 se recebeu o bônus Expresso Europeu, caso contrário 0. Último desempate.",
    ),
  ],
  "https://cdn.1j1ju.com/medias/c0/4f/7d-ticket-to-ride-europe-15th-anniversary-rulebook.pdf",
  "Finish every player's last turn. Count route points, signed ticket points, unused stations converted to points, and the Express bonus once. Ties compare completed tickets, unused stations, then the Express holder. Anniversary edition, standard Europe setup only.",
  "Conclua o último turno de todos. Conte uma única vez os pontos das rotas, bilhetes com sinal, estações não utilizadas convertidas em pontos e bônus Expresso. Empates comparam bilhetes concluídos, estações não utilizadas e o portador do Expresso. Edição de aniversário, apenas configuração Europa padrão.",
  true,
  ["completed", "unused", "expressholder"],
);

export function rankedTemplateId(ludopediaId?: number): string | undefined {
  if (ludopediaId === 16788) return "everdell-v1";
  if (ludopediaId === 25941) return "dune-v1";
  const id = `ranked-${ludopediaId}-v1`;
  return rankedTemplates[id] ? id : undefined;
}
