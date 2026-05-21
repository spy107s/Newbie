// 2D Pixel Art Grid Editor Logic

class PixelEditor2D {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 32;
        this.grid = [];
        this.currentTool = 'pencil'; // pencil, eraser, bucket, picker
        this.currentColor = { r: 255, g: 75, b: 75 }; // Default Red
        this.isDrawing = false;
        
        // History Stacks
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = 20;

        // Visual properties
        this.displaySize = 512; // Visual size in px
        this.pixelSize = this.displaySize / this.gridSize;

        // Initialize grid
        this.clearGridData();
        this.resizeCanvas();
        this.initEvents();
    }

    clearGridData() {
        this.grid = [];
        for (let y = 0; y < this.gridSize; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.gridSize; x++) {
                this.grid[y][x] = null; // null represents transparent
            }
        }
    }

    resizeCanvas() {
        this.canvas.width = this.displaySize;
        this.canvas.height = this.displaySize;
        this.pixelSize = this.displaySize / this.gridSize;
        this.draw();
    }

    initEvents() {
        // Draw interaction events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mouseup', () => this.handleMouseUp());

        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // Save current grid state to undo history
    saveState() {
        // Deep copy of the grid
        const stateCopy = this.grid.map(row => row.map(pixel => pixel ? { ...pixel } : null));
        this.undoStack.push(stateCopy);
        
        // Cap the stack size
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }

        // Clear redo stack on new action
        this.redoStack = [];
    }

    undo() {
        if (this.undoStack.length === 0) return;
        const previousState = this.undoStack.pop();
        this.redoStack.push(this.grid.map(row => row.map(pixel => pixel ? { ...pixel } : null)));
        this.grid = previousState;
        this.draw();
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const nextState = this.redoStack.pop();
        this.undoStack.push(this.grid.map(row => row.map(pixel => pixel ? { ...pixel } : null)));
        this.grid = nextState;
        this.draw();
    }

    setTool(tool) {
        this.currentTool = tool;
        // Update tool button state
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.getElementById(`tool-${tool}`);
        if (activeBtn) activeBtn.classList.add('active');
    }

    changeSize(newSize) {
        this.saveState();
        this.gridSize = parseInt(newSize);
        this.clearGridData();
        this.resizeCanvas();
    }

    setGridData(newGrid) {
        this.saveState();
        this.gridSize = newGrid.length;
        this.grid = newGrid.map(row => row.map(pixel => pixel ? { ...pixel } : null));
        
        // Update HTML select elements if needed
        const select = document.getElementById('grid-size-select');
        if (select) select.value = this.gridSize;

        this.resizeCanvas();
    }

    clearGrid() {
        this.saveState();
        this.clearGridData();
        this.draw();
    }

    // Canvas drawing function
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Draw checkerboard pattern background (only on transparent areas)
        const checkSize = 10;
        for (let y = 0; y < this.canvas.height; y += checkSize) {
            for (let x = 0; x < this.canvas.width; x += checkSize) {
                const isEven = (Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2 === 0;
                this.ctx.fillStyle = isEven ? '#1f2430' : '#171a24';
                this.ctx.fillRect(x, y, checkSize, checkSize);
            }
        }

        // 2. Draw actual pixels
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const pixel = this.grid[y][x];
                if (pixel) {
                    this.ctx.fillStyle = `rgb(${pixel.r}, ${pixel.g}, ${pixel.b})`;
                    // Slight overlap to avoid anti-aliasing seam gaps
                    this.ctx.fillRect(
                        x * this.pixelSize, 
                        y * this.pixelSize, 
                        this.pixelSize, 
                        this.pixelSize
                    );
                }
            }
        }

        // 3. Draw grid lines (subtle grid overlays)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= this.gridSize; i++) {
            // Vertical lines
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.pixelSize, 0);
            this.ctx.lineTo(i * this.pixelSize, this.canvas.height);
            this.ctx.stroke();

            // Horizontal lines
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.pixelSize);
            this.ctx.lineTo(this.canvas.width, i * this.pixelSize);
            this.ctx.stroke();
        }
    }

    // Convert mouse coordinates to grid indexes
    getGridCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Map mouse position inside the display size (512x512)
        const x = Math.floor((mouseX / rect.width) * this.gridSize);
        const y = Math.floor((mouseY / rect.height) * this.gridSize);

        return { x, y };
    }

    handleMouseDown(e) {
        this.saveState();
        this.isDrawing = true;
        this.drawOrUseTool(e);
    }

    handleMouseMove(e) {
        if (!this.isDrawing) return;
        this.drawOrUseTool(e);
    }

    handleMouseUp() {
        this.isDrawing = false;
    }

    drawOrUseTool(e) {
        const { x, y } = this.getGridCoords(e);
        
        // Out of bounds check
        if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) return;

        if (this.currentTool === 'pencil') {
            this.grid[y][x] = { ...this.currentColor };
            this.draw();
        } else if (this.currentTool === 'eraser') {
            this.grid[y][x] = null;
            this.draw();
        } else if (this.currentTool === 'bucket') {
            this.floodFill(x, y, this.grid[y][x], this.currentColor);
            this.draw();
            this.isDrawing = false; // Flood fill is a single action
        } else if (this.currentTool === 'picker') {
            const pickedColor = this.grid[y][x];
            if (pickedColor) {
                this.currentColor = { ...pickedColor };
                // Call global UI updates (will be wired up in app.js)
                if (window.onColorPicked) {
                    window.onColorPicked(this.currentColor);
                }
            }
            this.setTool('pencil'); // Auto-switch back to pencil
            this.isDrawing = false;
        }
    }

    // Flood fill algorithm
    floodFill(startX, startY, targetColor, replacementColor) {
        // If target and replacement colors are matching, do nothing
        if (this.colorsMatch(targetColor, replacementColor)) return;

        const queue = [[startX, startY]];
        
        while (queue.length > 0) {
            const [x, y] = queue.shift();

            if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) continue;

            const currentColor = this.grid[y][x];

            if (this.colorsMatch(currentColor, targetColor)) {
                this.grid[y][x] = { ...replacementColor };

                queue.push([x + 1, y]);
                queue.push([x - 1, y]);
                queue.push([x, y + 1]);
                queue.push([x, y - 1]);
            }
        }
    }

    // Helper to check if two colors are matching
    colorsMatch(c1, c2) {
        if (c1 === null && c2 === null) return true;
        if (c1 === null || c2 === null) return false;
        return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b;
    }

    // PNG Export
    exportPNG(scale = 1) {
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = this.gridSize * scale;
        exportCanvas.height = this.gridSize * scale;
        const exportCtx = exportCanvas.getContext('2d');

        // Draw pixel data onto scaled offscreen canvas
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const pixel = this.grid[y][x];
                if (pixel) {
                    exportCtx.fillStyle = `rgb(${pixel.r}, ${pixel.g}, ${pixel.b})`;
                    exportCtx.fillRect(x * scale, y * scale, scale, scale);
                }
            }
        }

        // Trigger file download
        const link = document.createElement('a');
        link.download = `pixel-sprite-${this.gridSize}x${this.gridSize}.png`;
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
    }

    // Export raw grid JSON
    exportJSON() {
        return JSON.stringify({
            gridSize: this.gridSize,
            grid: this.grid
        }, null, 2);
    }
}
