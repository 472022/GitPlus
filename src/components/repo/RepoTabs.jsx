import { Code, CircleDot, GitPullRequest, PlayCircle, Book, Shield, BarChart2, Settings } from "lucide-react";
import clsx from "clsx";
import { Link, useLocation } from "react-router-dom";

const RepoTabs = ({ repoFullName, branch }) => {
  const location = useLocation();
  const codePath = `/${repoFullName}`;
  const commitsPath = `/${repoFullName}/commits/${branch || "main"}`;
  const pathname = location.pathname;
  const isCommits = pathname.includes("/commits/");
  const isIssues = pathname.endsWith("/issues");
  const isPulls = pathname.endsWith("/pulls");
  const isActions = pathname.endsWith("/actions");
  const isProjects = pathname.endsWith("/projects");
  const isSecurity = pathname.endsWith("/security");
  const isInsights = pathname.endsWith("/insights");
  const isSettings = pathname.endsWith("/settings");
  const isCode = !(isCommits || isIssues || isPulls || isActions || isProjects || isSecurity || isInsights || isSettings);

  const tabs = [
    { name: "Code", icon: <Code size={16} />, to: codePath, active: isCode },
    { name: "Commits", icon: <Book size={16} />, to: commitsPath, active: isCommits },
    { name: "Issues", icon: <CircleDot size={16} />, to: `/${repoFullName}/issues`, active: isIssues },
    { name: "Pull requests", icon: <GitPullRequest size={16} />, to: `/${repoFullName}/pulls`, active: isPulls },
    { name: "Actions", icon: <PlayCircle size={16} />, to: `/${repoFullName}/actions`, active: isActions },
    { name: "Projects", icon: <Book size={16} />, to: `/${repoFullName}/projects`, active: isProjects },
    { name: "Security", icon: <Shield size={16} />, to: `/${repoFullName}/security`, active: isSecurity },
    { name: "Insights", icon: <BarChart2 size={16} />, to: `/${repoFullName}/insights`, active: isInsights },
    { name: "Settings", icon: <Settings size={16} />, to: `/${repoFullName}/settings`, active: isSettings },
  ];

  return (
    <div className="bg-github-light-bg-secondary dark:bg-github-dark-bg border-b border-github-light-border dark:border-github-dark-border">
       <div className="max-w-[1280px] mx-auto px-4 md:px-6 overflow-x-auto no-scrollbar">
           <nav className="flex gap-1 md:gap-2">
               {tabs.map(tab => (
                   tab.to ? (
                     <Link
                       key={tab.name}
                       to={tab.to}
                       className={clsx(
                           "flex items-center gap-2 px-3 py-2 border-b-2 text-sm whitespace-nowrap transition-colors rounded-t-md hover:bg-github-light-bg-secondary dark:hover:bg-github-dark-bg-secondary",
                           tab.active 
                             ? "border-[#fd8c73] font-semibold text-github-light-text dark:text-github-dark-text bg-white dark:bg-github-dark-bg"
                             : "border-transparent text-github-light-text-secondary dark:text-github-dark-text-secondary hover:text-github-light-text dark:hover:text-github-dark-text"
                       )}
                     >
                         {tab.icon}
                         {tab.name}
                         {tab.count !== undefined && (
                             <span className="bg-github-light-bg dark:bg-github-dark-bg-secondary px-2 py-0.5 rounded-full text-xs border border-transparent dark:border-github-dark-border">
                                 {tab.count}
                             </span>
                         )}
                     </Link>
                   ) : (
                     <button
                       key={tab.name}
                       className={clsx(
                           "flex items-center gap-2 px-3 py-2 border-b-2 text-sm whitespace-nowrap transition-colors rounded-t-md hover:bg-github-light-bg-secondary dark:hover:bg-github-dark-bg-secondary",
                           tab.active 
                             ? "border-[#fd8c73] font-semibold text-github-light-text dark:text-github-dark-text bg-white dark:bg-github-dark-bg"
                             : "border-transparent text-github-light-text-secondary dark:text-github-dark-text-secondary hover:text-github-light-text dark:hover:text-github-dark-text"
                       )}
                     >
                         {tab.icon}
                         {tab.name}
                         {tab.count !== undefined && (
                             <span className="bg-github-light-bg dark:bg-github-dark-bg-secondary px-2 py-0.5 rounded-full text-xs border border-transparent dark:border-github-dark-border">
                                 {tab.count}
                             </span>
                         )}
                     </button>
                   )
               ))}
           </nav>
       </div>
    </div>
  );
};

export default RepoTabs;
