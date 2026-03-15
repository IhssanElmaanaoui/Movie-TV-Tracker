import { useState, useEffect } from "react";
import Skeleton from '@mui/material/Skeleton';
import MovieCarousel from "../components/MovieCarousel";
import StreamingPlatforms from "../components/StreamingPlatforms";
import MovieCategoriesCarousel from "../components/MovieCategoriesCarousel";
import CollectionCarousel from "../components/CollectionCarousel";
import SignUp from "../components/SignUp";
import ChatBot from "../components/ChatBot";
import { userStorage } from "../services/authService";

export default function Dashboard() {
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(userStorage.getUser());
  }, []);

  const [loadingStates, setLoadingStates] = useState({
    movieCarousel: true,
    streamingPlatforms: true,
    movieCategories: true,
    collections: true,
  });

  const allLoaded = Object.values(loadingStates).every(state => !state);

  const handleLoadComplete = (component) => {
    setLoadingStates(prev => ({ ...prev, [component]: false }));
  };

  return (
    <>
      {/* Loading Skeleton Overlay */}
      {!allLoaded && (
        <div
          className="fixed inset-0 z-50"
          style={{ backgroundColor: "#071427" }}
        >
          {/* Hero Carousel Skeleton */}
          <div className="h-screen flex flex-col">
            <div className="flex-grow relative">
              <Skeleton
                variant="rectangular"
                width="100%"
                height="100%"
                sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }}
              />
            </div>

            {/* Streaming Platforms Skeleton */}
            <div className="px-6 py-4">
              <div className="flex gap-4 justify-center">
                {[...Array(6)].map((_, i) => (
                  <Skeleton
                    key={i}
                    variant="circular"
                    width={60}
                    height={60}
                    sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Categories Skeleton */}
          <div className="px-6 py-8">
            <Skeleton
              variant="text"
              width={200}
              height={40}
              sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', mb: 3 }}
            />
            <div className="flex gap-4 overflow-hidden">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex-shrink-0" style={{ width: '200px' }}>
                  <Skeleton
                    variant="rectangular"
                    width={200}
                    height={300}
                    sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Collections Skeleton */}
          <div className="px-6 py-8">
            <Skeleton
              variant="text"
              width={200}
              height={40}
              sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', mb: 3 }}
            />
            <div className="flex gap-4 overflow-hidden">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex-shrink-0" style={{ width: '300px' }}>
                  <Skeleton
                    variant="rectangular"
                    width={300}
                    height={180}
                    sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content - always rendered but hidden during loading */}
      <div
        className={`min-h-screen text-white ${allLoaded ? 'animate-fadeIn' : 'opacity-0'}`}
        style={{ backgroundColor: "#071427" }}
      >
        {/* ✅ SignUp Modal */}
        {showSignUpModal && (
          <SignUp onClose={() => setShowSignUpModal(false)} />
        )}

        {/* ✅ Hero Section: Carousel + Streaming Platforms (full viewport height) */}
        <div className="h-screen flex flex-col">
          {/* ✅ Hero Carousel - grows to fill space */}
          <div className="flex-grow relative">
            <MovieCarousel
              onLoadComplete={() => handleLoadComplete('movieCarousel')}
              onMovieSelect={setSelectedMovie}
            />
          </div>

          {/* ✅ Streaming Platforms Row - stays at bottom */}
          <StreamingPlatforms onLoadComplete={() => handleLoadComplete('streamingPlatforms')} />
        </div>

        {/* ✅ Categories Carousel */}
        <MovieCategoriesCarousel
          onLoadComplete={() => handleLoadComplete('movieCategories')}
          onMovieSelect={setSelectedMovie}
        />

        {/* ✅ Collections Carousel */}
        <CollectionCarousel onLoadComplete={() => handleLoadComplete('collections')} />
      </div>

      {/* Movie Assistant Chatbot - only for non-admin users */}
      {user?.role !== "ADMIN" && <ChatBot movie={selectedMovie} />}
    </>
  );
}
