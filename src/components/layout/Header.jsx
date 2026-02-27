import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Github, Bell, Plus, Menu, Search, Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useRepositories } from "../../context/RepositoryContext";
import Avatar from "../common/Avatar";
import Button from "../common/Button";

const Header = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { currentUser, logout, repositories, activity } = useRepositories();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // If no user is logged in (shouldn't happen on protected routes, but safe fallback)
  if (!currentUser) return null;

  return (
    <header className="bg-github-light-bg-secondary dark:bg-github-dark-bg-secondary border-b border-github-light-border dark:border-github-dark-border py-3 px-4 md:px-6 sticky top-0 z-50">
      <div className="flex items-center justify-between">
        {/* Left: Logo & Mobile Menu & Search */}
        <div className="flex items-center gap-4">
          <Button variant="invisible" className="md:hidden p-1" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <Menu size={20} />
          </Button>
          <Link to="/" className="text-github-light-text dark:text-white hover:text-github-light-text-secondary">
            <Github size={32} fill="currentColor" />
          </Link>

          {/* Desktop Search */}
          <div className="hidden md:flex items-center relative">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <Search size={14} className="text-github-light-text-secondary dark:text-github-dark-text-secondary" />
              </div>
              <input
                type="text"
                placeholder="Type / to search"
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const q = searchQuery.trim().toLowerCase();
                    const match = (repositories || []).find(r => String(r.full_name || "").toLowerCase().includes(q) || String(r.name || "").toLowerCase().includes(q));
                    if (match) {
                      navigate(`/${match.full_name}`);
                      setSearchOpen(false);
                    }
                  }
                }}
                className="bg-github-light-bg dark:bg-github-dark-bg border border-github-light-border dark:border-github-dark-border rounded-md py-1 pl-8 pr-12 text-sm text-github-light-text dark:text-github-dark-text focus:ring-2 focus:ring-github-light-accent dark:focus:ring-github-dark-accent focus:border-transparent w-64 transition-all"
              />
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                <kbd className="border border-github-light-border dark:border-github-dark-border rounded px-1 text-[10px] text-github-light-text-secondary dark:text-github-dark-text-secondary bg-github-light-bg dark:bg-github-dark-bg">
                  /
                </kbd>
              </div>

              {searchOpen && searchQuery.trim() ? (
                <div className="absolute left-0 top-full mt-2 w-80 bg-white dark:bg-github-dark-bg-secondary border border-github-light-border dark:border-github-dark-border rounded-md shadow-lg py-1 z-50">
                  {(repositories || [])
                    .filter(r => {
                      const q = searchQuery.trim().toLowerCase();
                      const name = String(r.name || "").toLowerCase();
                      const full = String(r.full_name || "").toLowerCase();
                      return name.includes(q) || full.includes(q);
                    })
                    .slice(0, 6)
                    .map(r => (
                      <button
                        key={r.full_name}
                        onClick={() => {
                          navigate(`/${r.full_name}`);
                          setSearchOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-github-light-text dark:text-github-dark-text hover:bg-github-light-accent hover:text-white dark:hover:bg-github-dark-accent"
                      >
                        {r.full_name}
                      </button>
                    ))}
                  {(repositories || []).filter(r => {
                    const q = searchQuery.trim().toLowerCase();
                    const name = String(r.name || "").toLowerCase();
                    const full = String(r.full_name || "").toLowerCase();
                    return name.includes(q) || full.includes(q);
                  }).length === 0 ? (
                    <div className="px-3 py-2 text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">No results</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            <Button variant="invisible" className="px-2" onClick={toggleTheme}>
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            
            <div className="relative group">
               <Button variant="invisible" className="border border-github-light-border dark:border-github-dark-border rounded-md px-2 py-1 h-8">
                 <Plus size={16} /> <span className="ml-1 text-xs">▼</span>
               </Button>
               <div className="hidden group-hover:block absolute right-0 top-full mt-2 w-48 bg-white dark:bg-github-dark-bg-secondary border border-github-light-border dark:border-github-dark-border rounded-md shadow-lg py-1 z-50">
                  <Link to="/new" className="block px-4 py-2 text-sm text-github-light-text dark:text-github-dark-text hover:bg-github-light-accent hover:text-white dark:hover:bg-github-dark-accent">New repository</Link>
                  <Link to="/import" className="block px-4 py-2 text-sm text-github-light-text dark:text-github-dark-text hover:bg-github-light-accent hover:text-white dark:hover:bg-github-dark-accent">Import repository</Link>
               </div>
            </div>

            <Button variant="invisible" className="px-2 relative" onClick={() => setNotificationsOpen((v) => !v)}>
              <Bell size={18} />
              {(Array.isArray(activity) && activity.length > 0) ? (
                <span className="absolute top-1 right-2 w-2 h-2 bg-github-light-accent rounded-full border-2 border-github-light-bg-secondary dark:border-github-dark-bg-secondary"></span>
              ) : null}
            </Button>

            {notificationsOpen ? (
              <div className="absolute right-16 top-12 w-96 bg-white dark:bg-github-dark-bg-secondary border border-github-light-border dark:border-github-dark-border rounded-md shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-2 border-b border-github-light-border dark:border-github-dark-border text-sm font-semibold text-github-light-text dark:text-github-dark-text">
                  Notifications
                </div>
                <div className="max-h-80 overflow-auto">
                  {(Array.isArray(activity) ? activity : []).slice(0, 10).map((event) => (
                    <button
                      key={event.id}
                      onClick={() => {
                        setNotificationsOpen(false);
                        navigate(`/${event.repo?.name || ""}`);
                      }}
                      className="w-full text-left px-4 py-3 border-b border-github-light-border dark:border-github-dark-border last:border-0 hover:bg-github-light-bg-secondary dark:hover:bg-github-dark-bg"
                    >
                      <div className="text-sm text-github-light-text dark:text-github-dark-text">
                        <span className="font-semibold">{event.actor?.login || "someone"}</span>{" "}
                        <span className="text-github-light-text-secondary dark:text-github-dark-text-secondary">
                          {event.type === "PushEvent" ? "pushed to" : event.type === "WatchEvent" ? "starred" : event.type === "ForkEvent" ? "forked" : "updated"}
                        </span>{" "}
                        <span className="font-semibold">{event.repo?.name || ""}</span>
                      </div>
                      <div className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary">
                        {event.created_at ? new Date(event.created_at).toLocaleString() : ""}
                      </div>
                    </button>
                  ))}
                  {(Array.isArray(activity) ? activity : []).length === 0 ? (
                    <div className="px-4 py-3 text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">No notifications</div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative group">
            <button className="flex items-center gap-1 focus:outline-none">
              <Avatar src={currentUser.avatar_url} size="sm" />
              <span className="hidden md:inline text-xs ml-1">▼</span>
            </button>
            
            {/* Dropdown */}
            <div className="hidden group-hover:block absolute right-0 top-full mt-2 w-48 bg-white dark:bg-github-dark-bg-secondary border border-github-light-border dark:border-github-dark-border rounded-md shadow-lg py-1 z-50">
              <div className="px-4 py-2 border-b border-github-light-border dark:border-github-dark-border">
                <p className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary">Signed in as</p>
                <p className="font-bold text-sm text-github-light-text dark:text-github-dark-text">{currentUser.login}</p>
              </div>
              <Link to={`/${currentUser.login}`} className="block px-4 py-2 text-sm text-github-light-text dark:text-github-dark-text hover:bg-github-light-accent hover:text-white dark:hover:bg-github-dark-accent">Your Profile</Link>
              <Link to="/" className="block px-4 py-2 text-sm text-github-light-text dark:text-github-dark-text hover:bg-github-light-accent hover:text-white dark:hover:bg-github-dark-accent">Your Repositories</Link>
              <div className="border-t border-github-light-border dark:border-github-dark-border my-1"></div>
              <button onClick={logout} className="block w-full text-left px-4 py-2 text-sm text-github-light-text dark:text-github-dark-text hover:bg-github-light-accent hover:text-white dark:hover:bg-github-dark-accent">Sign out</button>
            </div>
          </div>
        </div>
      </div>

      {isMenuOpen ? (
        <div className="md:hidden mt-3 border-t border-github-light-border dark:border-github-dark-border pt-3 space-y-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <Search size={14} className="text-github-light-text-secondary dark:text-github-dark-text-secondary" />
            </div>
            <input
              type="text"
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-github-light-bg dark:bg-github-dark-bg border border-github-light-border dark:border-github-dark-border rounded-md py-2 pl-8 pr-3 text-sm text-github-light-text dark:text-github-dark-text focus:ring-2 focus:ring-github-light-accent dark:focus:ring-github-dark-accent focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={toggleTheme} className="flex-1 justify-center">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            <Link to="/new" className="flex-1" onClick={() => setIsMenuOpen(false)}>
              <Button variant="primary" size="sm" className="w-full justify-center">New</Button>
            </Link>
            <Link to="/import" className="flex-1" onClick={() => setIsMenuOpen(false)}>
              <Button variant="secondary" size="sm" className="w-full justify-center">Import</Button>
            </Link>
          </div>
          {searchQuery.trim() ? (
            <div className="bg-white dark:bg-github-dark-bg-secondary border border-github-light-border dark:border-github-dark-border rounded-md overflow-hidden">
              {(repositories || [])
                .filter(r => {
                  const q = searchQuery.trim().toLowerCase();
                  const name = String(r.name || "").toLowerCase();
                  const full = String(r.full_name || "").toLowerCase();
                  return name.includes(q) || full.includes(q);
                })
                .slice(0, 6)
                .map(r => (
                  <button
                    key={r.full_name}
                    onClick={() => {
                      navigate(`/${r.full_name}`);
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-github-light-text dark:text-github-dark-text hover:bg-github-light-accent hover:text-white dark:hover:bg-github-dark-accent"
                  >
                    {r.full_name}
                  </button>
                ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
};

export default Header;
