import { Outlet } from "react-router-dom";
import Header from "../components/layout/Header";

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-github-light-bg dark:bg-github-dark-bg transition-colors duration-200">
      <Header />
      <main className="flex-1 w-full">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
