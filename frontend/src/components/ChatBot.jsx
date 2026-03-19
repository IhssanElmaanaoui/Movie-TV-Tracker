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
        const director = creditsRes.crew?.find((c) => c.job === "Director")?.name || "";
        setMovieDetails({
          ...detailsRes,
          director,
          overview: detailsRes.overview || "",
          title: detailsRes.title || detailsRes.name,
          release_date: detailsRes.release_date || detailsRes.first_air_date,
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
    const genreIds = getGenreIdsFromText(query);
    try {
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
            ? `Here are some movie suggestions (${genreNames.join(", ")}):\n\n${list}`
            : `I couldn't find movies for that combination. Try "action", "horror", "romance", "sci-fi", or "comedy".`;
        addMessage("assistant", reply);
      } else {
        // Fallback: popular movies
        const data = await fetchTmdb("/movie/popular?language=en-US&page=1");
        const results = (data.results || []).slice(0, 6);
        const list = results
          .map((m) => `• ${m.title || m.original_title} (${m.release_date?.slice(0, 4) || "N/A"})`)
          .join("\n");
        addMessage(
          "assistant",
          `Here are some popular movies you might like:\n\n${list}\n\nYou can also ask for genres like "horror and romance" or "action movies".`
        );
      }
    } catch (e) {
      addMessage("assistant", "Sorry, I couldn't fetch suggestions right now. Please try again.");
    }
  };

  const handleMovieMode = async (query) => {
    const details = movieDetails || movie;
    const title = details?.title || details?.name || movie?.title || movie?.name || "this";
    const lower = query.toLowerCase();

    if (
      lower.includes("director") ||
      lower.includes("who directed") ||
      lower.includes("directed by")
    ) {
      const director = movieDetails?.director || "";
      addMessage(
        "assistant",
        director ? `The director of ${title} is ${director}.` : `I don't have director information for ${title} right now.`
      );
      return;
    }

    if (
      lower.includes("story") ||
      lower.includes("plot") ||
      lower.includes("about") ||
      lower.includes("what is") ||
      lower.includes("summary")
    ) {
      const overview = movieDetails?.overview || movie?.overview || "";
      addMessage(
        "assistant",
        overview ? `${title}: ${overview}` : `I don't have a summary for ${title} right now.`
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
      addMessage("assistant", v != null ? `${title} has a rating of ${v.toFixed(1)}/10 on TMDB.` : `I don't have the rating for ${title}.`);
      return;
    }

    addMessage(
      "assistant",
      `I can answer questions about the director, story/plot, release year, or rating of ${title}. Ask something like "Who is the director?" or "What is the story?"`
    );
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
    ? `You're now asking about "${movie?.title || movie?.name}". Ask about the director, story, year, or rating!`
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
