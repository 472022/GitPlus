import { Navigate, Outlet } from "react-router-dom";
import { useRepositories } from "../../context/RepositoryContext";

const ProtectedRoute = () => {
  const { currentUser, loading } = useRepositories();

  // If still loading initial data, show nothing or a spinner
  if (loading) {
      return (
        <div className="flex h-screen items-center justify-center bg-github-light-bg dark:bg-github-dark-bg text-github-light-text dark:text-github-dark-text">
            Loading...
        </div>
      );
  }

  // If no user is logged in, redirect to login page
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If user is logged in, render the child routes
  return <Outlet />;
};

export default ProtectedRoute;
