import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';

const ARScene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Escena, cámara y renderizador
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true; // Habilitar WebXR
    mountRef.current?.appendChild(renderer.domElement);

    // Botón para entrar en AR
    document.body.appendChild(
      ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] })
    );

    // Luz
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    // Objetos para buscar (cubo y esfera como ejemplo)
    const cubeGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(0, 0.1, -1); // Posición inicial frente a la cámara
    scene.add(cube);

    const sphereGeometry = new THREE.SphereGeometry(0.15, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(0.5, 0.15, -1.5); // Otro objeto a buscar
    scene.add(sphere);

    // Variables para hit-testing (detección de planos)
    let hitTestSource: XRHitTestSource | null = null;
    let hitTestSourceRequested = false;

    // Configurar hit-testing al iniciar la sesión AR
    renderer.xr.addEventListener('sessionstart', async () => {
      const session = renderer.xr.getSession();
      if (session) {
        const referenceSpace = await session.requestReferenceSpace('local');
        const hitTestOptions: XRHitTestOptionsInit = {
          space: referenceSpace,
        };
        hitTestSourceRequested = true;
        session.requestHitTestSource(hitTestOptions).then((source) => {
          hitTestSource = source;
        });
      }
    });

    // Raycaster para interacción
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onClick = (event: MouseEvent) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects([cube, sphere]);
      if (intersects.length > 0) {
        const object = intersects[0].object as THREE.Mesh;
        (object.material as THREE.MeshBasicMaterial).color.set(0xffff00); // Cambia a amarillo al encontrarlo
        console.log('¡Objeto encontrado!');
      }
    };
    window.addEventListener('click', onClick);

    // Animación y renderizado
    const animate = () => {
      renderer.setAnimationLoop(() => {
        const frame = renderer.xr.getFrame();
        if (frame && hitTestSource) {
          const hitTestResults = frame.getHitTestResults(hitTestSource);
          if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(renderer.xr.getReferenceSpace());
            if (pose) {
              // Actualizar posición del cubo según el plano detectado (opcional)
              cube.position.setFromMatrixPosition(new THREE.Matrix4().fromArray(pose.transform.matrix));
            }
          }
        }
        renderer.render(scene, camera);
      });
    };
    animate();

    // Limpieza al desmontar
    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener('click', onClick);
      mountRef.current?.removeChild(renderer.domElement);
      document.body.removeChild(document.getElementById('ARButton') as HTMLElement);
    };
  }, []);

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />;
};

export default ARScene;