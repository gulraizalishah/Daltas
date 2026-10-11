import type { ReactElement } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { Heart, Home as HomeIcon, User, Video } from 'lucide-react';
import { useAuth } from './auth';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Matches from './pages/Matches';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import Live from './pages/Live';

function Splash() {
  return <div className="grid h-full place-items-center text-neutral-500" role="status">Loading…</div>;
}

function Protected({ children }: { children: ReactElement }) {
  const { session, loading } = useAuth();
  if (loading) return <Splash />;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnly({ children }: { children: ReactElement }) {
  const { session, loading } = useAuth();
  if (loading) return <Splash />;
  if (session) return <Navigate to="/home" replace />;
  return children;
}

const links = [
  { to: '/home', label: 'Home', Icon: HomeIcon },
  { to: '/live', label: 'Live', Icon: Video },
  { to: '/matches', label: 'Matches', Icon: Heart },
  { to: '/profile', label: 'Profile', Icon: User },
];

function Shell() {
  const side = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${isActive ? 'bg-rose-50 text-rose-600' : 'text-neutral-600 hover:bg-neutral-100'}`;
  const tab = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${isActive ? 'text-rose-600' : 'text-neutral-500'}`;

  return (
    <div className="bg-neutral-50 text-neutral-900 md:pl-56">
      {/* mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-20 border-b border-neutral-200 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
        <div className="flex h-12 items-center justify-center text-lg font-semibold">Daltas</div>
      </header>

      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col gap-1 border-r border-neutral-200 bg-white p-4 md:flex">
        <div className="mb-4 px-3 text-xl font-semibold">Daltas</div>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {links.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={side}><Icon size={20} aria-hidden /> {label}</NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex h-[100dvh] flex-col overflow-y-auto px-3 pt-[calc(3.5rem_+_env(safe-area-inset-top))] pb-[calc(5rem_+_env(safe-area-inset-bottom))] md:px-6 md:pb-6 md:pt-6">
        <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col"><Outlet /></div>
      </main>

      {/* mobile bottom tabs */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 flex border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {links.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={tab}><Icon size={24} aria-hidden /> {label}</NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicOnly><Landing /></PublicOnly>} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route element={<Protected><Shell /></Protected>}>
        <Route path="/home" element={<Home />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/edit" element={<EditProfile />} />
      </Route>
      {/* Live is full-screen, so it sits outside the shell */}
      <Route path="/live" element={<Protected><Live /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}