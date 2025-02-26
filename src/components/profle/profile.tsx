import { Share, Settings, Link, Volume2, VolumeX, Play, X } from "lucide-react";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import BottomNavbar from "../Layout/ButtonNavar";
import { connect } from "react-redux";
import { RootState } from "../../store";
import { getUser } from "../../redux/actions/GetUser";
import { getUserMedia } from "../../redux/actions/GetUserMedia";
import { useEffect, useRef, useState } from "react";

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
}

interface VideoItem {
  id: string;
  video: string; // URL del video
  user_id?: { username: string; profile_picture: string };
  likes_count: number;
  comments_count: number;
  media_user?: object
}

function ProfileSeccion({ getUser, user, getUserMedia, media_user }: { getUser: () => void, user: User, getUserMedia:  () => void, media_user: VideoItem }) {
  const [isMuted, setIsMuted] = useState(true);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const data = {
    username: user && user.first_name,
    displayName: user && user.email,
    following: 35,
    followers: 33,
    likes: 303.2,
    description: "SOMOS UNA EMPRESA QUE GESTIONA SOFTWARE EMPRESARIALES GRATIS, SOLO PRUEBALO",
    websiteUrl: "youtube.com/channel/UCgeF...",
  };
  const userref = useRef(false)
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null)
  const mediaref = useRef(false)
  useEffect(() => {
    if (!userref.current) {
      getUser();
      userref.current = true
    }
  }, [getUser]);

  useEffect(() => {
    // if (!mediaref.current) {
      getUserMedia()
      mediaref.current = true
    // }
  }, [getUserMedia]);
  


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


  return (
    <>
    <div className="min-h-screen text-white p-4 max-w-2xl mx-auto   flex flex-col items-center  space-y-8 bg-gradient-to-r from-white-900 via-gray-800 to-gray-900  font-sans">
      <div className="flex flex-col items-center space-y-4">
        {/* Logo */}
        <div className="w-24 h-24 rounded-full text-center bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 flex items-center justify-center text-4xl font-bold">
          <img
            className="w-24 h-24 rounded-full text-center object-cover"
            src={`http://127.0.0.1:8000/${user && user.profile_picture}`}
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
            <div className="font-semibold">{data.followers}K</div>
            <div className="text-gray-400">Followers</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">{data.likes}K</div>
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
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50  rounded-lg hover:scale-105 transform transition duration-300 "
      
          onClick={closeFullScreen}
        >
          <div 
            className="relative w-full h-full max-w-4xl"
            style={{ height: "100vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-white p-2 rounded-full shadow-lg z-60"
              onClick={closeFullScreen}
            >
              X
            </button>
            <video
              ref={(el) => (videoRefs.current[0] = el)}
              autoPlay
              muted={isMuted}
              loop
              playsInline
              className="w-full h-full  object-cover"
              style={{ maxHeight: "100vh", maxWidth: "100vw"}}
              onError={(e) => console.error("Error al cargar el video en pantalla completa:", e)}
            >
              <source style={{height: '3009'}} src={`http://127.0.0.1:8000/${selectedVideo.video}`} type="video/mp4" />
              Tu navegador no soporta el formato de video.
            </video>
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