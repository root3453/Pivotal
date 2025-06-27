// Scene setup
const scene = new THREE.Scene();

const width = window.innerWidth;
const height = window.innerHeight;
const aspect = width / height;
const frustumSize = 10;

const fov = 20; // узкий угол обзора, чтобы минимизировать искажения
const aspect = window.innerWidth / window.innerHeight;
const near = 0.1;
const far = 500;

const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.set(2, 8, 3);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(width, height);
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(0, 30, 10);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 8192;
directionalLight.shadow.mapSize.height = 8192;
directionalLight.shadow.radius = 80;
scene.add(directionalLight);

// Mouse variables
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
let spacingFactor = 0;
let targetRotationY = 0;
let baseCardY = 0;

let model;
const cardData = [];

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
        model.rotation.y = -0.8;
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

        sortedCards.sort((a, b) => {
            const numA = parseInt(a.name.split('_')[1]);
            const numB = parseInt(b.name.split('_')[1]);
            return numA - numB;
        });

        const totalCards = sortedCards.length;
        const centerIndex = 4; // Оранжевая карточка — Card_5, индекс с нуля

        for (let i = 0; i < totalCards; i++) {
            const mesh = sortedCards[i];
            const baseY = mesh.position.y;

            const distanceFromCenter = Math.abs(i - centerIndex);
            const spacingMultiplier = distanceFromCenter / centerIndex; // 1 у крайних, 0 у оранжевой

            cardData.push({
                mesh,
                baseY,
                spacingMultiplier,
                targetYRotation: 0,
                currentYRotation: 0,
                delay: Math.random() * 300 + 200, // 200 - 500 мс задержка
                speed: Math.random() * 0.05 + 0.05
            });

            if (i === centerIndex) {
                baseCardY = baseY;
            }
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
    const mouseY = event.clientY;
    const mouseX = event.clientX;

    const modelScreenY = window.innerHeight / 2;
    const maxDistanceY = window.innerHeight / 2;
    const distanceY = Math.min(Math.abs(mouseY - modelScreenY), maxDistanceY);
    spacingFactor = distanceY / maxDistanceY;

    const normalizedX = (mouseX - windowHalfX) / windowHalfX;
    targetRotationY = -normalizedX * 7 * (Math.PI / 180);
}

// Resize
window.addEventListener('resize', onWindowResize);

function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;

    camera.left = (-frustumSize * aspect) / 2;
    camera.right = (frustumSize * aspect) / 2;
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

            const direction = Math.sign(data.baseY - baseCardY);
            const safeOffsetLimit = Math.abs(data.baseY - baseCardY) * 0.9;
            const rawOffset = direction * spacingFactor * 1.2 * data.spacingMultiplier;
            const offset = Math.max(-safeOffsetLimit, Math.min(rawOffset, safeOffsetLimit));

            mesh.position.y += (data.baseY + offset - mesh.position.y) * 0.1;

            setTimeout(() => {
                const extraYRotation = (spacingFactor > 0.95) ? THREE.MathUtils.degToRad(2) * direction : 0;
                data.targetYRotation = targetRotationY + extraYRotation;
            }, data.delay);

            data.currentYRotation += (data.targetYRotation - data.currentYRotation) * data.speed;
            mesh.rotation.y = data.currentYRotation;

            // Новый поворот по оси Z, чередуем знак через индекс
            const zRotationAmount = spacingFactor * THREE.MathUtils.degToRad(2);
            const zSign = (i % 2 === 0) ? 1 : -1;
            mesh.rotation.z = zRotationAmount * zSign;
        }
    }

    renderer.render(scene, camera);
}



animate();
