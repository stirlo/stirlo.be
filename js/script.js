/* ========================================
 * 3D DVD SCREENSAVER - BUSINESS CARD EDITION
 * ========================================
 * Classic DVD bouncing with 3D card that flips
 * and shows both sides. Optimized for Safari/iPad.
 */

/* ---------- 0. ES-MODULE IMPORTS ---------- */
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  TextureLoader,
  SRGBColorSpace,
  MeshStandardMaterial,
  PlaneGeometry,
  Mesh,
  DirectionalLight,
  AmbientLight,
  Vector2,
  MathUtils,
  BufferGeometry,
  PointsMaterial,
  Points,
  Float32BufferAttribute,
  AdditiveBlending,
  DoubleSide,
  Group
} from 'three';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/* ---------- 1. CONFIGURATION ---------- */
const CARD_WIDTH = 400;      // Card width in pixels
const CARD_HEIGHT = 225;     // Card height (business card ratio)
const SPEED = 3;             // Base movement speed
const FLIP_SPEED = 0.02;     // Card flip rotation speed
const BOUNCE_DAMPING = 1.0;  // No speed loss on bounce (true DVD style)
const SPARK_COUNT = 8;       // Number of sparks on bounce
const SPARK_LIFE = 800;      // Spark lifetime in ms

/* ---------- 2. SCENE SETUP ---------- */
const scene = new Scene();
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new WebGLRenderer({
  canvas: document.getElementById('dvdCanvas'),
  antialias: true,
  alpha: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Optimize for mobile

/* ---------- 3. TEXTURE LOADING WITH CACHE BUSTING ---------- */
const textureLoader = new TextureLoader();
const cacheBuster = Date.now(); // Force fresh load

// Create fallback materials first
const frontMaterial = new MeshStandardMaterial({
  color: 0x71ae4f,
  side: DoubleSide,
  metalness: 0.1,
  roughness: 0.3
});

const backMaterial = new MeshStandardMaterial({
  color: 0x2d5a2d,
  side: DoubleSide,
  metalness: 0.1,
  roughness: 0.3
});

// Load front texture
console.log('🖼️ Loading front texture...');
textureLoader.load(
  `bizCardFront.png?v=${cacheBuster}`,
  (texture) => {
    console.log('✅ Front texture loaded!');
    texture.colorSpace = SRGBColorSpace;
    frontMaterial.map = texture;
    frontMaterial.color.setHex(0xffffff); // Reset to white for texture
    frontMaterial.needsUpdate = true;
  },
  undefined,
  (error) => {
    console.error('❌ Front texture failed:', error);
    console.log('🎨 Using fallback green color');
  }
);

// Load back texture
console.log('🖼️ Loading back texture...');
textureLoader.load(
  `bizcardgreenback.png?v=${cacheBuster}`,
  (texture) => {
    console.log('✅ Back texture loaded!');
    texture.colorSpace = SRGBColorSpace;
    backMaterial.map = texture;
    backMaterial.color.setHex(0xffffff); // Reset to white for texture
    backMaterial.needsUpdate = true;
  },
  undefined,
  (error) => {
    console.error('❌ Back texture failed:', error);
    console.log('🎨 Using fallback dark green color');
  }
);

/* ---------- 4. CARD CREATION (Two-sided plane) ---------- */
const cardGeometry = new PlaneGeometry(CARD_WIDTH, CARD_HEIGHT);

// Create two meshes for front and back
const frontCard = new Mesh(cardGeometry, frontMaterial);
const backCard = new Mesh(cardGeometry, backMaterial);

// Position back card slightly behind front card
backCard.position.z = -1;
backCard.rotation.y = Math.PI; // Flip back card 180°

// Group both cards together
const cardGroup = new Group();
cardGroup.add(frontCard);
cardGroup.add(backCard);
scene.add(cardGroup);

/* ---------- 5. LIGHTING ---------- */
const directionalLight = new DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(2, 2, 5);
scene.add(directionalLight);

const ambientLight = new AmbientLight(0x404040, 0.6);
scene.add(ambientLight);

/* ---------- 6. POST-PROCESSING ---------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new Vector2(window.innerWidth, window.innerHeight),
  0.3, // Reduced bloom for mobile performance
  0.4,
  0.85
);
composer.addPass(bloomPass);

/* ---------- 7. PARTICLE SYSTEM ---------- */
const sparksGeometry = new BufferGeometry();
const sparksMaterial = new PointsMaterial({
  color: 0xffffff,
  size: 3,
  transparent: true,
  opacity: 0,
  blending: AdditiveBlending
});
const sparksSystem = new Points(sparksGeometry, sparksMaterial);
scene.add(sparksSystem);

/* ---------- 8. PHYSICS VARIABLES ---------- */
let velocity = new Vector2();
let isFlipping = false;
let flipDirection = 1;
let sparksTimeout;

// Color palette for bounces
const colors = [
  0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 
  0xfeca57, 0xff9ff3, 0x54a0ff, 0x5f27cd
];
let colorIndex = 0;

/* ---------- 9. INITIALIZATION ---------- */
function init() {
  console.log('🚀 Starting DVD screensaver...');

  // Position camera
  camera.position.z = 800;

  // Set random initial direction (classic DVD angles)
  const angles = [30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330];
  const angle = angles[Math.floor(Math.random() * angles.length)] * Math.PI / 180;

  velocity.x = Math.cos(angle) * SPEED;
  velocity.y = Math.sin(angle) * SPEED;

  // Start in center
  cardGroup.position.set(0, 0, 0);

  animate();
}

/* ---------- 10. MAIN ANIMATION LOOP ---------- */
function animate() {
  requestAnimationFrame(animate);

  // === MOVEMENT ===
  cardGroup.position.x += velocity.x;
  cardGroup.position.y += velocity.y;

  // === CONTINUOUS CARD FLIPPING ===
  if (!isFlipping) {
    cardGroup.rotation.y += FLIP_SPEED * flipDirection;

    // Randomly change flip direction
    if (Math.random() < 0.01) {
      flipDirection *= -1;
    }
  }

  // === BOUNDARY DETECTION ===
  const halfWidth = window.innerWidth / 2;
  const halfHeight = window.innerHeight / 2;
  const cardHalfWidth = CARD_WIDTH / 2;
  const cardHalfHeight = CARD_HEIGHT / 2;

  let bounced = false;

  // Left/Right boundaries
  if (cardGroup.position.x <= -halfWidth + cardHalfWidth || 
      cardGroup.position.x >= halfWidth - cardHalfWidth) {
    velocity.x *= -BOUNCE_DAMPING;
    cardGroup.position.x = Math.max(-halfWidth + cardHalfWidth, 
                           Math.min(halfWidth - cardHalfWidth, cardGroup.position.x));
    bounced = true;
  }

  // Top/Bottom boundaries
  if (cardGroup.position.y <= -halfHeight + cardHalfHeight || 
      cardGroup.position.y >= halfHeight - cardHalfHeight) {
    velocity.y *= -BOUNCE_DAMPING;
    cardGroup.position.y = Math.max(-halfHeight + cardHalfHeight, 
                           Math.min(halfHeight - cardHalfHeight, cardGroup.position.y));
    bounced = true;
  }

  // === BOUNCE EFFECTS ===
  if (bounced) {
    onBounce();
  }

  // === DYNAMIC LIGHTING ===
  const time = Date.now() * 0.001;
  directionalLight.position.x = Math.cos(time * 0.5) * 3;
  directionalLight.position.y = Math.sin(time * 0.3) * 2;

  // === PARALLAX CAMERA ===
  updateParallax();

  composer.render();
}

/* ---------- 11. BOUNCE HANDLER ---------- */
function onBounce() {
  console.log('💥 Bounce!');

  // Color change
  const newColor = colors[colorIndex % colors.length];
  colorIndex++;

  // Animate color change
  gsap.to([frontMaterial.color, backMaterial.color], {
    duration: 0.5,
    r: ((newColor >> 16) & 255) / 255,
    g: ((newColor >> 8) & 255) / 255,
    b: (newColor & 255) / 255,
    ease: "power2.out"
  });

  // Dramatic flip on bounce
  isFlipping = true;
  gsap.to(cardGroup.rotation, {
    duration: 0.6,
    y: cardGroup.rotation.y + Math.PI * (Math.random() > 0.5 ? 1 : -1),
    ease: "back.out(1.7)",
    onComplete: () => {
      isFlipping = false;
    }
  });

  // Spawn sparks
  spawnSparks();
}

/* ---------- 12. SPARK EFFECTS ---------- */
function spawnSparks() {
  const positions = [];

  for (let i = 0; i < SPARK_COUNT; i++) {
    // Position sparks around card
    positions.push(
      cardGroup.position.x + (Math.random() - 0.5) * CARD_WIDTH,
      cardGroup.position.y + (Math.random() - 0.5) * CARD_HEIGHT,
      cardGroup.position.z + (Math.random() - 0.5) * 50
    );
  }

  sparksGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  sparksMaterial.opacity = 1;

  // Fade out sparks
  gsap.to(sparksMaterial, {
    duration: SPARK_LIFE / 1000,
    opacity: 0,
    ease: "power2.out"
  });
}

/* ---------- 13. PARALLAX CONTROLS ---------- */
let targetRotX = 0, targetRotY = 0;

// Mouse parallax
window.addEventListener('mousemove', (e) => {
  targetRotX = (e.clientY / window.innerHeight - 0.5) * 0.1;
  targetRotY = (e.clientX / window.innerWidth - 0.5) * 0.1;
});

// Touch parallax
window.addEventListener('touchmove', (e) => {
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    targetRotX = (touch.clientY / window.innerHeight - 0.5) * 0.1;
    targetRotY = (touch.clientX / window.innerWidth - 0.5) * 0.1;
  }
}, { passive: true });

// Gyroscope (iOS/Safari)
if (window.DeviceOrientationEvent) {
  const handleOrientation = (e) => {
    targetRotX = (e.beta || 0) * 0.001;
    targetRotY = -(e.gamma || 0) * 0.001;
  };

  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    // iOS 13+ permission request
    document.addEventListener('touchstart', () => {
      DeviceOrientationEvent.requestPermission()
        .then(response => {
          if (response === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
            console.log('📱 Gyroscope enabled');
          }
        });
    }, { once: true });
  } else {
    window.addEventListener('deviceorientation', handleOrientation);
  }
}

function updateParallax() {
  camera.rotation.x += (targetRotX - camera.rotation.x) * 0.05;
  camera.rotation.y += (targetRotY - camera.rotation.y) * 0.05;
}

/* ---------- 14. INTERACTION CONTROLS ---------- */
// Tap/click to trigger bounce effect
document.addEventListener('click', () => {
  onBounce();
});

// Keyboard controls
document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case ' ': // Spacebar
      e.preventDefault();
      onBounce();
      break;
    case 'r': // Reset
    case 'R':
      init();
      break;
    case 'ArrowUp':
      velocity.y = Math.abs(velocity.y);
      break;
    case 'ArrowDown':
      velocity.y = -Math.abs(velocity.y);
      break;
    case 'ArrowLeft':
      velocity.x = -Math.abs(velocity.x);
      break;
    case 'ArrowRight':
      velocity.x = Math.abs(velocity.x);
      break;
  }
});

/* ---------- 15. RESPONSIVE HANDLING ---------- */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.resolution.set(window.innerWidth, window.innerHeight);
});

/* ---------- 16. START THE SHOW ---------- */
// Wait a moment for textures to potentially load, then start
setTimeout(init, 500);

console.log('🎮 DVD Screensaver Controls:');
console.log('  • Click/Tap: Trigger bounce effect');
console.log('  • Spacebar: Trigger bounce effect');
console.log('  • R: Reset position');
console.log('  • Arrow keys: Change direction');
console.log('  • Mouse/Touch: Parallax camera');
