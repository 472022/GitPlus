import { useState } from "react";
import { Link } from "react-router-dom";
import { Book, Search } from "lucide-react";
import Avatar from "../common/Avatar";
import Button from "../common/Button";
import { useRepositories } from "../../context/RepositoryContext";

const Sidebar = () => {
  const { repositories, currentUser } = useRepositories();
  const [filter, setFilter] = useState("");
  const [showAll, setShowAll] = useState(false);

  if (!currentUser) return null;

  // Filter repos to only show those owned by the current user
  const userRepos = repositories.filter(repo => repo.owner.login === currentUser.login);

  const filteredRepos = userRepos.filter((repo) =>
    repo.name.toLowerCase().includes(filter.toLowerCase())
  );

  const visibleRepos = showAll ? filteredRepos : filteredRepos.slice(0, 6);

  return (
    <aside className="w-full md:w-80 md:pr-6 py-6 flex-shrink-0">
      <div className="mb-6 bg-white dark:bg-github-dark-bg-secondary p-4 rounded-md border border-github-light-border dark:border-github-dark-border md:bg-transparent md:border-0 md:p-0">
        <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-github-light-text dark:text-github-dark-text">Top Repositories</h2>
            <Link to="/new">
              <Button variant="primary" size="sm" className="flex items-center gap-1 text-xs px-2 py-1">
                  New
              </Button>
            </Link>
        </div>
        
        <div className="relative mb-3">
            <input
            type="text"
            placeholder="Find a repository..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-github-light-bg dark:bg-github-dark-bg border border-github-light-border dark:border-github-dark-border rounded-md py-1 px-2 text-sm text-github-light-text dark:text-github-dark-text focus:ring-2 focus:ring-github-light-accent dark:focus:ring-github-dark-accent focus:outline-none"
            />
        </div>

        <ul className="space-y-1">
            {visibleRepos.map((repo) => (
            <li key={repo.id}>
                <Link
                to={`/${repo.full_name}`}
                className="flex items-center gap-2 p-1 -mx-1 rounded-md hover:bg-github-light-bg-secondary dark:hover:bg-github-dark-bg-secondary group"
                >
                <Avatar src={repo.owner.avatar_url} size="sm" className="w-4 h-4 rounded-md" />
                <span className="text-sm font-medium text-github-light-text dark:text-github-dark-text group-hover:text-github-light-accent dark:group-hover:text-github-dark-accent truncate">
                    {repo.owner.login}/{repo.name}
                </span>
                </Link>
            </li>
            ))}
        </ul>
        {filteredRepos.length > 6 ? (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary mt-4 hover:text-github-light-accent dark:hover:text-github-dark-accent"
          >
              {showAll ? "Show less" : "Show more"}
          </button>
        ) : null}
      </div>

      <div className="hidden md:block">
          <h2 className="text-sm font-semibold text-github-light-text dark:text-github-dark-text mb-2">Recent activity</h2>
           <div className="border border-dashed border-github-light-border dark:border-github-dark-border rounded-md p-4 text-center">
                <p className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary">
                    When you have activity to show, it will appear here.
                </p>
           </div>
      </div>
    </aside>
  );
};

export default Sidebar;
