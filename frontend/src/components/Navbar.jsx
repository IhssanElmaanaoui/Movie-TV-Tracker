import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserCircle, Menu, X, Home, Film, Tv, Clock, BookmarkCheck } from "lucide-react";
import projectionLogo from "../../../logos/projection.png";

export default function Navbar({ onSignUpClick }) {
  const navigate = useNavigate();

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

  const profileRef = useRef(null);
  const searchRef = useRef(null);
  const mobileMenuRef = useRef(null);

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
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileOpen, showSuggestions, showMobileMenu]);

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
      {/* ===== TOP NAVBAR (Desktop & Mobile) ===== */}
      <nav
        className={`w-full fixed left-0 z-50 transition-transform duration-300 pt-2
        ${showMobileSearch ? 'backdrop-blur-xl bg-black/20' : mobileOpen ? 'bg-slate-900' : 'bg-gradient-to-b from-black/80 via-black/40 to-transparent'}
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
                    <div className="bg-slate-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700/80 overflow-hidden">
                      <div className="grid grid-cols-2 gap-1 p-2 max-h-96 overflow-y-auto">
                        {genres.map((genre) => (
                          <button
                            key={genre}
                            onClick={() => {
                              navigate(`/genre/${genre.toLowerCase()}`);
                              setGenreOpen(false);
                            }}
                            className="text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gradient-to-r hover:from-blue-600 hover:to-cyan-600 hover:text-white transition-all duration-200 rounded-lg font-medium"
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>


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
                <div className="absolute top-full mt-2 w-full bg-slate-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700/80 overflow-hidden z-50">
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
                            className="w-full px-4 py-3 flex items-start gap-3 hover:bg-slate-700/50 transition-colors border-b border-gray-700/50 last:border-b-0"
                          >
                            {item.poster_path ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                                alt={title}
                                className="w-10 h-14 object-cover rounded"
                              />
                            ) : (
                              <div className="w-10 h-14 bg-gray-700 rounded flex items-center justify-center text-xs text-gray-500">
                                No Image
                              </div>
                            )}
                            <div className="flex-1 text-left">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-1.5 py-0.5 rounded ${item.media_type === 'movie' ? 'bg-blue-600/30 text-blue-300' : 'bg-purple-600/30 text-purple-300'}`}>
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

              {/* Profile */}
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="w-10 h-10 flex items-center justify-center
              rounded-full border border-gray-500/50 hover:border-white mb-6"
              >
                <UserCircle className="text-gray-300" size={28} />
              </button>

              {/* Profile Dropdown */}
              {profileOpen && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-14 w-44
                bg-slate-900/90 backdrop-blur-md
                rounded-xl shadow-lg border border-gray-700 overflow-hidden"
                >
                  <button
                    onClick={() => navigate("/login")}
                    className="w-full text-left px-4 py-2 text-gray-300 hover:bg-slate-700"
                  >
                    Login
                  </button>

                  <button
                    onClick={() => navigate("/signup")}
                    className="w-full text-left px-4 py-2 text-gray-300 hover:bg-slate-700"
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
                bg-black/40 border border-gray-600/40
                text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white"
              />

              {/* Mobile Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-slate-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700/80 overflow-hidden z-[80] max-h-[70vh] overflow-y-auto">
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
                            className="w-full px-4 py-3 flex items-start gap-3 hover:bg-slate-700/50 transition-colors border-b border-gray-700/50 last:border-b-0"
                          >
                            {item.poster_path ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                                alt={title}
                                className="w-10 h-14 object-cover rounded"
                              />
                            ) : (
                              <div className="w-10 h-14 bg-gray-700 rounded flex items-center justify-center text-xs text-gray-500">
                                No Image
                              </div>
                            )}
                            <div className="flex-1 text-left">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-1.5 py-0.5 rounded ${item.media_type === 'movie' ? 'bg-blue-600/30 text-blue-300' : 'bg-purple-600/30 text-purple-300'}`}>
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-gray-700/50 z-30 pb-safe">
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
                  className="w-full px-4 py-3 flex items-center gap-3 text-gray-900 hover:bg-gray-100 transition-colors border-b border-gray-200"
                >
                  <Tv size={20} className="flex-shrink-0" />
                  <span className="font-medium text-sm">Series</span>
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
    </>
  );
}
