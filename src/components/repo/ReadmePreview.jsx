import { List } from "lucide-react";
import { useEffect, useState } from "react";
import { useRepositories } from "../../context/RepositoryContext";

const ReadmePreview = ({ files, repoFullName }) => {
  const { fetchRepoFileContent } = useRepositories();
  const [content, setContent] = useState("");
  const readme = files?.find(f => f.name.toLowerCase() === "readme.md");

  if (!readme) {
    return null;
  }

  useEffect(() => {
    if (typeof readme.content === "string") {
      setContent(readme.content);
      return;
    }
    fetchRepoFileContent(repoFullName, readme.path)
      .then((text) => setContent(text))
      .catch(() => setContent(""));
  }, [readme.path, readme.content, repoFullName]);

  return (
    <div className="border border-github-light-border dark:border-github-dark-border rounded-md overflow-hidden bg-white dark:bg-github-dark-bg mb-6">
      <div className="bg-github-light-bg-secondary dark:bg-github-dark-bg-secondary p-3 border-b border-github-light-border dark:border-github-dark-border flex items-center justify-between sticky top-0">
          <div className="flex items-center gap-2 font-bold text-sm text-github-light-text dark:text-github-dark-text">
              <List size={16} />
              {readme.name}
          </div>
      </div>
      <div className="p-8 prose dark:prose-invert max-w-none whitespace-pre-wrap font-mono text-sm">
          {content}
      </div>
    </div>
  );
};

export default ReadmePreview;
