'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TwinEmotionalAnalysisProps {
    twinPersonality: {
        conversationPatterns?: { topic: string; frequency: number }[];
        topicPreferences?: { pattern: string; frequency: number }[];
        responseStyles?: { type: string; frequency: number }[];
    } | null | undefined;
    messageCount?: number;
}

export function TwinEmotionalAnalysis({ twinPersonality, messageCount = 0 }: TwinEmotionalAnalysisProps) {
    // Require at least 6 messages before showing any analysis
    const shouldShowAnalysis = messageCount >= 6;

    // If there's no analysis data or not enough messages, render a minimal message
    if (!shouldShowAnalysis ||
        !twinPersonality ||
        (!twinPersonality.conversationPatterns?.length &&
            !twinPersonality.topicPreferences?.length &&
            !twinPersonality.responseStyles?.length)) {
        return (
            <div>
                <h4 className="text-lg font-semibold text-purple-300 mb-4">
                    Conversation Analysis
                </h4>
                <div className="bg-gray-700/80 p-4 rounded-lg border border-gray-600 text-gray-300 text-center">
                    {messageCount < 6
                        ? `Conversation analysis will be available after more messages (${messageCount}/6 messages).`
                        : "No analysis available yet. Continue chatting to generate insights."}
                </div>
            </div>
        );
    }

    // Function to render confidence level based on message count and observation frequency
    const getConfidenceTag = (frequency: number) => {
        if (frequency >= 3) {
            return <span className="ml-2 px-2 py-0.5 bg-gray-700/80 text-green-300 text-xs rounded-full border border-gray-600">Observed Multiple Times</span>;
        } else if (frequency === 2) {
            return <span className="ml-2 px-2 py-0.5 bg-gray-700/80 text-yellow-300 text-xs rounded-full border border-gray-600">Observed Twice</span>;
        } else {
            return <span className="ml-2 px-2 py-0.5 bg-gray-700/80 text-orange-300 text-xs rounded-full border border-gray-600">Observed Once</span>;
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold text-purple-300">
                    Conversation Analysis
                </h4>
                <div className="text-sm text-gray-400">Based on {messageCount} messages</div>
            </div>

            {/* Show a disclaimer about the analysis */}
            <div className="mb-4 bg-gray-700/80 p-3 rounded-lg border border-gray-600 text-amber-300 text-sm">
                This analysis is based on our conversation patterns and may update as we chat more.
            </div>

            <div className="space-y-4">
                {twinPersonality.conversationPatterns && twinPersonality.conversationPatterns.length > 0 && (
                    <div>
                        <h5 className="font-medium text-gray-300 mb-2">Topics We Often Discuss</h5>
                        <div className="space-y-2">
                            {twinPersonality.conversationPatterns.map((pattern, index) => (
                                <div key={index} className="bg-gray-700/80 p-3 rounded-lg border border-gray-600 text-white flex items-center justify-between">
                                    <span>{pattern.topic}</span>
                                    {getConfidenceTag(pattern.frequency)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {twinPersonality.topicPreferences && twinPersonality.topicPreferences.length > 0 && (
                    <div>
                        <h5 className="font-medium text-gray-300 mb-2">Response Length Patterns</h5>
                        <div className="space-y-2">
                            {twinPersonality.topicPreferences.map((pref, index) => (
                                <div key={index} className="bg-gray-700/80 p-3 rounded-lg border border-gray-600 text-white flex items-center justify-between">
                                    <span>{pref.pattern}</span>
                                    {getConfidenceTag(pref.frequency)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {twinPersonality.responseStyles && twinPersonality.responseStyles.length > 0 && (
                    <div>
                        <h5 className="font-medium text-gray-300 mb-2">Common Response Types</h5>
                        <div className="space-y-2">
                            {twinPersonality.responseStyles.map((style, index) => (
                                <div key={index} className="bg-gray-700/80 p-3 rounded-lg border border-gray-600 text-white flex items-center justify-between">
                                    <span>{style.type}</span>
                                    {getConfidenceTag(style.frequency)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 