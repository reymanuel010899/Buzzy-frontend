import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { XR, useXR } from '@react-three/xr';
import * as THREE from 'three';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import { Video as VideoPro } from './main.interface'; // Asegúrate de tener esta interfaz definida
import { Eye, MessageCircle, Heart, Volume2, VolumeX } from 'lucide-react';
import BottomNavbar from '../Layout/ButtonNavar'; // Asegúrate de que este componente exista
import Categories from './categoria'; // Asegúrate de que este componente exista

interface StreamingUIProps {
    media: VideoPro[] | null;
}

interface DetectedObject {
    class: string;
    position: THREE.Vector3;
}

const ARVideo: React.FC<{
    videoUrl: string;
    onLoaded?: () => void;
    onClose?: () => void;
}> = ({ videoUrl, onLoaded, onClose }) => {
    const [detectedObject, setDetectedObject] = useState<DetectedObject | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isXRSupported, setIsXRSupported] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Preload del modelo COCO-SSD para mejorar rendimiento
    useEffect(() => {
        const preloadModel = async () => {
            try {
                await cocoSsd.load();
                console.log('Modelo COCO-SSD pre-cargado con éxito');
            } catch (err) {
                console.error('Error al pre-cargar modelo:', err);
            }
        };
        preloadModel();
    }, []);

    // Verificar soporte de WebXR
    useEffect(() => {
        if ('xr' in navigator) {
            navigator.xr?.isSessionSupported('immersive-ar').then((supported) => {
                setIsXRSupported(supported);
                if (!supported) {
                    setErrorMessage('WebXR no está soportado en este dispositivo.');
                }
                setIsLoading(false);
            }).catch((error) => {
                console.error('Error al verificar WebXR:', error);
                setIsXRSupported(false);
                setErrorMessage(`Error al verificar WebXR: ${error.message}`);
                setIsLoading(false);
            });
        } else {
            setIsXRSupported(false);
            setErrorMessage('WebXR no está disponible en este navegador.');
            setIsLoading(false);
        }
    }, []);

    // Detectar objeto al cargar el componente
    useEffect(() => {
        const detectObject = async () => {
            if (!videoRef.current || !canvasRef.current) {
                console.log('Video o canvas no disponibles');
                return;
            }

            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            if (!context) {
                console.log('No se pudo obtener el contexto 2D del canvas');
                return;
            }

            video.crossOrigin = 'anonymous'; // Permitir CORS
            video.src = videoUrl;
            video.muted = true; // Asegúrate de que esté muteado para autoplay
            video.loop = true;
            video.playsInline = true;

            const handleLoadedData = async () => {
                if (video.readyState >= 2) { // HAVE_CURRENT_DATA o superior
                    console.log('Video listo. Dimensiones:', video.videoWidth, video.videoHeight);
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);
                    console.log('Frame dibujado en canvas:', canvas);

                    try {
                        const model = await cocoSsd.load(); // Usar modelo pre-cargado si es posible
                        const predictions = await model.detect(canvas);
                        console.log('Predicciones:', predictions);

                        if (predictions.length > 0) {
                            const mainObject = predictions[0];
                            console.log('Objeto detectado:', mainObject.class);

                            const randomPosition = new THREE.Vector3(
                                (Math.random() - 0.5) * 4, // -2 a 2 metros en X
                                0.1,                       // Altura inicial
                                -1 - Math.random() * 3     // -1 a -4 metros en Z
                            );
                            setDetectedObject({ class: mainObject.class, position: randomPosition });
                        } else {
                            console.log('No se detectaron objetos.');
                            setErrorMessage('No se detectaron objetos en el video.');
                        }
                    } catch (err) {
                        console.error('Error en detección:', {
                            name: err.name,
                            message: err.message,
                            stack: err.stack,
                        });
                        setErrorMessage(`Error al detectar objeto: ${err.message}`);
                    }
                } else {
                    console.log('Video no está listo aún. Estado:', video.readyState);
                }
            };

            video.onloadeddata = handleLoadedData;
            video.onerror = (e) => console.error('Error al cargar el video:', e);

            video.play().catch((error) => {
                console.error('Error al reproducir video:', error);
                if (error.name === 'AbortError') {
                    console.log('El intento de reproducción fue interrumpido. Asegúrate de que el video esté muteado y que el navegador permita autoplay.');
                }
                setErrorMessage(`Error al reproducir video: ${error.message}`);
            });

            return () => {
                if (video) {
                    video.pause();
                    video.src = '';
                }
            };
        };

        detectObject();
    }, [videoUrl]);

    const ARObject: React.FC<{ position: THREE.Vector3; onFound: () => void }> = ({ position, onFound }) => {
        const { gl, camera } = useXR(); // Asegúrate de que useXR esté dentro de <XR>
        const meshRef = useRef<THREE.Mesh>(null);

        // Verificar que gl esté definido antes de usarlo
        useEffect(() => {
            if (!gl || !meshRef.current) {
                console.warn('Renderer gl o mesh no definidos en ARObject');
                return;
            }

            console.log('Renderer gl:', gl); // Depuración

            const session = gl.xr.getSession();
            if (!session) {
                console.warn('No hay sesión WebXR activa.');
                return;
            }

            const updatePosition = async () => {
                try {
                    const referenceSpace = await session.requestReferenceSpace('local');
                    const hitTestSource = await session.requestHitTestSource({ space: referenceSpace });
                    const frame = gl.xr.getFrame();
                    if (!frame) {
                        console.warn('No se pudo obtener el frame WebXR.');
                        return;
                    }

                    const hitTestResults = frame.getHitTestResults(hitTestSource);
                    if (hitTestResults.length > 0) {
                        const hit = hitTestResults[0];
                        const pose = hit.getPose(referenceSpace);
                        if (pose && meshRef.current) {
                            meshRef.current.position.setFromMatrixPosition(new THREE.Matrix4().fromArray(pose.transform.matrix));
                        }
                    }
                } catch (error) {
                    console.error('Error en hit-testing:', {
                        name: error.name,
                        message: error.message,
                        stack: error.stack,
                    });
                }
            };

            session.addEventListener('select', updatePosition);
            return () => session.removeEventListener('select', updatePosition);
        }, [gl]); // Dependencia en gl, no gl.xr

        // Raycasting para detectar interacción
        useFrame(() => {
            if (meshRef.current && camera) {
                const raycaster = new THREE.Raycaster();
                raycaster.setFromCamera({ x: 0, y: 0 }, camera); // Centro de la pantalla
                const intersects = raycaster.intersectObject(meshRef.current);
                if (intersects.length > 0) {
                    (meshRef.current.material as THREE.MeshBasicMaterial).color.set(0xffff00); // Amarillo al encontrar
                    onFound();
                }
            }
        });

        return (
            <mesh ref={meshRef} position={position} scale={[0.3, 0.3, 0.3]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial color={0xff0000} />
            </mesh>
        );
    };

    return (
        <div style={{ width: '100vw', height: '100vh' }}>
            {isLoading ? (
                <div style={{ color: 'white', textAlign: 'center', padding: '20px' }}>
                    Cargando...
                </div>
            ) : errorMessage ? (
                <div style={{ color: 'white', textAlign: 'center', padding: '20px' }}>
                    {errorMessage}
                </div>
            ) : isXRSupported ? (
                <Canvas>
                    <XR>
                        <ambientLight intensity={0.5} />
                        <pointLight position={[10, 10, 10]} />
                        {detectedObject && (
                            <ARObject
                                position={detectedObject.position}
                                onFound={() => console.log('¡Objeto encontrado!')}
                            />
                        )}
                    </XR>
                </Canvas>
            ) : (
                <div style={{ color: 'white', textAlign: 'center', padding: '20px' }}>
                    WebXR no está soportado en este dispositivo o navegador.
                </div>
            )}
            <video
                ref={videoRef}
                autoPlay
                muted
                loop
                playsInline
                style={{ display: 'none' }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <button
                style={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                    padding: '10px',
                    background: 'red',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                }}
                onClick={onClose}
            >
                Cerrar AR
            </button>
            {detectedObject && (
                <p style={{ position: 'absolute', bottom: 20, left: 20, color: 'white' }}>
                    Busca el {detectedObject.class} en el mundo AR
                </p>
            )}
        </div>
    );
};

const StreamingUI = ({ media }: StreamingUIProps) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 500);
    const [isLiked, setIsLiked] = useState(false);
    const [isComment, setIsComment] = useState(false);
    const [isView, setIsView] = useState(false);
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
    const [isARActive, setIsARActive] = useState<number | null>(null);

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
    }, [media]);

    const handleVideoClick = (index: number) => {
        const video = media?.[index];
        if (!video) {
            alert('No se encontró el video.');
            return;
        }
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
    const toggleMute = () => setIsMuted(!isMuted);

    const closeAR = () => setIsARActive(null);

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
                                style={{ height: isMobile ? '800px' : '800px', overflow: 'hidden', zIndex: 1 }}
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

                {isARActive !== null && media && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                        <ARVideo
                            videoUrl={media[isARActive].video}
                            onLoaded={() => console.log('AR cargado')}
                            onClose={closeAR}
                        />
                    </div>
                )}
            </main>
            <BottomNavbar />
        </div>
    );
};

export default StreamingUI;