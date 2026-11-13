export type ExpansionCategory = "expansions" | "promos" | "accessories";

/** Presentation grouping only; it does not establish game identity or compatibility. */
export function expansionCategory(game: { title: string }): ExpansionCategory {
  const title = game.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/\b(promos?|promotional|promocional|promocionais|promo cards?|promo packs?|packs? promocionais?|fan[- ]designed (?:bird )?promo packs?|fan art packs?|fan[- ]designed card packs?|bird promo packs?|swift[- ]start promo packs?|kickstarter promo packs?|seasonal promo packs?)\b/.test(title)) {
    return "promos";
  }

  if (/\b(sleeves?|card protectors?|protetor(?:es)?|moedas?|coins?|coin kits?|kit(?:s)? de moedas?|metallic cubes?|plastic player cubes?|organizers?|organisers?|organizador(?:es)?|inserts?|insertos?|nesting boxes?|storage boxes?|playmats?|play mats?|natural rubber mats?|tapetes?|deluxe upgrades?|upgrade packs?|upgrade kits?|kit de upgrade|component upgrades?|upgraded components?|deluxe components?|extra cards?|additional cards?|cartas? extras?|baralhos? extras?|miniature packs?|3d(?:[- ]printed| print(?:ed)?)?|3d tokens?|3d eggs?|3d food|3d upgrades?|printed tokens?|plastic tokens?|first[- ]player markers?|marcadores? de primeiro jogador|bit sets?|golden eggs?|speckled eggs?|ovos? (?:dourados|salpicados)|egg packs?|food tokens?|action markers?|marcadores? de acao|card holders?|card trays?|dice towers?|acrylic overlays?|overlays?)\b/.test(title)) {
    return "accessories";
  }

  return "expansions";
}
