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
    
    for (let i = 0; i < size * size; i++) {
        const randomRotationIdx = Math.floor(Math.random() * rotations.length);
        tileOrder.push({
            correctIndex: i,
            currentRotation: rotations[randomRotationIdx]
        });
    }

    for (let i = tileOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tileOrder[i], tileOrder[j]] = [tileOrder[j], tileOrder[i]];
    }

    // Build the grid
    for (let i = 0; i < size * size; i++) {
        const tileEl = document.createElement('div');
        tileEl.className = 'grid-tile';
        tileEl.dataset.index = i;

        // Double tap or hold detection variables
        let lastTap = 0;
        let dragGhost = null;

        // BUG FIX 1 & 2: Prevent Safari from hijacking the touch start
        tileEl.addEventListener('touchstart', (e) => {
            // Stops Safari from processing a double tap as a camera zoom
            e.preventDefault(); 
            
            const now = performance.now();
            if (now - lastTap < 250) {
                rotateTile(i, tileEl);
                lastTap = 0;
                return;
            }
            lastTap = now;

            if (e.touches.length > 1) return;
            const touch = e.touches[0];
            
            // Create the placeholder drag box
            dragGhost = document.createElement('div');
            dragGhost.className = 'drag-indicator-box';
            dragGhost.style.width = `${tileEl.offsetWidth}px`;
            dragGhost.style.height = `${tileEl.offsetHeight}px`;
            dragGhost.style.left = `${touch.clientX - tileEl.offsetWidth/2}px`;
            dragGhost.style.top = `${touch.clientY - tileEl.offsetHeight/2}px`;
            document.body.appendChild(dragGhost);
            
            tileEl.classList.add('source-tile-faded');
        }, { passive: false }); // 'passive: false' allows us to use preventDefault() safely

        // BUG FIX 1: Prevent Safari from scrolling or moving the screen while dragging
        tileEl.addEventListener('touchmove', (e) => {
            e.preventDefault(); // This stops the screen from sliding or bouncing!
            
            if (!dragGhost) return;
            const touch = e.touches[0];
            dragGhost.style.left = `${touch.clientX - dragGhost.offsetWidth/2}px`;
            dragGhost.style.top = `${touch.clientY - dragGhost.offsetHeight/2}px`;
        }, { passive: false });

        tileEl.addEventListener('touchend', (e) => {
            e.preventDefault();
            
            if (!dragGhost) return;
            document.body.removeChild(dragGhost);
            dragGhost = null;
            tileEl.classList.remove('source-tile-faded');

            const touch = e.changedTouches[0];
            const elementTarget = document.elementFromPoint(touch.clientX, touch.clientY);
            
            if (elementTarget && elementTarget.classList.contains('grid-tile')) {
                const targetIndex = parseInt(elementTarget.dataset.index, 10);
                if (i !== targetIndex) {
                    [tileOrder[i], tileOrder[targetIndex]] = [tileOrder[targetIndex], tileOrder[i]];
                    gridData.total_moves++;
                    updateTileVisuals(imageUrl);
                    checkWinCondition();
                }
            }
        }, { passive: false });

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
