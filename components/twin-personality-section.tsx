"use client";

import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

interface TwinPersonalitySectionProps {
  twinId: string | number;
  twinPersonality: {
    summary?: string;
    interests?: string[];
    traits?: string[];
    style?: string;
  } | null | undefined;
  isOwner: boolean;
}

export function TwinPersonalitySection({ 
  twinId, 
  twinPersonality, 
  isOwner 
}: TwinPersonalitySectionProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Function to handle personality refresh
  const handleRefreshPersonality = async () => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    toast({
      title: "Refreshing personality...",
      description: "This may take a moment as we analyze your twin's data.",
    });
    
    try {
      const response = await fetch(`/api/twins/${twinId}/personality`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update personality');
      }
      
      toast({
        title: "Personality updated!",
        description: "Your twin's personality has been refreshed. Reload the page to see changes.",
        variant: "success",
      });
      
      // Reload the page to show updated personality
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Error updating personality:', error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // If there's no personality data, render a minimal card
  if (!twinPersonality || 
      (!twinPersonality.summary && 
       (!twinPersonality.interests || twinPersonality.interests.length === 0))) {
    return (
      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">About This Twin</CardTitle>
          {isOwner && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefreshPersonality}
              disabled={isUpdating}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
              Generate Personality
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No personality information available yet. 
            {isOwner ? " Click the button above to generate one." : ""}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">About This Twin</CardTitle>
        {isOwner && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshPersonality}
            disabled={isUpdating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {twinPersonality.summary && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">SUMMARY</p>
            <p>{twinPersonality.summary}</p>
          </div>
        )}
        
        {twinPersonality.interests && twinPersonality.interests.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">INTERESTS</p>
            <div className="flex flex-wrap gap-2">
              {twinPersonality.interests.map((interest, index) => (
                <span 
                  key={index} 
                  className="px-2 py-1 bg-gray-100 rounded-full text-xs"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {twinPersonality.traits && twinPersonality.traits.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">PERSONALITY TRAITS</p>
            <div className="flex flex-wrap gap-2">
              {twinPersonality.traits.map((trait, index) => (
                <span 
                  key={index} 
                  className="px-2 py-1 bg-gray-100 rounded-full text-xs"
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {twinPersonality.style && (
          <div>
            <p className="text-sm text-gray-600 mb-2">COMMUNICATION STYLE</p>
            <p>{twinPersonality.style}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 