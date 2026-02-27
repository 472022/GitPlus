import { Folder, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import Avatar from "../common/Avatar";
import { useRepositories } from "../../context/RepositoryContext";

const FileExplorer = ({ files, currentPath = "", repoFullName, branch = "main" }) => {
  const { currentUser } = useRepositories();
  if (!files) {
    return null;
  }

  const getDirectChildren = (path, allFiles) => {
      const normalizedPath = path ? (path.endsWith('/') ? path : `${path}/`) : "";

      const children = [];
      const seenFolders = new Set();

      allFiles.forEach(file => {
          if (file.path.startsWith(normalizedPath)) {
              const relativePath = file.path.slice(normalizedPath.length);
              const parts = relativePath.split('/');
              
              if (parts.length === 1) {
                  // It's a file in this directory
                  children.push(file);
              } else {
                  // It's a file in a subdirectory, so we show the subdirectory folder
                  const folderName = parts[0];
                  if (!seenFolders.has(folderName)) {
                      seenFolders.add(folderName);
                      children.push({
                          name: folderName,
                          type: "folder",
                          path: normalizedPath + folderName,
                          message: "Update directory",
                          time: "now"
                      });
                  }
              }
          }
      });
      
      // Sort: folders first, then files
      return children.sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === "folder" ? -1 : 1;
      });
  };

  const findFolderByPath = (nodes, target) => {
    for (const node of nodes) {
      if (node.type === "folder" && node.path === target) return node;
      if (node.type === "folder" && Array.isArray(node.children)) {
        const found = findFolderByPath(node.children, target);
        if (found) return found;
      }
    }
    return null;
  };

  const hasHierarchicalTree = Array.isArray(files) && files.some(f => f.type === "folder" && Array.isArray(f.children));
  const normalizedCurrentPath = currentPath ? currentPath.replace(/\/$/, "") : "";
  const currentFolder = hasHierarchicalTree && normalizedCurrentPath ? findFolderByPath(files, normalizedCurrentPath) : null;
  const displayFiles = hasHierarchicalTree ? (currentFolder ? (currentFolder.children || []) : files) : getDirectChildren(currentPath, files);
  const latestCommit = { message: "Update files", time: "now" };
  const parentPath = currentPath.split('/').slice(0, -1).join('/');

  return (
    <div className="border border-github-light-border dark:border-github-dark-border rounded-md overflow-hidden mb-6 bg-white dark:bg-github-dark-bg">
      <div className="bg-github-light-bg-secondary dark:bg-github-dark-bg-secondary p-3 border-b border-github-light-border dark:border-github-dark-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
              <Avatar src={currentUser?.avatar_url} size="xs" className="w-5 h-5 rounded-full" />
              <span className="font-bold text-github-light-text dark:text-github-dark-text hover:underline cursor-pointer">{currentUser?.login}</span>
              <span className="text-github-light-text-secondary dark:text-github-dark-text-secondary truncate">{latestCommit.message || "Update files"}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary">
              <span className="hidden sm:inline">a1b2c3d</span>
              <span className="hidden sm:inline">{latestCommit.time || "now"}</span>
              <div className="flex items-center gap-1 font-bold">
                  <span className="hidden sm:inline">{files.length}</span> commits
              </div>
          </div>
      </div>

      <table className="w-full text-left border-collapse">
        <tbody>
          {currentPath && (
              <tr className="border-b border-github-light-border dark:border-github-dark-border hover:bg-github-light-bg-secondary dark:hover:bg-github-dark-bg-secondary transition-colors">
                  <td className="p-2 pl-4" colSpan="3">
                      <Link to={parentPath ? `/${repoFullName}/tree/${branch}/${parentPath}` : `/${repoFullName}`} className="font-bold text-blue-500 hover:underline">
                          ..
                      </Link>
                  </td>
              </tr>
          )}
          {displayFiles.map((item, index) => {
            const linkPath = item.type === "folder" 
                ? `/${repoFullName}/tree/${branch}/${item.path}`
                : `/${repoFullName}/blob/${branch}/${item.path}`;

            return (
                <tr key={item.path || index} className="border-b border-github-light-border dark:border-github-dark-border last:border-0 hover:bg-github-light-bg-secondary dark:hover:bg-github-dark-bg-secondary transition-colors">
                <td className="p-2 pl-4 w-1/3">
                    <div className="flex items-center gap-2">
                    {item.type === "folder" ? (
                        <Folder size={16} className="text-blue-500 fill-blue-500" />
                    ) : (
                        <FileText size={16} className="text-github-light-text-secondary dark:text-github-dark-text-secondary" />
                    )}
                    <Link to={linkPath} className="text-sm text-github-light-text dark:text-github-dark-text hover:underline hover:text-github-light-accent dark:hover:text-github-dark-accent truncate">
                        {item.name}
                    </Link>
                    </div>
                </td>
                <td className="p-2 text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary w-1/3 truncate hidden md:table-cell">
                    {item.message || "Update files"}
                </td>
                <td className="p-2 pr-4 text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary text-right w-1/6 whitespace-nowrap">
                    {item.time || "now"}
                </td>
                </tr>
            );
          })}
          {displayFiles.length === 0 && (
              <tr>
                  <td colSpan="3" className="p-4 text-center text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">
                      No files in this directory.
                  </td>
              </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default FileExplorer;
