"use client";

import React, { useState } from 'react';
import { FaFilm, FaMusic, FaStar, FaSpotify } from 'react-icons/fa';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TwinMediaSectionProps {
  twinId: string | number;
  letterboxdData: any;
  spotifyData: any;
  letterboxdUrl?: string;
  spotifyUrl?: string;
  isOwner: boolean;
  onUpdateLetterboxd: () => void;
  onConnectSpotify: () => void;
  isMobile?: boolean;
}

// Helper function to normalize ratings to stars
function getRatingStars(rating: number): string {
  if (isNaN(rating)) return 'Not rated';
  
  // Letterboxd uses a 0-10 scale (0.5 to 5 stars)
  // Make sure rating is between 0 and 5
  const normalizedRating = Math.min(Math.max(Math.round(rating), 0), 5);
  return '★'.repeat(normalizedRating) + '☆'.repeat(Math.max(0, 5 - normalizedRating));
}

export function TwinMediaSection({
  twinId,
  letterboxdData,
  spotifyData,
  letterboxdUrl,
  spotifyUrl,
  isOwner,
  onUpdateLetterboxd,
  onConnectSpotify,
  isMobile = false
}: TwinMediaSectionProps) {
  const [showLetterboxd, setShowLetterboxd] = useState(!isMobile);
  const [showSpotify, setShowSpotify] = useState(!isMobile);

  return (
    <div className="space-y-4">
      {/* Letterboxd Section */}
      {isMobile && (
        <div className="md:hidden mb-1.5">
          <button 
            onClick={() => setShowLetterboxd(!showLetterboxd)} 
            className="w-full text-left flex justify-between items-center p-1.5 bg-blue-50 rounded-md"
          >
            <span className="flex items-center">
              <FaFilm className="text-indigo-600 mr-2" size={14} />
              <span className="text-sm font-medium">Movie Preferences</span>
            </span>
            <span>{showLetterboxd ? '▲' : '▼'}</span>
          </button>
        </div>
      )}

      {/* Display letterboxd data if available */}
      {(!isMobile || showLetterboxd) && (
        <Card className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center">
              <FaFilm className="text-indigo-600 mr-2" />
              <CardTitle className="text-lg">Movie Preferences</CardTitle>
            </div>
            {isOwner && letterboxdData?.status === 'success' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onUpdateLetterboxd}
                className="text-blue-600 hover:text-blue-800"
              >
                Update
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {letterboxdData?.status === 'success' ? (
              <div>
                {/* Favorite films */}
                {letterboxdData.favoriteFilms?.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Top Films</h5>
                    <div className="flex flex-wrap gap-1.5">
                      {letterboxdData.favoriteFilms.map((film: string, i: number) => (
                        <span key={i} className="bg-indigo-100 text-indigo-900 text-xs px-2.5 py-1 rounded-full flex items-center font-medium">
                          <FaStar className="text-yellow-500 mr-1 text-xs" /> {film}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Favorite genres */}
                {letterboxdData.favoriteGenres?.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Favorite Genres</h5>
                    <div className="flex flex-wrap gap-1.5">
                      {letterboxdData.favoriteGenres.map((genre: string, i: number) => (
                        <span key={i} className="bg-blue-100 text-blue-900 text-xs px-2.5 py-1 rounded-full font-medium">
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Recent ratings */}
                {letterboxdData.recentRatings?.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Recent Ratings</h5>
                    <div className="text-xs grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-2 rounded-md">
                      {letterboxdData.recentRatings.slice(0, 6).map((rating: any, i: number) => (
                        <div key={i} className="flex items-center justify-between border-b border-gray-100 pb-1.5 pt-1">
                          <span className="truncate mr-2 font-medium">{rating.title}</span>
                          <span className="flex-shrink-0 bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                            {getRatingStars(parseFloat(rating.rating))}
                          </span>
                        </div>
                      ))}
                    </div>
                    {letterboxdUrl && (
                      <div className="mt-3 text-center">
                        <a 
                          href={letterboxdUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-block text-xs text-white bg-green-600 hover:bg-green-700 px-4 py-1.5 rounded-full transition-colors"
                        >
                          View full profile on Letterboxd
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-gray-700 mb-3">Connect your Letterboxd account to enhance your twin with your movie preferences.</p>
                {isOwner && (
                  <Button 
                    onClick={onUpdateLetterboxd}
                    className="w-full md:w-auto bg-indigo-600 text-white"
                  >
                    <FaFilm className="mr-2" /> Connect Letterboxd
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Spotify Section */}
      {isMobile && (
        <div className="md:hidden mb-1.5">
          <button 
            onClick={() => setShowSpotify(!showSpotify)} 
            className="w-full text-left flex justify-between items-center p-1.5 bg-green-50 rounded-md"
          >
            <span className="flex items-center">
              <FaMusic className="text-green-600 mr-2" size={14} />
              <span className="text-sm font-medium">Music Preferences</span>
            </span>
            <span>{showSpotify ? '▲' : '▼'}</span>
          </button>
        </div>
      )}

      {/* Display Spotify data if available */}
      {(!isMobile || showSpotify) && (
        <Card className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center">
              <FaMusic className="text-green-600 mr-2" />
              <CardTitle className="text-lg">Music Preferences</CardTitle>
            </div>
            {isOwner && spotifyData?.status === 'success' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onConnectSpotify}
                className="text-green-600 hover:text-green-800"
              >
                Reconnect
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {spotifyData?.status === 'success' ? (
              <div>
                {/* Top Artists */}
                {spotifyData.topArtists?.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Top Artists</h5>
                    <div className="flex flex-wrap gap-1.5">
                      {spotifyData.topArtists.map((artist: string, i: number) => (
                        <span key={i} className="bg-green-100 text-green-900 text-xs px-2.5 py-1 rounded-full flex items-center font-medium">
                          <FaStar className="text-yellow-500 mr-1 text-xs" /> {artist}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Favorite Genres */}
                {spotifyData.topGenres?.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Music Genres</h5>
                    <div className="flex flex-wrap gap-1.5">
                      {spotifyData.topGenres.map((genre: string, i: number) => (
                        <span key={i} className="bg-emerald-100 text-emerald-900 text-xs px-2.5 py-1 rounded-full font-medium">
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Recent Tracks */}
                {spotifyData.recentTracks?.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Recently Played</h5>
                    <div className="text-xs grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-2 rounded-md">
                      {spotifyData.recentTracks.slice(0, 6).map((track: any, i: number) => (
                        <div key={i} className="flex items-center justify-between border-b border-gray-100 pb-1.5 pt-1">
                          <div className="truncate mr-2">
                            <div className="font-medium">{track.name}</div>
                            <div className="text-gray-900 text-xs font-medium">{track.artist}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {spotifyUrl && (
                      <div className="mt-3 text-center">
                        <a 
                          href={spotifyUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-block text-xs text-white bg-green-600 hover:bg-green-700 px-4 py-1.5 rounded-full transition-colors"
                        >
                          <div className="flex items-center">
                            <FaSpotify className="mr-1" /> View Spotify Profile
                          </div>
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-gray-700 mb-3">Connect your Spotify account to enhance your twin with your music preferences.</p>
                {isOwner && (
                  <div className="flex justify-center">
                    <Button 
                      onClick={onConnectSpotify}
                      className="bg-green-600 text-white"
                    >
                      <FaSpotify className="mr-2" /> Connect Spotify
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 