const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const os = require('os');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const { execFile } = require('child_process');
const { promisify } = require('util');

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true
  }
});

const DATA_FILE = path.join(__dirname, 'data.json');
const STORAGE_DIR = path.join(__dirname, 'storage');
const execFileAsync = promisify(execFile);

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(session({
  secret: process.env.SESSION_SECRET || "dev-session-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false
  }
}));
app.use(bodyParser.json({ limit: '50mb' }));

// Helper to read data
const readData = () => {
  try {
    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(rawData);
    if (!data.users) data.users = [];
    if (!data.repositories) data.repositories = [];
    if (!data.repoFiles) data.repoFiles = {};
    if (!data.activity) data.activity = [];
    if (!data.trending) data.trending = [];
    return data;
  } catch (err) {
    console.error("Error reading data file:", err);
    return null;
  }
};

// Helper to write data
const writeData = (data) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error("Error writing data file:", err);
    return false;
  }
};

const ensureStorageDir = () => {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
};

const getGitRepoDir = (owner, repo) => {
  ensureStorageDir();
  const repoDir = path.join(STORAGE_DIR, owner, repo);
  if (!fs.existsSync(repoDir)) return null;
  if (!fs.existsSync(path.join(repoDir, ".git"))) return null;
  return repoDir;
};

const sanitizeSegment = (value) => {
  return String(value || "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 100);
};

const isPathInside = (parent, child) => {
  const rel = path.relative(parent, child);
  return rel && !rel.startsWith("..") && !path.isAbsolute(rel);
};

const buildRepoTree = (rootDir, options) => {
  const ignore = options.ignore || new Set();
  const maxFiles = options.maxFiles || 5000;
  const maxDepth = options.maxDepth || 25;
  let fileCount = 0;

  const walk = (dir, relativeDir, depth) => {
    if (depth > maxDepth) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const nodes = [];

    for (const entry of entries) {
      if (fileCount >= maxFiles) break;
      if (ignore.has(entry.name)) continue;

      const relPath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const children = walk(fullPath, relPath, depth + 1);
        nodes.push({
          name: entry.name,
          type: "folder",
          path: relPath,
          children
        });
        continue;
      }

      if (entry.isFile()) {
        fileCount += 1;
        nodes.push({
          name: entry.name,
          type: "file",
          path: relPath
        });
      }
    }

    return nodes;
  };

  return walk(rootDir, "", 0);
};

const getUniqueRepoName = (repositories, ownerLogin, baseName) => {
  const exists = (name) => repositories.some(r => r.full_name === `${ownerLogin}/${name}`);
  if (!exists(baseName)) return baseName;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${baseName}-${i}`;
    if (!exists(candidate)) return candidate;
  }
  return `${baseName}-${Date.now()}`;
};

// API Endpoints
app.get('/api/data', (req, res) => {
  const data = readData();
  if (data) {
    res.json(data);
  } else {
    res.status(500).json({ error: "Failed to read data" });
  }
});

app.post('/api/save', (req, res) => {
  const newData = req.body;
  if (!newData) {
    return res.status(400).json({ error: "No data provided" });
  }

  const existing = readData() || {};
  const merged = {
    ...existing,
    repositories: newData.repositories ?? existing.repositories,
    repoFiles: newData.repoFiles ?? existing.repoFiles,
    activity: newData.activity ?? existing.activity,
    trending: newData.trending ?? existing.trending,
    fileTree: newData.fileTree ?? existing.fileTree
  };

  const success = writeData(merged);
  if (!success) return res.status(500).json({ error: "Failed to save data" });
  io.emit('dataUpdated', merged);
  res.json({ success: true });
});

app.post('/api/repos/create', async (req, res) => {
  const ownerLogin = String(req.body?.ownerLogin || "").trim();
  const nameRaw = String(req.body?.name || "").trim();
  const description = String(req.body?.description || "");
  const isPrivate = !!req.body?.private;
  const initReadme = !!req.body?.initReadme;

  if (!ownerLogin) return res.status(400).json({ error: "ownerLogin is required" });
  if (!nameRaw) return res.status(400).json({ error: "name is required" });

  const data = readData();
  if (!data) return res.status(500).json({ error: "Server error" });
  if (!Array.isArray(data.users)) data.users = [];
  if (!Array.isArray(data.repositories)) data.repositories = [];
  if (!data.repoFiles) data.repoFiles = {};

  let ownerUser = data.users.find(u => u.login === ownerLogin);
  if (!ownerUser) {
    ownerUser = {
      login: ownerLogin,
      name: ownerLogin,
      email: `${ownerLogin}@users.noreply.github.com`,
      avatar_url: `https://github.com/${ownerLogin}.png`,
      bio: "",
      followers: 0,
      following: 0,
      location: "",
      blog: "",
      twitter_username: "",
      company: "",
      created_at: new Date().toISOString(),
      hireable: false
    };
    data.users.push(ownerUser);
  }

  ensureStorageDir();
  const ownerSegment = sanitizeSegment(ownerLogin);
  const baseName = sanitizeSegment(nameRaw);
  const repoName = getUniqueRepoName(data.repositories, ownerLogin, baseName);
  const fullName = `${ownerLogin}/${repoName}`;

  const ownerDir = path.join(STORAGE_DIR, ownerSegment);
  fs.mkdirSync(ownerDir, { recursive: true });
  const repoDir = path.join(ownerDir, sanitizeSegment(repoName));
  if (fs.existsSync(repoDir)) {
    const gitDir = path.join(repoDir, ".git");
    if (fs.existsSync(gitDir)) {
      return res.status(409).json({ error: "Repository already exists" });
    }
    try {
      fs.rmSync(repoDir, { recursive: true, force: true });
    } catch {
    }
  }
  fs.mkdirSync(repoDir, { recursive: true });

  try {
    try {
      await execFileAsync("git", ["init", "-b", "main"], { cwd: repoDir, windowsHide: true });
    } catch {
      await execFileAsync("git", ["init"], { cwd: repoDir, windowsHide: true });
      try {
        await execFileAsync("git", ["checkout", "-b", "main"], { cwd: repoDir, windowsHide: true });
      } catch {
      }
    }

    await execFileAsync("git", ["config", "user.name", ownerUser.login], { cwd: repoDir, windowsHide: true });
    await execFileAsync("git", ["config", "user.email", ownerUser.email || `${ownerUser.login}@users.noreply.github.com`], { cwd: repoDir, windowsHide: true });

    if (initReadme) {
      fs.writeFileSync(path.join(repoDir, "README.md"), `# ${repoName}\n\n${description || ""}\n`, "utf8");
      await execFileAsync("git", ["add", "-A"], { cwd: repoDir, windowsHide: true });
      try {
        await execFileAsync("git", ["commit", "-m", "Initial commit"], { cwd: repoDir, windowsHide: true });
      } catch {
      }
    }

    const tree = buildRepoTree(repoDir, {
      ignore: new Set([".git", "node_modules", "dist", "build", ".next", ".turbo"]),
      maxFiles: 15000,
      maxDepth: 40
    });

    const repoId = Math.max(0, ...data.repositories.map((r) => r.id || 0)) + 1;
    const nowIso = new Date().toISOString();
    const repoObj = {
      id: repoId,
      name: repoName,
      full_name: fullName,
      private: isPrivate,
      owner: {
        login: ownerLogin,
        avatar_url: ownerUser.avatar_url || `https://github.com/${ownerLogin}.png`
      },
      html_url: `https://github.com/${fullName}`,
      description,
      fork: false,
      url: `https://api.github.com/repos/${fullName}`,
      created_at: nowIso,
      updated_at: nowIso,
      pushed_at: nowIso,
      homepage: null,
      size: 0,
      stargazers_count: 0,
      watchers_count: 0,
      language: null,
      forks_count: 0,
      open_issues_count: 0,
      license: null,
      topics: [],
      visibility: isPrivate ? "private" : "public",
      default_branch: "main"
    };

    data.repositories = [repoObj, ...data.repositories];
    data.repoFiles[fullName] = tree;

    if (!writeData(data)) {
      return res.status(500).json({ error: "Failed to persist repository" });
    }

    io.emit('dataUpdated', data);
    res.json({ success: true, repo: repoObj });
  } catch (e) {
    res.status(500).json({ error: "Failed to create repository" });
  }
});

// Authentication Endpoints

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const data = readData();
  
  if (!data || !data.users) {
    return res.status(500).json({ error: "Server error" });
  }

  const user = data.users.find(u => (u.login === username || u.email === username) && u.password === password);
  
  if (user) {
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;
  const data = readData();

  if (!data) return res.status(500).json({ error: "Server error" });

  if (data.users.some(u => u.login === username)) {
    return res.status(400).json({ error: "Username already exists" });
  }
  if (data.users.some(u => u.email === email)) {
    return res.status(400).json({ error: "Email already exists" });
  }

  const newUser = {
    login: username,
    name: username,
    email,
    password, // Storing plaintext for demo
    avatar_url: `https://github.com/${username}.png`,
    bio: "",
    followers: 0,
    following: 0,
    location: "",
    blog: "",
    twitter_username: "",
    company: "",
    created_at: new Date().toISOString(),
    hireable: false
  };

  data.users.push(newUser);
  // Auto-login after register
  data.currentUser = { ...newUser };
  delete data.currentUser.password;

  if (writeData(data)) {
    // Notify clients of update (new user added)
    io.emit('dataUpdated', data);
    const { password, ...userWithoutPassword } = newUser;
    res.json({ success: true, user: userWithoutPassword });
  } else {
    res.status(500).json({ error: "Failed to save user" });
  }
});

app.post('/api/user/update', (req, res) => {
  const { login, ...updates } = req.body;
  const data = readData();

  if (!data) return res.status(500).json({ error: "Server error" });

  const userIndex = data.users.findIndex(u => u.login === login);
  if (userIndex === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  // Update user fields
  const updatedUser = { ...data.users[userIndex], ...updates };
  // Prevent password update via this endpoint for simplicity unless explicitly handled
  if (!updates.password) {
      updatedUser.password = data.users[userIndex].password; 
  }

  data.users[userIndex] = updatedUser;
  
  // If this is the current global user (legacy support), update it too
  if (data.currentUser && data.currentUser.login === login) {
      const { password, ...cleanUser } = updatedUser;
      data.currentUser = cleanUser;
  }

  if (writeData(data)) {
    io.emit('dataUpdated', data);
    const { password, ...userWithoutPassword } = updatedUser;
    res.json({ success: true, user: userWithoutPassword });
  } else {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

const getGitHubToken = (req) => {
  return req.session && req.session.githubToken ? req.session.githubToken : null;
};

const getGitHubViewer = async (token) => {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to fetch GitHub user");
  }
  return await res.json();
};

const ensureGitHubUpstream = async (owner, repo, token) => {
  const { data, repoObj } = getRepoRecord(owner, repo);
  if (!data || !repoObj) return { ok: false, status: 404, error: "Repository not found" };

  const existingFullName = repoObj?.source_full_name || repoObj?.imported_from || null;
  const existingCloneUrl = repoObj?.source_clone_url || (existingFullName ? `https://github.com/${existingFullName}.git` : null);
  if (existingCloneUrl && existingFullName) {
    return { ok: true, fullName: existingFullName, cloneUrl: existingCloneUrl };
  }

  if (!token) return { ok: false, status: 401, error: "GitHub token required to publish" };

  let viewer;
  try {
    viewer = await getGitHubViewer(token);
  } catch {
    return { ok: false, status: 401, error: "GitHub token is invalid" };
  }

  const viewerLogin = String(viewer?.login || "").trim();
  if (!viewerLogin) return { ok: false, status: 401, error: "GitHub token is invalid" };
  if (String(viewerLogin).toLowerCase() !== String(owner).toLowerCase()) {
    return { ok: false, status: 400, error: `Connected GitHub account (${viewerLogin}) does not match repository owner (${owner})` };
  }

  const payload = {
    name: repoObj.name,
    description: repoObj.description || "",
    private: !!repoObj.private,
    auto_init: false
  };

  const createRes = await fetch("https://api.github.com/user/repos", {
    method: "POST",
    headers: {
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: JSON.stringify(payload)
  });

  let created = null;
  if (createRes.ok) {
    created = await createRes.json().catch(() => null);
  } else if (createRes.status === 422) {
    created = null;
  } else {
    const text = await createRes.text().catch(() => "");
    return { ok: false, status: createRes.status, error: text || "Failed to create GitHub repository" };
  }

  const fullName = created?.full_name || `${viewerLogin}/${repoObj.name}`;
  const cloneUrl = created?.clone_url || `https://github.com/${fullName}.git`;
  const htmlUrl = created?.html_url || `https://github.com/${fullName}`;

  const repos = Array.isArray(data.repositories) ? data.repositories : [];
  const index = repos.findIndex(r => r.full_name === `${owner}/${repo}`);
  if (index !== -1) {
    repos[index] = {
      ...repos[index],
      html_url: repos[index].html_url || htmlUrl,
      url: repos[index].url || `https://api.github.com/repos/${fullName}`,
      source_full_name: fullName,
      imported_from: fullName,
      source_clone_url: cloneUrl,
      source_html_url: htmlUrl
    };
    data.repositories = repos;
    if (!writeData(data)) return { ok: false, status: 500, error: "Failed to persist repository settings" };
    io.emit("dataUpdated", data);
  }

  return { ok: true, fullName, cloneUrl };
};

app.get('/api/github/status', (req, res) => {
  const token = getGitHubToken(req);
  res.json({ connected: !!token, method: token ? (req.session.githubTokenMethod || "unknown") : null });
});

app.post('/api/github/oauth/pat', (req, res) => {
  const { token } = req.body || {};
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Token is required" });
  }
  req.session.githubToken = token;
  req.session.githubTokenMethod = "pat";
  res.json({ success: true });
});

app.get('/api/github/oauth/start', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: "GitHub OAuth is not configured" });
  }
  const state = Math.random().toString(36).slice(2);
  req.session.githubOAuthState = state;
  const redirectUri = process.env.GITHUB_CALLBACK_URL || `${process.env.BACKEND_URL || "http://localhost:3001"}/api/github/oauth/callback`;
  const scope = encodeURIComponent("repo read:user");
  const authorizeUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${encodeURIComponent(state)}`;
  res.redirect(authorizeUrl);
});

app.get('/api/github/oauth/callback', async (req, res) => {
  const { code, state } = req.query || {};
  const expectedState = req.session.githubOAuthState;

  if (!code || !state || !expectedState || state !== expectedState) {
    return res.status(400).send("Invalid OAuth state");
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(500).send("GitHub OAuth is not configured");
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.status(500).send("Failed to obtain access token");
    }
    req.session.githubToken = tokenData.access_token;
    req.session.githubTokenMethod = "oauth";
    res.redirect(`${FRONTEND_URL}/import`);
  } catch (e) {
    res.status(500).send("OAuth error");
  }
});

app.get('/api/github/repos', async (req, res) => {
  const token = getGitHubToken(req);
  if (!token) {
    return res.status(401).json({ error: "Not connected to GitHub" });
  }

  try {
    const ghRes = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });
    if (!ghRes.ok) {
      const text = await ghRes.text();
      return res.status(ghRes.status).json({ error: "GitHub API error", details: text });
    }
    const repos = await ghRes.json();
    const simplified = repos.map(r => ({
      id: r.id,
      full_name: r.full_name,
      private: r.private,
      html_url: r.html_url,
      clone_url: r.clone_url,
      description: r.description,
      language: r.language,
      stargazers_count: r.stargazers_count,
      forks_count: r.forks_count,
      updated_at: r.updated_at
    }));
    res.json({ repos: simplified });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch repositories" });
  }
});

app.post('/api/github/import', async (req, res) => {
  const { full_name, gitplusLogin, token: requestToken } = req.body || {};

  if (!full_name || typeof full_name !== "string") {
    return res.status(400).json({ error: "full_name is required" });
  }
  if (!gitplusLogin || typeof gitplusLogin !== "string") {
    return res.status(400).json({ error: "gitplusLogin is required" });
  }

  const token = requestToken || getGitHubToken(req);

  try {
    const ghHeaders = {
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
    if (token) ghHeaders.Authorization = `Bearer ${token}`;

    const ghRes = await fetch(`https://api.github.com/repos/${full_name}`, { headers: ghHeaders });
    if (!ghRes.ok) {
      const text = await ghRes.text();
      return res.status(ghRes.status).json({ error: "GitHub API error", details: text });
    }
    const ghRepo = await ghRes.json();

    const data = readData();
    if (!data) return res.status(500).json({ error: "Server error" });
    if (!data.repositories) data.repositories = [];
    if (!data.repoFiles) data.repoFiles = {};

    ensureStorageDir();
    const ownerSegment = sanitizeSegment(gitplusLogin);
    const baseName = sanitizeSegment(ghRepo.name);
    const repoName = getUniqueRepoName(data.repositories, gitplusLogin, baseName);
    const fullName = `${gitplusLogin}/${repoName}`;

    const ownerDir = path.join(STORAGE_DIR, ownerSegment);
    fs.mkdirSync(ownerDir, { recursive: true });
    const repoDir = path.join(ownerDir, sanitizeSegment(repoName));

    if (fs.existsSync(repoDir)) {
      fs.rmSync(repoDir, { recursive: true, force: true });
    }

    let cloneUrl = ghRepo.clone_url;
    if (token && typeof cloneUrl === "string") {
      const authedToken = encodeURIComponent(token);
      cloneUrl = cloneUrl.replace(/^https:\/\//i, `https://x-access-token:${authedToken}@`);
    }

    await execFileAsync("git", ["clone", "--depth", "1", cloneUrl, repoDir], { windowsHide: true });

    const tree = buildRepoTree(repoDir, {
      ignore: new Set([".git", "node_modules", "dist", "build", ".next", ".turbo"]),
      maxFiles: 15000,
      maxDepth: 40
    });

    const repoId = Math.max(0, ...data.repositories.map((r) => r.id || 0)) + 1;
    const nowIso = new Date().toISOString();
    const repoObj = {
      id: repoId,
      name: repoName,
      full_name: fullName,
      private: false,
      owner: {
        login: gitplusLogin,
        avatar_url: data.users?.find(u => u.login === gitplusLogin)?.avatar_url || `https://github.com/${gitplusLogin}.png`
      },
      html_url: ghRepo.html_url,
      description: ghRepo.description || "",
      fork: !!ghRepo.fork,
      url: ghRepo.url,
      created_at: nowIso,
      updated_at: nowIso,
      pushed_at: nowIso,
      homepage: ghRepo.homepage || null,
      size: ghRepo.size || 0,
      stargazers_count: ghRepo.stargazers_count || 0,
      watchers_count: ghRepo.watchers_count || 0,
      language: ghRepo.language || null,
      forks_count: ghRepo.forks_count || 0,
      open_issues_count: ghRepo.open_issues_count || 0,
      license: ghRepo.license || null,
      topics: ghRepo.topics || [],
      visibility: "public",
      default_branch: ghRepo.default_branch || "main",
      imported_from: ghRepo.full_name,
      source_full_name: ghRepo.full_name,
      source_html_url: ghRepo.html_url,
      source_clone_url: ghRepo.clone_url
    };

    data.repositories = [repoObj, ...data.repositories];
    data.repoFiles[fullName] = tree;

    if (!writeData(data)) {
      return res.status(500).json({ error: "Failed to persist imported repo" });
    }

    io.emit('dataUpdated', data);
    res.json({ success: true, repo: repoObj });
  } catch (e) {
    res.status(500).json({ error: "Import failed" });
  }
});

app.get('/api/repos/:owner/:repo/file', (req, res) => {
  const owner = sanitizeSegment(req.params.owner);
  const repo = sanitizeSegment(req.params.repo);
  const requestedPath = String(req.query.path || "");
  if (!requestedPath) {
    return res.status(400).json({ error: "path is required" });
  }

  const repoDir = getGitRepoDir(owner, repo);
  if (!repoDir) return res.status(404).json({ error: "Repository not found" });
  const absolutePath = path.resolve(repoDir, requestedPath);
  if (!isPathInside(repoDir, absolutePath)) {
    return res.status(400).json({ error: "Invalid path" });
  }

  try {
    const stat = fs.statSync(absolutePath);
    if (!stat.isFile()) return res.status(400).json({ error: "Not a file" });
    if (stat.size > 1024 * 1024) return res.status(413).json({ error: "File too large" });
    const buffer = fs.readFileSync(absolutePath);
    const slice = buffer.subarray(0, Math.min(buffer.length, 8000));
    for (const byte of slice) {
      if (byte === 0) return res.status(415).json({ error: "Binary file not supported" });
    }
    res.json({ content: buffer.toString("utf8") });
  } catch (e) {
    res.status(404).json({ error: "File not found" });
  }
});

const persistRepoTree = (owner, repo) => {
  const fullName = `${owner}/${repo}`;
  const data = readData();
  if (!data) return null;
  if (!data.repoFiles) data.repoFiles = {};

  const repoDir = getGitRepoDir(owner, repo);
  if (!repoDir) return null;
  const tree = buildRepoTree(repoDir, {
    ignore: new Set([".git", "node_modules", "dist", "build", ".next", ".turbo"]),
    maxFiles: 15000,
    maxDepth: 40
  });
  data.repoFiles[fullName] = tree;

  const repoIndex = Array.isArray(data.repositories) ? data.repositories.findIndex(r => r.full_name === fullName) : -1;
  if (repoIndex !== -1) {
    const nowIso = new Date().toISOString();
    data.repositories[repoIndex] = {
      ...data.repositories[repoIndex],
      updated_at: nowIso,
      pushed_at: nowIso
    };
  }

  if (!writeData(data)) return null;
  io.emit('dataUpdated', data);
  return tree;
};

app.post('/api/repos/:owner/:repo/file', (req, res) => {
  const owner = sanitizeSegment(req.params.owner);
  const repo = sanitizeSegment(req.params.repo);
  const requestedPath = String(req.body?.path || "");
  const content = req.body?.content;

  if (!requestedPath) return res.status(400).json({ error: "path is required" });
  if (typeof content !== "string") return res.status(400).json({ error: "content must be a string" });
  if (content.length > 1024 * 1024) return res.status(413).json({ error: "File too large" });

  const repoDir = getGitRepoDir(owner, repo);
  if (!repoDir) return res.status(404).json({ error: "Repository not found" });
  const absolutePath = path.resolve(repoDir, requestedPath);
  if (!isPathInside(repoDir, absolutePath)) {
    return res.status(400).json({ error: "Invalid path" });
  }
  if (absolutePath.includes(`${path.sep}.git${path.sep}`) || absolutePath.endsWith(`${path.sep}.git`)) {
    return res.status(400).json({ error: "Invalid path" });
  }

  try {
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    if (fs.existsSync(absolutePath)) return res.status(409).json({ error: "File already exists" });
    fs.writeFileSync(absolutePath, content, "utf8");

    const tree = persistRepoTree(owner, repo);
    if (!tree) return res.status(500).json({ error: "Failed to persist repo tree" });
    res.json({ success: true, tree });
  } catch (e) {
    res.status(500).json({ error: "Failed to create file" });
  }
});

app.put('/api/repos/:owner/:repo/file', (req, res) => {
  const owner = sanitizeSegment(req.params.owner);
  const repo = sanitizeSegment(req.params.repo);
  const requestedPath = String(req.body?.path || "");
  const content = req.body?.content;

  if (!requestedPath) return res.status(400).json({ error: "path is required" });
  if (typeof content !== "string") return res.status(400).json({ error: "content must be a string" });
  if (content.length > 1024 * 1024) return res.status(413).json({ error: "File too large" });

  const repoDir = getGitRepoDir(owner, repo);
  if (!repoDir) return res.status(404).json({ error: "Repository not found" });
  const absolutePath = path.resolve(repoDir, requestedPath);
  if (!isPathInside(repoDir, absolutePath)) {
    return res.status(400).json({ error: "Invalid path" });
  }
  if (absolutePath.includes(`${path.sep}.git${path.sep}`) || absolutePath.endsWith(`${path.sep}.git`)) {
    return res.status(400).json({ error: "Invalid path" });
  }

  try {
    const stat = fs.statSync(absolutePath);
    if (!stat.isFile()) return res.status(400).json({ error: "Not a file" });
    fs.writeFileSync(absolutePath, content, "utf8");
    const tree = persistRepoTree(owner, repo);
    if (!tree) return res.status(500).json({ error: "Failed to persist repo tree" });
    res.json({ success: true, tree });
  } catch (e) {
    res.status(404).json({ error: "File not found" });
  }
});

app.delete('/api/repos/:owner/:repo/file', (req, res) => {
  const owner = sanitizeSegment(req.params.owner);
  const repo = sanitizeSegment(req.params.repo);
  const requestedPath = String(req.query.path || "");
  if (!requestedPath) return res.status(400).json({ error: "path is required" });

  const repoDir = getGitRepoDir(owner, repo);
  if (!repoDir) return res.status(404).json({ error: "Repository not found" });
  const absolutePath = path.resolve(repoDir, requestedPath);
  if (!isPathInside(repoDir, absolutePath)) {
    return res.status(400).json({ error: "Invalid path" });
  }
  if (absolutePath.includes(`${path.sep}.git${path.sep}`) || absolutePath.endsWith(`${path.sep}.git`)) {
    return res.status(400).json({ error: "Invalid path" });
  }

  try {
    const stat = fs.statSync(absolutePath);
    if (!stat.isFile()) return res.status(400).json({ error: "Not a file" });
    fs.rmSync(absolutePath, { force: true });
    const tree = persistRepoTree(owner, repo);
    if (!tree) return res.status(500).json({ error: "Failed to persist repo tree" });
    res.json({ success: true, tree });
  } catch (e) {
    res.status(404).json({ error: "File not found" });
  }
});

const getRepoRecord = (owner, repo) => {
  const data = readData();
  if (!data || !Array.isArray(data.repositories)) return { data: null, repoObj: null };
  const fullName = `${owner}/${repo}`;
  const repoObj = data.repositories.find(r => r.full_name === fullName) || null;
  return { data, repoObj };
};

app.get('/api/repos/:owner/:repo/status', async (req, res) => {
  const owner = sanitizeSegment(req.params.owner);
  const repo = sanitizeSegment(req.params.repo);
  const repoDir = getGitRepoDir(owner, repo);
  if (!repoDir) return res.status(404).json({ error: "Repository not found" });

  try {
    const { stdout: branchStdout } = await execFileAsync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: repoDir, windowsHide: true });
    const { stdout: statusStdout } = await execFileAsync("git", ["status", "--porcelain"], { cwd: repoDir, windowsHide: true });
    const branch = String(branchStdout || "").trim() || "HEAD";
    const lines = String(statusStdout || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    res.json({ branch, dirty: lines.length > 0, changes: lines });
  } catch (e) {
    res.status(500).json({ error: "Failed to read git status" });
  }
});

app.post('/api/repos/:owner/:repo/commit', async (req, res) => {
  const owner = sanitizeSegment(req.params.owner);
  const repo = sanitizeSegment(req.params.repo);
  const message = String(req.body?.message || "").trim();
  const authorLogin = String(req.body?.authorLogin || "").trim();

  if (!message) return res.status(400).json({ error: "message is required" });

  const repoDir = getGitRepoDir(owner, repo);
  if (!repoDir) return res.status(404).json({ error: "Repository not found" });

  try {
    const { data } = getRepoRecord(owner, repo);
    const user = data?.users?.find(u => u.login === authorLogin) || null;

    if (user) {
      await execFileAsync("git", ["config", "user.name", user.login], { cwd: repoDir, windowsHide: true });
      await execFileAsync("git", ["config", "user.email", user.email || `${user.login}@users.noreply.github.com`], { cwd: repoDir, windowsHide: true });
    }

    const { stdout: statusStdout } = await execFileAsync("git", ["status", "--porcelain"], { cwd: repoDir, windowsHide: true });
    const hasChanges = String(statusStdout || "").trim().length > 0;
    if (!hasChanges) return res.status(400).json({ error: "Nothing to commit" });

    await execFileAsync("git", ["add", "-A"], { cwd: repoDir, windowsHide: true });
    await execFileAsync("git", ["commit", "-m", message], { cwd: repoDir, windowsHide: true });
    const { stdout: hashStdout } = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: repoDir, windowsHide: true });
    persistRepoTree(owner, repo);
    res.json({ success: true, hash: String(hashStdout || "").trim() });
  } catch (e) {
    res.status(500).json({ error: "Commit failed" });
  }
});

app.post('/api/repos/:owner/:repo/pull', async (req, res) => {
  const owner = sanitizeSegment(req.params.owner);
  const repo = sanitizeSegment(req.params.repo);
  const repoDir = getGitRepoDir(owner, repo);
  if (!repoDir) return res.status(404).json({ error: "Repository not found" });

  try {
    const { stdout: remotesStdout } = await execFileAsync("git", ["remote"], { cwd: repoDir, windowsHide: true });
    const remotes = String(remotesStdout || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (!remotes.includes("origin")) {
      return res.json({ success: true, message: "No remote configured" });
    }

    const { stdout } = await execFileAsync("git", ["pull", "--rebase"], { cwd: repoDir, windowsHide: true });
    persistRepoTree(owner, repo);
    res.json({ success: true, output: String(stdout || "") });
  } catch (e) {
    res.status(500).json({ error: "Pull failed" });
  }
});

app.post('/api/repos/:owner/:repo/push', async (req, res) => {
  const owner = sanitizeSegment(req.params.owner);
  const repo = sanitizeSegment(req.params.repo);
  const repoDir = getGitRepoDir(owner, repo);
  if (!repoDir) return res.status(404).json({ error: "Repository not found" });

  const token = getGitHubToken(req);

  try {
    const { data, repoObj } = getRepoRecord(owner, repo);
    let upstreamFullName = repoObj?.source_full_name || repoObj?.imported_from || null;
    let upstreamCloneUrl = repoObj?.source_clone_url || (upstreamFullName ? `https://github.com/${upstreamFullName}.git` : null);

    const { stdout: remotesStdout } = await execFileAsync("git", ["remote"], { cwd: repoDir, windowsHide: true });
    const remotes = String(remotesStdout || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);

    if (!upstreamCloneUrl) {
      const ensured = await ensureGitHubUpstream(owner, repo, token);
      if (!ensured.ok) return res.status(ensured.status || 500).json({ error: ensured.error || "Failed to publish repository" });
      upstreamFullName = ensured.fullName;
      upstreamCloneUrl = ensured.cloneUrl;
    } else if (!token) {
      return res.status(401).json({ error: "GitHub token required to push" });
    }

    if (!remotes.includes("origin") && upstreamCloneUrl) {
      await execFileAsync("git", ["remote", "add", "origin", upstreamCloneUrl], { cwd: repoDir, windowsHide: true });
    }

    const authedToken = encodeURIComponent(token);
    const authedUrl = upstreamCloneUrl.replace(/^https:\/\//i, `https://x-access-token:${authedToken}@`);

    const { stdout: prevUrlStdout } = await execFileAsync("git", ["remote", "get-url", "origin"], { cwd: repoDir, windowsHide: true });
    const prevUrl = String(prevUrlStdout || "").trim();

    await execFileAsync("git", ["remote", "set-url", "origin", authedUrl], { cwd: repoDir, windowsHide: true });
    try {
      const { stdout } = await execFileAsync("git", ["push", "origin", "HEAD"], { cwd: repoDir, windowsHide: true });
      persistRepoTree(owner, repo);
      res.json({ success: true, output: String(stdout || "") });
    } finally {
      if (prevUrl) {
        try {
          await execFileAsync("git", ["remote", "set-url", "origin", prevUrl], { cwd: repoDir, windowsHide: true });
        } catch {
        }
      }
    }
  } catch (e) {
    res.status(500).json({ error: "Push failed" });
  }
});

app.get('/api/repos/:owner/:repo/archive.zip', async (req, res) => {
  const owner = sanitizeSegment(req.params.owner);
  const repo = sanitizeSegment(req.params.repo);
  const repoDir = getGitRepoDir(owner, repo);
  if (!repoDir) return res.status(404).json({ error: "Repository not found" });

  const safeName = `${owner}-${repo}`.replace(/[^a-zA-Z0-9._-]/g, "_");
  const tmpPath = path.join(os.tmpdir(), `gitplus-${safeName}-${Date.now()}.zip`);

  try {
    await execFileAsync("git", ["archive", "--format=zip", `--output=${tmpPath}`, "HEAD"], { cwd: repoDir, windowsHide: true });
    res.setHeader("Content-Type", "application/zip");
    res.download(tmpPath, `${safeName}.zip`, (err) => {
      try {
        fs.rmSync(tmpPath, { force: true });
      } catch {
      }
      if (err) {
        try {
          res.end();
        } catch {
        }
      }
    });
  } catch (e) {
    try {
      fs.rmSync(tmpPath, { force: true });
    } catch {
    }
    res.status(500).json({ error: "Failed to create archive" });
  }
});

const sanitizeRef = (ref) => {
  const value = String(ref || "").trim();
  if (!value) return "HEAD";
  if (value.length > 200) return null;
  if (!/^[a-zA-Z0-9._/\-]+$/.test(value)) return null;
  if (value.includes("..")) return null;
  if (value.startsWith("-")) return null;
  return value;
};

const CONTRIBUTION_CACHE_TTL_MS = 60_000;
const contributionCache = new Map();

const formatDateYYYYMMDD = (date) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

app.get('/api/users/:login/contributions', async (req, res) => {
  const loginRaw = String(req.params.login || "").trim();
  if (!loginRaw) return res.status(400).json({ error: "login is required" });
  if (loginRaw.length > 100) return res.status(400).json({ error: "login is too long" });

  const daysRaw = Number(req.query.days || 365);
  const days = Number.isFinite(daysRaw) ? Math.max(1, Math.min(730, Math.floor(daysRaw))) : 365;

  const cacheKey = `${loginRaw.toLowerCase()}|${days}`;
  const cached = contributionCache.get(cacheKey);
  if (cached && (Date.now() - cached.ts) < CONTRIBUTION_CACHE_TTL_MS) {
    return res.json(cached.data);
  }

  ensureStorageDir();
  const data = readData();
  if (!data || !Array.isArray(data.repositories)) {
    return res.status(500).json({ error: "Server error" });
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (days - 1));
  const startKey = formatDateYYYYMMDD(startDate);

  const countsByDate = new Map();
  for (let i = 0; i < days; i += 1) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    countsByDate.set(formatDateYYYYMMDD(d), 0);
  }

  const addRepoCounts = async (repoDir) => {
    const gitDir = path.join(repoDir, ".git");
    if (!fs.existsSync(gitDir)) return;
    try {
      const { stdout } = await execFileAsync("git", [
        "log",
        `--since=${startKey}`,
        "--date=short",
        "--pretty=format:%ad",
        "--regexp-ignore-case",
        `--author=${loginRaw}`
      ], { cwd: repoDir, windowsHide: true });

      const dates = String(stdout || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      for (const dateKey of dates) {
        if (!countsByDate.has(dateKey)) continue;
        countsByDate.set(dateKey, (countsByDate.get(dateKey) || 0) + 1);
      }
    } catch (e) {
    }
  };

  for (const repo of data.repositories) {
    const repoOwner = sanitizeSegment(repo?.owner?.login);
    const repoName = sanitizeSegment(repo?.name);
    if (!repoOwner || !repoName) continue;
    const repoDir = path.join(STORAGE_DIR, repoOwner, repoName);
    await addRepoCounts(repoDir);
  }

  let total = 0;
  let max = 0;
  const daysList = Array.from(countsByDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => {
      total += count;
      if (count > max) max = count;
      return { date, count };
    });

  const payload = { login: loginRaw, total, max, days: daysList };
  contributionCache.set(cacheKey, { ts: Date.now(), data: payload });
  res.json(payload);
});

const ensureRepoModules = (data) => {
  if (!data.issuesByRepo) data.issuesByRepo = {};
  if (!data.pullsByRepo) data.pullsByRepo = {};
  if (!data.projectsByRepo) data.projectsByRepo = {};
  if (!data.securityByRepo) data.securityByRepo = {};
  if (!data.actionsByRepo) data.actionsByRepo = {};
};

const getRepoFullNameFromParams = (req) => `${sanitizeSegment(req.params.owner)}/${sanitizeSegment(req.params.repo)}`;

const addRepoAction = (data, fullName, event) => {
  ensureRepoModules(data);
  if (!Array.isArray(data.actionsByRepo[fullName])) data.actionsByRepo[fullName] = [];
  const id = Math.max(0, ...data.actionsByRepo[fullName].map(e => e.id || 0)) + 1;
  data.actionsByRepo[fullName] = [{
    id,
    created_at: new Date().toISOString(),
    ...event
  }, ...data.actionsByRepo[fullName]].slice(0, 500);
};

app.get('/api/repos/:owner/:repo/issues', (req, res) => {
  const fullName = getRepoFullNameFromParams(req);
  const data = readData();
  if (!data) return res.status(500).json({ error: "Server error" });
  ensureRepoModules(data);
  const issues = Array.isArray(data.issuesByRepo[fullName]) ? data.issuesByRepo[fullName] : [];
  res.json({ issues });
});

app.post('/api/repos/:owner/:repo/issues', (req, res) => {
  const fullName = getRepoFullNameFromParams(req);
  const title = String(req.body?.title || "").trim();
  const body = String(req.body?.body || "");
  const author = String(req.body?.author || "").trim();
  if (!title) return res.status(400).json({ error: "title is required" });

  const data = readData();
  if (!data) return res.status(500).json({ error: "Server error" });
  ensureRepoModules(data);
  if (!Array.isArray(data.issuesByRepo[fullName])) data.issuesByRepo[fullName] = [];

  const nextNumber = Math.max(0, ...data.issuesByRepo[fullName].map(i => i.number || 0)) + 1;
  const nowIso = new Date().toISOString();
  const issue = {
    id: nextNumber,
    number: nextNumber,
    title,
    body,
    state: "open",
    author,
    created_at: nowIso,
    updated_at: nowIso
  };

  data.issuesByRepo[fullName] = [issue, ...data.issuesByRepo[fullName]];
  addRepoAction(data, fullName, { type: "Issue", message: `Opened issue #${nextNumber}: ${title}`, actor: author || null });

  if (!writeData(data)) return res.status(500).json({ error: "Failed to save issue" });
  io.emit('dataUpdated', data);
  res.json({ success: true, issue });
});

app.patch('/api/repos/:owner/:repo/issues/:number', (req, res) => {
  const fullName = getRepoFullNameFromParams(req);
  const number = Number(req.params.number);
  const state = String(req.body?.state || "").trim();
  const actor = String(req.body?.actor || "").trim();
  if (!Number.isFinite(number)) return res.status(400).json({ error: "Invalid issue number" });
  if (state !== "open" && state !== "closed") return res.status(400).json({ error: "Invalid state" });

  const data = readData();
  if (!data) return res.status(500).json({ error: "Server error" });
  ensureRepoModules(data);
  const issues = Array.isArray(data.issuesByRepo[fullName]) ? data.issuesByRepo[fullName] : [];
  const idx = issues.findIndex(i => Number(i.number) === number);
  if (idx === -1) return res.status(404).json({ error: "Issue not found" });

  const nowIso = new Date().toISOString();
  issues[idx] = { ...issues[idx], state, updated_at: nowIso };
  data.issuesByRepo[fullName] = issues;
  addRepoAction(data, fullName, { type: "Issue", message: `${state === "closed" ? "Closed" : "Reopened"} issue #${number}`, actor: actor || null });

  if (!writeData(data)) return res.status(500).json({ error: "Failed to save issue" });
  io.emit('dataUpdated', data);
  res.json({ success: true, issue: issues[idx] });
});

app.get('/api/repos/:owner/:repo/pulls', (req, res) => {
  const fullName = getRepoFullNameFromParams(req);
  const data = readData();
  if (!data) return res.status(500).json({ error: "Server error" });
  ensureRepoModules(data);
  const pulls = Array.isArray(data.pullsByRepo[fullName]) ? data.pullsByRepo[fullName] : [];
  res.json({ pulls });
});

app.post('/api/repos/:owner/:repo/pulls', (req, res) => {
  const fullName = getRepoFullNameFromParams(req);
  const title = String(req.body?.title || "").trim();
  const body = String(req.body?.body || "");
  const author = String(req.body?.author || "").trim();
  const head = String(req.body?.head || "").trim();
  const base = String(req.body?.base || "").trim();
  if (!title) return res.status(400).json({ error: "title is required" });
  if (!head) return res.status(400).json({ error: "head is required" });
  if (!base) return res.status(400).json({ error: "base is required" });

  const data = readData();
  if (!data) return res.status(500).json({ error: "Server error" });
  ensureRepoModules(data);
  if (!Array.isArray(data.pullsByRepo[fullName])) data.pullsByRepo[fullName] = [];

  const nextNumber = Math.max(0, ...data.pullsByRepo[fullName].map(p => p.number || 0)) + 1;
  const nowIso = new Date().toISOString();
  const pr = {
    id: nextNumber,
    number: nextNumber,
    title,
    body,
    state: "open",
    merged: false,
    author,
    head,
    base,
    created_at: nowIso,
    updated_at: nowIso
  };

  data.pullsByRepo[fullName] = [pr, ...data.pullsByRepo[fullName]];
  addRepoAction(data, fullName, { type: "PullRequest", message: `Opened pull request #${nextNumber}: ${title}`, actor: author || null });

  if (!writeData(data)) return res.status(500).json({ error: "Failed to save pull request" });
  io.emit('dataUpdated', data);
  res.json({ success: true, pull: pr });
});

app.patch('/api/repos/:owner/:repo/pulls/:number', (req, res) => {
  const fullName = getRepoFullNameFromParams(req);
  const number = Number(req.params.number);
  const state = req.body?.state !== undefined ? String(req.body?.state || "").trim() : null;
  const merged = req.body?.merged !== undefined ? !!req.body?.merged : null;
  const actor = String(req.body?.actor || "").trim();

  if (!Number.isFinite(number)) return res.status(400).json({ error: "Invalid pull request number" });

  const data = readData();
  if (!data) return res.status(500).json({ error: "Server error" });
  ensureRepoModules(data);
  const pulls = Array.isArray(data.pullsByRepo[fullName]) ? data.pullsByRepo[fullName] : [];
  const idx = pulls.findIndex(p => Number(p.number) === number);
  if (idx === -1) return res.status(404).json({ error: "Pull request not found" });

  const nowIso = new Date().toISOString();
  let updated = { ...pulls[idx], updated_at: nowIso };
  if (state) {
    if (state !== "open" && state !== "closed") return res.status(400).json({ error: "Invalid state" });
    updated.state = state;
  }
  if (merged !== null) updated.merged = merged;

  pulls[idx] = updated;
  data.pullsByRepo[fullName] = pulls;

  if (merged) {
    addRepoAction(data, fullName, { type: "PullRequest", message: `Merged pull request #${number}`, actor: actor || null });
  } else if (state === "closed") {
    addRepoAction(data, fullName, { type: "PullRequest", message: `Closed pull request #${number}`, actor: actor || null });
  } else if (state === "open") {
    addRepoAction(data, fullName, { type: "PullRequest", message: `Reopened pull request #${number}`, actor: actor || null });
  }

  if (!writeData(data)) return res.status(500).json({ error: "Failed to save pull request" });
  io.emit('dataUpdated', data);
  res.json({ success: true, pull: updated });
});

app.get('/api/repos/:owner/:repo/projects', (req, res) => {
  const fullName = getRepoFullNameFromParams(req);
  const data = readData();
  if (!data) return res.status(500).json({ error: "Server error" });
  ensureRepoModules(data);
  const projects = Array.isArray(data.projectsByRepo[fullName]) ? data.projectsByRepo[fullName] : [];
  res.json({ projects });
});

app.post('/api/repos/:owner/:repo/projects', (req, res) => {
  const fullName = getRepoFullNameFromParams(req);
  const name = String(req.body?.name || "").trim();
  const actor = String(req.body?.actor || "").trim();
  if (!name) return res.status(400).json({ error: "name is required" });

  const data = readData();
  if (!data) return res.status(500).json({ error: "Server error" });
  ensureRepoModules(data);
  if (!Array.isArray(data.projectsByRepo[fullName])) data.projectsByRepo[fullName] = [];
  const nextId = Math.max(0, ...data.projectsByRepo[fullName].map(p => p.id || 0)) + 1;
  const nowIso = new Date().toISOString();
  const project = {
    id: nextId,
    name,
    created_at: nowIso,
    updated_at: nowIso,
    columns: [
      { id: 1, name: "Todo", cards: [] },
      { id: 2, name: "In progress", cards: [] },
      { id: 3, name: "Done", cards: [] }
    ]
  };
  data.projectsByRepo[fullName] = [project, ...data.projectsByRepo[fullName]];
  addRepoAction(data, fullName, { type: "Project", message: `Created project: ${name}`, actor: actor || null });
  if (!writeData(data)) return res.status(500).json({ error: "Failed to save project" });
  io.emit('dataUpdated', data);
  res.json({ success: true, project });
});

app.put('/api/repos/:owner/:repo/projects/:id', (req, res) => {
  const fullName = getRepoFullNameFromParams(req);
  const id = Number(req.params.id);
  const actor = String(req.body?.actor || "").trim();
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid project id" });

  const data = readData();
  if (!data) return res.status(500).json({ error: "Server error" });
  ensureRepoModules(data);
  const projects = Array.isArray(data.projectsByRepo[fullName]) ? data.projectsByRepo[fullName] : [];
  const idx = projects.findIndex(p => Number(p.id) === id);
  if (idx === -1) return res.status(404).json({ error: "Project not found" });

  const nowIso = new Date().toISOString();
  projects[idx] = {
    ...projects[idx],
    name: typeof req.body?.name === "string" ? req.body.name : projects[idx].name,
    columns: Array.isArray(req.body?.columns) ? req.body.columns : projects[idx].columns,
    updated_at: nowIso
  };
  data.projectsByRepo[fullName] = projects;
  addRepoAction(data, fullName, { type: "Project", message: `Updated project #${id}`, actor: actor || null });
  if (!writeData(data)) return res.status(500).json({ error: "Failed to save project" });
  io.emit('dataUpdated', data);
  res.json({ success: true, project: projects[idx] });
});

app.get('/api/repos/:owner/:repo/security', (req, res) => {
  const fullName = getRepoFullNameFromParams(req);
  const data = readData();
  if (!data) return res.status(500).json({ error: "Server error" });
  ensureRepoModules(data);
  const alerts = Array.isArray(data.securityByRepo[fullName]) ? data.securityByRepo[fullName] : [];
  res.json({ alerts });
});

app.post('/api/repos/:owner/:repo/security', (req, res) => {
  const fullName = getRepoFullNameFromParams(req);
  const title = String(req.body?.title || "").trim();
  const severity = String(req.body?.severity || "medium").trim();
  const actor = String(req.body?.actor || "").trim();
  if (!title) return res.status(400).json({ error: "title is required" });
  if (!["low", "medium", "high", "critical"].includes(severity)) return res.status(400).json({ error: "Invalid severity" });

  const data = readData();
  if (!data) return res.status(500).json({ error: "Server error" });
  ensureRepoModules(data);
  if (!Array.isArray(data.securityByRepo[fullName])) data.securityByRepo[fullName] = [];
  const nextId = Math.max(0, ...data.securityByRepo[fullName].map(a => a.id || 0)) + 1;
  const nowIso = new Date().toISOString();
  const alert = { id: nextId, title, severity, state: "open", created_at: nowIso, updated_at: nowIso };
  data.securityByRepo[fullName] = [alert, ...data.securityByRepo[fullName]];
  addRepoAction(data, fullName, { type: "Security", message: `Opened security alert: ${title}`, actor: actor || null });
  if (!writeData(data)) return res.status(500).json({ error: "Failed to save alert" });
  io.emit('dataUpdated', data);
  res.json({ success: true, alert });
});

app.patch('/api/repos/:owner/:repo/security/:id', (req, res) => {
  const fullName = getRepoFullNameFromParams(req);
  const id = Number(req.params.id);
  const state = String(req.body?.state || "").trim();
  const actor = String(req.body?.actor || "").trim();
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid alert id" });
  if (state !== "open" && state !== "resolved") return res.status(400).json({ error: "Invalid state" });

  const data = readData();
  if (!data) return res.status(500).json({ error: "Server error" });
  ensureRepoModules(data);
  const alerts = Array.isArray(data.securityByRepo[fullName]) ? data.securityByRepo[fullName] : [];
  const idx = alerts.findIndex(a => Number(a.id) === id);
  if (idx === -1) return res.status(404).json({ error: "Alert not found" });
  const nowIso = new Date().toISOString();
  alerts[idx] = { ...alerts[idx], state: state === "resolved" ? "closed" : "open", updated_at: nowIso };
  data.securityByRepo[fullName] = alerts;
  addRepoAction(data, fullName, { type: "Security", message: `${state === "resolved" ? "Resolved" : "Reopened"} security alert #${id}`, actor: actor || null });
  if (!writeData(data)) return res.status(500).json({ error: "Failed to save alert" });
  io.emit('dataUpdated', data);
  res.json({ success: true, alert: alerts[idx] });
});

app.get('/api/repos/:owner/:repo/actions', (req, res) => {
  const fullName = getRepoFullNameFromParams(req);
  const data = readData();
  if (!data) return res.status(500).json({ error: "Server error" });
  ensureRepoModules(data);
  const actions = Array.isArray(data.actionsByRepo[fullName]) ? data.actionsByRepo[fullName] : [];
  res.json({ actions });
});

app.patch('/api/repos/:owner/:repo/settings', (req, res) => {
  const owner = sanitizeSegment(req.params.owner);
  const repo = sanitizeSegment(req.params.repo);
  const fullName = `${owner}/${repo}`;
  const description = req.body?.description;
  const visibility = req.body?.visibility;

  const data = readData();
  if (!data || !Array.isArray(data.repositories)) return res.status(500).json({ error: "Server error" });
  const idx = data.repositories.findIndex(r => r.full_name === fullName);
  if (idx === -1) return res.status(404).json({ error: "Repository not found" });

  const nowIso = new Date().toISOString();
  const next = { ...data.repositories[idx], updated_at: nowIso };
  if (typeof description === "string") next.description = description;
  if (visibility === "public" || visibility === "private") {
    next.visibility = visibility;
    next.private = visibility === "private";
  }
  data.repositories[idx] = next;

  if (!writeData(data)) return res.status(500).json({ error: "Failed to save settings" });
  io.emit('dataUpdated', data);
  res.json({ success: true, repo: next });
});

app.delete('/api/repos/:owner/:repo', (req, res) => {
  const owner = sanitizeSegment(req.params.owner);
  const repo = sanitizeSegment(req.params.repo);
  const fullName = `${owner}/${repo}`;

  const data = readData();
  if (!data) return res.status(500).json({ error: "Server error" });
  if (!Array.isArray(data.repositories)) data.repositories = [];
  if (!data.repoFiles) data.repoFiles = {};

  const repoIndex = data.repositories.findIndex(r => r.full_name === fullName);
  if (repoIndex === -1) return res.status(404).json({ error: "Repository not found" });

  data.repositories.splice(repoIndex, 1);
  delete data.repoFiles[fullName];
  ensureRepoModules(data);
  delete data.issuesByRepo[fullName];
  delete data.pullsByRepo[fullName];
  delete data.projectsByRepo[fullName];
  delete data.securityByRepo[fullName];
  delete data.actionsByRepo[fullName];

  ensureStorageDir();
  const repoDir = path.join(STORAGE_DIR, owner, repo);
  try {
    fs.rmSync(repoDir, { recursive: true, force: true });
  } catch {
  }

  if (!writeData(data)) return res.status(500).json({ error: "Failed to delete repository" });
  io.emit('dataUpdated', data);
  res.json({ success: true });
});

app.get('/api/repos/:owner/:repo/branches', async (req, res) => {
  const owner = sanitizeSegment(req.params.owner);
  const repo = sanitizeSegment(req.params.repo);
  const repoDir = getGitRepoDir(owner, repo);
  if (!repoDir) return res.status(404).json({ error: "Repository not found" });

  try {
    const { stdout } = await execFileAsync("git", ["for-each-ref", "refs/heads", "--format=%(refname:short)"], { cwd: repoDir, windowsHide: true });
    const branches = String(stdout || "")
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
    res.json({ branches });
  } catch (e) {
    res.status(500).json({ error: "Failed to list branches" });
  }
});

app.get('/api/repos/:owner/:repo/commits', async (req, res) => {
  const owner = sanitizeSegment(req.params.owner);
  const repo = sanitizeSegment(req.params.repo);
  const ref = sanitizeRef(req.query.ref || "HEAD");
  const limitRaw = Number(req.query.limit || 200);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(2000, Math.floor(limitRaw))) : 200;

  if (!ref) return res.status(400).json({ error: "Invalid ref" });

  const repoDir = getGitRepoDir(owner, repo);
  if (!repoDir) return res.status(404).json({ error: "Repository not found" });

  try {
    const { stdout: shallowStdout } = await execFileAsync("git", ["rev-parse", "--is-shallow-repository"], { cwd: repoDir, windowsHide: true });
    const isShallow = String(shallowStdout || "").trim() === "true";

    const format = "%H%x01%P%x01%an%x01%ad%x01%s";
    const { stdout } = await execFileAsync("git", ["log", ref, "--topo-order", "--date=iso-strict", `--max-count=${limit}`, `--pretty=format:${format}`], { cwd: repoDir, windowsHide: true });
    const lines = String(stdout || "").split(/\r?\n/).filter(Boolean);
    const commits = lines.map(line => {
      const [hash, parentsRaw, authorName, dateIso, subject] = line.split("\x01");
      const parents = parentsRaw ? parentsRaw.split(" ").filter(Boolean) : [];
      return { hash, parents, authorName, dateIso, subject };
    }).filter(c => c.hash);
    res.json({ commits, ref, limit, isShallow });
  } catch (e) {
    res.status(500).json({ error: "Failed to load commits" });
  }
});

app.post('/api/repos/:owner/:repo/fetch', async (req, res) => {
  const owner = sanitizeSegment(req.params.owner);
  const repo = sanitizeSegment(req.params.repo);
  const deepenRaw = Number(req.body?.deepen ?? 200);
  const deepen = Number.isFinite(deepenRaw) ? Math.max(1, Math.min(5000, Math.floor(deepenRaw))) : 200;
  const unshallow = !!req.body?.unshallow;

  const repoDir = getGitRepoDir(owner, repo);
  if (!repoDir) return res.status(404).json({ error: "Repository not found" });

  try {
    if (unshallow) {
      await execFileAsync("git", ["fetch", "--unshallow"], { cwd: repoDir, windowsHide: true });
      return res.json({ success: true, mode: "unshallow" });
    }

    await execFileAsync("git", ["fetch", "--deepen", String(deepen)], { cwd: repoDir, windowsHide: true });
    res.json({ success: true, mode: "deepen", deepen });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch more history" });
  }
});

// Watch for file changes (e.g. manual edits)
let fsWait = false;
fs.watch(DATA_FILE, (event, filename) => {
  if (filename) {
    if (fsWait) return;
    fsWait = setTimeout(() => {
      fsWait = false;
    }, 100); // Debounce

    console.log(`${filename} file changed`);
    const data = readData();
    if (data) {
      io.emit('dataUpdated', data);
    }
  }
});

const repoWatchers = new Map();

const ensureRepoWatcher = (owner, repo) => {
  const key = `${owner}/${repo}`;
  if (repoWatchers.has(key)) return;
  const repoDir = getGitRepoDir(owner, repo);
  if (!repoDir) return;

  let debounceId = null;
  try {
    const watcher = fs.watch(repoDir, { recursive: true }, (eventType, filename) => {
      const name = String(filename || "");
      if (!name) return;
      const lower = name.toLowerCase();
      if (lower.includes(`${path.sep}.git${path.sep}`) || lower.includes(".git/") || lower.includes(".git\\")) return;
      if (lower.includes("node_modules") || lower.includes(`${path.sep}dist${path.sep}`) || lower.includes(`${path.sep}build${path.sep}`)) return;

      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        debounceId = null;
        persistRepoTree(owner, repo);
      }, 400);
    });

    repoWatchers.set(key, {
      close: () => {
        try {
          watcher.close();
        } catch {
        }
      }
    });
  } catch {
  }
};

const syncRepoWatchers = () => {
  const data = readData();
  if (!data || !Array.isArray(data.repositories)) return;
  for (const r of data.repositories) {
    const full = String(r?.full_name || "");
    const parts = full.split("/").filter(Boolean);
    if (parts.length < 2) continue;
    const owner = sanitizeSegment(parts[0]);
    const repo = sanitizeSegment(parts[1]);
    ensureRepoWatcher(owner, repo);
  }
};

syncRepoWatchers();
setInterval(syncRepoWatchers, 15000);

io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Send current data on connection
  const data = readData();
  if (data) {
    socket.emit('dataUpdated', data);
  }

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
