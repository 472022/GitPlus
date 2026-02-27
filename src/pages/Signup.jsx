import { Github } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import { useState } from "react";
import { useRepositories } from "../context/RepositoryContext";

const Signup = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { register } = useRepositories();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!username || !email || !password) {
        setError("All fields are required");
        return;
    }

    const result = await register(username, email, password);
    if (result.success) {
      navigate("/");
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-github-light-bg-secondary dark:bg-github-dark-bg flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
       <div className="mb-8 text-center">
        <Link to="/" className="inline-block mb-4">
            <Github size={48} className="text-github-light-text-secondary dark:text-github-dark-text-secondary" fill="currentColor" />
        </Link>
        <h2 className="text-4xl font-bold tracking-tight text-github-light-text dark:text-github-dark-text mb-2">Welcome to GitPlus!</h2>
        <p className="text-xl text-github-light-text-secondary dark:text-github-dark-text-secondary">Let's begin the adventure</p>
      </div>

       <div className="w-full max-w-md space-y-4">
          <div className="bg-white dark:bg-github-dark-bg-secondary p-8 rounded-md border border-github-light-border dark:border-github-dark-border shadow-sm">
              <form className="space-y-4" onSubmit={handleSubmit}>
                  {error && (
                      <div className="p-3 bg-red-100 border border-red-200 text-red-700 rounded text-sm">
                          {error}
                      </div>
                  )}
                  <div>
                      <label className="block text-sm font-medium text-github-light-text dark:text-github-dark-text mb-2">Username</label>
                      <Input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-github-light-text dark:text-github-dark-text mb-2">Email address</label>
                      <Input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-github-light-text dark:text-github-dark-text mb-2">Password</label>
                      <Input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                  </div>
                  <Button variant="primary" className="w-full font-bold" type="submit">Create account</Button>
              </form>
          </div>
          
           <div className="text-center text-sm">
             <span className="text-github-light-text dark:text-github-dark-text mr-1">Already have an account?</span>
             <Link to="/login" className="text-github-light-accent dark:text-github-dark-accent hover:underline">Sign in</Link>
          </div>
       </div>
    </div>
  );
};

export default Signup;
