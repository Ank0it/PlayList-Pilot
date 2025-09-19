import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, SkipForward, SkipBack, Search, Clock, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
}

interface PlaylistData {
  title: string;
  description: string;
  channelTitle: string;
  videos: Video[];
}

interface WatchProgress {
  videoId: string;
  currentTime: number;
  duration: number;
  completed: boolean;
}

const PlaylistViewer = () => {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<Record<string, WatchProgress>>({});
  const { toast } = useToast();

  // Load progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('youtube-playlist-progress');
    if (savedProgress) {
      setProgress(JSON.parse(savedProgress));
    }
  }, []);

  // Save progress to localStorage
  useEffect(() => {
    localStorage.setItem('youtube-playlist-progress', JSON.stringify(progress));
  }, [progress]);

  const extractPlaylistId = (url: string) => {
    const regex = /[?&]list=([^#&?]*)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const mockPlaylistData: PlaylistData = {
    title: "Sample Programming Playlist",
    description: "Learn programming fundamentals with this comprehensive playlist",
    channelTitle: "Code Academy",
    videos: [
      {
        id: "dQw4w9WgXcQ",
        title: "Introduction to JavaScript - Complete Beginner Tutorial",
        thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
        duration: "45:23",
        description: "Learn JavaScript basics in this comprehensive tutorial",
        channelTitle: "Code Academy",
        publishedAt: "2024-01-15"
      },
      {
        id: "9bZkp7q19f0",
        title: "React Hooks Explained - useState, useEffect, and More",
        thumbnail: "https://i.ytimg.com/vi/9bZkp7q19f0/maxresdefault.jpg",
        duration: "32:17",
        description: "Master React Hooks with practical examples",
        channelTitle: "Code Academy",
        publishedAt: "2024-01-20"
      },
      {
        id: "Ke90Tje7VS0",
        title: "CSS Grid & Flexbox - Modern Layout Techniques",
        thumbnail: "https://i.ytimg.com/vi/Ke90Tje7VS0/maxresdefault.jpg",
        duration: "28:45",
        description: "Build responsive layouts with CSS Grid and Flexbox",
        channelTitle: "Code Academy",
        publishedAt: "2024-01-25"
      },
      {
        id: "fJeHlvw7O4s",
        title: "Node.js Backend Development - REST API Tutorial",
        thumbnail: "https://i.ytimg.com/vi/fJeHlvw7O4s/maxresdefault.jpg",
        duration: "52:30",
        description: "Build a complete REST API with Node.js and Express",
        channelTitle: "Code Academy",
        publishedAt: "2024-02-01"
      }
    ]
  };

  const handleFetchPlaylist = async () => {
    if (!playlistUrl.trim()) {
      toast({
        title: "Please enter a playlist URL",
        description: "Paste a YouTube playlist URL to get started",
        variant: "destructive"
      });
      return;
    }

    const playlistId = extractPlaylistId(playlistUrl);
    if (!playlistId) {
      toast({
        title: "Invalid playlist URL",
        description: "Please enter a valid YouTube playlist URL",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('fetch-youtube-playlist', {
        body: { playlistId }
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch playlist');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setPlaylist(data);
      setCurrentVideoIndex(0); // Reset to first video
      
      toast({
        title: "Playlist loaded successfully!",
        description: `Found ${data.videos.length} videos`
      });
    } catch (error) {
      console.error('Error fetching playlist:', error);
      toast({
        title: "Failed to load playlist",
        description: error instanceof Error ? error.message : "Please check the URL and try again",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getVideoProgress = (videoId: string) => {
    return progress[videoId] || { videoId, currentTime: 0, duration: 0, completed: false };
  };

  const getPlaylistProgress = () => {
    if (!playlist) return 0;
    const completedVideos = playlist.videos.filter(video => 
      getVideoProgress(video.id).completed
    ).length;
    return (completedVideos / playlist.videos.length) * 100;
  };

  const formatDuration = (duration: string) => {
    return duration;
  };

  const selectVideo = (index: number) => {
    setCurrentVideoIndex(index);
  };

  const markVideoAsCompleted = (videoId: string) => {
    setProgress(prev => ({
      ...prev,
      [videoId]: {
        ...prev[videoId],
        videoId,
        currentTime: 0,
        duration: 0,
        completed: true
      }
    }));
  };

  const toggleVideoCompletion = (videoId: string) => {
    setProgress(prev => {
      const currentProgress = prev[videoId] || { videoId, currentTime: 0, duration: 0, completed: false };
      return {
        ...prev,
        [videoId]: {
          ...currentProgress,
          completed: !currentProgress.completed
        }
      };
    });
  };

  const nextVideo = () => {
    if (playlist && currentVideoIndex < playlist.videos.length - 1) {
      // Mark current video as completed when moving to next
      markVideoAsCompleted(playlist.videos[currentVideoIndex].id);
      setCurrentVideoIndex(currentVideoIndex + 1);
    }
  };

  const previousVideo = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
    }
  };

  if (!playlist) {
    return (
      <div className="min-h-screen bg-gradient-hero p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
              YouTube Playlist Viewer
            </h1>
            <p className="text-xl text-muted-foreground">
              Track your progress and enjoy seamless playlist viewing
            </p>
          </div>

          <Card className="bg-gradient-card border-border shadow-card p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <Search className="h-6 w-6 text-accent" />
                <h2 className="text-2xl font-semibold">Enter Playlist URL</h2>
              </div>
              
              <div className="flex gap-3">
                <Input
                  placeholder="https://www.youtube.com/playlist?list=..."
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  className="text-lg py-3 bg-secondary border-border"
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchPlaylist()}
                />
                <Button 
                  onClick={handleFetchPlaylist}
                  disabled={isLoading}
                  className="px-8 py-3 text-lg bg-gradient-primary hover:shadow-glow transition-smooth"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                      Loading...
                    </>
                  ) : (
                    'Load Playlist'
                  )}
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>• Paste any YouTube playlist URL</p>
                <p>• Track your viewing progress automatically</p>
                <p>• Resume where you left off</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const currentVideo = playlist.videos[currentVideoIndex];

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Sidebar - Playlist */}
        <div className="w-96 bg-gradient-card border-r border-border overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold mb-2 line-clamp-2">{playlist.title}</h2>
            <p className="text-sm text-muted-foreground mb-3">{playlist.channelTitle}</p>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="text-accent font-medium">{Math.round(getPlaylistProgress())}%</span>
              </div>
              <Progress value={getPlaylistProgress()} className="h-2" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-3">
              {playlist.videos.map((video, index) => {
                const videoProgress = getVideoProgress(video.id);
                const isActive = index === currentVideoIndex;
                
                return (
                  <Card
                    key={video.id}
                    className={`cursor-pointer transition-smooth hover:bg-video-card-hover ${
                      isActive ? 'bg-accent/10 border-accent' : 'bg-video-card border-border'
                    }`}
                    onClick={() => selectVideo(index)}
                  >
                    <div className="p-4">
                      <div className="flex gap-3">
                        <div className="relative flex-shrink-0">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-24 h-16 object-cover rounded"
                          />
                          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                            {formatDuration(video.duration)}
                          </div>
                          {videoProgress.completed && (
                            <div className="absolute top-1 left-1 bg-progress-watched text-white text-xs px-1 rounded">
                              ✓
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-medium line-clamp-2 text-sm ${
                            isActive ? 'text-accent' : 'text-foreground'
                          }`}>
                            {video.title}
                          </h3>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{formatDuration(video.duration)}</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleVideoCompletion(video.id);
                              }}
                              className={`text-xs px-2 py-1 rounded transition-colors ${
                                videoProgress.completed 
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {videoProgress.completed ? '✓ Done' : 'Mark Done'}
                            </button>
                          </div>
                          
                          {videoProgress.currentTime > 0 && !videoProgress.completed && (
                            <div className="mt-2">
                              <Progress 
                                value={(videoProgress.currentTime / videoProgress.duration) * 100} 
                                className="h-1" 
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content - Video Player */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 bg-black relative">
            <div className="aspect-video w-full h-full flex items-center justify-center">
              <iframe
                src={`https://www.youtube.com/embed/${currentVideo.id}?autoplay=1&rel=0`}
                className="w-full h-full"
                frameBorder="0"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={currentVideo.title}
              />
            </div>
          </div>

            <div className="p-6 bg-gradient-card border-t border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold mb-2 line-clamp-2">{currentVideo.title}</h1>
                <p className="text-muted-foreground">{currentVideo.channelTitle}</p>
              </div>
              
              <div className="flex items-center gap-3 ml-6">
                <Button
                  variant="outline"
                  onClick={() => toggleVideoCompletion(currentVideo.id)}
                  className={getVideoProgress(currentVideo.id).completed ? 'bg-green-100 text-green-700' : ''}
                >
                  {getVideoProgress(currentVideo.id).completed ? '✓ Completed' : 'Mark as Done'}
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={previousVideo}
                  disabled={currentVideoIndex === 0}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={nextVideo}
                  disabled={currentVideoIndex === playlist.videos.length - 1}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Video {currentVideoIndex + 1} of {playlist.videos.length}</span>
              <span className="flex items-center gap-1">
                <List className="h-4 w-4" />
                {playlist.title}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaylistViewer;