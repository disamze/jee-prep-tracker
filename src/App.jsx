import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ErrorBook from "./pages/ErrorBook";
import Subjects from "./pages/Subjects";
import Revision from "./pages/Revision";
import Planner from "./pages/Planner";
import Focus from "./pages/Focus";
import Questions from "./pages/Questions";
import Goals from "./pages/Goals";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Toaster
          position="top-right"
          richColors
          closeButton
        />

        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/error-book" element={<ErrorBook />} />
            <Route path="/subjects" element={<Subjects />} />
            <Route path="/revision" element={<Revision />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/focus" element={<Focus />} />
            <Route path="/questions" element={<Questions />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />

            {/* Redirect unknown URLs to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;