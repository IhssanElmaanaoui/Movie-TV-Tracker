import { useState, useEffect } from "react";
import { RingLoader } from "react-spinners";
import MovieCarousel from "../components/MovieCarousel";
import StreamingPlatforms from "../components/StreamingPlatforms";
import MovieCategoriesCarousel from "../components/MovieCategoriesCarousel";
import CollectionCarousel from "../components/CollectionCarousel";
import SignUp from "../components/SignUp";

export default function Dashboard() {
  const [showSignUpModal, setShowSignUpModal] = useState(false);
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
      {/* Loading Overlay */}
      {!allLoaded && (
        <div
          className="fixed inset-0 z-50 flex justify-center items-center"
          style={{ backgroundColor: "#071427" }}
        >
          <RingLoader color="#361087" />
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
            <MovieCarousel onLoadComplete={() => handleLoadComplete('movieCarousel')} />
          </div>

          {/* ✅ Streaming Platforms Row - stays at bottom */}
          <StreamingPlatforms onLoadComplete={() => handleLoadComplete('streamingPlatforms')} />
        </div>

        {/* ✅ Categories Carousel */}
        <MovieCategoriesCarousel onLoadComplete={() => handleLoadComplete('movieCategories')} />

        {/* ✅ Collections Carousel */}
        <CollectionCarousel onLoadComplete={() => handleLoadComplete('collections')} />
      </div>
    </>
  );
}
