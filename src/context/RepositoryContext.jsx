import { createContext, useContext, useState, useEffect } from "react";
import { io } from "socket.io-client";

const RepositoryContext = createContext();

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const API_URL = `${BACKEND_URL}/api`;
const SOCKET_URL = BACKEND_URL;

export const RepositoryProvider = ({ children }) => {
  const [repositories, setRepositories] = useState([]);
  const [repoFiles, setRepoFiles] = useState({});
  const [currentUser, setCurrentUser] = useState(() => {
    // Initialize from localStorage
    const savedUser = localStorage.getItem("currentUser");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [activity, setActivity] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initial Data Fetch & Socket Setup
  useEffect(() => {
    // Fetch initial data
    fetch(`${API_URL}/data`)
      .then(res => res.json())
      .then(data => {
        setRepositories(data.repositories || []);
        // Don't overwrite currentUser from server global state
        // setCurrentUser(data.currentUser || null); 
        setActivity(data.activity || []);
        setTrending(data.trending || []);
        
        // Handle fileTree migration to repoFiles map
        if (data.repoFiles) {
          setRepoFiles(data.repoFiles);
        } else if (data.fileTree) {
          // Backward compatibility with initial mock data structure
          setRepoFiles({
            "shadcn/ui": data.fileTree
          });
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch data:", err);
        setLoading(false);
      });

    // Socket.io connection
    const socket = io(SOCKET_URL);

    socket.on("connect", () => {
      console.log("Connected to socket server");
    });

    socket.on("dataUpdated", (data) => {
      console.log("Received data update from server");
      setRepositories(data.repositories || []);
      // Don't overwrite currentUser from server global state
      // setCurrentUser(data.currentUser || null);
      setActivity(data.activity || []);
      setTrending(data.trending || []);
      
      if (data.repoFiles) {
        setRepoFiles(data.repoFiles);
      } else if (data.fileTree) {
        setRepoFiles(prev => ({
          ...prev,
          "shadcn/ui": data.fileTree
        }));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Update localStorage when currentUser changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("currentUser");
    }
  }, [currentUser]);

  // Helper to persist state to server
  const saveData = async (updatedData) => {
    try {
      // Construct full payload
      const payload = {
        // currentUser: updatedData.currentUser || currentUser, // Don't sync individual session state to global
        repositories: updatedData.repositories || repositories,
        repoFiles: updatedData.repoFiles || repoFiles,
        activity: updatedData.activity || activity,
        trending: updatedData.trending || trending,
        // Keep original fileTree for backward compat if needed, or just rely on repoFiles
        fileTree: updatedData.repoFiles ? updatedData.repoFiles["shadcn/ui"] : (repoFiles["shadcn/ui"] || [])
      };

      await fetch(`${API_URL}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error("Failed to save data:", err);
    }
  };

  const addRepository = (newRepoData) => {
    if (!currentUser) return;

    const newRepo = {
      id: Math.max(0, ...repositories.map((r) => r.id)) + 1,
      name: newRepoData.name,
      full_name: `${currentUser.login}/${newRepoData.name}`,
      private: newRepoData.private,
      owner: {
        login: currentUser.login,
        avatar_url: currentUser.avatar_url,
      },
      html_url: `https://github.com/${currentUser.login}/${newRepoData.name}`,
      description: newRepoData.description || "",
      fork: false,
      url: `https://api.github.com/repos/${currentUser.login}/${newRepoData.name}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pushed_at: new Date().toISOString(),
      homepage: newRepoData.homepage || null,
      size: newRepoData.size || 0,
      stargazers_count: newRepoData.stargazers_count || 0,
      watchers_count: newRepoData.watchers_count || 0,
      language: newRepoData.language || null,
      has_issues: true,
      has_projects: true,
      has_downloads: true,
      has_wiki: true,
      has_pages: false,
      forks_count: newRepoData.forks_count || 0,
      archived: false,
      disabled: false,
      open_issues_count: newRepoData.open_issues_count || 0,
      license: newRepoData.license || null,
      topics: newRepoData.topics || [],
      visibility: newRepoData.private ? "private" : "public",
      default_branch: "main",
    };

    const newRepositories = [newRepo, ...repositories];
    setRepositories(newRepositories);

    let newRepoFiles = { ...repoFiles };
    
    // Check if files are provided (from import), otherwise initialize default
    if (newRepoData.files) {
        newRepoFiles[newRepo.full_name] = newRepoData.files;
    } else if (newRepoData.initReadme) {
      newRepoFiles[newRepo.full_name] = [
        {
          name: "README.md",
          type: "file",
          path: "README.md",
          message: "Initial commit",
          time: "now",
          content: `# ${newRepo.name}\n\n${newRepo.description || "No description provided."}`,
        },
      ];
    } else {
      newRepoFiles[newRepo.full_name] = [];
    }
    setRepoFiles(newRepoFiles);

    saveData({ repositories: newRepositories, repoFiles: newRepoFiles });

    return newRepo;
  };

  const addFile = (repoFullName, fileData) => {
    const newFile = {
      name: fileData.name,
      type: "file",
      path: fileData.name,
      message: fileData.message,
      time: "now",
      content: fileData.content,
    };

    const currentFiles = repoFiles[repoFullName] || [];
    const updatedFiles = [...currentFiles, newFile];
    const newRepoFiles = { ...repoFiles, [repoFullName]: updatedFiles };
    
    setRepoFiles(newRepoFiles);
    saveData({ repoFiles: newRepoFiles });
  };

  const updateFile = (repoFullName, filePath, newContent) => {
    const currentFiles = repoFiles[repoFullName] || [];
    const updatedFiles = currentFiles.map(file => {
      if (file.path === filePath) {
        return {
          ...file,
          content: newContent,
          time: "just now"
        };
      }
      return file;
    });

    const newRepoFiles = { ...repoFiles, [repoFullName]: updatedFiles };
    setRepoFiles(newRepoFiles);
    saveData({ repoFiles: newRepoFiles });
  };

  const fetchRepoFileContent = async (repoFullName, filePath) => {
    const [owner, repo] = String(repoFullName || "").split("/");
    if (!owner || !repo) throw new Error("Invalid repository name");
    const response = await fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/file?path=${encodeURIComponent(filePath)}`, {
      credentials: "include"
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to load file");
    }
    return data.content || "";
  };

  const saveRepoFileContent = async (repoFullName, filePath, content) => {
    const [owner, repo] = String(repoFullName || "").split("/");
    if (!owner || !repo) throw new Error("Invalid repository name");
    const response = await fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/file`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath, content })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to save file");
    }
    return true;
  };

  const getRepoFiles = (repoFullName) => {
    return repoFiles[repoFullName] || [];
  };

  const toggleStar = (repoId) => {
    const newRepositories = repositories.map(repo => {
      if (repo.id === repoId) {
        const isStarred = repo.starred_by_user;
        return {
          ...repo,
          starred_by_user: !isStarred,
          stargazers_count: isStarred ? repo.stargazers_count - 1 : repo.stargazers_count + 1
        };
      }
      return repo;
    });
    setRepositories(newRepositories);
    saveData({ repositories: newRepositories });
  };

  const toggleWatch = (repoId) => {
    const newRepositories = repositories.map(repo => {
      if (repo.id === repoId) {
        const isWatched = repo.watched_by_user;
        return {
          ...repo,
          watched_by_user: !isWatched,
          watchers_count: isWatched ? repo.watchers_count - 1 : repo.watchers_count + 1
        };
      }
      return repo;
    });
    setRepositories(newRepositories);
    saveData({ repositories: newRepositories });
  };

  const forkRepository = (repoId) => {
    if (!currentUser) return;
    const originalRepo = repositories.find(r => r.id === repoId);
    if (!originalRepo) return;

    // Simulate fork
    const forkedRepo = {
      ...originalRepo,
      id: Math.max(0, ...repositories.map(r => r.id)) + 1,
      name: originalRepo.name,
      full_name: `${currentUser.login}/${originalRepo.name}`,
      owner: { login: currentUser.login, avatar_url: currentUser.avatar_url },
      fork: true,
      forks_count: 0,
      stargazers_count: 0,
      watchers_count: 0,
      starred_by_user: false,
      watched_by_user: false,
      created_at: new Date().toISOString()
    };
    
    // Copy files
    const originalFiles = repoFiles[originalRepo.full_name] || [];
    const newRepoFiles = {
        ...repoFiles,
        [forkedRepo.full_name]: [...originalFiles]
    };
    setRepoFiles(newRepoFiles);

    const newRepositories = [forkedRepo, ...repositories.map(r => 
        r.id === repoId ? { ...r, forks_count: r.forks_count + 1 } : r
    )];
    setRepositories(newRepositories);
    
    saveData({ repositories: newRepositories, repoFiles: newRepoFiles });
    
    return forkedRepo;
  };

  const login = async (username, password) => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (data.success) {
        setCurrentUser(data.user);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err) {
      console.error("Login failed:", err);
      return { success: false, error: "Network error" };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });
      const data = await response.json();
      if (data.success) {
        setCurrentUser(data.user);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err) {
      console.error("Registration failed:", err);
      return { success: false, error: "Network error" };
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const updateProfile = async (updates) => {
    if (!currentUser) return;
    try {
      const response = await fetch(`${API_URL}/user/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: currentUser.login, ...updates })
      });
      const data = await response.json();
      if (data.success) {
        setCurrentUser(data.user);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err) {
      console.error("Profile update failed:", err);
      return { success: false, error: "Network error" };
    }
  };

  return (
    <RepositoryContext.Provider value={{ 
        repositories, 
        currentUser,
        activity,
        trending,
        addRepository, 
        addFile, 
        updateFile,
        fetchRepoFileContent,
        saveRepoFileContent,
        getRepoFiles,
        toggleStar,
        toggleWatch,
        forkRepository,
        loading,
        login,
        register,
        logout,
        updateProfile
    }}>
      {children}
    </RepositoryContext.Provider>
  );
};

export const useRepositories = () => {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error("useRepositories must be used within a RepositoryProvider");
  }
  return context;
};
