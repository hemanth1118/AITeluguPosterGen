
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PromptInput } from './components/PromptInput';
import { ImageDisplay } from './components/ImageDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { generateImageWithGemini, extractPosterDetailsFromPrompt, summarizePromptForTitle } from './services/geminiService';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LanguageSelectionModal } from './components/LanguageSelectionModal'; // New Modal

// Types
export interface PosterDetails { // Exporting for geminiService if needed, though it defines its own
  theme: string;
  englishText: string;
  teluguText: string;
}

export type LanguagePreference = 'english' | 'telugu' | 'both';

interface ConversationItem {
  id: string;
  type: 'userPrompt' | 'aiResponse';
  promptText?: string;
  imageUrl?: string | null;
  isLoading?: boolean;
  loadingStep?: string;
  errorText?: string | null;
  originalUserQuery?: string;
}

export interface ConversationSession {
  id: string;
  title: string;
  items: ConversationItem[];
  createdAt: number;
}

// Utility functions
const wrapText = (
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] => {
  if (!text) return [];
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? currentLine + ' ' + word : word;
    const metrics = context.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
};


const App: React.FC = () => {
  const initialSessionId = `session-${Date.now()}`;
  const [allSessions, setAllSessions] = useState<ConversationSession[]>([
    { id: initialSessionId, title: 'New Chat', items: [], createdAt: Date.now() }
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>(initialSessionId);
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [isOverallLoading, setIsOverallLoading] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [promptBarPosition, setPromptBarPosition] = useState<'middle' | 'bottom'>('middle');


  // States for language selection modal
  const [showLanguageModal, setShowLanguageModal] = useState<boolean>(false);
  const [pendingPrompt, setPendingPrompt] = useState<string>('');
  const [languagePreferenceForGeneration, setLanguagePreferenceForGeneration] = useState<LanguagePreference | null>(null);


  const canvasRef = useRef<HTMLCanvasElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  const activeSession = allSessions.find(s => s.id === activeSessionId);
  const currentConversationItems = activeSession?.items ?? [];

  useEffect(() => {
    const lastItem = currentConversationItems[currentConversationItems.length - 1];
    if (!lastItem || !activeSession) return;

    const shouldScrollInEffect =
      lastItem.type === 'userPrompt' ||
      (lastItem.type === 'aiResponse' && lastItem.isLoading) ||
      (lastItem.type === 'aiResponse' && !!lastItem.errorText && !lastItem.imageUrl);

    if (shouldScrollInEffect) {
      const targetId = lastItem.type === 'userPrompt' ? `user-prompt-${lastItem.id}` : `ai-response-${lastItem.id}`;
      
      setTimeout(() => {
        const elementToScroll = document.getElementById(targetId);
        if (elementToScroll) {
          elementToScroll.scrollIntoView({ behavior: "smooth", block: (lastItem.type === 'userPrompt' ? 'end' : 'nearest') });
        } else {
          conversationEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }
      }, 100); 
    }
  }, [currentConversationItems, activeSession]);

  useEffect(() => {
    const currentActiveSession = allSessions.find(s => s.id === activeSessionId);
    if (currentActiveSession && currentActiveSession.items.length > 0) {
      setPromptBarPosition('bottom');
    } else {
      setPromptBarPosition('middle');
    }
  }, [activeSessionId, allSessions]);


  const drawImageWithTextOverlay = useCallback(
    async (baseImageUrl: string, engText: string, telText: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        const canvas = canvasRef.current;
        if (!canvas) {
          reject(new Error('Canvas element not found'));
          return;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const hasEnglish = engText && engText.trim() !== '';
          const hasTelugu = telText && telText.trim() !== '';
          const textMaxWidth = canvas.width * 0.85; 
          const textX = canvas.width / 2;
          const availableHeightForText = canvas.height * 0.85; 
          const minFontSize = Math.max(8, canvas.width / 70); 
          const interTextPadding = Math.max(15, canvas.height * 0.03); 

          let englishFontSize = Math.max(minFontSize, Math.min(img.width / 18, img.height / 15));
          let teluguFontSize = Math.max(minFontSize, Math.min(img.width / 16, img.height / 12));
          
          let englishLines: string[] = [];
          let teluguLines: string[] = [];
          let englishLineHeight = 0;
          let teluguLineHeight = 0;
          let englishBlockHeight = 0;
          let teluguBlockHeight = 0;

          const maxIterations = 20; 
          for (let i = 0; i < maxIterations; i++) {
            englishLineHeight = englishFontSize * 1.2;
            teluguLineHeight = teluguFontSize * 1.2;

            if (hasEnglish) {
              ctx.font = `bold ${englishFontSize}px Inter, Arial, sans-serif`;
              englishLines = wrapText(ctx, engText, textMaxWidth);
              englishBlockHeight = englishLines.length * englishLineHeight;
            } else {
              englishLines = [];
              englishBlockHeight = 0;
            }

            if (hasTelugu) {
              ctx.font = `bold ${teluguFontSize}px 'Noto Sans Telugu', sans-serif`;
              teluguLines = wrapText(ctx, telText, textMaxWidth);
              teluguBlockHeight = teluguLines.length * teluguLineHeight;
            } else {
              teluguLines = [];
              teluguBlockHeight = 0;
            }
            
            const totalTextHeight = englishBlockHeight + 
                                   (hasEnglish && hasTelugu && englishLines.length > 0 && teluguLines.length > 0 ? interTextPadding : 0) + 
                                   teluguBlockHeight;

            if (totalTextHeight <= availableHeightForText) break;
            if (englishFontSize <= minFontSize && teluguFontSize <= minFontSize) break;

            if (hasEnglish && englishFontSize > minFontSize) englishFontSize = Math.max(minFontSize, englishFontSize * 0.9); 
            if (hasTelugu && teluguFontSize > minFontSize) teluguFontSize = Math.max(minFontSize, teluguFontSize * 0.9); 
            if (i === maxIterations -1) console.warn("Max font size reduction iterations reached. Text may still be large.");
          }
          
          englishLineHeight = englishFontSize * 1.2;
          teluguLineHeight = teluguFontSize * 1.2;
          if (hasEnglish) {
            ctx.font = `bold ${englishFontSize}px Inter, Arial, sans-serif`;
            englishLines = wrapText(ctx, engText, textMaxWidth);
            englishBlockHeight = englishLines.length * englishLineHeight;
          } else {
             englishLines = []; englishBlockHeight = 0;
          }
          if (hasTelugu) {
            ctx.font = `bold ${teluguFontSize}px 'Noto Sans Telugu', sans-serif`;
            teluguLines = wrapText(ctx, telText, textMaxWidth);
            teluguBlockHeight = teluguLines.length * teluguLineHeight;
          } else {
            teluguLines = []; teluguBlockHeight = 0;
          }

          const totalActualTextHeight = englishBlockHeight + 
                                        (hasEnglish && hasTelugu && englishLines.length > 0 && teluguLines.length > 0 ? interTextPadding : 0) + 
                                        teluguBlockHeight;
          let currentY = (canvas.height - totalActualTextHeight) / 2;

          ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
          ctx.shadowBlur = Math.max(3, canvas.width / 250);
          ctx.shadowOffsetX = Math.max(1, canvas.width / 400);
          ctx.shadowOffsetY = Math.max(1, canvas.width / 400);

          if (hasEnglish && englishLines.length > 0) {
            ctx.font = `bold ${englishFontSize}px Inter, Arial, sans-serif`;
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = Math.max(1, Math.min(4, englishFontSize / 18));
            
            currentY += englishBlockHeight / 2; 
            for (let i = 0; i < englishLines.length; i++) {
              const lineY = currentY - ((englishLines.length - 1) / 2 - i) * englishLineHeight;
              ctx.strokeText(englishLines[i], textX, lineY);
              ctx.fillText(englishLines[i], textX, lineY);
            }
            currentY += englishBlockHeight / 2 + (hasTelugu && teluguLines.length > 0 ? interTextPadding : 0);
          } else if (hasTelugu && teluguLines.length > 0) { 
            currentY += teluguBlockHeight / 2; 
          }

          if (hasTelugu && teluguLines.length > 0) {
            ctx.font = `bold ${teluguFontSize}px 'Noto Sans Telugu', sans-serif`;
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = Math.max(1, Math.min(4, teluguFontSize / 18));

            if (!hasEnglish || englishLines.length === 0) { /* currentY is already correct */ } 
            else { currentY += teluguBlockHeight / 2; }

            for (let i = 0; i < teluguLines.length; i++) {
              const lineY = currentY - ((teluguLines.length - 1) / 2 - i) * teluguLineHeight;
              ctx.strokeText(teluguLines[i], textX, lineY);
              ctx.fillText(teluguLines[i], textX, lineY);
            }
          }
          
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (errEvent) => {
          console.error('Error loading base image to canvas:', errEvent);
          reject(new Error('Failed to load base image.'));
        };
        img.src = baseImageUrl;
      });
    },
    []
  );

  const updateSessionItems = (sessionId: string, updateFn: (items: ConversationItem[]) => ConversationItem[]) => {
    setAllSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId ? { ...session, items: updateFn(session.items) } : session
      ).sort((a,b) => b.createdAt - a.createdAt)
    );
  };
  
  const updateSessionTitle = useCallback((sessionId: string, newTitle: string) => {
    setAllSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId ? { ...session, title: newTitle } : session
      ).sort((a,b) => b.createdAt - a.createdAt)
    );
  }, []);

  const proceedWithGeneration = useCallback(async (promptToGenerate: string, langPref: LanguagePreference) => {
    if (!promptToGenerate.trim() || !activeSessionId) {
      setIsOverallLoading(false); 
      return;
    }
    
    setPromptBarPosition('bottom'); // Move prompt bar to bottom on generation start
    setIsOverallLoading(true); 

    const userMessageId = `user-${Date.now()}`;
    const aiResponseId = `ai-${Date.now()}`;

    const userMessage: ConversationItem = { id: userMessageId, type: 'userPrompt', promptText: promptToGenerate };
    const aiInitialMessage: ConversationItem = { id: aiResponseId, type: 'aiResponse', isLoading: true, loadingStep: 'Analyzing your idea...', originalUserQuery: promptToGenerate };
    
    const currentSessionForTitleUpdate = allSessions.find(s => s.id === activeSessionId);
    let titleUpdatedBySummarization = false;

    if (currentSessionForTitleUpdate && currentSessionForTitleUpdate.title === 'New Chat' && promptToGenerate.trim() !== '') {
      try {
        const summarizedTitle = await summarizePromptForTitle(promptToGenerate);
        if (summarizedTitle && summarizedTitle.trim() !== '') {
          updateSessionTitle(activeSessionId, summarizedTitle.trim());
          titleUpdatedBySummarization = true;
        }
      } catch (titleError) {
        console.error("Error summarizing prompt for title:", titleError);
         if(!titleUpdatedBySummarization) {
            const fallbackTitle = promptToGenerate.substring(0, 40) + (promptToGenerate.length > 40 ? '...' : '');
            updateSessionTitle(activeSessionId, fallbackTitle);
         }
      }
    }


    setAllSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === activeSessionId
          ? {
              ...session,
              items: [...session.items, userMessage, aiInitialMessage],
            }
          : session
      ).sort((a,b) => b.createdAt - a.createdAt)
    );


    try {
      const posterDetails: PosterDetails = await extractPosterDetailsFromPrompt(promptToGenerate, langPref);
      updateSessionItems(activeSessionId, items => items.map(item => item.id === aiResponseId ? {...item, loadingStep: 'Creating background image...' } : item));
      
      if (!posterDetails.theme) {
        throw new Error("Could not determine a theme from your prompt. Please try rephrasing more clearly about the visual style.");
      }
      
      const currentActiveSessionForTextTitle = allSessions.find(s => s.id === activeSessionId); 
      if (currentActiveSessionForTextTitle && (!titleUpdatedBySummarization || currentActiveSessionForTextTitle.title === 'New Chat' || currentActiveSessionForTextTitle.title === (promptToGenerate.substring(0, 40) + (promptToGenerate.length > 40 ? '...' : '')))) {
        if (posterDetails.englishText) {
          updateSessionTitle(activeSessionId, posterDetails.englishText.substring(0, 40) + (posterDetails.englishText.length > 40 ? '...' : ''));
        } else if (posterDetails.teluguText) {
          updateSessionTitle(activeSessionId, posterDetails.teluguText.substring(0, 40) + (posterDetails.teluguText.length > 40 ? '...' : ''));
        }
      }

      const backgroundPrompt = `IMPORTANT: Generate a background image ONLY. This image MUST be 100% free of any text, letters, words, numbers, symbols, glyphs, characters, lettering, typography, or writing.
The image is for a visual backdrop.
Visual theme inspiration: "${posterDetails.theme}".
The theme description above is for VISUAL INSPIRATION ONLY. Do NOT render any words from the theme description as text on the image. For example, if the theme is "Mystical Forest", show a mystical forest, DO NOT write "Mystical Forest".
Image style: High-quality, visually rich, suitable for poster background.
Composition: Provide ample clear space or negative space suitable for text overlay. The background should complement, not compete with, text that will be added later.
Aspect ratio: 16:9.
The final image MUST be PURELY PICTORIAL, containing absolutely NO TEXTUAL ELEMENTS of any kind.
Focus on: colors, patterns, textures, scenery, abstract visuals. NO TEXT.
Confirm: NO TEXT.`;

      const baseImageUrl = await generateImageWithGemini(backgroundPrompt);
      if (!baseImageUrl) {
        throw new Error("The AI failed to generate a background image. Try simplifying your theme or try again later.");
      }
      updateSessionItems(activeSessionId, items => items.map(item => item.id === aiResponseId ? {...item, loadingStep: 'Adding text to your poster...' } : item));

      const finalImageUrl = await drawImageWithTextOverlay(baseImageUrl, posterDetails.englishText, posterDetails.teluguText);
      updateSessionItems(activeSessionId, items => items.map(item => item.id === aiResponseId ? {...item, isLoading: false, imageUrl: finalImageUrl, errorText: null } : item));

    } catch (err) {
      console.error('Error in generation process:', err);
      const errorMessage = (err instanceof Error) ? `Failed to create poster: ${err.message}` : 'An unknown error occurred.';
      updateSessionItems(activeSessionId, items => items.map(item => item.id === aiResponseId ? {...item, isLoading: false, errorText: errorMessage, imageUrl: null } : item));
    } finally {
      setIsOverallLoading(false);
      setPendingPrompt('');
      setLanguagePreferenceForGeneration(null);
    }
  }, [drawImageWithTextOverlay, activeSessionId, allSessions, updateSessionTitle, setPromptBarPosition] // Added setPromptBarPosition
  );


  const handleInitiateGeneration = useCallback(() => {
    if (!userPrompt.trim() || isOverallLoading) {
      return;
    }
    setPendingPrompt(userPrompt);
    setShowLanguageModal(true);
  }, [userPrompt, isOverallLoading]);

  const handleLanguageSelected = useCallback((selectedPreference: LanguagePreference) => {
    setShowLanguageModal(false);
    setUserPrompt(''); 
    if (pendingPrompt) {
      proceedWithGeneration(pendingPrompt, selectedPreference);
    } else {
      console.warn("Language selected but no pending prompt found.");
      setIsOverallLoading(false); 
    }
  }, [pendingPrompt, proceedWithGeneration]);

  const handleCloseLanguageModal = () => {
    setShowLanguageModal(false);
    setPendingPrompt(''); 
  };


  const handleDownloadImageForItem = (imageUrlToDownload: string | undefined | null, originalUserQuery?: string) => {
    if (!imageUrlToDownload) return;
    const link = document.createElement('a');
    link.href = imageUrlToDownload;
    const promptStart = originalUserQuery ? originalUserQuery.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'ai_poster';
    link.download = `${promptStart}_poster.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNewSession = () => {
    const currentActiveSession = allSessions.find(s => s.id === activeSessionId);
  
    if (currentActiveSession && currentActiveSession.items.length === 0 && currentActiveSession.title === 'New Chat') {
      setActiveSessionId(currentActiveSession.id); 
      setUserPrompt('');
      setIsOverallLoading(false);
      // setPromptBarPosition('middle'); // useEffect will handle this
      return;
    }
  
    const newId = `session-${Date.now()}`;
    const newSession: ConversationSession = {
      id: newId,
      title: 'New Chat', 
      items: [],
      createdAt: Date.now(),
    };
    setAllSessions(prev => [newSession, ...prev].sort((a,b) => b.createdAt - a.createdAt));
    setActiveSessionId(newId);
    setUserPrompt('');
    setIsOverallLoading(false);
    // setPromptBarPosition('middle'); // useEffect will handle this
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    // const selectedSession = allSessions.find(s => s.id === sessionId); // useEffect will handle position
    // if (selectedSession && selectedSession.items.length === 0) {
    //   setPromptBarPosition('middle');
    // } else {
    //   setPromptBarPosition('bottom');
    // }
    setUserPrompt(''); 
    setIsOverallLoading(false); 
  };

  const handleDeleteSession = (sessionIdToDelete: string) => {
    const remainingSessions = allSessions.filter(s => s.id !== sessionIdToDelete);

    if (remainingSessions.length === 0) {
      const newDefaultSessionId = `session-${Date.now()}`;
      const newDefaultSession: ConversationSession = {
        id: newDefaultSessionId,
        title: 'New Chat', 
        items: [],
        createdAt: Date.now(),
      };
      setAllSessions([newDefaultSession]);
      setActiveSessionId(newDefaultSessionId);
    } else {
      setAllSessions(remainingSessions.sort((a,b) => b.createdAt - a.createdAt));
      if (activeSessionId === sessionIdToDelete) {
        setActiveSessionId(remainingSessions[0].id); 
      }
    }
    setUserPrompt('');
    setIsOverallLoading(false);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
      <Sidebar
        sessions={allSessions} 
        activeSessionId={activeSessionId}
        onNewSession={handleNewSession}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      <div className="flex-grow flex flex-col overflow-hidden">
        {promptBarPosition === 'middle' ? (
          <div className="flex-1 flex flex-col"> {/* Layout for middle prompt state */}
            <div className="max-w-3xl mx-auto w-full px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6"> {/* Header and Welcome Message container */}
              <Header />
              {currentConversationItems.length === 0 && !isOverallLoading && (
                 <div className="mt-4 sm:mt-8 text-center text-gray-500 bg-white/80 p-4 sm:p-6 rounded-xl shadow-lg">
                  <p className="text-base sm:text-lg">Welcome to the AI Poster Generator!</p>
                  <p className="mt-2 text-sm sm:text-base">Describe your poster idea, then choose your language preference to get started.</p>
                  <p className="mt-2 text-xs sm:text-sm">Example: "Happy Ugadi from Hemanth with 'Happy Ugadi' and 'ఉగాది శుభాకాంక్షలు'"</p>
                </div>
              )}
            </div>
            <div className="flex-grow flex items-center justify-center w-full px-3 sm:px-4 md:px-6 pb-4 md:pb-8"> {/* Vertically centers PromptInput in remaining space */}
              <div className="max-w-3xl w-full bg-white/90 backdrop-blur-md p-3 sm:p-4 md:p-6 rounded-xl shadow-xl">
                <PromptInput
                  userPrompt={userPrompt}
                  setUserPrompt={setUserPrompt}
                  onSubmit={handleInitiateGeneration}
                  isLoading={isOverallLoading || showLanguageModal}
                />
              </div>
            </div>
          </div>
        ) : ( // promptBarPosition === 'bottom'
          <>
            <main className="flex-grow overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 custom-scrollbar">
              <div className="max-w-3xl mx-auto w-full">
                <Header />
                {currentConversationItems.map((item) => (
                  <React.Fragment key={item.id}>
                    {item.type === 'userPrompt' && item.promptText && (
                      <div id={`user-prompt-${item.id}`} className="p-3 sm:p-4 bg-indigo-500 text-white rounded-xl shadow-md ml-auto max-w-[85%] sm:max-w-[80%] md:max-w-[70%] clear-both float-right my-2 sm:my-3">
                        <p className="font-semibold text-sm sm:text-base">You:</p>
                        <p className="text-sm sm:text-base">{item.promptText}</p>
                      </div>
                    )}
                    {item.type === 'aiResponse' && (
                      <div id={`ai-response-${item.id}`} className="p-3 sm:p-4 bg-white rounded-xl shadow-2xl my-2 sm:my-3 max-w-full sm:max-w-[95%] md:max-w-[85%] clear-both float-left transform transition-all hover:scale-[1.01] duration-300">
                        {item.isLoading && <LoadingSpinner message={item.loadingStep || 'Generating...'} />}
                        {item.errorText && <ErrorMessage message={item.errorText} />}
                        {item.imageUrl && !item.isLoading && (
                          <>
                            <ImageDisplay
                              imageUrl={item.imageUrl}
                              altText={item.originalUserQuery || "Generated Poster"}
                              isLoading={false} 
                              onImageLoaded={() => {
                                if (activeSession && activeSession.items.length > 0) {
                                    const currentLastItem = activeSession.items[activeSession.items.length - 1];
                                    if (currentLastItem && currentLastItem.id === item.id && currentLastItem.type === 'aiResponse' && currentLastItem.imageUrl) {
                                        const element = document.getElementById(`ai-response-${item.id}`);
                                        if (element) {
                                            setTimeout(() => {
                                               element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                            }, 50); 
                                        }
                                    }
                                }
                              }}
                            />
                            <div className="mt-3 sm:mt-4 text-center">
                              <button
                                onClick={() => handleDownloadImageForItem(item.imageUrl, item.originalUserQuery)}
                                className="px-4 py-2 sm:px-6 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-lg shadow-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95"
                                aria-label="Download this generated poster"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 inline-block mr-1 sm:mr-2 -mt-0.5 sm:-mt-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                Download Poster
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </React.Fragment>
                ))}
                <div ref={conversationEndRef} style={{ height: '1px' }} />
              </div>
            </main>
            <div className="bg-white/90 backdrop-blur-md p-3 sm:p-4 md:p-6 border-t border-gray-200 shadow-top">
              <div className="max-w-3xl mx-auto">
                <PromptInput
                  userPrompt={userPrompt}
                  setUserPrompt={setUserPrompt}
                  onSubmit={handleInitiateGeneration}
                  isLoading={isOverallLoading || showLanguageModal} 
                />
              </div>
            </div>
          </>
        )}
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} aria-hidden="true"></canvas>
      <LanguageSelectionModal
        isOpen={showLanguageModal}
        onClose={handleCloseLanguageModal}
        onSelectLanguage={handleLanguageSelected}
      />
    </div>
  );
};

export default App;
