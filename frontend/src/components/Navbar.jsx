import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserCircle, Menu, X } from "lucide-react";
import projectionLogo from "../../../logos/projection.png";

export default function Navbar({ onSignUpClick }) {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [genreOpen, setGenreOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const profileRef = useRef(null);

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
    };

    if (profileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileOpen]);

  /* ✅ Search Redirect */
  const handleSearch = (e) => {
    if (e.key === "Enter" && search.trim() !== "") {
      navigate(`/search?query=${search}`);
      setSearch("");
      setMobileOpen(false);
    }
  };

  return (
    <nav
      className={`w-full fixed left-0 z-50 transition-transform duration-300
      bg-gradient-to-b from-black/80 via-black/40 to-transparent pt-2
      ${isVisible ? 'top-0 translate-y-0' : '-translate-y-full'}`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between min-h-[20px] ">

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
          <div className="hidden md:flex relative w-[280px]">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white outline-none"
            />

            <input
              type="text"
              placeholder="Search movies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearch}
              className="w-full pl-10 pr-4 py-2 rounded-full
              bg-black/20 border border-white/40
              text-white font-semibold
              placeholder-transparent focus:placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-white"
            />
          </div>

          {/* ✅ Right Icons */}
          <div className="flex items-center gap-4 relative" ref={profileRef}>

            {/* Profile */}
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="w-10 h-10 flex items-center justify-center
              rounded-full border border-gray-500/50 hover:border-white"
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

            {/* ✅ Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden text-gray-300"
            >
              {mobileOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* ✅ Mobile Dropdown Menu */}
        {mobileOpen && (
          <div className="md:hidden mt-3 bg-black/70 rounded-xl p-4 space-y-4">

            <button
              onClick={() => navigate("/movies")}
              className="block text-gray-300 hover:text-white"
            >
              Movies
            </button>

            <button
              onClick={() => navigate("/series")}
              className="block text-gray-300 hover:text-white"
            >
              Series
            </button>

            {/* Genre Mobile */}
            <div>
              <button
                onClick={() => setGenreOpen(!genreOpen)}
                className="block text-gray-300 hover:text-white w-full text-left font-medium"
              >
                Genre
              </button>

              {/* Genre Dropdown Mobile */}
              {genreOpen && (
                <div className="mt-3 ml-2 grid grid-cols-2 gap-2 bg-slate-800/50 rounded-lg p-3">
                  {genres.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => {
                        navigate(`/genre/${genre.toLowerCase()}`);
                        setGenreOpen(false);
                        setMobileOpen(false);
                      }}
                      className="text-left px-3 py-2 text-gray-400 hover:text-white text-sm bg-slate-700/30 hover:bg-gradient-to-r hover:from-blue-600 hover:to-cyan-600 rounded-md transition-all duration-200"
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search Mobile */}
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearch}
                className="w-full pl-10 pr-4 py-2 rounded-full
                bg-black/20 border border-gray-600/40
                text-white placeholder-gray-400"
              />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
