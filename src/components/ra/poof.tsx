import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
// import { ARButton } from 'three/examples/jsm/webxr/ARButton';
// import{ ARButton }from 'node_modules/three/examples/jsm/webxr/XRButton.js'
// Define props interface (empty since no props are passed)


const ARScene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Scene, camera, and renderer setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      20
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;

    // Append renderer to DOM
    const mountElement = mountRef.current;
    if (mountElement) {
      mountElement.appendChild(renderer.domElement);
    }

    // Add AR button to enter AR mode
    const arButton = ARButton.createButton(renderer, {
      requiredFeatures: ['hit-test'],
    });
    document.body.appendChild(arButton);

    // Lighting
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    // Objects to find (cube and sphere)
    const cubeGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(0, 0.1, -1);
    scene.add(cube);

    const sphereGeometry = new THREE.SphereGeometry(0.15, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(0.5, 0.15, -1.5);
    scene.add(sphere);

    // Hit-testing variables
    let hitTestSource: XRHitTestSource | null = null; // Keep as null for consistency
    let localReferenceSpace: XRReferenceSpace | null = null;

    // Setup hit-testing when AR session starts
    const handleSessionStart = async () => {
      const session = renderer.xr.getSession();
      if (session) {
        try {
          localReferenceSpace = await session.requestReferenceSpace('local');
          const hitTestOptions: XRHitTestOptionsInit = {
            space: localReferenceSpace,
          };

          // Check if requestHitTestSource is available
          if (session.requestHitTestSource) {
            const source = await session.requestHitTestSource(hitTestOptions);
            hitTestSource = source ?? null; // Convert undefined to null if necessary
          } else {
            console.warn('Hit-test feature is not supported in this session.');
          }
        } catch (error) {
          console.error('Error setting up hit-test:', error);
        }

        // Clean up hit-test source when session ends
        session.addEventListener('end', () => {
          if (hitTestSource) {
            hitTestSource.cancel();
            hitTestSource = null;
          }
          localReferenceSpace = null;
        });
      }
    };
    renderer.xr.addEventListener('sessionstart', handleSessionStart);

    // Raycaster for interaction
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onClick = (event: MouseEvent) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects([cube, sphere]);
      if (intersects.length > 0) {
        const object = intersects[0].object as THREE.Mesh;
        (object.material as THREE.MeshBasicMaterial).color.set(0xffff00);
        console.log('¡Objeto encontrado!');
      }
    };
    window.addEventListener('click', onClick);

    // Animation loop with hit-testing
    const animate = () => {
      renderer.setAnimationLoop((_: number, frame?: XRFrame) => {
        if (frame && hitTestSource) {
          const hitTestResults = frame.getHitTestResults(hitTestSource);
          if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(localReferenceSpace!); // Non-null since set in sessionstart
            if (pose) {
              cube.position.setFromMatrixPosition(
                new THREE.Matrix4().fromArray(pose.transform.matrix)
              );
            }
          }
        }
        renderer.render(scene, camera);
      });
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup on unmount
    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener('click', onClick);
      window.removeEventListener('resize', handleResize);
      renderer.xr.removeEventListener('sessionstart', handleSessionStart);
      if (mountElement && renderer.domElement) {
        mountElement.removeChild(renderer.domElement);
      }
      if (document.body.contains(arButton)) {
        document.body.removeChild(arButton);
      }
      renderer.dispose();
      scene.clear();
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />;
};

export default ARScene;