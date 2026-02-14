import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RingLoader } from 'react-spinners';
import { ArrowLeft, ChevronLeft, ChevronRight, SlidersHorizontal, X, Calendar, TrendingUp, Film } from "lucide-react";
import CustomDropdown from "../components/CustomDropdown";

const TMDB_BEARER_TOKEN = import.meta.env.VITE_TMDB_BEARER_TOKEN || "YOUR_TOKEN_HERE";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
const ITEMS_PER_PAGE = 15;

export default function Movies() {
  const navigate = useNavigate();
  const [allMovies, setAllMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("popularity");
  const [yearFilter, setYearFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Filter options
  const sortOptions = [
    { value: "popularity", label: "Most Popular" },
    { value: "rating", label: "Highest Rated" },
    { value: "date-desc", label: "Newest First" },
    { value: "date-asc", label: "Oldest First" },
    { value: "title", label: "Title (A-Z)" }
  ];

  const yearOptions = [
    { value: "all", label: "All Years" },
    { value: "2024-2025", label: "2024-2025" },
    { value: "2020-2023", label: "2020-2023" },
    { value: "2010-2019", label: "2010-2019" },
    { value: "2000-2009", label: "2000-2009" },
    { value: "older", label: "Before 2000" }
  ];

  const genreOptions = [
    { value: "all", label: "All Genres" },
    ...genres.map(genre => ({ value: genre.id.toString(), label: genre.name }))
  ];

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const fetchPromises = [];

        // Fetch genres
        fetchPromises.push(
          fetch(
            `https://api.themoviedb.org/3/genre/movie/list`,
            {
              headers: {
                Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
              },
            }
          )
        );

        // Fetch 5 pages of popular movies
        for (let page = 1; page <= 5; page++) {
          fetchPromises.push(
            fetch(
              `https://api.themoviedb.org/3/movie/popular?page=${page}`,
              {
                headers: {
                  Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
                },
              }
            )
          );
        }

        const responses = await Promise.all(fetchPromises);
        const dataPromises = responses.map(res => res.json());
        const allData = await Promise.all(dataPromises);

        // First response is genres
        setGenres(allData[0].genres || []);

        // Rest are movie pages - deduplicate by movie ID
        const moviesMap = new Map();
        allData.slice(1).forEach((data) => {
          (data.results || []).forEach(movie => {
            moviesMap.set(movie.id, movie);
          });
        });

        setAllMovies(Array.from(moviesMap.values()));
      } catch (err) {
        console.error("Error fetching movies:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  // Fetch more content when filters are applied
  useEffect(() => {
    const fetchFilteredMovies = async () => {
      // Only fetch if at least one filter is applied
      if (genreFilter === "all" && yearFilter === "all") {
        return;
      }

      setLoading(true);
      try {
        // Build discover API URL with filters
        const params = new URLSearchParams();

        if (genreFilter !== "all") {
          params.append("with_genres", genreFilter);
        }

        if (yearFilter !== "all") {
          let minYear, maxYear;
          if (yearFilter === "2024-2025") {
            minYear = 2024;
            maxYear = 2025;
          } else if (yearFilter === "2020-2023") {
            minYear = 2020;
            maxYear = 2023;
          } else if (yearFilter === "2010-2019") {
            minYear = 2010;
            maxYear = 2019;
          } else if (yearFilter === "2000-2009") {
            minYear = 2000;
            maxYear = 2009;
          } else if (yearFilter === "older") {
            minYear = 1900;
            maxYear = 1999;
          }

          if (minYear && maxYear) {
            params.append("primary_release_date.gte", `${minYear}-01-01`);
            params.append("primary_release_date.lte", `${maxYear}-12-31`);
          }
        }

        params.append("sort_by", "popularity.desc");

        // Fetch 10 pages of filtered content for more results
        const fetchPromises = [];
        for (let page = 1; page <= 10; page++) {
          params.set("page", page.toString());
          fetchPromises.push(
            fetch(
              `https://api.themoviedb.org/3/discover/movie?${params.toString()}`,
              {
                headers: {
                  Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
                },
              }
            )
          );
        }

        const responses = await Promise.all(fetchPromises);
        const dataPromises = responses.map(res => res.json());
        const allData = await Promise.all(dataPromises);

        // Deduplicate movies by ID
        const moviesMap = new Map();
        allData.forEach((data) => {
          (data.results || []).forEach(movie => {
            moviesMap.set(movie.id, movie);
          });
        });

        setAllMovies(Array.from(moviesMap.values()));
        setCurrentPage(1);
      } catch (err) {
        console.error("Error fetching filtered movies:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredMovies();
  }, [genreFilter, yearFilter]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex justify-center items-center"
        style={{ backgroundColor: "#071427" }}
      >
        <RingLoader color="#361087" />
      </div>
    );
  }

  // Filter and sort movies
  const filteredMovies = allMovies.filter((movie) => {
    // Filter by genre
    if (genreFilter !== "all" && movie.genre_ids) {
      if (!movie.genre_ids.includes(parseInt(genreFilter))) return false;
    }

    // Filter by year
    if (yearFilter !== "all" && movie.release_date) {
      const year = new Date(movie.release_date).getFullYear();
      const currentYear = new Date().getFullYear();

      if (yearFilter === "2024-2025" && (year < 2024 || year > 2025)) return false;
      if (yearFilter === "2020-2023" && (year < 2020 || year > 2023)) return false;
      if (yearFilter === "2010-2019" && (year < 2010 || year > 2019)) return false;
      if (yearFilter === "2000-2009" && (year < 2000 || year > 2009)) return false;
      if (yearFilter === "older" && year >= 2000) return false;
    }

    return true;
  });

  // Sort movies
  const sortedMovies = [...filteredMovies].sort((a, b) => {
    switch (sortBy) {
      case "popularity":
        return b.popularity - a.popularity;
      case "rating":
        return b.vote_average - a.vote_average;
      case "date-desc":
        return new Date(b.release_date || 0) - new Date(a.release_date || 0);
      case "date-asc":
        return new Date(a.release_date || 0) - new Date(b.release_date || 0);
      case "title":
        return (a.title || "").localeCompare(b.title || "");
      default:
        return 0;
    }
  });

  // Calculate pagination
  const totalPages = Math.ceil(sortedMovies.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const displayedMovies = sortedMovies.slice(startIndex, endIndex);

  return (
    <div
      className="min-h-screen text-white pt-32 pb-12 animate-fadeIn"
      style={{ backgroundColor: "#071427" }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Header with Back Button and Filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all duration-200 hover:scale-105"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-4xl font-bold">Movies</h1>
            </div>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all duration-200 font-medium ${showFilters
              ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30'
              : 'bg-white/10 hover:bg-white/20'
              }`}
          >
            <SlidersHorizontal size={18} />
            <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
            {(sortBy !== "popularity" || yearFilter !== "all" || genreFilter !== "all") && (
              <span className="bg-blue-400 text-blue-950 text-xs font-bold px-2 py-0.5 rounded-full">•</span>
            )}
          </button>
        </div>

        {/* Active Filters Badge */}
        {(sortBy !== "popularity" || yearFilter !== "all" || genreFilter !== "all") && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-sm text-gray-400">Active filters:</span>
            {sortBy !== "popularity" && (
              <button
                onClick={() => {
                  setSortBy("popularity");
                  setCurrentPage(1);
                }}
                className="flex items-center gap-1.5 bg-blue-600/20 text-blue-300 px-3 py-1.5 rounded-full text-sm hover:bg-blue-600/30 transition-colors"
              >
                <TrendingUp size={14} />
                {sortBy === "rating" ? "Rating" : sortBy === "date-desc" ? "Newest" : sortBy === "date-asc" ? "Oldest" : "Title"}
                <X size={14} />
              </button>
            )}
            {genreFilter !== "all" && (
              <button
                onClick={() => {
                  setGenreFilter("all");
                  setCurrentPage(1);
                }}
                className="flex items-center gap-1.5 bg-green-600/20 text-green-300 px-3 py-1.5 rounded-full text-sm hover:bg-green-600/30 transition-colors"
              >
                <Film size={14} />
                {genres.find(g => g.id === parseInt(genreFilter))?.name || "Genre"}
                <X size={14} />
              </button>
            )}
            {yearFilter !== "all" && (
              <button
                onClick={() => {
                  setYearFilter("all");
                  setCurrentPage(1);
                }}
                className="flex items-center gap-1.5 bg-purple-600/20 text-purple-300 px-3 py-1.5 rounded-full text-sm hover:bg-purple-600/30 transition-colors"
              >
                <Calendar size={14} />
                {yearFilter === "2024-2025" ? "2024-2025" : yearFilter === "2020-2023" ? "2020-2023" : yearFilter === "2010-2019" ? "2010-2019" : yearFilter === "2000-2009" ? "2000-2009" : "Before 2000"}
                <X size={14} />
              </button>
            )}
            <button
              onClick={() => {
                setSortBy("popularity");
                setYearFilter("all");
                setGenreFilter("all");
                setCurrentPage(1);
              }}
              className="text-xs text-gray-400 hover:text-white transition-colors ml-2 underline"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Filter Controls */}
        {showFilters && (
          <div className="relative z-[100] bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/10 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Sort By */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                  <TrendingUp size={16} className="text-blue-400" />
                  Sort By
                </label>
                <CustomDropdown
                  value={sortBy}
                  onChange={(value) => {
                    setSortBy(value);
                    setCurrentPage(1);
                    setShowFilters(false);
                  }}
                  options={sortOptions}
                  focusColor="focus:ring-blue-500"
                />
              </div>

              {/* Genre Filter */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                  <Film size={16} className="text-green-400" />
                  Genre
                </label>
                <CustomDropdown
                  value={genreFilter}
                  onChange={(value) => {
                    setGenreFilter(value);
                    setCurrentPage(1);
                    setShowFilters(false);
                  }}
                  options={genreOptions}
                  focusColor="focus:ring-green-500"
                />
              </div>

              {/* Year Filter */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                  <Calendar size={16} className="text-purple-400" />
                  Release Year
                </label>
                <CustomDropdown
                  value={yearFilter}
                  onChange={(value) => {
                    setYearFilter(value);
                    setCurrentPage(1);
                    setShowFilters(false);
                  }}
                  options={yearOptions}
                  focusColor="focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Movies Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {displayedMovies.map((movie) => (
            <div
              key={movie.id}
              onClick={() => navigate(`/movie/${movie.id}`)}
              className="group cursor-pointer"
            >
              {/* Poster */}
              <div className="relative overflow-hidden rounded-lg mb-3 aspect-[2/3] bg-slate-800">
                {movie.poster_path ? (
                  <img
                    src={`${IMAGE_BASE_URL}${movie.poster_path}`}
                    alt={movie.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    No Image
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              {/* Title */}
              <h3 className="text-white font-semibold text-base mb-1 line-clamp-2">
                {movie.title}
              </h3>

              {/* Release Year and Rating */}
              <div className="flex items-center justify-between">
                {movie.release_date && (
                  <p className="text-gray-400 text-sm">
                    {new Date(movie.release_date).getFullYear()}
                  </p>
                )}
                {movie.vote_average > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-400 text-sm">★</span>
                    <span className="text-gray-300 text-sm">
                      {movie.vote_average.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-12">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`p-3 rounded-lg transition-colors ${currentPage === 1
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex items-center gap-2">
              {/* Sliding window of 3 pages */}
              {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                // Calculate the start of the window
                let startPage = Math.max(1, currentPage - 1);
                // Adjust if we're near the end
                if (startPage + 2 > totalPages) {
                  startPage = Math.max(1, totalPages - 2);
                }
                return startPage + i;
              }).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-lg transition-colors ${currentPage === page
                    ? "bg-blue-600 text-white"
                    : "bg-white/10 hover:bg-white/20 text-white"
                    }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`p-3 rounded-lg transition-colors ${currentPage === totalPages
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

