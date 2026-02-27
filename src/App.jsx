import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { RepositoryProvider } from "./context/RepositoryContext";
import { ToastProvider } from "./context/ToastContext";
import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Repository from "./pages/Repository";
import CreateRepo from "./pages/CreateRepo";
import ImportRepo from "./pages/ImportRepo";
import CreateFile from "./pages/CreateFile";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProtectedRoute from "./components/common/ProtectedRoute";

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <RepositoryProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<Home />} />
                  <Route path="new" element={<CreateRepo />} />
                  <Route path="import" element={<ImportRepo />} />
                  <Route path=":username" element={<Profile />} />
                  <Route path=":username/:repo" element={<Repository />} />
                  <Route path=":username/:repo/tree/:branch/*" element={<Repository />} />
                  <Route path=":username/:repo/blob/:branch/*" element={<Repository />} />
                  <Route path=":username/:repo/commits/:branch" element={<Repository />} />
                  <Route path=":username/:repo/issues" element={<Repository />} />
                  <Route path=":username/:repo/pulls" element={<Repository />} />
                  <Route path=":username/:repo/actions" element={<Repository />} />
                  <Route path=":username/:repo/projects" element={<Repository />} />
                  <Route path=":username/:repo/security" element={<Repository />} />
                  <Route path=":username/:repo/insights" element={<Repository />} />
                  <Route path=":username/:repo/settings" element={<Repository />} />
                  <Route path=":username/:repo/new/:branch" element={<CreateFile />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </RepositoryProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
