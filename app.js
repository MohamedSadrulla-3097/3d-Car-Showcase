import * as THREE from 'https://cdn.skypack.dev/three@0.129.0/build/three.module.js';
import { OrbitControls }
  from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader }
  from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader }
  from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/RGBELoader.js';
import TWEEN from 'https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@18.6.4/dist/tween.esm.js';

// -------------------- BASIC SETUP --------------------

let canvasform = document.getElementById('dCanvas');
let width = canvasform.offsetWidth;
let height = canvasform.offsetHeight;

let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(65, width / height, 0.9, 1000);

let object;
let loader = new GLTFLoader();

// Renderer
let renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
canvasform.appendChild(renderer.domElement);

// High quality renderer settings
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.physicallyCorrectLights = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.45;

// Camera start position
camera.position.set(6, 2, 6);

// ---------------------------------------------------------
//               HDRI ENVIRONMENT (REALISM BOOST)
// ---------------------------------------------------------

const pmrem = new THREE.PMREMGenerator(renderer);

new RGBELoader().load(
  "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr",
  (texture) => {
    const envMap = pmrem.fromEquirectangular(texture).texture;
    scene.environment = envMap;
    texture.dispose();
    console.log("HDRI Loaded ✔");
  }
);

// ---------------------------------------------------------
//               LIGHTING (TRUE STUDIO GRADE)
// ---------------------------------------------------------

// Soft fill
let ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambientLight);

// Strong key light
let keyLight = new THREE.DirectionalLight(0xf, 0.0);
keyLight.position.set(0, 0, 0);
keyLight.castShadow = true;
scene.add(keyLight);

// Rim light for edges
let rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
rimLight.position.set(-10, 6, -4);
scene.add(rimLight);

// Bounce floor light
let bounceLight = new THREE.DirectionalLight(0xffffff, 0.9);
bounceLight.position.set(0, -5, 0);
scene.add(bounceLight);

// ---------------------------------------------------------
//               ORBIT CONTROLS
// ---------------------------------------------------------

let controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.04;
controls.minDistance = 7;
controls.maxDistance = 9;
controls.maxPolarAngle = Math.PI / 2.5;
controls.minPolarAngle = Math.PI / 3.0;

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
  TWEEN.update();
}
animate();

// ---------------------------------------------------------
//               NORMALIZE CAR SIZE
// ---------------------------------------------------------
function normalizeModel(model, targetSize = 8) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);

  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = targetSize / maxDim;

  model.scale.setScalar(scale);

  const newBox = new THREE.Box3().setFromObject(model);
  const center = newBox.getCenter(new THREE.Vector3());
  model.position.sub(center);
}

// ---------------------------------------------------------
//               CAR DATA ARRAYS
// ---------------------------------------------------------

const carNames = [
  "M 5-SERIES",
  "REVUELTO",
  "GT3 RS",
  "SKYLINE R34",
  "SRT HELLCAT"
];

const carLogo = [
  "Pictures/bmwLogo.png",
  "Pictures/lamborghiniLogo.png",
  "Pictures/porscheLogo.png",
  "Pictures/nissanLogo.png",
  "Pictures/dodgeLogo.png"
];

// FULLY EDITABLE SPEC SYSTEM
const carSpecs = [
  { price: "₹2.01 Crore", speed: "250 km/h", power: "600 HP", gearbox: "8-Speed Auto" },
  { price: "₹8.89 Crore", speed: "447 km/h", power: "1160 HP", gearbox: "7-Speed DCT" },
  { price: "₹3.51 Crore", speed: "310 km/h", power: "520 HP", gearbox: "7-Speed PDK" },
  { price: "₹26 Lakhs", speed: "260 km/h", power: "450 HP", gearbox: "6-Speed Manual" },
  { price: "₹48 Lakhs", speed: "327 km/h", power: "717 HP", gearbox: "8-Speed Auto" }
];

const cars = [
  'Car3Dmodels/bmw.glb',
  'Car3Dmodels/lamborghini.glb',
  'Car3Dmodels/porsche.glb',
  'Car3Dmodels/R34.glb',
  'Car3Dmodels/srt.glb'
];

let carIndex = 0;

// ---------------------------------------------------------
//               LOAD CAR FUNCTION
// ---------------------------------------------------------

function loadCar(index) {

  // Remove old model + free GPU
  if (object) {
    scene.remove(object);
    object.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else child.material.dispose();
      }
    });
  }

  loader.load(
    cars[index],
    function (gltf) {
      object = gltf.scene;

      normalizeModel(object, 7.5);
      scene.add(object);

      // Update UI elements
      document.getElementById('carName').innerText = carNames[index];
      document.getElementById('carLogo').src = carLogo[index];

      document.getElementById("specPrice").innerText = carSpecs[index].price;
      document.getElementById("specSpeed").innerText = carSpecs[index].speed;
      document.getElementById("specPower").innerText = carSpecs[index].power;
      document.getElementById("specGearbox").innerText = carSpecs[index].gearbox;

      // Enhance materials
      object.traverse((child) => {
        if (child.isMesh) {
          child.material.metalness = 0.5;
          child.material.roughness = 0.18;
          child.material.envMapIntensity = 1.0;
          child.castShadow = true;
        }
      });
    }
  );
}

// Load first car
loadCar(0);

// Buttons
document.getElementById('nextCar').addEventListener('click', () => {
  carIndex = (carIndex + 1) % cars.length;
  loadCar(carIndex);
});

document.getElementById('prevCar').addEventListener('click', () => {
  carIndex = (carIndex - 1 + cars.length) % cars.length;
  loadCar(carIndex);
});
