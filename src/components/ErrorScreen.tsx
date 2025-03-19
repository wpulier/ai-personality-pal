import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ErrorScreenProps {
    error: string;
    onRetry: () => void;
}

const ErrorScreen: React.FC<ErrorScreenProps> = ({ error, onRetry }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
            <div className="max-w-md w-full space-y-6 text-center">
                <div className="flex justify-center">
                    <ExclamationTriangleIcon className="h-16 w-16 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">Oops! Something went wrong</h2>
                <p className="text-gray-300">{error}</p>
                <button
                    onClick={onRetry}
                    className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                    Try Again
                </button>
            </div>
        </div>
    );
};

export default ErrorScreen; 