import type { Player, Template, Result, Override } from "./scoring";
export type Game = {
  id: string;
  title: string;
  description: string;
  descriptionSource?: "ludopedia" | "bgg";
  minPlayers: number | null;
  maxPlayers: number | null;
  minutes: number | null;
  templateId: string;
  categories?: string[];
  mechanics?: string[];
  minAge?: number;
  complexity?: number;
  complexitySource?: "ludopedia" | "bgg";
  rating?: number;
  ratingSource?: "ludopedia" | "bgg";
  minMinutes?: number;
  maxMinutes?: number;
  image?: string;
  ludopediaId?: number;
  bggId?: number;
  kind?: "base" | "expansion" | "edition";
  baseGameId?: string;
  baseGameIds?: string[];
  standalone?: boolean;
  alternateTitles?: string[];
  designers?: string[];
  localizedTitles?: { en?: string; ptBR?: string };
  sourceUrl?: string;
  year?: number;
};
export type Match = {
  id: string;
  creatorId?: string;
  game: Game;
  expansions?: Game[];
  template: Template;
  players: Player[];
  status: "draft" | "in_progress" | "completed" | "cancelled";
  startedAt: number;
  durationMinutes: number | null;
  location: string;
  venueHostId?: string;
  notes: string;
  confirmed: boolean;
  revision: number;
  result?: Result;
  override?: Override;
  updatedAt: number;
};
import { duneExpansions } from "./expansions";
export const initialGames: Game[] = [
  {
    id: "everdell",
    ludopediaId: 16788,
    image:
      "https://tycoongames.com/cdn/shop/files/Everdell-Standard-Edition-FlatCover-_01.webp?v=1772549363",
    title: "Everdell",
    description:
      "Build a woodland city of critters and constructions through four seasons. Count printed card points, tokens, Events, Journeys and Prosperity bonuses separately.",
    minPlayers: 2,
    maxPlayers: 4,
    minutes: 80,
    templateId: "everdell-v1",
    year: 2018,
  },
  {
    id: "dune",
    ludopediaId: 25941,
    image:
      "https://d19y2ttatozxjp.cloudfront.net/assets/dune/DuneImperium_BoxArtKey.png",
    title: "Dune: Imperium",
    description:
      "Compete for influence on Arrakis through deck building and worker placement. Finish the round and resolve endgame effects before determining the winner.",
    minPlayers: 1,
    maxPlayers: 4,
    minutes: 120,
    templateId: "dune-v1",
    year: 2020,
  },
  {
    id: "manual",
    title: "Any other game",
    description:
      "Record a game with manual totals. Highest score wins, with shared victories for equal scores.",
    minPlayers: 2,
    maxPlayers: 12,
    minutes: 60,
    templateId: "manual-v1",
  },
  ...duneExpansions,
];
