// App Controller - Connects UI, Chat, 2D Editor and 3D Editor

let editor2D;
let editor3D;
let activeMode = '2d';
let drafts = [];

// Initialize application on load
window.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Editors
    editor2D = new PixelEditor2D('pixel-canvas');
    editor3D = new VoxelEditor3D('three-container');

    // 2. Setup color picker connection
    window.onColorPicked = (color) => {
        updateColorUI(color);
    };

    // 3. Load initial palette and render colors
    loadPalette(currentPaletteName);

    // 4. Load drafts from localStorage
    loadDrafts();

    // 5. Setup hotkeys
    setupHotkeys();

    // 6. Focus chat input
    document.getElementById('chat-input').focus();
});

// Mode Switching Logic
function switchMode(mode) {
    activeMode = mode;

    const btn2D = document.getElementById('btn-mode-2d');
    const btn3D = document.getElementById('btn-mode-3d');
    const view2D = document.getElementById('workspace-2d');
    const view3D = document.getElementById('workspace-3d');
    const export2D = document.getElementById('export-2d-group');
    const export3D = document.getElementById('export-3d-group');

    if (mode === '2d') {
        btn2D.classList.add('active');
        btn3D.classList.remove('active');
        view2D.classList.add('active');
        view3D.classList.remove('active');
        export2D.classList.add('active');
        export3D.classList.remove('active');
        editor2D.draw();
    } else {
        btn2D.classList.remove('active');
        btn3D.classList.add('active');
        view2D.classList.remove('active');
        view3D.classList.add('active');
        export2D.classList.remove('active');
        export3D.classList.add('active');
        // Let Three.js know the size changed
        setTimeout(() => {
            editor3D.handleResize();
        }, 50);
    }
}

// Color Picker UI Updates
function updateRGBColor() {
    const r = parseInt(document.getElementById('slider-r').value);
    const g = parseInt(document.getElementById('slider-g').value);
    const b = parseInt(document.getElementById('slider-b').value);

    // Update labels
    document.getElementById('val-r').innerText = r;
    document.getElementById('val-g').innerText = g;
    document.getElementById('val-b').innerText = b;

    const hex = rgbToHex(r, g, b);
    document.getElementById('color-hex-input').value = hex.toUpperCase();
    document.getElementById('color-preview').style.backgroundColor = hex;

    const colorObj = { r, g, b };
    editor2D.currentColor = colorObj;
    editor3D.currentColor = colorObj;
}

function updateHexColor(hex) {
    const colorObj = hexToRgb(hex);
    updateColorUI(colorObj);
}

function updateColorUI(color) {
    document.getElementById('slider-r').value = color.r;
    document.getElementById('slider-g').value = color.g;
    document.getElementById('slider-b').value = color.b;

    document.getElementById('val-r').innerText = color.r;
    document.getElementById('val-g').innerText = color.g;
    document.getElementById('val-b').innerText = color.b;

    const hex = rgbToHex(color.r, color.g, color.b);
    document.getElementById('color-hex-input').value = hex.toUpperCase();
    document.getElementById('color-preview').style.backgroundColor = hex;

    editor2D.currentColor = { ...color };
    editor3D.currentColor = { ...color };
}

// Palette rendering
function loadPalette(paletteName) {
    currentPaletteName = paletteName;
    currentColors = [...AgentPalettes[paletteName]];

    const colorsGrid = document.getElementById('palette-colors');
    colorsGrid.innerHTML = '';

    currentColors.forEach(colorHex => {
        const swatch = document.createElement('div');
        swatch.className = 'palette-color-swatch';
        swatch.style.backgroundColor = colorHex;
        swatch.title = colorHex;
        swatch.onclick = () => {
            updateHexColor(colorHex);
        };
        colorsGrid.appendChild(swatch);
    });

    // Default select first color of the palette
    updateHexColor(currentColors[0]);
}

function setPalette(paletteName) {
    loadPalette(paletteName);
    addSystemMessage(`Đã nạp bảng màu **${paletteName.toUpperCase()}**.`);
}

// 2D Editor Toolbar commands
function setTool(tool) {
    editor2D.setTool(tool);
}

function undo2D() {
    editor2D.undo();
}

function redo2D() {
    editor2D.redo();
}

function clearGrid2D() {
    if (confirm('Bạn có chắc chắn muốn xóa sạch khung hình vẽ 2D này?')) {
        editor2D.clearGrid();
    }
}

function changeGridSize2D(size) {
    editor2D.changeSize(size);
}

// 3D Editor Toolbar commands
function setVoxelTool(tool) {
    editor3D.setTool(tool);
}

function reset3DCamera() {
    editor3D.resetCamera();
}

function clear3DSpace() {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ Voxel 3D hiện tại?')) {
        editor3D.clear3DSpace();
    }
}

function changeVoxelSize3D(size) {
    editor3D.changeSize(size);
}

// Extrude function
function project2Dto3D() {
    editor3D.extrudeFrom2D(editor2D.grid);
    switchMode('3d');
    addSystemMessage("🤖 **Agent**: Đã chiếu đùn (Extrude) ảnh 2D của bạn thành Voxel 3D. Bạn có thể dùng chuột trái để xoay camera và đặt/xóa thêm voxel!");
}

// Chat UI logic
function handleChatSubmit(e) {
    if (e.key === 'Enter') {
        sendChatMessage();
    }
}

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    // Add User Bubble
    addUserMessage(text);
    input.value = '';

    // Scroll chat to bottom
    scrollChat();

    // Parse and handle command asynchronously to feel responsive
    setTimeout(() => {
        const response = AgentParser.parse(text);
        
        // Add Agent Bubble
        addAgentMessage(response.message);

        // Execute action
        executeAgentAction(response);
        scrollChat();
    }, 400);
}

function addUserMessage(message) {
    const container = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message user';
    msgDiv.innerHTML = `
        <div class="avatar">👤</div>
        <div class="msg-content">
            <p>${escapeHtml(message)}</p>
        </div>
    `;
    container.appendChild(msgDiv);
}

function addAgentMessage(message) {
    const container = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message system';
    
    // Formatting markdown-like code tags dynamically
    let formattedMsg = escapeHtml(message)
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code>$1</code>');

    msgDiv.innerHTML = `
        <div class="avatar">🤖</div>
        <div class="msg-content">
            <p>${formattedMsg}</p>
        </div>
    `;
    container.appendChild(msgDiv);
}

function addSystemMessage(text) {
    const container = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message system';
    msgDiv.innerHTML = `
        <div class="avatar">⚙️</div>
        <div class="msg-content">
            <p><em>${text}</em></p>
        </div>
    `;
    container.appendChild(msgDiv);
    scrollChat();
}

function clearChat() {
    document.getElementById('chat-messages').innerHTML = `
        <div class="message system">
            <div class="avatar">🤖</div>
            <div class="msg-content">
                <p>Lịch sử trò chuyện đã được dọn sạch. Tôi có thể giúp gì thêm cho bạn?</p>
            </div>
        </div>
    `;
}

function scrollChat() {
    const chat = document.getElementById('chat-messages');
    chat.scrollTop = chat.scrollHeight;
}

// Executes actions parsed by AgentParser
function executeAgentAction(response) {
    if (response.action === 'generate') {
        let grid;
        if (response.type === 'sword') {
            grid = SpriteGenerator.generateSword(editor2D.gridSize, currentColors);
        } else if (response.type === 'shield') {
            grid = SpriteGenerator.generateShield(editor2D.gridSize, currentColors);
        } else if (response.type === 'potion') {
            grid = SpriteGenerator.generatePotion(editor2D.gridSize, currentColors);
        } else if (response.type === 'character') {
            grid = SpriteGenerator.generateCharacter(editor2D.gridSize, currentColors);
        } else if (response.type === 'axe') {
            grid = SpriteGenerator.generateAxe(editor2D.gridSize, currentColors);
        } else if (response.type === 'key') {
            grid = SpriteGenerator.generateKey(editor2D.gridSize, currentColors);
        } else if (response.type === 'heart') {
            grid = SpriteGenerator.generateHeart(editor2D.gridSize, currentColors);
        } else if (response.type === 'monster') {
            grid = SpriteGenerator.generateMonster(editor2D.gridSize, currentColors);
        } else if (response.type === 'coin') {
            grid = SpriteGenerator.generateCoin(editor2D.gridSize, currentColors);
        }

        if (grid) {
            editor2D.setGridData(grid);
            editor2D.draw();
            switchMode('2d');
        }
    } 
    else if (response.action === 'palette') {
        loadPalette(response.name);
    } 
    else if (response.action === 'extrude') {
        project2Dto3D();
    } 
    else if (response.action === 'clear') {
        editor2D.clearGrid();
        editor3D.clear3DSpace();
    }
}

// Exports utilities
function exportPNG(scale) {
    editor2D.exportPNG(scale);
}

function export2DData() {
    const data = editor2D.exportJSON();
    downloadTextFile(data, `sprite-data-${editor2D.gridSize}.json`);
}

function exportOBJ() {
    editor3D.exportOBJ();
}

function export3DData() {
    const data = editor3D.exportJSON();
    downloadTextFile(data, `voxel-data-${editor3D.gridSize}.json`);
}

function downloadTextFile(content, fileName) {
    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.download = fileName;
    link.href = URL.createObjectURL(blob);
    link.click();
}

// Drafts & LocalStorage Saves system
function saveCurrentToDrafts() {
    const name = prompt('Nhập tên cho bản nháp này:', `Draft ${drafts.length + 1}`);
    if (!name) return;

    const draft = {
        id: Date.now(),
        name: name,
        mode: activeMode,
        gridSize: activeMode === '2d' ? editor2D.gridSize : editor3D.gridSize,
        paletteName: currentPaletteName,
        // Save appropriate editor data
        data2D: editor2D.grid.map(row => row.map(pixel => pixel ? { ...pixel } : null)),
        data3D: Array.from(editor3D.voxels.entries()).map(([k, v]) => ({ key: k, color: v.color }))
    };

    drafts.push(draft);
    saveDraftsToStorage();
    renderDraftsList();
}

function saveDraftsToStorage() {
    localStorage.setItem('antigravity_graphics_drafts', JSON.stringify(drafts));
}

function loadDrafts() {
    try {
        const stored = localStorage.getItem('antigravity_graphics_drafts');
        if (stored) {
            drafts = JSON.parse(stored);
            renderDraftsList();
        }
    } catch(e) {
        console.error("Lỗi khi tải bản nháp từ localStorage:", e);
    }
}

function renderDraftsList() {
    const list = document.getElementById('drafts-list');
    list.innerHTML = '';

    if (drafts.length === 0) {
        list.innerHTML = `<div class="empty-list-msg">Chưa có bản nháp nào được lưu. Hãy nhờ Agent sinh hoặc tự vẽ!</div>`;
        return;
    }

    drafts.forEach(draft => {
        const item = document.createElement('div');
        item.className = 'draft-item';
        
        const is3D = draft.mode === '3d';
        const tagText = is3D ? '3D' : '2D';
        const tagClass = is3D ? 'draft-tag tag-3d' : 'draft-tag';

        item.innerHTML = `
            <div class="draft-info" onclick="loadDraft(${draft.id})">
                <div class="draft-thumbnail" style="background-color: ${currentColors[0]}"></div>
                <span class="draft-name" title="${draft.name}">${draft.name}</span>
                <span class="${tagClass}">${tagText}</span>
            </div>
            <button class="delete-draft-btn" onclick="deleteDraft(${draft.id})" title="Xóa bản nháp">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        `;
        list.appendChild(item);
    });
}

function loadDraft(id) {
    const draft = drafts.find(d => d.id === id);
    if (!draft) return;

    // Load palette
    loadPalette(draft.paletteName || 'cyberpunk');

    // Switch mode
    switchMode(draft.mode);

    if (draft.mode === '2d') {
        editor2D.setGridData(draft.data2D);
        editor2D.draw();
    } else {
        editor3D.changeSize(draft.gridSize);
        // Load voxels manually
        editor3D.clearVoxels();
        const voxelGeometry = new THREE.BoxGeometry(0.99, 0.99, 0.99);
        draft.data3D.forEach(v => {
            const [vx, vy, vz] = v.key.split(',').map(Number);
            const mat = editor3D.getSharedMaterial(v.color.r, v.color.g, v.color.b);
            const mesh = new THREE.Mesh(voxelGeometry, mat);
            mesh.position.set(vx + 0.5, vy + 0.5, vz + 0.5);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            editor3D.scene.add(mesh);
            editor3D.voxels.set(v.key, { mesh, color: v.color });
        });
    }

    addSystemMessage(`Đã tải bản nháp **${draft.name}**.`);
}

function deleteDraft(id) {
    drafts = drafts.filter(d => d.id !== id);
    saveDraftsToStorage();
    renderDraftsList();
}

// Utility: HTML Escaper
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// keyboard shortcuts
function setupHotkeys() {
    window.addEventListener('keydown', (e) => {
        // Only run shortcuts if user is not typing in input boxes
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'SELECT') {
            return;
        }

        if (activeMode === '2d') {
            if (e.key === 'p' || e.key === 'P') editor2D.setTool('pencil');
            if (e.key === 'e' || e.key === 'E') editor2D.setTool('eraser');
            if (e.key === 'g' || e.key === 'G') editor2D.setTool('bucket');
            if (e.key === 'i' || e.key === 'I') editor2D.setTool('picker');
            
            // Undo/Redo
            if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault();
                editor2D.undo();
            }
            if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) {
                e.preventDefault();
                editor2D.redo();
            }
        }
    });
}
