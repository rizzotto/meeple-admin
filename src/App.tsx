import {
  Component,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  useAction,
  useConvexAuth,
  useConvex,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { makeFunctionReference } from "convex/server";
import type { GenericId } from "convex/values";
import {
  BookOpen,
  ArrowLeft,
  ChevronRight,
  Dices,
  ExternalLink,
  FilePlus2,
  Layers3,
  Languages,
  LogOut,
  PanelLeftOpen,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field as UIField,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  templateTieBreakRules,
  validateTemplate,
  type Template,
  type TemplateTranslation,
  type TemplateTranslationContent,
} from "@/domain/scoring";
import type { Game } from "@/domain/model";
import { officialTemplateSeeds } from "@/domain/template-seeds";

type Row = {
  key: string;
  gameKey: string;
  gameTitle: string;
  image?: string;
  ludopediaId?: number;
  bggId?: number;
  builtIn: boolean;
  data: Template;
};
type GameOption = {
  id: string;
  title: string;
  image?: string;
  ludopediaId?: number;
  bggId?: number;
  data: Template | null;
};
type SourceProvider = "ludopedia" | "bgg";
type ProviderLink = { id: number; title: string; url?: string };
type SourceLinks = {
  gameKey: string;
  title: string;
  image?: string;
  ludopedia: ProviderLink | null;
  bgg: ProviderLink | null;
};
type SourceSearchResult = {
  proposalId: GenericId<"gameMatchProposals"> | null;
  candidates: Game[];
};
const gameSearch = makeFunctionReference<
  "query",
  { search: string },
  GameOption[]
>("template_admin:games");
const gamePages = makeFunctionReference<
  "query",
  {
    paginationOpts: { numItems: number; cursor: string | null };
    missingTemplateOnly: boolean;
    search: string;
  },
  {
    page: { game: Game; hasOfficialTemplate: boolean }[];
    isDone: boolean;
    continueCursor: string;
  }
>("template_admin:gamesPage");
const saveGame = makeFunctionReference<
  "mutation",
  { gameKey: string; data: Game },
  Game
>("template_admin:saveGame");
const library = makeFunctionReference<"query", { gameKey: string }, Row[]>(
  "template_admin:library",
);
const sourceLinksQuery = makeFunctionReference<
  "query",
  { gameKey: string },
  SourceLinks | null
>("template_admin:sourceLinks");
const sourceSearch = makeFunctionReference<
  "action",
  { gameKey: string; provider: SourceProvider; search: string },
  SourceSearchResult
>("template_admin:searchSourceLinks");
const confirmSourceLink = makeFunctionReference<
  "mutation",
  {
    proposalId: GenericId<"gameMatchProposals">;
    candidateId: string;
    replace?: boolean;
  },
  Game
>("catalog:confirmMatch");
const saveTemplate = makeFunctionReference<
  "mutation",
  {
    gameKey: string;
    data: Template;
  },
  GenericId<"officialTemplates">
>("template_admin:save");
const generateTemplateTranslation = makeFunctionReference<
  "action",
  { gameKey: string; locale: "pt-BR" },
  { sourceVersion: number; translation: TemplateTranslationContent }
>("template_admin:generateTranslation");
const saveTemplateTranslation = makeFunctionReference<
  "mutation",
  { gameKey: string; sourceVersion: number; translation: TemplateTranslationContent },
  TemplateTranslation
>("template_admin:saveTranslation");
const permission = makeFunctionReference<
  "query",
  Record<string, never>,
  boolean
>("scoring_templates:canPublishOfficial");
const tieBreakDirectionItems = [
  { value: "higher", label: "Higher value wins" },
  { value: "lower", label: "Lower value wins" },
] as const;
const fresh = (): Template => ({
  id: "new",
  version: 1,
  engineVersion: 1,
  title: "Untitled template",
  edition: "Base game",
  source: "",
  minPlayers: 2,
  maxPlayers: 4,
  fields: [
    { id: "score", label: "Victory points", hint: "", min: 0, total: true },
  ],
  tieBreakers: [],
  endCondition: "All players have completed final scoring.",
});
const emptyTranslation = (template: Template): TemplateTranslationContent => ({
  title: "",
  edition: "",
  endCondition: "",
  fields: Object.fromEntries(template.fields.map((field) => [field.id, { label: "", hint: "" }])),
  tieBreakers: Object.fromEntries(templateTieBreakRules(template).map((field) => [field.id, { label: "", hint: "" }])),
  roles: Object.fromEntries((template.roles ?? []).map((role) => [role.id, ""])),
});
const demo: Row[] = officialTemplateSeeds.map(({ game, data }) => ({
  key: data.id,
  gameKey: game.id,
  gameTitle: game.title,
  ...(game.image ? { image: game.image } : {}),
  ...(game.ludopediaId ? { ludopediaId: game.ludopediaId } : {}),
  ...(game.bggId ? { bggId: game.bggId } : {}),
  builtIn: false,
  data,
}));

export default function App({ connected }: { connected: boolean }) {
  return (
    <ErrorBoundary>
      {connected ? <Connected /> : <Workspace rows={demo} />}
    </ErrorBoundary>
  );
}
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    return this.state.error ? (
      <div className="gate">
        <Dices size={36} />
        <h1>Connection needs attention</h1>
        <p>{this.state.error}</p>
        <p>Ensure the Meeple backend has template_admin deployed.</p>
        <Button onClick={() => location.reload()}>Try again</Button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function Connected() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState("");
  if (isLoading)
    return (
      <div className="gate" role="status">
        Connecting to Meeple…
      </div>
    );
  if (!isAuthenticated)
    return (
      <div className="gate">
        <div className="brand-icon">
          <Dices />
        </div>
        <Badge variant="secondary">Meeple studio</Badge>
        <h1>
          A little order.
          <br />A better game night.
        </h1>
        <p>Sign in with your Meeple administrator account.</p>
        <div className="login">
          <Button
            type="button"
            variant="outline"
            disabled={busy || googleBusy}
            onClick={async () => {
              setGoogleBusy(true);
              setError("");
              try {
                await signIn("google", { redirectTo: `${location.origin}/` });
              } catch {
                setError("Google sign-in could not start. Please try again.");
              } finally {
                setGoogleBusy(false);
              }
            }}
          >
            {googleBusy ? "Opening Google…" : "Continue with Google"}
          </Button>
          <p>Use Google if you used it to create your Meeple account.</p>
        </div>
        {error && <p role="alert">{error}</p>}
        <form
          className="login"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await signIn("password", new FormData(e.currentTarget));
            } catch {
              setError("Unable to sign in. Check your email and password.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <input type="hidden" name="flow" value="signIn" />
          <FieldGroup>
            <UIField className="field">
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </UIField>
            <UIField className="field">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </UIField>
          </FieldGroup>
          <Button type="submit" disabled={busy || googleBusy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    );
  return <Authorized onSignOut={() => void signOut()} />;
}
function Authorized({ onSignOut }: { onSignOut: () => void }) {
  const allowed = useQuery(permission, {});
  if (allowed === undefined)
    return (
      <div className="gate" role="status">
        Checking administrator access…
      </div>
    );
  if (!allowed)
    return (
      <div className="gate">
        <ShieldCheck size={36} />
        <h1>Administrator access required</h1>
        <p>
          Your Meeple user ID must be included in MEEPLE_ADMIN_USER_IDS on the
          Convex deployment.
        </p>
        <Button onClick={onSignOut}>Sign out</Button>
      </div>
    );
  return <LiveWorkspace onSignOut={onSignOut} />;
}
function LiveWorkspace({ onSignOut }: { onSignOut: () => void }) {
  return <GameCatalog onSignOut={onSignOut} />;
}
function Workspace({
  rows,
  onSave,
  onGameKey,
  onSignOut,
  fixedGame,
}: {
  rows: Row[] | undefined;
  onSave?: (key: string, data: Template) => Promise<{ id: string; version: number }>;
  onGameKey?: (key: string) => void;
  onSignOut?: () => void;
  fixedGame?: GameOption;
}) {
  const [selected, setSelected] = useState<Row | null>(rows?.[0] ?? null);
  const [draft, setDraft] = useState<Template>(() =>
    selected ? structuredClone(selected.data) : fresh(),
  );
  const [gameKey, setGameKey] = useState(selected?.gameKey ?? "");
  const [gameTitle, setGameTitle] = useState(selected?.gameTitle ?? "");
  const [gameImage, setGameImage] = useState(selected?.image);
  const [providerIds, setProviderIds] = useState({
    ludopediaId: selected?.ludopediaId,
    bggId: selected?.bggId,
  });
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [saving, setSaving] = useState(false);
  const [translationBusy, setTranslationBusy] = useState(false);
  const [translationDirty, setTranslationDirty] = useState(false);
  const [translationError, setTranslationError] = useState("");
  const generateTranslation = useAction(generateTemplateTranslation);
  const saveTranslationMutation = useMutation(saveTemplateTranslation);
  const [json, setJson] = useState("");
  const [error, setError] = useState("");
  const [jsonDirty, setJsonDirty] = useState(false);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  const change = (patch: Partial<Template>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
    setError("");
  };
  const navigate = (fn: () => void) => {
    if (dirty) setPending(() => fn);
    else fn();
  };
  const choose = (row: Row) =>
    navigate(() => {
      setSelected(row);
      setDraft(structuredClone(row.data));
      setGameKey(row.gameKey);
      setGameTitle(row.gameTitle);
      setGameImage(row.image);
      setProviderIds({ ludopediaId: row.ludopediaId, bggId: row.bggId });
      setDirty(false);
      setTranslationDirty(false);
      setJsonDirty(false);
      setError("");
    });
  const create = () =>
    navigate(() => {
      if (fixedGame) selectGame(fixedGame);
      else setPickerOpen(true);
    });
  const selectGame = (game: GameOption) => {
    const data = game.data ?? { ...fresh(), title: game.title };
    setSelected(
      game.data
        ? {
            key: data.id,
            gameKey: game.id,
            gameTitle: game.title,
            ...(game.image ? { image: game.image } : {}),
            ...(game.ludopediaId ? { ludopediaId: game.ludopediaId } : {}),
            ...(game.bggId ? { bggId: game.bggId } : {}),
            builtIn: false,
            data,
          }
        : null,
    );
    setDraft(structuredClone(data));
    setGameKey(game.id);
    setGameTitle(game.title);
    setGameImage(game.image);
    setProviderIds({ ludopediaId: game.ludopediaId, bggId: game.bggId });
    setDirty(!game.data);
    setTranslationDirty(false);
    setJsonDirty(false);
    setError("");
    setPickerOpen(false);
  };
  const items = (rows ?? []).filter((r) =>
    `${r.gameTitle} ${r.data.title} ${r.data.edition}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const translation = draft.translations?.ptBR ?? {
    ...emptyTranslation(draft),
    status: "draft" as const,
    sourceVersion: draft.version,
  };
  const translationStale = translation.sourceVersion !== draft.version;
  const translationStatus = !draft.translations?.ptBR
    ? "Not translated"
    : translationStale
      ? "Source changed"
      : translation.status === "reviewed"
        ? "Reviewed"
        : "Draft";
  async function save() {
    setError("");
    try {
      validateTemplate(draft);
      if (!gameKey.trim()) throw new Error("Choose a game before saving.");
      if (!onSave)
        throw new Error("Preview mode. Connect Convex and sign in to save.");
      setSaving(true);
      const normalized = {
        ...draft,
        tieBreakers: templateTieBreakRules(draft),
      };
      delete normalized.tieBreakRules;
      const saved = await onSave(gameKey.trim(), normalized);
      setDirty(false);
      toast.success("Official template saved");
      const data = {
        ...normalized,
        id: saved.id,
        version: saved.version,
      };
      setDraft(data);
      setSelected({
        key: saved.id,
        gameKey: gameKey.trim(),
        gameTitle,
        ...providerIds,
        builtIn: false,
        data,
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function generateTranslationDraft() {
    setTranslationError("");
    if (!onSave) {
      setTranslationError("Connect the Meeple backend to generate translations.");
      return;
    }
    if (dirty) {
      setTranslationError("Save the English template changes before generating a translation.");
      return;
    }
    setTranslationBusy(true);
    try {
      const result = await generateTranslation({ gameKey, locale: "pt-BR" });
      setDraft((current) => ({
        ...current,
        translations: {
          ...current.translations,
          ptBR: { ...result.translation, status: "draft", sourceVersion: result.sourceVersion },
        },
      }));
      setTranslationDirty(true);
      toast.success("Portuguese draft generated");
    } catch (cause) {
      setTranslationError(cause instanceof Error ? cause.message : "Could not generate translation.");
    } finally {
      setTranslationBusy(false);
    }
  }
  function updateTranslation(patch: Partial<TemplateTranslationContent>) {
    setDraft((current) => {
      const previous = current.translations?.ptBR ?? {
        ...emptyTranslation(current),
        status: "draft" as const,
        sourceVersion: current.version,
      };
      return {
        ...current,
        translations: {
          ...current.translations,
          ptBR: { ...previous, ...patch, status: "draft", sourceVersion: previous.sourceVersion },
        },
      };
    });
    setTranslationDirty(true);
    setTranslationError("");
  }
  async function saveReviewedTranslation() {
    const translation = draft.translations?.ptBR;
    if (!translation || !gameKey) return;
    setTranslationError("");
    if (!onSave) {
      setTranslationError("Connect the Meeple backend to save translations.");
      return;
    }
    if (dirty || translation.sourceVersion !== draft.version) {
      setTranslationError("Save the English template before reviewing this translation.");
      return;
    }
    setTranslationBusy(true);
    try {
      const saved = await saveTranslationMutation({
        gameKey,
        sourceVersion: translation.sourceVersion,
        translation: {
          title: translation.title,
          edition: translation.edition,
          endCondition: translation.endCondition,
          fields: translation.fields,
          tieBreakers: translation.tieBreakers,
          roles: translation.roles,
        },
      });
      setDraft((current) => ({
        ...current,
        translations: { ...current.translations, ptBR: saved },
      }));
      setTranslationDirty(false);
      toast.success("Portuguese translation saved");
    } catch (cause) {
      setTranslationError(cause instanceof Error ? cause.message : "Could not save translation.");
    } finally {
      setTranslationBusy(false);
    }
  }
  return (
    <div className="shell">
      <main>
        <header className="topbar">
          <Sheet>
            <span className="topbar-navigation">
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open navigation"
                  >
                    <PanelLeftOpen />
                  </Button>
                }
              />
              <span>
                Workspace <ChevronRight size={14} /> Templates
              </span>
            </span>
            <SheetContent side="left" className="sidebar-sheet">
              <SheetHeader className="sr-only">
                <SheetTitle>Workspace navigation</SheetTitle>
                <SheetDescription>
                  Navigate the Meeple administration workspace.
                </SheetDescription>
              </SheetHeader>
              <aside className="sidebar">
                <a
                  className="wordmark"
                  href="/"
                  aria-label="Meeple Studio home"
                >
                  <span className="brand-icon">
                    <Dices size={22} />
                  </span>
                  meeple<span className="studio">studio</span>
                </a>
                <div className="workspace-label">Workspace</div>
                <div className="nav-active" title="Scoring templates">
                  <Layers3 size={18} /> Scoring templates{" "}
                  <Badge variant="secondary">{rows?.length ?? "…"}</Badge>
                </div>
                <div className="sidebar-note">
                  <BookOpen size={18} />
                  <strong>Good rules, great games.</strong>
                  <p>
                    Build score sheets that make the last turn as good as the
                    first.
                  </p>
                </div>
                <div className="sidebar-bottom">
                  <span
                    className={onSave ? "status-dot" : "status-dot preview"}
                  />
                  {onSave ? "Convex connected" : "Local preview"}
                  {onSignOut && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Sign out"
                      onClick={onSignOut}
                    >
                      <LogOut />
                    </Button>
                  )}
                </div>
              </aside>
            </SheetContent>
          </Sheet>
          <Badge variant="outline">
            <ShieldCheck size={13} /> Administrator
          </Badge>
        </header>
        <div className="page-heading">
          <div>
            <div className="eyebrow">The finishing touches</div>
            <h1>Scoring templates</h1>
            <p>
              One official sheet per base game, plus additive sheets for its
              expansions. Three defaults for every table.
            </p>
          </div>
          <Button onClick={create}>
            <Plus data-icon="inline-start" /> New template
          </Button>
        </div>
        {!onSave && (
          <Alert className="preview-banner">
            <Dices />
            <AlertDescription>
              You’re exploring the template editor. Add VITE_CONVEX_URL to
              connect your Meeple backend and save.
            </AlertDescription>
          </Alert>
        )}
        <div className={cn("workbench", fixedGame && "workbench-fixed-game")}>
          {!fixedGame && (
            <Card className="library">
              <CardHeader className="library-top">
                <CardTitle>Library</CardTitle>
                <CardAction>
                  <Badge variant="secondary">{items.length} templates</Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="library-main">
                <InputGroup className="search">
                  <InputGroupAddon>
                    <Search />
                  </InputGroupAddon>
                  <InputGroupInput
                    aria-label="Search templates"
                    placeholder="Find a template…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </InputGroup>
                <div className="game-filter">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onGameKey?.("")}
                  >
                    Show all
                  </Button>
                </div>
                <div className="template-list">
                  {rows === undefined ? (
                    <div
                      className="loading-state"
                      role="status"
                      aria-label="Loading templates"
                    >
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ) : !items.length ? (
                    <Empty className="empty">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Search />
                        </EmptyMedia>
                        <EmptyTitle>No templates found</EmptyTitle>
                        <EmptyDescription>
                          Try another search or add a template.
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button variant="outline" onClick={create}>
                          New template
                        </Button>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    items.map((row) => (
                      <Button
                        key={row.key}
                        variant="ghost"
                        className={cn(
                          "template-row",
                          selected?.key === row.key && "selected",
                        )}
                        onClick={() => choose(row)}
                      >
                        <GameCover
                          key={row.image ?? row.key}
                          image={row.image}
                          title={row.gameTitle}
                        />
                        <span className="row-text">
                          <strong>{row.data.title}</strong>
                          <small>
                            {row.data.fields.length} categories ·{" "}
                            {row.data.minPlayers}–{row.data.maxPlayers} players
                          </small>
                          <span className="row-edition">
                            {row.data.edition}
                          </span>
                        </span>
                        <ChevronRight size={14} />
                      </Button>
                    ))
                  )}
                </div>
              </CardContent>
              <CardFooter className="library-footer">
                <span className="status-dot" />
                {onSave
                  ? "Changes sync in real time"
                  : "Built-in template preview"}
              </CardFooter>
            </Card>
          )}
          <Card className="editor">
            <CardHeader className="editor-top">
              <div>
                <Badge variant="secondary">
                  {selected ? "Official template" : "New official template"}
                </Badge>
                <CardTitle>{draft.title || "Untitled template"}</CardTitle>
                <CardDescription>
                  Maintain the official scoring rules for this game.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="editor-content">
              <Tabs
                defaultValue="details"
                onValueChange={(value) => {
                  if (value === "advanced" && !jsonDirty)
                    setJson(JSON.stringify(draft, null, 2));
                }}
              >
                <TabsList className="editor-tabs">
                  <TabsTrigger value="details">Details & scoring</TabsTrigger>
                  <TabsTrigger value="translations">Translations</TabsTrigger>
                  <TabsTrigger value="sourceLinks">Source links</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced JSON</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="form-body">
                  <div className="section-heading">
                    <span className="section-number">01</span>
                    <div>
                      <h3>Template details</h3>
                      <p>The essentials, before the first turn.</p>
                    </div>
                  </div>
                  <FieldGroup className="template-fields">
                    <Field label="Template name">
                      <Input
                        maxLength={80}
                        value={draft.title}
                        onChange={(e) => change({ title: e.target.value })}
                      />
                    </Field>
                    <div
                      className="game-identity-preview"
                      aria-label="Game identifiers"
                    >
                      <IdentityValue label="Meeple ID" value={gameKey} />
                      <IdentityValue
                        label="Ludopedia ID"
                        value={
                          providerIds.ludopediaId === undefined
                            ? "—"
                            : String(providerIds.ludopediaId)
                        }
                      />
                      <IdentityValue
                        label="BGG ID"
                        value={
                          providerIds.bggId === undefined
                            ? "—"
                            : String(providerIds.bggId)
                        }
                      />
                    </div>
                    <div className="two-col">
                      <Field label="Edition">
                        <Input
                          maxLength={200}
                          value={draft.edition}
                          onChange={(e) => change({ edition: e.target.value })}
                        />
                      </Field>
                      <UIField className="field">
                        <FieldLabel htmlFor="official-game">Game</FieldLabel>
                        <Input id="official-game" value={gameTitle} readOnly />
                        <FieldDescription className="helper">
                          {gameKey || "Select a game when creating a template"}
                        </FieldDescription>
                      </UIField>
                    </div>
                    <div className="two-col">
                      <Field label="Minimum players">
                        <Input
                          type="number"
                          min={1}
                          max={12}
                          value={draft.minPlayers}
                          onChange={(e) =>
                            change({ minPlayers: Number(e.target.value) })
                          }
                        />
                      </Field>
                      <Field label="Maximum players">
                        <Input
                          type="number"
                          min={1}
                          max={12}
                          value={draft.maxPlayers}
                          onChange={(e) =>
                            change({ maxPlayers: Number(e.target.value) })
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Rules reference">
                      <Input
                        placeholder="https://…"
                        type="url"
                        value={draft.source}
                        onChange={(e) => change({ source: e.target.value })}
                      />
                    </Field>
                    <Field label="When does scoring end?">
                      <Textarea
                        maxLength={1000}
                        value={draft.endCondition}
                        onChange={(e) =>
                          change({ endCondition: e.target.value })
                        }
                      />
                    </Field>
                  </FieldGroup>
                  <UIField orientation="horizontal" className="switch-row">
                    <FieldContent>
                      <FieldTitle id="lowest-wins-label">
                        Lowest score wins
                      </FieldTitle>
                      <FieldDescription>
                        Leave off for highest-score games.
                      </FieldDescription>
                    </FieldContent>
                    <Switch
                      aria-labelledby="lowest-wins-label"
                      checked={draft.lowestWins ?? false}
                      onCheckedChange={(v) => change({ lowestWins: v })}
                    />
                  </UIField>
                  <div className="section-heading category-heading">
                    <span className="section-number">02</span>
                    <div>
                      <h3>Scoring categories</h3>
                      <p>One field for each thing worth counting.</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={draft.fields.length >= 30}
                      onClick={() =>
                        change({
                          fields: [
                            ...draft.fields,
                            {
                              id: `field_${Date.now()}`,
                              label: "New category",
                              hint: "",
                              total: true,
                              min: 0,
                            },
                          ],
                        })
                      }
                    >
                      <Plus data-icon="inline-start" /> Add
                    </Button>
                  </div>
                  {draft.fields.map((field, index) => (
                    <FieldSet className="category" key={field.id}>
                      <FieldLegend className="sr-only">
                        Scoring category {index + 1}
                      </FieldLegend>
                      <div className="category-title">
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <Input
                          aria-label={`Category ${index + 1} label`}
                          maxLength={80}
                          value={field.label}
                          onChange={(e) =>
                            change({
                              fields: draft.fields.map((f, i) =>
                                i === index
                                  ? { ...f, label: e.target.value }
                                  : f,
                              ),
                            })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={draft.fields.length === 1}
                          aria-label={`Remove ${field.label}`}
                          onClick={() =>
                            change({
                              fields: draft.fields.filter(
                                (_, i) => i !== index,
                              ),
                            })
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                      <Input
                        aria-label={`${field.label} hint`}
                        placeholder="A helpful hint for the table…"
                        maxLength={300}
                        value={field.hint}
                        onChange={(e) =>
                          change({
                            fields: draft.fields.map((f, i) =>
                              i === index ? { ...f, hint: e.target.value } : f,
                            ),
                          })
                        }
                      />
                      <div className="category-options">
                        <label>
                          Min{" "}
                          <Input
                            aria-label={`${field.label} minimum`}
                            type="number"
                            value={field.min}
                            onChange={(e) =>
                              change({
                                fields: draft.fields.map((f, i) =>
                                  i === index
                                    ? { ...f, min: Number(e.target.value) }
                                    : f,
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          Max{" "}
                          <Input
                            aria-label={`${field.label} maximum`}
                            type="number"
                            placeholder="None"
                            value={field.max ?? ""}
                            onChange={(e) =>
                              change({
                                fields: draft.fields.map((f, i) => {
                                  if (i !== index) return f;
                                  const next = { ...f };
                                  if (e.target.value === "") delete next.max;
                                  else next.max = Number(e.target.value);
                                  return next;
                                }),
                              })
                            }
                          />
                        </label>
                        <div className="category-total">
                          <Switch
                            aria-label={`Include ${field.label} in total`}
                            checked={field.total}
                            onCheckedChange={(total) =>
                              change({
                                fields: draft.fields.map((f, i) =>
                                  i === index ? { ...f, total } : f,
                                ),
                              })
                            }
                          />
                          <span>In total</span>
                        </div>
                      </div>
                    </FieldSet>
                  ))}
                  <div className="section-heading category-heading">
                    <span className="section-number">03</span>
                    <div>
                      <h3>Tie-breakers</h3>
                      <p>Resolve tied totals in priority order.</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        change({
                          tieBreakers: [
                            ...templateTieBreakRules(draft),
                            {
                              id: `tie_${Date.now()}`,
                              label: "New tie-breaker",
                              hint: "",
                              total: false,
                              min: 0,
                              direction: "higher",
                            },
                          ],
                        })
                      }
                    >
                      <Plus data-icon="inline-start" /> Add tie-breaker
                    </Button>
                  </div>
                  {templateTieBreakRules(draft).map((rule, index) => (
                    <FieldSet className="category" key={rule.id}>
                      <FieldLegend className="sr-only">
                        Tie-breaker {index + 1}
                      </FieldLegend>
                      <div className="category-title">
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <Input
                          aria-label={`Tie-breaker ${index + 1} label`}
                          value={rule.label}
                          onChange={(e) =>
                            change({
                              tieBreakers: templateTieBreakRules(draft).map(
                                (current) =>
                                  current.id === rule.id
                                    ? { ...current, label: e.target.value }
                                    : current,
                              ),
                            })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${rule.label}`}
                          onClick={() =>
                            change({
                              tieBreakers: templateTieBreakRules(draft).filter(
                                (current) => current.id !== rule.id,
                              ),
                            })
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                      <Input
                        aria-label={`${rule.label} hint`}
                        value={rule.hint}
                        placeholder="What should players record?"
                        onChange={(e) =>
                          change({
                            tieBreakers: templateTieBreakRules(draft).map(
                              (current) =>
                                current.id === rule.id
                                  ? { ...current, hint: e.target.value }
                                  : current,
                            ),
                          })
                        }
                      />
                      <Select
                        items={tieBreakDirectionItems}
                        value={rule.direction}
                        onValueChange={(direction) =>
                          change({
                            tieBreakers: templateTieBreakRules(draft).map(
                              (current) =>
                                current.id === rule.id
                                  ? {
                                      ...current,
                                      direction: direction as
                                        "higher" | "lower",
                                    }
                                  : current,
                            ),
                          })
                        }
                      >
                        <SelectTrigger aria-label={`${rule.label} comparison`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="higher">
                              Higher value wins
                            </SelectItem>
                            <SelectItem value="lower">
                              Lower value wins
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FieldSet>
                  ))}
                  <p className="helper">
                    These inputs resolve tied scores and are excluded from
                    totals.
                  </p>
                </TabsContent>
                <TabsContent value="advanced" className="form-body">
                  <p className="helper">
                    Edit the full Meeple template, including roles, expansions,
                    and outcome rules. Apply before saving. Saving is disabled
                    while JSON changes are unapplied.
                  </p>
                  <Textarea
                    aria-label="Template JSON"
                    className="json-editor"
                    value={json}
                    onChange={(e) => {
                      setJson(e.target.value);
                      setJsonDirty(true);
                      setDirty(true);
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      try {
                        const data = JSON.parse(json) as Template;
                        validateTemplate(data);
                        change(data);
                        setJsonDirty(false);
                        toast.success("JSON applied");
                      } catch (e) {
                        setError(
                          e instanceof Error ? e.message : "Invalid JSON",
                        );
                      }
                    }}
                  >
                    Apply JSON
                  </Button>
                </TabsContent>
                <TabsContent value="translations" className="form-body">
                  <div className="section-heading">
                    <span className="section-number">04</span>
                    <div>
                      <h3>Template translation</h3>
                      <p>Translate player-facing text while keeping scoring IDs and rules intact.</p>
                    </div>
                    <Badge variant={translationStatus === "Reviewed" ? "secondary" : "outline"}>
                      {translationStatus}
                    </Badge>
                  </div>
                  <Alert>
                    <Languages />
                    <AlertDescription>
                      Brazilian Portuguese · AI creates a draft. Saving it marks this translation reviewed.
                    </AlertDescription>
                  </Alert>
                  {translationStale || dirty ? (
                    <Alert variant="destructive">
                      <AlertDescription>
                        The English source has unsaved or newer changes. Save it before generating or reviewing this translation.
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  <div className="translation-actions">
                    <Button variant="outline" disabled={translationBusy || !gameKey || dirty} onClick={() => void generateTranslationDraft()}>
                      <Sparkles data-icon="inline-start" />
                      {translationBusy ? "Working…" : "Generate Portuguese draft"}
                    </Button>
                    <Button disabled={translationBusy || !gameKey || !translationDirty || dirty || translationStale} onClick={() => void saveReviewedTranslation()}>
                      <Save data-icon="inline-start" />
                      Save reviewed translation
                    </Button>
                  </div>
                  {translationError ? (
                    <Alert variant="destructive" className="error-alert">
                      <AlertDescription>{translationError}</AlertDescription>
                    </Alert>
                  ) : null}
                  <FieldGroup className="template-fields">
                    <div className="two-col">
                      <Field label="Template name · pt-BR">
                        <Input maxLength={80} value={translation.title} onChange={(e) => updateTranslation({ title: e.target.value })} />
                      </Field>
                      <Field label="Edition · pt-BR">
                        <Input maxLength={200} value={translation.edition} onChange={(e) => updateTranslation({ edition: e.target.value })} />
                      </Field>
                    </div>
                    <Field label="Scoring end condition · pt-BR">
                      <Textarea maxLength={1000} value={translation.endCondition} onChange={(e) => updateTranslation({ endCondition: e.target.value })} />
                    </Field>
                    {draft.fields.map((field) => {
                      const translated = translation.fields[field.id] ?? { label: "", hint: "" };
                      return (
                        <FieldSet className="category" key={`translation-${field.id}`}>
                          <FieldLegend>{field.label}</FieldLegend>
                          <Field label="Label · pt-BR">
                            <Input maxLength={80} value={translated.label} onChange={(e) => updateTranslation({ fields: { ...translation.fields, [field.id]: { ...translated, label: e.target.value } } })} />
                          </Field>
                          <Field label="Hint · pt-BR">
                            <Textarea maxLength={300} value={translated.hint} onChange={(e) => updateTranslation({ fields: { ...translation.fields, [field.id]: { ...translated, hint: e.target.value } } })} />
                          </Field>
                        </FieldSet>
                      );
                    })}
                    {templateTieBreakRules(draft).map((rule) => {
                      const translated = translation.tieBreakers[rule.id] ?? { label: "", hint: "" };
                      return (
                        <FieldSet className="category" key={`translation-tie-${rule.id}`}>
                          <FieldLegend>{rule.label} · tie-breaker</FieldLegend>
                          <Field label="Label · pt-BR">
                            <Input maxLength={80} value={translated.label} onChange={(e) => updateTranslation({ tieBreakers: { ...translation.tieBreakers, [rule.id]: { ...translated, label: e.target.value } } })} />
                          </Field>
                          <Field label="Hint · pt-BR">
                            <Textarea maxLength={300} value={translated.hint} onChange={(e) => updateTranslation({ tieBreakers: { ...translation.tieBreakers, [rule.id]: { ...translated, hint: e.target.value } } })} />
                          </Field>
                        </FieldSet>
                      );
                    })}
                    {(draft.roles ?? []).map((role) => (
                      <Field key={`translation-role-${role.id}`} label={`${role.label} · pt-BR`}>
                        <Input maxLength={60} value={translation.roles[role.id] ?? ""} onChange={(e) => updateTranslation({ roles: { ...translation.roles, [role.id]: e.target.value } })} />
                      </Field>
                    ))}
                  </FieldGroup>
                </TabsContent>
                <TabsContent
                  value="sourceLinks"
                  className="form-body source-link-tab"
                >
                  <SourceLinksPanel
                    gameKey={gameKey}
                    enabled={Boolean(onSave)}
                    onLinked={(game) =>
                      setProviderIds({
                        ludopediaId: game.ludopediaId,
                        bggId: game.bggId,
                      })
                    }
                    onImageChange={setGameImage}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="save-bar">
              {error && (
                <Alert variant="destructive" className="error-alert">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div>
                <span className={dirty ? "status-dot amber" : "status-dot"} />
                {dirty ? "Unsaved changes" : "All changes saved"}
                <Button
                  disabled={saving || jsonDirty}
                  onClick={() => void save()}
                >
                  <Save data-icon="inline-start" />
                  {saving ? "Saving…" : "Save official template"}
                </Button>
              </div>
              <small>
                One sheet per selected game or expansion. Base game sheets can
                be combined with additive expansion sections.
              </small>
            </CardFooter>
          </Card>
          <aside className="preview-panel">
            <div className="preview-label">
              Live preview <span />
            </div>
            <Card className="score-sheet">
              <CardContent>
                <GameCover
                  image={gameImage}
                  title={gameTitle}
                  className="preview-game-cover"
                />
                <span className="sheet-edition">{draft.edition}</span>
                <h2>{draft.title}</h2>
                <p>
                  {draft.minPlayers}–{draft.maxPlayers} players ·{" "}
                  {draft.lowestWins ? "Lowest" : "Highest"} score wins
                </p>
                <div className="sheet-rule" />
                {draft.fields.map((f) => (
                  <div key={f.id} className="score-line">
                    <span>
                      {f.label}
                      <small>{f.total ? "Points" : "Tie-breaker"}</small>
                    </span>
                    <span className="score-box">—</span>
                  </div>
                ))}
                {templateTieBreakRules(draft).length ? (
                  <div className="helper">
                    Tie-break priority:{" "}
                    {templateTieBreakRules(draft)
                      .map((f) => f.label)
                      .join(" → ")}
                  </div>
                ) : null}
                <div className="total-line">
                  <strong>Total score</strong>
                  <strong>0</strong>
                </div>
                <div className="sheet-note">{draft.endCondition}</div>
              </CardContent>
            </Card>
            <div className="preview-tip">
              <ShieldCheck size={18} />
              <p>
                <strong>Made for the table.</strong>
                <br />
                This is how your scoring categories will read during a game.
              </p>
            </div>
            <div className="revision-note">
              <FilePlus2 size={18} />
              <h3>One game. One official sheet.</h3>
              <p>
                Save changes directly to the official template. Players can also
                choose the three defaults or create their own templates.
              </p>
            </div>
          </aside>
        </div>
        <footer className="page-footer">
          Made for the people around the table.
          <span>Meeple template studio</span>
        </footer>
      </main>
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose a game</DialogTitle>
            <DialogDescription>
              Select a base game or expansion to create or edit its official
              scoring section.
            </DialogDescription>
          </DialogHeader>
          {onSave && !fixedGame ? (
            <LiveGamePicker onSelect={selectGame} />
          ) : !onSave ? (
            <GamePicker
              games={demo.map((row) => ({
                id: row.gameKey,
                title: row.gameTitle,
                ...(row.image ? { image: row.image } : {}),
                ...(row.ludopediaId ? { ludopediaId: row.ludopediaId } : {}),
                ...(row.bggId ? { bggId: row.bggId } : {}),
                data: row.data,
              }))}
              onSelect={selectGame}
            />
          ) : (
            <EmptyState description="This template is attached to the selected game." />
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your current edits haven’t been saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                pending?.();
                setPending(null);
              }}
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
function GameCatalog({ onSignOut }: { onSignOut: () => void }) {
  const convex = useConvex();
  const [missingOnly, setMissingOnly] = useState(false);
  const [selected, setSelected] = useState<Game | null>(null);
  const [search, setSearch] = useState("");
  const { results, status, loadMore } = usePaginatedQuery(
    gamePages,
    { missingTemplateOnly: missingOnly, search },
    { initialNumItems: 30 },
  );
  const templateRows = useQuery(
    library,
    selected ? { gameKey: selected.id } : "skip",
  );
  const saveTemplateMutation = useMutation(saveTemplate);
  const saveGameMutation = useMutation(saveGame);
  const [json, setJson] = useState("");
  const [jsonDirty, setJsonDirty] = useState(false);
  const [jsonOwnerId, setJsonOwnerId] = useState(selected?.id);
  const [showDiscardGame, setShowDiscardGame] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  if (selected?.id !== jsonOwnerId) {
    setJsonOwnerId(selected?.id);
    setJson(selected ? JSON.stringify(selected, null, 2) : "");
    setJsonDirty(false);
    setError("");
  }
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (jsonDirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [jsonDirty]);
  const fixedGame: GameOption | undefined = selected
    ? {
        id: selected.id,
        title: selected.title,
        ...(selected.image ? { image: selected.image } : {}),
        ...(selected.ludopediaId ? { ludopediaId: selected.ludopediaId } : {}),
        ...(selected.bggId ? { bggId: selected.bggId } : {}),
        data: templateRows?.[0]?.data ?? null,
      }
    : undefined;
  return (
    <div className="shell">
      <main>
        <header className="topbar">
          <span className="topbar-navigation">
            <Dices size={19} /> Workspace <ChevronRight size={14} /> Games
          </span>
          <div className="topbar-actions">
            <Badge variant="outline">
              <ShieldCheck size={13} /> Administrator
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={onSignOut}
            >
              <LogOut />
            </Button>
          </div>
        </header>
        {!selected ? (
          <>
            <div className="page-heading">
              <div>
                <div className="eyebrow">Catalog management</div>
                <h1>Games</h1>
                <p>
                  Browse registered games and manage their templates and catalog
                  data.
                </p>
              </div>
              <Badge variant="secondary">{results.length} loaded</Badge>
            </div>
            <div className="catalog-toolbar">
              <InputGroup className="catalog-search">
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput
                  aria-label="Search games"
                  placeholder="Search all games…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </InputGroup>
              <UIField orientation="horizontal" className="missing-toggle">
                <Switch
                  aria-labelledby="missing-only-label"
                  checked={missingOnly}
                  onCheckedChange={setMissingOnly}
                />
                <FieldTitle id="missing-only-label">
                  Missing templates only
                </FieldTitle>
              </UIField>
            </div>
            <section className="catalog-grid" aria-label="Registered games">
              {results.map(({ game, hasOfficialTemplate }) => (
                <Button
                  key={game.id}
                  variant="outline"
                  className="catalog-card"
                  onClick={() => setSelected(game)}
                >
                  <GameCover
                    image={game.image}
                    title={game.title}
                    className="catalog-cover"
                  />
                  <span className="catalog-card-copy">
                    <strong>{game.title}</strong>
                    <small>
                      {game.kind === "expansion"
                        ? "Expansion"
                        : game.kind === "edition"
                          ? "Edition"
                          : "Base game"}{" "}
                      · {game.minPlayers ?? "?"}–{game.maxPlayers ?? "?"}{" "}
                      players
                    </small>
                    <code>{game.id}</code>
                  </span>
                  <Badge
                    variant={hasOfficialTemplate ? "secondary" : "outline"}
                  >
                    {hasOfficialTemplate ? "Template set" : "No template"}
                  </Badge>
                </Button>
              ))}
              {!results.length && status !== "LoadingFirstPage" && (
                <EmptyState
                  className="empty catalog-empty"
                  icon={<Dices />}
                  title="No games match"
                  description="Try another search or change the template filter."
                />
              )}
            </section>
            <div className="catalog-pagination">
              <span
                role={
                  status === "LoadingFirstPage" || status === "LoadingMore"
                    ? "status"
                    : undefined
                }
              >
                {status === "LoadingFirstPage"
                  ? "Loading games…"
                  : `${results.length} games loaded`}
              </span>
              {status === "CanLoadMore" && (
                <Button variant="outline" onClick={() => loadMore(30)}>
                  Load more games
                </Button>
              )}
              {status === "Exhausted" && results.length > 0 && (
                <span>All games loaded</span>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="page-heading game-detail-heading">
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (jsonDirty) setShowDiscardGame(true);
                    else setSelected(null);
                  }}
                >
                  <ArrowLeft data-icon="inline-start" /> All games
                </Button>
                <div className="game-detail-title">
                  <GameCover image={selected.image} title={selected.title} />
                  <div>
                    <div className="eyebrow">
                      {selected.id} · {selected.kind ?? "base game"}
                    </div>
                    <h1>{selected.title}</h1>
                    <p>
                      {selected.minPlayers ?? "?"}–{selected.maxPlayers ?? "?"}{" "}
                      players · {selected.minutes ?? "?"} minutes
                    </p>
                  </div>
                </div>
              </div>
              <Badge variant={fixedGame?.data ? "secondary" : "outline"}>
                {fixedGame?.data ? "Template set" : "No template"}
              </Badge>
            </div>
            <Tabs defaultValue="template" key={selected.id}>
              <TabsList className="editor-tabs catalog-detail-tabs">
                <TabsTrigger value="template">Scoring template</TabsTrigger>
                <TabsTrigger value="sources">Source links</TabsTrigger>
                <TabsTrigger value="game-json">Advanced game JSON</TabsTrigger>
              </TabsList>
              <TabsContent value="template" className="catalog-tab-content">
                {templateRows === undefined ? (
                  <div
                    className="loading-state"
                    role="status"
                    aria-label="Loading template"
                  >
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                ) : (
                  <Workspace
                    key={`${selected.id}-${templateRows[0]?.key ?? "new"}`}
                    rows={templateRows}
                    fixedGame={fixedGame}
                    onSave={async (key, data) => {
                      const id = await saveTemplateMutation({ gameKey: key, data });
                      const saved = (await convex.query(library, { gameKey: key }))[0]?.data;
                      return { id, version: saved?.version ?? data.version };
                    }}
                  />
                )}
              </TabsContent>
              <TabsContent value="sources" className="catalog-tab-content">
                <SourceLinksPanel
                  gameKey={selected.id}
                  enabled
                  onLinked={(game) => {
                    setSelected(game);
                    if (!jsonDirty) setJson(JSON.stringify(game, null, 2));
                  }}
                  onImageChange={() => {}}
                />
              </TabsContent>
              <TabsContent value="game-json" className="catalog-tab-content">
                <Card className="game-json-panel">
                  <CardHeader>
                    <CardTitle>Advanced game data</CardTitle>
                    <CardDescription>
                      Edit game metadata here. Change provider IDs in Source
                      links.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="game-json-content">
                    <Textarea
                      aria-label="Game JSON"
                      className="json-editor"
                      value={json}
                      onChange={(event) => {
                        setJson(event.target.value);
                        setJsonDirty(true);
                      }}
                    />
                    {error && (
                      <Alert variant="destructive" className="error-alert">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                  <CardFooter className="save-bar">
                    <div>
                      <span
                        className={cn("status-dot", jsonDirty && "amber")}
                      />
                      {jsonDirty ? "Unsaved changes" : "All changes saved"}
                      <Button
                        disabled={!jsonDirty || saving}
                        onClick={async () => {
                          setError("");
                          try {
                            const data = JSON.parse(json) as Game;
                            setSaving(true);
                            const game = await saveGameMutation({
                              gameKey: selected.id,
                              data,
                            });
                            setSelected(game);
                            setJson(JSON.stringify(game, null, 2));
                            setJsonDirty(false);
                            toast.success("Game data saved");
                          } catch (cause) {
                            setError(
                              cause instanceof Error
                                ? cause.message
                                : "Could not save game data.",
                            );
                          } finally {
                            setSaving(false);
                          }
                        }}
                      >
                        <Save data-icon="inline-start" />
                        {saving ? "Saving…" : "Save game JSON"}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
        <AlertDialog open={showDiscardGame} onOpenChange={setShowDiscardGame}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard unsaved game data?</AlertDialogTitle>
              <AlertDialogDescription>
                Your changes to this game’s JSON will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep editing</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  setSelected(null);
                  setShowDiscardGame(false);
                }}
              >
                Discard changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const generatedId = useId();
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string }>, {
        id: (children as ReactElement<{ id?: string }>).props.id ?? generatedId,
      })
    : children;
  const controlId = isValidElement(control)
    ? (control as ReactElement<{ id?: string }>).props.id
    : generatedId;

  return (
    <UIField className="field">
      <FieldLabel htmlFor={controlId}>{label}</FieldLabel>
      {control}
    </UIField>
  );
}

function EmptyState({
  title,
  description,
  icon,
  action,
  className = "empty",
  role,
}: {
  title?: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  role?: "status" | "alert";
}) {
  return (
    <Empty className={className} role={role}>
      <EmptyHeader>
        {icon && <EmptyMedia variant="icon">{icon}</EmptyMedia>}
        {title && <EmptyTitle>{title}</EmptyTitle>}
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}

function LiveGamePicker({
  onSelect,
}: {
  onSelect: (game: GameOption) => void;
}) {
  const [search, setSearch] = useState("");
  const games = useQuery(gameSearch, { search });
  return (
    <GamePicker
      games={games}
      search={search}
      onSearch={setSearch}
      onSelect={onSelect}
    />
  );
}
function GamePicker({
  games,
  search: remoteSearch,
  onSearch,
  onSelect,
}: {
  games: GameOption[] | undefined;
  search?: string;
  onSearch?: (search: string) => void;
  onSelect: (game: GameOption) => void;
}) {
  const [localSearch, setLocalSearch] = useState("");
  const search = remoteSearch ?? localSearch;
  const filtered = onSearch
    ? games
    : games?.filter((game) =>
        game.title.toLowerCase().includes(search.toLowerCase()),
      );
  return (
    <div className="game-picker">
      <Input
        aria-label="Search games"
        placeholder="Search games by name…"
        value={search}
        onChange={(e) => (onSearch ?? setLocalSearch)(e.target.value)}
      />
      <div className="game-picker-results">
        {filtered === undefined ? (
          <div
            className="loading-state"
            role="status"
            aria-label="Loading games"
          >
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !filtered.length ? (
          <EmptyState description="No catalog games found. Import a game in Meeple first." />
        ) : (
          filtered.map((game) => (
            <Button
              key={game.id}
              variant="ghost"
              onClick={() => onSelect(game)}
            >
              <GameCover
                key={game.image ?? game.id}
                image={game.image}
                title={game.title}
              />
              <span className="game-picker-option">
                <span>{game.title}</span>
                <span className="game-picker-identifiers">
                  {game.id}
                  {game.ludopediaId
                    ? ` · Ludopedia ${game.ludopediaId}`
                    : " · Ludopedia —"}
                  {game.bggId ? ` · BGG ${game.bggId}` : " · BGG —"}
                </span>
              </span>
              <Badge variant="secondary">
                {game.data ? "Edit official" : "Create official"}
              </Badge>
            </Button>
          ))
        )}
      </div>
    </div>
  );
}
function GameCover({
  image,
  title,
  className = "",
}: {
  image?: string;
  title: string;
  className?: string;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  return (
    <span
      className={cn("game-cover", className)}
      title={title}
      aria-hidden="true"
    >
      {image && failedImage !== image ? (
        <img
          src={image}
          alt=""
          loading="lazy"
          onError={() => setFailedImage(image)}
        />
      ) : (
        <Dices size={19} />
      )}
    </span>
  );
}
function SourceLinksPanel({
  gameKey,
  enabled,
  onLinked,
  onImageChange,
}: {
  gameKey: string;
  enabled: boolean;
  onLinked: (game: Game) => void;
  onImageChange: (image?: string) => void;
}) {
  const links = useQuery(
    sourceLinksQuery,
    enabled && gameKey ? { gameKey } : "skip",
  );
  if (!gameKey)
    return (
      <EmptyState description="Choose a game when creating a template to review its source links." />
    );
  if (!enabled)
    return (
      <EmptyState description="Connect the Meeple backend to review and update source links." />
    );
  if (links === undefined)
    return (
      <div
        className="loading-state"
        role="status"
        aria-label="Loading source links"
      >
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  if (!links)
    return (
      <EmptyState
        role="alert"
        title="Game record not found"
        description="Return to the catalog and select a registered game."
        icon={<Dices />}
      />
    );
  return (
    <div className="source-links-workspace">
      <div className="section-heading">
        <span className="section-number">ID</span>
        <div>
          <h3>Catalog source links</h3>
          <p>
            Review the provider records attached to {links.title}. Search a
            provider to replace an incorrect match.
          </p>
        </div>
      </div>
      <div className="source-game-summary">
        <GameCover image={links.image} title={links.title} />
        <div>
          <strong>{links.title}</strong>
          <code>{links.gameKey}</code>
        </div>
      </div>
      <div className="source-link-grid">
        <ProviderLinkCard
          key={`${gameKey}-ludopedia`}
          gameKey={gameKey}
          gameTitle={links.title}
          provider="ludopedia"
          current={links.ludopedia}
          onLinked={onLinked}
          onImageChange={onImageChange}
        />
        <ProviderLinkCard
          key={`${gameKey}-bgg`}
          gameKey={gameKey}
          gameTitle={links.title}
          provider="bgg"
          current={links.bgg}
          onLinked={onLinked}
          onImageChange={onImageChange}
        />
      </div>
    </div>
  );
}
function ProviderLinkCard({
  gameKey,
  gameTitle,
  provider,
  current,
  onLinked,
  onImageChange,
}: {
  gameKey: string;
  gameTitle: string;
  provider: SourceProvider;
  current: ProviderLink | null;
  onLinked: (game: Game) => void;
  onImageChange: (image?: string) => void;
}) {
  const label = provider === "bgg" ? "BoardGameGeek" : "Ludopedia";
  const [editing, setEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState(gameTitle);
  const [results, setResults] = useState<SourceSearchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const runSearch = useAction(sourceSearch);
  const confirm = useMutation(confirmSourceLink);
  async function search() {
    setBusy(true);
    setError("");
    setResults(null);
    try {
      const found = await runSearch({ gameKey, provider, search: searchTerm });
      setResults(found);
      if (!found.candidates.length)
        setError(`No ${label} results found. Try another search.`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : `Could not search ${label}.`,
      );
    } finally {
      setBusy(false);
    }
  }
  async function select(candidate: Game) {
    if (!results?.proposalId) return;
    setBusy(true);
    setError("");
    try {
      const game = await confirm({
        proposalId: results.proposalId,
        candidateId: candidate.id,
        replace: true,
      });
      onLinked(game);
      onImageChange(game.image);
      setEditing(false);
      setResults(null);
      toast.success(`${label} link updated`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : `Could not update the ${label} link.`,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="source-link-card">
      <CardHeader className="source-link-card-heading">
        <CardTitle>{label}</CardTitle>
        <CardDescription>
          {current ? "Linked record" : "No linked record"}
        </CardDescription>
        <CardAction>
          <Badge variant={current ? "secondary" : "outline"}>
            {current ? "Linked" : "Missing"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {current ? (
          <div className="source-current">
            <strong>{current.title}</strong>
            <code>{current.id}</code>
            {current.url && (
              <a href={current.url} target="_blank" rel="noreferrer">
                Open source <ExternalLink size={13} />
              </a>
            )}
          </div>
        ) : (
          <p className="helper">
            No {label} record is linked to this game yet.
          </p>
        )}
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            {current ? "Find another record" : "Find a record"}
          </Button>
        ) : (
          <div className="source-search">
            <InputGroup className="source-search-controls">
              <InputGroupInput
                aria-label={`Search ${label}`}
                placeholder={`Search ${label}…`}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <InputGroupAddon align="inline-end">
                <Button
                  size="sm"
                  disabled={busy || searchTerm.trim().length < 2}
                  onClick={() => void search()}
                >
                  <Search data-icon="inline-start" />{" "}
                  {busy ? "Searching…" : "Search"}
                </Button>
              </InputGroupAddon>
            </InputGroup>
            {error && (
              <Alert variant="destructive" className="error-alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {results && (
              <div className="source-results">
                {results.candidates.map((candidate) => {
                  const sourceId =
                    provider === "bgg"
                      ? candidate.bggId
                      : candidate.ludopediaId;
                  return (
                    <Button
                      key={candidate.id}
                      variant="ghost"
                      className="source-result"
                      disabled={busy}
                      onClick={() => void select(candidate)}
                    >
                      <GameCover
                        image={candidate.image}
                        title={candidate.title}
                      />
                      <span>
                        <strong>{candidate.title}</strong>
                        <small>
                          {label} {sourceId ?? "ID unavailable"}
                        </small>
                      </span>
                      <span className="source-result-action">
                        Use this record
                      </span>
                    </Button>
                  );
                })}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(false);
                setResults(null);
                setError("");
              }}
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
function IdentityValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <code>{value}</code>
    </div>
  );
}
