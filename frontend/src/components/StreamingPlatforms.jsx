import './StreamingPlatforms.css';

export default function StreamingPlatforms() {
  const platforms = [
    {
      name: 'Netflix',
      logo: '/Netflix_logo.png',
    },
    {
      name: 'Apple TV+',
      logo: '/Apple-TV-plus-logo.webp',
    },
    {
      name: 'Hulu',
      logo: '/Hulu-logo.webp',
    },
    {
      name: 'Warner Bros',
      logo: '/Warner_Bros_logo.png',
    },
    {
      name: 'HBO Max',
      logo: '/HBO-Max-Logo.png',
    },
    {
      name: 'Universal',
      logo: '/Universal_logo.png',
    },
    {
      name: 'Disney Plus',
      logo: '/Disney_Plus_logo.png',
    },
    {
      name: 'Amazon Prime Video',
      logo: '/Amazon-Prime-Video-Logo.png',
    },
    {
      name: 'Pixar',
      logo: '/Pixar_logo.png',
    },
  ];

  return (
    <div className="w-full bg-black border-b border-gray-800 py-8 overflow-hidden">
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
                className={`logo-image ${platform.name === 'Netflix' || platform.name === 'Warner Bros' || platform.name === 'HBO Max' ? 'netflix-logo' : platform.name === 'Universal' || platform.name === 'Disney Plus' || platform.name === 'Amazon Prime Video' || platform.name === 'Pixar' ? 'universal-logo' : ''}`}
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
                className={`logo-image ${platform.name === 'Netflix' || platform.name === 'Warner Bros' || platform.name === 'HBO Max' ? 'netflix-logo' : platform.name === 'Universal' || platform.name === 'Disney Plus' || platform.name === 'Amazon Prime Video' || platform.name === 'Pixar' ? 'universal-logo' : ''}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
