import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { XR, useXR } from '@react-three/xr';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createXRStore } from '@react-three/xr';

interface ARBearProps {
  onLoaded?: () => void;
}

// Create XR store
const xrStore = createXRStore({
  // Optional: Add configuration if needed
});


const BearModel: React.FC = () => {
  const bearRef = useRef<THREE.Mesh>(null);
  const mixer = useRef<THREE.AnimationMixer | null>(null);

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.load(
      '/path/to/bear_model.glb',
      (gltf) => {
        if (bearRef.current) {
          bearRef.current.add(gltf.scene);
          mixer.current = new THREE.AnimationMixer(gltf.scene);
          const clips = gltf.animations;
          if (clips.length > 0) {
            const action = mixer.current.clipAction(clips[0]);
            action.play();
          }
        }
      },
      undefined,
      (error) => console.error('Error loading model:', error)
    );
  }, []);

  useFrame((_, delta) => {
    if (mixer.current) {
      mixer.current.update(delta);
    }
  });

  return (
    <mesh ref={bearRef} position={[0, 0, -2]} scale={[0.5, 0.5, 0.5]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="pink" />
    </mesh>
  );
};

const ARSessionManager: React.FC<ARBearProps> = ({ onLoaded }) => {
  const { session } = useXR();

  useEffect(() => {
    if (onLoaded && session) {
      onLoaded();
    }
  }, [onLoaded, session]);


  if (!session) {
    return (
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1000 }}>
        <button
          onClick={async () => {
            try {
              if (!navigator.xr) {
                console.error('WebXR not supported');
                return;
              }

              const xrSession = await navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['local-floor'],
                optionalFeatures: ['bounded-floor', 'hand-tracking'],
              });

              console.log('AR Session started:', xrSession);
              xrSession.onend = () => {
                console.log('AR Session ended');
              };
            } catch (error) {
              console.error('Error initiating AR:', error);
            }
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
    <Canvas>
      <XR store={xrStore}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <BearModel />
        <OrbitControls />
      </XR>
    </Canvas>
  );
};

const ARBear: React.FC<ARBearProps> = ({ onLoaded }) => {
  return <ARSessionManager onLoaded={onLoaded} />;
};

export default ARBear;