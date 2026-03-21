import { NavLink } from 'react-router-dom';
import { LayoutDashboard, User, Briefcase, Layout, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { logout } from '../../api/auth';

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/profile', icon: User, label: 'My Profile' },
  { to: '/templates', icon: Layout, label: 'Templates' },
  { to: '/jobs', icon: Briefcase, label: 'Job Tracker' },
];

export function Sidebar() {
  const { user, refetch } = useAuth();

  const handleLogout = async () => {
    await logout();
    refetch();
  };

  return (
    <aside className="w-60 min-w-60 bg-gray-900 flex flex-col h-screen sticky top-0">
      <div className="px-6 py-5 border-b border-gray-800">
        <span className="text-white font-bold text-lg tracking-tight">ResumeAI</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-800">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {user.displayName?.[0] ?? user.email[0]}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm text-white truncate">{user.displayName ?? user.email}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
