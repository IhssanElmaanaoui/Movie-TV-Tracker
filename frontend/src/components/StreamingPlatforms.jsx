export default function StreamingPlatforms() {
  const platforms = [
    {
      name: 'Netflix',
      logo: '/Netflix-logo.webp',
    },
    {
      name: 'Disney+',
      logo: '/disney-logo.webp',
    },
    {
      name: 'HBO Max',
      logo: '/hd-hbo-logo.webp',
    },
    {
      name: 'PIXAR',
      logo: '/Universal_Pictures_logo.webp',
    },
    {
      name: 'Amazon Prime',
      logo: '/amazon-prime-video-logo.webp',
    },
    {
      name: 'Apple TV+',
      logo: '/Apple-TV-plus-logo.webp',
    },
  ];

  return (
    <div className="w-full bg-black border-b border-gray-800 py-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-center gap-10 flex-wrap">
          {platforms.map((platform) => (
            <div
              key={platform.name}
              className="group cursor-pointer transition-all duration-300"
              title={platform.name}
            >
              <img
                src={platform.logo}
                alt={platform.name}
                className="h-10 w-auto object-contain opacity-75 group-hover:opacity-100 transition-opacity duration-300 filter grayscale group-hover:grayscale-0"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
