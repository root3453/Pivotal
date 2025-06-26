// Scene setup
const scene = new THREE.Scene();

const width = window.innerWidth;
const height = window.innerHeight;
const aspect = width / height;
const frustumSize = 10;

const camera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    500
);

camera.position.set(2, 8, 3);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.setClearColor(0xffffff);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 4096;
directionalLight.shadow.mapSize.height = 4096;
directionalLight.shadow.radius = 15;
scene.add(directionalLight);

// Mouse variables
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
let spacingFactor = 0;
let targetRotationX = 0;
let targetRotationZ = 0;

let model;
const cardData = []; // Сохраняем карточки, их базовые позиции и расстояния

const loader = new THREE.GLTFLoader();
const dracoLoader = new THREE.DRACOLoader();
dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/libs/draco/');
loader.setDRACOLoader(dracoLoader);

// Load model
loader.load(
  'https://file.garden/aDkw2WzQiQyHQO4K/Pivotal/cards_D_17.glb',
  function (gltf) {
    model = gltf.scene;
    model.scale.set(1, 1, 1);
    scene.add(model);

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    model.rotation.x = -0.2;
    model.rotation.y = -.8;
    model.rotation.z = 0.5;

    const sortedCards = [];

    model.traverse(function (child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (/^Card_\d+$/.test(child.name)) {
          sortedCards.push(child);
        }
      }
    });

    // Сортируем по номеру
    sortedCards.sort((a, b) => {
      const numA = parseInt(a.name.split('_')[1]);
      const numB = parseInt(b.name.split('_')[1]);
      return numA - numB;
    });

    // Сохраняем позиции и расстояния
    for (let i = 0; i < sortedCards.length; i++) {
      const mesh = sortedCards[i];
      const baseY = mesh.position.y;
      let distanceToNext = 0;

      if (i < sortedCards.length - 1) {
        distanceToNext = sortedCards[i + 1].position.y - baseY;
      }

      cardData.push({
        mesh,
        baseY,
        distanceToNext
      });
    }

    document.getElementById('loading').style.display = 'none';
  },
  undefined,
  function (error) {
    console.error('Ошибка загрузки модели:', error);
    document.getElementById('loading').textContent = 'Ошибка загрузки модели';
  }
);

// Mouse move
document.addEventListener('mousemove', onDocumentMouseMove);

function onDocumentMouseMove(event) {
    const normalizedY = (windowHalfY - event.clientY) / windowHalfY;
    spacingFactor = Math.max(normalizedY, 0);
    spacingFactor = Math.min(spacingFactor, 1);

    const normalizedX = (event.clientX - windowHalfX) / windowHalfX;
    targetRotationX = normalizedY * 4 * (Math.PI / 180); 
    targetRotationZ = normalizedX * 4 * (Math.PI / 180); 
}

// Resize
window.addEventListener('resize', onWindowResize);

function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    
    camera.left = -frustumSize * aspect / 2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = -frustumSize / 2;

    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
}

// Animate
function animate() {
    requestAnimationFrame(animate);

    if (cardData.length) {
        for (let i = 0; i < cardData.length; i++) {
            const data = cardData[i];
            const mesh = data.mesh;

            if (i === 0) {
                mesh.position.y = data.baseY;
            } else {
                const prev = cardData[i - 1];
                const baseSpacing = prev.distanceToNext;
                const extraSpacing = baseSpacing * 0.5 * spacingFactor;

                mesh.position.y = prev.mesh.position.y + baseSpacing + extraSpacing;
            }

            mesh.rotation.x += (targetRotationX - mesh.rotation.x) * 0.1;
            mesh.rotation.z += (targetRotationZ - mesh.rotation.z) * 0.1;
        }
    }
    
    renderer.render(scene, camera);
}

animate();

