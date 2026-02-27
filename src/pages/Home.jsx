import Sidebar from "../components/dashboard/Sidebar";
import Feed from "../components/dashboard/Feed";
import ExploreSidebar from "../components/dashboard/ExploreSidebar";

const Home = () => {
  return (
    <div className="max-w-[1280px] mx-auto md:px-6 md:py-6 flex flex-col md:flex-row items-start">
      <Sidebar />
      <Feed />
      <ExploreSidebar />
    </div>
  );
};

export default Home;
