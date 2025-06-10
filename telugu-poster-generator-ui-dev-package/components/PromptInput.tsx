
import React, { useEffect, useRef, useState } from 'react';

// Declare SpeechRecognitionEvent types if not globally available
// These are often available in modern browser environments with "dom" lib in tsconfig
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number; // Standard property
  // Other properties if needed, but 'results' is key
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

// Define the type for a Speech Recognition API instance
interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: any) => any) | null; // Using 'any' as in original code for event
  onend: ((this: SpeechRecognitionInstance) => any) | null; 
  start: () => void;
  stop: () => void;
  abort: () => void; 
}

// Define the type for the Speech Recognition API constructor
interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}

// Extend Window interface
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}


interface PromptInputProps {
  userPrompt: string;
  setUserPrompt: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: () => void;
  isLoading: boolean;
}

export const PromptInput: React.FC<PromptInputProps> = ({
  userPrompt,
  setUserPrompt,
  onSubmit,
  isLoading
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechApiSupported, setSpeechApiSupported] = useState(true);

  const canSubmit = !isLoading && userPrompt.trim() !== '';

  useEffect(() => {
    const SpeechRecognitionAPI: SpeechRecognitionConstructor | undefined = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      console.warn("Speech Recognition API not supported by this browser.");
      setSpeechApiSupported(false);
      return;
    }

    recognitionRef.current = new SpeechRecognitionAPI();
    const recognition = recognitionRef.current;
    if (!recognition) return; // Should not happen if SpeechRecognitionAPI was valid

    recognition.lang = 'te-IN'; // Prioritize Telugu, should handle English too
    recognition.interimResults = false; 
    recognition.continuous = false; // Stop after first pause leading to a result

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }
      if (transcript) {
        setUserPrompt(prev => (prev ? prev.trim() + ' ' : '') + transcript.trim());
      }
      setIsListening(false); 
    };

    recognition.onerror = (event: any) => { // Standard Event, error is on event.error
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech' || event.error === 'audio-capture' || event.error === 'not-allowed') {
        // Graceful handling, maybe a small toast notification in future
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false); 
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
      }
    };
  }, [setUserPrompt]);


  const handleMicrophoneClick = () => {
    if (!speechApiSupported || !recognitionRef.current || isLoading) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        // Clear any previous text if you want mic to replace, or append. Current logic appends.
        // setUserPrompt(''); // Uncomment if you want mic to clear existing typed text first
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Error starting speech recognition:", e);
        setIsListening(false); // Ensure UI state is correct if start fails
      }
    }
  };


  const handleSubmitOnEnter = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit) {
        onSubmit();
      }
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = parseFloat(getComputedStyle(textarea).lineHeight) * 5 +
                        parseFloat(getComputedStyle(textarea).paddingTop) +
                        parseFloat(getComputedStyle(textarea).paddingBottom);
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [userPrompt]);

  const handleSendButtonClick = () => {
    if (canSubmit) {
      onSubmit();
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="relative flex items-center">
          <textarea
            ref={textareaRef}
            id="userPrompt"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            onKeyDown={handleSubmitOnEnter}
            placeholder="Describe your poster idea (or use the mic)..."
            rows={1}
            className="w-full p-3 pr-[5.75rem] border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow duration-200 resize-none overflow-y-auto custom-scrollbar"
            disabled={isLoading}
            aria-describedby="prompt-description"
            style={{ lineHeight: '1.5rem' }}
          />
          
          <button
            type="button"
            onClick={handleMicrophoneClick}
            disabled={isLoading || !speechApiSupported || isListening}
            aria-label={isListening ? "Stop listening" : "Use microphone"}
            title={!speechApiSupported ? "Speech recognition not supported by your browser" : (isListening ? "Listening..." : "Use microphone (Supports Telugu & English)")}
            className={`absolute right-[3.25rem] top-1/2 transform -translate-y-1/2 p-1.5 rounded-full text-white transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white
                        ${isLoading || !speechApiSupported ? 'bg-gray-400 cursor-not-allowed scale-95 opacity-80' 
                          : isListening ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 animate-pulse' 
                          : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 focus:ring-blue-500'}`}
          >
            {/* New Microphone Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>
              <path d="M0 0h24v24H0z" fill="none"/>
            </svg>
          </button>

          <button
            type="button"
            onClick={handleSendButtonClick}
            disabled={!canSubmit}
            aria-label="Send prompt"
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full text-white transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 focus:ring-offset-white
                        ${canSubmit ? 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800 scale-100' : 'bg-gray-400 cursor-not-allowed scale-95 opacity-80'}`}
          >
            {/* Up Arrow Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M0 0h24v24H0V0z" fill="none"/>
              <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/>
            </svg>
          </button>
        </div>
        <div className="flex justify-between items-center mt-1">
            <p id="prompt-description" className="text-xs text-gray-500">
              Press Enter or click the arrow to send. Shift+Enter for new line. Click mic for voice input.
            </p>
        </div>
      </div>
    </div>
  );
};