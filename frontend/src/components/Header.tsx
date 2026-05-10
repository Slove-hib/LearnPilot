import { useNavigate } from "react-router-dom";
import { Sparkles, LogOut } from "lucide-react";

export default function Header() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold text-gray-800">
        AI Agent 学习规划系统
      </h1>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-indigo-600">
          <Sparkles size={16} />
          <span>由 MiMO 驱动</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={14} />
          退出
        </button>
      </div>
    </header>
  );
}
