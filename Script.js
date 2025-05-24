// Import Three.js modules from CDN
// Note: In a real implementation, you'd need to load OrbitControls and loaders separately
// For this example, we'll use basic Three.js functionality and simulate the missing parts

class SplashScreen {
    constructor() {
        this.defaultModelUrl = "https://shaharfullstack.github.io/gltfLoader/goldenLogo.glb";
        
        // DOM elements
        this.container = document.getElementById('canvas-container');
        this.fileInput = document.getElementById('file-input');
        this.loadFileBtn = document.getElementById('load-file-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.errorDisplay = document.getElementById('error-display');
        this.errorMessage = document.getElementById('error-message');
        this.retryBtn = document.getElementById('retry-btn');
        this.enterPrompt = document.getElementById('enter-prompt');
        this.promptText = document.getElementById('prompt-text');
        this.shatteringPrompt = document.getElementById('shattering-prompt');
        this.reassemblingPrompt = document.getElementById('reassembling-prompt');
        
        // Three.js objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.particlesObject = null;
        this.shaderPlane = null;
        this.shaderMaterial = null;
        
        // Animation and state
        this.animationFrameId = null;
        this.lastTime = 0;
        this.autoRotateSpeed = 0.55;
        
        // Particle data
        this.targetPositions = null;
        this.currentPositions = null;
        this.particleData = [];
        
        // State flags
        this.isLoading = true;
        this.error = null;
        this.isAssembled = false;
        this.isShattering = false;
        this.isReassembling = false;
        this.showEnterPrompt = false;
        this.hasShattered = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.initThreeJS();
        this.loadDefaultModel();
    }
    
    setupEventListeners() {
        this.loadFileBtn.addEventListener('click', () => this.fileInput.click());
        this.resetBtn.addEventListener('click', () => this.loadDefaultModel());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.retryBtn.addEventListener('click', () => {
            this.setError(null);
            this.loadDefaultModel();
        });
        
        this.container.addEventListener('click', () => this.handleClick());
        this.container.addEventListener('touchstart', () => this.handleClick(), { passive: true });
        
        window.addEventListener('resize', () => this.handleWindowResize());
    }
    
    initThreeJS() {
        if (!this.container) return;
        
        // Scene
        this.scene = new THREE.Scene();
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x000000, 0);
        this.container.appendChild(this.renderer.domElement);
        
        // Lighting
        this.scene.add(new THREE.AmbientLight(0xffffff, 1.6));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
        dirLight.position.set(2, 0, 2.5);
        this.scene.add(dirLight);
        
        // Basic orbit controls simulation (simplified)
        this.setupBasicControls();
        
        this.lastTime = Date.now();
        this.startAnimation();
    }
    
    setupBasicControls() {
        // Simplified orbit controls - just mouse rotation around model
        let isMouseDown = false;
        let mouseX = 0;
        let mouseY = 0;
        let rotationX = 0;
        let rotationY = 0;
        
        this.container.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            mouseX = e.clientX;
            mouseY = e.clientY;
        });
        
        this.container.addEventListener('mousemove', (e) => {
            if (!isMouseDown) return;
            
            const deltaX = e.clientX - mouseX;
            const deltaY = e.clientY - mouseY;
            
            rotationY += deltaX * 0.01;
            rotationX += deltaY * 0.01;
            
            if (this.particlesObject && this.isAssembled && !this.isShattering && !this.isReassembling) {
                this.particlesObject.rotation.y = rotationY;
                this.particlesObject.rotation.x = rotationX;
            }
            
            mouseX = e.clientX;
            mouseY = e.clientY;
        });
        
        this.container.addEventListener('mouseup', () => {
            isMouseDown = false;
        });
    }
    
    createParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
    
    createShaderBackground() {
        if (!this.scene) return;
        
        const fragmentShader = `
            uniform float time;
            uniform vec2 resolution;
            
            void main() {
                vec2 FC = gl_FragCoord.xy;
                vec2 r = resolution;
                vec4 o = vec4(0.0);
                float t = time * 0.5;
                float z_dist = 0.0;
                
                for(float i = 0.0, d_val; i < 100.0; i++) {
                    vec3 l = normalize(vec3(gl_FragCoord.x * 2.0 - r.x, gl_FragCoord.y * 2.0 - r.y, gl_FragCoord.z * 2.0 - r.y));
                    vec3 p = z_dist * l + 0.5;
                    p.z -= t;
                    float f_val = max(-p.y, 0.0);
                    p.y += f_val + f_val;
                    
                    for(d_val = 1.0; d_val < 30.0; d_val += d_val) {
                        p += cos(p * d_val - z_dist * 0.1).yzx / d_val;
                    }
                    
                    z_dist += d_val = (f_val + 5.0 * length(sin(p.xy)) / (0.5 + f_val)) / 100.0;
                    o.rgb += l / d_val / z_dist;
                }
                
                o = tanh(o / 1000.0);
                o.rgb *= vec3(0.8, 0.4, 1.2);
                o.a = 1.0;
                
                gl_FragColor = o;
            }
        `;
        
        const vertexShader = `
            varying vec2 vUv;
            
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;
        
        this.shaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 },
                resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
            },
            vertexShader,
            fragmentShader,
            side: THREE.DoubleSide,
        });
        
        const geometry = new THREE.PlaneGeometry(100, 100);
        this.shaderPlane = new THREE.Mesh(geometry, this.shaderMaterial);
        this.shaderPlane.position.z = -50;
        this.shaderPlane.renderOrder = -1;
        
        this.scene.add(this.shaderPlane);
    }
    
    // Simplified model loading (creates a basic geometric shape as placeholder)
    createPlaceholderModel() {
        const geometry = new THREE.IcosahedronGeometry(2, 2);
        const vertices = geometry.attributes.position.array;
        const collectedVertices = [];
        
        for (let i = 0; i < vertices.length; i += 3) {
            collectedVertices.push(vertices[i], vertices[i + 1], vertices[i + 2]);
        }
        
        this.processVertices(collectedVertices);
    }
    
    processVertices(collectedVertices) {
        if (collectedVertices.length === 0) {
            this.setError('Model contains no vertices.');
            this.setIsLoading(false);
            return;
        }
        
        this.targetPositions = new Float32Array(collectedVertices);
        this.currentPositions = new Float32Array(this.targetPositions);
        this.particleData = Array(this.targetPositions.length / 3).fill(null).map((_, i) => ({
            velocity: new THREE.Vector3(),
            originalTarget: new THREE.Vector3(
                this.targetPositions[i * 3],
                this.targetPositions[i * 3 + 1],
                this.targetPositions[i * 3 + 2]
            )
        }));
        
        const particleGeometry = new THREE.BufferGeometry();
        const particleCount = this.targetPositions.length / 3;
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const colorIndex = Math.random();
            colors[i * 3 + 0] = 0.5 + colorIndex * 0.8;
            colors[i * 3 + 1] = 0.1 + colorIndex * 0.5;
            colors[i * 3 + 2] = 0.6 + colorIndex * 0.1;
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.currentPositions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const particleTexture = this.createParticleTexture();
        const particleMaterial = new THREE.PointsMaterial({
            size: 0.075,
            sizeAttenuation: true,
            map: particleTexture,
            transparent: true,
            opacity: 0.95,
            vertexColors: true,
            depthTest: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        this.particlesObject = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(this.particlesObject);
        
        this.createShaderBackground();
        
        // Position camera
        const modelBB = new THREE.Box3().setFromArray(this.targetPositions);
        const modelSize = modelBB.getSize(new THREE.Vector3()).length();
        const modelCenter = modelBB.getCenter(new THREE.Vector3());
        
        if (this.camera) {
            this.camera.position.set(modelCenter.x, modelCenter.y, modelCenter.z + modelSize * 0.75);
            this.camera.lookAt(modelCenter);
        }
        
        this.setIsLoading(false);
        this.setIsAssembled(true);
        setTimeout(() => this.setShowEnterPrompt(true), 1000);
    }
    
    loadDefaultModel() {
        this.setIsLoading(true);
        this.setError(null);
        this.setHasShattered(false);
        this.cleanupPreviousModel();
        
        // For demo purposes, create a placeholder model
        // In real implementation, you'd use GLTFLoader here
        setTimeout(() => {
            this.createPlaceholderModel();
        }, 1000);
    }
    
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!['glb', 'gltf', 'fbx'].includes(fileExtension)) {
            this.setError('Please select a GLB, GLTF, or FBX file.');
            return;
        }
        
        this.setIsLoading(true);
        this.setError(null);
        this.setHasShattered(false);
        this.cleanupPreviousModel();
        
        // For demo purposes, create a placeholder model
        // In real implementation, you'd load the actual file here
        setTimeout(() => {
            this.createPlaceholderModel();
        }, 1000);
    }
    
    cleanupPreviousModel() {
        if (this.particlesObject && this.scene) {
            this.scene.remove(this.particlesObject);
            if (this.particlesObject.geometry) this.particlesObject.geometry.dispose();
            if (this.particlesObject.material) this.particlesObject.material.dispose();
            this.particlesObject = null;
        }
        
        if (this.shaderPlane && this.scene) {
            this.scene.remove(this.shaderPlane);
            if (this.shaderPlane.geometry) this.shaderPlane.geometry.dispose();
            this.shaderPlane = null;
        }
        
        if (this.shaderMaterial) {
            this.shaderMaterial.dispose();
            this.shaderMaterial = null;
        }
        
        this.targetPositions = null;
        this.currentPositions = null;
        this.particleData = [];
        this.setIsAssembled(false);
        this.setHasShattered(false);
        this.setIsShattering(false);
        this.setIsReassembling(false);
        this.setShowEnterPrompt(false);
    }
    
    handleClick() {
        if (this.isAssembled && !this.isShattering && !this.isReassembling && this.particlesObject) {
            this.startShatterEffect();
        } else if (this.hasShattered && !this.isShattering && !this.isReassembling) {
            this.startReassembleEffect();
        }
    }
    
    startShatterEffect() {
        this.setIsAssembled(false);
        this.setIsShattering(true);
        this.setShowEnterPrompt(false);
        this.setHasShattered(true);
        
        if (!this.targetPositions || this.particleData.length === 0) {
            this.setIsShattering(false);
            this.setHasShattered(false);
            return;
        }
        
        const modelBoundingBox = new THREE.Box3().setFromArray(this.targetPositions);
        const modelCenter = modelBoundingBox.getCenter(new THREE.Vector3());
        
        for (let i = 0; i < this.particleData.length; i++) {
            const pData = this.particleData[i];
            const pos = pData.originalTarget;
            const direction = new THREE.Vector3().subVectors(pos, modelCenter).normalize();
            const speed = 1 + Math.random() * 5.2;
            pData.velocity.copy(direction).multiplyScalar(speed);
            pData.velocity.y += (Math.random() - 0.5) * 4.5;
            pData.velocity.x += (Math.random() - 0.5) * 4.5;
            pData.velocity.z += (Math.random() - 0.5) * 4.5;
        }
        
        setTimeout(() => {
            this.setIsShattering(false);
            if (!this.isReassembling) {
                this.setShowEnterPrompt(true);
            }
        }, 3000);
    }
    
    startReassembleEffect() {
        this.setIsAssembled(false);
        this.setIsShattering(true);
        this.setIsReassembling(false);
        this.setShowEnterPrompt(false);
        
        if (!this.targetPositions || this.particleData.length === 0) {
            this.setIsShattering(false);
            return;
        }
        
        const modelBoundingBox = new THREE.Box3().setFromArray(this.targetPositions);
        const modelCenter = modelBoundingBox.getCenter(new THREE.Vector3());
        
        for (let i = 0; i < this.particleData.length; i++) {
            const pData = this.particleData[i];
            const pos = pData.originalTarget;
            const direction = new THREE.Vector3().subVectors(pos, modelCenter).normalize();
            const speed = 0.5 + Math.random() * 2.0;
            pData.velocity.copy(direction).multiplyScalar(speed);
            pData.velocity.y += (Math.random() - 0.5) * 2.0;
            pData.velocity.x += (Math.random() - 0.5) * 2.0;
            pData.velocity.z += (Math.random() - 0.5) * 2.0;
        }
        
        setTimeout(() => {
            this.setIsShattering(false);
            this.setIsReassembling(true);
            this.setHasShattered(false);
            
            if (this.particleData && this.particleData.length > 0) {
                this.particleData.forEach(pData => {
                    pData.velocity.set(0, 0, 0);
                });
            }
        }, 1500);
    }
    
    animateShatterEffect(deltaTime) {
        if (!this.particlesObject || !this.currentPositions || !this.particleData.length) {
            return;
        }
        
        const dampingFactor = 1.2;
        
        for (let i = 0; i < this.particleData.length; i++) {
            const pData = this.particleData[i];
            const effectiveDamping = Math.max(0, 1 - dampingFactor * deltaTime);
            pData.velocity.multiplyScalar(effectiveDamping);
            
            this.currentPositions[i * 3] += pData.velocity.x * deltaTime;
            this.currentPositions[i * 3 + 1] += pData.velocity.y * deltaTime;
            this.currentPositions[i * 3 + 2] += pData.velocity.z * deltaTime;
        }
        
        if (this.particlesObject.geometry.attributes.position) {
            this.particlesObject.geometry.attributes.position.needsUpdate = true;
        }
    }
    
    animateReassembleEffect(deltaTime) {
        if (!this.particlesObject || !this.currentPositions || !this.targetPositions || !this.particleData.length) {
            return;
        }
        
        const reassembleSpeed = 2.5;
        let allReassembled = true;
        
        for (let i = 0; i < this.particleData.length; i++) {
            const currentX = this.currentPositions[i * 3];
            const currentY = this.currentPositions[i * 3 + 1];
            const currentZ = this.currentPositions[i * 3 + 2];
            
            const targetX = this.targetPositions[i * 3];
            const targetY = this.targetPositions[i * 3 + 1];
            const targetZ = this.targetPositions[i * 3 + 2];
            
            const deltaX = targetX - currentX;
            const deltaY = targetY - currentY;
            const deltaZ = targetZ - currentZ;
            
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
            
            if (distance > 0.01) {
                allReassembled = false;
                
                const moveDistance = Math.min(distance, reassembleSpeed * deltaTime);
                const factor = distance === 0 ? 0 : moveDistance / distance;
                
                this.currentPositions[i * 3] += deltaX * factor;
                this.currentPositions[i * 3 + 1] += deltaY * factor;
                this.currentPositions[i * 3 + 2] += deltaZ * factor;
            } else {
                this.currentPositions[i * 3] = targetX;
                this.currentPositions[i * 3 + 1] = targetY;
                this.currentPositions[i * 3 + 2] = targetZ;
            }
        }
        
        if (this.particlesObject.geometry.attributes.position) {
            this.particlesObject.geometry.attributes.position.needsUpdate = true;
        }
        
        if (allReassembled) {
            this.setIsReassembling(false);
            this.setIsAssembled(true);
            setTimeout(() => this.setShowEnterPrompt(true), 500);
        }
    }
    
    startAnimation() {
        this.animationFrameId = requestAnimationFrame(() => this.animationTick());
    }
    
    animationTick() {
        this.animationFrameId = requestAnimationFrame(() => this.animationTick());
        
        const newTime = Date.now();
        const deltaTime = (newTime - this.lastTime) / 1000;
        this.lastTime = newTime;
        
        if (deltaTime <= 0 || deltaTime > 0.5) {
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
            return;
        }
        
        // Auto-rotate when assembled
        if (this.particlesObject && this.isAssembled && !this.isShattering && !this.isReassembling) {
            this.particlesObject.rotation.y -= this.autoRotateSpeed * deltaTime;
        }
        
        // Update shader time
        if (this.shaderMaterial) {
            this.shaderMaterial.uniforms.time.value = newTime * 0.001;
        }
        
        // Run particle animations
        if (this.isShattering) {
            this.animateShatterEffect(deltaTime);
        }
        
        if (this.isReassembling) {
            this.animateReassembleEffect(deltaTime);
        }
        
        // Render the scene
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    handleWindowResize() {
        if (!this.container || !this.camera || !this.renderer) return;
        
        const newWidth = this.container.clientWidth;
        const newHeight = this.container.clientHeight;
        
        this.camera.aspect = newWidth / newHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(newWidth, newHeight);
        
        if (this.shaderMaterial) {
            this.shaderMaterial.uniforms.resolution.value.set(newWidth, newHeight);
        }
    }
    
    // State management methods
    setIsLoading(value) {
        this.isLoading = value;
        this.loadingIndicator.style.display = value ? 'flex' : 'none';
    }
    
    setError(value) {
        this.error = value;
        if (value) {
            this.errorMessage.textContent = typeof value === 'string' ? value : 
                (value && typeof value.message === 'string') ? value.message : 
                'An unexpected error occurred. Check the console.';
            this.errorDisplay.style.display = 'flex';
        } else {
            this.errorDisplay.style.display = 'none';
        }
    }
    
    setIsAssembled(value) {
        this.isAssembled = value;
    }
    
    setIsShattering(value) {
        this.isShattering = value;
        this.shatteringPrompt.style.display = value ? 'block' : 'none';
    }
    
    setIsReassembling(value) {
        this.isReassembling = value;
        this.reassemblingPrompt.style.display = value ? 'block' : 'none';
    }
    
    setShowEnterPrompt(value) {
        this.showEnterPrompt = value;
        if (value && !this.isShattering && !this.isReassembling) {
            this.promptText.textContent = this.hasShattered ? 'Click to reassemble' : 'Touch the logo to shatter';
            this.enterPrompt.style.display = 'block';
        } else {
            this.enterPrompt.style.display = 'none';
        }
    }
    
    setHasShattered(value) {
        this.hasShattered = value;
        if (this.showEnterPrompt && !this.isShattering && !this.isReassembling) {
            this.promptText.textContent = value ? 'Click to reassemble' : 'Touch the logo to shatter';
        }
    }
    
    // Cleanup method
    cleanup() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        this.container.removeEventListener('click', this.handleClick);
        this.container.removeEventListener('touchstart', this.handleClick);
        window.removeEventListener('resize', this.handleWindowResize);
        
        this.cleanupPreviousModel();
        
        if (this.renderer) {
            this.renderer.dispose();
            if (this.container && this.renderer.domElement && this.container.contains(this.renderer.domElement)) {
                try {
                    this.container.removeChild(this.renderer.domElement);
                } catch (e) {
                    console.warn("Cleanup DOM error", e);
                }
            }
        }
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.splashScreen = new SplashScreen();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.splashScreen) {
        window.splashScreen.cleanup();
    }
});
