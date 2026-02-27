export const currentUser = {
  login: "shadcn",
  name: "shadcn",
  avatar_url: "https://github.com/shadcn.png",
  bio: "Designing and building things.",
  followers: 12400,
  following: 45,
  location: "Internet",
  blog: "https://ui.shadcn.com",
  twitter_username: "shadcn",
  company: "@vercel",
  created_at: "2020-01-01T00:00:00Z",
  email: "m@shadcn.com",
  hireable: true,
};

export const repositories = [
  {
    id: 1,
    name: "ui",
    full_name: "shadcn/ui",
    private: false,
    owner: {
      login: "shadcn",
      avatar_url: "https://github.com/shadcn.png",
    },
    html_url: "https://github.com/shadcn/ui",
    description: "Beautifully designed components built with Radix UI and Tailwind CSS.",
    fork: false,
    url: "https://api.github.com/repos/shadcn/ui",
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    pushed_at: "2024-01-02T00:00:00Z",
    homepage: "https://ui.shadcn.com",
    size: 1024,
    stargazers_count: 45000,
    watchers_count: 45000,
    language: "TypeScript",
    has_issues: true,
    has_projects: true,
    has_downloads: true,
    has_wiki: true,
    has_pages: true,
    forks_count: 3200,
    archived: false,
    disabled: false,
    open_issues_count: 120,
    license: {
      key: "mit",
      name: "MIT License",
      spdx_id: "MIT",
      url: "https://api.github.com/licenses/mit",
      node_id: "MDc6TGljZW5zZTEz",
    },
    topics: ["react", "tailwind-css", "components", "radix-ui"],
    visibility: "public",
    default_branch: "main",
  },
  {
    id: 2,
    name: "next-template",
    full_name: "shadcn/next-template",
    private: false,
    owner: {
      login: "shadcn",
      avatar_url: "https://github.com/shadcn.png",
    },
    description: "A Next.js 13 template for building apps with Radix UI and Tailwind CSS.",
    stargazers_count: 1200,
    language: "TypeScript",
    updated_at: "2023-12-20T00:00:00Z",
    visibility: "public",
  },
  {
    id: 3,
    name: "taxonomy",
    full_name: "shadcn/taxonomy",
    private: false,
    owner: {
      login: "shadcn",
      avatar_url: "https://github.com/shadcn.png",
    },
    description: "An open source application built using the new router, server components and everything new in Next.js 13.",
    stargazers_count: 8500,
    language: "TypeScript",
    updated_at: "2023-11-15T00:00:00Z",
    visibility: "public",
  },
];

export const fileTree = [
  {
    name: ".github",
    type: "folder",
    path: ".github",
    children: [
      { name: "workflows", type: "folder", path: ".github/workflows" },
      { name: "FUNDING.yml", type: "file", path: ".github/FUNDING.yml" },
    ],
  },
  {
    name: "apps",
    type: "folder",
    path: "apps",
    children: [
      { name: "web", type: "folder", path: "apps/web" },
      { name: "docs", type: "folder", path: "apps/docs" },
    ],
  },
  {
    name: "packages",
    type: "folder",
    path: "packages",
    children: [
      { name: "ui", type: "folder", path: "packages/ui" },
      { name: "config", type: "folder", path: "packages/config" },
    ],
  },
  { name: ".gitignore", type: "file", path: ".gitignore", message: "Initial commit", time: "2 years ago" },
  { name: ".prettierrc", type: "file", path: ".prettierrc", message: "Add prettier", time: "2 years ago" },
  { name: "README.md", type: "file", path: "README.md", message: "Update README", time: "3 days ago" },
  { name: "package.json", type: "file", path: "package.json", message: "Bump version", time: "1 week ago" },
  { name: "turbo.json", type: "file", path: "turbo.json", message: "Add turbo", time: "2 years ago" },
];

export const activity = [
  {
    id: 1,
    type: "PushEvent",
    actor: {
      login: "shadcn",
      avatar_url: "https://github.com/shadcn.png",
    },
    repo: {
      name: "shadcn/ui",
      url: "https://github.com/shadcn/ui",
    },
    payload: {
      commits: [
        {
          message: "feat: add toast component",
          sha: "a1b2c3d",
        },
        {
          message: "fix: button variants",
          sha: "e5f6g7h",
        },
      ],
      head: "main",
      size: 2,
    },
    created_at: "2024-01-02T10:00:00Z",
  },
  {
    id: 2,
    type: "WatchEvent",
    actor: {
      login: "vercel",
      avatar_url: "https://github.com/vercel.png",
    },
    repo: {
      name: "shadcn/ui",
      url: "https://github.com/shadcn/ui",
    },
    created_at: "2024-01-02T09:30:00Z",
  },
  {
    id: 3,
    type: "ForkEvent",
    actor: {
      login: "code-user",
      avatar_url: "https://github.com/ghost.png",
    },
    repo: {
      name: "facebook/react",
      url: "https://github.com/facebook/react",
    },
    created_at: "2024-01-01T15:00:00Z",
  },
];

export const trending = [
  {
    author: "facebook",
    name: "react",
    description: "A declarative, efficient, and flexible JavaScript library for building user interfaces.",
    language: "JavaScript",
    stars: 205000,
    forks: 40000,
    todayStars: 120,
    languageColor: "#f1e05a",
  },
  {
    author: "vercel",
    name: "next.js",
    description: "The React Framework",
    language: "JavaScript",
    stars: 110000,
    forks: 24000,
    todayStars: 95,
    languageColor: "#f1e05a",
  },
  {
    author: "shadcn",
    name: "ui",
    description: "Beautifully designed components built with Radix UI and Tailwind CSS.",
    language: "TypeScript",
    stars: 45000,
    forks: 3200,
    todayStars: 450,
    languageColor: "#3178c6",
  },
];
