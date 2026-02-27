import { Link, useNavigate } from "react-router-dom";
import { Star } from "lucide-react";
import Button from "../common/Button";
import { useRepositories } from "../../context/RepositoryContext";

const ExploreSidebar = () => {
  const navigate = useNavigate();
  const { trending, repositories, toggleStar } = useRepositories();

  const topDevelopers = Array.isArray(repositories)
    ? Object.values(repositories.reduce((acc, r) => {
        const login = r?.owner?.login;
        if (!login) return acc;
        acc[login] = acc[login] || { login, count: 0 };
        acc[login].count += 1;
        return acc;
      }, {})).sort((a, b) => b.count - a.count).slice(0, 5)
    : [];

  return (
    <aside className="hidden lg:block w-80 pl-6 py-6">
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-github-light-text dark:text-github-dark-text mb-3">Explore</h3>
        <div className="space-y-4">
          {(Array.isArray(trending) ? trending : []).map((repo) => (
            <div key={repo.name} className="border-b border-github-light-border dark:border-github-dark-border pb-4 last:border-0">
              <div className="flex justify-between items-start mb-1">
                <Link to={`/${repo.author}/${repo.name}`} className="font-semibold text-sm hover:underline hover:text-github-light-accent dark:hover:text-github-dark-accent truncate pr-2">
                  {repo.author} / {repo.name}
                </Link>
              </div>
              <p className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary mb-2 line-clamp-2">
                {repo.description}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary">
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: repo.languageColor }}></span>
                        {repo.language}
                    </div>
                    <div className="flex items-center gap-1">
                        <Star size={12} />
                        {repo.stars > 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : repo.stars}
                    </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    const fullName = `${repo.author}/${repo.name}`;
                    const exists = repositories.find(r => r.full_name === fullName);
                    if (exists) {
                      toggleStar(fullName);
                    } else {
                      window.open(`https://github.com/${fullName}`, "_blank", "noopener,noreferrer");
                    }
                  }}
                >
                    <Star size={12} className="mr-1"/> Star
                </Button>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => navigate("/import")} className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary mt-4 hover:text-github-light-accent dark:hover:text-github-dark-accent">
            Explore more →
        </button>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-github-light-text dark:text-github-dark-text mb-3">Trending Developers</h3>
        {topDevelopers.length === 0 ? (
          <div className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary">
            No developers yet.
          </div>
        ) : (
          <div className="space-y-2">
            {topDevelopers.map((d) => (
              <Link
                key={d.login}
                to={`/${d.login}`}
                className="block text-xs text-github-light-text dark:text-github-dark-text hover:text-github-light-accent dark:hover:text-github-dark-accent"
              >
                {d.login} • {d.count} repos
              </Link>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

export default ExploreSidebar;
