/* ========================================
 * 3D BOUNCING BUSINESS CARD SCREENSAVER
 * ========================================
 * A Three.js implementation of a DVD-style screensaver
 * featuring a 3D business card with textures, lighting,
 * particle effects, and responsive controls.
 */

/* ---------- 0. ES-MODULE IMPORTS ---------- */
// Core Three.js components
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  TextureLoader,
  SRGBColorSpace,
  MeshStandardMaterial,
  Shape,
  ExtrudeGeometry,
  Mesh,
  DirectionalLight,
  AmbientLight,
  Vector2,
  MathUtils,
  BufferGeometry,
  PointsMaterial,
  Points,
  Float32BufferAttribute,
  AdditiveBlending
} from 'three';

// Post-processing effects for visual enhancement
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ---------- 1. CONFIGURATION CONSTANTS ---------- */
const DAMPING       = 0.95;   // Speed reduction factor on bounce (0-1)
const MIN_SPEED     = 2;      // Minimum movement speed to prevent stopping
const EXTRUDE_DEPTH = 4;      // Thickness of the 3D card in pixels
const SPARK_LIFE    = 600;    // Duration sparks remain visible (ms)
const HALF_W        = 512 / 2; // Half width of business card
const HALF_H        = 288 / 2; // Half height of business card

/* ---------- 2. THREE.JS SCENE SETUP ---------- */
// Create the main scene container
const scene = new Scene();

// Set up perspective camera (FOV, aspect ratio, near, far clipping planes)
const camera = new PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);

// Create WebGL renderer with anti-aliasing and transparency
const renderer = new WebGLRenderer({
  canvas: document.getElementById('dvdCanvas'),
  antialias: true,    // Smooth edges
  alpha: true         // Transparent background
});

// Configure renderer settings
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio); // Handle high-DPI displays

/* ---------- 3. TEXTURE LOADING & CARD CREATION ---------- */
const textureLoader = new TextureLoader();

// Load front texture with proper error handling
const cardTexture = textureLoader.load(
  './bizCardFront.png', // Fixed path - no '../' needed
  // Success callback
  (texture) => {
    console.log('✅ Front texture loaded successfully');
    init(); // Start the animation once texture is loaded
  },
  // Progress callback (optional)
  undefined,
  // Error callback
  (error) => {
    console.error('❌ Error loading front texture:', error);
    // Fallback: use solid color if texture fails
    cardMaterials[5].map = null;
    cardMaterials[5].color.setHex(0x71ae4f);
    init(); // Still start the animation
  }
);
cardTexture.colorSpace = SRGBColorSpace; // Proper color space for web images

// Load back texture
const backTexture = textureLoader.load(
  './bizcardgreenback.png',
  (texture) => console.log('✅ Back texture loaded successfully'),
  undefined,
  (error) => {
    console.error('❌ Error loading back texture:', error);
    // Fallback for back texture
    cardMaterials[4].map = null;
    cardMaterials[4].color.setHex(0x2d5a2d);
  }
);
backTexture.colorSpace = SRGBColorSpace;

// Create materials for each face of the extruded card
// ExtrudeGeometry creates 6 faces: 4 sides + front + back
const cardMaterials = [
  // Side faces (edges of the card) - dark material
  new MeshStandardMaterial({ color: 0x333333, metalness: 0.1, roughness: 0.4 }),
  new MeshStandardMaterial({ color: 0x333333, metalness: 0.1, roughness: 0.4 }),
  new MeshStandardMaterial({ color: 0x333333, metalness: 0.1, roughness: 0.4 }),
  new MeshStandardMaterial({ color: 0x333333, metalness: 0.1, roughness: 0.4 }),
  // Back face - green texture
  new MeshStandardMaterial({ 
    map: backTexture, 
    metalness: 0.1, 
    roughness: 0.4, 
    emissive: 0x000000 
  }),
  // Front face - business card design
  new MeshStandardMaterial({
    map: cardTexture,
    metalness: 0.1,     // Slight metallic reflection
    roughness: 0.4,     // Surface roughness for realistic lighting
    emissive: 0x000000  // No self-illumination
  })
];

// Create the card shape (rectangle)
const shape = new Shape()
  .moveTo(-HALF_W, -HALF_H) // Bottom-left corner
  .lineTo( HALF_W, -HALF_H) // Bottom-right corner
  .lineTo( HALF_W,  HALF_H) // Top-right corner
  .lineTo(-HALF_W,  HALF_H) // Top-left corner
  .closePath();             // Close the shape

// Extrude the 2D shape into 3D with specified depth
const geo = new ExtrudeGeometry(shape, { 
  depth: EXTRUDE_DEPTH, 
  bevelEnabled: false // No rounded edges
});

// Create the final mesh and add to scene
const cardMesh = new Mesh(geo, cardMaterials);
scene.add(cardMesh);

/* ---------- 4. LIGHTING SETUP ---------- */
// Main directional light (like sunlight)
const light = new DirectionalLight(0xffffff, 1);
light.position.set(-1, 1, 1).normalize();
scene.add(light);

// Ambient light for overall scene illumination
scene.add(new AmbientLight(0x202030, 0.4)); // Dim blue-tinted ambient light

/* ---------- 5. POST-PROCESSING EFFECTS ---------- */
// Set up effect composer for post-processing pipeline
const composer = new EffectComposer(renderer);

// Add basic render pass
composer.addPass(new RenderPass(scene, camera));

// Add bloom effect for glowing appearance
const bloomPass = new UnrealBloomPass(
  new Vector2(innerWidth, innerHeight), // Resolution
  0.6,   // Bloom strength
  0.4,   // Bloom radius
  0.75   // Bloom threshold
);
composer.addPass(bloomPass);

// Add output pass for final rendering
composer.addPass(new OutputPass());

/* ---------- 6. PARTICLE SPARK SYSTEM ---------- */
// Create geometry for spark particles
const sparksGeo = new BufferGeometry();

// Material for sparks with additive blending for glow effect
const sparksMat = new PointsMaterial({
  color: 0xffffff,
  size: 2,
  transparent: true,
  opacity: 0.9,
  blending: AdditiveBlending, // Makes particles glow
  depthWrite: false           // Prevents depth sorting issues
});

// Create particle system and add to scene
const sparks = new Points(sparksGeo, sparksMat);
scene.add(sparks);

/* ---------- 7. PHYSICS & ANIMATION STATE ---------- */
let xSpeed, ySpeed, zRotRate, sparksTimeout;

/* ---------- 8. INITIALIZATION FUNCTION ---------- */
function init() {
  console.log('🚀 Initializing 3D bouncing card...');

  // Position camera back from the card
  camera.position.z = 1000;

  // Set initial random movement direction (0°, 60°, 120°, 180°, 240°, 300°)
  const angle = MathUtils.randInt(0, 5) * 60 * Math.PI / 180;
  const speed = 4;

  // Convert angle to velocity components
  xSpeed = Math.cos(angle) * speed;
  ySpeed = Math.sin(angle) * speed;

  // Random rotation speed
  zRotRate = MathUtils.randFloat(-1, 1);

  // Start the animation loop
  animate();
}

/* ---------- 9. MAIN ANIMATION LOOP ---------- */
function animate() {
  // Schedule next frame
  requestAnimationFrame(animate);

  // === MOVEMENT ===
  // Update card position based on velocity
  cardMesh.position.x += xSpeed;
  cardMesh.position.y += ySpeed;

  // Rotate card around Z-axis for visual interest
  cardMesh.rotation.z += zRotRate * 0.01;

  // === COLLISION DETECTION & BOUNCING ===
  const hw = innerWidth / 2;   // Half screen width
  const hh = innerHeight / 2;  // Half screen height

  // Check horizontal boundaries
  if (Math.abs(cardMesh.position.x) > hw - HALF_W) {
    xSpeed *= -DAMPING; // Reverse and dampen speed
    // Ensure minimum speed to prevent card from getting stuck
    xSpeed = Math.sign(xSpeed) * Math.max(Math.abs(xSpeed), MIN_SPEED);
    zRotRate = MathUtils.randFloat(-1, 1); // New random rotation
    colorShift(); // Change color on bounce
    spawnSparks(); // Create particle effect
  }

  // Check vertical boundaries
  if (Math.abs(cardMesh.position.y) > hh - HALF_H) {
    ySpeed *= -DAMPING; // Reverse and dampen speed
    // Ensure minimum speed to prevent card from getting stuck
    ySpeed = Math.sign(ySpeed) * Math.max(Math.abs(ySpeed), MIN_SPEED);
    zRotRate = MathUtils.randFloat(-1, 1); // New random rotation
    colorShift(); // Change color on bounce
    spawnSparks(); // Create particle effect
  }

  // === DYNAMIC LIGHTING ===
  // Slowly move the light source for dynamic shadows
  const t = Date.now() * 0.0005; // Time-based animation
  light.position.x = Math.cos(t) * 2;
  light.position.y = Math.sin(t) * 2;

  // === CAMERA PARALLAX ===
  updateParallax();

  // === RENDER FRAME ===
  composer.render(); // Use post-processing pipeline
}

/* ---------- 10. PARALLAX CAMERA CONTROL ---------- */
let targetRotX = 0, targetRotY = 0; // Target camera rotation values

// === MOUSE PARALLAX ===
window.addEventListener('mousemove', (e) => {
  // Convert mouse position to rotation angles (-15° to +15°)
  targetRotX = ((e.clientY / innerHeight) - 0.5) * 30 * Math.PI / 180;
  targetRotY = ((e.clientX / innerWidth)  - 0.5) * 30 * Math.PI / 180;
});

// === GYROSCOPE PARALLAX (Mobile) ===
function enableGyro() {
  if (window.DeviceOrientationEvent) {
    const handler = (e) => {
      // Convert device orientation to camera rotation
      // Beta: front-to-back tilt, Gamma: left-to-right tilt
      targetRotX =  e.beta  * 0.25 * Math.PI / 180;
      targetRotY = -e.gamma * 0.25 * Math.PI / 180;
    };

    // Request permission on iOS 13+
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(response => {
          if (response === 'granted') {
            window.addEventListener('deviceorientation', handler);
            console.log('📱 Gyroscope enabled');
          }
        })
        .catch(console.error);
    } else {
      // Direct access on other devices
      window.addEventListener('deviceorientation', handler);
      console.log('📱 Gyroscope enabled');
    }
  }
}

// Enable gyroscope on page load
enableGyro();

// === SMOOTH CAMERA INTERPOLATION ===
function updateParallax() {
  // Smoothly interpolate camera rotation towards target
  const lerp = (current, target, factor) => current + (target - current) * factor;
  camera.rotation.x = lerp(camera.rotation.x, targetRotX, 0.05);
  camera.rotation.y = lerp(camera.rotation.y, targetRotY, 0.05);
}

/* ---------- 11. COLOR SHIFTING EFFECT ---------- */
function colorShift() {
  // Get current color in HSL format
  const hsl = {};
  cardMaterials[5].color.getHSL(hsl);

  // Calculate new hue (shift by 36-72 degrees)
  const targetH = (hsl.h + 0.1 + Math.random() * 0.2) % 1;

  // Animate color change using GSAP
  gsap.to(hsl, {
    duration: 0.4,
    h: targetH,
    onUpdate: () => {
      // Apply new color during animation
      cardMaterials[5].color.setHSL(hsl.h, 1, 0.5);
    }
  });
}

/* ---------- 12. PARTICLE SPARK EFFECTS ---------- */
function spawnSparks() {
  // Create random spark positions around the card
  const positions = [];
  for (let i = 0; i < 6; i++) {
    positions.push(
      cardMesh.position.x + (Math.random() - 0.5) * 40, // X position
      cardMesh.position.y + (Math.random() - 0.5) * 40, // Y position
      cardMesh.position.z                                // Z position (same as card)
    );
  }

  // Update spark geometry with new positions
  sparksGeo.setAttribute('position', new Float32BufferAttribute(positions, 3));

  // Make sparks visible
  sparksMat.opacity = 0.9;

  // Clear any existing timeout
  clearTimeout(sparksTimeout);

  // Hide sparks after specified lifetime
  sparksTimeout = setTimeout(() => {
    sparksMat.opacity = 0;
  }, SPARK_LIFE);
}

/* ---------- 13. KEYBOARD CONTROLS ---------- */
document.addEventListener('keydown', (e) => {
  const step = 10; // Movement step size

  switch (e.key) {
    case 'ArrowUp':    
      cardMesh.position.y -= step; 
      break;
    case 'ArrowDown':  
      cardMesh.position.y += step; 
      break;
    case 'ArrowLeft':  
      cardMesh.position.x -= step; 
      break;
    case 'ArrowRight': 
      cardMesh.position.x += step; 
      break;
    case 'Home':       
      init(); // Reset to initial state
      break;
    case ' ': // Spacebar
      e.preventDefault();
      colorShift(); // Manual color change
      spawnSparks(); // Manual spark effect
      break;
  }
});

/* ---------- 14. RESPONSIVE WINDOW HANDLING ---------- */
window.addEventListener('resize', () => {
  console.log('📱 Window resized');

  // Update camera aspect ratio
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();

  // Update renderer size
  renderer.setSize(innerWidth, innerHeight);

  // Update post-processing composer size
  composer.setSize(innerWidth, innerHeight);

  // Update bloom pass resolution
  bloomPass.resolution.set(innerWidth, innerHeight);
});

/* ---------- 15. TOUCH CONTROLS (Mobile) ---------- */
let touchStartX = 0, touchStartY = 0;

// Handle touch start
document.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
}, { passive: true });

// Handle touch move for parallax
document.addEventListener('touchmove', (e) => {
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    targetRotX = ((touch.clientY / innerHeight) - 0.5) * 30 * Math.PI / 180;
    targetRotY = ((touch.clientX / innerWidth)  - 0.5) * 30 * Math.PI / 180;
  }
}, { passive: true });

// Handle touch end for interactions
document.addEventListener('touchend', (e) => {
  if (e.changedTouches.length === 1) {
    const touch = e.changedTouches[0];
    const deltaX = Math.abs(touch.clientX - touchStartX);
    const deltaY = Math.abs(touch.clientY - touchStartY);

    // If it was a tap (minimal movement)
    if (deltaX < 10 && deltaY < 10) {
      colorShift();
      spawnSparks();
    }
  }
}, { passive: true });

// Log successful initialization
console.log('🎮 3D Business Card Screensaver loaded!');
console.log('Controls:');
console.log('  • Arrow keys: Move card manually');
console.log('  • Home key: Reset position');
console.log('  • Spacebar: Color shift + sparks');
console.log('  • Mouse/Touch: Parallax camera');
console.log('  • Tap/Click: Color shift + sparks');
