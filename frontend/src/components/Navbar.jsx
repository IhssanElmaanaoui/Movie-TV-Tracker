import { useState, useEffect, useRef } from "react";
import { flushSync } from 'react-dom';
import { useNavigate, useLocation } from "react-router-dom";
import { Search, UserCircle, Menu, X, Home, Film, Tv, Clock, BookmarkCheck, MessageCircle, Users, UserPlus } from "lucide-react";
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import projectionLogo from "../../../logos/projection.png";
import { userStorage } from "../services/authService";
import chatService from "../services/chatService";

export default function Navbar({ onSignUpClick }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [genreOpen, setGenreOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newFollowersCount, setNewFollowersCount] = useState(0);
  const [showConnections, setShowConnections] = useState(false);
  const [showMobileConnections, setShowMobileConnections] = useState(false);
  const [recentFollowers, setRecentFollowers] = useState([]);
  const [toast, setToast] = useState(null);
  const prevFollowerCountRef = useRef(0);
  const recentFollowersRef = useRef([]);
  const isInitialFetchRef = useRef(true);
  const followerWsRef = useRef(null);
  const messageWsRef = useRef(null);

  const profileRef = useRef(null);
  const searchRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const connectionsRef = useRef(null);

  const TOKEN = import.meta.env.VITE_TMDB_BEARER_TOKEN;

  const genres = [
    "Action",
    "Adventure",
    "Animation",
    "Comedy",
    "Crime",
    "Documentary",
    "Drama",
    "Fantasy",
    "Horror",
    "Mystery",
    "Romance",
    "Sci-Fi",
    "Thriller",
    "Western"
  ];

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < lastScrollY || currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setShowMobileMenu(false);
      }
      if (connectionsRef.current && !connectionsRef.current.contains(event.target)) {
        setShowConnections(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileOpen, showSuggestions, showMobileMenu]);

  // Fetch followers for new follower notifications
  useEffect(() => {
    const fetchFollowers = async () => {
      const storedUser = userStorage.getUser();
      if (!userStorage.isAuthenticated() || !storedUser?.id) return;
      try {
        const res = await fetch(`http://localhost:8080/api/users/${storedUser.id}/followers`);
        if (res.ok) {
          const data = await res.json();
          const storageKey = `lastSeenFollowers_${storedUser.id}`;
          if (isInitialFetchRef.current) {
            isInitialFetchRef.current = false;
            const lastSeen = parseInt(localStorage.getItem(storageKey) || '0');
            setNewFollowersCount(Math.max(0, data.length - lastSeen));
          } else {
            const prevIds = new Set(recentFollowersRef.current.map(f => f.id));
            const newOnes = data.filter(f => !prevIds.has(f.id));
            if (newOnes.length > 0) {
              setToast(`${newOnes[0].username} started following you`);
              setTimeout(() => setToast(null), 4000);
              const lastSeen = parseInt(localStorage.getItem(storageKey) || '0');
              setNewFollowersCount(Math.max(0, data.length - lastSeen));
            }
          }
          prevFollowerCountRef.current = data.length;
          recentFollowersRef.current = data;
          setRecentFollowers(data);
        }
      } catch (err) {
        console.error('Error fetching followers:', err);
      }
    };

    fetchFollowers();
    const interval = setInterval(fetchFollowers, 20000);

    // WebSocket subscription for instant new-follower notifications
    const wsUser = userStorage.getUser();
    if (userStorage.isAuthenticated() && wsUser?.id) {
      try {
        const client = Stomp.over(() => new SockJS('http://localhost:8080/ws'));
        client.debug = () => { };
        client.connect({}, () => {
          console.log('[Followers WS] Connected, subscribing to /topic/followers/' + wsUser.id);
          client.subscribe(`/topic/followers/${wsUser.id}`, (message) => {
            try {
              const data = JSON.parse(message.body);
              const alreadyInList = recentFollowersRef.current.find(f => String(f.id) === String(data.id));

              if (data.type === 'UNFOLLOW') {
                if (!alreadyInList) return; // wasn't a pending notification, nothing to do
                recentFollowersRef.current = recentFollowersRef.current.filter(f => String(f.id) !== String(data.id));
                flushSync(() => {
                  setRecentFollowers([...recentFollowersRef.current]);
                  setNewFollowersCount(prev => Math.max(0, prev - 1));
                });
              } else {
                if (alreadyInList) return; // duplicate, ignore
                recentFollowersRef.current = [data, ...recentFollowersRef.current];
                flushSync(() => {
                  setRecentFollowers([...recentFollowersRef.current]);
                  setNewFollowersCount(prev => prev + 1);
                  setToast(`${data.username} started following you`);
                });
                setTimeout(() => setToast(null), 4000);
              }
            } catch (e) {
              console.error('[Followers WS] Parse error', e);
            }
          });
        }, (err) => {
          console.error('[Followers WS] Connection error:', err);
        });
        followerWsRef.current = client;
      } catch (e) {
        console.warn('Could not connect follower WS:', e);
      }
    }

    return () => {
      clearInterval(interval);
      if (followerWsRef.current?.connected) {
        followerWsRef.current.disconnect();
      }
    };
  }, []);

  // Fetch unread message count + real-time WebSocket subscription
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (userStorage.isAuthenticated()) {
        const result = await chatService.getUnreadCount();
        if (result.success) {
          setUnreadCount(result.data);
        }
      }
    };

    // Fetch immediately
    fetchUnreadCount();

    // Poll every 60 seconds as a fallback
    const interval = setInterval(fetchUnreadCount, 60000);

    // Pending fetch timer — allows chatMessagesRead to cancel it before it runs
    let pendingFetchTimer = null;
    const scheduleFetch = () => {
      // Never show badge while the user is already on the chat page
      if (window.location.pathname === '/chat') return;
      clearTimeout(pendingFetchTimer);
      pendingFetchTimer = setTimeout(fetchUnreadCount, 250);
    };
    const cancelAndRefetch = () => {
      clearTimeout(pendingFetchTimer);
      pendingFetchTimer = setTimeout(fetchUnreadCount, 150);
    };

    // WebSocket subscription for instant unread count updates
    const wsUser = userStorage.getUser();
    if (userStorage.isAuthenticated() && wsUser?.id) {
      try {
        const client = Stomp.over(() => new SockJS('http://localhost:8080/ws'));
        client.debug = () => { };
        client.connect({}, () => {
          client.subscribe(`/user/${wsUser.id}/queue/messages`, () => {
            // Schedule a fetch — Chat page may cancel this if it's already viewing the conversation
            scheduleFetch();
          });
        }, (err) => {
          console.error('[Messages WS] Connection error:', err);
        });
        messageWsRef.current = client;
      } catch (e) {
        console.warn('Could not connect message WS:', e);
      }
    }

    // chatNewMessage: a message arrived for a non-active conversation
    const handleNewMessage = () => scheduleFetch();
    // chatMessagesRead: user is viewing the conversation — cancel any pending badge increment and refetch
    const handleMessagesRead = () => cancelAndRefetch();
    window.addEventListener('chatNewMessage', handleNewMessage);
    window.addEventListener('chatMessagesRead', handleMessagesRead);

    return () => {
      clearInterval(interval);
      clearTimeout(pendingFetchTimer);
      if (messageWsRef.current?.connected) {
        messageWsRef.current.disconnect();
      }
      window.removeEventListener('chatNewMessage', handleNewMessage);
      window.removeEventListener('chatMessagesRead', handleMessagesRead);
    };
  }, []);

  // Re-fetch unread count whenever the route changes (clears badge when entering /chat, restores it when leaving)
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (userStorage.isAuthenticated()) {
        if (location.pathname === '/chat') {
          setUnreadCount(0);
        } else {
          const result = await chatService.getUnreadCount();
          if (result.success) setUnreadCount(result.data);
        }
      }
    };
    fetchUnreadCount();
  }, [location.pathname]);

  // Fetch suggestions when user types 3+ characters
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (search.trim().length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setLoadingSuggestions(true);

      try {
        // Fetch movies and TV shows in parallel
        const [moviesResponse, tvResponse] = await Promise.all([
          fetch(
            `https://api.themoviedb.org/3/search/movie?query=${search}&page=1`,
            {
              headers: {
                Authorization: `Bearer ${TOKEN}`,
                "Content-Type": "application/json",
              },
            }
          ),
          fetch(
            `https://api.themoviedb.org/3/search/tv?query=${search}&page=1`,
            {
              headers: {
                Authorization: `Bearer ${TOKEN}`,
                "Content-Type": "application/json",
              },
            }
          )
        ]);

        const moviesData = await moviesResponse.json();
        const tvData = await tvResponse.json();

        const movies = (moviesData.results || []).slice(0, 3).map(item => ({ ...item, media_type: 'movie' }));
        const tvShows = (tvData.results || []).slice(0, 3).map(item => ({ ...item, media_type: 'tv' }));

        const combined = [...movies, ...tvShows].sort((a, b) => b.popularity - a.popularity).slice(0, 5);

        setSuggestions(combined);
        setShowSuggestions(true);
      } catch (err) {
        console.error("Error fetching suggestions:", err);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [search, TOKEN]);

  /* ✅ Search Redirect */
  const handleSearch = (e) => {
    if (e.key === "Enter" && search.trim() !== "") {
      navigate(`/search?query=${search}`);
      setSearch("");
      setShowSuggestions(false);
      setMobileOpen(false);
    }
  };

  const handleSuggestionClick = (item) => {
    const detailPath = item.media_type === 'movie' ? `/movie/${item.id}` : `/tv/${item.id}`;
    navigate(detailPath);
    setShowSuggestions(false);
    setSearch("");
    setMobileOpen(false);
  };

  return (
    <>
      {/* ===== TOAST NOTIFICATION ===== */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-4 py-3 bg-gray-900 border border-purple-600/60 rounded-xl shadow-2xl text-white text-sm font-medium animate-slideDown max-w-xs w-full">
          <UserPlus size={18} className="text-purple-400 flex-shrink-0" />
          <span className="flex-1">{toast}</span>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ===== TOP NAVBAR (Desktop & Mobile) ===== */}
      <nav
        className={`w-full fixed left-0 z-50 transition-transform duration-300 pt-2
        ${showMobileSearch ? 'backdrop-blur-xl bg-black/20' : mobileOpen ? 'bg-gray-900' : 'bg-gradient-to-b from-black/80 via-black/40 to-transparent'}
        ${isVisible ? 'top-0 translate-y-0' : '-translate-y-full'}`}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between min-h-[20px]">

            {/* ✅ Logo */}
            <img
              src={projectionLogo}
              alt="Projection"
              onClick={() => navigate("/")}
              className="h-[80px] cursor-pointer hover:opacity-80 transition mb-6"
            />

            {/* ✅ Desktop Links */}
            <div className="hidden md:flex items-center gap-10 text-gray-300 font-medium">
              <button
                onClick={() => navigate("/movies")}
                className="hover:text-white transition"
              >
                Movies
              </button>

              <button
                onClick={() => navigate("/series")}
                className="hover:text-white transition"
              >
                Series
              </button>

              <div
                className="relative"
                onMouseEnter={() => setGenreOpen(true)}
                onMouseLeave={() => setGenreOpen(false)}
              >
                <button className="hover:text-white transition">
                  Genre
                </button>

                {/* Genre Dropdown */}
                {genreOpen && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full pt-2 w-80">
                    <div className="bg-gray-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700/80 overflow-hidden">
                      <div className="grid grid-cols-2 gap-1 p-2 max-h-96 overflow-y-auto">
                        {genres.map((genre) => (
                          <button
                            key={genre}
                            onClick={() => {
                              navigate(`/genre/${genre.toLowerCase()}`);
                              setGenreOpen(false);
                            }}
                            className="text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gradient-to-r hover:from-purple-600 hover:to-purple-600 hover:text-white transition-all duration-200 rounded-lg font-medium"
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => navigate("/community")}
                className="hover:text-white transition"
              >
                Community
              </button>


            </div>

            {/* ✅ Desktop Search */}
            <div className="hidden md:flex relative w-[280px]" ref={searchRef}>
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white outline-none z-10"
              />

              <input
                type="text"
                placeholder="Search movies & series..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearch}
                className="w-full pl-10 pr-4 py-2 rounded-full
              bg-black/20 border border-white/40
              text-white font-semibold
              placeholder-transparent focus:placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-white"
              />

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-gray-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700/80 overflow-hidden z-50">
                  {loadingSuggestions ? (
                    <div className="px-4 py-3 text-gray-400 text-sm">Loading...</div>
                  ) : (
                    <div>
                      {suggestions.map((item) => {
                        const title = item.media_type === 'movie' ? item.title : item.name;
                        const year = item.media_type === 'movie'
                          ? item.release_date?.slice(0, 4)
                          : item.first_air_date?.slice(0, 4);

                        return (
                          <button
                            key={`${item.media_type}-${item.id}`}
                            onClick={() => handleSuggestionClick(item)}
                            className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-800/50 transition-colors border-b border-gray-700/50 last:border-b-0"
                          >
                            {item.poster_path ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                                alt={title}
                                className="w-10 h-14 object-cover rounded"
                              />
                            ) : (
                              <div className="w-10 h-14 bg-gray-800 rounded flex items-center justify-center text-xs text-gray-500">
                                No Image
                              </div>
                            )}
                            <div className="flex-1 text-left">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-1.5 py-0.5 rounded ${item.media_type === 'movie' ? 'bg-purple-600/30 text-purple-600' : 'bg-purple-600/30 text-purple-600 300'}`}>
                                  {item.media_type === 'movie' ? 'Movie' : 'Series'}
                                </span>
                              </div>
                              <p className="text-white text-sm font-medium mt-1">{title}</p>
                              {year && <p className="text-gray-400 text-xs">{year}</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ✅ Right Icons */}
            <div className="flex items-center gap-4 relative" ref={profileRef}>

              {/* Connections Icon - Only show if authenticated */}
              {userStorage.isAuthenticated() && (
                <div className="relative" ref={connectionsRef}>
                  <button
                    onClick={() => {
                      const opening = !showConnections;
                      setShowConnections(opening);
                      if (opening) {
                        const storedUser = userStorage.getUser();
                        if (storedUser?.id) {
                          localStorage.setItem(`lastSeenFollowers_${storedUser.id}`, String(recentFollowersRef.current.length));
                          setNewFollowersCount(0);
                        }
                      }
                    }}
                    className="hidden md:flex w-10 h-10 items-center justify-center
                    rounded-full border border-gray-500/50 hover:border-white mb-6 transition-colors"
                    title="New Followers"
                  >
                    <UserPlus className="text-gray-300" size={22} />
                  </button>
                  {newFollowersCount > 0 && (
                    <span className="hidden md:flex absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 items-center justify-center">
                      {newFollowersCount > 9 ? '9+' : newFollowersCount}
                    </span>
                  )}

                  {/* Connections Dropdown */}
                  {showConnections && (
                    <div className="absolute right-0 top-14 w-80 bg-gray-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700/80 overflow-hidden z-50" style={{ marginTop: '0.25rem' }}>
                      <div className="px-4 py-3 border-b border-gray-700/80">
                        <h3 className="text-white font-semibold text-sm">New Followers</h3>
                      </div>
                      {recentFollowers.length === 0 ? (
                        <div className="px-4 py-6 text-center text-gray-400 text-sm">No followers yet</div>
                      ) : (
                        <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                          {recentFollowers.map((follower) => (
                            <div key={follower.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-800/60 last:border-b-0 hover:bg-gray-800/40 transition-colors">
                              <div
                                className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0 cursor-pointer"
                                onClick={() => { setShowConnections(false); navigate(`/user/${follower.id}`); }}
                              >
                                {follower.profilePictureUrl ? (
                                  <img src={follower.profilePictureUrl.startsWith('http') ? follower.profilePictureUrl : `/api/users/profile-picture/${follower.profilePictureUrl}`} alt={follower.username} className="w-full h-full object-cover" />
                                ) : (
                                  <UserCircle className="w-full h-full text-gray-500 p-1" />
                                )}
                              </div>
                              <span
                                className="flex-1 text-white text-sm font-medium cursor-pointer hover:text-purple-400 transition-colors truncate"
                                onClick={() => { setShowConnections(false); navigate(`/user/${follower.id}`); }}
                              >
                                {follower.username}
                              </span>
                              <button
                                onClick={async () => {
                                  const storedUser = userStorage.getUser();
                                  try {
                                    const res = await fetch(`http://localhost:8080/api/users/${storedUser.id}/follow/${follower.id}`, { method: 'POST' });
                                    if (res.ok || res.status === 400) {
                                      // 400 = already following — either way mark as followed
                                      setRecentFollowers(prev => prev.map(f => f.id === follower.id ? { ...f, followedBack: true } : f));
                                    }
                                  } catch (err) { console.error('[Follow Back]', err); }
                                }}
                                disabled={follower.followedBack}
                                className={`flex-shrink-0 px-2.5 py-1 text-xs rounded-lg transition-colors ${follower.followedBack ? 'bg-gray-700 text-gray-400 cursor-default' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                              >
                                {follower.followedBack ? 'Following' : 'Follow Back'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Messages Icon - Only show if authenticated */}
              {userStorage.isAuthenticated() && (
                <div className="relative">
                  <button
                    onClick={() => navigate("/chat")}
                    className="hidden md:flex w-10 h-10 items-center justify-center
                    rounded-full border border-gray-500/50 hover:border-white mb-6 transition-colors"
                    title="Messages"
                  >
                    <MessageCircle className="text-gray-300" size={24} />
                  </button>
                  {unreadCount > 0 && location.pathname !== '/chat' && (
                    <span className="hidden md:flex absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
              )}

              {/* Profile */}
              <button
                onClick={() => {
                  if (userStorage.isAuthenticated()) {
                    navigate("/profile");
                    setProfileOpen(false);
                  } else {
                    setProfileOpen(!profileOpen);
                  }
                }}
                className="w-10 h-10 flex items-center justify-center
              rounded-full border border-gray-500/50 hover:border-white mb-6"
              >
                <UserCircle className="text-gray-300" size={28} />
              </button>

              {/* Profile Dropdown - Only show if not authenticated */}
              {profileOpen && !userStorage.isAuthenticated() && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-14 w-44
                bg-gray-900/90 backdrop-blur-md
                rounded-xl shadow-lg border border-gray-700 overflow-hidden"
                >
                  <button
                    onClick={() => navigate("/login")}
                    className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800"
                  >
                    Login
                  </button>

                  <button
                    onClick={() => navigate("/signup")}
                    className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Search Overlay - Fixed at Top */}
      {showMobileSearch && (
        <>
          {/* Dark Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/80 z-[60]"
            onClick={() => setShowMobileSearch(false)}
          ></div>

          {/* Search Modal */}
          <div className="md:hidden fixed top-20 left-0 right-0 backdrop-blur-xl bg-black/20 z-[70] px-6 py-6 shadow-2xl">
            <div className="relative" ref={searchRef}>
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10"
              />
              <input
                type="text"
                placeholder="Search movies & series..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearch}
                autoFocus
                className="w-full pl-10 pr-4 py-3 rounded-full
                bg-black/40 border border-gray-700/40
                text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white"
              />

              {/* Mobile Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-gray-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700/80 overflow-hidden z-[80] max-h-[70vh] overflow-y-auto">
                  {loadingSuggestions ? (
                    <div className="px-4 py-3 text-gray-400 text-sm">Loading...</div>
                  ) : (
                    <div>
                      {suggestions.map((item) => {
                        const title = item.media_type === 'movie' ? item.title : item.name;
                        const year = item.media_type === 'movie'
                          ? item.release_date?.slice(0, 4)
                          : item.first_air_date?.slice(0, 4);

                        return (
                          <button
                            key={`mobile-search-${item.media_type}-${item.id}`}
                            onClick={() => {
                              handleSuggestionClick(item);
                              setShowMobileSearch(false);
                            }}
                            className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-800/50 transition-colors border-b border-gray-700/50 last:border-b-0"
                          >
                            {item.poster_path ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                                alt={title}
                                className="w-10 h-14 object-cover rounded"
                              />
                            ) : (
                              <div className="w-10 h-14 bg-gray-800 rounded flex items-center justify-center text-xs text-gray-500">
                                No Image
                              </div>
                            )}
                            <div className="flex-1 text-left">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-1.5 py-0.5 rounded ${item.media_type === 'movie' ? 'bg-purple-600/30 text-purple-600' : 'bg-purple-600/30 text-purple-600 300'}`}>
                                  {item.media_type === 'movie' ? 'Movie' : 'Series'}
                                </span>
                              </div>
                              <p className="text-white text-sm font-medium mt-1">{title}</p>
                              {year && <p className="text-gray-400 text-xs">{year}</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ===== BOTTOM NAVBAR (Mobile Only) ===== */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700/50 z-30 pb-safe">
        <div className="flex items-center justify-around px-4 py-3">

          {/* Home Button */}
          <button
            onClick={() => navigate("/")}
            className="flex flex-col items-center gap-1 text-gray-300 hover:text-white transition"
          >
            <Home size={24} />
            <span className="text-xs font-medium">Home</span>
          </button>

          {/* Search Button */}
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="flex flex-col items-center gap-1 text-gray-300 hover:text-white transition"
          >
            <Search size={24} />
            <span className="text-xs font-medium">Search</span>
          </button>

          {/* Messages Button - Only show if authenticated */}
          {userStorage.isAuthenticated() && (
            <div className="relative">
              <button
                onClick={() => navigate("/chat")}
                className="flex flex-col items-center gap-1 text-gray-300 hover:text-white transition"
              >
                <MessageCircle size={24} />
                <span className="text-xs font-medium">Chat</span>
              </button>
              {unreadCount > 0 && location.pathname !== '/chat' && (
                <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
          )}

          {/* Followers Button - Only show if authenticated */}
          {userStorage.isAuthenticated() && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowMobileConnections(true);
                  const storedUser = userStorage.getUser();
                  if (storedUser?.id) {
                    localStorage.setItem(`lastSeenFollowers_${storedUser.id}`, String(recentFollowersRef.current.length));
                    setNewFollowersCount(0);
                  }
                }}
                className="flex flex-col items-center gap-1 text-gray-300 hover:text-white transition"
              >
                <UserPlus size={24} />
                <span className="text-xs font-medium">Followers</span>
              </button>
              {newFollowersCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {newFollowersCount > 9 ? '9+' : newFollowersCount}
                </span>
              )}
            </div>
          )}

          {/* Menu Button with Popup */}
          <div className="relative" ref={mobileMenuRef}>
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="flex flex-col items-center gap-1 text-gray-300 hover:text-white transition"
            >
              <Menu size={24} />
              <span className="text-xs font-medium">Menu</span>
            </button>

            {/* Menu Popup (Similar to Add Menu Design) */}
            {showMobileMenu && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white backdrop-filter backdrop-blur-lg rounded-lg shadow-2xl min-w-[220px] overflow-hidden animate-slideDown">

                {/* Content Category */}
                <div className="border-b border-gray-200 px-3 py-2 bg-gray-50">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Content</p>
                </div>

                <button
                  onClick={() => {
                    navigate("/movies");
                    setShowMobileMenu(false);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  <Film size={20} className="flex-shrink-0" />
                  <span className="font-medium text-sm">Movies</span>
                </button>

                <button
                  onClick={() => {
                    navigate("/series");
                    setShowMobileMenu(false);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  <Tv size={20} className="flex-shrink-0" />
                  <span className="font-medium text-sm">Series</span>
                </button>

                <button
                  onClick={() => {
                    navigate("/community");
                    setShowMobileMenu(false);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-gray-900 hover:bg-gray-100 transition-colors border-b border-gray-200"
                >
                  <Users size={20} className="flex-shrink-0" />
                  <span className="font-medium text-sm">Community</span>
                </button>

                {/* Personal Category */}
                <div className="border-b border-gray-200 px-3 py-2 bg-gray-50">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Personal</p>
                </div>

                <button
                  onClick={() => {
                    navigate("/history");
                    setShowMobileMenu(false);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  <Clock size={20} className="flex-shrink-0" />
                  <span className="font-medium text-sm">History</span>
                </button>

                <button
                  onClick={() => {
                    navigate("/watchlist");
                    setShowMobileMenu(false);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  <BookmarkCheck size={20} className="flex-shrink-0" />
                  <span className="font-medium text-sm">Watchlist</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== MOBILE CONNECTIONS PANEL ===== */}
      {showMobileConnections && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/70 z-[60]"
            onClick={() => setShowMobileConnections(false)}
          />
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-[70] rounded-t-2xl max-h-[75vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/80 flex-shrink-0">
              <h3 className="text-white font-bold text-base">New Followers</h3>
              <button
                onClick={() => setShowMobileConnections(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            {/* List */}
            <div className="overflow-y-auto flex-1 pb-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {recentFollowers.length === 0 ? (
                <div className="px-5 py-10 text-center text-gray-400 text-sm">No followers yet</div>
              ) : (
                recentFollowers.map((follower) => (
                  <div key={follower.id} className="flex items-center gap-3 px-5 py-4 border-b border-gray-800/60 last:border-b-0">
                    <div
                      className="w-11 h-11 rounded-full bg-gray-700 overflow-hidden flex-shrink-0 cursor-pointer"
                      onClick={() => { setShowMobileConnections(false); navigate(`/user/${follower.id}`); }}
                    >
                      {follower.profilePictureUrl ? (
                        <img src={follower.profilePictureUrl.startsWith('http') ? follower.profilePictureUrl : `/api/users/profile-picture/${follower.profilePictureUrl}`} alt={follower.username} className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle className="w-full h-full text-gray-500 p-1" />
                      )}
                    </div>
                    <span
                      className="flex-1 text-white text-sm font-medium cursor-pointer hover:text-purple-400 transition-colors truncate"
                      onClick={() => { setShowMobileConnections(false); navigate(`/user/${follower.id}`); }}
                    >
                      {follower.username}
                    </span>
                    <button
                      onClick={async () => {
                        const storedUser = userStorage.getUser();
                        try {
                          const res = await fetch(`http://localhost:8080/api/users/${storedUser.id}/follow/${follower.id}`, { method: 'POST' });
                          if (res.ok || res.status === 400) {
                            setRecentFollowers(prev => prev.map(f => f.id === follower.id ? { ...f, followedBack: true } : f));
                          }
                        } catch (err) { console.error('[Follow Back mobile]', err); }
                      }}
                      disabled={follower.followedBack}
                      className={`flex-shrink-0 px-3 py-1.5 text-xs rounded-lg transition-colors ${follower.followedBack ? 'bg-gray-700 text-gray-400 cursor-default' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                    >
                      {follower.followedBack ? 'Following' : 'Follow Back'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
