import BottomNavbar from '../Layout/ButtonNavar';
import { Link, useNavigate } from 'react-router-dom';
import Categories from './categoria';
import { Video as VideoPro } from './main.interface';
import { Eye, MessageCircle, Heart, Volume2, VolumeX } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';
import { getMeta } from '../../redux/actions/getMeta';
import { useDispatch } from 'react-redux';
// interface Location {
//     latitude: number;
//     longitude: number;
// }

interface StreamingUIProps {
    media: VideoPro[] | null;
}

const StreamingUI = ({ media }: StreamingUIProps) => {
    const dispatch = useDispatch()
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 500);
    const [isLiked, setIsLiked] = useState(false);
    const [isComment, setIsComment] = useState(false);
    const [isView, setIsView] = useState(false);
    // const [locations, setLocations] = useState<Record<number, Location | null>>({});
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
    const navigate = useNavigate();

    // Cargar Google Maps
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: 'TU_API_KEY_DE_GOOGLE_MAPS', // Reemplaza con tu clave de API de Google Maps
    });

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 500);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
    }, []);

    useEffect(() => {
        if (isLiked) {
            setTimeout(() => setIsLiked(true), 500);
        }
    }, [isLiked]);

    useEffect(() => {
        if (isComment) {
            setTimeout(() => setIsComment(true), 500);
        }
    }, [isComment]);

    useEffect(() => {
        if (isView) {
            setTimeout(() => setIsView(true), 500);
        }
    }, [isView]);

   
    // Manejar clic en el video para mostrar el mapa
    const handleVideoClick = (index: number) => {
        const video = media?.[index];
        if (!video) {
            alert('No se encontró el video.');
            return;
        }
        if (video?.latitude && video?.longitude && isLoaded) {
            navigate('/map', {
              state: {
                latitude: video.latitude,
                longitude: video.longitude,
              },
            });
            return;
        }
        
          
        const fordata = {
            id: video.id,
            category: video.category,
            created_at: "2025-02-11T20:11:07.700796Z",
            description: video.description,
            thumbnail_url: video.thumbnail_url,
            user_id: {
                email: video.user_id.email, 
                username: video.user_id.username,
                profile_picture: video.user_id.profile_picture
            },
            video: video.video,
            video_url: video.video_url,
          };
          
        // const formData = new FormData();
        // formData.append('video_url', video.video_url || ''); // Usa video_url si está disponible
        // formData.append('video', video.video || ''); // Usa la ruta del archivo si es un FileField o URL
        // formData.append('user_id', '1'); // Ajusta según tu autenticación (puedes obtenerlo del contexto)
        // formData.append('duration', video.duration.toString()); // Usa la duración del video
        // formData.append('category', video.category?.toString() || ''); // Opcional, ID de la categoría (si es un número)
        // formData.append('thumbnail_url', video.thumbnail_url || ''); // Opcional
        // formData.append('description', video.description || ''); 
        // formData.append('tags', JSON.stringify(video.tags || [])); 
        console.log(video)
        getMeta(fordata)(dispatch)
    };

    const handleLikeClick = (videoId: string) => {
        setIsLiked((prev) => !prev);
        console.log(`Se hizo click en "Like" del video con ID: ${videoId}`);
    };

    const handleCommentClick = (videoId: string) => {
        setIsComment(true);
        console.log(`Se hizo click en "Comentario" del video con ID: ${videoId}`);
    };

    const handleViewClick = (videoId: string) => {
        setIsView(true);
        console.log(`Se hizo click en "Vista" del video con ID: ${videoId}`);
    };

    const [isMuted, setIsMuted] = useState(true);

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    console.log(media)
    return (
        <div className="bg-gradient-to-r from-white-900 via-gray-800 to-gray-900 text-white min-h-screen font-sans">
            <main className="pt-24 p-1">
                <section className="relative w-full h-[400px] flex items-center justify-center text-center mb-8">
                    <div className="relative w-full h-full bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-2xl overflow-hidden">
                        <div className="absolute inset-0 flex flex-col justify-center items-center px-4 backdrop-blur-sm">
                            <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-6">
                                Iniciar transmisión en vivo
                            </h2>
                            <Link
                                to="/lives"
                                className="px-8 py-3 bg-purple-600 rounded-full text-lg font-medium shadow-xl hover:bg-purple-700 transition-all duration-300 hover:scale-105"
                            >
                                Start
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="mt-10">
                    <h3 className="text-3xl font-semibold text-center mb-6">Trending Series</h3>
                    <Categories />
                    <div className="grid grid-cols-1 pt-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {media?.map((data, index) => (
                            <div
                                key={index}
                                className="relative p-4 rounded-lg hover:scale-105 transform transition duration-300 flex flex-col items-center"
                                style={{
                                    height: isMobile ? '800px' : '800px',
                                    overflow: 'hidden',
                                    zIndex: 1,
                                }}
                            >
                                <button
                                    className="absolute top-2 right-2 bg-gray-800 text-white p-2 rounded-full shadow-lg z-50"
                                    onClick={toggleMute}
                                >
                                    {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                                </button>
                                <div
                                    className="absolute inset-0 bg-gradient-to-t from-black to-transparent cursor-pointer"
                                    onClick={() => handleVideoClick(index)}
                                >
                                    <video
                                        ref={(el) => (videoRefs.current[index] = el)}
                                        autoPlay
                                        muted={isMuted}
                                        loop
                                        playsInline
                                        className="w-full h-[800px] object-cover"
                                    >
                                        <source src={data.video} type="video/mp4" />
                                        Tu navegador no soporta el formato de video.
                                    </video>
                                </div>

                                <div className="w-full mt-auto bg-opacity-70 z-80">
                                    <div className="pb-10">
                                        <div className="flex items-center space-x-3">
                                            <button className="text-white">
                                                <img
                                                    className="w-8 h-8 rounded-full object-cover"
                                                    src={`${data.user_id?.profile_picture ? data.user_id.profile_picture : 'http://localhost:8000/media/profile_pics/avatar.webp'}`}
                                                    alt=""
                                                />
                                            </button>
                                            <Link className="text-white border-white" to={`/profile/${data.user_id?.username}`}>
                                                {data.user_id?.username}
                                            </Link>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between w-full px-2">
                                        <div
                                            className="flex flex-col items-center text-red-500 transition-all duration-500 cursor-pointer"
                                            onClick={() => handleViewClick('1')}
                                        >
                                            <Eye className={`transition-all duration-500 ${isView ? 'w-8 h-8 fill-current' : 'w-7 h-7'} text-white`} />
                                            <span className="text-white text-sm w-full text-center mt-1">{data.view_acount || 0}</span>
                                        </div>
                                        <div
                                            className="flex flex-col items-center text-red-500 transition-all duration-500 cursor-pointer"
                                            onClick={() => handleCommentClick('1')}
                                        >
                                            <MessageCircle
                                                className={`transition-all duration-500 ${isComment ? 'w-8 h-8 fill-current' : 'w-7 h-7'} text-white`}
                                            />
                                            <span className="text-white text-sm w-full text-center mt-1">{data.comments_count || 0}</span>
                                        </div>
                                        <div
                                            className="flex flex-col items-center text-red-500 transition-all duration-500 cursor-pointer"
                                            onClick={() => handleLikeClick('1')}
                                        >
                                            <Heart
                                                className={`transition-all duration-500 ${isLiked ? 'w-8 h-8 fill-current' : 'w-7 h-7'} ${isLiked ? 'text-red-500' : 'text-white'}`}
                                            />
                                            <span className="text-white text-sm w-full text-center mt-1">{data.like_count || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
            <BottomNavbar />
        </div>
    );
};

// Componente para la pantalla del mapa (nueva ruta)
export const MapScreen = () => {
    const navigate = useNavigate();
    const location = navigate.location.state as { latitude: number; longitude: number } | null;

    if (!location) {
        return <div>No se encontraron datos de ubicación.</div>;
    }

    return (
        <div className="w-full h-screen">
            {isLoaded ? (
                <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={{ lat: location.latitude, lng: location.longitude }}
                    zoom={15}
                >
                    <Marker position={{ lat: location.latitude, lng: location.longitude }} />
                </GoogleMap>
            ) : (
                <div>Cargando mapa...</div>
            )}
        </div>
    );
};

export default StreamingUI;