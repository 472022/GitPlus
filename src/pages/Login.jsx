import { Github } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import { useState } from "react";
import { useRepositories } from "../context/RepositoryContext";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useRepositories();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const result = await login(username, password);
    if (result.success) {
      navigate("/");
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-github-light-bg-secondary dark:bg-github-dark-bg flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link to="/">
            <Github size={48} className="text-github-light-text dark:text-white" fill="currentColor" />
        </Link>
      </div>
      
      <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-light text-github-light-text dark:text-github-dark-text">Sign in to GitPlus</h2>
          </div>

          <div className="bg-white dark:bg-github-dark-bg-secondary p-8 rounded-md border border-github-light-border dark:border-github-dark-border shadow-sm">
             <form className="space-y-4" onSubmit={handleSubmit}>
                 {error && (
                     <div className="p-3 bg-red-100 border border-red-200 text-red-700 rounded text-sm">
                         {error}
                     </div>
                 )}
                 <div>
                     <label className="block text-sm font-medium text-github-light-text dark:text-github-dark-text mb-2">Username or email address</label>
                     <Input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                     />
                 </div>
                 <div>
                     <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-github-light-text dark:text-github-dark-text">Password</label>
                        <Link to="#" className="text-xs text-github-light-accent dark:text-github-dark-accent hover:underline">Forgot password?</Link>
                     </div>
                     <Input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                     />
                 </div>
                 
                 <Button variant="primary" className="w-full font-bold" type="submit">Sign in</Button>
             </form>
          </div>

          <div className="mt-6 border p-4 rounded-md border-github-light-border dark:border-github-dark-border text-center text-sm">
             <span className="text-github-light-text dark:text-github-dark-text mr-1">New to GitPlus?</span>
             <Link to="/signup" className="text-github-light-accent dark:text-github-dark-accent hover:underline">Create an account</Link>
          </div>
          
          <div className="mt-8 flex justify-center gap-4 text-xs text-github-light-text-secondary dark:text-github-dark-text-secondary">
              <Link to="#" className="hover:text-github-light-accent dark:hover:text-github-dark-accent hover:underline">Terms</Link>
              <Link to="#" className="hover:text-github-light-accent dark:hover:text-github-dark-accent hover:underline">Privacy</Link>
              <Link to="#" className="hover:text-github-light-accent dark:hover:text-github-dark-accent hover:underline">Docs</Link>
              <Link to="#" className="hover:text-github-light-accent dark:hover:text-github-dark-accent hover:underline">Contact GitPlus Support</Link>
          </div>
      </div>
    </div>
  );
};

export default Login;
