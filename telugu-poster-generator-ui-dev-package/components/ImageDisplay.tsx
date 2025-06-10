
import React from 'react';

interface ImageDisplayProps {
  imageUrl: string | null;
  altText: string; // Will be the userPrompt
  isLoading: boolean;
  onImageLoaded?: () => void; // Optional callback for when image has loaded
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({ imageUrl, altText, isLoading, onImageLoaded }) => {
  if (isLoading && !imageUrl) { 
    return (
        <div className="mt-4 sm:mt-6 md:mt-8 w-full aspect-video bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
            {/* The LoadingSpinner component in App.tsx now shows detailed loading messages */}
        </div>
    );
  }

  if (!imageUrl && !isLoading) {
    return null; 
  }
  
  if (imageUrl) {
    return (
      <div className="mt-4 sm:mt-6 md:mt-8 p-2 border-4 border-dashed border-purple-300 rounded-xl bg-purple-50">
        <img
          src={imageUrl}
          alt={altText ? `Poster for idea: ${altText.substring(0,100)}${altText.length > 100 ? '...' : ''}` : "Generated AI poster"}
          className="w-full h-auto rounded-lg shadow-lg object-contain"
          style={{ maxHeight: '70vh' }}
          onLoad={onImageLoaded} // Call the callback when image loads
        />
      </div>
    );
  }

  return null;
};
