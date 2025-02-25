import { FaSpotify } from 'react-icons/fa';

interface SpotifyConnectButtonProps {
  userId: number;
  spotifyData?: {
    status: 'success' | 'error' | 'not_provided';
  };
}

export default function SpotifyConnectButton({ userId, spotifyData }: SpotifyConnectButtonProps) {
  // Don't show the button if Spotify data is already successfully connected
  if (spotifyData?.status === 'success') {
    return null;
  }
  
  return (
    <a 
      href={`/api/auth/spotify?userId=${userId}`}
      className="flex items-center justify-center py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors text-sm font-medium shadow-md"
    >
      <FaSpotify className="mr-2" size={18} />
      {spotifyData?.status === 'error' ? 'Reconnect Spotify' : 'Connect Spotify'}
    </a>
  );
} 