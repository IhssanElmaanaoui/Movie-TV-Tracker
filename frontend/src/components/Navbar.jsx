import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, UserCircle, Menu, X } from "lucide-react";

export default function Navbar({ onSignUpClick }) {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
      className="w-full fixed top-0 left-0 z-50
      bg-gradient-to-b from-black/80 via-black/40 to-transparent"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">

          {/* ✅ Logo */}
          <h1
            onClick={() => navigate("/")}
            className="text-2xl font-bold cursor-pointer
            text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400"
          >
            Projection
          </h1>

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

            <button
              onClick={() => navigate("/dashboard")}
              className="hover:text-white transition"
            >
              Dashboard
            </button>

            
          </div>

          {/* ✅ Desktop Search */}
          <div className="hidden md:flex relative w-[280px]">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              placeholder="Search movies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearch}
              className="w-full pl-10 pr-4 py-2 rounded-full
              bg-black/20 border border-gray-600/40
              text-white font-semibold
              placeholder-transparent focus:placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* ✅ Right Icons */}
          <div className="flex items-center gap-4 relative">

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
                className="absolute right-0 top-14 w-44
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

            <button
              onClick={() => navigate("/dashboard")}
              className="block text-gray-300 hover:text-white"
            >
              Dashboard
            </button>

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
