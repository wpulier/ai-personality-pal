'use client';

import React, { useState, useEffect } from 'react';

export function TwinCreationLoading() {
  const [dots, setDots] = useState('.');
  const [message, setMessage] = useState('Starting twin creation');
  const messages = [
    'Starting twin creation',
    'Analyzing your data',
    'Building personality model',
    'Finalizing your digital twin',
    'Almost ready to chat'
  ];

  useEffect(() => {
    // Animate the dots
    const dotsTimer = setInterval(() => {
      setDots(prevDots => prevDots.length < 3 ? prevDots + '.' : '.');
    }, 500);

    // Cycle through messages
    let messageIndex = 0;
    const messageTimer = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setMessage(messages[messageIndex]);
    }, 3000);

    return () => {
      clearInterval(dotsTimer);
      clearInterval(messageTimer);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-10 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 rounded-xl shadow-sm border border-indigo-100 px-6">
      <div className="text-center p-8 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg max-w-md w-full border border-indigo-100">
        
        <div className="flex justify-center space-x-3 mb-8">
          <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full animate-pulse" style={{ animationDuration: '0.9s' }}></div>
          <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full animate-pulse" style={{ animationDuration: '0.9s', animationDelay: '0.3s' }}></div>
          <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full animate-pulse" style={{ animationDuration: '0.9s', animationDelay: '0.6s' }}></div>
        </div>
        
        <p className="text-gray-600 mb-2">
          {message}{dots}
        </p>
        <p className="text-gray-500 text-sm">
          This may take a minute...
        </p>
      </div>
    </div>
  );
} 