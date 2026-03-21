import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { ToastContainer } from '../ui/Toast';
import { useAppStore } from '../../store/useAppStore';

export function AppLayout() {
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  // Prevent background scroll when mobile drawer is open (mobile only)
  useEffect(() => {
    if (sidebarOpen && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Backdrop for mobile drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-bold text-gray-900">ResumeAI</span>
        </div>

        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
