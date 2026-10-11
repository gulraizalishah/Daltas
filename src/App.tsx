import type { ReactElement, ReactNode } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { Bell, Heart, Home as HomeIcon, MessageCircle, User, Video } from 'lucide-react';
import { useAuth } from './auth';
import { useBadges } from './useBadges';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Matches from './pages/Matches';
import Messages from './pages/Messages';
import Chat from './pages/Chat';
import Notifications from './pages/Notifications';
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

type Badge = 'messages' | 'notifications';
const links: { to: string; label: string; Icon: typeof HomeIcon; badge?: Badge; desktopOnly?: boolean }[] = [
  { to: '/home', label: 'Home', Icon: HomeIcon },
  { to: '/live', label: 'Live', Icon: Video },
  { to: '/matches', label: 'Matches', Icon: Heart },
  { to: '/messages', label: 'Messages', Icon: MessageCircle, badge: 'messages' },
  { to: '/notifications', label: 'Notifications', Icon: Bell, badge: 'notifications', desktopOnly: true },
  { to: '/profile', label: 'Profile', Icon: User },
];

function Pill({ n, className = '' }: { n: number; className?: string }) {
  if (n <= 0) return null;
  return (
    <span aria-hidden className={`grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-semibold text-white ${className}`}>
      {n > 99 ? '99+' : n}
    </span>
  );
}

function Shell() {
  const badges = useBadges();
  const count = (b?: Badge) => (b ? badges[b] : 0);
  const label = (l: string, n: number) => (n > 0 ? `${l}, ${n} unread` : l);

  const side = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${isActive ? 'bg-rose-50 text-rose-600' : 'text-neutral-600 hover:bg-neutral-100'}`;
  const tab = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${isActive ? 'text-rose-600' : 'text-neutral-500'}`;

  return (
    <div className="bg-neutral-50 text-neutral-900 md:pl-56">
      {/* mobile top bar with the notifications bell */}
      <header className="fixed inset-x-0 top-0 z-20 border-b border-neutral-200 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
        <div className="flex h-12 items-center justify-between px-3">
          <span className="w-10" aria-hidden />
          <span className="text-lg font-semibold">Daltas</span>
          <NavLink to="/notifications" aria-label={label('Notifications', badges.notifications)}
            className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-neutral-100">
            <Bell size={22} />
            <Pill n={badges.notifications} className="absolute -right-0.5 top-0" />
          </NavLink>
        </div>
      </header>

      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col gap-1 border-r border-neutral-200 bg-white p-4 md:flex">
        <div className="mb-4 px-3 text-xl font-semibold">Daltas</div>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {links.map(({ to, label: l, Icon, badge }) => (
            <NavLink key={to} to={to} className={side} aria-label={label(l, count(badge))}>
              <Icon size={20} aria-hidden /> {l}
              <Pill n={count(badge)} className="ml-auto" />
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex h-[100dvh] flex-col overflow-y-auto px-3 pt-[calc(3.5rem_+_env(safe-area-inset-top))] pb-[calc(5rem_+_env(safe-area-inset-bottom))] md:px-6 md:pb-6 md:pt-6">
        <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col"><Outlet /></div>
      </main>

      {/* mobile bottom tabs */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 flex border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {links.filter((l) => !l.desktopOnly).map(({ to, label: l, Icon, badge }) => (
          <NavLink key={to} to={to} className={tab} aria-label={label(l, count(badge))}>
            <span className="relative">
              <Icon size={24} aria-hidden />
              <Pill n={count(badge)} className="absolute -right-3 -top-2" />
            </span>
            {l}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  const child = (el: ReactNode) => <Protected>{el as ReactElement}</Protected>;
  return (
    <Routes>
      <Route path="/" element={<PublicOnly><Landing /></PublicOnly>} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route element={<Protected><Shell /></Protected>}>
        <Route path="/home" element={<Home />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/edit" element={<EditProfile />} />
      </Route>
      {/* Full-screen pages sit outside the shell */}
      <Route path="/messages/:id" element={child(<Chat />)} />
      <Route path="/live" element={child(<Live />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}