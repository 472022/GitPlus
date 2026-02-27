import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { BookOpen, Box, Package, Star } from "lucide-react";
import ProfileSidebar from "../components/profile/ProfileSidebar";
import ContributionGraph from "../components/profile/ContributionGraph";
import RepoGrid from "../components/profile/RepoGrid";
import { currentUser } from "../data/mockData";
import clsx from "clsx";
import { useRepositories } from "../context/RepositoryContext";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const API_URL = `${BACKEND_URL}/api`;

const Profile = () => {
  const { username } = useParams();
  const [searchParams] = useSearchParams();
  const { repositories } = useRepositories();
  // In a real app, fetch user by username. Using mock currentUser for now if matches or default.
  const user = username === currentUser.login ? currentUser : { ...currentUser, login: username || currentUser.login, name: username || currentUser.name };
  const [contrib, setContrib] = useState({ loading: true, error: "", data: null });
  const activeTab = String(searchParams.get("tab") || "overview").toLowerCase();

  const tabs = [
    { key: "overview", name: "Overview", icon: <BookOpen size={16} />, count: null },
    { key: "repositories", name: "Repositories", icon: <BookOpen size={16} />, count: (repositories || []).filter(r => r?.owner?.login === user.login).length },
    { key: "projects", name: "Projects", icon: <Box size={16} />, count: null },
    { key: "packages", name: "Packages", icon: <Package size={16} />, count: null },
    { key: "stars", name: "Stars", icon: <Star size={16} />, count: (repositories || []).filter(r => r?.starred).length },
  ];

  useEffect(() => {
    const login = user?.login;
    if (!login) return;

    const controller = new AbortController();
    setContrib({ loading: true, error: "", data: null });

    fetch(`${API_URL}/users/${encodeURIComponent(login)}/contributions?days=365`, { signal: controller.signal })
      .then(res => res.json().then(j => ({ ok: res.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.error || "Failed to load contributions");
        setContrib({ loading: false, error: "", data: j });
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setContrib({ loading: false, error: e.message || "Failed to load contributions", data: null });
      });

    return () => controller.abort();
  }, [user?.login]);

  return (
    <div className="max-w-[1280px] mx-auto md:px-6 md:py-8">
       <div className="flex flex-col md:flex-row gap-8">
           <ProfileSidebar user={user} />
           
           <div className="flex-1 min-w-0">
               {/* Mobile sticky header for tabs could go here, but keeping simple */}
               <div className="border-b border-github-light-border dark:border-github-dark-border mb-4 sticky top-[60px] bg-github-light-bg dark:bg-github-dark-bg z-20 -mx-6 px-6 md:mx-0 md:px-0 md:static">
                   <nav className="flex gap-4 overflow-x-auto no-scrollbar">
                       {tabs.map(tab => (
                           <Link
                             key={tab.key}
                             to={`/${user.login}${tab.key === "overview" ? "" : `?tab=${tab.key}`}`}
                             className={clsx(
                               "flex items-center gap-2 py-3 border-b-2 text-sm whitespace-nowrap",
                               activeTab === tab.key
                                 ? "border-[#fd8c73] font-semibold text-github-light-text dark:text-github-dark-text"
                                 : "border-transparent text-github-light-text-secondary dark:text-github-dark-text-secondary hover:border-github-light-border dark:hover:border-github-dark-border"
                             )}
                           >
                             {tab.icon}
                             {tab.name}
                             {tab.count !== null && (
                               <span className="bg-github-light-bg-secondary dark:bg-github-dark-bg-secondary px-2 py-0.5 rounded-full text-xs">
                                 {tab.count}
                               </span>
                             )}
                           </Link>
                       ))}
                   </nav>
               </div>

               {activeTab === "overview" ? (
                 <>
                   <RepoGrid />
                   <ContributionGraph loading={contrib.loading} error={contrib.error} data={contrib.data} />
                 </>
               ) : null}

               {activeTab === "repositories" ? (
                 <div className="border border-github-light-border dark:border-github-dark-border rounded-md bg-white dark:bg-github-dark-bg overflow-hidden">
                   <div className="p-4 border-b border-github-light-border dark:border-github-dark-border text-sm font-semibold text-github-light-text dark:text-github-dark-text">
                     Repositories
                   </div>
                   <div className="divide-y divide-github-light-border dark:divide-github-dark-border">
                     {(repositories || []).filter(r => r?.owner?.login === user.login).length === 0 ? (
                       <div className="p-4 text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">No repositories.</div>
                     ) : (
                       (repositories || []).filter(r => r?.owner?.login === user.login).map(r => (
                         <Link key={r.full_name} to={`/${r.full_name}`} className="block p-4 hover:bg-github-light-bg-secondary dark:hover:bg-github-dark-bg-secondary">
                           <div className="text-sm font-semibold text-github-light-text dark:text-github-dark-text">{r.full_name}</div>
                           <div className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary">{r.description || ""}</div>
                         </Link>
                       ))
                     )}
                   </div>
                 </div>
               ) : null}

               {activeTab === "stars" ? (
                 <div className="border border-github-light-border dark:border-github-dark-border rounded-md bg-white dark:bg-github-dark-bg overflow-hidden">
                   <div className="p-4 border-b border-github-light-border dark:border-github-dark-border text-sm font-semibold text-github-light-text dark:text-github-dark-text">
                     Starred
                   </div>
                   <div className="divide-y divide-github-light-border dark:divide-github-dark-border">
                     {(repositories || []).filter(r => r?.starred).length === 0 ? (
                       <div className="p-4 text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">No starred repositories.</div>
                     ) : (
                       (repositories || []).filter(r => r?.starred).map(r => (
                         <Link key={r.full_name} to={`/${r.full_name}`} className="block p-4 hover:bg-github-light-bg-secondary dark:hover:bg-github-dark-bg-secondary">
                           <div className="text-sm font-semibold text-github-light-text dark:text-github-dark-text">{r.full_name}</div>
                           <div className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary">{r.description || ""}</div>
                         </Link>
                       ))
                     )}
                   </div>
                 </div>
               ) : null}

               {activeTab === "projects" ? (
                 <div className="border border-github-light-border dark:border-github-dark-border rounded-md bg-white dark:bg-github-dark-bg overflow-hidden">
                   <div className="p-4 border-b border-github-light-border dark:border-github-dark-border text-sm font-semibold text-github-light-text dark:text-github-dark-text">
                     Projects
                   </div>
                   <div className="p-4 space-y-2">
                     {(repositories || []).filter(r => r?.owner?.login === user.login).map(r => (
                       <Link key={r.full_name} to={`/${r.full_name}/projects`} className="block text-sm text-github-light-accent dark:text-github-dark-accent hover:underline">
                         {r.full_name}
                       </Link>
                     ))}
                     {(repositories || []).filter(r => r?.owner?.login === user.login).length === 0 ? (
                       <div className="text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">No repositories.</div>
                     ) : null}
                   </div>
                 </div>
               ) : null}

               {activeTab === "packages" ? (
                 <div className="border border-github-light-border dark:border-github-dark-border rounded-md bg-white dark:bg-github-dark-bg overflow-hidden">
                   <div className="p-4 border-b border-github-light-border dark:border-github-dark-border text-sm font-semibold text-github-light-text dark:text-github-dark-text">
                     Packages
                   </div>
                   <div className="p-4 text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">No packages published.</div>
                 </div>
               ) : null}
           </div>
       </div>
    </div>
  );
};

export default Profile;
