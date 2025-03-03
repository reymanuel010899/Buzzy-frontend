import { Share, Settings, Link, Volume2, VolumeX, Play, X, Share2, Bookmark } from "lucide-react";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import BottomNavbar from "../Layout/ButtonNavar";
import { connect } from "react-redux";
import { RootState } from "../../store";
import { getUser } from "../../redux/actions/GetUser";
import { getUserMedia } from "../../redux/actions/GetUserMedia";
import { useEffect, useRef, useState } from "react";
import {  MessageCircle, Heart } from "lucide-react"
import { useParams } from "react-router-dom";

interface User {
  bio: string;
  birthdate: string | null;
  email: string;
  first_name: string;
  id: number;
  is_superuser: boolean;
  last_login: string | null;
  last_name: string;
  profile_picture: string;
  username: string;
  follower_all_acount: number | null;
  like_all_count: number;
}

interface VideoItem {
  id: string;
  video: string; // URL del video
  user_id?: { username: string; profile_picture: string };
  likes_count: number;
  comments_count: number;
  media_user?: object
}

function ProfileSeccion({ getUser, user, getUserMedia, media_user }: { getUser: (username: string) => void, user: User, getUserMedia:  (username: string) => void, media_user: VideoItem }) {
  const [isMuted, setIsMuted] = useState(true);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const data = {
    username: user && user.first_name,
    displayName: user && user.email,
    following: 35,
    likes: user?.like_all_count || 0,
    followers: user?.follower_all_acount || 0,
    description: "SOMOS UNA EMPRESA QUE GESTIONA SOFTWARE EMPRESARIALES GRATIS, SOLO PRUEBALO",
    websiteUrl: "youtube.com/channel/UCgeF...",
  };
  const userref = useRef(false)
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null)
  const [isLiked, setIsLiked] = useState(false) // Estado para manejar "like"
  const [isComment, setIsComment] = useState(false)
  const [isView, setIsView] = useState(false)
  const mediaref = useRef(false)
  const userParams = useParams()
  const {username} = userParams;

  useEffect(() => {
    if (!userref.current) {
      getUser(username || '');
      userref.current = true
    }
  }, [getUser, username]);

  useEffect(() => {
    if (!mediaref.current) {
      getUserMedia(username || '')
      mediaref.current = true
    }
  }, [getUserMedia, username]);
  
  useEffect(() => {
    if (isLiked) {
      setTimeout(() => {
        setIsLiked(true)
      }, 500)
    }
  }, [isLiked])

  useEffect(() => {
    if (isComment) {
      setTimeout(() => {
        setIsComment(true)
      }, 500)
    }
  }, [isComment])

  useEffect(() => {
    if (isView) {
      setTimeout(() => {
        setIsView(true)
      }, 500)
    }
  }, [isView])


  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            video.play();
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.5 }
    );

    videoRefs.current.forEach((video) => {
      if (video) observer.observe(video);
    });

    return () => {
      videoRefs.current.forEach((video) => {
        if (video) observer.unobserve(video);
      });
    };
  }, [media_user]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };
  const handleVideoClick = (video: VideoItem) => {
    console.log(video)
    setSelectedVideo(video);
  };

  const closeFullScreen = () => {
    setSelectedVideo(null);
    if (videoRefs.current[0]) {
      videoRefs.current[0].pause(); // Pausar el video al cerrar
    }
  };

  const handleLikeClick = (videoId: string) => {
    setIsLiked((prev) => !prev)
    console.log(`Se hizo click en "Like" del video con ID: ${videoId}`)
  }

  const handleCommentClick = (videoId: string) => {
    setIsComment(true)
    console.log(`Se hizo click en "Comentario" del video con ID: ${videoId}`)
  }

  // const handleViewClick = (videoId: string) => {
  //   setIsView(true)
  //   console.log(`Se hizo click en "Vista" del video con ID: ${videoId}`)
  // }


  return (
    <>
    <div className="min-h-screen text-white p-4 max-w-2xl mx-auto   flex flex-col items-center  space-y-8 bg-gradient-to-r from-white-900 via-gray-800 to-gray-900  font-sans">
      <div className="flex flex-col items-center space-y-4">
        {/* Logo */}
        <div className="w-24 h-24 rounded-full text-center bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 flex items-center justify-center text-4xl font-bold">
          <img
            className="w-24 h-24 rounded-full text-center object-cover"
            src={`http://127.0.0.1:8000${user&&user.profile_picture ? user.profile_picture : 'profile_pics/avatar.webp'  }`}
            alt=""
          />
        </div>

        {/* Profile Info */}
        <div className="text-center">
          <h1 className="text-xl font-semibold">{data.username}</h1>
          <p className="text-gray-400">{data.displayName}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="rounded-full">
            <Share className="h-45 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full">
            <Link className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-6 text-sm">
          <div className="text-center">
            <div className="font-semibold">{data.following}</div>
            <div className="text-gray-400">Following</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">{data.followers}</div>
            <div className="text-gray-400">Followers</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">{data.likes}</div>
            <div className="text-gray-400">Likes</div>
          </div>
        </div>

        {/* Description */}
        <div className="text-center max-w-sm">
          <p className="text-sm">{data.description}</p>
          <a href={`https://${data.websiteUrl}`} className="text-red-500 text-sm mt-2 block">
            {data.websiteUrl}
          </a>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="latest" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-900">
            <TabsTrigger value="latest">Latest</TabsTrigger>
            <TabsTrigger value="popular">Popular</TabsTrigger>
            <TabsTrigger value="oldest">Oldest</TabsTrigger>
          </TabsList>
          <TabsContent value="latest" className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* {media_user&&media_user.map((video, index) => (
                
              ))} */}

            {(media_user&&media_user) ? (
              media_user.map((video, index) => (
                <div key={video.id} className="relative group" style={{ height: "300px" }} onClick={() => handleVideoClick(video)}>
                    {/* Botón de mute */}
                    <button
                      className="absolute top-2 right-2 bg-gray-800 text-white p-2 rounded-full shadow-lg z-50"
                      onClick={toggleMute}
                    >
                      {isMuted ? <VolumeX size={10} /> : <Volume2 size={10} />}
                    </button>

                    {/* Gradiente y video */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent">
                      <video
                        ref={(el) => (videoRefs.current[index] = el)}
                        autoPlay
                        muted={isMuted}
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                      >
                        <source src={`http://127.0.0.1:8000/${video.video}`} type="video/mp4" />
                        Tu navegador no soporta el formato de video.
                      </video>
                    </div>

                    {/* Información del video */}
                    <div className="absolute bottom-0 w-full p-2 bg-opacity-70">
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 text-sm">
                      <Play className="h-4 w-4" />
                      <span>{video.view_acount || 0}</span>
                      </div> 
                      <div className="flex justify-between mt-2">
                        
                      </div>
                    </div>
                  </div>
              ))
            ) : (
              <p>No hay videos disponibles</p>  // Mensaje fallback
            )}
            </div>
          </TabsContent>
          <TabsContent value="popular">
            <div className="text-center text-gray-400 py-8">Popular content</div>
          </TabsContent>
          <TabsContent value="oldest">
            <div className="text-center text-gray-400 py-8">Oldest content</div>
          </TabsContent>
        </Tabs>
      </div>
      
     
      <BottomNavbar />
    </div>
    {selectedVideo && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50" onClick={closeFullScreen}>
          <div
            className="relative w-full h-full max-w-4xl"
            style={{ height: "100vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all duration-300 z-50"
              onClick={closeFullScreen}
            >
              <X className="w-6 h-6" />
            </button>

            {/* Video */}
            <video
              ref={(el) => (videoRefs.current[0] = el)}
              autoPlay
              muted={isMuted}
              loop
              playsInline
              className="w-full h-full object-cover"
              style={{ maxHeight: "100vh", maxWidth: "100vw" }}
              onError={(e) => console.error("Error al cargar el video en pantalla completa:", e)}
            >
              <source src={`http://127.0.0.1:8000/${selectedVideo.video}`} type="video/mp4" />
              Tu navegador no soporta el formato de video.
            </video>

            {/* Interaction buttons */}
            <div className="absolute right-4 bottom-10 flex flex-col items-center gap-6">
              {/* Profile */}
              <div className="flex flex-col items-center gap-1">
                <button className="w-12 h-12 rounded-full overflow-hidden border-2 border-white hover:border-purple-400 transition-colors">
                  <img
                    src={`http://127.0.0.1:8000/${selectedVideo.user_id?.profile_picture}`}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </button>
                <span className="text-white text-xs">+</span>
              </div>

              {/* Like */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleLikeClick(selectedVideo.id)
                  }}
                  className="p-3 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm transition-all duration-300"
                >
                  <Heart className={`w-6 h-6 ${isLiked ? "fill-red-500 text-red-500" : "text-white"}`} />
                </button>
                <span className="text-white text-xs">{selectedVideo.likes_count || 0}</span>
              </div>

              {/* Comment */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCommentClick(selectedVideo.id)
                  }}
                  className="p-3 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm transition-all duration-300"
                >
                  <MessageCircle className="w-6 h-6 text-white" />
                </button>
                <span className="text-white text-xs">{selectedVideo.comments_count || 0}</span>
              </div>

              {/* Bookmark */}
              <div className="flex flex-col items-center gap-1">
                <button
                  className="p-3 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm transition-all duration-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Bookmark className="w-6 h-6 text-white" />
                </button>
                <span className="text-white text-xs">54K</span>
              </div>

              {/* Share */}
              <div className="flex flex-col items-center gap-1">
                <button
                  className="p-3 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm transition-all duration-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Share2 className="w-6 h-6 text-white" />
                </button>
                <span className="text-white text-xs">81.5K</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const mapStateToProps = (state: RootState) => ({
  media_user: state.getMediaByUser.media_user,
  user: state.getUserDetail.user,
});

export default connect(mapStateToProps, { getUser, getUserMedia})(ProfileSeccion);