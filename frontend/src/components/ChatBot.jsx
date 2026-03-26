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

const ENTERTAINMENT_KEYWORDS = [
  "movie",
  "movies",
  "film",
  "films",
  "series",
  "show",
  "shows",
  "tv",
  "episode",
  "season",
  "actor",
  "actress",
  "cast",
  "director",
  "genre",
  "rating",
  "top",
  "trending",
  "popular",
  "recommend",
  "watch",
  "stream",
  "title",
  "plot",
  "story",
  "release",
  "box office",
  "netflix",
  "hulu",
  "prime",
  "disney",
  "hbo",
];

function isEntertainmentQuery(text) {
  const lower = text.toLowerCase();
  return ENTERTAINMENT_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function cleanSearchPhrase(text) {
  return text
    .replace(/^(what|who|which|tell me|find|search|show me|can you|please)\s+/i, "")
    .replace(/\b(movie|movies|film|films|series|tv show|show|shows|title|named|called)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function resolveTitleWithCredits(rawTitle) {
  const title = cleanSearchPhrase(rawTitle);
  if (!title || title.length < 2) return null;

  const search = await fetchTmdb(`/search/multi?query=${encodeURIComponent(title)}&language=en-US&page=1`);
  const candidate = (search.results || []).find((item) => item.media_type === "movie" || item.media_type === "tv");
  if (!candidate) return null;

  const mediaType = candidate.media_type;
  const detailsPath = mediaType === "tv" ? `/tv/${candidate.id}` : `/movie/${candidate.id}`;
  const [details, credits] = await Promise.all([
    fetchTmdb(`${detailsPath}?language=en-US`),
    fetchTmdb(`${detailsPath}/credits?language=en-US`),
  ]);

  return {
    mediaType,
    title: details.title || details.name || candidate.title || candidate.name,
    cast: credits.cast || [],
  };
}

async function getGlobalPlacementByTitle(rawTitle, mediaType = "tv", maxPages = 25) {
  const title = cleanSearchPhrase(rawTitle);
  if (!title || title.length < 2) return null;

  const searchEndpoint = mediaType === "tv" ? "/search/tv" : "/search/movie";
  const search = await fetchTmdb(`${searchEndpoint}?query=${encodeURIComponent(title)}&language=en-US&page=1`);
  const candidate = search.results?.[0];
  if (!candidate?.id) return null;

  const targetId = candidate.id;
  const topRatedEndpoint = mediaType === "tv" ? "/tv/top_rated" : "/movie/top_rated";

  for (let page = 1; page <= maxPages; page += 1) {
    const data = await fetchTmdb(`${topRatedEndpoint}?language=en-US&page=${page}`);
    const results = data.results || [];
    const index = results.findIndex((item) => item.id === targetId);
    if (index >= 0) {
      return {
        rank: (page - 1) * 20 + index + 1,
        title: candidate.name || candidate.title,
        scannedLimit: maxPages * 20,
      };
    }
    if (results.length === 0) break;
  }

  return {
    rank: null,
    title: candidate.name || candidate.title,
    scannedLimit: maxPages * 20,
  };
}

function normalizeName(value) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(a, b) {
  const s = normalizeName(a);
  const t = normalizeName(b);
  if (!s) return t.length;
  if (!t) return s.length;

  const dp = Array.from({ length: s.length + 1 }, () => Array(t.length + 1).fill(0));
  for (let i = 0; i <= s.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= t.length; j += 1) dp[0][j] = j;

  for (let i = 1; i <= s.length; i += 1) {
    for (let j = 1; j <= t.length; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[s.length][t.length];
}

function getRequestedCount(query, defaultCount = 8) {
  const match = query.match(/\b(\d{1,2})\b/);
  if (!match) return defaultCount;
  const count = Number(match[1]);
  if (!Number.isFinite(count) || count <= 0) return defaultCount;
  return Math.min(count, 20);
}

function extractActorNameForMovieList(query) {
  const q = query.trim();
  const patterns = [
    /(?:give me|show me|list|find)?\s*\d*\s*(?:movies?|films?)\s+(?:of|with|from|starring|featuring)\s+(.+)/i,
    /(?:movies?|films?)\s+(?:of|with|from|starring|featuring)\s+(.+)/i,
    /(?:actor|actress|star)\s+(.+)/i,
    /(?:give me|show me|list|find)?\s*\d*\s*([a-z][a-z\s'.-]{1,60}?)\s+(?:movies?|films?)\b/i,
  ];

  for (const pattern of patterns) {
    const match = q.match(pattern);
    if (match?.[1]) {
      return cleanSearchPhrase(match[1].replace(/[?.!,]+$/g, ""));
    }
  }

  // Fallback for phrasing like: "give me 6 john cena movies"
  const compact = q
    .replace(/^(?:give me|show me|list|find)\s+/i, "")
    .replace(/^\d+\s+/, "")
    .replace(/\b(?:movies?|films?)\b/gi, "")
    .replace(/\b(?:of|with|from|starring|featuring)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (compact.length >= 3) {
    return cleanSearchPhrase(compact);
  }

  return "";
}

async function resolvePersonByNameFuzzy(rawName) {
  const actorName = normalizeName(rawName);
  if (!actorName || actorName.length < 2) return null;

  const tokens = actorName.split(" ").filter((t) => t.length > 1);
  const queries = [rawName, tokens.slice(0, 2).join(" "), tokens[0]].filter(Boolean);

  const candidateMap = new Map();
  for (const q of queries) {
    const data = await fetchTmdb(`/search/person?query=${encodeURIComponent(q)}&language=en-US&page=1`);
    (data.results || []).slice(0, 10).forEach((person) => {
      if (!candidateMap.has(person.id)) candidateMap.set(person.id, person);
    });
  }

  const candidates = Array.from(candidateMap.values());
  if (candidates.length === 0) return null;

  const ranked = candidates
    .map((person) => {
      const distance = levenshteinDistance(actorName, person.name || "");
      const normalizedCandidate = normalizeName(person.name || "");
      const exactOrContained =
        normalizedCandidate.includes(actorName) || actorName.includes(normalizedCandidate);
      return {
        person,
        distance,
        exactOrContained,
      };
    })
    .sort((a, b) => {
      if (a.exactOrContained !== b.exactOrContained) return a.exactOrContained ? -1 : 1;
      if (a.distance !== b.distance) return a.distance - b.distance;
      return (b.person.popularity || 0) - (a.person.popularity || 0);
    });

  const best = ranked[0];
  const acceptanceThreshold = Math.max(2, Math.floor(actorName.length * 0.4));
  if (!best.exactOrContained && best.distance > acceptanceThreshold) {
    return null;
  }

  return {
    person: best.person,
    corrected: normalizeName(best.person.name || "") !== actorName,
  };
}

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

  const isAdmin = user?.role === "ADMIN";

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
        const [detailsRes, creditsRes, recommendationsRes] = await Promise.all([
          fetchTmdb(`${basePath}?language=en-US`),
          fetchTmdb(`${basePath}/credits?language=en-US`),
          fetchTmdb(`${basePath}/recommendations?language=en-US`),
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

        // Extract recommended movies
        const recommendations = (recommendationsRes.results || []).slice(0, 6).map((m) => ({
          title: m.title || m.name,
          year: m.release_date?.slice(0, 4) || m.first_air_date?.slice(0, 4) || "N/A",
        }));

        setMovieDetails({
          ...detailsRes,
          director,
          writers,
          cast,
          producers,
          recommendations,
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
      // 👤 PERSON INFO: "who is <director/actor>"
      const personInfoMatch = query.match(/^\s*(?:who is|tell me about|who's)\s+(.+?)\s*\??\s*$/i);
      if (personInfoMatch?.[1]) {
        const personName = cleanSearchPhrase(personInfoMatch[1]);
        if (personName.length > 1) {
          const searchData = await fetchTmdb(`/search/person?query=${encodeURIComponent(personName)}&language=en-US&page=1`);
          const person = searchData.results?.[0];
          if (person?.id) {
            const details = await fetchTmdb(`/person/${person.id}?language=en-US`);
            const department = details.known_for_department || person.known_for_department || "Entertainment";
            const knownFor = (person.known_for || [])
              .slice(0, 3)
              .map((item) => item.title || item.name)
              .filter(Boolean)
              .join(", ");
            const bio = details.biography?.trim();
            const shortBio = bio ? `${bio.slice(0, 320)}${bio.length > 320 ? "..." : ""}` : "";

            const parts = [
              `${details.name || person.name} is a ${department.toLowerCase()} professional.`,
              knownFor ? `Known for: ${knownFor}.` : "",
              shortBio,
            ].filter(Boolean);

            addMessage("assistant", parts.join("\n\n"));
            return;
          }
        }
      }

      if (!isEntertainmentQuery(query)) {
        addMessage(
          "assistant",
          "I can help only with movies and series. Please ask about a title, actor, director, genre, trending, top rated, or recommendations."
        );
        return;
      }

      // ✅ TOP-N RANKING QUESTION: yes/no + global placement
      const rankQuestionMatch = query.match(/^\s*is\s+(.+?)\s+(?:in\s+the\s+)?top\s+(\d+)\b/i);
      if (rankQuestionMatch) {
        const rawTitle = rankQuestionMatch[1]?.trim();
        const topN = Number(rankQuestionMatch[2]);
        const wantsSeries =
          lower.includes("series") ||
          lower.includes("tv") ||
          lower.includes("show") ||
          (!lower.includes("movie") && !lower.includes("film"));
        const mediaType = wantsSeries ? "tv" : "movie";
        const typeLabel = wantsSeries ? "series" : "movies";

        if (rawTitle && Number.isFinite(topN) && topN > 0) {
          const rankData = await getGlobalPlacementByTitle(rawTitle, mediaType, 25);
          if (!rankData) {
            addMessage("assistant", "I couldn't find that title. Try the exact movie or series name.");
            return;
          }

          if (rankData.rank == null) {
            addMessage(
              "assistant",
              `No. ${rankData.title} is not in the first ${rankData.scannedLimit} global top-rated ${typeLabel} on TMDB, so it is not top ${topN}.`
            );
            return;
          }

          const isTopN = rankData.rank <= topN;
          addMessage(
            "assistant",
            `${isTopN ? "Yes" : "No"}. ${rankData.title} is ranked #${rankData.rank} in global top-rated ${typeLabel} on TMDB.`
          );
          return;
        }
      }

      // 🎭 MAIN ACTOR / CAST OF A TITLE (movie or series)
      const actorOfTitleMatch = query.match(/(?:main|lead)?\s*(?:actor|actress|cast)\s+(?:of|in|from)\s+(.+)/i);
      if (actorOfTitleMatch?.[1]) {
        const result = await resolveTitleWithCredits(actorOfTitleMatch[1]);
        if (result) {
          const topCast = result.cast.slice(0, 5).map((c) => c.name).filter(Boolean);
          if (topCast.length > 0) {
            addMessage(
              "assistant",
              `Main cast of ${result.title}: ${topCast.join(", ")}.`
            );
            return;
          }
          addMessage("assistant", `I found ${result.title}, but I couldn't retrieve cast details right now.`);
          return;
        }
        addMessage("assistant", "I couldn't find that title. Try using the exact movie or series name.");
        return;
      }

      // 🎭 MOVIES OF AN ACTOR (supports misspellings + requested count)
      const actorFromMovieListQuery = extractActorNameForMovieList(query);
      if (actorFromMovieListQuery) {
        const requestedCount = getRequestedCount(query, 8);
        const resolved = await resolvePersonByNameFuzzy(actorFromMovieListQuery);
        if (resolved?.person?.id) {
          const movieData = await fetchTmdb(`/person/${resolved.person.id}/movie_credits?language=en-US`);
          const results = (movieData.cast || [])
            .filter((m) => m.title || m.original_title)
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
            .slice(0, requestedCount);

          if (results.length > 0) {
            const list = results
              .map((m) => `• ${m.title || m.original_title} (${m.release_date?.slice(0, 4) || "N/A"})`)
              .join("\n");
            const correctionNote = resolved.corrected
              ? `I matched "${actorFromMovieListQuery}" to ${resolved.person.name}.\n\n`
              : "";
            addMessage("assistant", `${correctionNote}Here are ${results.length} movies with ${resolved.person.name}:\n\n${list}`);
            return;
          }
        }

        addMessage("assistant", "I couldn't find movies for that actor. Try another spelling or include first and last name.");
        return;
      }

      // 🔝 TOP RATED MOVIES
      if (lower.includes("best") || lower.includes("top") || lower.includes("highest rated")) {
        const wantsSeries = lower.includes("series") || lower.includes("tv") || lower.includes("show");
        const data = wantsSeries
          ? await fetchTmdb("/tv/top_rated?language=en-US&page=1")
          : await fetchTmdb("/movie/top_rated?language=en-US&page=1");
        const results = (data.results || []).slice(0, 8);
        const list = results
          .map((m) => `• ${m.title || m.name || m.original_title || m.original_name} (${m.vote_average?.toFixed(1)}/10)`)
          .join("\n");
        addMessage(
          "assistant",
          wantsSeries
            ? `Here are the top-rated series:\n\n${list}`
            : `Here are the top-rated movies:\n\n${list}`
        );
        return;
      }

      // 📈 TRENDING / NEW RELEASES
      if (lower.includes("trending") || lower.includes("popular") || lower.includes("new") || lower.includes("latest")) {
        const wantsSeries = lower.includes("series") || lower.includes("tv") || lower.includes("show");
        const data = wantsSeries
          ? await fetchTmdb("/trending/tv/week?language=en-US")
          : await fetchTmdb("/trending/movie/week?language=en-US");
        const results = (data.results || []).slice(0, 8);
        const list = results
          .map((m) => `• ${m.title || m.name || m.original_title || m.original_name} (${m.release_date?.slice(0, 4) || m.first_air_date?.slice(0, 4) || "N/A"})`)
          .join("\n");
        addMessage(
          "assistant",
          wantsSeries
            ? `Here are trending series this week:\n\n${list}`
            : `Here are trending movies this week:\n\n${list}`
        );
        return;
      }

      // 🎯 SEARCH BY TITLE
      if (lower.includes("movie") || lower.includes("find") || lower.includes("search")) {
        // Extract potential movie/series name from query
        const keywords = cleanSearchPhrase(query.replace(/about/gi, ""));
        if (keywords.length > 2) {
          const wantsSeries = lower.includes("series") || lower.includes("tv") || lower.includes("show");
          const endpoint = wantsSeries ? "/search/tv" : "/search/movie";
          const data = await fetchTmdb(`${endpoint}?query=${encodeURIComponent(keywords)}&language=en-US&page=1`);
          const results = (data.results || []).slice(0, 6);
          if (results.length > 0) {
            const list = results
              .map((m) => `• ${m.title || m.name || m.original_title || m.original_name} (${m.release_date?.slice(0, 4) || m.first_air_date?.slice(0, 4) || "N/A"})`)
              .join("\n");
            addMessage(
              "assistant",
              wantsSeries
                ? `I found these series:\n\n${list}`
                : `I found these movies:\n\n${list}`
            );
            return;
          }
          addMessage("assistant", "I couldn't find matching titles. Try a more specific movie or series name.");
          return;
        }
      }

      // 🎭 SEARCH BY ACTOR
      if (lower.includes("actor") || lower.includes("actress") || lower.includes("star") || lower.includes("played by")) {
        const actorName = cleanSearchPhrase(query.replace(/actor|actress|star|played by|with|featuring/gi, ""));
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
          addMessage("assistant", "I couldn't find that actor/actress. Please try another name.");
          return;
        }
      }

      // 👨‍🎬 SEARCH BY DIRECTOR
      if (lower.includes("director") || lower.includes("directed by")) {
        const directorName = cleanSearchPhrase(query.replace(/director|directed by|by/gi, ""));
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
          addMessage("assistant", "I couldn't find that director. Please try another name.");
          return;
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

      // 🎲 DEFAULT: Movie/series-aware help message
      const helpMessage = `I can only answer movie and series questions, but I couldn't match this request yet.\n\n💡 Try asking:
• Genres (e.g., "horror movies")
• Top rated movies
    • Top rated series
• Trending movies
    • Trending series
    • Search for a movie or series by title
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

    // Fast fallback for season questions with typos (e.g. "how manu seasons?")
    if (lower.includes("season")) {
      const currentSeasons = details?.number_of_seasons;
      const isCurrentSeries = Boolean(details?.name || details?.first_air_date || currentSeasons);
      if (isCurrentSeries && currentSeasons != null) {
        addMessage("assistant", `${title} has ${currentSeasons} season${currentSeasons === 1 ? "" : "s"}.`);
      } else {
        addMessage("assistant", `${title} is a movie, so it doesn't have seasons.`);
      }
      return;
    }

    // 📺 SEASONS COUNT (detail mode)
    const seasonsQuestionMatch = query.match(/^\s*(?:how many seasons(?: are there)?(?: in| for)?|seasons(?: in| for)?|number of seasons(?: in| for)?)\s*(.+?)?\s*\??\s*$/i);
    if (seasonsQuestionMatch) {
      const subjectRaw = seasonsQuestionMatch[1] ? cleanSearchPhrase(seasonsQuestionMatch[1]) : "";
      const normalizedSubject = normalizeName(subjectRaw);
      const normalizedCurrentTitle = normalizeName(title);
      const currentSeasons = details?.number_of_seasons;
      const isCurrentSeries = Boolean(details?.name || details?.first_air_date || currentSeasons);

      // If no subject is provided, or it matches the current opened title, answer from current data.
      if (!normalizedSubject || normalizedSubject === "it" || normalizedSubject === "this") {
        if (isCurrentSeries && currentSeasons != null) {
          addMessage("assistant", `${title} has ${currentSeasons} season${currentSeasons === 1 ? "" : "s"}.`);
        } else {
          addMessage("assistant", `${title} is a movie, so it doesn't have seasons.`);
        }
        return;
      }

      if (
        normalizedCurrentTitle &&
        (normalizedCurrentTitle.includes(normalizedSubject) || normalizedSubject.includes(normalizedCurrentTitle))
      ) {
        if (isCurrentSeries && currentSeasons != null) {
          addMessage("assistant", `${title} has ${currentSeasons} season${currentSeasons === 1 ? "" : "s"}.`);
        } else {
          addMessage("assistant", `${title} is a movie, so it doesn't have seasons.`);
        }
        return;
      }

      // Otherwise try to resolve the asked series title directly from TMDB.
      const searchTv = await fetchTmdb(`/search/tv?query=${encodeURIComponent(subjectRaw)}&language=en-US&page=1`);
      const seriesCandidate = searchTv.results?.[0];
      if (seriesCandidate?.id) {
        const seriesDetails = await fetchTmdb(`/tv/${seriesCandidate.id}?language=en-US`);
        const sTitle = seriesDetails.name || seriesCandidate.name || subjectRaw;
        const seasons = seriesDetails.number_of_seasons;
        if (seasons != null) {
          addMessage("assistant", `${sTitle} has ${seasons} season${seasons === 1 ? "" : "s"}.`);
          return;
        }
      }

      // If title exists but is a movie or not found as a series.
      const searchMovie = await fetchTmdb(`/search/movie?query=${encodeURIComponent(subjectRaw)}&language=en-US&page=1`);
      if (searchMovie.results?.[0]?.id) {
        const movieTitle = searchMovie.results[0].title || subjectRaw;
        addMessage("assistant", `${movieTitle} is a movie, so it doesn't have seasons.`);
        return;
      }

      addMessage("assistant", "I couldn't find that series. Try the exact title.");
      return;
    }

    // 👤 WHO-IS / TELL-ME-ABOUT in detail mode
    const personOrTitleMatch = query.match(/^\s*(?:who is|tell me about|who's)\s+(.+?)\s*\??\s*$/i);
    if (personOrTitleMatch?.[1]) {
      const subject = cleanSearchPhrase(personOrTitleMatch[1]);
      const normalizedSubject = normalizeName(subject);
      const normalizedCurrentTitle = normalizeName(title);

      // If the user asks about the currently opened title, answer directly from current details.
      if (
        normalizedSubject &&
        normalizedCurrentTitle &&
        (normalizedSubject === normalizedCurrentTitle ||
          normalizedCurrentTitle.includes(normalizedSubject) ||
          normalizedSubject.includes(normalizedCurrentTitle))
      ) {
        const currentType = details?.name ? "series" : "movie";
        const currentDate = details?.release_date || details?.first_air_date || "";
        const currentYear = currentDate ? currentDate.slice(0, 4) : "N/A";
        const currentOverview = details?.overview || movieDetails?.overview || movie?.overview || "";
        addMessage(
          "assistant",
          currentOverview
            ? `${title} (${currentYear}) is a ${currentType}. ${currentOverview}`
            : `${title} (${currentYear}) is a ${currentType}.`
        );
        return;
      }

      if (subject.length > 1) {
        // 1) Try person lookup (director/actor/etc.)
        const personSearch = await fetchTmdb(`/search/person?query=${encodeURIComponent(subject)}&language=en-US&page=1`);
        const person = personSearch.results?.[0];
        if (person?.id) {
          const personDetails = await fetchTmdb(`/person/${person.id}?language=en-US`);
          const department = personDetails.known_for_department || person.known_for_department || "Entertainment";
          const knownFor = (person.known_for || [])
            .slice(0, 3)
            .map((item) => item.title || item.name)
            .filter(Boolean)
            .join(", ");
          const bio = personDetails.biography?.trim();
          const shortBio = bio ? `${bio.slice(0, 320)}${bio.length > 320 ? "..." : ""}` : "";
          const parts = [
            `${personDetails.name || person.name} is a ${department.toLowerCase()} professional.`,
            knownFor ? `Known for: ${knownFor}.` : "",
            shortBio,
          ].filter(Boolean);

          addMessage("assistant", parts.join("\n\n"));
          return;
        }

        // 2) Fallback: try title lookup (movie/series)
        const titleSearch = await fetchTmdb(`/search/multi?query=${encodeURIComponent(subject)}&language=en-US&page=1`);
        const candidate = (titleSearch.results || []).find((item) => item.media_type === "movie" || item.media_type === "tv");
        if (candidate?.id) {
          const detailsPath = candidate.media_type === "tv" ? `/tv/${candidate.id}` : `/movie/${candidate.id}`;
          const candidateDetails = await fetchTmdb(`${detailsPath}?language=en-US`);
          const candidateTitle = candidateDetails.title || candidateDetails.name || candidate.title || candidate.name;
          const candidateType = candidate.media_type === "tv" ? "series" : "movie";
          const candidateDate = candidateDetails.release_date || candidateDetails.first_air_date || "";
          const candidateYear = candidateDate ? candidateDate.slice(0, 4) : "N/A";
          const candidateGenres = (candidateDetails.genres || []).map((g) => g.name).join(", ");
          const candidateOverview = candidateDetails.overview || "";

          const intro = candidateGenres
            ? `${candidateTitle} (${candidateYear}) is a ${candidateGenres} ${candidateType}.`
            : `${candidateTitle} (${candidateYear}) is a ${candidateType}.`;
          addMessage(
            "assistant",
            candidateOverview ? `${intro} ${candidateOverview}` : intro
          );
          return;
        }
      }

      addMessage("assistant", "I couldn't find who or what that refers to. Try the full person, movie, or series name.");
      return;
    }

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

    // 💡 SIMILAR MOVIES / RECOMMENDATIONS
    if (lower.includes("recommend") || lower.includes("similar") || lower.includes("like this") || lower.includes("suggest") || lower.includes("watch next")) {
      const recommendations = movieDetails?.recommendations || [];
      if (recommendations.length > 0) {
        const list = recommendations
          .map((m) => `• ${m.title} (${m.year})`)
          .join("\n");
        addMessage(
          "assistant",
          `If you liked ${title}, you might enjoy:\n\n${list}`
        );
      } else {
        addMessage(
          "assistant",
          `I don't have recommendations for ${title} right now, but you can try movies by the same director or in the same genre!`
        );
      }
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
• Similar movies / Recommendations
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
    : "Hi! I'm your Projection Assistant. Ask about movies, series, actors, directors, genres, and recommendations.";

  // Keep hook order stable, then hide UI for admins.
  if (isAdmin) {
    return null;
  }

  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="fixed bottom-24 md:bottom-6 right-6 z-[999] flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-[#071427]"
        aria-label={isOpen ? "Close chat" : "Open Projection Assistant"}
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
            <h2 className="text-lg font-semibold text-white">Projection Assistant 🎬</h2>
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
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${msg.role === "user"
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
