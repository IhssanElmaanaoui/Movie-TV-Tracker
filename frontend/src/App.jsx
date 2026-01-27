import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import MovieCarousel from './components/MovieCarousel';
import StreamingPlatforms from './components/StreamingPlatforms';
import MovieCategoriesCarousel from './components/MovieCategoriesCarousel';

export default function App() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const TMDB_API_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJmZmJiMWFlYmE5MDc3MGM3YzUyNzI2Njg1NDU1ZTA3MCIsIm5iZiI6MTc1ODc0NDU5OC40NDk5OTk4LCJzdWIiOiI2OGQ0NTAxNjNjN2M1NmQ5MTBlNzIyZTAiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.Wyls449PmYczveDSVO_VwR32d9vwjO-InApFO2c2B6k';

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          'https://api.themoviedb.org/3/movie/popular?language=en-US&page=1',
          {
            headers: {
              Authorization: `Bearer ${TMDB_API_KEY}`,
              'Content-Type': 'application/json;charset=utf-8',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch from TMDB');
        }

        const data = await response.json();
        setMovies(data.results || []);
        setError(null);
      } catch (err) {
        setError('Failed to fetch movies. Please check your API key.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <p className="text-white text-2xl">Loading movies...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <p className="text-red-500 text-2xl">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen">
      <Navbar />
      <MovieCarousel movies={movies} />
      <StreamingPlatforms />
      <MovieCategoriesCarousel />
      <div className="px-8 pb-8 pt-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
          {movies.map((movie, index) => (
            <div key={index} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-shadow">
              {/* Poster */}
              <div className="h-64 overflow-hidden bg-gray-700">
                {movie.poster_path ? (
                  <img 
                    src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                    alt={movie.title || movie.original_title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No Poster
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="p-4">
                {/* Title */}
                <h2 className="text-lg font-bold text-white mb-2 line-clamp-2">
                  {movie.title || movie.original_title}
                </h2>
                
                {/* Rating */}
                <div className="mb-3">
                  <p className="text-sm text-gray-300">
                    <span className="font-semibold">Rating:</span> {' '}
                    <span className="text-yellow-400 font-bold">
                      {movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'} / 10
                    </span>
                  </p>
                </div>
                
                {/* Description (Overview) */}
                <p className="text-sm text-gray-300 line-clamp-3">
                  {movie.overview || 'No description available'}
                </p>
                
                {/* Release Year */}
                <p className="text-xs text-gray-400 mt-3">
                  {movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
