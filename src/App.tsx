import { Component, useEffect, useState, type ReactNode } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { makeFunctionReference } from "convex/server";
import type { GenericId } from "convex/values";
import {
  BookOpen,
  ChevronRight,
  Dices,
  FilePlus2,
  Layers3,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { validateTemplate, type Template } from "@/domain/scoring";
import { officialTemplateSeeds } from "@/domain/template-seeds";

type Row = {
  key: string;
  gameKey: string;
  gameTitle: string;
  builtIn: boolean;
  data: Template;
};
type GameOption = { key: string; title: string; data: Template | null };
const gameSearch = makeFunctionReference<
  "query",
  { search: string },
  GameOption[]
>("template_admin:games");
const library = makeFunctionReference<"query", { gameKey: string }, Row[]>(
  "template_admin:library",
);
const saveTemplate = makeFunctionReference<
  "mutation",
  {
    gameKey: string;
    data: Template;
  },
  GenericId<"officialTemplates">
>("template_admin:save");
const permission = makeFunctionReference<
  "query",
  Record<string, never>,
  boolean
>("scoring_templates:canPublishOfficial");
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
const demo: Row[] = officialTemplateSeeds.map(({ game, data }) => ({
  key: data.id,
  gameKey: game.id,
  gameTitle: game.title,
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
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
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
  const [gameKey, setGameKey] = useState("");
  const rows = useQuery(library, { gameKey });
  const save = useMutation(saveTemplate);
  if (rows === undefined)
    return (
      <div className="gate" role="status">
        Loading official templates…
      </div>
    );
  return (
    <Workspace
      rows={rows}
      onGameKey={setGameKey}
      onSignOut={onSignOut}
      onSave={async (key, data) => {
        const id = await save({ gameKey: key, data });
        setGameKey("");
        return id;
      }}
    />
  );
}
function Workspace({
  rows,
  onSave,
  onGameKey,
  onSignOut,
}: {
  rows: Row[] | undefined;
  onSave?: (key: string, data: Template) => Promise<string>;
  onGameKey?: (key: string) => void;
  onSignOut?: () => void;
}) {
  const [selected, setSelected] = useState<Row | null>(
    rows?.find((r) => r.gameKey === "everdell") ?? rows?.[0] ?? null,
  );
  const [draft, setDraft] = useState<Template>(() =>
    selected ? structuredClone(selected.data) : fresh(),
  );
  const [gameKey, setGameKey] = useState(selected?.gameKey ?? "");
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [saving, setSaving] = useState(false);
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
      setDirty(false);
      setJsonDirty(false);
      setError("");
    });
  const create = () => navigate(() => setPickerOpen(true));
  const selectGame = (game: GameOption) => {
    const data = game.data ?? { ...fresh(), title: game.title };
    setSelected(
      game.data
        ? {
            key: data.id,
            gameKey: game.key,
            gameTitle: game.title,
            builtIn: false,
            data,
          }
        : null,
    );
    setDraft(structuredClone(data));
    setGameKey(game.key);
    setDirty(!game.data);
    setJsonDirty(false);
    setError("");
    setPickerOpen(false);
  };
  const items = (rows ?? []).filter((r) =>
    `${r.gameTitle} ${r.data.title} ${r.data.edition}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  async function save() {
    setError("");
    try {
      validateTemplate(draft);
      if (!gameKey.trim()) throw new Error("Choose a game before saving.");
      if (!onSave)
        throw new Error("Preview mode. Connect Convex and sign in to save.");
      setSaving(true);
      const id = await onSave(gameKey.trim(), draft);
      setDirty(false);
      toast.success("Official template saved");
      const data = {
        ...draft,
        id,
        version: 1,
      };
      setDraft(data);
      setSelected({
        key: id,
        gameKey: gameKey.trim(),
        gameTitle: selected?.gameTitle ?? draft.title,
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
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="wordmark" href="/">
          <span className="brand-icon">
            <Dices size={22} />
          </span>
          meeple<span className="studio">studio</span>
        </a>
        <div className="workspace-label">Workspace</div>
        <div className="nav-active">
          <Layers3 size={18} /> Scoring templates{" "}
          <Badge variant="secondary">{rows?.length ?? "…"}</Badge>
        </div>
        <div className="sidebar-note">
          <BookOpen size={18} />
          <strong>Good rules, great games.</strong>
          <p>
            Build score sheets that make the last turn as good as the first.
          </p>
        </div>
        <div className="sidebar-bottom">
          <span className={onSave ? "status-dot" : "status-dot preview"} />
          {onSave ? "Convex connected" : "Local preview"}
          {onSignOut && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={onSignOut}
            >
              <LogOut size={16} />
            </Button>
          )}
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>
            Workspace <ChevronRight size={14} /> Templates
          </span>
          <Badge variant="outline">
            <ShieldCheck size={13} /> Administrator
          </Badge>
        </header>
        <div className="page-heading">
          <div>
            <div className="eyebrow">The finishing touches</div>
            <h1>Scoring templates</h1>
            <p>One official sheet per game. Three defaults for every table.</p>
          </div>
          <Button onClick={create}>
            <Plus size={16} /> New template
          </Button>
        </div>
        {!onSave && (
          <div className="preview-banner">
            You’re exploring the template editor. Add VITE_CONVEX_URL to connect
            your Meeple backend and save.
          </div>
        )}
        <div className="workbench">
          <section className="library">
            <div className="library-top">
              <h2>Library</h2>
              <span>{items.length} templates</span>
            </div>
            <div className="search">
              <Search size={16} />
              <Input
                aria-label="Search templates"
                placeholder="Find a template…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="game-filter">
              <Button variant="outline" size="sm" onClick={create}>
                Choose a game
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onGameKey?.("")}>
                Show all
              </Button>
            </div>
            <div className="template-list">
              {rows === undefined ? (
                <p role="status" className="empty">
                  Loading templates…
                </p>
              ) : !items.length ? (
                <div className="empty">
                  <Search />
                  <h3>No templates found</h3>
                  <p>Try another search or add a template.</p>
                  <Button variant="outline" onClick={create}>
                    New template
                  </Button>
                </div>
              ) : (
                items.map((row, i) => (
                  <button
                    key={row.key}
                    className={`template-row ${selected?.key === row.key ? "selected" : ""}`}
                    onClick={() => choose(row)}
                  >
                    <span className={`tile tile-${i % 4}`}>
                      <Dices size={21} />
                    </span>
                    <span className="row-text">
                      <strong>{row.data.title}</strong>
                      <small>
                        {row.data.fields.length} categories ·{" "}
                        {row.data.minPlayers}–{row.data.maxPlayers} players
                      </small>
                      <span className="row-edition">{row.data.edition}</span>
                    </span>
                    <ChevronRight size={14} />
                  </button>
                ))
              )}
            </div>
            <div className="library-footer">
              <span className="status-dot" />
              {onSave
                ? "Changes sync in real time"
                : "Built-in template preview"}
            </div>
          </section>
          <section className="editor">
            <div className="editor-top">
              <div>
                <Badge variant="secondary">
                  {selected ? "Official template" : "New official template"}
                </Badge>
                <h2>{draft.title || "Untitled template"}</h2>
              </div>
            </div>
            <Tabs
              defaultValue="details"
              onValueChange={(value) => {
                if (value === "advanced" && !jsonDirty)
                  setJson(JSON.stringify(draft, null, 2));
              }}
            >
              <TabsList className="editor-tabs">
                <TabsTrigger value="details">Details & scoring</TabsTrigger>
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
                <Field label="Template name">
                  <Input
                    maxLength={80}
                    value={draft.title}
                    onChange={(e) => change({ title: e.target.value })}
                  />
                </Field>
                <div className="two-col">
                  <Field label="Edition">
                    <Input
                      maxLength={200}
                      value={draft.edition}
                      onChange={(e) => change({ edition: e.target.value })}
                    />
                  </Field>
                  <Field label="Game">
                    <Input
                      value={selected?.gameTitle ?? draft.title}
                      readOnly
                    />
                    <span className="helper">
                      {gameKey || "Choose a game to link this template"}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(() => setPickerOpen(true))}
                    >
                      Choose game
                    </Button>
                  </Field>
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
                    onChange={(e) => change({ endCondition: e.target.value })}
                  />
                </Field>
                <div className="switch-row">
                  <div>
                    <strong>Lowest score wins</strong>
                    <p>Leave off for highest-score games.</p>
                  </div>
                  <Switch
                    checked={draft.lowestWins ?? false}
                    onCheckedChange={(v) => change({ lowestWins: v })}
                  />
                </div>
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
                    <Plus size={14} /> Add
                  </Button>
                </div>
                {draft.fields.map((field, index) => (
                  <div className="category" key={field.id}>
                    <div className="category-title">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <Input
                        aria-label={`Category ${index + 1} label`}
                        maxLength={80}
                        value={field.label}
                        onChange={(e) =>
                          change({
                            fields: draft.fields.map((f, i) =>
                              i === index ? { ...f, label: e.target.value } : f,
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
                            fields: draft.fields.filter((_, i) => i !== index),
                            tieBreakers: draft.tieBreakers.filter(
                              (id) => id !== field.id,
                            ),
                          })
                        }
                      >
                        <Trash2 size={15} />
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
                      <label>
                        <Switch
                          checked={field.total}
                          onCheckedChange={(total) =>
                            change({
                              fields: draft.fields.map((f, i) =>
                                i === index ? { ...f, total } : f,
                              ),
                              tieBreakers: total
                                ? draft.tieBreakers.filter(
                                    (id) => id !== field.id,
                                  )
                                : draft.tieBreakers,
                            })
                          }
                        />{" "}
                        In total
                      </label>
                    </div>
                  </div>
                ))}
                <Field label="Tie-breakers, in priority order">
                  <Input
                    placeholder="Category IDs separated by commas"
                    key={selected?.key ?? "new"}
                    defaultValue={draft.tieBreakers.join(", ")}
                    onBlur={(e) =>
                      change({
                        tieBreakers: e.target.value
                          .split(",")
                          .map((v) => v.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </Field>
                <p className="helper">
                  Available non-total IDs:{" "}
                  {draft.fields
                    .filter((f) => !f.total)
                    .map((f) => f.id)
                    .join(", ") || "none"}
                </p>
              </TabsContent>
              <TabsContent value="advanced" className="form-body">
                <p className="helper">
                  Edit the full Meeple template, including roles, expansions,
                  and outcome rules. Apply before saveing. Saveing is disabled
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
                      setError(e instanceof Error ? e.message : "Invalid JSON");
                    }
                  }}
                >
                  Apply JSON
                </Button>
              </TabsContent>
            </Tabs>
            <div className="save-bar">
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <div>
                <span className={dirty ? "status-dot amber" : "status-dot"} />
                {dirty ? "Unsaved changes" : "No unsaveed changes"}
                <Button
                  disabled={saving || jsonDirty}
                  onClick={() => void save()}
                >
                  <Save size={15} />
                  {saving ? "Saveing…" : "Save official template"}
                </Button>
              </div>
              <small>
                One official template per game. Saving replaces its current
                rules.
              </small>
            </div>
          </section>
          <aside className="preview-panel">
            <div className="preview-label">
              Live preview <span />
            </div>
            <Card className="score-sheet">
              <CardContent>
                <div className="preview-emblem">
                  <Dices size={30} />
                </div>
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
              Each game has one official template. Select a game to create or
              edit its sheet.
            </DialogDescription>
          </DialogHeader>
          {onSave ? (
            <LiveGamePicker onSelect={selectGame} />
          ) : (
            <GamePicker
              games={demo.map((row) => ({
                key: row.gameKey,
                title: row.gameTitle,
                data: row.data,
              }))}
              onSelect={selectGame}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              Your current edits haven’t been saveed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Keep editing
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                pending?.();
                setPending(null);
              }}
            >
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Label className="field">
      <span>{label}</span>
      {children}
    </Label>
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
          <p role="status">Loading games…</p>
        ) : !filtered.length ? (
          <p>No catalog games found. Import a game in Meeple first.</p>
        ) : (
          filtered.map((game) => (
            <Button
              key={game.key}
              variant="ghost"
              onClick={() => onSelect(game)}
            >
              <span>{game.title}</span>
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
