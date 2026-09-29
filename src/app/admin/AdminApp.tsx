"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, LogOut } from "lucide-react";
import type { ProjectRecord, SiteData } from "@/types/site-data";
import { getSession, loadData, saveData, signIn, signOut } from "./api";
import { ProjectEditor, ProjectList, newProject } from "./ProjectsPanel";
import { ContactPanel, HomePanel, StudioPanel } from "./SettingsPanels";
import { Button } from "./ui";
import PreviewPane, { PreviewProvider, usePreview } from "./Preview";

type Tab = "projects" | "studio" | "contact" | "home";
const TABS: { id: Tab; label: string }[] = [
  { id: "projects", label: "Projects" },
  { id: "studio", label: "Studio" },
  { id: "contact", label: "Contact" },
  { id: "home", label: "Home page" },
];

const sortByOrder = (projects: ProjectRecord[]) => [...projects].sort((a, b) => a.order - b.order);

/**
 * /admin. Edits happen in the browser; "Save" writes everything at once and
 * the live site shows it on the next page visit.
 */
export default function AdminApp() {
  const [status, setStatus] = useState<"checking" | "signin" | "loading" | "ready" | "error">(
    "checking",
  );
  const [error, setError] = useState("");

  const [data, setData] = useState<SiteData | null>(null);
  const [savedJson, setSavedJson] = useState("");
  const [baseUpdatedAt, setBaseUpdatedAt] = useState("");
  const [newSlugs, setNewSlugs] = useState<Set<string>>(new Set());

  const [tab, setTab] = useState<Tab>("projects");
  const preview = usePreview();
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const loaded = await loadData();
      loaded.projects = sortByOrder(loaded.projects);
      setData(loaded);
      setSavedJson(JSON.stringify(loaded));
      setBaseUpdatedAt(loaded.updatedAt);
      setNewSlugs(new Set());
      setStatus("ready");
    } catch (e) {
      if ((e as { status?: number }).status === 401) setStatus("signin");
      else {
        setError((e as Error).message);
        setStatus("error");
      }
    }
  }, []);

  useEffect(() => {
    getSession()
      .then((s) => (s.signedIn ? load() : setStatus("signin")))
      .catch(() => setStatus("signin"));
  }, [load]);

  const dirty = data !== null && JSON.stringify(data) !== savedJson;

  // Leaving with unsaved edits asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = useCallback((change: (d: SiteData) => SiteData) => {
    setData((d) => (d ? change(d) : d));
    setNotice(null);
  }, []);

  const save = async () => {
    if (!data) return;
    setSaving(true);
    setNotice(null);
    try {
      const saved = await saveData(data, baseUpdatedAt);
      saved.projects = sortByOrder(saved.projects);
      setData(saved);
      setSavedJson(JSON.stringify(saved));
      setBaseUpdatedAt(saved.updatedAt);
      setNewSlugs(new Set());
      setNotice({
        kind: "ok",
        text: "Saved. The live site shows your changes now - refresh it to see them.",
      });
    } catch (e) {
      if ((e as { status?: number }).status === 401) setStatus("signin");
      setNotice({ kind: "error", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const takenSlugs = useMemo(() => new Set(data?.projects.map((p) => p.slug) ?? []), [data]);

  if (status === "checking" || status === "loading") {
    return <Centered>Loading…</Centered>;
  }
  if (status === "signin") {
    return <SignIn onSignedIn={load} />;
  }
  if (status === "error" || !data) {
    return (
      <Centered>
        <p className="text-red-700">{error || "Something went wrong."}</p>
        <div className="mt-4">
          <Button onClick={load}>Try again</Button>
        </div>
      </Centered>
    );
  }

  const project = editing ? data.projects.find((p) => p.slug === editing) : undefined;
  // Studio, contact and home text is shown beside a live preview of the site.
  const withPreview = tab !== "projects";
  const width = withPreview ? "max-w-[1500px]" : "max-w-5xl";

  const updateProject = (slug: string, patch: Partial<ProjectRecord>) => {
    update((d) => ({
      ...d,
      projects: d.projects.map((p) =>
        p.slug === slug ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p,
      ),
    }));
    if (patch.slug && patch.slug !== slug) {
      setEditing(patch.slug);
      setNewSlugs((s) => new Set([...s].filter((x) => x !== slug)).add(patch.slug!));
    }
  };

  return (
    <div className="min-h-svh bg-slate-50 font-sans text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className={`mx-auto flex ${width} flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3`}>
          <strong className="mr-auto text-sm font-semibold">{data.brand.name} · Admin</strong>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            View site <ExternalLink className="size-4" />
          </a>
          <button
            type="button"
            onClick={async () => {
              if (dirty && !confirm("You have unsaved changes. Sign out anyway?")) return;
              await signOut();
              setStatus("signin");
            }}
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <LogOut className="size-4" /> Sign out
          </button>
          <Button variant="primary" onClick={save} disabled={!dirty || saving}>
            {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </Button>
        </div>
        <nav className={`mx-auto flex ${width} gap-1 overflow-x-auto px-4`}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setEditing(null);
                preview.setPage(
                  t.id === "contact" ? "/contact/" : t.id === "studio" ? "/studio/" : "/",
                );
              }}
              className={`border-b-2 px-3 py-2.5 text-sm font-semibold whitespace-nowrap ${tab === t.id ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <PreviewProvider focus={preview.focus}>
        <main className={`mx-auto ${width} px-4 py-6 pb-24`}>
          <div
            className={
              withPreview
                ? "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-6"
                : ""
            }
          >
            <div className="min-w-0 space-y-5">
              {dirty && !notice && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  You have unsaved changes. Click <strong>Save changes</strong> (top right) when you
                  are done - all of them go live together.
                </p>
              )}
              {notice && (
                <p
                  className={`rounded-lg border px-4 py-3 text-sm whitespace-pre-line ${notice.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-800"}`}
                >
                  {notice.text}
                </p>
              )}

              {tab === "projects" &&
                (project ? (
                  <ProjectEditor
                    project={project}
                    isNew={newSlugs.has(project.slug)}
                    takenSlugs={takenSlugs}
                    onChange={(patch) => updateProject(project.slug, patch)}
                    onAddImage={(image) => {
                      const slug = project.slug;
                      update((d) => ({
                        ...d,
                        projects: d.projects.map((p) =>
                          p.slug === slug ? { ...p, images: [...p.images, image] } : p,
                        ),
                      }));
                    }}
                    onBack={() => setEditing(null)}
                    onRemove={() => {
                      update((d) => ({
                        ...d,
                        projects: d.projects.filter((p) => p.slug !== project.slug),
                      }));
                      setEditing(null);
                    }}
                  />
                ) : (
                  <ProjectList
                    projects={data.projects}
                    onEdit={setEditing}
                    onAdd={() => {
                      const order = Math.max(0, ...data.projects.map((p) => p.order)) + 1;
                      const created = newProject(takenSlugs, order);
                      update((d) => ({ ...d, projects: [...d.projects, created] }));
                      setNewSlugs((s) => new Set(s).add(created.slug));
                      setEditing(created.slug);
                    }}
                    onReorder={(list) =>
                      update((d) => ({
                        ...d,
                        projects: list.map((p, i) => ({ ...p, order: i + 1 })),
                      }))
                    }
                    onRemove={(slug) =>
                      update((d) => ({ ...d, projects: d.projects.filter((p) => p.slug !== slug) }))
                    }
                  />
                ))}
              {tab === "studio" && <StudioPanel data={data} update={update} />}
              {tab === "contact" && <ContactPanel data={data} update={update} />}
              {tab === "home" && <HomePanel data={data} update={update} />}
            </div>
            {withPreview && (
              <PreviewPane
                data={data}
                page={preview.page}
                setPage={preview.setPage}
                request={preview.request}
              />
            )}
          </div>
        </main>
      </PreviewProvider>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh place-items-center bg-slate-50 p-6 text-center font-sans text-slate-700">
      <div>{children}</div>
    </div>
  );
}

function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <Centered>
      <form
        className="w-[min(22rem,calc(100vw-3rem))] rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await signIn(password);
            onSignedIn();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1 className="text-lg font-semibold text-slate-900">Admin sign in</h1>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-[15px] outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        <div className="mt-4 [&>button]:w-full">
          <Button type="submit" variant="primary" disabled={busy || !password}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </div>
      </form>
    </Centered>
  );
}
