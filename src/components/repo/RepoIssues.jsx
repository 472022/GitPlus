import { useEffect, useState } from "react";
import Button from "../common/Button";
import Input from "../common/Input";
import { useRepositories } from "../../context/RepositoryContext";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const API_URL = `${BACKEND_URL}/api`;

const RepoIssues = ({ repoFullName }) => {
  const { currentUser } = useRepositories();
  const [issues, setIssues] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [owner, repo] = String(repoFullName || "").split("/");

  const loadIssues = async () => {
    if (!owner || !repo) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load issues");
      setIssues(Array.isArray(data.issues) ? data.issues : []);
    } catch (e) {
      setError(e.message || "Failed to load issues");
      setIssues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, [repoFullName]);

  const createIssue = async () => {
    if (!title.trim()) return;
    if (!owner || !repo) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body,
          author: currentUser?.login || ""
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create issue");
      setTitle("");
      setBody("");
      setIssues((prev) => [data.issue, ...prev]);
    } catch (e) {
      setError(e.message || "Failed to create issue");
    } finally {
      setSubmitting(false);
    }
  };

  const setIssueState = async (number, state) => {
    if (!owner || !repo) return;
    setError("");
    try {
      const res = await fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${encodeURIComponent(number)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, actor: currentUser?.login || "" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update issue");
      setIssues((prev) => prev.map((i) => (i.number === number ? data.issue : i)));
    } catch (e) {
      setError(e.message || "Failed to update issue");
    }
  };

  return (
    <div className="border border-github-light-border dark:border-github-dark-border rounded-md bg-white dark:bg-github-dark-bg overflow-hidden">
      <div className="p-4 border-b border-github-light-border dark:border-github-dark-border flex flex-col gap-3">
        <div className="text-sm font-semibold text-github-light-text dark:text-github-dark-text">Issues</div>
        {error ? <div className="text-sm text-red-700 dark:text-red-300">{error}</div> : null}
        <div className="flex flex-col gap-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Issue title" />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Describe the issue..."
            className="w-full h-24 p-2 text-sm border border-github-light-border dark:border-github-dark-border rounded-md bg-white dark:bg-github-dark-bg text-github-light-text dark:text-github-dark-text focus:ring-2 focus:ring-github-light-accent dark:focus:ring-github-dark-accent focus:outline-none resize-none"
          />
          <div>
            <Button variant="primary" size="sm" onClick={createIssue} disabled={submitting || !title.trim()}>
              {submitting ? "Creating..." : "New issue"}
            </Button>
          </div>
        </div>
      </div>

      <div className="divide-y divide-github-light-border dark:divide-github-dark-border">
        {loading ? (
          <div className="p-4 text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">Loading issues...</div>
        ) : issues.length === 0 ? (
          <div className="p-4 text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">No issues found.</div>
        ) : (
          issues.map((issue) => (
            <div key={issue.number} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-github-light-text dark:text-github-dark-text truncate">
                  #{issue.number} {issue.title}
                </div>
                <div className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary truncate">
                  {issue.state} • {issue.author || "unknown"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {issue.state === "open" ? (
                  <Button size="sm" variant="secondary" onClick={() => setIssueState(issue.number, "closed")}>
                    Close
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => setIssueState(issue.number, "open")}>
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

export default RepoIssues;
