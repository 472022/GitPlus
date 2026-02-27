import { useEffect, useState } from "react";
import Button from "../common/Button";
import Input from "../common/Input";
import { useRepositories } from "../../context/RepositoryContext";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const API_URL = `${BACKEND_URL}/api`;

const RepoSecurity = ({ repoFullName }) => {
  const { currentUser } = useRepositories();
  const [alerts, setAlerts] = useState([]);
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [owner, repo] = String(repoFullName || "").split("/");

  const loadAlerts = async () => {
    if (!owner || !repo) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/security`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load alerts");
      setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
    } catch (e) {
      setError(e.message || "Failed to load alerts");
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [repoFullName]);

  const createAlert = async () => {
    if (!title.trim()) return;
    if (!owner || !repo) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/security`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          severity,
          actor: currentUser?.login || ""
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create alert");
      setAlerts((prev) => [data.alert, ...prev]);
      setTitle("");
    } catch (e) {
      setError(e.message || "Failed to create alert");
    } finally {
      setSubmitting(false);
    }
  };

  const resolveAlert = async (id) => {
    if (!owner || !repo) return;
    setError("");
    try {
      const res = await fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/security/${encodeURIComponent(id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: "resolved", actor: currentUser?.login || "" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resolve alert");
      setAlerts((prev) => prev.map((a) => (a.id === id ? data.alert : a)));
    } catch (e) {
      setError(e.message || "Failed to resolve alert");
    }
  };

  return (
    <div className="border border-github-light-border dark:border-github-dark-border rounded-md bg-white dark:bg-github-dark-bg overflow-hidden">
      <div className="p-4 border-b border-github-light-border dark:border-github-dark-border flex flex-col gap-3">
        <div className="text-sm font-semibold text-github-light-text dark:text-github-dark-text">Security</div>
        {error ? <div className="text-sm text-red-700 dark:text-red-300">{error}</div> : null}
        <div className="flex flex-col md:flex-row gap-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New alert title" />
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="text-sm p-2 border border-github-light-border dark:border-github-dark-border rounded-md bg-white dark:bg-github-dark-bg text-github-light-text dark:text-github-dark-text"
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>
          <Button variant="primary" size="sm" onClick={createAlert} disabled={submitting || !title.trim()}>
            {submitting ? "Creating..." : "Create alert"}
          </Button>
        </div>
      </div>

      <div className="divide-y divide-github-light-border dark:divide-github-dark-border">
        {loading ? (
          <div className="p-4 text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="p-4 text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">No alerts found.</div>
        ) : (
          alerts.map((a) => (
            <div key={a.id} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-github-light-text dark:text-github-dark-text truncate">
                  {a.title}
                </div>
                <div className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary truncate">
                  {a.severity} • {a.state || "open"}
                </div>
              </div>
              <div>
                {a.state !== "closed" ? (
                  <Button size="sm" variant="secondary" onClick={() => resolveAlert(a.id)}>
                    Resolve
                  </Button>
                ) : (
                  <span className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary">Resolved</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RepoSecurity;
