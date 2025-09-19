import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YoutubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
}

interface YoutubePlaylist {
  title: string;
  description: string;
  channelTitle: string;
  videos: YoutubeVideo[];
}

function formatDuration(duration: string): string {
  // Convert ISO 8601 duration (PT4M13S) to readable format (4:13)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { playlistId } = await req.json();
    
    if (!playlistId) {
      throw new Error('Playlist ID is required');
    }

    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    if (!YOUTUBE_API_KEY) {
      throw new Error('YouTube API key not configured');
    }

    console.log(`Fetching playlist: ${playlistId}`);

    // Fetch playlist metadata
    const playlistResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${YOUTUBE_API_KEY}`
    );

    if (!playlistResponse.ok) {
      throw new Error(`Failed to fetch playlist: ${playlistResponse.statusText}`);
    }

    const playlistData = await playlistResponse.json();
    
    if (!playlistData.items || playlistData.items.length === 0) {
      throw new Error('Playlist not found or is private');
    }

    const playlist = playlistData.items[0].snippet;

    // Fetch playlist items (videos)
    const itemsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${YOUTUBE_API_KEY}`
    );

    if (!itemsResponse.ok) {
      throw new Error(`Failed to fetch playlist items: ${itemsResponse.statusText}`);
    }

    const itemsData = await itemsResponse.json();
    const videoIds = itemsData.items.map((item: any) => item.snippet.resourceId.videoId).join(',');

    // Fetch video details for durations
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`
    );

    if (!videosResponse.ok) {
      throw new Error(`Failed to fetch video details: ${videosResponse.statusText}`);
    }

    const videosData = await videosResponse.json();

    // Process videos
    const videos: YoutubeVideo[] = videosData.items.map((video: any) => ({
      id: video.id,
      title: video.snippet.title,
      thumbnail: video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url || '',
      duration: formatDuration(video.contentDetails.duration),
      description: video.snippet.description || '',
      channelTitle: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt
    }));

    const result: YoutubePlaylist = {
      title: playlist.title,
      description: playlist.description || '',
      channelTitle: playlist.channelTitle,
      videos
    };

    console.log(`Successfully fetched playlist with ${videos.length} videos`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-youtube-playlist function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});