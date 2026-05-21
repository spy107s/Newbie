// 24-Bit Graphics Agent Core Logic
// Procedural Generation & Command Parsing

const AgentPalettes = {
    cyberpunk: [
        '#ff0055', '#00ffcc', '#9900ff', '#ffcc00', '#ff00ff', '#00ffff', '#120024', '#051b2c',
        '#ffffff', '#e0e0e0', '#888888', '#333333', '#221133', '#005577', '#880055', '#ff55aa'
    ],
    retro: [
        '#e6482e', '#f9a875', '#382b26', '#a56a52', '#3f5a5c', '#6aa684', '#e2c56f', '#775c75',
        '#ffffff', '#cfd2d6', '#7e838c', '#31343a', '#942929', '#2e5588', '#68367a', '#c28c46'
    ],
    forest: [
        '#1b3a27', '#2e6f40', '#5ba353', '#a7db68', '#f8ebd3', '#d9a066', '#8f563b', '#663931',
        '#ffffff', '#b5c2b7', '#7b8780', '#3b423f', '#c93c3c', '#2c5985', '#b59228', '#df6c20'
    ],
    bubblegum: [
        '#ff9ebb', '#ffc6ff', '#e8c0fc', '#bdb2ff', '#9bf6ff', '#caffbf', '#fdffb6', '#ffd6a5',
        '#ffffff', '#eaeaea', '#9c9c9c', '#404040', '#ff6b6b', '#54a0ff', '#5f27cd', '#ff9f43'
    ],
    monochrome: [
        '#0f380f', '#306230', '#8bac0f', '#9bbc0f', '#000000', '#1f1f1f', '#3f3f3f', '#5f5f5f',
        '#7f7f7f', '#9f9f9f', '#bfbfbf', '#dfdfdf', '#ffffff', '#2a4d2a', '#547a54', '#aad1aa'
    ]
};

// Current active palette array
let currentPaletteName = 'cyberpunk';
let currentColors = [...AgentPalettes.cyberpunk];

// Simple helper to convert HEX to RGB object {r, g, b}
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
}

// Helper to convert RGB to HEX string
function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Procedural Sprite Generation functions
// Returns a 2D array [height][width] of RGB objects or null (for background)
class SpriteGenerator {
    static initCanvasGrid(size) {
        const grid = [];
        for (let y = 0; y < size; y++) {
            grid[y] = [];
            for (let x = 0; x < size; x++) {
                grid[y][x] = null; // transparent
            }
        }
        return grid;
    }

    static generateSword(size = 32, palette = currentColors) {
        const grid = this.initCanvasGrid(size);
        const cBlade = hexToRgb(palette[1]); // Active neon/steel color
        const cBladeHighlight = hexToRgb(palette[5]); // High bright highlight
        const cGuard = hexToRgb(palette[3]); // Gold/yellow guard
        const cHilt = hexToRgb(palette[6]); // Dark handle
        const cOutline = { r: 15, g: 15, b: 20 }; // Almost black outline

        // Determine drawing area
        // Swords are drawn diagonally from bottom-left to top-right
        const pad = Math.floor(size * 0.12);
        const startX = pad;
        const startY = size - 1 - pad;
        const endX = size - 1 - pad;
        const endY = pad;

        const dx = endX - startX;
        const dy = endY - startY;
        const length = Math.sqrt(dx * dx + dy * dy);

        // Draw Blade
        const bladeStart = 0.3; // start 30% along the length
        const bladeEnd = 0.95;
        
        for (let i = 0; i < length; i++) {
            const t = i / length;
            const px = Math.round(startX + t * dx);
            const py = Math.round(startY + t * dy);

            if (px < 0 || px >= size || py < 0 || py >= size) continue;

            if (t >= bladeStart && t <= bladeEnd) {
                // Blade Center
                grid[py][px] = cBlade;

                // Blade Thickness/Sides (diagonal offset)
                this.setPixelSafely(grid, px - 1, py + 1, cBlade, size);
                this.setPixelSafely(grid, px + 1, py - 1, cBladeHighlight, size);

                // Blade Outlines
                this.setPixelSafely(grid, px - 2, py + 2, cOutline, size);
                this.setPixelSafely(grid, px - 2, py + 1, cOutline, size);
                this.setPixelSafely(grid, px - 1, py + 2, cOutline, size);

                this.setPixelSafely(grid, px + 2, py - 2, cOutline, size);
                this.setPixelSafely(grid, px + 2, py - 1, cOutline, size);
                this.setPixelSafely(grid, px + 1, py - 2, cOutline, size);
            } else if (t < bladeStart) {
                // Handle/Hilt
                grid[py][px] = cHilt;
                this.setPixelSafely(grid, px - 1, py + 1, cHilt, size);
                this.setPixelSafely(grid, px + 1, py - 1, cHilt, size);
                
                // Hilt Outlines
                this.setPixelSafely(grid, px - 2, py + 2, cOutline, size);
                this.setPixelSafely(grid, px + 2, py - 2, cOutline, size);
            }
        }

        // Blade Tip (Sharp point at the end)
        const tipX = Math.round(startX + bladeEnd * dx);
        const tipY = Math.round(startY + bladeEnd * dy);
        this.setPixelSafely(grid, tipX + 1, tipY - 1, cBladeHighlight, size);
        this.setPixelSafely(grid, tipX + 2, tipY - 2, cOutline, size);
        this.setPixelSafely(grid, tipX + 3, tipY - 3, cOutline, size);
        this.setPixelSafely(grid, tipX + 2, tipY - 3, cOutline, size);
        this.setPixelSafely(grid, tipX + 3, tipY - 2, cOutline, size);

        // Draw Guard (perpendicular crossbar)
        // Guard center is around t = bladeStart
        const guardCenterX = Math.round(startX + bladeStart * dx);
        const guardCenterY = Math.round(startY + bladeStart * dy);

        // Perpendicular vector to (dx, dy) which is (dy, -dx)
        const pLen = Math.sqrt(dx*dx + dy*dy);
        const px = (dy / pLen);
        const py = (-dx / pLen);

        const guardWidth = Math.max(3, Math.floor(size * 0.15));
        for (let w = -guardWidth; w <= guardWidth; w++) {
            const gx = Math.round(guardCenterX + w * px);
            const gy = Math.round(guardCenterY + w * py);

            grid[gy][gx] = cGuard;
            // Thick guard
            this.setPixelSafely(grid, gx + Math.round(px*0.5), gy + Math.round(py*0.5), cGuard, size);
            
            // Guard outlines
            this.setPixelSafely(grid, gx + Math.round(px), gy + Math.round(py), cOutline, size);
            this.setPixelSafely(grid, gx - Math.round(px), gy - Math.round(py), cOutline, size);
        }

        // Cap the guard ends
        const end1X = Math.round(guardCenterX - guardWidth * px);
        const end1Y = Math.round(guardCenterY - guardWidth * py);
        const end2X = Math.round(guardCenterX + guardWidth * px);
        const end2Y = Math.round(guardCenterY + guardWidth * py);
        
        this.setPixelSafely(grid, end1X - Math.round(py), end1Y - Math.round(-px), cOutline, size);
        this.setPixelSafely(grid, end2X + Math.round(py), end2Y + Math.round(-px), cOutline, size);

        return grid;
    }

    static generateShield(size = 32, palette = currentColors) {
        const grid = this.initCanvasGrid(size);
        const cMetal = hexToRgb(palette[9]); // Silver rim
        const cMetalHighlight = hexToRgb(palette[8]); // Light silver
        const cWood = hexToRgb(palette[2]); // Shield center (e.g. blue or wood brown)
        const cEmblem = hexToRgb(palette[3]); // Center star/cross (gold)
        const cOutline = { r: 15, g: 15, b: 20 };

        const mid = size / 2;
        const radius = Math.floor(size * 0.38);

        // Draw symmetrical shield (symmetric horizontally)
        for (let y = 0; y < size; y++) {
            for (let x = 0; x <= mid; x++) {
                // Calculate distance from center/top
                const dx = x - mid + 0.5;
                const dy = y - mid + 2; // Shift shield slightly up
                
                // Shield formula (curved bottom, flat top)
                let insideShield = false;
                let isRim = false;
                let isEmblem = false;

                // Simple flat top boundary
                const topLimit = mid - radius;
                const bottomLimit = mid + radius - Math.abs(dx)*0.5;

                if (y >= topLimit && y <= bottomLimit) {
                    // Curved sides
                    const currentWidth = radius * (1 - Math.pow((y - topLimit) / (bottomLimit - topLimit), 2.5) * 0.3);
                    if (Math.abs(dx) <= currentWidth) {
                        insideShield = true;
                        // Determine if it's the metal rim
                        if (Math.abs(dx) > currentWidth - 2 || y < topLimit + 2 || y > bottomLimit - 2) {
                            isRim = true;
                        }

                        // Determine if it's the center emblem
                        if (Math.abs(dx) < 3 && Math.abs(y - mid) < 3) {
                            isEmblem = true;
                        }
                    }
                }

                if (insideShield) {
                    let color = cWood;
                    if (isRim) {
                        // Highlight on left rim
                        color = (dx < 0 || y < topLimit + 1) ? cMetalHighlight : cMetal;
                    } else if (isEmblem) {
                        color = cEmblem;
                    }

                    // Place pixel and its horizontal mirror reflection
                    grid[y][x] = color;
                    grid[y][size - 1 - x] = color;
                }
            }
        }

        // Add outlines around shield boundary
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (grid[y][x] !== null && grid[y][x] !== cOutline) {
                    // Check neighbors. If neighbor is null, set outline
                    const neighbors = [
                        [x-1, y], [x+1, y], [x, y-1], [x, y+1]
                    ];
                    for (const [nx, ny] of neighbors) {
                        if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                            if (grid[ny][nx] === null) {
                                grid[ny][nx] = cOutline;
                            }
                        }
                    }
                }
            }
        }

        return grid;
    }

    static generatePotion(size = 32, palette = currentColors) {
        const grid = this.initCanvasGrid(size);
        const cLiquid = hexToRgb(palette[0]); // Bright red/cyan potion
        const cLiquidDark = hexToRgb(palette[4]); // Darker red/purple for depth
        const cGlass = hexToRgb(palette[5]); // Cyan glass highlights
        const cGlassHighlight = { r: 255, g: 255, b: 255 }; // Clear glass specular shine
        const cCork = hexToRgb(palette[7]); // Wooden cork
        const cOutline = { r: 15, g: 15, b: 20 };

        const mid = size / 2;
        
        // Potion bottle dimensions
        const corkTop = Math.floor(size * 0.15);
        const corkBottom = Math.floor(size * 0.28);
        const neckBottom = Math.floor(size * 0.45);
        const bottleBottom = Math.floor(size * 0.85);

        for (let y = 0; y < size; y++) {
            for (let x = 0; x <= mid; x++) {
                const dx = x - mid + 0.5;

                // CORK (top stopper)
                if (y >= corkTop && y < corkBottom) {
                    if (Math.abs(dx) <= 2) {
                        grid[y][x] = cCork;
                        grid[y][size - 1 - x] = cCork;
                    }
                }

                // GLASS NECK
                if (y >= corkBottom && y < neckBottom) {
                    if (Math.abs(dx) <= 2.5) {
                        grid[y][x] = cGlass;
                        grid[y][size - 1 - x] = cGlass;
                        
                        // Add highlight on the left
                        if (dx < -1) grid[y][x] = cGlassHighlight;
                    }
                }

                // BOTTLE BODY (round bulbous part)
                if (y >= neckBottom && y <= bottleBottom) {
                    // Bulbous formula: radius changes dynamically
                    const h = bottleBottom - neckBottom;
                    const progress = (y - neckBottom) / h;
                    // Circle-like radius
                    const maxRadius = Math.floor(size * 0.35);
                    const radius = Math.sin(progress * Math.PI) * maxRadius + 3;

                    if (Math.abs(dx) <= radius) {
                        // Liquid level is from bottom 60% of the body
                        const liquidLevel = neckBottom + h * 0.35;
                        
                        let isRim = Math.abs(dx) > radius - 1.5 || y > bottleBottom - 1.5;
                        
                        if (isRim) {
                            grid[y][x] = cGlass;
                            grid[y][size - 1 - x] = cGlass;
                        } else {
                            if (y >= liquidLevel) {
                                // liquid color with simple bubble effects or shadow
                                const isDark = (y > liquidLevel + h * 0.3) || (dx > radius * 0.3);
                                grid[y][x] = isDark ? cLiquidDark : cLiquid;
                                grid[y][size - 1 - x] = isDark ? cLiquidDark : cLiquid;
                            } else {
                                // Empty air inside bottle
                                grid[y][x] = null;
                                grid[y][size - 1 - x] = null;
                            }
                        }

                        // Add light specular highlight on the left top glass surface
                        if (Math.abs(dx + radius*0.5) < 2 && Math.abs(y - neckBottom - h*0.2) < 2) {
                            grid[y][x] = cGlassHighlight;
                        }
                    }
                }
            }
        }

        // Add outlines around potion bottle
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (grid[y][x] !== null && grid[y][x] !== cOutline && grid[y][x] !== cGlassHighlight) {
                    const neighbors = [
                        [x-1, y], [x+1, y], [x, y-1], [x, y+1]
                    ];
                    for (const [nx, ny] of neighbors) {
                        if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                            if (grid[ny][nx] === null) {
                                grid[ny][nx] = cOutline;
                            }
                        }
                    }
                }
            }
        }

        return grid;
    }

    static generateCharacter(size = 32, palette = currentColors) {
        const grid = this.initCanvasGrid(size);
        const cSkin = hexToRgb(palette[15] || '#ffc6ff'); // Skin tone
        const cHair = hexToRgb(palette[2]); // Hair color
        const cEyes = hexToRgb(palette[0]); // Eye color
        const cShirt = hexToRgb(palette[1]); // Clothes color
        const cPants = hexToRgb(palette[6]); // Pants color
        const cShoes = hexToRgb(palette[7]); // Shoes color
        const cOutline = { r: 15, g: 15, b: 20 };

        const mid = size / 2;
        
        // Character vertically stacked components:
        // Hair/Head: y = 4 to 12
        // Face: y = 7 to 12
        // Torso (Shirt): y = 13 to 22
        // Legs (Pants): y = 23 to 27
        // Shoes: y = 28 to 30

        for (let y = 0; y < size; y++) {
            for (let x = 0; x <= mid; x++) {
                const dx = x - mid + 0.5;

                // HAIR & HEAD
                if (y >= 4 && y <= 12) {
                    const headW = 5;
                    if (Math.abs(dx) <= headW) {
                        // Hair on top/sides
                        const isHair = y < 7 || Math.abs(dx) > 3 || (y < 9 && Math.abs(dx) > 2);
                        if (isHair) {
                            grid[y][x] = cHair;
                            grid[y][size - 1 - x] = cHair;
                        } else {
                            // Face skin
                            grid[y][x] = cSkin;
                            grid[y][size - 1 - x] = cSkin;

                            // Eyes at y = 9, x = mid +/- 2
                            if (y === 9 && Math.abs(dx) === 1.5) {
                                grid[y][x] = cEyes;
                                grid[y][size - 1 - x] = cEyes;
                            }
                        }
                    }
                }

                // TORSO (Shirt & Arms)
                if (y >= 13 && y <= 22) {
                    const shirtW = 4;
                    const armW = 7;
                    if (Math.abs(dx) <= shirtW) {
                        grid[y][x] = cShirt;
                        grid[y][size - 1 - x] = cShirt;
                    } else if (Math.abs(dx) <= armW) {
                        // Arms dangling
                        const isHand = y > 19;
                        grid[y][x] = isHand ? cSkin : cShirt;
                        grid[y][size - 1 - x] = isHand ? cSkin : cShirt;
                    }
                }

                // LEGS (Pants)
                if (y >= 23 && y <= 27) {
                    const legW = 3.5;
                    const isBetweenLegs = Math.abs(dx) < 1 && y > 24;
                    if (Math.abs(dx) <= legW && !isBetweenLegs) {
                        grid[y][x] = cPants;
                        grid[y][size - 1 - x] = cPants;
                    }
                }

                // SHOES
                if (y >= 28 && y <= 29) {
                    const shoeW = 4.5;
                    const isBetweenLegs = Math.abs(dx) < 1;
                    if (Math.abs(dx) <= shoeW && !isBetweenLegs) {
                        grid[y][x] = cShoes;
                        grid[y][size - 1 - x] = cShoes;
                    }
                }
            }
        }

        // Add outlines around character body
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (grid[y][x] !== null && grid[y][x] !== cOutline) {
                    const neighbors = [
                        [x-1, y], [x+1, y], [x, y-1], [x, y+1]
                    ];
                    for (const [nx, ny] of neighbors) {
                        if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                            if (grid[ny][nx] === null) {
                                grid[ny][nx] = cOutline;
                            }
                        }
                    }
                }
            }
        }

        return grid;
    }

    static generateAxe(size = 32, palette = currentColors) {
        const grid = this.initCanvasGrid(size);
        const cBlade = hexToRgb(palette[9] || '#cfd2d6'); // Iron steel
        const cBladeHighlight = hexToRgb(palette[8] || '#ffffff');
        const cShaft = hexToRgb(palette[6] || '#8f563b'); // Wooden shaft
        const cGold = hexToRgb(palette[3] || '#e2c56f'); // Gold accent
        const cOutline = { r: 15, g: 15, b: 20 };

        const pad = Math.floor(size * 0.12);
        const startX = pad;
        const startY = size - 1 - pad;
        const endX = size - 1 - pad;
        const endY = pad;

        const dx = endX - startX;
        const dy = endY - startY;
        const length = Math.sqrt(dx * dx + dy * dy);

        // Draw Wooden Shaft
        for (let i = 0; i < length * 0.85; i++) {
            const t = i / length;
            const px = Math.round(startX + t * dx);
            const py = Math.round(startY + t * dy);
            this.setPixelSafely(grid, px, py, cShaft, size);
            this.setPixelSafely(grid, px - 1, py + 1, cOutline, size);
            this.setPixelSafely(grid, px + 1, py - 1, cOutline, size);
        }

        // Draw Axe Head
        const headT = 0.72;
        const hx = Math.round(startX + headT * dx);
        const hy = Math.round(startY + headT * dy);

        const pLen = Math.sqrt(dx*dx + dy*dy);
        const px = (dy / pLen);
        const py = (-dx / pLen);

        const wingSize = Math.max(3, Math.floor(size * 0.22));
        for (let w = -wingSize; w <= wingSize; w++) {
            if (w === 0) continue;
            
            const sign = w > 0 ? 1 : -1;
            const dist = Math.abs(w);

            for (let thick = -2; thick <= 2; thick++) {
                const maxThick = Math.floor(wingSize * 0.7) - Math.floor(dist * 0.5);
                if (Math.abs(thick) <= maxThick) {
                    const ax = Math.round(hx + w * px + thick * (dx/pLen));
                    const ay = Math.round(hy + w * py + thick * (dy/pLen));
                    
                    let col = cBlade;
                    if (dist === wingSize || Math.abs(thick) === maxThick) {
                        col = cOutline;
                    } else if (dist > wingSize - 2) {
                        col = cBladeHighlight;
                    } else if (dist < 3) {
                        col = cGold;
                    }
                    this.setPixelSafely(grid, ax, ay, col, size);
                }
            }
        }

        // Clean outlines
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (grid[y][x] !== null && grid[y][x] !== cOutline) {
                    const neighbors = [[x-1,y], [x+1,y], [x,y-1], [x,y+1]];
                    for (const [nx, ny] of neighbors) {
                        if (nx>=0 && nx<size && ny>=0 && ny<size && grid[ny][nx] === null) {
                            grid[ny][nx] = cOutline;
                        }
                    }
                }
            }
        }

        return grid;
    }

    static generateKey(size = 32, palette = currentColors) {
        const grid = this.initCanvasGrid(size);
        const cGold = hexToRgb(palette[3] || '#e2c56f');
        const cGoldLight = hexToRgb(palette[8] || '#ffffff');
        const cGoldDark = hexToRgb(palette[15] || '#8f563b');
        const cOutline = { r: 15, g: 15, b: 20 };

        const pad = Math.floor(size * 0.15);
        const startX = pad + 2;
        const startY = size - 1 - pad - 2;
        const endX = size - 1 - pad;
        const endY = pad;

        const dx = endX - startX;
        const dy = endY - startY;
        const length = Math.sqrt(dx * dx + dy * dy);

        // 1. Draw shaft
        for (let i = 0; i < length; i++) {
            const t = i / length;
            const px = Math.round(startX + t * dx);
            const py = Math.round(startY + t * dy);
            grid[py][px] = cGold;
            this.setPixelSafely(grid, px-1, py+1, cGoldDark, size);
        }

        // 2. Draw loop / handle
        const rx = startX;
        const ry = startY;
        const loopR = Math.max(3, Math.floor(size * 0.15));
        for (let y = ry - loopR - 2; y <= ry + loopR + 2; y++) {
            for (let x = rx - loopR - 2; x <= rx + loopR + 2; x++) {
                const dist = Math.sqrt((x-rx)*(x-rx) + (y-ry)*(y-ry));
                if (dist >= loopR - 0.5 && dist <= loopR + 1.5) {
                    this.setPixelSafely(grid, x, y, cGold, size);
                }
            }
        }

        // 3. Draw Teeth
        const teethT = 0.85;
        const tx = Math.round(startX + teethT * dx);
        const ty = Math.round(startY + teethT * dy);
        
        const pLen = Math.sqrt(dx*dx + dy*dy);
        const px = (dy / pLen);
        const py = (-dx / pLen);

        const toothHeight = Math.max(2, Math.floor(size * 0.12));
        for (let h = 0; h <= toothHeight; h++) {
            this.setPixelSafely(grid, Math.round(tx + h*px), Math.round(ty + h*py), cGold, size);
            this.setPixelSafely(grid, Math.round(tx - Math.round(dx/pLen)*2 + h*px), Math.round(ty - Math.round(dy/pLen)*2 + h*py), cGold, size);
        }

        // Apply Outlines
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (grid[y][x] !== null && grid[y][x] !== cOutline) {
                    const neighbors = [[x-1,y], [x+1,y], [x,y-1], [x,y+1]];
                    for (const [nx, ny] of neighbors) {
                        if (nx>=0 && nx<size && ny>=0 && ny<size && grid[ny][nx] === null) {
                            grid[ny][nx] = cOutline;
                        }
                    }
                }
            }
        }

        return grid;
    }

    static generateHeart(size = 32, palette = currentColors) {
        const grid = this.initCanvasGrid(size);
        const cRed = hexToRgb(palette[0] || '#ff0055');
        const cRedDark = hexToRgb(palette[4] || '#880055');
        const cHighlight = { r: 255, g: 255, b: 255 };
        const cOutline = { r: 15, g: 15, b: 20 };

        const mid = size / 2;
        const radius = Math.floor(size * 0.35);

        for (let y = 0; y < size; y++) {
            for (let x = 0; x <= mid; x++) {
                const dx = x - mid + 0.5;
                const dy = y - mid + 2;

                let inside = false;
                const progressY = (y - (mid - radius)) / (2 * radius);
                
                if (progressY >= 0 && progressY <= 1) {
                    if (y < mid) {
                        const leftCenter = mid - radius/2;
                        const distL = Math.sqrt((x-leftCenter)*(x-leftCenter) + (y-mid*0.8)*(y-mid*0.8));
                        if (distL <= radius/2) inside = true;
                    } else {
                        const width = radius * (1 - (y - mid) / (size - mid - 3));
                        if (Math.abs(dx) <= width) inside = true;
                    }
                }

                if (inside) {
                    let col = cRed;
                    if (dx > 1 || y > mid + 2) {
                        col = cRedDark;
                    } else if (dx < -1 && y < mid) {
                        if (Math.abs(dx + radius/2) < 2 && Math.abs(y - mid*0.8) < 2) {
                            col = cHighlight;
                        }
                    }
                    
                    grid[y][x] = col;
                    grid[y][size - 1 - x] = col;
                }
            }
        }

        // Apply Outlines
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (grid[y][x] !== null && grid[y][x] !== cOutline && grid[y][x] !== cHighlight) {
                    const neighbors = [[x-1,y], [x+1,y], [x,y-1], [x,y+1]];
                    for (const [nx, ny] of neighbors) {
                        if (nx>=0 && nx<size && ny>=0 && ny<size && grid[ny][nx] === null) {
                            grid[ny][nx] = cOutline;
                        }
                    }
                }
            }
        }

        return grid;
    }

    static generateMonster(size = 32, palette = currentColors) {
        const grid = this.initCanvasGrid(size);
        const cBody = hexToRgb(palette[2] || '#9900ff');
        const cBodyDark = hexToRgb(palette[12] || '#221133');
        const cEye = hexToRgb(palette[1] || '#00ffcc');
        const cEyeIris = { r: 255, g: 255, b: 255 };
        const cOutline = { r: 15, g: 15, b: 20 };

        const mid = size / 2;
        const bottom = Math.floor(size * 0.85);
        const top = Math.floor(size * 0.25);
        const maxW = Math.floor(size * 0.35);

        for (let y = top; y <= bottom; y++) {
            const h = bottom - top;
            const progress = (y - top) / h;
            
            let width = Math.sin(progress * Math.PI) * maxW;
            if (progress > 0.7) {
                width = maxW * (1 - (progress - 0.7) * 0.3);
            }

            for (let x = 0; x <= mid; x++) {
                const dx = x - mid + 0.5;
                if (Math.abs(dx) <= width) {
                    let col = cBody;
                    
                    if (dx > width * 0.2 || progress > 0.8) {
                        col = cBodyDark;
                    }

                    const eyeY = top + Math.floor(h * 0.4);
                    if (y === eyeY && Math.abs(dx) === 3) {
                        col = cEye;
                    } else if (y === eyeY && Math.abs(dx) === 2) {
                        col = cEyeIris;
                    }

                    grid[y][x] = col;
                    grid[y][size - 1 - x] = col;
                }
            }
        }

        // Apply Outlines
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (grid[y][x] !== null && grid[y][x] !== cOutline && grid[y][x] !== cEyeIris) {
                    const neighbors = [[x-1,y], [x+1,y], [x,y-1], [x,y+1]];
                    for (const [nx, ny] of neighbors) {
                        if (nx>=0 && nx<size && ny>=0 && ny<size && grid[ny][nx] === null) {
                            grid[ny][nx] = cOutline;
                        }
                    }
                }
            }
        }

        return grid;
    }

    static generateCoin(size = 32, palette = currentColors) {
        const grid = this.initCanvasGrid(size);
        const cGold = hexToRgb(palette[3] || '#ffcc00');
        const cGoldLight = hexToRgb(palette[8] || '#ffffff');
        const cGoldDark = hexToRgb(palette[15] || '#cfd2d6');
        const cOutline = { r: 15, g: 15, b: 20 };

        const mid = size / 2;
        const radius = Math.floor(size * 0.35);

        for (let y = 0; y < size; y++) {
            for (let x = 0; x <= mid; x++) {
                const dx = x - mid + 0.5;
                const dy = y - mid;
                const dist = Math.sqrt(dx*dx + dy*dy);

                if (dist <= radius) {
                    let col = cGold;
                    
                    if (dist > radius - 2) {
                        col = (dx < 0 && dy < 0) ? cGoldLight : cGoldDark;
                    } else if (dist < 3) {
                        col = cGoldLight;
                    } else if (dx > 0 && dy > 0) {
                        col = cGoldDark;
                    }

                    grid[y][x] = col;
                    grid[y][size - 1 - x] = col;
                }
            }
        }

        // Apply Outlines
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (grid[y][x] !== null && grid[y][x] !== cOutline && grid[y][x] !== cGoldLight) {
                    const neighbors = [[x-1,y], [x+1,y], [x,y-1], [x,y+1]];
                    for (const [nx, ny] of neighbors) {
                        if (nx>=0 && nx<size && ny>=0 && ny<size && grid[ny][nx] === null) {
                            grid[ny][nx] = cOutline;
                        }
                    }
                }
            }
        }

        return grid;
    }

    // Helper to safely write pixel to grid checking bounds
    static setPixelSafely(grid, x, y, color, size) {
        if (x >= 0 && x < size && y >= 0 && y < size) {
            grid[y][x] = color;
        }
    }
}

// Agent Command Parser
class AgentParser {
    static parse(input) {
        const text = input.trim().toLowerCase();
        
        // Command /gen <type> or "tạo <type>"
        if (text.startsWith('/gen ') || text.startsWith('generate ') || text.includes('tạo ') || text.includes('vẽ ')) {
            let type = '';
            if (text.includes('sword') || text.includes('kiếm')) type = 'sword';
            else if (text.includes('shield') || text.includes('khiên')) type = 'shield';
            else if (text.includes('potion') || text.includes('bình nước') || text.includes('thuốc')) type = 'potion';
            else if (text.includes('char') || text.includes('character') || text.includes('nhân vật') || text.includes('người')) type = 'character';
            else if (text.includes('axe') || text.includes('rìu')) type = 'axe';
            else if (text.includes('key') || text.includes('khóa') || text.includes('chìa')) type = 'key';
            else if (text.includes('heart') || text.includes('tim') || text.includes('máu')) type = 'heart';
            else if (text.includes('monster') || text.includes('quái') || text.includes('slime')) type = 'monster';
            else if (text.includes('coin') || text.includes('xu') || text.includes('vàng') || text.includes('tiền')) type = 'coin';

            if (type) {
                return {
                    action: 'generate',
                    type: type,
                    message: `Tôi sẽ bắt đầu sinh mô hình **${this.getTypeNameVi(type)}** 24-bit bằng thuật toán sinh của tôi. Đang vẽ lên khung lưới canvas...`
                };
            } else {
                return {
                    action: 'error',
                    message: 'Tôi chưa hiểu loại asset bạn muốn tạo. Hiện tại tôi hỗ trợ: `sword` (kiếm), `shield` (khiên), `potion` (bình nước ma thuật), `character` (nhân vật), `axe` (rìu), `key` (chìa khóa), `heart` (trái tim), `monster` (quái vật slime), và `coin` (đồng xu).'
                };
            }
        }

        // Palette commands
        if (text.startsWith('/palette ') || text.startsWith('/color ') || text.includes('bảng màu') || text.includes('tông màu')) {
            let paletteName = '';
            for (const key of Object.keys(AgentPalettes)) {
                if (text.includes(key)) {
                    paletteName = key;
                    break;
                }
            }

            if (paletteName) {
                return {
                    action: 'palette',
                    name: paletteName,
                    message: `Bảng màu đã được thay đổi thành **${paletteName.toUpperCase()}**. Hệ màu 24-bit đã được cấu hình lại!`
                };
            } else {
                return {
                    action: 'error',
                    message: 'Tôi chưa tìm thấy bảng màu đó. Các bảng màu khả dụng: `cyberpunk`, `retro`, `forest`, `bubblegum`, và `monochrome`.'
                };
            }
        }

        // Extrude command
        if (text.includes('extrude') || text.includes('chiếu sang 3d') || text.includes('chuyển sang 3d') || text.includes('dựng 3d')) {
            return {
                action: 'extrude',
                message: 'Tôi sẽ tiến hành **Extrude (chiếu đùn)** bản vẽ 2D Pixel hiện tại của bạn thành một mô hình Voxel 3D!'
            };
        }

        // Clear command
        if (text === '/clear' || text.includes('xóa hết') || text.includes('xóa màn hình')) {
            return {
                action: 'clear',
                message: 'Đang làm sạch không gian làm việc...'
            };
        }

        // Help command
        if (text === '/help' || text.includes('trợ giúp') || text.includes('hướng dẫn')) {
            return {
                action: 'help',
                message: `Dưới đây là các câu lệnh bạn có thể sử dụng:
* \`/gen sword\` - Tạo thanh kiếm
* \`/gen shield\` - Tạo khiên bảo vệ
* \`/gen potion\` - Tạo bình thuốc ma thuật
* \`/gen character\` - Tạo nhân vật đơn giản
* \`/gen axe\` - Tạo rìu chiến
* \`/gen key\` - Tạo chìa khóa
* \`/gen heart\` - Tạo trái tim/máu
* \`/gen monster\` - Tạo quái vật slime
* \`/gen coin\` - Tạo đồng xu vàng
* \`/palette [tên_bảng_màu]\` - Chuyển đổi bảng màu (ví dụ: \`/palette forest\`)
* \`extrude\` - Đẩy bản vẽ 2D thành Voxel 3D
* \`/clear\` - Xóa sạch canvas`
            };
        }

        // Fallback chatbot conversation
        return {
            action: 'chat',
            message: `Tôi nhận được thông điệp của bạn: "${input}". 
Để tôi hỗ trợ tốt nhất, bạn có thể nhập lệnh tạo asset nhanh như \`/gen sword\`, \`/gen axe\`, \`/gen monster\` hoặc yêu cầu tôi đổi sang bảng màu ấm bằng lệnh \`/palette retro\` nhé!`
        };
    }

    static getTypeNameVi(type) {
        switch(type) {
            case 'sword': return 'Kiếm';
            case 'shield': return 'Khiên';
            case 'potion': return 'Bình nước ma thuật';
            case 'character': return 'Nhân vật';
            case 'axe': return 'Rìu chiến';
            case 'key': return 'Chìa khóa';
            case 'heart': return 'Trái tim';
            case 'monster': return 'Quái vật slime';
            case 'coin': return 'Đồng xu vàng';
            default: return type;
        }
    }
}
