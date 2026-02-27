import { Copy, Trash, Edit, Monitor, Play, Check } from "lucide-react";
import Button from "../common/Button";
import { useState, useEffect } from "react";
import { useRepositories } from "../../context/RepositoryContext";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const API_URL = `${BACKEND_URL}/api`;

const FileViewer = ({ file, repoFullName, branch = "main" }) => {
  const { updateFile, fetchRepoFileContent, saveRepoFileContent } = useRepositories();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentError, setContentError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!file) return;
    if (isTyping) return;

    const hasInlineContent = typeof file.content === "string";
    if (hasInlineContent) {
      setContent(file.content);
      setContentError("");
      return;
    }

    let cancelled = false;
    setLoadingContent(true);
    setContentError("");
    fetchRepoFileContent(repoFullName, file.path)
      .then((text) => {
        if (cancelled) return;
        setContent(text);
      })
      .catch((e) => {
        if (cancelled) return;
        setContentError(e.message || "Failed to load file");
        setContent("");
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingContent(false);
      });

    return () => {
      cancelled = true;
    };
  }, [file, isTyping]);

  if (!file) return null;

  const isHtml = file.name.endsWith('.html') || file.name.endsWith('.htm');
  const isServerBacked = typeof file.content !== "string";

  const handleGoLive = () => {
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleRaw = () => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${file.name}?`)) return;
    const [owner, repo] = String(repoFullName || "").split("/");
    if (!owner || !repo) return;
    try {
      const res = await fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/file?path=${encodeURIComponent(file.path)}`, {
        method: "DELETE",
        credentials: "include"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Delete failed");
      navigate(`/${repoFullName}/tree/${branch}`);
    } catch (e) {
      setContentError(e.message || "Delete failed");
    }
  };

  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    setIsTyping(true);
    
    // Debounce save
    const timeoutId = setTimeout(() => {
      if (isServerBacked) {
        saveRepoFileContent(repoFullName, file.path, newContent).catch(() => {});
      } else {
        updateFile(repoFullName, file.path, newContent);
      }
      setIsTyping(false);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const toggleEdit = () => {
    setIsEditing(!isEditing);
    // Reset content to latest file content when cancelling edit
    if (isEditing) {
       if (typeof file.content === "string") {
         setContent(file.content);
       }
       setIsTyping(false);
    }
  };

  return (
    <div className="border border-github-light-border dark:border-github-dark-border rounded-md overflow-hidden bg-white dark:bg-github-dark-bg mb-6">
      <div className="bg-github-light-bg-secondary dark:bg-github-dark-bg-secondary p-3 border-b border-github-light-border dark:border-github-dark-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-github-light-text dark:text-github-dark-text">
             <span className="font-mono">{content.split('\n').length} lines</span>
             <span className="w-px h-3 bg-github-light-border dark:bg-github-dark-border"></span>
             <span>{file.size || "1.2 KB"}</span>
          </div>
          
          <div className="flex items-center gap-2">
              {isHtml && (
                <Button 
                    variant="primary" 
                    size="sm" 
                    className="mr-2 flex items-center gap-1"
                    onClick={handleGoLive}
                >
                    <Play size={14} /> Go Live
                </Button>
              )}

              <div className="flex rounded-md shadow-sm">
                  <Button variant="secondary" size="sm" className="rounded-r-none border-r-0 px-3" onClick={handleRaw}>
                      <Monitor size={14} className="mr-1"/> Raw
                  </Button>
                  <Button variant="secondary" size="sm" className="rounded-none border-r-0 px-3" onClick={handleCopy}>
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                  </Button>
                   <Button 
                      variant={isEditing ? "primary" : "secondary"} 
                      size="sm" 
                      className="rounded-l-none px-3"
                      onClick={toggleEdit}
                  >
                      {isEditing ? <Check size={14} /> : <Edit size={14} />}
                  </Button>
              </div>
              <Button variant="secondary" size="sm" onClick={handleDelete}>
                  <Trash size={14} />
              </Button>
          </div>
      </div>
      
      <div className="overflow-x-auto p-0 relative">
          {contentError ? (
            <div className="p-4 text-sm text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-300 border-b border-github-light-border dark:border-github-dark-border">
              {contentError}
            </div>
          ) : null}
          {isEditing ? (
             <textarea 
                value={content}
                onChange={handleContentChange}
                className="w-full h-[500px] p-4 font-mono text-sm bg-white dark:bg-github-dark-bg text-github-light-text dark:text-github-dark-text resize-none focus:outline-none"
                spellCheck={false}
             />
          ) : (
            <table className="w-full text-left border-collapse font-mono text-sm">
                <tbody>
                    {(loadingContent ? ["Loading..."] : content.split('\n')).map((line, i) => (
                        <tr key={i}>
                            <td className="w-10 text-right pr-3 select-none text-github-light-text-secondary dark:text-github-dark-text-secondary border-r border-github-light-border dark:border-github-dark-border bg-white dark:bg-github-dark-bg py-0.5">
                                {i + 1}
                            </td>
                            <td className="pl-4 py-0.5 whitespace-pre text-github-light-text dark:text-github-dark-text bg-white dark:bg-github-dark-bg">
                                {line}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          )}
      </div>
    </div>
  );
};

export default FileViewer;
