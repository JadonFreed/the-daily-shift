const UI_CONSTANTS = {
    TIMER_SECONDS: 60,
    BASE_POINTS_PER_LINE: 50, // 10 points per slot * 5 slots
    POINTS_PER_CORRECT_SLOT: 10,
    SCORE_MULTIPLIER_TIME_FACTOR: 60, // Total time for 1.0 multiplier
};

// Global state variables
let gameState = {
    allPlayers: [],
    lineStructures: [],
    currentTeam: null,
    linesToQuiz: 2,
    quizActive: false,
    timer: null,
    timeRemaining: 0,
    correctLineup: {},
    userLineup: {},
    mistakes: [],
};

// --- DOM Element Selection ---
const screens = {
    start: document.getElementById('start-screen'),
    quiz: document.getElementById('quiz-screen'),
    debrief: document.getElementById('debrief-screen'),
};
const teamSelect = document.getElementById('team-select');
const lineSlotsContainer = document.getElementById('line-slots-container');
const playerPool = document.getElementById('player-pool');
const timerBar = document.getElementById('timer-bar');
const timerText = document.getElementById('timer-text');
const poolCount = document.getElementById('pool-count');

// --- Utility Functions ---

/** Transitions between game screens */
function setScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

/** Loads JSON data and initializes the start screen */
async function loadDataAndInitialize() {
    try {
        const playersResponse = await fetch('nhl_players.json');
        if (!playersResponse.ok) throw new Error('Failed to load nhl_players.json');
        gameState.allPlayers = await playersResponse.json();

        const linesResponse = await fetch('team_line_structures.json');
        if (!linesResponse.ok) throw new Error('Failed to load team_line_structures.json');
        gameState.lineStructures = await linesResponse.json();

        initializeStartScreen();
        setScreen('start');
    } catch (error) {
        console.error("Data loading error. Ensure 'nhl_players.json' and 'team_line_structures.json' are in the same folder.", error);
        alert("Error loading game data. Check console for details. Ensure 'jersey_number' is in your player JSON.");
    }
}

/** Populates the team dropdown and sets default settings */
function initializeStartScreen() {
    const teams = gameState.lineStructures.map(t => t.team_abbr).sort();

    teamSelect.innerHTML = '';
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        teamSelect.appendChild(option);
    });

    gameState.currentTeam = teams[0] || null;

    teamSelect.addEventListener('change', (e) => gameState.currentTeam = e.target.value);

    document.querySelectorAll('.line-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.line-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            gameState.linesToQuiz = parseInt(e.target.dataset.lines);
        });
    });

    document.getElementById('start-shift-btn').addEventListener('click', startQuiz);
}

// --- Quiz Core Logic ---

/** Starts the quiz game */
function startQuiz() {
    if (!gameState.currentTeam) return alert("Please select a team.");

    gameState.quizActive = true;
    gameState.timeRemaining = UI_CONSTANTS.TIMER_SECONDS;
    gameState.userLineup = {};
    gameState.mistakes = [];

    setupLineup();
    renderQuizUI();
    startTimer();
    setScreen('quiz');
}

/** Sets up the correct answer key (Lineup) for the current quiz */
function setupLineup() {
    const teamData = gameState.lineStructures.find(t => t.team_abbr === gameState.currentTeam);
    if (!teamData) return;

    gameState.correctLineup = {};
    for (let i = 1; i <= gameState.linesToQuiz; i++) {
        const lineKey = `Line ${i}`;
        gameState.correctLineup[lineKey] = teamData.lines[lineKey];
        gameState.userLineup[lineKey] = Object.keys(teamData.lines[lineKey]).reduce((acc, slotKey) => {
            acc[slotKey] = null;
            return acc;
        }, {});
    }
}

/** Renders the player pool and line drop zones */
function renderQuizUI() {
    document.getElementById('current-team-display').textContent = `Team: **${gameState.currentTeam}**`;

    // 1. Render Line Drop Zones
    lineSlotsContainer.innerHTML = '';
    for (let i = 1; i <= gameState.linesToQuiz; i++) {
        const lineId = `Line ${i}`;
        const lineUnit = document.createElement('div');
        lineUnit.className = 'line-unit';
        lineUnit.innerHTML = `
            <h4>:: LINE ${i} ::</h4>
            <div class="line-slots" data-line-id="${lineId}">
                ${Object.keys(gameState.correctLineup[lineId]).map(slotId => `
                    <div class="line-slot" data-slot-id="${lineId}-${slotId}" data-position-type="${slotId.slice(0, 1).toUpperCase()}">
                        <div class="line-slot-label">${slotId}</div>
                    </div>
                `).join('')}
            </div>
        `;
        lineSlotsContainer.appendChild(lineUnit);
    }

    // 2. Render Player Pool
    playerPool.innerHTML = '';
    const allTeamPlayers = gameState.allPlayers.filter(p => p.team_abbr === gameState.currentTeam);
    const poolPlayers = allTeamPlayers.filter(p =>
        ['C', 'L', 'R', 'D'].includes(p.position) // Exclude Goalies if any accidentally got in
    ).sort((a, b) => b.rating - a.rating);

    const playersNeeded = gameState.linesToQuiz * 5;
    // Add a few extra players to the pool for difficulty
    const finalPool = poolPlayers.slice(0, playersNeeded + Math.min(5, poolPlayers.length - playersNeeded));

    finalPool.forEach(player => {
        const card = createPlayerCard(player);
        playerPool.appendChild(card);
    });
    poolCount.textContent = finalPool.length;

    // 3. Attach Drag and Drop Listeners
    attachDragDropListeners();
}

/** Creates a draggable player card DOM element */
function createPlayerCard(player) {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.setAttribute('draggable', true);
    card.dataset.playerId = player.id;
    // Store original position for validation, even if not displayed
    card.dataset.position = player.position;

    // *** NEW CARD CONTENT: Name, Jersey #, Age, Height, Rating ***
    card.innerHTML = `
        <div class="card-header">
             <span class="player-name">${player.player_name}</span>
             <span class="jersey-number">#${player.jersey_number || 'XX'}</span>
        </div>
        <div class="card-details">
            <span>AGE: ${player.age || '?'}</span>
            <span>HT: ${player.height || '?'}</span>
        </div>
        <div class="card-footer rating-tag">
            RATING: ${player.rating}
        </div>
    `;

    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('click', handleCardClick);
    return card;
}

// --- Drag and Drop Handlers ---

function handleDragStart(e) {
    if (!gameState.quizActive) return;
    e.dataTransfer.setData('text/plain', e.target.dataset.playerId);
    e.target.classList.add('dragging');
    const slot = e.target.closest('.line-slot');
    if (slot) {
        const [lineId, slotKey] = slot.dataset.slotId.split('-');
        gameState.userLineup[lineId][slotKey] = null;
    }
}

function handleDragOver(e) {
    e.preventDefault();
    if (!gameState.quizActive) return;
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    if (!gameState.quizActive) return;
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    if (!gameState.quizActive) return;
    const slot = e.currentTarget;
    const playerId = e.dataTransfer.getData('text/plain');
    const draggedCard = document.querySelector(`.player-card[data-player-id="${playerId}"]`);
    // Get actual position from the card's data attribute
    const playerPosition = draggedCard.dataset.position;
    const slotType = slot.dataset.positionType; // C, W, or D

    slot.classList.remove('drag-over');
    draggedCard.classList.remove('dragging');

    // Position Validation: C, L, R -> W slot. C -> C slot. D -> D slot.
    const isPositionValid =
        (slotType === 'C' && playerPosition === 'C') ||
        (slotType === 'W' && ['L', 'R', 'C'].includes(playerPosition)) ||
        (slotType === 'D' && playerPosition === 'D');

    if (!isPositionValid) {
        // Flash red only if dragged from pool, otherwise just reject
        if (!draggedCard.closest('.line-slot')) {
             draggedCard.classList.add('incorrect-flash');
             setTimeout(() => draggedCard.classList.remove('incorrect-flash'), 300);
        }
        return; // Reject drop
    }

    // Handle existing player in slot
    if (slot.children.length > 1) { // 1 child = label
        const existingCard = slot.querySelector('.player-card');
        playerPool.appendChild(existingCard); // Return to pool

        const [lineId_old, slotKey_old] = slot.dataset.slotId.split('-');
        gameState.userLineup[lineId_old][slotKey_old] = null; // Update state
    }

    // Place new card
    slot.appendChild(draggedCard);

    // Update state with full player object
    const [lineId, slotKey] = slot.dataset.slotId.split('-');
    const player = gameState.allPlayers.find(p => p.id === playerId);
    gameState.userLineup[lineId][slotKey] = player;

    checkQuizCompletion();
}

/** Handles moving a player card from a slot back to the pool by clicking */
function handleCardClick(e) {
    if (!gameState.quizActive) return;
    const card = e.currentTarget;
    const slot = card.closest('.line-slot');

    if (slot) {
        playerPool.appendChild(card); // Move back to pool visually
        const [lineId, slotKey] = slot.dataset.slotId.split('-');
        gameState.userLineup[lineId][slotKey] = null; // Update state
    }
}

/** Attaches all drag/drop event listeners */
function attachDragDropListeners() {
    document.querySelectorAll('.line-slot').forEach(slot => {
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('dragleave', handleDragLeave);
        slot.addEventListener('drop', handleDrop);
    });
}

// --- Timer and Completion ---

function startTimer() {
    clearInterval(gameState.timer);
    gameState.timeRemaining = UI_CONSTANTS.TIMER_SECONDS;
    updateTimerDisplay();

    gameState.timer = setInterval(() => {
        if (!gameState.quizActive) {
            clearInterval(gameState.timer);
            return;
        }
        gameState.timeRemaining -= 1;
        updateTimerDisplay();
        if (gameState.timeRemaining <= 0) {
            endQuiz(true); // Time's up
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timeRatio = Math.max(0, gameState.timeRemaining / UI_CONSTANTS.TIMER_SECONDS); // Ensure non-negative
    timerBar.style.width = `${timeRatio * 100}%`;
    timerText.textContent = `${gameState.timeRemaining}:00`;

    if (gameState.timeRemaining <= 10) {
        timerBar.style.backgroundColor = 'var(--color-error-red)';
        timerBar.style.boxShadow = `0 0 10px var(--color-error-red)`;
    } else {
        timerBar.style.backgroundColor = 'var(--color-accent-cyan)';
        timerBar.style.boxShadow = `0 0 10px var(--color-accent-cyan)`;
    }
}

function checkQuizCompletion() {
    let allSlotsFilled = true;
    for (const lineId in gameState.userLineup) {
        for (const slotKey in gameState.userLineup[lineId]) {
            if (gameState.userLineup[lineId][slotKey] === null) {
                allSlotsFilled = false;
                break;
            }
        }
        if (!allSlotsFilled) break;
    }
    if (allSlotsFilled) {
        endQuiz(false); // Completed
    }
}

function endQuiz(timeUp) {
    gameState.quizActive = false;
    clearInterval(gameState.timer);
    const results = calculateScore();
    renderDebrief(results, timeUp);
    setScreen('debrief');
}

// --- Scoring and Debrief ---

function calculateScore() {
    let correctSlots = 0;
    let totalSlots = 0;
    const mistakes = [];

    for (const lineId in gameState.correctLineup) {
        for (const slotKey in gameState.correctLineup[lineId]) {
            totalSlots++;
            const correctPlayer = gameState.correctLineup[lineId][slotKey]; // From structure file
            const userPlayer = gameState.userLineup[lineId][slotKey]; // From nhl_players.json

            // Compare by name (ensure consistency between files)
            if (userPlayer && correctPlayer && userPlayer.player_name === correctPlayer.name) {
                correctSlots++;
            } else {
                mistakes.push({ lineId, slotKey, user: userPlayer, correct: correctPlayer });
            }
        }
    }
    gameState.mistakes = mistakes;

    const accuracy = totalSlots > 0 ? (correctSlots / totalSlots) : 0;
    const speedBonus = gameState.timeRemaining > 0 ? (gameState.timeRemaining / UI_CONSTANTS.SCORE_MULTIPLIER_TIME_FACTOR) : 0;
    const baseScore = totalSlots * UI_CONSTANTS.POINTS_PER_CORRECT_SLOT * accuracy;
    const finalScore = Math.round(baseScore * (1 + speedBonus));

    return { correctSlots, totalSlots, accuracy, finalScore, speedBonus };
}

function renderDebrief(results, timeUp) {
    document.getElementById('debrief-title').textContent = timeUp
        ? "DEBRIEF SCREEN: TIME OVERRUN"
        : "DEBRIEF SCREEN: LINEUP VERIFIED";

    const accuracyPct = (results.accuracy * 100).toFixed(0);
    document.getElementById('debrief-time-bonus').textContent = `${results.speedBonus.toFixed(2)}x`;
    document.getElementById('debrief-accuracy').textContent = `${accuracyPct}% (${results.correctSlots}/${results.totalSlots})`;
    document.getElementById('debrief-points').textContent = results.finalScore;

    const mistakeList = document.getElementById('mistake-review-list');
    mistakeList.innerHTML = ''; // Clear previous mistakes

    if (gameState.mistakes.length === 0) {
        mistakeList.innerHTML = '<p class="review-placeholder">No errors detected. Flawless run.</p>';
    } else {
        gameState.mistakes.forEach(m => {
            const userPlayerName = m.user ? m.user.player_name : "EMPTY SLOT"; // Use player_name from user object
            const correctPlayer = m.correct; // From structure object
            // Find full player object to get trait
            const correctPlayerObj = gameState.allPlayers.find(p => p.player_name === correctPlayer.name);
            const correctPlayerTrait = correctPlayerObj?.unique_trait || "Data pending.";

            const item = document.createElement('div');
            item.className = 'mistake-item';
            item.innerHTML = `
                <p><strong>ERROR ${m.lineId} - ${m.slotKey}:</strong> Placed
                <span class="accent-text">${userPlayerName}</span>.</p>
                <p class="correct-answer">**CORRECT:** ${correctPlayer.name} (Rtg: ${correctPlayer.rating})</p>
                <p class="correct-answer">**WHY?** *${correctPlayerTrait}*</p>
            `;
            mistakeList.appendChild(item);
        });
    }
}

// --- Event Listeners and Initialization ---
document.getElementById('next-shift-btn').addEventListener('click', () => {
    setScreen('start'); // Go back to the start screen
});

window.addEventListener('load', loadDataAndInitialize); // Start app on load