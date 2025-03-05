import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { XR, useXR } from '@react-three/xr'; // Usamos XR directamente (sin ARButton)
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { createXRStore } from '@react-three/xr'; // Importa createXRStore

interface ARBearProps {
    onLoaded?: () => void;
}

// Crear un store para WebXR

const xrStore = createXRStore();
const BearModel: React.FC = () => {
    const bearRef = useRef<THREE.Object3D>(null);
    const mixer = useRef<THREE.AnimationMixer | null>(null);

    useEffect(() => {
        const loader = new THREE.GLTFLoader();
        loader.load(
            '/path/to/bear_model.glb', // Reemplaza con la ruta de tu modelo 3D del oso (creado en Blender o descargado)
            (gltf) => {
                if (bearRef.current) {
                    bearRef.current.add(gltf.scene);
                    mixer.current = new THREE.AnimationMixer(gltf.scene);
                    const clips = gltf.animations;
                    if (clips.length > 0) {
                        const action = mixer.current.clipAction(clips[0]); // Animación inicial (idle)
                        action.play();
                    }
                }
            },
            undefined,
            (error) => console.error('Error loading model:', error)
        );
    }, []);

    useFrame((state, delta) => {
        if (mixer.current) {
            mixer.current.update(delta);
        }
    });

    return (
        <mesh ref={bearRef} position={[0, 0, -2]} scale={[0.5, 0.5, 0.5]}>
            <boxGeometry args={[1, 1, 1]} /> {/* Placeholder hasta que cargue el modelo 3D */}
            <meshStandardMaterial color="pink" />
        </mesh>
    );
};

// Componente para manejar la sesión XR y el botón de AR
const ARSessionManager: React.FC<ARBearProps> = ({ onLoaded }) => {
    const { session } = useXR(); // Obtiene la sesión XR
    console.log(session, "----------")
    useEffect(() => {
        if (onLoaded && session) onLoaded();
    }, [onLoaded, session]);

    // Renderiza el botón para iniciar AR si no hay sesión activa
    if (!session) {
        return (
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1000 }}>
                <button
                    onClick={() => {
                        navigator.xr?.requestSession('immersive-ar', { requiredFeatures: ['local-floor'] })
                            .then((xrSession) => {
                                // Inicia la sesión AR
                                xrStore.setSession(xrSession); // Actualiza el store con la sesión
                                xrSession.addEventListener('end', () => {
                                    xrStore.setSession(null); // Limpia el store al cerrar la sesión
                                });
                            })
                            .catch((error) => console.error('Error iniciando AR:', error));
                    }}
                    style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer' }}
                >
                    Iniciar Realidad Aumentada
                </button>
            </div>
        );
    }

    return (
        <Canvas>
            <XR store={xrStore}> {/* Pasa el store al componente XR */}
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                <BearModel />
                <OrbitControls />
            </XR>
        </Canvas>
    );
};

const ARBear: React.FC<ARBearProps> = ({ onLoaded }) => {
    console.log("-----------------------")
    return <ARSessionManager onLoaded={onLoaded} />;
};

export default ARBear;