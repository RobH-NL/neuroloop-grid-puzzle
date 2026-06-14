let gridData = {
    participant_id: "",
    session_id: "",
    grid_size: 3,
    start_time: null,
    total_moves: 0,
    rotations_performed: 0
};

let tileOrder = []; 
const rotations = [0, 90, 180, 270];
let selectedTileIndex = null; // Tracks the piece chosen for a swap

function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

document.getElementById('btn-start').addEventListener('click', () => {
    gridData.participant_id = document.getElementById('input-participant').value;
    gridData.session_id = document.getElementById('input-session').value;
    gridData.grid_size = parseInt(document.getElementById('select-grid-size').value, 10);
    gridData.total_moves = 0;
    gridData.rotations_performed = 0;
    gridData.start_time = performance.now();

    initializeGridPuzzle();
    switchScreen('screen-puzzle');
});

function initializeGridPuzzle() {
    const container = document.getElementById('puzzle-grid-container');
    const size = gridData.grid_size;
    const imageUrl = document.getElementById('select-image').value;

    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    container.style.gridTemplateRows = `repeat(${size}, 1fr)`;

    tileOrder = [];
    selectedTileIndex = null;
    
    // 1. Generate core piece map data
    for (let i = 0; i < size * size; i++) {
        const randomRotationIdx = Math.floor(Math.random() * rotations.length);
        tileOrder.push({
            correctIndex: i,
            currentRotation: rotations[randomRotationIdx]
        });
    }

    // 2. Scramble layout
    for (let i = tileOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tileOrder[i], tileOrder[j]] = [tileOrder[j], tileOrder[i]];
    }

    // 3. Build physical element squares ONCE to optimize rendering speed
    for (let i = 0; i < size * size; i++) {
        const tileEl = document.createElement('div');
        tileEl.className = 'grid-tile';
        tileEl.dataset.index = i;

        // HIGH-PERFORMANCE INTERACTION LOGIC
        tileEl.addEventListener('click', (e) => {
            // If the user holds down 'Ctrl' or 'Shift' while clicking, rotate it!
            // Otherwise, clicking handles the select-and-swap system
            if (e.shiftKey || e.ctrlKey || e.metaKey) {
                rotateTile(i, tileEl);
            } else {
                handleTileSelection(i, tileEl, imageUrl);
            }
        });

        // Right-click shortcut to rotate easily without keys
        tileEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            rotateTile(i, tileEl);
        });

        container.appendChild(tileEl);
    }

    updateTileVisuals(imageUrl);
}

function rotateTile(index, tileEl) {
    const tile = tileOrder[index];
    tile.currentRotation = (tile.currentRotation + 90) % 360;
    tileEl.style.transform = `rotate(${tile.currentRotation}deg)`;
    gridData.rotations_performed++;
    checkWinCondition();
}

function handleTileSelection(index, tileEl, imageUrl) {
    const allTiles = document.querySelectorAll('.grid-tile');

    if (selectedTileIndex === null) {
        // First click: Select the tile
        selectedTileIndex = index;
        tileEl.classList.add('selected-chunk');
    } else {
        // Second click: Swap with target tile
        const originIndex = selectedTileIndex;
        const targetIndex = index;

        if (originIndex !== targetIndex) {
            // Swap array indices in memory
            [tileOrder[originIndex], tileOrder[targetIndex]] = [tileOrder[targetIndex], tileOrder[originIndex]];
            gridData.total_moves++;
            
            // Clear selections and update images instantly
            selectedTileIndex = null;
            allTiles.forEach(t => t.classList.remove('selected-chunk'));
            
            updateTileVisuals(imageUrl);
            checkWinCondition();
        } else {
            // Clicked same tile twice: Deselect it
            selectedTileIndex = null;
            tileEl.classList.remove('selected-chunk');
        }
    }
}

function updateTileVisuals(imageUrl) {
    const tiles = document.querySelectorAll('.grid-tile');
    const size = gridData.grid_size;

    tiles.forEach((tileEl) => {
        const index = parseInt(tileEl.dataset.index, 10);
        const tile = tileOrder[index];

        const correctRow = Math.floor(tile.correctIndex / size);
        const correctCol = tile.correctIndex % size;
        
        const percentX = size > 1 ? (correctCol / (size - 1)) * 100 : 0;
        const percentY = size > 1 ? (correctRow / (size - 1)) * 100 : 0;

        tileEl.style.backgroundImage = `url('${imageUrl}')`;
        tileEl.style.backgroundSize = `${size * 100}% ${size * 100}%`;
        tileEl.style.backgroundPosition = `${percentX}% ${percentY}%`;
        tileEl.style.transform = `rotate(${tile.currentRotation}deg)`;
    });
}

function checkWinCondition() {
    const isSolved = tileOrder.every((tile, index) => {
        return tile.correctIndex === index && tile.currentRotation === 0;
    });

    if (isSolved) {
        setTimeout(() => {
            const duration = Math.round(performance.now() - gridData.start_time);
            
            const summaryData = {
                participant_id: gridData.participant_id,
                session_id: gridData.session_id,
                grid_complexity: `${gridData.grid_size}x${gridData.grid_size}`,
                completion_time_seconds: (duration / 1000).toFixed(2),
                tile_swaps_executed: gridData.total_moves,
                rotations_executed: gridData.rotations_performed,
                status: "success"
            };

            document.getElementById('telemetry-summary').innerHTML = `<pre>${JSON.stringify(summaryData, null, 2)}</pre>`;
            switchScreen('screen-solved');
        }, 400);
    }
}

document.getElementById('btn-reset').addEventListener('click', () => {
    initializeGridPuzzle();
});

document.getElementById('btn-restart').addEventListener('click', () => {
    switchScreen('screen-setup');
});
