import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useRepositories } from "../context/RepositoryContext";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import Avatar from "../components/common/Avatar";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const API_URL = `${BACKEND_URL}/api`;

const CreateFile = () => {
  const { username, repo: repoName, branch } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useRepositories();
  
  const [fileName, setFileName] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("Create new file");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fileName) return;

    const fullRepoName = `${username}/${repoName}`;
    const [owner, repoShort] = String(fullRepoName || "").split("/");
    if (!owner || !repoShort) return;
    if (!currentUser?.login) return;

    setLoading(true);
    setError("");
    try {
      const createRes = await fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoShort)}/file`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: fileName,
          content
        })
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Failed to create file");

      const commitRes = await fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoShort)}/commit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message || "Create new file",
          authorLogin: currentUser.login
        })
      });
      const commitData = await commitRes.json();
      if (!commitRes.ok) throw new Error(commitData.error || "Failed to commit changes");

      navigate(`/${username}/${repoName}/blob/${branch || "main"}/${fileName}`);
    } catch (e) {
      setError(e.message || "Failed to create file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-6">
       <div className="mb-4">
           <h1 className="text-xl font-semibold text-github-light-text dark:text-github-dark-text">
               <Link to={`/${username}/${repoName}`} className="text-github-light-accent dark:text-github-dark-accent hover:underline">
                   {username}/{repoName}
               </Link>
               <span className="mx-2 text-github-light-text-secondary dark:text-github-dark-text-secondary">/</span>
               <span>Create new file</span>
           </h1>
       </div>

       <form onSubmit={handleSubmit} className="border border-github-light-border dark:border-github-dark-border rounded-md bg-white dark:bg-github-dark-bg">
           <div className="p-4 border-b border-github-light-border dark:border-github-dark-border flex items-center gap-2">
               <span className="text-sm font-medium text-github-light-text dark:text-github-dark-text">{repoName}</span>
               <span className="text-github-light-text-secondary dark:text-github-dark-text-secondary">/</span>
               <Input 
                 placeholder="Name your file..." 
                 className="w-64"
                 value={fileName}
                 onChange={(e) => setFileName(e.target.value)}
                 autoFocus
               />
           </div>

           <div className="p-4 bg-github-light-bg-secondary dark:bg-github-dark-bg-secondary border-b border-github-light-border dark:border-github-dark-border">
               <div className="text-sm font-medium text-github-light-text dark:text-github-dark-text mb-2">Edit</div>
           </div>

           <div className="p-4">
               <textarea 
                  className="w-full h-[400px] font-mono text-sm p-2 border border-github-light-border dark:border-github-dark-border rounded-md bg-white dark:bg-github-dark-bg-secondary text-github-light-text dark:text-github-dark-text focus:ring-2 focus:ring-github-light-accent dark:focus:ring-github-dark-accent focus:outline-none resize-none"
                  placeholder="Enter file contents here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
               ></textarea>
           </div>

           <div className="p-4 border-t border-github-light-border dark:border-github-dark-border bg-github-light-bg-secondary dark:bg-github-dark-bg-secondary">
               <h2 className="text-lg font-semibold text-github-light-text dark:text-github-dark-text mb-4">Commit changes</h2>
               <div className="max-w-2xl space-y-4">
                   {error ? (
                     <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
                   ) : null}
                   <div className="flex gap-4">
                       <Avatar src={currentUser.avatar_url} size="md" />
                       <div className="flex-1 space-y-3">
                           <Input 
                             value={message}
                             onChange={(e) => setMessage(e.target.value)}
                             placeholder="Commit message"
                           />
                           <textarea 
                             className="w-full h-24 p-2 text-sm border border-github-light-border dark:border-github-dark-border rounded-md bg-white dark:bg-github-dark-bg text-github-light-text dark:text-github-dark-text focus:ring-2 focus:ring-github-light-accent dark:focus:ring-github-dark-accent focus:outline-none resize-none"
                             placeholder="Add an optional extended description..."
                             value={description}
                             onChange={(e) => setDescription(e.target.value)}
                           ></textarea>
                           
                           <div className="space-y-2">
                               <label className="flex items-center gap-2">
                                   <input type="radio" name="branch" defaultChecked />
                                   <span className="text-sm font-medium text-github-light-text dark:text-github-dark-text">Commit directly to the <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">main</span> branch.</span>
                               </label>
                               <label className="flex items-center gap-2">
                                   <input type="radio" name="branch" disabled />
                                   <span className="text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">Create a <strong>new branch</strong> for this commit and start a pull request.</span>
                               </label>
                           </div>

                           <div className="pt-2">
                               <Button variant="primary" type="submit" disabled={!fileName || loading}>
                                   {loading ? "Committing..." : "Commit changes"}
                               </Button>
                               <Link to={`/${username}/${repoName}`} className="ml-2">
                                   <Button>Cancel</Button>
                               </Link>
                           </div>
                       </div>
                   </div>
               </div>
           </div>
       </form>
    </div>
  );
};

export default CreateFile;
