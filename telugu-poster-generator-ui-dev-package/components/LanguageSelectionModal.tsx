
import React from 'react';
import type { LanguagePreference } from '../App'; // Assuming LanguagePreference is exported from App.tsx

interface LanguageSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLanguage: (preference: LanguagePreference) => void;
}

export const LanguageSelectionModal: React.FC<LanguageSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectLanguage,
}) => {
  if (!isOpen) {
    return null;
  }

  const handleSelection = (preference: LanguagePreference) => {
    onSelectLanguage(preference);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out"
      aria-labelledby="language-selection-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-md transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalEnter">
        <div className="flex justify-between items-center mb-6">
          <h2 id="language-selection-title" className="text-2xl font-bold text-gray-800">
            Choose Poster Language
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Close language selection"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-gray-600 mb-8">
          Select the language(s) you'd like for the text on your poster:
        </p>

        <div className="space-y-4">
          <button
            onClick={() => handleSelection('english')}
            className="w-full flex items-center justify-center px-6 py-4 border border-transparent text-lg font-semibold rounded-lg shadow-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95"
            aria-label="Generate poster with English text only"
          >
            English Only
          </button>
          <button
            onClick={() => handleSelection('telugu')}
            className="w-full flex items-center justify-center px-6 py-4 border border-transparent text-lg font-semibold rounded-lg shadow-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95"
            aria-label="Generate poster with Telugu text only"
          >
            <span className="telugu-text-display">తెలుగు మాత్రమే</span> (Telugu Only)
          </button>
          <button
            onClick={() => handleSelection('both')}
            className="w-full flex items-center justify-center px-6 py-4 border border-transparent text-lg font-semibold rounded-lg shadow-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95"
            aria-label="Generate poster with both English and Telugu text"
          >
            English & <span className="telugu-text-display ml-1">తెలుగు</span> (Both)
          </button>
        </div>
         <style>{`
          @keyframes modalEnter {
            0% { transform: scale(0.95); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
          .animate-modalEnter {
            animation: modalEnter 0.3s ease-out forwards;
          }
        `}</style>
      </div>
    </div>
  );
};
