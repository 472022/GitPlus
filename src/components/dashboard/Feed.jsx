import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Star, GitBranch, GitCommit, Eye } from "lucide-react";
import Avatar from "../common/Avatar";
import Card, { CardBody } from "../common/Card";
import { useRepositories } from "../../context/RepositoryContext";

const Feed = () => {
  const navigate = useNavigate();
  const { activity } = useRepositories();

  return (
    <div className="flex-1 py-6 max-w-4xl">
      <h2 className="text-lg font-semibold text-github-light-text dark:text-github-dark-text mb-4">Home</h2>
      <div className="space-y-4">
          <div className="p-4 bg-github-light-bg-secondary dark:bg-github-dark-bg-secondary border border-github-light-border dark:border-github-dark-border rounded-md mb-6">
              <h3 className="text-sm font-medium mb-2">Discover interesting projects and people to populate your personal news feed.</h3>
              <p className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary mb-3">
                  Your news feed helps you keep up with recent activity on repositories you watch and people you follow.
              </p>
              <button onClick={() => navigate("/import")} className="text-github-light-accent dark:text-github-dark-accent text-sm font-semibold hover:underline">
                  Explore GitHub
              </button>
          </div>

        {(Array.isArray(activity) ? activity : []).map((event) => (
          <Card key={event.id} className="p-0">
            <CardBody className="flex gap-3">
              <Avatar src={event.actor.avatar_url} size="md" />
              <div className="flex-1">
                <div className="text-sm text-github-light-text dark:text-github-dark-text mb-1">
                  <Link to={`/${event.actor.login}`} className="font-semibold hover:underline hover:text-github-light-accent dark:hover:text-github-dark-accent">
                    {event.actor.login}
                  </Link>
                  <span className="text-github-light-text-secondary dark:text-github-dark-text-secondary mx-1">
                    {event.type === "PushEvent" && "pushed to"}
                    {event.type === "WatchEvent" && "starred"}
                    {event.type === "ForkEvent" && "forked"}
                  </span>
                  <Link to={`/${event.repo.name}`} className="font-semibold hover:underline hover:text-github-light-accent dark:hover:text-github-dark-accent">
                    {event.repo.name}
                  </Link>
                  <span className="text-github-light-text-secondary dark:text-github-dark-text-secondary ml-1">
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </span>
                </div>

                {event.type === "PushEvent" && (
                  <div className="mt-2 bg-github-light-bg-secondary dark:bg-github-dark-bg-secondary p-3 rounded-md text-sm font-mono text-github-light-text-secondary dark:text-github-dark-text-secondary">
                     {(event.payload?.commits || []).map((commit) => (
                        <div key={commit.sha} className="flex items-center gap-2">
                             <GitCommit size={14} />
                             <span className="text-github-light-text dark:text-github-dark-text">{commit.message}</span>
                        </div>
                     ))}
                  </div>
                )}
                 
                 {event.type === "WatchEvent" && (
                     <div className="mt-2 p-3 border border-github-light-border dark:border-github-dark-border rounded-md flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <Star size={16} className="text-yellow-500 fill-yellow-500"/>
                            <span className="font-semibold text-sm">20.5k</span>
                         </div>
                         <div className="flex items-center gap-2 text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary">
                             <span>Updated yesterday</span>
                         </div>
                     </div>
                 )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Feed;
