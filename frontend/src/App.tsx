import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import NewGoal from "./pages/NewGoal";
import GoalList from "./pages/GoalList";
import PlanView from "./pages/PlanView";
import TaskList from "./pages/TaskList";
import Chat from "./pages/Chat";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/goals/new" element={<NewGoal />} />
            <Route path="/plan" element={<GoalList />} />
            <Route path="/plan/:goalId" element={<PlanView />} />
            <Route path="/tasks" element={<TaskList />} />
            <Route path="/chat" element={<Chat />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
