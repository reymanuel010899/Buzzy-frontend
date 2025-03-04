import BottomNavbar from '../Layout/ButtonNavar';
import { Link } from 'react-router-dom';
import Categories from './categoria';
import { Video as VideoPro } from './main.interface';
import { Eye, MessageCircle, Heart, Volume2, VolumeX } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { XR } from '@react-three/xr'; // Usamos XR directamente
import { OrbitControls } from '@react-three/drei'; // Mantengo OrbitControls para desarrollo, pero lo quitaré para usuarios finales si lo deseas
import * as THREE from 'three';
import { createXRStore } from '@react-three/xr'; // Asegúrate de que esta exportación esté disponible en @react-three/xr@6.6.8

interface StreamingUIProps {
    media: VideoPro[] | null;
}

const ARVideo: React.FC<{
    videoUrl: string;
    onLoaded?: () => void;
    onClose?: () => void;
}> = ({ videoUrl, onLoaded, onClose }) => {
    const xrStore = createXRStore();

    const VideoPlane: React.FC<{ videoUrl: string }> = ({ videoUrl }) => {
        const videoRef = useRef<HTMLVideoElement>(null);
        const meshRef = useRef<THREE.Mesh>(null);
        const [dynamicPosition, setDynamicPosition] = useState<THREE.Vector3>(new THREE.Vector3(0, 1, -2)); // Posición inicial
        const [direction, setDirection] = useState<THREE.Vector3>(new THREE.Vector3(1, 0, 0)); // Dirección inicial del movimiento
        const speed = 0.05; // Velocidad de movimiento
        const [isWalking, setIsWalking] = useState(true); // Estado para controlar si el video "camina"

        useEffect(() => {
            if (videoRef.current) {
                videoRef.current.src = videoUrl;
                videoRef.current.crossOrigin = 'anonymous'; // Permitir CORS si el video está en otro dominio
                videoRef.current.load(); // Forzar la carga del video
                videoRef.current.play().catch((error) => console.error('Error playing video:', error));
            }
        }, [videoUrl]);

        useEffect(() => {
            const texture = new THREE.VideoTexture(videoRef.current!);
            texture.minFilter = THREE.LinearFilter; // Optimizar para rendimiento
            texture.magFilter = THREE.LinearFilter;
            if (meshRef.current) {
                meshRef.current.material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }); // Usar DoubleSide para mayor visibilidad
            }
        }, [videoUrl]);

        // Animación para mover el video y simular caminar
        useFrame(() => {
            if (meshRef.current && meshRef.current.material && (meshRef.current.material as THREE.MeshBasicMaterial).map) {
                (meshRef.current.material as THREE.MeshBasicMaterial).map.needsUpdate = true;

                if (isWalking) {
                    // Movimiento simple: el video "camina" en la dirección actual
                    const newPosition = meshRef.current.position.clone().add(direction.clone().multiplyScalar(speed));
                    setDynamicPosition(newPosition);

                    // Cambiar dirección aleatoriamente para simular un paseo más natural
                    if (Math.random() < 0.01) { // 1% de probabilidad por frame de cambiar dirección
                        const newDirection = new THREE.Vector3(
                            Math.random() * 2 - 1, // X entre -1 y 1
                            0, // Mantén Y en 0 (no sube ni baja)
                            Math.random() * 2 - 1 // Z entre -1 y 1
                        ).normalize();
                        setDirection(newDirection);
                    }

                    // Mantener el video sobre el suelo (ajusta según hit-testing)
                    if (newPosition.y < 1) { // Ajusta 1 según la altura del suelo en tu escena
                        setDynamicPosition(new THREE.Vector3(newPosition.x, 1, newPosition.z));
                    }
                }
            }
        });

        // Hit-testing para posicionar el video en una superficie real
        useEffect(() => {
            const handleXRSession = (xrSession: XRSession) => {
                if (!xrSession) return;

                const hitTestSource = xrSession.requestHitTestSource({ space: xrSession.devicePose!.space });
                hitTestSource.then((source) => {
                    const onHitTest = (event: XRHitTestEvent) => {
                        const hit = event.hits[0]; // Primer impacto en una superficie real
                        if (hit && meshRef.current) {
                            setDynamicPosition(new THREE.Vector3(hit.position.x, hit.position.y, hit.position.z));
                            setIsWalking(true); // Reinicia el caminar cuando detecta una superficie
                        }
                    };
                    xrSession.addEventListener('hit-test', onHitTest);
                    return () => xrSession.removeEventListener('hit-test', onHitTest);
                }).catch((error) => console.error('Error en hit-test:', error));
            };

            const session = xrStore.getState().session;
            if (session) {
                handleXRSession(session);
            } else {
                xrStore.subscribe((state) => {
                    if (state.session) {
                        handleXRSession(state.session);
                    }
                });
            }
        }, []);

        return (
            <mesh ref={meshRef} position={dynamicPosition} scale={[2, 1.5, 1]} rotation={[0, 0, 0]}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial />
                <video
                    ref={videoRef}
                    autoPlay
                    loop
                    muted // Mute por defecto para evitar problemas en dispositivos móviles/Quest
                    playsInline
                    style={{ display: 'none' }}
                    onError={(e) => console.error('Video error:', e)}
                    onLoadedMetadata={() => console.log('Video loaded successfully')}
                >
                    <source src={videoUrl} type="video/mp4" />
                    Tu navegador no soporta el formato de video.
                </video>
            </mesh>
        );
    };

    const ARSessionManager: React.FC<{ videoUrl: string; onLoaded?: () => void; onClose?: () => void }> = ({
        videoUrl,
        onLoaded,
        onClose,
    }) => {
        return (
            <Canvas>
                <XR store={xrStore}>
                    {({ session }) => {
                        useEffect(() => {
                            if (onLoaded && session) onLoaded();
                        }, [onLoaded, session]);

                        if (!session) {
                            return (
                                <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1000 }}>
                                    <button
                                        onClick={() => {
                                            navigator.xr
                                                ?.requestSession('immersive-ar', { requiredFeatures: ['local-floor', 'hit-test'] })
                                                .then((xrSession) => {
                                                    xrStore.setSession(xrSession);
                                                    xrSession.addEventListener('end', () => {
                                                        xrStore.setSession(null);
                                                        if (onClose) onClose();
                                                    });
                                                })
                                                .catch((error) => console.error('Error iniciando AR:', error));
                                        }}
                                        style={{
                                            padding: '10px 20px',
                                            background: '#007bff',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: 5,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Iniciar Realidad Aumentada
                                    </button>
                                </div>
                            );
                        }

                        return (
                            <>
                                <ambientLight intensity={0.5} />
                                <pointLight position={[10, 10, 10]} />
                                <VideoPlane videoUrl={videoUrl} />
                                {/* Mantengo OrbitControls para desarrollo, pero lo eliminaré para usuarios finales si lo deseas */}
                                <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
                            </>
                        );
                    }}
                </XR>
            </Canvas>
        );
    };

    return <ARSessionManager videoUrl={videoUrl} onLoaded={onLoaded} onClose={onClose} />;
};

const StreamingUI = ({ media }: StreamingUIProps) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 500);
    const [isLiked, setIsLiked] = useState(false);
    const [isComment, setIsComment] = useState(false);
    const [isView, setIsView] = useState(false);
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
    const [isARActive, setIsARActive] = useState<number | null>(null); // Estado para controlar qué video activó AR

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

    // Manejar clic en el video para mostrar AR
    const handleVideoClick = (index: number) => {
        const video = media?.[index];
        if (!video) {
            alert('No se encontró el video.');
            return;
        }

        // Activar la experiencia AR para este video
        setIsARActive(index);
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

    // Cerrar la experiencia AR
    const closeAR = () => {
        setIsARActive(null);
    };

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

                {/* Mostrar la experiencia AR con el video si está activa */}
                {isARActive !== null && media && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                        <div className="relative w-full h-full">
                            <ARVideo
                                videoUrl={media[isARActive].video} // Usa el video correspondiente al índice
                                onLoaded={() => console.log('Video AR cargado')}
                                onClose={closeAR}
                            />
                            <button
                                className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full shadow-lg"
                                onClick={closeAR}
                            >
                                Cerrar AR
                            </button>
                            <p className="absolute bottom-4 left-4 text-white">
                                Experiencia de Realidad Aumentada Activada
                            </p>
                        </div>
                    </div>
                )}
            </main>
            <BottomNavbar />
        </div>
    );
};

export default StreamingUI;