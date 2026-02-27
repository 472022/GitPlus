import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import Button from "../common/Button";
import Input from "../common/Input";
import { useTheme } from "../../context/ThemeContext";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const API_URL = `${BACKEND_URL}/api`;

const ROW_HEIGHT = 36;
const LANE_SPACING = 18;
const GRAPH_PADDING_X = 12;
const DOT_RADIUS = 4.5;

const computeGraph = (commits) => {
  const indexByHash = new Map();
  commits.forEach((c, i) => indexByHash.set(c.hash, i));

  const laneByHash = new Map();
  const laneTips = [];

  const allocateLane = () => {
    const empty = laneTips.findIndex(v => v === null);
    if (empty !== -1) return empty;
    laneTips.push(null);
    return laneTips.length - 1;
  };

  const nodes = [];
  const edges = [];

  for (let row = 0; row < commits.length; row += 1) {
    const commit = commits[row];
    const hash = commit.hash;

    let lane = laneByHash.get(hash);
    if (lane === undefined) {
      lane = allocateLane();
      laneByHash.set(hash, lane);
    }

    nodes.push({ hash, lane, row });

    const parents = Array.isArray(commit.parents) ? commit.parents : [];
    for (let parentIndex = 0; parentIndex < parents.length; parentIndex += 1) {
      const parentHash = parents[parentIndex];
      if (!indexByHash.has(parentHash)) continue;

      let parentLane = laneByHash.get(parentHash);
      if (parentLane === undefined) {
        parentLane = allocateLane();
        laneByHash.set(parentHash, parentLane);
        laneTips[parentLane] = parentHash;
      }
      edges.push({ from: hash, to: parentHash, fromLane: lane, toLane: parentLane, parentIndex });
    }

    laneTips[lane] = parents[0] && indexByHash.has(parents[0]) ? parents[0] : null;
  }

  const laneCount = Math.max(1, ...nodes.map(n => n.lane + 1));
  return { nodes, edges, laneCount, indexByHash, laneByHash };
};

const LANE_COLORS_LIGHT = [
  "#0969da",
  "#1a7f37",
  "#bf8700",
  "#cf222e",
  "#8250df",
  "#e16f24",
  "#0f766e",
  "#b42318",
  "#0550ae",
  "#6f42c1"
];

const LANE_COLORS_DARK = [
  "#58a6ff",
  "#3fb950",
  "#d29922",
  "#ff7b72",
  "#d2a8ff",
  "#ffa657",
  "#39c5cf",
  "#f85149",
  "#79c0ff",
  "#c297ff"
];

const CommitHistory = ({ repoFullName, branch }) => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [commits, setCommits] = useState([]);
  const [limit, setLimit] = useState(200);
  const [isShallow, setIsShallow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [error, setError] = useState("");
  const [hoveredHash, setHoveredHash] = useState("");

  const [owner, repo] = String(repoFullName || "").split("/");

  const palette = theme === "dark" ? LANE_COLORS_DARK : LANE_COLORS_LIGHT;
  const laneColor = (lane) => palette[Math.abs(Number(lane) || 0) % palette.length];

  useEffect(() => {
    if (!owner || !repo) return;
    fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches`, { credentials: "include" })
      .then(r => r.json().then(j => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.error || "Failed to load branches");
        setBranches(j.branches || []);
      })
      .catch(() => setBranches([]));
  }, [owner, repo]);

  useEffect(() => {
    if (!owner || !repo) return;
    setLoading(true);
    setError("");

    const controller = new AbortController();
    fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?ref=${encodeURIComponent(branch || "HEAD")}&limit=${encodeURIComponent(limit)}`, {
      credentials: "include",
      signal: controller.signal
    })
      .then(r => r.json().then(j => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j.error || "Failed to load commits");
        setCommits(j.commits || []);
        setIsShallow(!!j.isShallow);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setError(e.message || "Failed to load commits");
        setCommits([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [owner, repo, branch, limit]);

  const graph = useMemo(() => computeGraph(commits), [commits]);
  const graphWidth = GRAPH_PADDING_X * 2 + graph.laneCount * LANE_SPACING;
  const graphHeight = Math.max(ROW_HEIGHT, commits.length * ROW_HEIGHT);
  const hoveredLane = hoveredHash ? graph.laneByHash.get(hoveredHash) : undefined;

  const filteredBranches = useMemo(() => {
    const q = branchFilter.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter(b => String(b).toLowerCase().includes(q));
  }, [branches, branchFilter]);

  const selectBranch = (b) => {
    if (!b) return;
    navigate(`/${repoFullName}/commits/${b}`);
  };

  const fetchMoreHistory = async () => {
    if (!owner || !repo) return;
    setFetchingMore(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/fetch`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deepen: 200 })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch more history");
      setLimit((prev) => Math.min(2000, prev + 200));
    } catch (e) {
      setError(e.message || "Failed to fetch more history");
    } finally {
      setFetchingMore(false);
    }
  };

  if (!owner || !repo) return null;

  return (
    <div className="border border-github-light-border dark:border-github-dark-border rounded-md overflow-hidden bg-white dark:bg-github-dark-bg">
      <div className="bg-github-light-bg-secondary dark:bg-github-dark-bg-secondary p-3 border-b border-github-light-border dark:border-github-dark-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm font-semibold text-github-light-text dark:text-github-dark-text">
          Commit history
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative group">
            <Button size="sm" variant="secondary" className="text-xs">
              {branch || "HEAD"} ▼
            </Button>
            <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-64 bg-white dark:bg-github-dark-bg-secondary border border-github-light-border dark:border-github-dark-border rounded-md shadow-lg z-50">
              <div className="p-2 border-b border-github-light-border dark:border-github-dark-border">
                <Input
                  type="text"
                  placeholder="Filter branches..."
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                />
              </div>
              <div className="max-h-56 overflow-auto">
                {filteredBranches.length === 0 ? (
                  <div className="p-3 text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary">No branches</div>
                ) : (
                  filteredBranches.map(b => (
                    <button
                      key={b}
                      onClick={() => selectBranch(b)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-github-light-accent hover:text-white"
                    >
                      {b}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
          <Button size="sm" variant="secondary" className="text-xs" onClick={() => setLimit((p) => Math.min(2000, p + 200))} disabled={loading}>
            Load more
          </Button>
        </div>
      </div>

      {error ? (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 flex items-start gap-3">
          <AlertCircle className="text-red-600 dark:text-red-400 mt-0.5" size={18} />
          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
        </div>
      ) : null}

      {isShallow ? (
        <div className="p-3 border-b border-github-light-border dark:border-github-dark-border bg-github-light-bg-secondary dark:bg-github-dark-bg-secondary flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary">
            History is shallow (limited). Fetch more commits to see full graph.
          </div>
          <Button size="sm" variant="primary" className="text-xs" onClick={fetchMoreHistory} disabled={fetchingMore}>
            {fetchingMore ? "Fetching..." : "Fetch more history"}
          </Button>
        </div>
      ) : null}

      <div className="relative">
        <div
          className="absolute left-0 top-0 border-r border-github-light-border dark:border-github-dark-border bg-github-light-bg-secondary/40 dark:bg-github-dark-bg-secondary/40"
          style={{ width: graphWidth, height: graphHeight }}
        />
        <svg
          width={graphWidth}
          height={graphHeight}
          className="absolute left-0 top-0"
          style={{ pointerEvents: "none" }}
        >
          {Array.from({ length: graph.laneCount }).map((_, lane) => (
            <rect
              key={`lane-${lane}`}
              x={GRAPH_PADDING_X + lane * LANE_SPACING - LANE_SPACING / 2}
              y={0}
              width={LANE_SPACING}
              height={graphHeight}
              fill={laneColor(lane)}
              opacity={hoveredLane === lane ? 0.12 : 0.05}
            />
          ))}

          {Array.from({ length: commits.length }).map((_, row) => (
            <line
              key={`row-${row}`}
              x1={0}
              y1={row * ROW_HEIGHT}
              x2={graphWidth}
              y2={row * ROW_HEIGHT}
              stroke={theme === "dark" ? "#30363d" : "#d0d7de"}
              strokeWidth="1"
              opacity="0.35"
            />
          ))}

          {graph.edges.map((e) => {
            const fromRow = graph.indexByHash.get(e.from);
            const toRow = graph.indexByHash.get(e.to);
            if (fromRow === undefined || toRow === undefined) return null;

            const x1 = GRAPH_PADDING_X + e.fromLane * LANE_SPACING;
            const y1 = fromRow * ROW_HEIGHT + ROW_HEIGHT / 2;
            const x2 = GRAPH_PADDING_X + e.toLane * LANE_SPACING;
            const y2 = toRow * ROW_HEIGHT + ROW_HEIGHT / 2;

            const baseColor = laneColor(e.fromLane);
            const isPrimary = e.parentIndex === 0;
            const isConnectedToHover = hoveredHash && (e.from === hoveredHash || e.to === hoveredHash);
            const isSameLaneAsHover = hoveredLane !== undefined && (e.fromLane === hoveredLane || e.toLane === hoveredLane);
            const emphasize = isConnectedToHover || isSameLaneAsHover;
            const strokeWidth = emphasize ? (isPrimary ? 3 : 2.5) : (isPrimary ? 2.5 : 2);
            const opacity = emphasize ? 0.95 : (isPrimary ? 0.55 : 0.35);

            if (x1 === x2) {
              return (
                <path
                  key={`${e.from}-${e.to}`}
                  d={`M ${x1} ${y1} L ${x2} ${y2}`}
                  stroke={baseColor}
                  strokeWidth={strokeWidth}
                  fill="none"
                  opacity={opacity}
                  strokeLinecap="round"
                  strokeDasharray={isPrimary ? undefined : "3 3"}
                />
              );
            }

            const dx = 14;
            return (
              <path
                key={`${e.from}-${e.to}`}
                d={`M ${x1} ${y1} C ${x1} ${y1 + dx}, ${x2} ${y2 - dx}, ${x2} ${y2}`}
                stroke={baseColor}
                strokeWidth={strokeWidth}
                fill="none"
                opacity={opacity}
                strokeLinecap="round"
                strokeDasharray={isPrimary ? undefined : "3 3"}
              />
            );
          })}

          {graph.nodes.map((n) => {
            const x = GRAPH_PADDING_X + n.lane * LANE_SPACING;
            const y = n.row * ROW_HEIGHT + ROW_HEIGHT / 2;
            const isHovered = hoveredHash && n.hash === hoveredHash;
            const isSameLane = hoveredLane !== undefined && n.lane === hoveredLane;
            const r = isHovered ? DOT_RADIUS + 2 : DOT_RADIUS;
            const opacity = isHovered ? 1 : (isSameLane ? 0.95 : 0.85);
            return (
              <g key={n.hash}>
                {isHovered ? (
                  <circle cx={x} cy={y} r={r + 4} fill={laneColor(n.lane)} opacity={0.18} />
                ) : null}
                <circle cx={x} cy={y} r={r} fill={laneColor(n.lane)} opacity={opacity} />
                {isHovered ? (
                  <circle cx={x} cy={y} r={r + 2.5} fill="none" stroke={laneColor(n.lane)} strokeWidth="2" opacity={0.9} />
                ) : null}
              </g>
            );
          })}
        </svg>

        <div style={{ paddingLeft: graphWidth }}>
          {loading ? (
            <div className="p-4 text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">Loading commits...</div>
          ) : commits.length === 0 ? (
            <div className="p-4 text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary">No commits found.</div>
          ) : (
            <div>
              {commits.map((c) => (
                <div
                  key={c.hash}
                  className={[
                    "px-4 flex items-center justify-between gap-4 border-b border-github-light-border dark:border-github-dark-border last:border-0",
                    "hover:bg-github-light-bg-secondary/60 dark:hover:bg-github-dark-bg-secondary/60 transition-colors",
                    hoveredHash === c.hash ? "bg-github-light-bg-secondary/70 dark:bg-github-dark-bg-secondary/70" : ""
                  ].filter(Boolean).join(" ")}
                  style={{ height: ROW_HEIGHT }}
                  onMouseEnter={() => setHoveredHash(c.hash)}
                  onMouseLeave={() => setHoveredHash("")}
                >
                  <div className="min-w-0">
                    <div className="text-sm text-github-light-text dark:text-github-dark-text truncate">
                      {c.subject || "(no message)"}
                    </div>
                    <div className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary truncate">
                      {c.authorName || "Unknown"} • {c.dateIso ? new Date(c.dateIso).toLocaleString() : ""}
                    </div>
                  </div>
                  <div className="text-xs font-mono text-github-light-text-secondary dark:text-github-dark-text-secondary shrink-0">
                    {String(c.hash || "").slice(0, 7)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommitHistory;
