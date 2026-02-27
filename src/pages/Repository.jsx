import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
import { Tag, Link as LinkIcon, Book } from "lucide-react";
import RepoHeader from "../components/repo/RepoHeader";
import RepoTabs from "../components/repo/RepoTabs";
import FileExplorer from "../components/repo/FileExplorer";
import FileViewer from "../components/repo/FileViewer";
import ReadmePreview from "../components/repo/ReadmePreview";
import CommitHistory from "../components/repo/CommitHistory";
import RepoIssues from "../components/repo/RepoIssues";
import RepoPulls from "../components/repo/RepoPulls";
import RepoActions from "../components/repo/RepoActions";
import RepoProjects from "../components/repo/RepoProjects";
import RepoSecurity from "../components/repo/RepoSecurity";
import RepoInsights from "../components/repo/RepoInsights";
import RepoSettings from "../components/repo/RepoSettings";
import Button from "../components/common/Button";
import Avatar from "../components/common/Avatar";
import { useRepositories } from "../context/RepositoryContext";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const API_URL = `${BACKEND_URL}/api`;

const Repository = () => {
  const { username, repo: repoName, branch, "*": wildCardPath } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { repositories, getRepoFiles, currentUser } = useRepositories();
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const uploadInputRef = useRef(null);
  
  // Find repo or default
  const requestedFullName = `${username}/${repoName}`;
  const repo = repositories.find(r => r.full_name === requestedFullName) 
    || repositories.find(r => r.name === repoName && r.owner?.login === username)
    || repositories[0];

  const displayRepo = { 
    ...repo, 
    owner: { ...repo.owner, login: username || repo.owner.login }, 
    name: repoName || repo.name, 
    full_name: `${username || repo.owner.login}/${repoName || repo.name}`,
    topics: repo?.topics || []
  };
  
  const files = getRepoFiles(displayRepo.full_name);

  // Determine current view mode (tree/blob/root)
  const isBlob = location.pathname.includes("/blob/");
  const isCommits = location.pathname.includes("/commits/");
  const isIssues = location.pathname.endsWith("/issues");
  const isPulls = location.pathname.endsWith("/pulls");
  const isActions = location.pathname.endsWith("/actions");
  const isProjects = location.pathname.endsWith("/projects");
  const isSecurity = location.pathname.endsWith("/security");
  const isInsights = location.pathname.endsWith("/insights");
  const isSettings = location.pathname.endsWith("/settings");
  const currentPath = wildCardPath || "";
  const activeBranch = branch || displayRepo.default_branch || "main";
  
  useEffect(() => {
    const [owner, repoShort] = String(displayRepo.full_name || "").split("/");
    if (!owner || !repoShort) return;

    fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoShort)}/branches`, { credentials: "include" })
      .then(r => r.json().then(j => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.error || "Failed to load branches");
        setBranches(Array.isArray(j.branches) ? j.branches : []);
      })
      .catch(() => setBranches([]));
  }, [displayRepo.full_name]);

  const filteredBranches = useMemo(() => {
    const q = branchFilter.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter(b => String(b).toLowerCase().includes(q));
  }, [branches, branchFilter]);

  const switchBranch = (nextBranch) => {
    const b = String(nextBranch || "").trim();
    if (!b) return;
    if (isCommits) return navigate(`/${displayRepo.full_name}/commits/${b}`);
    if (isBlob) return navigate(`/${displayRepo.full_name}/blob/${b}/${currentPath}`);
    if (location.pathname.includes("/tree/")) return navigate(`/${displayRepo.full_name}/tree/${b}/${currentPath}`);
    return navigate(`/${displayRepo.full_name}/tree/${b}`);
  };

  const cloneUrl = displayRepo.source_clone_url || `https://github.com/${displayRepo.full_name}.git`;

  const copyCloneUrl = async () => {
    try {
      await navigator.clipboard.writeText(cloneUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
    }
  };

  const downloadZip = () => {
    const [owner, repoShort] = String(displayRepo.full_name || "").split("/");
    if (!owner || !repoShort) return;
    window.open(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoShort)}/archive.zip`, "_blank", "noopener,noreferrer");
  };

  const uploadFile = async (file) => {
    const [owner, repoShort] = String(displayRepo.full_name || "").split("/");
    if (!owner || !repoShort) return;
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const content = await file.text();
      const path = file.name;

      const createRes = await fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoShort)}/file`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content })
      });
      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok && createRes.status !== 409) throw new Error(createData.error || "Upload failed");

      if (createRes.status === 409) {
        const updateRes = await fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoShort)}/file`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path, content })
        });
        const updateData = await updateRes.json().catch(() => ({}));
        if (!updateRes.ok) throw new Error(updateData.error || "Upload failed");
      }

      const commitRes = await fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoShort)}/commit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Upload ${path}`, authorLogin: currentUser?.login || "" })
      });
      const commitData = await commitRes.json().catch(() => ({}));
      if (!commitRes.ok) throw new Error(commitData.error || "Commit failed");

      navigate(`/${displayRepo.full_name}/blob/${activeBranch}/${path}`);
    } catch (e) {
      setUploadError(e.message || "Upload failed");
    } finally {
      setUploading(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  };

  // Find specific file content if in blob mode
  const findFileByPath = (nodes, targetPath) => {
    if (!Array.isArray(nodes)) return null;
    for (const node of nodes) {
      if (node.type === "file" && node.path === targetPath) return node;
      if (node.type === "folder" && Array.isArray(node.children)) {
        const found = findFileByPath(node.children, targetPath);
        if (found) return found;
      }
    }
    return null;
  };

  const currentFile = isBlob 
      ? findFileByPath(files, currentPath) 
      : null;

  return (
    <div className="bg-github-light-bg dark:bg-github-dark-bg min-h-screen">
      <RepoHeader repo={displayRepo} />
      <RepoTabs repoFullName={displayRepo.full_name} branch={activeBranch} />
      
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-6 flex flex-col md:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
             <input
               ref={uploadInputRef}
               type="file"
               className="hidden"
               onChange={(e) => uploadFile(e.target.files && e.target.files[0])}
             />
             {uploadError ? (
               <div className="mb-4 text-sm text-red-700 dark:text-red-300">{uploadError}</div>
             ) : null}
             <div className="flex justify-between items-center mb-4">
                 <div className="flex items-center gap-2">
                     <div className="relative group">
                        <Button size="sm" className="font-semibold text-xs bg-github-light-bg-secondary dark:bg-github-dark-bg-secondary border-github-light-border dark:border-github-dark-border">
                            {activeBranch}
                            <span className="ml-1">▼</span>
                        </Button>
                        <div className="hidden group-hover:block absolute left-0 top-full mt-1 w-64 bg-white dark:bg-github-dark-bg-secondary border border-github-light-border dark:border-github-dark-border rounded-md shadow-lg z-50">
                            <div className="p-2 border-b border-github-light-border dark:border-github-dark-border font-bold text-xs text-github-light-text dark:text-github-dark-text">Switch branches/tags</div>
                            <div className="p-2">
                                <input value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} type="text" placeholder="Find a branch..." className="w-full text-xs p-1 border border-github-light-border dark:border-github-dark-border rounded bg-github-light-bg dark:bg-github-dark-bg text-github-light-text dark:text-github-dark-text" />
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                                {filteredBranches.map((b) => (
                                  <button
                                    key={b}
                                    onClick={() => switchBranch(b)}
                                    className={`w-full text-left px-4 py-2 text-xs hover:bg-github-light-accent hover:text-white ${b === activeBranch ? "font-bold" : ""}`}
                                  >
                                    {b}
                                  </button>
                                ))}
                                {filteredBranches.length === 0 ? (
                                  <div className="px-4 py-2 text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary">
                                    No branches
                                  </div>
                                ) : null}
                            </div>
                        </div>
                     </div>
                     
                     <div className="flex items-center gap-2 text-sm text-github-light-text dark:text-github-dark-text ml-2">
                         <span className="font-bold">{Math.max(1, branches.length)}</span> branch
                         <span className="font-bold">0</span> tags
                     </div>
                 </div>
                 <div className="flex items-center gap-2">
                     <div className="relative group">
                        <Button variant="secondary" size="sm" className="text-xs">
                            Add file ▼
                        </Button>
                        <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-48 bg-white dark:bg-github-dark-bg-secondary border border-github-light-border dark:border-github-dark-border rounded-md shadow-lg z-50 py-1">
                            <Link to={`/${username}/${repoName}/new/${activeBranch}`} className="block px-4 py-2 text-xs text-github-light-text dark:text-github-dark-text hover:bg-github-light-accent hover:text-white">
                                Create new file
                            </Link>
                            <button
                              onClick={() => uploadInputRef.current?.click()}
                              disabled={uploading}
                              className="w-full text-left px-4 py-2 text-xs text-github-light-text dark:text-github-dark-text hover:bg-github-light-accent hover:text-white disabled:opacity-50"
                            >
                                {uploading ? "Uploading..." : "Upload files"}
                            </button>
                        </div>
                     </div>
                     
                     <div className="relative group">
                        <Button variant="primary" size="sm" className="font-bold text-xs">
                            Code ▼
                        </Button>
                        <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-80 bg-white dark:bg-github-dark-bg-secondary border border-github-light-border dark:border-github-dark-border rounded-md shadow-lg z-50 p-4">
                            <div className="flex items-center gap-2 mb-3 border-b border-github-light-border dark:border-github-dark-border pb-2">
                                <span className="font-bold text-sm text-github-light-text dark:text-github-dark-text">Clone</span>
                            </div>
                            <div className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary mb-2">HTTPS</div>
                            <div className="flex mb-4">
                                <input readOnly value={cloneUrl} className="flex-1 text-xs p-1 border border-github-light-border dark:border-github-dark-border rounded-l bg-github-light-bg dark:bg-github-dark-bg text-github-light-text dark:text-github-dark-text" />
                                <button onClick={copyCloneUrl} className="bg-github-light-bg-secondary dark:bg-github-dark-bg-secondary border border-l-0 border-github-light-border dark:border-github-dark-border rounded-r px-2 hover:bg-gray-200 dark:hover:bg-gray-700">
                                    <span className="text-xs">{copied ? "✓" : "📋"}</span>
                                </button>
                            </div>
                            <div className="text-xs text-github-light-text dark:text-github-dark-text">
                                <button onClick={downloadZip} className="hover:underline text-github-light-accent">Download ZIP</button>
                            </div>
                        </div>
                     </div>
                 </div>
             </div>
             
             {isCommits ? (
                <CommitHistory repoFullName={displayRepo.full_name} branch={activeBranch} />
             ) : isIssues ? (
                <RepoIssues repoFullName={displayRepo.full_name} />
             ) : isPulls ? (
                <RepoPulls repoFullName={displayRepo.full_name} defaultBranch={activeBranch} />
             ) : isActions ? (
                <RepoActions repoFullName={displayRepo.full_name} />
             ) : isProjects ? (
                <RepoProjects repoFullName={displayRepo.full_name} />
             ) : isSecurity ? (
                <RepoSecurity repoFullName={displayRepo.full_name} />
             ) : isInsights ? (
                <RepoInsights repoFullName={displayRepo.full_name} branch={activeBranch} />
             ) : isSettings ? (
                <RepoSettings repo={displayRepo} />
             ) : files.length > 0 ? (
                 <>
                    {isBlob ? (
                        <FileViewer file={currentFile} repoFullName={displayRepo.full_name} branch={activeBranch} />
                    ) : (
                        <>
                            <FileExplorer 
                                files={files} 
                                currentPath={currentPath} 
                                repoFullName={displayRepo.full_name} 
                                branch={activeBranch}
                            />
                            {!currentPath && <ReadmePreview files={files} repoFullName={displayRepo.full_name} branch={activeBranch} />}
                        </>
                    )}
                 </>
             ) : (
                 <div className="border border-github-light-border dark:border-github-dark-border rounded-md p-8 text-center bg-white dark:bg-github-dark-bg">
                     <h3 className="text-xl font-bold text-github-light-text dark:text-github-dark-text mb-2">
                         {displayRepo.name} is empty.
                     </h3>
                     <p className="text-github-light-text-secondary dark:text-github-dark-text-secondary mb-6">
                         Get started by creating a new file or uploading an existing file.
                     </p>
                     <div className="flex justify-center gap-4">
                        <Link to={`/${username}/${repoName}/new/${activeBranch}`}>
                            <Button variant="primary">Create a new file</Button>
                        </Link>
                        <Button onClick={() => uploadInputRef.current?.click()} disabled={uploading}>
                          {uploading ? "Uploading..." : "Upload an existing file"}
                        </Button>
                     </div>
                 </div>
             )}
          </div>
          
          {/* Sidebar */}
          <aside className="w-full md:w-80 space-y-6">
              <div>
                  <h3 className="text-sm font-semibold text-github-light-text dark:text-github-dark-text mb-2">About</h3>
                  <p className="text-sm text-github-light-text dark:text-github-dark-text mb-4">
                      {displayRepo.description || "No description provided."}
                  </p>
                  {displayRepo.homepage && (
                    <div className="flex items-center gap-2 text-sm text-github-light-text dark:text-github-dark-text mb-4 font-semibold">
                        <LinkIcon size={16} className="text-github-light-text-secondary dark:text-github-dark-text-secondary" />
                        <a href={displayRepo.homepage} className="hover:text-github-light-accent dark:hover:text-github-dark-accent hover:underline">{displayRepo.homepage}</a>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mb-4">
                      {displayRepo.topics.map(topic => (
                          <span key={topic} className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 cursor-pointer">
                              {topic}
                          </span>
                      ))}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary mb-2">
                       <Book size={16} /> Readme
                  </div>
                  <div className="flex items-center gap-2 text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary mb-2">
                       <span className="text-yellow-400">⚖️</span> {displayRepo.license?.name || "No License"}
                  </div>
              </div>
              
              <div className="border-t border-github-light-border dark:border-github-dark-border pt-4">
                   <h3 className="text-sm font-semibold text-github-light-text dark:text-github-dark-text mb-2">Releases</h3>
                   <div className="text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">
                       <p>No releases published</p>
                   </div>
              </div>

              <div className="border-t border-github-light-border dark:border-github-dark-border pt-4">
                  <h3 className="text-sm font-semibold text-github-light-text dark:text-github-dark-text mb-2">Contributors <span className="bg-github-light-bg-secondary dark:bg-github-dark-bg-secondary px-1.5 py-0.5 rounded-full text-xs border border-github-light-border dark:border-github-dark-border">1</span></h3>
                  <div className="flex flex-wrap gap-2">
                      <Avatar src={displayRepo.owner.avatar_url} size="sm" className="w-8 h-8 rounded-full" />
                  </div>
              </div>
              
               <div className="border-t border-github-light-border dark:border-github-dark-border pt-4">
                  <h3 className="text-sm font-semibold text-github-light-text dark:text-github-dark-text mb-2">Languages</h3>
                  <div className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary">
                      No languages detected
                  </div>
              </div>
          </aside>
      </div>
    </div>
  );
};

export default Repository;
