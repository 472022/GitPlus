import { Link } from "react-router-dom";
import { Star, GitFork } from "lucide-react";
import Card, { CardBody } from "../common/Card";
import Badge from "../common/Badge";
import { useRepositories } from "../../context/RepositoryContext";

const RepoGrid = () => {
  const { repositories } = useRepositories();
  // Take first 6 repos as pinned
  const pinnedRepos = repositories.slice(0, 6);

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-semibold text-github-light-text dark:text-github-dark-text">Pinned</h2>
        <button className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary hover:text-github-light-accent dark:hover:text-github-dark-accent">
            Customize your pins
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pinnedRepos.map((repo) => (
          <Card key={repo.id} className="flex flex-col">
            <CardBody className="flex flex-col h-full">
              <div className="flex items-center gap-2 mb-2">
                 <Link to={`/${repo.full_name}`} className="font-semibold text-github-light-accent dark:text-github-dark-accent hover:underline text-sm">
                     {repo.name}
                 </Link>
                 <Badge variant="public">Public</Badge>
              </div>
              <p className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary mb-4 flex-1">
                  {repo.description}
              </p>
              <div className="flex items-center gap-4 text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary">
                  <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                      {repo.language}
                  </div>
                  <div className="flex items-center gap-1 hover:text-github-light-accent dark:hover:text-github-dark-accent cursor-pointer">
                      <Star size={14} />
                      {repo.stargazers_count}
                  </div>
                   <div className="flex items-center gap-1 hover:text-github-light-accent dark:hover:text-github-dark-accent cursor-pointer">
                      <GitFork size={14} />
                      {repo.forks_count}
                  </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RepoGrid;
