import { useState, useEffect } from 'react';
import './StreamingPlatforms.css';

export default function StreamingPlatforms({ onLoadComplete }) {
  useEffect(() => {
    // Simulate loading time for platforms
    const timer = setTimeout(() => {
      if (onLoadComplete) onLoadComplete();
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const platforms = [
    {
      name: 'Netflix',
      logo: '/Netflix_logo.png',
    },
    {
      name: 'Amazon Studios',
      logo: '/Amazon-Prime-Video-Logo.png',
    },
    {
      name: 'Warner Bros',
      logo: '/Warner_Bros_logo.png',
    },
    {
      name: 'Disney',
      logo: '/Disney_Plus_logo.png',
    },
    {
      name: 'Paramount',
      logo: '/Paramount_logo.svg',
    },
    {
      name: 'Universal',
      logo: '/Universal_Logo.png',
    },
    {
      name: 'Apple TV+',
      logo: '/Apple_TV_logo.png',
    },
    {
      name: 'HBO Max',
      logo: '/HBO-Max-Logo.png',
    },
    {
      name: 'Hulu',
      logo: '/Hulu-Logo.png',
    },
  ];

  return (
    <div className="w-full bg-black border-b border-gray-800 py-5 overflow-hidden flex-shrink-0">
      <div className="logo-carousel-container">
        <div className="logo-carousel-track">
          {/* First set of logos */}
          {platforms.map((platform, index) => (
            <div
              key={`${platform.name}-1-${index}`}
              className="logo-item"
              title={platform.name}
            >
              <img
                src={platform.logo}
                alt={platform.name}
                className={`logo-image ${platform.name === 'Netflix' || platform.name === 'Warner Bros' ? 'netflix-logo' : 'universal-logo'}`}
              />
            </div>
          ))}
          {/* Duplicate set for seamless loop */}
          {platforms.map((platform, index) => (
            <div
              key={`${platform.name}-2-${index}`}
              className="logo-item"
              title={platform.name}
            >
              <img
                src={platform.logo}
                alt={platform.name}
                className={`logo-image ${platform.name === 'Netflix' || platform.name === 'Warner Bros' ? 'netflix-logo' : 'universal-logo'}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
