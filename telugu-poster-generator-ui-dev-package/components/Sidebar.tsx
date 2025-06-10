import React, { useState, useEffect, useRef } from 'react';
import type { ConversationSession } from '../App'; // Import type

interface SidebarProps {
  sessions: ConversationSession[];
  activeSessionId: string | null;
  onNewSession: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const AppLogo: React.FC<{ isCollapsed: boolean }> = ({ isCollapsed }) => (
  <svg 
    viewBox="0 0 64 64" 
    className={`${isCollapsed ? 'w-8 h-8' : 'w-9 h-9'} text-white transition-all duration-300`} // Slightly adjusted expanded size
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="logoMainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor: 'rgb(129, 140, 248)'}} /> {/* indigo-400 */}
        <stop offset="100%" style={{stopColor: 'rgb(219, 39, 119)'}} /> {/* pink-600 */}
      </linearGradient>
      <filter id="logoSubtleDropShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
        <feOffset dx="1.5" dy="1.5" result="offsetblur"/>
        <feComponentTransfer in="offsetblur" result="shadowWithOpacity">
            <feFuncA type="linear" slope="0.4"/>
        </feComponentTransfer>
        <feMerge>
          <feMergeNode in="shadowWithOpacity"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect x="5" y="5" width="54" height="54" rx="12" ry="12" fill="rgba(0,0,0,0.1)" transform="translate(1,1)" />
    <path 
      d="M12 52 L32 12 L52 52 L45 52 L38.5 38 H25.5 L19 52 Z M32 22 L25.5 34 H38.5 Z" 
      fill="url(#logoMainGradient)" 
      filter="url(#logoSubtleDropShadow)"
      stroke="#FFFFFF"
      strokeWidth="2.5"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
    <circle cx="48" cy="17" r="3.5" fill="rgba(255,255,255,0.75)" filter="url(#logoSubtleDropShadow)" />
    <circle cx="16" cy="17" r="3" fill="rgba(255,255,255,0.65)" filter="url(#logoSubtleDropShadow)" />
  </svg>
);


export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  onNewSession,
  onSelectSession,
  onDeleteSession,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [menuOpenForSessionId, setMenuOpenForSessionId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleToggleMenu = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setMenuOpenForSessionId(prev => (prev === sessionId ? null : sessionId));
  };

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    onDeleteSession(sessionId);
    setMenuOpenForSessionId(null);
  };

  const handleNewSessionClick = () => {
    onNewSession();
    setMenuOpenForSessionId(null); 
  };

  const handleSelectSessionClick = (sessionId: string) => {
    onSelectSession(sessionId);
    setMenuOpenForSessionId(null); 
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpenForSessionId && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const targetIsMenuToggle = (event.target as HTMLElement).closest('.menu-toggle-button');
        if (!targetIsMenuToggle) {
          setMenuOpenForSessionId(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpenForSessionId]);

  useEffect(() => {
    if (isCollapsed) {
      setMenuOpenForSessionId(null);
    }
  }, [isCollapsed]);

  return (
    <div
      className={`bg-gradient-to-b from-indigo-700 to-purple-800 text-white flex flex-col shadow-2xl h-full transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16 md:w-20' : 'w-64 md:w-72'
      }`}
    >
      <div className={`p-3 border-b border-indigo-600/50 flex items-center ${isCollapsed ? 'justify-center relative' : 'justify-between'}`}>
        {!isCollapsed && (
            <div className="flex items-center space-x-2.5"> {/* Increased space for text */}
                <AppLogo isCollapsed={isCollapsed} />
                <span className="sidebar-brand-text">AI Poster Gen</span>
            </div>
        )}
         {isCollapsed && ( 
            <div className="flex items-center justify-center w-full"> {/* Ensures logo is centered when toggle button is absolute */}
                 <AppLogo isCollapsed={isCollapsed} />
            </div>
        )}
        <button
            onClick={onToggleCollapse}
            className={`p-2 rounded-md hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400 ${isCollapsed ? 'absolute top-3 left-1/2 -translate-x-1/2 md:static md:transform-none' : '' }`}
            style={isCollapsed && window.innerWidth < 768 ? {top: '0.75rem'} : {}} 
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" /> 
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            )}
        </button>
      </div>

      <div className={`p-3 ${isCollapsed ? 'pt-12 md:pt-4' : 'border-b border-indigo-600/50'}`}>
        <button
          onClick={handleNewSessionClick}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center h-10' : 'justify-center px-4 py-3'} bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-75`}
          aria-label="Start a new chat"
          title={isCollapsed ? "New Chat" : ""}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${!isCollapsed ? 'mr-2' : ''}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          {!isCollapsed && <span className="truncate">New Chat</span>}
        </button>
      </div>

      <nav className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-1">
        {sessions.length > 0 ? (
          sessions.map((session) => (
            <div key={session.id} className="relative group">
              <button
                onClick={() => handleSelectSessionClick(session.id)}
                className={`w-full text-left ${isCollapsed ? 'h-10 flex items-center justify-center' : 'pl-3 pr-10 py-2.5'} rounded-md text-sm font-medium transition-all duration-150 ease-in-out block truncate focus:outline-none focus:ring-1 focus:ring-purple-300
                  ${session.id === activeSessionId
                    ? 'bg-purple-600 shadow-md text-white scale-[1.02]'
                    : 'text-indigo-100 hover:bg-indigo-600/70 hover:text-white active:bg-indigo-500/80'
                  }`}
                title={session.title}
                aria-current={session.id === activeSessionId ? "page" : undefined}
              >
                {isCollapsed ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                ) : (
                    session.title || 'Untitled Chat'
                )}
              </button>
              {!isCollapsed && sessions.length > 0 && ( 
                 <button
                    onClick={(e) => handleToggleMenu(e, session.id)}
                    aria-label={`Options for chat: ${session.title}`}
                    className="menu-toggle-button absolute right-1 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full text-indigo-200 hover:text-white hover:bg-indigo-500/50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                </button>
              )}
              {!isCollapsed && menuOpenForSessionId === session.id && (
                <div 
                  ref={menuOpenForSessionId === session.id ? menuRef : null}
                  className="absolute z-10 left-full ml-1 top-0 mt-0 w-40 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none py-1"
                  role="menu" 
                  aria-orientation="vertical" 
                  aria-labelledby={`options-menu-${session.id}`}
                >
                  <button
                    onClick={(e) => handleDeleteClick(e, session.id)}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50 hover:text-red-900 focus:bg-red-50 focus:text-red-900"
                    role="menuitem"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Delete Chat
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          !isCollapsed && <p className="p-3 text-sm text-indigo-300">No chats yet.</p>
        )}
      </nav>
      {/* Removed redundant footer text from here, brand is now at top */}
    </div>
  );
};