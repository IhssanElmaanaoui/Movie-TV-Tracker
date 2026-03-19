import React, { createContext, useState, useCallback } from 'react';

export const SelectedMovieContext = createContext();

export function SelectedMovieProvider({ children }) {
  const [selectedMovie, setSelectedMovie] = useState(null);

  const selectMovie = useCallback((movie) => {
    setSelectedMovie(movie);
  }, []);

  const clearMovie = useCallback(() => {
    setSelectedMovie(null);
  }, []);

  return (
    <SelectedMovieContext.Provider value={{ selectedMovie, selectMovie, clearMovie }}>
      {children}
    </SelectedMovieContext.Provider>
  );
}

export function useSelectedMovie() {
  const context = React.useContext(SelectedMovieContext);
  if (!context) {
    throw new Error('useSelectedMovie must be used within SelectedMovieProvider');
  }
  return context;
}
