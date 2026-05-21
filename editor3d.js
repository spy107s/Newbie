// 3D Voxel Editor Logic using Three.js

class VoxelEditor3D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.gridSize = 16; // default 16x16x16
        this.voxels = new Map(); // Key: 'x,y,z', Value: { mesh, color: {r, g, b} }
        this.currentTool = 'add'; // add, delete, paint
        this.currentColor = { r: 255, g: 75, b: 75 }; // Default Red

        // Three.js Core components
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // Raycasting and drawing helpers
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Interaction checks
        this.mouseDownPos = { x: 0, y: 0 };
        this.dragThreshold = 5; // pixels to distinguish click from camera rotation drag

        // Visual helper objects
        this.plane = null; // Raycast plane helper
        this.gridHelper = null;
        this.boxHelper = null; // Box outline of the grid bounds

        // Materials cache
        this.materials = new Map(); // Key: 'r,g,b', Value: MeshStandardMaterial

        this.initThree();
        this.createGridHelpers();
        this.animate();
        this.initEvents();
    }

    initThree() {
        const width = this.container.clientWidth || 500;
        const height = this.container.clientHeight || 500;

        // 1. Create Scene & Camera
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#0d111a');

        this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
        this.resetCamera();

        // 2. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // 3. Orbit Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.maxPolarAngle = Math.PI / 2; // prevent camera from going below ground

        // 4. Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // Main directional light (acting like sun)
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(20, 40, 20);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        this.scene.add(dirLight);

        // Secondary soft filler light
        const fillLight = new THREE.DirectionalLight(0x90b0ff, 0.3);
        fillLight.position.set(-20, 20, -20);
        this.scene.add(fillLight);

        // Resize Listener
        window.addEventListener('resize', () => this.handleResize());
    }

    resetCamera() {
        this.camera.position.set(this.gridSize * 1.5, this.gridSize * 1.8, this.gridSize * 2.2);
        this.camera.lookAt(new THREE.Vector3(this.gridSize / 2, this.gridSize / 3, this.gridSize / 2));
        if (this.controls) {
            this.controls.target.set(this.gridSize / 2, this.gridSize / 3, this.gridSize / 2);
            this.controls.update();
        }
    }

    createGridHelpers() {
        // Clear previous helpers
        if (this.gridHelper) this.scene.remove(this.gridHelper);
        if (this.boxHelper) this.scene.remove(this.boxHelper);
        if (this.plane) this.scene.remove(this.plane);

        // A helper grid resting on the floor (y = 0)
        this.gridHelper = new THREE.GridHelper(this.gridSize, this.gridSize, '#00ffff', '#1e293b');
        this.gridHelper.position.set(this.gridSize / 2, 0, this.gridSize / 2);
        this.scene.add(this.gridHelper);

        // Visual bounding box outline of the voxel workspace
        const geometry = new THREE.BoxGeometry(this.gridSize, this.gridSize, this.gridSize);
        const edges = new THREE.EdgesGeometry(geometry);
        this.boxHelper = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x334155 }));
        this.boxHelper.position.set(this.gridSize / 2, this.gridSize / 2, this.gridSize / 2);
        this.scene.add(this.boxHelper);

        // Infinite invisible plane helper for initial raycasting (placing voxels on the floor)
        const planeGeo = new THREE.PlaneGeometry(1000, 1000);
        planeGeo.rotateX(-Math.PI / 2);
        this.plane = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ visible: false }));
        this.scene.add(this.plane);
    }

    initEvents() {
        this.renderer.domElement.addEventListener('mousedown', (e) => {
            this.mouseDownPos = { x: e.clientX, y: e.clientY };
        });

        this.renderer.domElement.addEventListener('mouseup', (e) => {
            const dx = e.clientX - this.mouseDownPos.x;
            const dy = e.clientY - this.mouseDownPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // If user did not drag, it's a click to build
            if (dist < this.dragThreshold) {
                this.handleVoxelClick(e);
            }
        });
    }

    handleResize() {
        if (!this.container || !this.renderer) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.controls) this.controls.update();
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    setTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('#workspace-3d .tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.getElementById(`tool-voxel-${tool}`);
        if (activeBtn) activeBtn.classList.add('active');
    }

    changeSize(newSize) {
        this.gridSize = parseInt(newSize);
        this.clearVoxels();
        this.createGridHelpers();
        this.resetCamera();
    }

    getSharedMaterial(r, g, b) {
        const key = `${r},${g},${b}`;
        if (!this.materials.has(key)) {
            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(`rgb(${r}, ${g}, ${b})`),
                roughness: 0.7,
                metalness: 0.1,
                flatShading: true
            });
            this.materials.set(key, material);
        }
        return this.materials.get(key);
    }

    // Main build click logic
    handleVoxelClick(e) {
        // Map mouse position to normalized screen coordinates (-1 to +1)
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Get intersection list
        const voxelMeshes = Array.from(this.voxels.values()).map(v => v.mesh);
        const targets = [...voxelMeshes, this.plane];
        const intersects = this.raycaster.intersectObjects(targets);

        if (intersects.length > 0) {
            const intersect = intersects[0];
            const voxelGeometry = new THREE.BoxGeometry(0.99, 0.99, 0.99); // slight spacing gap looks cool

            // 1. ADD VOXEL
            if (this.currentTool === 'add') {
                // Calculate coordinate of the voxel cell (using intersection normal)
                const position = new THREE.Vector3();
                position.copy(intersect.point).add(intersect.face.normal);
                
                const vx = Math.floor(position.x);
                const vy = Math.floor(position.y);
                const vz = Math.floor(position.z);

                // Boundary check
                if (vx >= 0 && vx < this.gridSize && vy >= 0 && vy < this.gridSize && vz >= 0 && vz < this.gridSize) {
                    const key = `${vx},${vy},${vz}`;
                    if (!this.voxels.has(key)) {
                        const mat = this.getSharedMaterial(this.currentColor.r, this.currentColor.g, this.currentColor.b);
                        const mesh = new THREE.Mesh(voxelGeometry, mat);
                        
                        // Shift half unit to align with grid lines
                        mesh.position.set(vx + 0.5, vy + 0.5, vz + 0.5);
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;
                        
                        this.scene.add(mesh);
                        this.voxels.set(key, { mesh, color: { ...this.currentColor } });
                    }
                }
            } 
            // 2. DELETE VOXEL
            else if (this.currentTool === 'delete') {
                // Only delete if we clicked an actual voxel, not the floor plane helper
                if (intersect.object !== this.plane) {
                    // Find key by matching the mesh
                    for (const [key, val] of this.voxels.entries()) {
                        if (val.mesh === intersect.object) {
                            this.scene.remove(val.mesh);
                            val.mesh.geometry.dispose();
                            this.voxels.delete(key);
                            break;
                        }
                    }
                }
            } 
            // 3. PAINT VOXEL COLOR
            else if (this.currentTool === 'paint') {
                if (intersect.object !== this.plane) {
                    for (const [key, val] of this.voxels.entries()) {
                        if (val.mesh === intersect.object) {
                            val.color = { ...this.currentColor };
                            val.mesh.material = this.getSharedMaterial(this.currentColor.r, this.currentColor.g, this.currentColor.b);
                            break;
                        }
                    }
                }
            }
        }
    }

    clearVoxels() {
        for (const [key, val] of this.voxels.entries()) {
            this.scene.remove(val.mesh);
            val.mesh.geometry.dispose();
        }
        this.voxels.clear();
    }

    clear3DSpace() {
        this.clearVoxels();
    }

    // Extrude 2D pixel grid into 3D
    extrudeFrom2D(grid2D) {
        this.clearVoxels();

        const srcSize = grid2D.length;
        const voxelGeometry = new THREE.BoxGeometry(0.99, 0.99, 0.99);

        // Adjust dimensions to fit the 3D grid size
        // If 2D is 32x32 and 3D is 16x16x16, we map the center 16x16 pixels or downscale.
        // For simple extrapolation, let's map pixels exactly but center them inside the 3D space.
        
        const scaleFactor = srcSize > this.gridSize ? srcSize / this.gridSize : 1;
        const thickness = 2; // Extrude 2 voxels thick for nice depth

        for (let y2d = 0; y2d < srcSize; y2d++) {
            for (let x2d = 0; x2d < srcSize; x2d++) {
                const pixel = grid2D[y2d][x2d];
                if (pixel) {
                    // Map coordinate to 3D space:
                    // 2D y goes downwards, 3D y goes upwards (flip Y)
                    const vx = Math.floor(x2d / scaleFactor);
                    const vy = this.gridSize - 1 - Math.floor(y2d / scaleFactor);

                    if (vx >= 0 && vx < this.gridSize && vy >= 0 && vy < this.gridSize) {
                        // Extrude along Z axis (from depth center)
                        const centerZ = Math.floor(this.gridSize / 2);
                        for (let t = 0; t < thickness; t++) {
                            const vz = centerZ - Math.floor(thickness/2) + t;
                            if (vz >= 0 && vz < this.gridSize) {
                                const key = `${vx},${vy},${vz}`;
                                // Place voxel if not occupied
                                if (!this.voxels.has(key)) {
                                    const mat = this.getSharedMaterial(pixel.r, pixel.g, pixel.b);
                                    const mesh = new THREE.Mesh(voxelGeometry, mat);
                                    mesh.position.set(vx + 0.5, vy + 0.5, vz + 0.5);
                                    mesh.castShadow = true;
                                    mesh.receiveShadow = true;
                                    
                                    this.scene.add(mesh);
                                    this.voxels.set(key, { mesh, color: { ...pixel } });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Export raw JSON representing Voxel coordinates
    exportJSON() {
        const voxelData = [];
        for (const [key, val] of this.voxels.entries()) {
            const [x, y, z] = key.split(',').map(Number);
            voxelData.push({ x, y, z, color: val.color });
        }
        return JSON.stringify({
            gridSize: this.gridSize,
            voxels: voxelData
        }, null, 2);
    }

    // Export standard OBJ model string with vertex colors extension
    exportOBJ() {
        let objContent = `# Antigravity 24-bit Voxel Exporter\n`;
        objContent += `# Grid Size: ${this.gridSize}\n\n`;

        let vertexCount = 0;
        let vText = "";
        let fText = "";

        // Standard Cube corners offsets
        const corners = [
            [-0.5, -0.5, -0.5],
            [ 0.5, -0.5, -0.5],
            [ 0.5,  0.5, -0.5],
            [-0.5,  0.5, -0.5],
            [-0.5, -0.5,  0.5],
            [ 0.5, -0.5,  0.5],
            [ 0.5,  0.5,  0.5],
            [-0.5,  0.5,  0.5]
        ];

        // Triangle face index maps for 6 cube faces
        const faces = [
            [1, 2, 3, 4], // Back
            [5, 8, 7, 6], // Front
            [1, 5, 6, 2], // Bottom
            [2, 6, 7, 3], // Right
            [3, 7, 8, 4], // Top
            [4, 8, 5, 1]  // Left
        ];

        // Compile voxels
        for (const [key, val] of this.voxels.entries()) {
            const [x, y, z] = key.split(',').map(Number);
            // Color normalized between 0.0 and 1.0 for Wavefront OBJ vertex color extension
            const r = (val.color.r / 255).toFixed(4);
            const g = (val.color.g / 255).toFixed(4);
            const b = (val.color.b / 255).toFixed(4);

            // 1. Output 8 vertices for this cube
            for (let i = 0; i < 8; i++) {
                const px = (x + 0.5 + corners[i][0]).toFixed(3);
                const py = (y + 0.5 + corners[i][1]).toFixed(3);
                const pz = (z + 0.5 + corners[i][2]).toFixed(3);
                vText += `v ${px} ${py} ${pz} ${r} ${g} ${b}\n`;
            }

            // 2. Output 6 quad faces (as two triangles or directly quads in OBJ)
            const vOffset = vertexCount;
            for (let f = 0; f < 6; f++) {
                const i1 = faces[f][0] + vOffset;
                const i2 = faces[f][1] + vOffset;
                const i3 = faces[f][2] + vOffset;
                const i4 = faces[f][3] + vOffset;
                
                // Directly write quad face
                fText += `f ${i1} ${i2} ${i3} ${i4}\n`;
            }

            vertexCount += 8;
        }

        objContent += vText + "\n" + fText;

        // Trigger file download
        const blob = new Blob([objContent], { type: 'text/plain' });
        const link = document.createElement('a');
        link.download = `voxel-model-${this.gridSize}.obj`;
        link.href = URL.createObjectURL(blob);
        link.click();
    }
}
