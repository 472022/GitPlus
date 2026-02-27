import { useEffect, useMemo, useState } from "react";
import Button from "../common/Button";
import Input from "../common/Input";
import { useRepositories } from "../../context/RepositoryContext";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const API_URL = `${BACKEND_URL}/api`;

const RepoPulls = ({ repoFullName, defaultBranch }) => {
  const { currentUser } = useRepositories();
  const [pulls, setPulls] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [head, setHead] = useState("");
  const [base, setBase] = useState(defaultBranch || "main");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [owner, repo] = String(repoFullName || "").split("/");

  useEffect(() => {
    setBase(defaultBranch || "main");
  }, [defaultBranch]);

  const loadPulls = async () => {
    if (!owner || !repo) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load pull requests");
      setPulls(Array.isArray(data.pulls) ? data.pulls : []);
    } catch (e) {
      setError(e.message || "Failed to load pull requests");
      setPulls([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPulls();
  }, [repoFullName]);

  const createPull = async () => {
    if (!title.trim()) return;
    if (!head.trim()) return;
    if (!base.trim()) return;
    if (!owner || !repo) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body,
          head: head.trim(),
          base: base.trim(),
          author: currentUser?.login || ""
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create pull request");
      setTitle("");
      setBody("");
      setHead("");
      setPulls((prev) => [data.pull, ...prev]);
    } catch (e) {
      setError(e.message || "Failed to create pull request");
    } finally {
      setSubmitting(false);
    }
  };

  const updatePull = async (number, payload) => {
    if (!owner || !repo) return;
    setError("");
    try {
      const res = await fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${encodeURIComponent(number)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, actor: currentUser?.login || "" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update pull request");
      setPulls((prev) => prev.map((p) => (p.number === number ? data.pull : p)));
    } catch (e) {
      setError(e.message || "Failed to update pull request");
    }
  };

  const openPulls = useMemo(() => pulls.filter(p => p.state === "open"), [pulls]);

  return (
    <div className="border border-github-light-border dark:border-github-dark-border rounded-md bg-white dark:bg-github-dark-bg overflow-hidden">
      <div className="p-4 border-b border-github-light-border dark:border-github-dark-border flex flex-col gap-3">
        <div className="text-sm font-semibold text-github-light-text dark:text-github-dark-text">Pull requests</div>
        {error ? <div className="text-sm text-red-700 dark:text-red-300">{error}</div> : null}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pull request title" />
          <Input value={head} onChange={(e) => setHead(e.target.value)} placeholder="Head branch (e.g. feature-x)" />
          <Input value={base} onChange={(e) => setBase(e.target.value)} placeholder="Base branch" />
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Describe the changes..."
          className="w-full h-24 p-2 text-sm border border-github-light-border dark:border-github-dark-border rounded-md bg-white dark:bg-github-dark-bg text-github-light-text dark:text-github-dark-text focus:ring-2 focus:ring-github-light-accent dark:focus:ring-github-dark-accent focus:outline-none resize-none"
        />
        <div>
          <Button variant="primary" size="sm" onClick={createPull} disabled={submitting || !title.trim() || !head.trim() || !base.trim()}>
            {submitting ? "Creating..." : "New pull request"}
          </Button>
        </div>
      </div>

      <div className="divide-y divide-github-light-border dark:divide-github-dark-border">
        {loading ? (
          <div className="p-4 text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">Loading pull requests...</div>
        ) : pulls.length === 0 ? (
          <div className="p-4 text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">No pull requests found.</div>
        ) : (
          openPulls.concat(pulls.filter(p => p.state !== "open")).map((pr) => (
            <div key={pr.number} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-github-light-text dark:text-github-dark-text truncate">
                  #{pr.number} {pr.title}
                </div>
                <div className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary truncate">
                  {pr.state}{pr.merged ? " (merged)" : ""} • {pr.head} → {pr.base} • {pr.author || "unknown"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pr.state === "open" ? (
                  <>
                    <Button size="sm" variant="primary" onClick={() => updatePull(pr.number, { merged: true, state: "closed" })}>
                      Merge
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => updatePull(pr.number, { state: "closed" })}>
                      Close
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => updatePull(pr.number, { state: "open", merged: false })}>
                    Reopen
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RepoPulls;
