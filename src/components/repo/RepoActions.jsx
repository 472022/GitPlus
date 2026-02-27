import { useEffect, useState } from "react";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const API_URL = `${BACKEND_URL}/api`;

const RepoActions = ({ repoFullName }) => {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [owner, repo] = String(repoFullName || "").split("/");

  useEffect(() => {
    if (!owner || !repo) return;
    setLoading(true);
    setError("");
    fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions`, { credentials: "include" })
      .then(r => r.json().then(j => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.error || "Failed to load actions");
        setActions(Array.isArray(j.actions) ? j.actions : []);
      })
      .catch((e) => {
        setError(e.message || "Failed to load actions");
        setActions([]);
      })
      .finally(() => setLoading(false));
  }, [repoFullName]);

  return (
    <div className="border border-github-light-border dark:border-github-dark-border rounded-md bg-white dark:bg-github-dark-bg overflow-hidden">
      <div className="p-4 border-b border-github-light-border dark:border-github-dark-border">
        <div className="text-sm font-semibold text-github-light-text dark:text-github-dark-text">Actions</div>
      </div>

      {error ? (
        <div className="p-4 text-sm text-red-700 dark:text-red-300">{error}</div>
      ) : null}

      {loading ? (
        <div className="p-4 text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">Loading actions...</div>
      ) : actions.length === 0 ? (
        <div className="p-4 text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">No actions recorded yet.</div>
      ) : (
        <div className="divide-y divide-github-light-border dark:divide-github-dark-border">
          {actions.map((a) => (
            <div key={a.id} className="p-4">
              <div className="text-sm text-github-light-text dark:text-github-dark-text">{a.message || a.type}</div>
              <div className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary">
                {a.actor || "system"} • {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RepoActions;
