import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  to?: string;
}

export default function StatCard({ label, value, icon: Icon, color = "indigo", to }: Props) {
  const navigate = useNavigate();

  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
  };

  return (
    <div
      onClick={() => to && navigate(to)}
      className={`bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 transition-colors ${
        to ? "cursor-pointer hover:border-indigo-300 hover:shadow-sm" : ""
      }`}
    >
      <div className={`p-3 rounded-lg ${colorMap[color] || colorMap.indigo}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
