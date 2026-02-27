import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Book, Lock } from "lucide-react";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import { useRepositories } from "../context/RepositoryContext";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const API_URL = `${BACKEND_URL}/api`;

const CreateRepo = () => {
  const navigate = useNavigate();
  const { currentUser } = useRepositories();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    private: false,
    initReadme: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      setError("Repository name is required");
      return;
    }
    if (!currentUser?.login) {
      setError("You must be logged in to create a repository");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/repos/create`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerLogin: currentUser.login,
          name: formData.name,
          description: formData.description,
          private: formData.private,
          initReadme: formData.initReadme
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create repository");
      }
      navigate(`/${currentUser.login}/${data.repo.name}`);
    } catch (e) {
      setError(e.message || "Failed to create repository");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-github-light-bg-secondary dark:bg-github-dark-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="border-b border-github-light-border dark:border-github-dark-border pb-4 mb-8">
            <h1 className="text-2xl font-semibold text-github-light-text dark:text-github-dark-text">Create a new repository</h1>
            <p className="text-sm text-github-light-text-secondary dark:text-github-dark-text-secondary mt-1">
                A repository contains all project files, including the revision history. Already have a project repository elsewhere? <Link to="/import" className="text-github-light-accent dark:text-github-dark-accent hover:underline">Import a repository.</Link>
            </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-github-light-text dark:text-github-dark-text">Owner</span>
                    <span className="text-sm font-medium text-github-light-text dark:text-github-dark-text">/</span>
                    <span className="text-sm font-medium text-github-light-text dark:text-github-dark-text">Repository name</span>
                    <span className="text-red-500">*</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-github-light-bg-secondary dark:bg-github-dark-bg-secondary border border-github-light-border dark:border-github-dark-border rounded-md px-3 py-1.5 text-sm font-medium text-github-light-text dark:text-github-dark-text">
                        <img src={currentUser.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                        {currentUser.login}
                    </div>
                    <span className="text-lg text-github-light-text-secondary dark:text-github-dark-text-secondary">/</span>
                    <Input 
                        value={formData.name}
                        onChange={(e) => {
                            setFormData({...formData, name: e.target.value});
                            setError("");
                        }}
                        className={`max-w-xs ${error ? "border-red-500 focus:ring-red-500 focus:border-red-500" : ""}`}
                    />
                </div>
                {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
                <p className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary mt-2">
                    Great repository names are short and memorable. Need inspiration? How about <span className="font-bold text-green-600">psychic-potato</span>?
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-github-light-text dark:text-github-dark-text mb-2">Description <span className="text-github-light-text-secondary dark:text-github-dark-text-secondary font-normal">(optional)</span></label>
                <Input 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
            </div>

            <div className="border-t border-github-light-border dark:border-github-dark-border pt-4">
                <div className="mb-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input 
                            type="radio" 
                            name="visibility" 
                            checked={!formData.private}
                            onChange={() => setFormData({...formData, private: false})}
                            className="mt-1"
                        />
                        <div>
                            <div className="flex items-center gap-2">
                                <Book size={18} className="text-github-light-text-secondary dark:text-github-dark-text-secondary" />
                                <span className="font-medium text-github-light-text dark:text-github-dark-text">Public</span>
                            </div>
                            <p className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary mt-1">
                                Anyone on the internet can see this repository. You choose who can commit.
                            </p>
                        </div>
                    </label>
                </div>
                <div>
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input 
                            type="radio" 
                            name="visibility" 
                            checked={formData.private}
                            onChange={() => setFormData({...formData, private: true})}
                            className="mt-1"
                        />
                        <div>
                            <div className="flex items-center gap-2">
                                <Lock size={18} className="text-orange-600" />
                                <span className="font-medium text-github-light-text dark:text-github-dark-text">Private</span>
                            </div>
                            <p className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary mt-1">
                                You choose who can see and commit to this repository.
                            </p>
                        </div>
                    </label>
                </div>
            </div>

            <div className="border-t border-github-light-border dark:border-github-dark-border pt-4">
                <h3 className="text-sm font-medium text-github-light-text dark:text-github-dark-text mb-2">Initialize this repository with:</h3>
                <div className="mb-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input 
                            type="checkbox"
                            checked={formData.initReadme}
                            onChange={(e) => setFormData({...formData, initReadme: e.target.checked})}
                            className="mt-1"
                        />
                        <div>
                            <span className="font-medium text-sm text-github-light-text dark:text-github-dark-text">Add a README file</span>
                            <p className="text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary mt-1">
                                This is where you can write a long description for your project.
                            </p>
                        </div>
                    </label>
                </div>
            </div>

            <div className="border-t border-github-light-border dark:border-github-dark-border pt-6">
                <Button variant="primary" type="submit" className="font-semibold" disabled={loading}>
                    {loading ? "Creating..." : "Create repository"}
                </Button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRepo;
