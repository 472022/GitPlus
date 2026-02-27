import { useEffect, useMemo, useState } from "react";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const API_URL = `${BACKEND_URL}/api`;

const RepoInsights = ({ repoFullName, branch }) => {
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [owner, repo] = String(repoFullName || "").split("/");

  useEffect(() => {
    if (!owner || !repo) return;
    setLoading(true);
    setError("");
    fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?ref=${encodeURIComponent(branch || "HEAD")}&limit=500`, { credentials: "include" })
      .then(r => r.json().then(j => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.error || "Failed to load commits");
        setCommits(Array.isArray(j.commits) ? j.commits : []);
      })
      .catch((e) => {
        setError(e.message || "Failed to load insights");
        setCommits([]);
      })
      .finally(() => setLoading(false));
  }, [repoFullName, branch]);

  const stats = useMemo(() => {
    const byAuthor = new Map();
    const byDay = new Map();
    for (const c of commits) {
      const author = c.authorName || "Unknown";
      byAuthor.set(author, (byAuthor.get(author) || 0) + 1);
      const day = c.dateIso ? String(c.dateIso).slice(0, 10) : "";
      if (day) byDay.set(day, (byDay.get(day) || 0) + 1);
    }
    const topAuthors = Array.from(byAuthor.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const recentDays = Array.from(byDay.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14);
    return { topAuthors, recentDays };
  }, [commits]);

  return (
    <div className="space-y-6">
      <div className="border border-github-light-border dark:border-github-dark-border rounded-md bg-white dark:bg-github-dark-bg overflow-hidden">
        <div className="p-4 border-b border-github-light-border dark:border-github-dark-border">
          <div className="text-sm font-semibold text-github-light-text dark:text-github-dark-text">Insights</div>
          <div className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary">Based on local git history</div>
        </div>

        {error ? <div className="p-4 text-sm text-red-700 dark:text-red-300">{error}</div> : null}
        {loading ? (
          <div className="p-4 text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">Loading insights...</div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-semibold text-github-light-text dark:text-github-dark-text mb-2">Top authors</div>
              {stats.topAuthors.length === 0 ? (
                <div className="text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">No commits.</div>
              ) : (
                <div className="space-y-2">
                  {stats.topAuthors.map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between text-sm">
                      <span className="truncate text-github-light-text dark:text-github-dark-text">{name}</span>
                      <span className="text-github-light-text-secondary dark:text-github-dark-text-secondary">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-sm font-semibold text-github-light-text dark:text-github-dark-text mb-2">Recent days</div>
              {stats.recentDays.length === 0 ? (
                <div className="text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">No data.</div>
              ) : (
                <div className="space-y-2">
                  {stats.recentDays.map(([day, count]) => (
                    <div key={day} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-github-light-text dark:text-github-dark-text">{day}</span>
                      <span className="text-github-light-text-secondary dark:text-github-dark-text-secondary">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RepoInsights;
