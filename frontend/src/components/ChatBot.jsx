import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { useSelectedMovie } from "../context/SelectedMovieContext";
import { userStorage } from "../services/authService";

const TMDB_BEARER_TOKEN = import.meta.env.VITE_TMDB_BEARER_TOKEN || "YOUR_TOKEN_HERE";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// Genre name -> TMDB genre ID (movie list)
const GENRE_MAP = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  drama: 18,
  fantasy: 14,
  horror: 27,
  romance: 10749,
  "sci-fi": 878,
  "science fiction": 878,
  thriller: 53,
  mystery: 9648,
};

function getGenreIdsFromText(text) {
  const lower = text.toLowerCase();
  const ids = [];
  for (const [name, id] of Object.entries(GENRE_MAP)) {
    if (lower.includes(name) && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

async function fetchTmdb(path) {
  const res = await fetch(`${TMDB_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${TMDB_BEARER_TOKEN}` },
  });
  if (!res.ok) throw new Error("TMDB request failed");
  return res.json();
}

export default function ChatBot() {
  const { selectedMovie: movie } = useSelectedMovie();
  const [user, setUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [movieDetails, setMovieDetails] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setUser(userStorage.getUser());
  }, []);

  // Don't show chatbot for admins
  if (user?.role === "ADMIN") {
    return null;
  }

  const isMovieMode = Boolean(movie?.id);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // When movie prop changes, fetch full details for director/overview etc.
  useEffect(() => {
    if (!movie?.id) {
      setMovieDetails(null);
      return;
    }
    let cancelled = false;
    const type = movie.name ? "tv" : "movie";
    const basePath = type === "tv" ? `/tv/${movie.id}` : `/movie/${movie.id}`;

    (async () => {
      try {
        const [detailsRes, creditsRes] = await Promise.all([
          fetchTmdb(`${basePath}?language=en-US`),
          fetchTmdb(`${basePath}/credits?language=en-US`),
        ]);
        if (cancelled) return;
        
        // Extract comprehensive movie data
        const director = creditsRes.crew?.find((c) => c.job === "Director")?.name || "";
        const writers = creditsRes.crew
          ?.filter((c) => c.job === "Writer" || c.job === "Screenplay")
          ?.map((c) => c.name)
          .slice(0, 3)
          .join(", ") || "";
        const cast = creditsRes.cast?.slice(0, 5).map((c) => c.name).join(", ") || "";
        const producers = creditsRes.crew
          ?.filter((c) => c.job === "Producer")
          ?.map((c) => c.name)
          .slice(0, 3)
          .join(", ") || "";

        setMovieDetails({
          ...detailsRes,
          director,
          writers,
          cast,
          producers,
          overview: detailsRes.overview || "",
          title: detailsRes.title || detailsRes.name,
          release_date: detailsRes.release_date || detailsRes.first_air_date,
          genres: detailsRes.genres?.map((g) => g.name).join(", ") || "",
          runtime: detailsRes.runtime || detailsRes.episode_run_time?.[0] || 0,
          budget: detailsRes.budget || 0,
          revenue: detailsRes.revenue || 0,
          production_companies: detailsRes.production_companies?.map((c) => c.name).join(", ") || "",
          spoken_languages: detailsRes.spoken_languages?.map((l) => l.english_name).join(", ") || "",
          tagline: detailsRes.tagline || "",
        });
      } catch (e) {
        if (!cancelled) setMovieDetails({ ...movie, overview: movie.overview || "", director: "" });
      }
    })();
    return () => { cancelled = true; };
  }, [movie?.id]);

  const addMessage = (role, content) => {
    setMessages((prev) => [...prev, { role, content }]);
  };

  const handleGeneralMode = async (query) => {
    const lower = query.toLowerCase();
    
    try {
      // 🔝 TOP RATED MOVIES
      if (lower.includes("best") || lower.includes("top") || lower.includes("highest rated")) {
        const data = await fetchTmdb("/movie/top_rated?language=en-US&page=1");
        const results = (data.results || []).slice(0, 8);
        const list = results
          .map((m) => `• ${m.title || m.original_title} (${m.vote_average?.toFixed(1)}/10)`)
          .join("\n");
        addMessage(
          "assistant",
          `Here are the top-rated movies:\n\n${list}`
        );
        return;
      }

      // 📈 TRENDING / NEW RELEASES
      if (lower.includes("trending") || lower.includes("popular") || lower.includes("new") || lower.includes("latest")) {
        const data = await fetchTmdb("/trending/movie/week?language=en-US");
        const results = (data.results || []).slice(0, 8);
        const list = results
          .map((m) => `• ${m.title || m.original_title} (${m.release_date?.slice(0, 4) || "N/A"})`)
          .join("\n");
        addMessage(
          "assistant",
          `Here are trending movies this week:\n\n${list}`
        );
        return;
      }

      // 🎯 SEARCH BY TITLE
      if (lower.includes("movie") || lower.includes("find") || lower.includes("search")) {
        // Extract potential movie name from query
        const keywords = query.replace(/movie|find|search|about|called|named|called|is|the/gi, "").trim();
        if (keywords.length > 2) {
          const data = await fetchTmdb(`/search/movie?query=${encodeURIComponent(keywords)}&language=en-US&page=1`);
          const results = (data.results || []).slice(0, 6);
          if (results.length > 0) {
            const list = results
              .map((m) => `• ${m.title || m.original_title} (${m.release_date?.slice(0, 4) || "N/A"})`)
              .join("\n");
            addMessage(
              "assistant",
              `I found these movies:\n\n${list}\n\nClick on any to learn more!`
            );
            return;
          }
        }
      }

      // 🎭 SEARCH BY ACTOR
      if (lower.includes("actor") || lower.includes("actress") || lower.includes("star") || lower.includes("played by")) {
        const actorName = query.replace(/actor|actress|star|played by|with|featuring/gi, "").trim();
        if (actorName.length > 2) {
          const data = await fetchTmdb(`/search/person?query=${encodeURIComponent(actorName)}&language=en-US&page=1`);
          const person = data.results?.[0];
          if (person) {
            const movieData = await fetchTmdb(`/person/${person.id}/movie_credits?language=en-US`);
            const results = (movieData.cast || []).slice(0, 8);
            const list = results
              .map((m) => `• ${m.title || m.original_title} (${m.release_date?.slice(0, 4) || "N/A"})`)
              .join("\n");
            addMessage(
              "assistant",
              `Movies with ${person.name}:\n\n${list}`
            );
            return;
          }
        }
      }

      // 👨‍🎬 SEARCH BY DIRECTOR
      if (lower.includes("director") || lower.includes("directed by")) {
        const directorName = query.replace(/director|directed by|by/gi, "").trim();
        if (directorName.length > 2) {
          const data = await fetchTmdb(`/search/person?query=${encodeURIComponent(directorName)}&language=en-US&page=1`);
          const person = data.results?.[0];
          if (person) {
            const movieData = await fetchTmdb(`/person/${person.id}/movie_credits?language=en-US`);
            const results = (movieData.crew?.filter((m) => m.job === "Director") || []).slice(0, 8);
            const list = results
              .map((m) => `• ${m.title || m.original_title} (${m.release_date?.slice(0, 4) || "N/A"})`)
              .join("\n");
            addMessage(
              "assistant",
              `Movies directed by ${person.name}:\n\n${list}`
            );
            return;
          }
        }
      }

      // 🎬 GENRE RECOMMENDATIONS
      const genreIds = getGenreIdsFromText(query);
      if (genreIds.length > 0) {
        const params = new URLSearchParams({
          with_genres: genreIds.join(","),
          sort_by: "popularity.desc",
          page: 1,
          language: "en-US",
        });
        const data = await fetchTmdb(`/discover/movie?${params}`);
        const results = (data.results || []).slice(0, 8);
        const genreNames = Object.entries(GENRE_MAP)
          .filter(([, id]) => genreIds.includes(id))
          .map(([name]) => name);
        const list = results
          .map((m) => `• ${m.title || m.original_title} (${m.release_date?.slice(0, 4) || "N/A"})`)
          .join("\n");
        const reply =
          list.length > 0
            ? `Here are some ${genreNames.join(", ")} movies:\n\n${list}`
            : `I couldn't find movies for that combination. Try "action", "horror", "romance", "sci-fi", or "comedy".`;
        addMessage("assistant", reply);
        return;
      }

      // 🎲 DEFAULT: Popular movies + help message
      const data = await fetchTmdb("/movie/popular?language=en-US&page=1");
      const results = (data.results || []).slice(0, 6);
      const list = results
        .map((m) => `• ${m.title || m.original_title} (${m.release_date?.slice(0, 4) || "N/A"})`)
        .join("\n");
      const helpMessage = `Here are some popular movies:\n\n${list}\n\n💡 You can ask me:
• Genres (e.g., "horror movies")
• Top rated movies
• Trending movies
• Search for a movie by title
• Find movies by actor/actress
• Find movies by director
• And more!`;
      addMessage("assistant", helpMessage);
    } catch (e) {
      addMessage("assistant", "Sorry, I couldn't fetch suggestions right now. Please try again.");
    }
  };

  const handleMovieMode = async (query) => {
    const details = movieDetails || movie;
    const title = details?.title || details?.name || movie?.title || movie?.name || "this";
    const lower = query.toLowerCase();

    // Try to answer based on specific keywords
    if (lower.includes("director") || lower.includes("who directed") || lower.includes("directed by")) {
      const director = movieDetails?.director || "";
      addMessage(
        "assistant",
        director ? `The director of ${title} is ${director}.` : `I don't have director information for ${title} right now.`
      );
      return;
    }

    if (lower.includes("actor") || lower.includes("cast") || lower.includes("star")) {
      const cast = movieDetails?.cast || "";
      addMessage(
        "assistant",
        cast ? `The cast of ${title} includes: ${cast}.` : `I don't have cast information for ${title} right now.`
      );
      return;
    }

    if (lower.includes("writer") || lower.includes("wrote") || lower.includes("screenplay")) {
      const writers = movieDetails?.writers || "";
      addMessage(
        "assistant",
        writers ? `The screenplay was written by: ${writers}.` : `I don't have writer information for ${title} right now.`
      );
      return;
    }

    if (lower.includes("genre")) {
      const genres = movieDetails?.genres || "";
      addMessage(
        "assistant",
        genres ? `${title} is a ${genres} film.` : `I don't have genre information for ${title} right now.`
      );
      return;
    }

    if (lower.includes("story") || lower.includes("plot") || lower.includes("about") || lower.includes("what is") || lower.includes("summary")) {
      const overview = movieDetails?.overview || movie?.overview || "";
      addMessage(
        "assistant",
        overview ? `${title}: ${overview}` : `I don't have a summary for ${title} right now.`
      );
      return;
    }

    if (lower.includes("runtime") || lower.includes("duration") || lower.includes("long is")) {
      const runtime = movieDetails?.runtime || 0;
      addMessage(
        "assistant",
        runtime > 0 ? `${title} has a runtime of ${runtime} minutes.` : `I don't have runtime information for ${title}.`
      );
      return;
    }

    if (lower.includes("budget")) {
      const budget = movieDetails?.budget || 0;
      addMessage(
        "assistant",
        budget > 0 ? `The budget for ${title} was $${(budget / 1000000).toFixed(1)}M.` : `I don't have budget information for ${title}.`
      );
      return;
    }

    if (lower.includes("revenue") || lower.includes("box office")) {
      const revenue = movieDetails?.revenue || 0;
      addMessage(
        "assistant",
        revenue > 0 ? `${title} made $${(revenue / 1000000).toFixed(1)}M at the box office.` : `I don't have box office information for ${title}.`
      );
      return;
    }

    if (lower.includes("production")) {
      const companies = movieDetails?.production_companies || "";
      addMessage(
        "assistant",
        companies ? `${title} was produced by: ${companies}.` : `I don't have production information for ${title}.`
      );
      return;
    }

    if (lower.includes("language")) {
      const languages = movieDetails?.spoken_languages || "";
      addMessage(
        "assistant",
        languages ? `${title} is available in: ${languages}.` : `I don't have language information for ${title}.`
      );
      return;
    }

    if (lower.includes("year") || lower.includes("release") || lower.includes("when")) {
      const date = movieDetails?.release_date || movie?.release_date || "";
      const year = date ? date.slice(0, 4) : "N/A";
      addMessage("assistant", `${title} was released in ${year}.`);
      return;
    }

    if (lower.includes("rating") || lower.includes("score")) {
      const v = details?.vote_average ?? movie?.vote_average;
      addMessage(
        "assistant",
        v != null ? `${title} has a rating of ${v.toFixed(1)}/10 on TMDB.` : `I don't have the rating for ${title}.`
      );
      return;
    }

    if (lower.includes("tagline")) {
      const tagline = movieDetails?.tagline || "";
      addMessage(
        "assistant",
        tagline ? `Tagline: "${tagline}"` : `I don't have a tagline for ${title}.`
      );
      return;
    }

    // Generic fallback - provide a summary of available info
    const summary = `I know a lot about ${title}! You can ask me:
• Who directed it
• Who is in the cast
• The plot summary
• Release year
• Rating / score
• Runtime / duration
• Budget
• Box office / revenue
• Production companies
• Languages
• Genres
• And more!

What would you like to know?`;
    addMessage("assistant", summary);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    addMessage("user", text);
    setLoading(true);

    try {
      if (isMovieMode) {
        await handleMovieMode(text);
      } else {
        await handleGeneralMode(text);
      }
    } finally {
      setLoading(false);
    }
  };

  const welcomeMessage = isMovieMode
    ? `You're now asking about "${movie?.title || movie?.name}". Ask me anything about this movie!`
    : "Hi! I'm your Movie Assistant. Ask for recommendations by genre, e.g. \"horror and romance\" or \"action movies\".";

  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-[999] flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-[#071427]"
        aria-label={isOpen ? "Close chat" : "Open Movie Assistant"}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-[998] flex w-[360px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f172a] shadow-xl"
          style={{ maxHeight: "min(480px, 70vh)" }}
        >
          <div className="flex items-center justify-between border-b border-white/10 bg-indigo-600/20 px-4 py-3">
            <h2 className="text-lg font-semibold text-white">Movie Assistant 🎬</h2>
            {isMovieMode && (
              <span className="rounded-full bg-indigo-500/30 px-2 py-0.5 text-xs text-indigo-200">
                {movie?.title || movie?.name}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="rounded-xl bg-white/5 px-3 py-2 text-sm text-gray-300">
                {welcomeMessage}
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-white/10 text-gray-200"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white/10 px-4 py-2 text-sm text-gray-400">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-white/10 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder={isMovieMode ? "Ask about this movie..." : "e.g. horror and romance"}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="rounded-xl bg-indigo-600 p-2.5 text-white transition hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600"
                aria-label="Send"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
