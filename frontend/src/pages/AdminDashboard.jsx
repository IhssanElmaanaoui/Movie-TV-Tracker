import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserCheck, UserX, ShieldAlert, Shield,
  MessageSquare, MessageCircle, TrendingUp, Eye,
  Globe, ArrowRight, RefreshCw, AlertCircle, LogOut,
  Star, Bookmark, Film, Tv, BarChart2, Calendar
} from 'lucide-react';
import adminService from '../services/adminService';
import { userStorage } from '../services/authService';
import { fetchContentDetails, getPosterUrl } from '../services/tmdbService';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w92';
const TMDB_URL = 'https://www.themoviedb.org';

const PERIODS = [
  { label: 'Today',    value: 'day'   },
  { label: 'Week',     value: 'week'  },
  { label: 'Month',    value: 'month' },
  { label: 'All Time', value: 'all'   },
];

// ─── Small reusable components ──────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, colorClass, bgClass, sub }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 flex items-center gap-4 hover:border-gray-500 transition-colors">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bgClass}`}>
        <Icon className={`w-6 h-6 ${colorClass}`} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
        <p className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, iconClass, children, empty }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`w-4 h-4 ${iconClass}`} />
        <h2 className="text-sm font-semibold text-white uppercase tracking-wide">{title}</h2>
      </div>
      {empty
        ? <p className="text-gray-500 text-sm text-center py-6">No data yet</p>
        : children}
    </div>
  );
}

function ContentRow({ rank, item, metric, metricLabel, showType }) {
  const [details, setDetails] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const type = item.contentType === 'TV_SHOW' ? 'TV' : item.contentType;
    fetchContentDetails(item.tmdbId, type)
      .then(data => {
        if (active) setDetails(data);
      })
      .catch(err => console.error(`Error fetching TMDB info for ${item.tmdbId}:`, err));
    return () => { active = false; };
  }, [item.tmdbId, item.contentType]);

  const handleClick = (e) => {
    e.preventDefault();
    if (item.contentType === 'MOVIE') {
      navigate(`/movie/${item.tmdbId}`);
    } else {
      navigate(`/tv/${item.tmdbId}`);
    }
  };

  const title = details ? (details.title || details.name) : `TMDB #${item.tmdbId}`;
  const posterUrl = details?.poster_path 
    ? getPosterUrl(details.poster_path, 'w92') 
    : 'https://via.placeholder.com/92x138?text=No+Image';

  return (
    <div
      onClick={handleClick}
      className="flex items-center gap-3 py-2.5 border-b border-gray-800/60 last:border-0 hover:bg-gray-800/30 -mx-2 px-2 rounded-lg transition-colors cursor-pointer"
    >
      <span className="text-gray-600 text-sm font-mono w-5 flex-shrink-0 text-center">{rank}</span>
      <img src={posterUrl} alt={title} className="w-10 h-14 object-cover rounded shadow-sm" />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate" title={title}>{title}</p>
        {showType && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${item.contentType === 'MOVIE' ? 'bg-purple-600/20 text-purple-400' : 'bg-blue-600/20 text-blue-400'}`}>
            {item.contentType === 'MOVIE' ? 'Movie' : 'TV Show'}
          </span>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-white text-sm font-semibold">{metric}</p>
        <p className="text-gray-500 text-xs">{metricLabel}</p>
      </div>
    </div>
  );
}

function BarRow({ label, count, max, colorClass }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300 truncate max-w-[60%]">{label}</span>
        <span className="text-white font-medium">{count.toLocaleString()}</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Mini bar chart for 30-day timeline ─────────────────────────────────────

function SignupTimeline({ data }) {
  if (!data?.length) return <p className="text-gray-500 text-sm text-center py-6">No data yet</p>;
  const max = Math.max(...data.map(d => d.count), 1);
  // show only last 14 days labels to avoid clutter
  const showLabel = (i) => i % 4 === 0;
  return (
    <div className="flex items-end gap-[3px] h-28 w-full">
      {data.map((d, i) => {
        const pct = (d.count / max) * 100;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="w-full rounded-t bg-purple-500/70 hover:bg-purple-400 transition-colors cursor-default"
              style={{ height: `${Math.max(pct, 2)}%` }}
              title={`${d.date}: ${d.count} signups`}
            />
            {showLabel(i) && (
              <span className="text-gray-600 text-[8px] rotate-45 origin-left whitespace-nowrap absolute -bottom-4 left-0">
                {d.date.slice(5)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod]     = useState('all');

  const user = userStorage.getUser();

  useEffect(() => {
    if (!user?.id || user.role !== 'ADMIN') navigate('/');
  }, [navigate]);

  const loadStats = useCallback((isRefresh = false, p = period) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    adminService.getDashboard(p)
      .then(r => setStats(r.data))
      .catch(e => setError(e.response?.data?.message || 'Failed to load stats'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [period]);

  useEffect(() => { loadStats(false, period); }, [period]);

  const handleSignOut = () => {
    userStorage.removeUser();
    navigate('/login');
  };

  // Content type totals
  const movieWatches = stats?.contentTypeSplit?.MOVIE ?? 0;
  const showWatches  = stats?.contentTypeSplit?.TV_SHOW ?? 0;
  const totalWatchesSplit = movieWatches + showWatches;
  const moviePct = totalWatchesSplit > 0 ? Math.round((movieWatches / totalWatchesSplit) * 100) : 50;
  const showPct  = 100 - moviePct;

  return (
    <div className="min-h-screen bg-slate-950 pt-28 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white">Admin Panel</h1>
              <span className="bg-purple-600/20 text-purple-400 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide border border-purple-600/30">
                Admin
              </span>
            </div>
            <p className="text-gray-400 text-sm">Welcome back, {user?.username}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadStats(true)}
              disabled={refreshing}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 text-red-400 hover:text-red-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        {/* ── Navigation Tabs ─────────────────────────────────────────── */}
        <div className="flex gap-2 mb-8 bg-gray-900 border border-gray-700 rounded-lg p-1 w-fit">
          <button className="bg-purple-600 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">
            Dashboard
          </button>
          <button
            onClick={() => navigate('/admin/community')}
            className="text-gray-400 hover:text-white text-sm font-medium px-4 py-2 rounded-md transition-colors hover:bg-gray-800"
          >
            Community Monitor
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg flex items-center gap-3 mb-6">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {loading && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-16 text-center">
            <div className="text-gray-400">Loading dashboard…</div>
          </div>
        )}

        {stats && (
          <>
            {/* ── Core counters ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard label="Total Users"    value={stats.totalUsers}        icon={Users}        colorClass="text-blue-400"    bgClass="bg-blue-500/10" />
              <StatCard label="Active"         value={stats.activeUsers}       icon={UserCheck}    colorClass="text-green-400"   bgClass="bg-green-500/10" />
              <StatCard label="Suspended"      value={stats.suspendedUsers}    icon={ShieldAlert}  colorClass="text-yellow-400"  bgClass="bg-yellow-500/10" />
              <StatCard label="Banned"         value={stats.bannedUsers}       icon={UserX}        colorClass="text-red-400"     bgClass="bg-red-500/10" />
              <StatCard label="Admins"         value={stats.adminCount}        icon={Shield}       colorClass="text-purple-400"  bgClass="bg-purple-500/10" />
              <StatCard label="Topics"         value={stats.totalTopics}       icon={MessageSquare} colorClass="text-indigo-400" bgClass="bg-indigo-500/10" />
              <StatCard label="Total Watches"  value={stats.totalWatches}      icon={Eye}          colorClass="text-cyan-400"    bgClass="bg-cyan-500/10" />
              <StatCard label="New (7d)"       value={stats.newUsersLast7Days} icon={TrendingUp}   colorClass="text-emerald-400" bgClass="bg-emerald-500/10" />
            </div>

            {/* ── Content type split ────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 className="w-4 h-4 text-gray-400" />
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Content Split</h2>
                </div>
                {totalWatchesSplit === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-6">No watch data yet</p>
                ) : (
                  <>
                    <div className="flex rounded-full overflow-hidden h-4 mb-4">
                      <div className="bg-purple-500 transition-all" style={{ width: `${moviePct}%` }} />
                      <div className="bg-blue-500 transition-all" style={{ width: `${showPct}%` }} />
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Film className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-gray-300">Movies <strong className="text-white">{moviePct}%</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Tv className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-gray-300">TV <strong className="text-white">{showPct}%</strong></span>
                      </div>
                    </div>
                    <p className="text-gray-500 text-xs mt-3">{stats.totalWatches?.toLocaleString()} total watches</p>
                  </>
                )}
              </div>

              {/* Community Health */}
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wide">Community Health</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Active rate</span><span className="text-white font-medium">{stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%</span></div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5"><div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${stats.totalUsers > 0 ? (stats.activeUsers / stats.totalUsers) * 100 : 0}%` }} /></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Moderated</span><span className="text-white font-medium">{stats.suspendedUsers + stats.bannedUsers}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Replies/topic</span><span className="text-white font-medium">{stats.totalTopics > 0 ? (stats.totalReplies / stats.totalTopics).toFixed(1) : '0'}</span></div>
                  </div>
                  <div className="space-y-2">
                    <button onClick={() => navigate('/admin/community')} className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-left group text-sm">
                      <div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-purple-400" /><span className="text-white">Monitor Community</span></div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />
                    </button>
                    <button onClick={() => navigate('/admin/community?tab=users')} className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-left group text-sm">
                      <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-blue-400" /><span className="text-white">Manage Users</span></div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />
                    </button>
                    <button onClick={() => navigate('/admin/community?tab=add-admin')} className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-left group text-sm">
                      <div className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-emerald-400" /><span className="text-white">Add Admin</span></div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Period selector ──────────────────────────────────────── */}
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-gray-400 text-sm font-medium uppercase tracking-wide">Top Content</h2>
              <div className="flex bg-gray-900 border border-gray-700 rounded-lg p-1 gap-1">
                {PERIODS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPeriod(p.value)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                      period === p.value
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Top Movies & Shows ───────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <SectionCard title="Top Movies" icon={Film} iconClass="text-purple-400" empty={!stats.topMovies?.length}>
                {stats.topMovies?.map((m, i) => (
                  <ContentRow key={m.tmdbId} rank={i + 1} item={m} metric={m.count} metricLabel="watches" />
                ))}
              </SectionCard>
              <SectionCard title="Top TV Shows" icon={Tv} iconClass="text-blue-400" empty={!stats.topShows?.length}>
                {stats.topShows?.map((m, i) => (
                  <ContentRow key={m.tmdbId} rank={i + 1} item={m} metric={m.count} metricLabel="watches" />
                ))}
              </SectionCard>
            </div>

            {/* ── Top Rated & Most Collected ──────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <SectionCard title="Top Rated (Platform)" icon={Star} iconClass="text-yellow-400" empty={!stats.topRated?.length}>
                {stats.topRated?.map((m, i) => (
                  <ContentRow key={m.tmdbId} rank={i + 1} item={m} metric={`★ ${m.avgRating?.toFixed(1)}`} metricLabel={`${m.count} ratings`} showType />
                ))}
              </SectionCard>
              <SectionCard title="Most Saved to Lists" icon={Bookmark} iconClass="text-emerald-400" empty={!stats.mostCollected?.length}>
                {stats.mostCollected?.map((m, i) => (
                  <ContentRow key={m.tmdbId} rank={i + 1} item={m} metric={m.count} metricLabel="saves" showType />
                ))}
              </SectionCard>
            </div>

            {/* ── Users by Country ────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <SectionCard title="Users by Country" icon={Globe} iconClass="text-cyan-400" empty={!stats.usersByCountry?.length}>
                {stats.usersByCountry?.slice(0, 10).map((c) => (
                  <BarRow
                    key={c.country}
                    label={c.country}
                    count={c.count}
                    max={stats.usersByCountry[0]?.count ?? 1}
                    colorClass="bg-cyan-500"
                  />
                ))}
              </SectionCard>

              {/* ── Signup Timeline ─────────────────────────────────── */}
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wide">New Signups (Last 30 Days)</h2>
                </div>
                <SignupTimeline data={stats.signupTimeline} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
