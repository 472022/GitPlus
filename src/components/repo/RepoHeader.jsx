import { Link } from "react-router-dom";
import { Star, GitFork, Eye, ChevronDown, Upload, Download, GitCommit, ExternalLink } from "lucide-react";
import Button from "../common/Button";
import Badge from "../common/Badge";
import Avatar from "../common/Avatar";
import { useRepositories } from "../../context/RepositoryContext";
import { useToast } from "../../context/ToastContext";
import { useCallback, useEffect, useMemo, useState } from "react";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const API_URL = `${BACKEND_URL}/api`;

const RepoHeader = ({ repo }) => {
  const { toggleStar, toggleWatch, forkRepository, currentUser } = useRepositories();
  const { pushToast } = useToast();
  const [loadingAction, setLoadingAction] = useState(null);
  const [gitStatus, setGitStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const getSourceFullName = () => {
    const direct = repo?.source_full_name || repo?.imported_from;
    if (direct && typeof direct === "string" && direct.includes("/")) return direct;

    const html = repo?.source_html_url || repo?.html_url;
    if (typeof html === "string") {
      try {
        const url = new URL(html);
        if (url.hostname === "github.com" || url.hostname === "www.github.com") {
          const parts = url.pathname.split("/").filter(Boolean);
          if (parts.length >= 2) return `${parts[0]}/${parts[1].replace(/\.git$/i, "")}`;
        }
      } catch {
      }
    }

    if (typeof repo?.full_name === "string" && repo.full_name.includes("/")) return repo.full_name;
    return "";
  };

  const openInEditor = () => {
    const fullName = getSourceFullName();
    if (!fullName) return;
    const editorUrl = `https://vscode.dev/github.com/${fullName}`;
    window.open(editorUrl, "_blank", "noopener,noreferrer");
  };

  const [owner, repoName] = String(repo?.full_name || "").split("/");

  const fetchStatus = useCallback(async () => {
    if (!owner || !repoName) return;
    setLoadingStatus(true);
    try {
      const res = await fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/status`, {
        credentials: "include"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load status");
      setGitStatus({
        branch: String(data.branch || "HEAD"),
        dirty: !!data.dirty,
        changes: Array.isArray(data.changes) ? data.changes : []
      });
    } catch {
      setGitStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  }, [owner, repoName]);

  useEffect(() => {
    fetchStatus();
    if (!owner || !repoName) return;
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetchStatus();
    }, 4000);
    return () => clearInterval(id);
  }, [owner, repoName, fetchStatus]);

  const runRepoAction = async (action, path, body) => {
    if (!owner || !repoName) return;
    setLoadingAction(action);
    try {
      const res = await fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `${action} failed`);
      pushToast({ variant: "success", message: data.message || `${action} completed` });
      fetchStatus();
      return { ok: true, data };
    } catch (e) {
      pushToast({ variant: "error", message: e.message || `${action} failed` });
      return { ok: false, error: e.message || `${action} failed` };
    } finally {
      setLoadingAction(null);
    }
  };

  const commitChanges = async () => {
    if (gitStatus && !gitStatus.dirty) {
      pushToast({ variant: "info", message: "No changes to commit" });
      return;
    }
    const message = window.prompt("Commit message", "Update files");
    if (!message) return;
    await runRepoAction("Commit", "/commit", { message: String(message).trim(), authorLogin: currentUser?.login || "" });
  };

  const pullChanges = async () => {
    await runRepoAction("Pull", "/pull");
  };

  const pushChanges = async () => {
    await runRepoAction("Push", "/push");
  };

  const statusLabel = useMemo(() => {
    if (loadingStatus) return "Checking…";
    if (!gitStatus) return "";
    const count = gitStatus.changes.length;
    if (!gitStatus.dirty) return `${gitStatus.branch} • Clean`;
    return `${gitStatus.branch} • ${count} change${count === 1 ? "" : "s"}`;
  }, [gitStatus, loadingStatus]);

  const downloadZip = () => {
    if (!owner || !repoName) return;
    const url = `${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/archive.zip`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="bg-github-light-bg-secondary dark:bg-github-dark-bg border-b border-github-light-border dark:border-github-dark-border pt-4 pb-0 mb-6">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
           <Avatar src={repo.owner.avatar_url} size="sm" className="rounded-md" />
           <div className="flex items-center gap-1 text-lg md:text-xl text-github-light-text dark:text-github-dark-text">
               <Link to={`/${repo.owner.login}`} className="hover:underline text-github-light-accent dark:text-github-dark-accent">{repo.owner.login}</Link>
               <span className="text-github-light-text-secondary dark:text-github-dark-text-secondary">/</span>
               <Link to={`/${repo.full_name}`} className="font-bold hover:underline text-github-light-accent dark:text-github-dark-accent">{repo.name}</Link>
           </div>
           <Badge variant="public" className="ml-2">Public</Badge>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
             {/* Git Actions Group */}
            <div className="flex items-center gap-2">
                 <Button
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={openInEditor}
                    disabled={!getSourceFullName()}
                 >
                    <ExternalLink size={16} />
                    Open in editor
                 </Button>
                 <Button
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={downloadZip}
                 >
                    <Download size={16} />
                    ZIP
                 </Button>
                 <Button 
                    variant="primary" 
                    size="sm" 
                    className="flex items-center gap-1"
                    onClick={commitChanges}
                    disabled={!!loadingAction || (gitStatus ? !gitStatus.dirty : false)}
                 >
                    <GitCommit size={16} /> 
                    {loadingAction === 'Commit' ? 'Committing...' : 'Commit'}
                 </Button>
                 <Button 
                    variant="secondary" 
                    size="sm" 
                    className="flex items-center gap-1"
                    onClick={pushChanges}
                    disabled={!!loadingAction}
                 >
                    <Upload size={16} /> 
                    {loadingAction === 'Push' ? 'Pushing...' : 'Push'}
                 </Button>
                 <Button 
                    variant="secondary" 
                    size="sm" 
                    className="flex items-center gap-1"
                    onClick={pullChanges}
                    disabled={!!loadingAction}
                 >
                    <Download size={16} /> 
                    {loadingAction === 'Pull' ? 'Pulling...' : 'Pull'}
                 </Button>
            </div>

            {statusLabel ? (
              <div className="flex items-center text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary">
                {statusLabel}
              </div>
            ) : null}

            <div className="flex items-center gap-2">
               <div className="flex rounded-md shadow-sm">
                   <Button 
                     variant="secondary" 
                     size="sm" 
                     className="rounded-r-none border-r-0 px-3"
                     onClick={() => toggleWatch(repo.id)}
                   >
                       <Eye size={16} className={`mr-1 ${repo.watched_by_user ? "fill-blue-500 text-blue-500" : "text-github-light-text-secondary dark:text-github-dark-text-secondary"}`}/> 
                       {repo.watched_by_user ? "Unwatch" : "Watch"}
                   </Button>
                   <Button variant="secondary" size="sm" className="rounded-l-none px-2 text-xs font-semibold">
                       {repo.watchers_count} <ChevronDown size={12} className="ml-1"/>
                   </Button>
               </div>
    
               <div className="flex rounded-md shadow-sm">
                   <Button 
                     variant="secondary" 
                     size="sm" 
                     className="rounded-r-none border-r-0 px-3"
                     onClick={() => forkRepository(repo.id)}
                   >
                       <GitFork size={16} className="mr-1 text-github-light-text-secondary dark:text-github-dark-text-secondary"/> Fork
                   </Button>
                   <Button variant="secondary" size="sm" className="rounded-l-none px-2 text-xs font-semibold">
                       {repo.forks_count} <ChevronDown size={12} className="ml-1"/>
                   </Button>
               </div>
    
               <div className="flex rounded-md shadow-sm">
                   <Button 
                     variant="secondary" 
                     size="sm" 
                     className="rounded-r-none border-r-0 px-3"
                     onClick={() => toggleStar(repo.id)}
                   >
                       <Star size={16} className={`mr-1 ${repo.starred_by_user ? "fill-yellow-400 text-yellow-400" : "text-github-light-text-secondary dark:text-github-dark-text-secondary"}`}/> 
                       {repo.starred_by_user ? "Unstar" : "Star"}
                   </Button>
                   <Button variant="secondary" size="sm" className="rounded-l-none px-2 text-xs font-semibold">
                       {repo.stargazers_count} <ChevronDown size={12} className="ml-1"/>
                   </Button>
               </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default RepoHeader;
