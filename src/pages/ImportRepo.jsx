import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import { useRepositories } from "../context/RepositoryContext";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const API_URL = `${BACKEND_URL}/api`;

const ImportRepo = () => {
  const [url, setUrl] = useState("");
  const [pat, setPat] = useState("");
  const [connected, setConnected] = useState(false);
  const [repos, setRepos] = useState([]);
  const [repoFilter, setRepoFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [error, setError] = useState("");
  const { currentUser } = useRepositories();
  const navigate = useNavigate();

  const refreshStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/github/status`, { credentials: "include" });
      const data = await res.json();
      setConnected(!!data.connected);
    } catch {
      setConnected(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const savePat = async () => {
    setError("");
    if (!pat.trim()) {
      setError("Personal access token is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/github/oauth/pat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: pat.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save token");
      }
      await refreshStatus();
    } catch (e) {
      setError(e.message || "Failed to save token");
    } finally {
      setLoading(false);
    }
  };

  const connectGitHub = () => {
    window.location.href = `${API_URL}/github/oauth/start`;
  };

  const loadGitHubRepos = async () => {
    setError("");
    setLoadingRepos(true);
    try {
      const res = await fetch(`${API_URL}/github/repos`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load repositories");
      }
      setRepos(data.repos || []);
    } catch (e) {
      setError(e.message || "Failed to load repositories");
      setRepos([]);
    } finally {
      setLoadingRepos(false);
    }
  };

  const importByFullName = async (fullName) => {
    if (!currentUser) {
      setError("You must be logged in to import repositories.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/github/import`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          gitplusLogin: currentUser.login
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Import failed");
      }
      navigate(`/${currentUser.login}/${data.repo.name}`);
    } catch (e) {
      setError(e.message || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const importByUrl = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    try {
      let normalizedUrl = url.trim();
      if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`;
      const parsed = new URL(normalizedUrl);
      const host = parsed.hostname.toLowerCase();
      if (host !== "github.com" && host !== "www.github.com") {
        throw new Error("Invalid GitHub URL. Host must be github.com");
      }
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts.length < 2) {
        throw new Error("Invalid GitHub URL. Format should be: https://github.com/owner/repo");
      }
      const owner = parts[0];
      const repoName = parts[1].replace(/\.git$/i, "");
      await importByFullName(`${owner}/${repoName}`);
    } catch (e) {
      setError(e.message || "Invalid URL");
    }
  };

  const filteredRepos = useMemo(() => {
    const q = repoFilter.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter(r => (r.full_name || "").toLowerCase().includes(q));
  }, [repoFilter, repos]);

  return (
    <div className="min-h-screen bg-github-light-bg-secondary dark:bg-github-dark-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-light text-github-light-text dark:text-github-dark-text mb-2">Import your repository</h1>
            <p className="text-github-light-text-secondary dark:text-github-dark-text-secondary">
                Import repositories from GitHub to GitPlus.
            </p>
        </div>

        <div className="bg-white dark:bg-github-dark-bg-secondary p-8 rounded-md border border-github-light-border dark:border-github-dark-border shadow-sm">
            <div className="space-y-6">
                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-start gap-3">
                        <AlertCircle className="text-red-600 dark:text-red-400 mt-0.5" size={18} />
                        <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                    </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-github-light-text dark:text-github-dark-text">GitHub connection</div>
                    <div className={`text-xs ${connected ? "text-green-600 dark:text-green-400" : "text-github-light-text-secondary dark:text-github-dark-text-secondary"}`}>
                      {connected ? "Connected" : "Not connected"}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="secondary" className="flex-1" onClick={connectGitHub} disabled={loading}>
                      Connect GitHub (OAuth)
                    </Button>
                    <Button variant="secondary" className="flex-1" onClick={loadGitHubRepos} disabled={loading || loadingRepos || !connected}>
                      {loadingRepos ? "Loading..." : "Load my repos"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      type="password"
                      placeholder="Personal Access Token (optional)"
                      value={pat}
                      onChange={(e) => setPat(e.target.value)}
                      className="sm:col-span-2"
                    />
                    <Button variant="primary" onClick={savePat} disabled={loading}>
                      Use token
                    </Button>
                  </div>
                </div>

                <div className="border-t border-github-light-border dark:border-github-dark-border pt-6 space-y-3">
                  <div className="text-sm font-semibold text-github-light-text dark:text-github-dark-text">Import from your GitHub list</div>
                  <Input
                    type="text"
                    placeholder="Filter repositories..."
                    value={repoFilter}
                    onChange={(e) => setRepoFilter(e.target.value)}
                  />
                  <div className="max-h-72 overflow-auto border border-github-light-border dark:border-github-dark-border rounded-md">
                    {filteredRepos.length === 0 ? (
                      <div className="p-4 text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">
                        No repositories loaded.
                      </div>
                    ) : (
                      <ul className="divide-y divide-github-light-border dark:divide-github-dark-border">
                        {filteredRepos.map((r) => (
                          <li key={r.id} className="p-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-github-light-text dark:text-github-dark-text truncate">{r.full_name}</div>
                              {r.description ? (
                                <div className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary truncate">{r.description}</div>
                              ) : null}
                            </div>
                            <Button variant="primary" size="sm" disabled={loading} onClick={() => importByFullName(r.full_name)}>
                              {loading ? "Importing..." : "Import"}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-github-light-text dark:text-github-dark-text mb-2">
                        Import by GitHub URL
                    </label>
                    <form onSubmit={importByUrl} className="flex flex-col sm:flex-row gap-2">
                      <Input 
                        type="text" 
                        placeholder="https://github.com/owner/repo"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="font-mono"
                        required
                      />
                      <Button type="submit" variant="primary" disabled={loading}>
                        {loading ? (
                          <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Importing...</span>
                        ) : (
                          "Import"
                        )}
                      </Button>
                    </form>
                </div>
            </div>
        </div>
        
        <div className="mt-6 text-center text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">
            <Link to="/new" className="text-github-light-accent dark:text-github-dark-accent hover:underline">
                Cancel
            </Link>
        </div>
      </div>
    </div>
  );
};

export default ImportRepo;
