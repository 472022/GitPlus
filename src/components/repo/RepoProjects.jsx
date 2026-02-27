import { useEffect, useState } from "react";
import Button from "../common/Button";
import Input from "../common/Input";
import { useRepositories } from "../../context/RepositoryContext";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const API_URL = `${BACKEND_URL}/api`;

const RepoProjects = ({ repoFullName }) => {
  const { currentUser } = useRepositories();
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState("");
  const [cardTitle, setCardTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [owner, repo] = String(repoFullName || "").split("/");

  const loadProjects = async () => {
    if (!owner || !repo) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/projects`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load projects");
      setProjects(Array.isArray(data.projects) ? data.projects : []);
    } catch (e) {
      setError(e.message || "Failed to load projects");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [repoFullName]);

  const createProject = async () => {
    if (!name.trim()) return;
    if (!owner || !repo) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/projects`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), actor: currentUser?.login || "" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create project");
      setProjects((prev) => [data.project, ...prev]);
      setName("");
    } catch (e) {
      setError(e.message || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  const updateProject = async (project) => {
    if (!owner || !repo) return;
    setError("");
    try {
      const res = await fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/projects/${encodeURIComponent(project.id)}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: project.name, columns: project.columns, actor: currentUser?.login || "" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update project");
      setProjects((prev) => prev.map((p) => (p.id === project.id ? data.project : p)));
    } catch (e) {
      setError(e.message || "Failed to update project");
    }
  };

  const addCardToFirstProject = async () => {
    if (!cardTitle.trim()) return;
    const project = projects[0];
    if (!project) return;
    const columns = Array.isArray(project.columns) ? project.columns.map(c => ({ ...c })) : [];
    if (columns.length === 0) return;
    const first = columns[0];
    const nextCardId = Math.max(0, ...(first.cards || []).map(c => c.id || 0)) + 1;
    first.cards = Array.isArray(first.cards) ? [{ id: nextCardId, title: cardTitle.trim() }, ...first.cards] : [{ id: nextCardId, title: cardTitle.trim() }];
    const updated = { ...project, columns };
    setCardTitle("");
    await updateProject(updated);
  };

  return (
    <div className="border border-github-light-border dark:border-github-dark-border rounded-md bg-white dark:bg-github-dark-bg overflow-hidden">
      <div className="p-4 border-b border-github-light-border dark:border-github-dark-border flex flex-col gap-3">
        <div className="text-sm font-semibold text-github-light-text dark:text-github-dark-text">Projects</div>
        {error ? <div className="text-sm text-red-700 dark:text-red-300">{error}</div> : null}
        <div className="flex flex-col sm:flex-row gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New project name" />
          <Button variant="primary" size="sm" onClick={createProject} disabled={submitting || !name.trim()}>
            {submitting ? "Creating..." : "Create project"}
          </Button>
        </div>
        {projects.length > 0 ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <Input value={cardTitle} onChange={(e) => setCardTitle(e.target.value)} placeholder="Add card to first project (Todo)" />
            <Button variant="secondary" size="sm" onClick={addCardToFirstProject} disabled={!cardTitle.trim()}>
              Add card
            </Button>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="p-4 text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="p-4 text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">No projects created.</div>
      ) : (
        <div className="p-4 space-y-4">
          {projects.map((p) => (
            <div key={p.id} className="border border-github-light-border dark:border-github-dark-border rounded-md overflow-hidden">
              <div className="p-3 bg-github-light-bg-secondary dark:bg-github-dark-bg-secondary text-sm font-semibold text-github-light-text dark:text-github-dark-text">
                {p.name}
              </div>
              <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                {(p.columns || []).map((c) => (
                  <div key={c.id} className="border border-github-light-border dark:border-github-dark-border rounded-md p-2">
                    <div className="text-xs font-semibold text-github-light-text dark:text-github-dark-text mb-2">{c.name}</div>
                    <div className="space-y-2">
                      {(c.cards || []).map((card) => (
                        <div key={card.id} className="text-xs p-2 rounded-md bg-github-light-bg-secondary dark:bg-github-dark-bg-secondary text-github-light-text dark:text-github-dark-text">
                          {card.title}
                        </div>
                      ))}
                      {(c.cards || []).length === 0 ? (
                        <div className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary">No cards</div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RepoProjects;
