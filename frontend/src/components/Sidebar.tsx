import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  PlusCircle,
  BookOpen,
  CheckSquare,
  MessageCircle,
} from "lucide-react";

const links = [
  { to: "/", label: "仪表盘", icon: LayoutDashboard },
  { to: "/goals/new", label: "新建目标", icon: PlusCircle },
  { to: "/plan", label: "学习计划", icon: BookOpen },
  { to: "/tasks", label: "任务列表", icon: CheckSquare },
  { to: "/chat", label: "AI 对话", icon: MessageCircle },
];

export default function Sidebar() {
  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <span className="text-xl font-bold text-indigo-600">LearnPilot</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/" || to === "/plan"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-6 py-4 border-t border-gray-200 text-xs text-gray-400">
        AI 智能学习
      </div>
    </aside>
  );
}
