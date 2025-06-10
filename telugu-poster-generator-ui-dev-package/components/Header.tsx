
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="text-center">
      <div className="inline-block p-2 sm:p-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full shadow-lg mb-3 sm:mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 header-font-3d">
        AI Telugu Poster Generator
      </h1>
      <p className="mt-3 sm:mt-4 md:mt-8 text-base sm:text-lg md:text-xl text-gray-600 sub-header-3d">
        Create beautiful posters with mixed English and <span className="font-semibold text-purple-700 telugu-text-display">తెలుగు</span> text!
      </p>
    </header>
  );
};
