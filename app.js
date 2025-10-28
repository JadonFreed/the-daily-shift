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
        // Load the General Player Data
        const playersResponse = await fetch('nhl_players.json');
        if (!playersResponse.ok) throw new Error('Failed to load nhl_players.json');
        gameState.allPlayers = await playersResponse.json();

        // Load the Line Structure Answer Key
        const linesResponse = await fetch('team_line_structures.json');
        if (!linesResponse.ok) throw new Error('Failed to load team_line_structures.json');
        gameState.lineStructures = await linesResponse.json();

        initializeStartScreen();
        setScreen('start');
    } catch (error) {
        console.error("Data loading error:", error);
        alert("Error loading game data. Check console for details.");
    }
}

/** Populates the team dropdown and sets default settings */
function initializeStartScreen() {
    const teams = gameState.lineStructures.map(t => t.team_abbr).sort();
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        teamSelect.appendChild(option);
    });

    // Set default team and lines
    gameState.currentTeam = teams[0] || null;
    document.querySelectorAll('.line-btn').forEach(btn => {
        if (parseInt(btn.dataset.lines) === gameState.linesToQuiz) {
            btn.classList.add('active');
        }
    });

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

    // Reset State
    gameState.quizActive = true;
    gameState.timeRemaining = UI_CONSTANTS.TIMER_SECONDS;
    gameState.userLineup = {};
    gameState.mistakes = [];

    // Setup Quiz
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
        gameState.userLineup[lineKey] = { C: null, W1: null, W2: null, D1: null, D2: null };
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
        // Only include players that are C, W, or D and are in the top 6 for the quiz lines
        ['C', 'L', 'R', 'D'].includes(p.position)
    ).sort((a, b) => b.rating - a.rating); // Sort by rating for a more interesting, ranked pool

    // Get only the top (linesToQuiz * 5) players + a few extra for difficulty
    const finalPool = poolPlayers.slice(0, (gameState.linesToQuiz * 5) + 5); 

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
    card.dataset.position = player.position;
    card.innerHTML = `
        <h5>${player.name}</h5>
        <p>POS: ${player.position}</p>
        <p class="rating-tag">RATING: ${player.rating}</p>
    `;

    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('click', handleCardClick); // For moving player back to pool
    return card;
}

// --- Drag and Drop Handlers ---

function handleDragStart(e) {
    if (!gameState.quizActive) return;
    e.dataTransfer.setData('text/plain', e.target.dataset.playerId);
    e.target.classList.add('dragging');
    // Remove player from userLineup if they were in a slot
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
    const playerPosition = draggedCard.dataset.position;
    const slotType = slot.dataset.positionType;
    
    slot.classList.remove('drag-over');
    draggedCard.classList.remove('dragging');

    // Basic Position Check: C, L, R can go into W1/W2 slots. C into C. D into D1/D2.
    const isPositionValid = 
        (slotType === 'C' && playerPosition === 'C') ||
        (slotType === 'W' && ['L', 'R', 'C'].includes(playerPosition)) || // Allow Centers in Wing slots for flexibility
        (slotType === 'D' && playerPosition === 'D');

    if (!isPositionValid) {
        // Flash red for invalid drop and return the card to the pool if it was dragged from there
        if (!draggedCard.closest('.line-slot')) {
             draggedCard.classList.add('incorrect-flash');
             setTimeout(() => draggedCard.classList.remove('incorrect-flash'), 300);
        }
        return; // Reject the drop
    }

    // Check if slot is empty
    if (slot.children.length > 1) { // 1 child is the label
        // If slot is occupied, move existing player back to pool
        const existingCard = slot.querySelector('.player-card');
        playerPool.appendChild(existingCard);
        
        // Remove existing player from userLineup
        const [lineId, slotKey] = slot.dataset.slotId.split('-');
        gameState.userLineup[lineId][slotKey] = null;
    }

    // Place the new card in the slot
    slot.appendChild(draggedCard);

    // Update userLineup state
    const [lineId, slotKey] = slot.dataset.slotId.split('-');
    const player = gameState.allPlayers.find(p => p.id === playerId);
    gameState.userLineup[lineId][slotKey] = player;

    // Check for quiz completion after drop
    checkQuizCompletion();
}

/** Handles moving a player card from a slot back to the pool by clicking */
function handleCardClick(e) {
    if (!gameState.quizActive) return;
    const card = e.currentTarget;
    const slot = card.closest('.line-slot');
    
    if (slot) {
        // Move card back to pool
        playerPool.appendChild(card);
        
        // Update userLineup state
        const [lineId, slotKey] = slot.dataset.slotId.split('-');
        gameState.userLineup[lineId][slotKey] = null;
    }
}

/** Attaches all drag/drop event listeners to the necessary elements */
function attachDragDropListeners() {
    document.querySelectorAll('.line-slot').forEach(slot => {
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('dragleave', handleDragLeave);
        slot.addEventListener('drop', handleDrop);
    });

    // Player cards (dragstart is attached when they are created)
}

// --- Timer and Completion ---

/** Starts the 60 second countdown */
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

/** Updates the visual timer */
function updateTimerDisplay() {
    const timeRatio = gameState.timeRemaining / UI_CONSTANTS.TIMER_SECONDS;
    timerBar.style.width = `${timeRatio * 100}%`;
    timerText.textContent = `${gameState.timeRemaining}:00`;

    if (gameState.timeRemaining <= 10) {
        timerBar.style.backgroundColor = var(--color-error-red); // Glitch red for tension
        timerBar.style.boxShadow = `0 0 10px var(--color-error-red)`;
    } else {
        timerBar.style.backgroundColor = var(--color-accent-magenta);
        timerBar.style.boxShadow = `0 0 10px var(--color-accent-magenta)`;
    }
}

/** Checks if all required slots have a player */
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
        endQuiz(false); // Completed by filling all slots
    }
}

/** Ends the quiz and calculates score */
function endQuiz(timeUp) {
    gameState.quizActive = false;
    clearInterval(gameState.timer);

    const results = calculateScore();
    renderDebrief(results, timeUp);
    setScreen('debrief');
}

// --- Scoring and Debrief ---

/** Calculates final score, accuracy, and identifies mistakes */
function calculateScore() {
    let correctSlots = 0;
    let totalSlots = 0;
    const mistakes = [];

    // Check each line and slot
    for (const lineId in gameState.correctLineup) {
        for (const slotKey in gameState.correctLineup[lineId]) {
            totalSlots++;
            
            const correctPlayer = gameState.correctLineup[lineId][slotKey];
            const userPlayer = gameState.userLineup[lineId][slotKey];
            
            if (userPlayer && correctPlayer && userPlayer.id === correctPlayer.id) {
                correctSlots++;
            } else {
                // Log mistake
                mistakes.push({
                    lineId,
                    slotKey,
                    user: userPlayer,
                    correct: correctPlayer
                });
            }
        }
    }

    gameState.mistakes = mistakes;

    // Scoring Formula (Accuracy * Time Multiplier)
    const accuracy = correctSlots / totalSlots;
    const speedBonus = gameState.timeRemaining > 0 ? (gameState.timeRemaining / UI_CONSTANTS.SCORE_MULTIPLIER_TIME_FACTOR) : 0;
    const baseScore = totalSlots * UI_CONSTANTS.POINTS_PER_CORRECT_SLOT * accuracy;
    const finalScore = Math.round(baseScore * (1 + speedBonus));

    return {
        correctSlots,
        totalSlots,
        accuracy: accuracy,
        finalScore: finalScore,
        speedBonus: speedBonus,
    };
}

/** Renders the results screen */
function renderDebrief(results, timeUp) {
    document.getElementById('debrief-title').textContent = timeUp 
        ? "DEBRIEF SCREEN: TIME OVERRUN" 
        : "DEBRIEF SCREEN: LINEUP VERIFIED";

    const accuracyPct = (results.accuracy * 100).toFixed(0);

    document.getElementById('debrief-time-bonus').textContent = `${results.speedBonus.toFixed(2)}x`;
    document.getElementById('debrief-accuracy').textContent = `${accuracyPct}% (${results.correctSlots}/${results.totalSlots})`;
    document.getElementById('debrief-points').textContent = results.finalScore;