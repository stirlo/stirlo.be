/* ---------- 0.  ES-MODULE IMPORTS  ---------- */
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

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ---------- 1.  CONFIG  ---------- */
const DAMPING       = 0.95;
const MIN_SPEED     = 2;
const EXTRUDE_DEPTH = 4;
const SPARK_LIFE    = 600;
const HALF_W        = 512 / 2;
const HALF_H        = 288 / 2;

/* ---------- 2.  THREE BASICS  ---------- */
const scene    = new Scene();
const camera   = new PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);
const renderer = new WebGLRenderer({
  canvas: document.getElementById('dvdCanvas'),
  antialias: true,
  alpha: true
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);

/* ---------- 3.  CARD MESH  ---------- */
const textureLoader = new TextureLoader();
const cardTexture   = textureLoader.load('bizCardFront.png', init);
cardTexture.colorSpace = SRGBColorSpace;

const cardMat = new MeshStandardMaterial({
  map: cardTexture,
  metalness: 0.1,
  roughness: 0.4,
  emissive: 0x000000
});

const shape = new Shape()
  .moveTo(-HALF_W, -HALF_H)
  .lineTo( HALF_W, -HALF_H)
  .lineTo( HALF_W,  HALF_H)
  .lineTo(-HALF_W,  HALF_H)
  .closePath();

const geo = new ExtrudeGeometry(shape, { depth: EXTRUDE_DEPTH, bevelEnabled: false });
const cardMesh = new Mesh(geo, cardMat);
scene.add(cardMesh);

/* ---------- 4.  LIGHTING  ---------- */
const light = new DirectionalLight(0xffffff, 1);
light.position.set(-1, 1, 1).normalize();
scene.add(light);
scene.add(new AmbientLight(0x202030));

/* ---------- 5.  POST-PROCESS  ---------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new Vector2(innerWidth, innerHeight), 0.6, 0.4, 0.75));

/* ---------- 6.  PARTICLE SPARKS  ---------- */
const sparksGeo = new BufferGeometry();
const sparksMat = new PointsMaterial({
  color: 0xffffff,
  size: 2,
  transparent: true,
  opacity: 0.9,
  blending: AdditiveBlending,
  depthWrite: false
});
const sparks = new Points(sparksGeo, sparksMat);
scene.add(sparks);

/* ---------- 7.  PHYSICS STATE  ---------- */
let xSpeed, ySpeed, zRotRate, sparksTimeout;

/* ---------- 8.  INITIALISE  ---------- */
function init() {
  camera.position.z = 1000;
  const angle = MathUtils.randInt(0, 5) * 60 * Math.PI / 180;
  const speed = 4;
  xSpeed = Math.cos(angle) * speed;
  ySpeed = Math.sin(angle) * speed;
  zRotRate = MathUtils.randFloat(-1, 1);
  animate();
}

/* ---------- 9.  MAIN LOOP  ---------- */
function animate() {
  requestAnimationFrame(animate);

  // move
  cardMesh.position.x += xSpeed;
  cardMesh.position.y += ySpeed;
  cardMesh.rotation.z += zRotRate * 0.01;

  // bounce
  const hw = innerWidth / 2, hh = innerHeight / 2;
  if (Math.abs(cardMesh.position.x) > hw - HALF_W) {
    xSpeed *= -DAMPING;
    xSpeed = Math.sign(xSpeed) * Math.max(Math.abs(xSpeed), MIN_SPEED);
    zRotRate = MathUtils.randFloat(-1, 1);
    colorShift(); spawnSparks();
  }
  if (Math.abs(cardMesh.position.y) > hh - HALF_H) {
    ySpeed *= -DAMPING;
    ySpeed = Math.sign(ySpeed) * Math.max(Math.abs(ySpeed), MIN_SPEED);
    zRotRate = MathUtils.randFloat(-1, 1);
    colorShift(); spawnSparks();
  }

  // slow light sweep
  const t = Date.now() * 0.0005;
  light.position.x = Math.cos(t) * 2;
  light.position.y = Math.sin(t) * 2;

  // parallax update
  updateParallax();

  composer.render();
}

/* ---------- 10.  PARALLAX GYRO + MOUSE  ---------- */
let targetRotX = 0, targetRotY = 0;

window.addEventListener('mousemove', e => {
  targetRotX = ((e.clientY / innerHeight) - 0.5) * 30;
  targetRotY = ((e.clientX / innerWidth)  - 0.5) * 30;
});

function enableGyro() {
  if (window.DeviceOrientationEvent) {
    const handler = e => {
      targetRotX =  e.beta  * 0.25;
      targetRotY = -e.gamma * 0.25;
    };
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(granted => granted && window.addEventListener('deviceorientation', handler));
    } else {
      window.addEventListener('deviceorientation', handler);
    }
  }
}
enableGyro();

function updateParallax() {
  const lerp = (a,b,t) => a + (b-a) * 0.05;
  camera.rotation.x = lerp(camera.rotation.x, targetRotX, 0.05);
  camera.rotation.y = lerp(camera.rotation.y, targetRotY, 0.05);
}

/* ---------- 11.  COLOUR SHIFT  ---------- */
function colorShift() {
  const hsl = {};
  cardMat.color.getHSL(hsl);
  const targetH = (hsl.h + 0.1 + Math.random()*0.2) % 1;
  gsap.to(hsl, {
    duration: 0.4,
    h: targetH,
    onUpdate: () => cardMat.color.setHSL(hsl.h, 1, 0.5)
  });
}

/* ---------- 12.  SPARKS  ---------- */
function spawnSparks() {
  const pos = [];
  for (let i = 0; i < 6; i++) {
    pos.push(
      cardMesh.position.x + (Math.random()-0.5)*40,
      cardMesh.position.y + (Math.random()-0.5)*40,
      cardMesh.position.z
    );
  }
  sparksGeo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  sparksMat.opacity = 0.9;
  clearTimeout(sparksTimeout);
  sparksTimeout = setTimeout(() => sparksMat.opacity = 0, SPARK_LIFE);
}

/* ---------- 13.  KEYBOARD  ---------- */
document.addEventListener('keydown', e => {
  const step = 10;
  switch (e.key) {
    case 'ArrowUp':    cardMesh.position.y -= step; break;
    case 'ArrowDown':  cardMesh.position.y += step; break;
    case 'ArrowLeft':  cardMesh.position.x -= step; break;
    case 'ArrowRight': cardMesh.position.x += step; break;
    case 'Home':       init(); break;
  }
});

/* ---------- 14.  RESIZE  ---------- */
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});
