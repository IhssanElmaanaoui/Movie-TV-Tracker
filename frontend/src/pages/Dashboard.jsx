import { useState } from "react";
import MovieCarousel from "../components/MovieCarousel";
import StreamingPlatforms from "../components/StreamingPlatforms";
import MovieCategoriesCarousel from "../components/MovieCategoriesCarousel";
import CollectionCarousel from "../components/CollectionCarousel";
import SignUp from "../components/SignUp";

export default function Dashboard() {
  const [showSignUpModal, setShowSignUpModal] = useState(false);

  return (
    /* ✅ Background uniforme comme Carousel */
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: "#071427" }}
    >
      {/* ✅ SignUp Modal */}
      {showSignUpModal && (
        <SignUp onClose={() => setShowSignUpModal(false)} />
      )}

      {/* ✅ Hero Carousel */}
      <MovieCarousel />

      {/* ✅ Streaming Platforms Row */}
      <StreamingPlatforms />

      {/* ✅ Categories Carousel */}
      <MovieCategoriesCarousel />

      {/* ✅ Collections Carousel */}
      <CollectionCarousel />
    </div>
  );
}
