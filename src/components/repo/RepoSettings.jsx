import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../common/Button";
import Input from "../common/Input";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const API_URL = `${BACKEND_URL}/api`;

const RepoSettings = ({ repo }) => {
  const navigate = useNavigate();
  const [description, setDescription] = useState(repo?.description || "");
  const [visibility, setVisibility] = useState(repo?.visibility || (repo?.private ? "private" : "public"));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [owner, repoName] = String(repo?.full_name || "").split("/");

  useEffect(() => {
    setDescription(repo?.description || "");
    setVisibility(repo?.visibility || (repo?.private ? "private" : "public"));
  }, [repo?.full_name]);

  const saveSettings = async () => {
    if (!owner || !repoName) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/settings`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, visibility })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");
      setSuccess("Settings saved");
    } catch (e) {
      setError(e.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const deleteRepo = async () => {
    if (!owner || !repoName) return;
    if (!window.confirm(`Delete ${repo?.full_name}? This cannot be undone.`)) return;
    setDeleting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`, {
        method: "DELETE",
        credentials: "include"
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete repository");
      navigate("/");
    } catch (e) {
      setError(e.message || "Failed to delete repository");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border border-github-light-border dark:border-github-dark-border rounded-md bg-white dark:bg-github-dark-bg overflow-hidden">
        <div className="p-4 border-b border-github-light-border dark:border-github-dark-border">
          <div className="text-sm font-semibold text-github-light-text dark:text-github-dark-text">Settings</div>
        </div>
        <div className="p-4 space-y-4">
          {error ? <div className="text-sm text-red-700 dark:text-red-300">{error}</div> : null}
          {success ? <div className="text-sm text-green-700 dark:text-green-300">{success}</div> : null}

          <div>
            <div className="text-xs font-semibold text-github-light-text dark:text-github-dark-text mb-1">Description</div>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Repository description" />
          </div>

          <div>
            <div className="text-xs font-semibold text-github-light-text dark:text-github-dark-text mb-1">Visibility</div>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full text-sm p-2 border border-github-light-border dark:border-github-dark-border rounded-md bg-white dark:bg-github-dark-bg text-github-light-text dark:text-github-dark-text"
            >
              <option value="public">public</option>
              <option value="private">private</option>
            </select>
          </div>

          <div>
            <Button variant="primary" size="sm" onClick={saveSettings} disabled={saving}>
              {saving ? "Saving..." : "Save settings"}
            </Button>
          </div>
        </div>
      </div>

      <div className="border border-red-200 dark:border-red-800 rounded-md bg-white dark:bg-github-dark-bg overflow-hidden">
        <div className="p-4 border-b border-red-200 dark:border-red-800">
          <div className="text-sm font-semibold text-red-700 dark:text-red-300">Danger zone</div>
        </div>
        <div className="p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-github-light-text dark:text-github-dark-text">Delete this repository</div>
            <div className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary">Deletes local storage and all GitPlus metadata.</div>
          </div>
          <Button variant="secondary" size="sm" onClick={deleteRepo} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RepoSettings;
