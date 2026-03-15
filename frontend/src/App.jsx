import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ShieldAlert, X } from "lucide-react";

import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Series from "./pages/Series";
import Login from "./components/Login";
import SearchResults from "./pages/SearchResults";
import SignUp from "./components/SignUp";
import Collections from "./pages/Collections";
import CollectionDetail from "./pages/CollectionDetail";
import GenrePage from "./pages/GenrePage";
import Movies from "./pages/Movies";
import MovieDetail from "./pages/MovieDetail";
import SeriesDetail from "./pages/SeriesDetail";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import UserProfile from "./pages/UserProfile";
import Community from "./pages/Community";
import TopicDetail from "./pages/TopicDetail";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCommunityMonitor from "./pages/AdminCommunityMonitor";
import useModerationAlert from "./hooks/useModerationAlert";
import { userStorage } from "./services/authService";

/** App-wide suspension / ban banner shown below the navbar */
function ModerationBanner() {
  const { alert, clear } = useModerationAlert();
  const user = userStorage.getUser();

  // Only show to the affected user (not to admins watching)
  if (!alert || !user) return null;

  const isBan = alert.action === 'BANNED';
  const suspendedUntil = alert.suspendedUntil
    ? new Date(alert.suspendedUntil).toLocaleString()
    : null;

  return (
    <div className={`fixed top-16 left-0 right-0 z-[100] ${isBan ? 'bg-red-900/95' : 'bg-yellow-900/95'} border-b ${isBan ? 'border-red-700' : 'border-yellow-700'} backdrop-blur-sm`}>
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-start gap-3">
        <ShieldAlert className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isBan ? 'text-red-400' : 'text-yellow-400'}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${isBan ? 'text-red-200' : 'text-yellow-200'}`}>
            {isBan ? '🚫 Your account has been permanently banned' : '⏸ Your account has been temporarily suspended'}
          </p>
          {alert.reason && (
            <p className="text-xs text-gray-300 mt-0.5">Reason: {alert.reason}</p>
          )}
          {suspendedUntil && !isBan && (
            <p className="text-xs text-gray-400 mt-0.5">Suspended until: {suspendedUntil}</p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">
            {isBan
              ? 'You can no longer post or comment. Contact support if you believe this is a mistake.'
              : 'You cannot post or comment until the suspension expires.'}
          </p>
        </div>
        {!isBan && (
          <button onClick={clear} className="text-gray-400 hover:text-white transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Navbar />
      <ModerationBanner />

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/series" element={<Series />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/collections" element={<ProtectedRoute><Collections /></ProtectedRoute>} />
        <Route path="/collection/:id" element={<CollectionDetail />} />
        <Route path="/genre/:genre" element={<GenrePage />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/movie/:id" element={<MovieDetail />} />
        <Route path="/tv/:id" element={<SeriesDetail />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/user/:userId" element={<UserProfile />} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/community" element={<Community />} />
        <Route path="/community/topic/:topicId" element={<TopicDetail />} />
        <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/community" element={<ProtectedRoute><AdminCommunityMonitor /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}
