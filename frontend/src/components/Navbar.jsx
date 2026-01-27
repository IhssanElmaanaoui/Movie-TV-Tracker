import { useState } from 'react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Movies', href: '/movies' },
    { label: 'TV Shows', href: '/tv-shows' },
    { label: 'My Lists', href: '/my-lists' },
    { label: 'Dashboard', href: '/dashboard' },
  ];

  return (
    <nav className="w-full fixed top-0 left-0 z-50 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Title */}
          <div className="flex-shrink-0">
            <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Projection
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-gray-300 hover:text-white transition-colors duration-200 font-medium text-sm"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <button className="px-6 py-2 border-2 border-blue-500 text-blue-500 rounded-lg font-semibold transition-all duration-300 ease-in-out hover:bg-blue-500 hover:text-white">
              Login
            </button>
            <button className="px-6 py-2 border-2 border-red-500 text-red-500 rounded-lg font-semibold transition-all duration-300 ease-in-out hover:bg-red-500 hover:text-white">
              Sign Up
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-slate-700 transition-colors duration-200 focus:outline-none"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {!isOpen ? (
                // Hamburger Icon
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              ) : (
                // Close Icon
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-slate-800 border-t border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-gray-300 hover:text-white hover:bg-slate-700 block px-3 py-2 rounded-md font-medium transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Mobile Auth Buttons */}
          <div className="px-2 py-3 space-y-2 border-t border-slate-700">
            <button className="w-full px-4 py-2 border-2 border-blue-500 text-blue-500 rounded-lg font-semibold transition-all duration-300 ease-in-out hover:bg-blue-500 hover:text-white">
              Login
            </button>
            <button className="w-full px-4 py-2 border-2 border-red-500 text-red-500 rounded-lg font-semibold transition-all duration-300 ease-in-out hover:bg-red-500 hover:text-white">
              Sign Up
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
