'use client';

import React, { useState, useEffect } from 'react';

export function TwinCreationLoading() {
  const [dots, setDots] = useState('.');
  const [message, setMessage] = useState('Starting twin creation');
  const [progress, setProgress] = useState(0);
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

      // Increase progress with each message change
      setProgress((messageIndex + 1) * (100 / messages.length));
    }, 4500);

    return () => {
      clearInterval(dotsTimer);
      clearInterval(messageTimer);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-10 bg-gray-800/70 rounded-lg shadow-md border border-gray-700">
      <div className="w-full max-w-md px-6">
        <div className="flex justify-center items-center mb-8">
          <div className="relative w-20 h-20">
            {/* Outer rotating ring */}
            <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-400 rounded-full animate-spin" style={{ animationDuration: '2s' }}></div>

            {/* Middle rotating ring - opposite direction */}
            <div className="absolute inset-2 border-4 border-transparent border-b-indigo-600 border-l-indigo-500 rounded-full animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}></div>

            {/* Inner pulsing circle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        <div className="text-center mb-8">
          <p className="text-blue-300 font-medium mb-2 text-lg min-h-[28px]">
            {message}
          </p>
          <p className="text-gray-400 text-sm">
            This may take a minute...
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-700 ease-in-out"
            style={{ width: `${Math.max(5, progress)}%` }}
          ></div>
        </div>
        <p className="text-gray-500 text-xs text-right">{Math.round(progress)}%</p>
      </div>
    </div>
  );
} 