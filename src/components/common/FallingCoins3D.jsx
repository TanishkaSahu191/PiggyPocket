/**
 * FALLING COINS 3D BACKGROUND - WebGL / Three.js
 *
 * Renders realistic tumbling golden and bronze coins in 3D space with
 * metallic specular highlights, milled edges, embossed symbols,
 * physical depth, and gentle mouse parallax.
 *
 * ZERO EMOJIS.
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Procedural canvas texture generator for coin faces (front & back)
 */
function createCoinFaceTexture(symbol = '₹', isGold = true) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 1. Base metallic radial gradient
  const grad = ctx.createRadialGradient(256, 256, 120, 256, 256, 256);
  if (isGold) {
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.3, '#f59e0b');
    grad.addColorStop(0.65, '#d97706');
    grad.addColorStop(0.9, '#b45309');
    grad.addColorStop(1, '#78350f');
  } else {
    // Rich copper / bronze coin
    grad.addColorStop(0, '#fed7aa');
    grad.addColorStop(0.3, '#ea580c');
    grad.addColorStop(0.65, '#c2410c');
    grad.addColorStop(0.9, '#9a3412');
    grad.addColorStop(1, '#431407');
  }

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(256, 256, 252, 0, Math.PI * 2);
  ctx.fill();

  // 2. Outer rim border with specular bevel
  ctx.strokeStyle = isGold ? '#fef9c3' : '#ffedd5';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(256, 256, 244, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Decorative beaded circle
  const numBeads = 44;
  ctx.fillStyle = isGold ? '#fef08a' : '#fed7aa';
  for (let i = 0; i < numBeads; i++) {
    const angle = (i / numBeads) * Math.PI * 2;
    const bx = 256 + Math.cos(angle) * 228;
    const by = 256 + Math.sin(angle) * 228;
    ctx.beginPath();
    ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Inner embossed ring
  ctx.strokeStyle = isGold ? '#92400e' : '#7c2d12';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(256, 256, 206, 0, Math.PI * 2);
  ctx.stroke();

  // 5. Central coin plateau
  const innerGrad = ctx.createRadialGradient(210, 210, 40, 256, 256, 200);
  if (isGold) {
    innerGrad.addColorStop(0, '#fffbeb');
    innerGrad.addColorStop(0.4, '#fbbf24');
    innerGrad.addColorStop(0.8, '#d97706');
    innerGrad.addColorStop(1, '#854d0e');
  } else {
    innerGrad.addColorStop(0, '#fff7ed');
    innerGrad.addColorStop(0.4, '#fb923c');
    innerGrad.addColorStop(0.8, '#c2410c');
    innerGrad.addColorStop(1, '#6c220b');
  }
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.arc(256, 256, 204, 0, Math.PI * 2);
  ctx.fill();

  // 6. Engraved currency symbol with 3D embossed shadow
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Highlight shadow (top-left light source)
  ctx.font = '900 150px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = isGold ? 'rgba(254, 240, 138, 0.85)' : 'rgba(255, 237, 213, 0.85)';
  ctx.fillText(symbol, 253, 248);

  // Dark relief drop shadow (bottom-right shadow)
  ctx.fillStyle = isGold ? 'rgba(113, 63, 18, 0.95)' : 'rgba(67, 20, 7, 0.95)';
  ctx.fillText(symbol, 259, 254);

  // Main embossed symbol
  ctx.fillStyle = isGold ? '#fef08a' : '#fed7aa';
  ctx.fillText(symbol, 256, 251);

  // 7. Circular perimeter typography: "PIGGYPOCKET" and "SAVINGS"
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = isGold ? '#78350f' : '#431407';
  ctx.letterSpacing = '2px';
  ctx.fillText('PIGGYPOCKET', 256, 92);
  ctx.fillText('• 2026 •', 256, 412);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural canvas texture generator for milled / grooved coin rim edge
 */
function createMilledEdgeTexture(isGold = true) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');

  // Alternating vertical serrations for milled coin rim
  const numGrooves = 64;
  const grooveWidth = canvas.width / numGrooves;

  for (let i = 0; i < numGrooves; i++) {
    const x = i * grooveWidth;
    ctx.fillStyle = i % 2 === 0
      ? (isGold ? '#fbbf24' : '#fb923c')
      : (isGold ? '#78350f' : '#6c220b');
    ctx.fillRect(x, 0, grooveWidth, 32);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(4, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function FallingCoins3D() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 24);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;

    // 2. Realistic Lighting Setup
    // Soft ambient light
    const ambientLight = new THREE.AmbientLight(0xfffbeb, 1.4);
    scene.add(ambientLight);

    // Primary directional light (top-left specular highlight)
    const sunLight = new THREE.DirectionalLight(0xffffff, 3.2);
    sunLight.position.set(12, 18, 16);
    scene.add(sunLight);

    // Warm golden fill light (bottom-right underglow)
    const fillLight = new THREE.DirectionalLight(0xf59e0b, 2.0);
    fillLight.position.set(-14, -12, 10);
    scene.add(fillLight);

    // Subtle blue rim contrast light from back
    const backRimLight = new THREE.DirectionalLight(0x818cf8, 1.2);
    backRimLight.position.set(0, -10, -15);
    scene.add(backRimLight);

    // 3. Procedural Coin Textures & Materials
    const goldFaceTex = createCoinFaceTexture('₹', true);
    const goldEdgeTex = createMilledEdgeTexture(true);

    const copperFaceTex = createCoinFaceTexture('₹', false);
    const copperEdgeTex = createMilledEdgeTexture(false);

    // Multi-material arrays for CylinderGeometry: [0: edge, 1: top face, 2: bottom face]
    const goldMaterials = [
      new THREE.MeshStandardMaterial({
        map: goldEdgeTex,
        metalness: 0.88,
        roughness: 0.28,
        color: 0xffe082,
      }),
      new THREE.MeshStandardMaterial({
        map: goldFaceTex,
        metalness: 0.84,
        roughness: 0.22,
      }),
      new THREE.MeshStandardMaterial({
        map: goldFaceTex,
        metalness: 0.84,
        roughness: 0.22,
      }),
    ];

    const copperMaterials = [
      new THREE.MeshStandardMaterial({
        map: copperEdgeTex,
        metalness: 0.82,
        roughness: 0.32,
        color: 0xfba574,
      }),
      new THREE.MeshStandardMaterial({
        map: copperFaceTex,
        metalness: 0.8,
        roughness: 0.26,
      }),
      new THREE.MeshStandardMaterial({
        map: copperFaceTex,
        metalness: 0.8,
        roughness: 0.26,
      }),
    ];

    // 4. Geometries (varied coin sizes for natural depth)
    const geometries = [
      new THREE.CylinderGeometry(0.7, 0.7, 0.09, 32),
      new THREE.CylinderGeometry(0.9, 0.9, 0.12, 32),
      new THREE.CylinderGeometry(1.2, 1.2, 0.15, 32),
      new THREE.CylinderGeometry(1.5, 1.5, 0.18, 32),
    ];

    // 5. Spawn Coins with 3D Depth & Physics Parameters
    const coinCount = 52;
    const coins = [];

    // Frustum boundary calculations at z=0
    const vFOV = THREE.MathUtils.degToRad(camera.fov);
    const halfHeight = Math.tan(vFOV / 2) * camera.position.z;
    const halfWidth = halfHeight * camera.aspect;

    const xBound = halfWidth + 4;
    const yTop = halfHeight + 4;
    const yBottom = -halfHeight - 4;

    for (let i = 0; i < coinCount; i++) {
      const isGold = Math.random() > 0.3; // 70% gold, 30% warm bronze
      const materials = isGold ? goldMaterials : copperMaterials;
      const geom = geometries[Math.floor(Math.random() * geometries.length)];

      const mesh = new THREE.Mesh(geom, materials);

      // Stagger positions across viewport and depth
      const zDepth = -14 + Math.random() * 20; // z from -14 (far, small) to +6 (near camera, big)
      const xPos = (Math.random() - 0.5) * xBound * 2.2;
      const yPos = (Math.random() - 0.5) * (yTop - yBottom) * 1.8;

      mesh.position.set(xPos, yPos, zDepth);

      // Random 3D initial orientation
      mesh.rotation.x = Math.random() * Math.PI * 2;
      mesh.rotation.y = Math.random() * Math.PI * 2;
      mesh.rotation.z = Math.random() * Math.PI * 2;

      // Depth-based scaling: farther coins look realistically smaller and dimmer
      const depthFactor = (zDepth + 14) / 20; // 0 to 1
      const scale = 0.7 + depthFactor * 0.55;
      mesh.scale.set(scale, scale, scale);

      // Dynamic fall & tumble physics
      const coinData = {
        mesh,
        // Near coins fall slightly faster for realistic parallax
        vy: 0.035 + depthFactor * 0.05 + Math.random() * 0.03,
        vx: (Math.random() - 0.5) * 0.012,
        rotSpeedX: (Math.random() - 0.5) * 0.045,
        rotSpeedY: (Math.random() - 0.5) * 0.055,
        rotSpeedZ: (Math.random() - 0.5) * 0.03,
        wobbleSpeed: 0.02 + Math.random() * 0.03,
        wobbleAmp: 0.008 + Math.random() * 0.012,
        phase: Math.random() * Math.PI * 2,
      };

      coins.push(coinData);
      scene.add(mesh);
    }

    // 6. Interactive Mouse Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetCameraX = 0;
    let targetCameraY = 0;

    const handleMouseMove = (e) => {
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;
      targetCameraX = normX * 1.2;
      targetCameraY = normY * 0.9;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // 7. Window Resize Handler
    const handleResize = () => {
      if (!container || !renderer) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener('resize', handleResize);

    // 8. Main 60 FPS Render Loop
    let animationFrameId = null;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Smooth camera interpolation for responsive mouse parallax
      camera.position.x += (targetCameraX - camera.position.x) * 0.04;
      camera.position.y += (targetCameraY - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      // Update coins physics
      for (let i = 0; i < coins.length; i++) {
        const c = coins[i];
        const m = c.mesh;

        // Gravity fall
        m.position.y -= c.vy;

        // Gentle lateral sway / flutter
        m.position.x += Math.sin(elapsedTime * c.wobbleSpeed + c.phase) * c.wobbleAmp + c.vx;

        // 3D Tumbling rotations on all 3 axes
        m.rotation.x += c.rotSpeedX;
        m.rotation.y += c.rotSpeedY;
        m.rotation.z += c.rotSpeedZ;

        // Seamless wrap-around when coin falls past bottom
        if (m.position.y < yBottom) {
          m.position.y = yTop + Math.random() * 4;
          m.position.x = (Math.random() - 0.5) * xBound * 2.2;
          m.position.z = -14 + Math.random() * 20;

          // Recalculate depth scale
          const newDepthFactor = (m.position.z + 14) / 20;
          const newScale = 0.7 + newDepthFactor * 0.55;
          m.scale.set(newScale, newScale, newScale);
          c.vy = 0.035 + newDepthFactor * 0.05 + Math.random() * 0.03;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // 9. Cleanup on Unmount
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      // Dispose Three.js objects to prevent memory leaks
      coins.forEach((c) => {
        scene.remove(c.mesh);
      });

      geometries.forEach((g) => g.dispose());
      goldMaterials.forEach((m) => m.dispose());
      copperMaterials.forEach((m) => m.dispose());

      goldFaceTex.dispose();
      goldEdgeTex.dispose();
      copperFaceTex.dispose();
      copperEdgeTex.dispose();

      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}

export default FallingCoins3D;
