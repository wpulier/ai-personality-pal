'use client';

import { useEffect, useState } from 'react';

export function TwinCreationLoading() {
  const [progress, setProgress] = useState(10);
  const [message, setMessage] = useState('Analyzing your preferences...');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 250);
    
    // Update messages as progress increases
    const messageInterval = setInterval(() => {
      if (progress < 30) {
        setMessage('Analyzing your preferences...');
      } else if (progress < 60) {
        setMessage('Creating personality profile...');
      } else if (progress < 90) {
        setMessage('Finalizing your digital twin...');
      } else {
        setMessage('Almost ready to meet your twin!');
      }
    }, 1000);
    
    return () => {
      clearInterval(interval);
      clearInterval(messageInterval);
    };
  }, [progress]);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-xl">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
        </div>
        
        <h3 className="text-2xl font-bold mb-2 text-center text-gray-800">Creating Your Digital Twin</h3>
        <p className="text-gray-600 text-center mb-6">
          {message}
        </p>
        
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="text-right text-sm text-gray-500">{progress}%</div>
      </div>
    </div>
  );
} 