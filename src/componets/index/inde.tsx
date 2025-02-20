import BottomNavbar from '../Layout/ButtonNavar';
import { Link } from 'react-router-dom';
import Categories from './categoria';
import { Video  as VideoPro} from './main.interface';
import { Eye, MessageCircle, Heart, Volume2, VolumeX } from 'lucide-react'; 
import { useState, useEffect } from 'react';
interface StreamingUIProps {
    media: VideoPro[] | null;
}

const StreamingUI = ({ media }: StreamingUIProps) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 500);
    const [isLiked, setIsLiked] = useState(false);  // Estado para manejar "like"
    const [isComment, setIsComment] = useState(false);
    const [isView, setIsView] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 500);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (isLiked) {
            setTimeout(() => {
                setIsLiked(true);
            }, 500);
        }
    }, [isLiked]);

    useEffect(() => {
        if (isComment) {
            setTimeout(() => {
                setIsComment(true);
            }, 500);
        }
    }, [isComment]);

    useEffect(() => {
        if (isView) {
            setTimeout(() => {
                setIsView(true);
            }, 500);
        }
    }, [isView]);

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
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 500);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };
    return (
        <div className="bg-gradient-to-r from-white-900 via-gray-800 to-gray-900 text-white min-h-screen font-sans">
            <main className="pt-24 p-1">
                <section className="relative w-full h-[500px] flex items-center justify-center text-center">
                    <div
                        className="relative w-full h-full bg-cover bg-center rounded-lg overflow-hidden"
                        style={{ backgroundImage: "url('https://via.placeholder.com/1600x900')" }}
                    >
                        <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col justify-center items-center px-4">
                            <h2 className="text-5xl font-extrabold text-blue-400 animate-pulse">
                                Iniciar transmisión en vivo
                            </h2>
                            <Link
                                to={'/lives'}
                                className="mt-6 px-8 py-3 bg-purple-600 rounded-full text-lg shadow-xl hover:bg-purple-700 transition duration-300"
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
                                {/* Gradiente sobre el video */}
                                <div
                                    className="absolute inset-0 bg-gradient-to-t from-black to-transparent"
                                >
                                <video
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

                                {/* Footer con las interacciones */}
                                <div className="w-full mt-auto bg-opacity-70 z-80">
                                    <div className='pb-10'>
                                        <div className="flex items-center space-x-3">
                            
                                            <button className="text-white">
                                                <img className="w-8 h-8 rounded-full object-cover" src={`${ data.user_id?.profile_picture ? data.user_id.profile_picture  : "http://localhost:8000/media/profile_pics/avatar.webp" }`} alt="" />
                                            </button>
                                    <Link className=" text-white  border-white" to={'/wallet'}>{data.user_id?.username}</Link>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between w-full px-2">
                                        <div
                                            className="flex flex-col items-center text-red-500 transition-all duration-500 cursor-pointer"
                                            onClick={() => handleViewClick('1')}
                                        >
                                            <Eye className={`transition-all duration-500 ${isView ? "w-8 h-8 fill-current" : "w-7 h-7"} text-white`} />
                                            <span className="text-white text-sm w-full text-center mt-1">{1 | 0}</span>
                                        </div>
                                        <div
                                            className="flex flex-col items-center text-red-500 transition-all duration-500 cursor-pointer"
                                            onClick={() => handleCommentClick('1')}
                                        >
                                            <MessageCircle
                                                className={`transition-all duration-500 ${isComment ? "w-8 h-8 fill-current" : "w-7 h-7"} text-white`}
                                            />
                                            <span className="text-white text-sm w-full text-center mt-1">{data.comments_count}</span>
                                        </div>
                                        <div
                                            className="flex flex-col items-center text-red-500 transition-all duration-500 cursor-pointer"
                                            onClick={() => handleLikeClick('1')}
                                        >
                                            <Heart
                                                className={`transition-all duration-500 ${isLiked ? "w-8 h-8 fill-current" : "w-7 h-7"} ${isLiked ? "text-red-500" : "text-white"}`}
                                            />
                                            <span className="text-white text-sm w-full text-center mt-1">{data.likes_count}</span>
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

export default StreamingUI;
