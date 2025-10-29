const UI_CONSTANTS = {
    TIMER_SECONDS: 60,
    POINTS_PER_CORRECT_SLOT: 10,
    SCORE_MULTIPLIER_TIME_FACTOR: 60,
    FEEDBACK_DURATION: 500,
    PHASE_1_QUESTIONS: 10,
    PHASE_1_MASTERY_ACCURACY: 0.8,
    PHASE_2_QUESTIONS: 10,
    PHASE_2_MASTERY_ACCURACY: 0.9,
};

// --- Team Colors Mapping ---
const teamColors = {
    'ANA': { primary: '#F47A38', secondary: '#B9975B' }, // Orange, Gold
    'BOS': { primary: '#FFB81C', secondary: '#000000' }, // Gold, Black
    'BUF': { primary: '#003087', secondary: '#FFB81C' }, // Royal Blue, Gold
    'CGY': { primary: '#C8102E', secondary: '#F1BE48' }, // Red, Yellow Gold
    'CAR': { primary: '#CC0000', secondary: '#000000' }, // Red, Black
    'CHI': { primary: '#CF0A2C', secondary: '#000000' }, // Red, Black
    'COL': { primary: '#6F263D', secondary: '#236192' }, // Burgundy, Blue
    'CBJ': { primary: '#002654', secondary: '#CE1126' }, // Union Blue, Red
    'DAL': { primary: '#006847', secondary: '#8F8F8C' }, // Victory Green, Silver
    'DET': { primary: '#CE1126', secondary: '#FFFFFF' }, // Red, White (use dark text)
    'EDM': { primary: '#041E42', secondary: '#FF4C00' }, // Navy Blue, Orange
    'FLA': { primary: '#C8102E', secondary: '#041E42' }, // Red, Navy
    'LAK': { primary: '#111111', secondary: '#A2AAAD' }, // Black, Silver
    'MIN': { primary: '#154734', secondary: '#A6192E' }, // Forest Green, Iron Range Red
    'MTL': { primary: '#AF1E2D', secondary: '#192168' }, // Red, Blue
    'NSH': { primary: '#FFB81C', secondary: '#041E42' }, // Gold, Navy Blue
    'NJD': { primary: '#CE1126', secondary: '#000000' }, // Red, Black
    'NYI': { primary: '#00539B', secondary: '#F47D30' }, // Royal Blue, Orange
    'NYR': { primary: '#0038A8', secondary: '#CE1126' }, // Blue, Red
    'OTT': { primary: '#C52032', secondary: '#000000' }, // Red, Black
    'PHI': { primary: '#F74902', secondary: '#000000' }, // Orange, Black
    'PIT': { primary: '#FCB514', secondary: '#000000' }, // Pittsburgh Gold, Black
    'SJS': { primary: '#006D75', secondary: '#000000' }, // Teal, Black
    'SEA': { primary: '#001F5B', secondary: '#99D9D9' }, // Deep Sea Blue, Ice Blue
    'STL': { primary: '#002F87', secondary: '#FCB514' }, // Blue, Yellow
    'TBL': { primary: '#002868', secondary: '#FFFFFF' }, // Blue, White (use dark text)
    'TOR': { primary: '#00205B', secondary: '#FFFFFF' }, // Blue, White (use dark text)
    'VAN': { primary: '#00205B', secondary: '#00843D' }, // Blue, Green
    'VGK': { primary: '#B4975A', secondary: '#333F42' }, // Steel Grey, Gold
    'WSH': { primary: '#C8102E', secondary: '#041E42' }, // Red, Navy Blue
    'WPG': { primary: '#041E42', secondary: '#AC162C' }, // Navy Blue, Red
    'DEFAULT': { primary: '#555555', secondary: '#BBBBBB' } // Default Grey
};
// Teams needing dark text on white/light secondary
const darkTextTeams = ['DET', 'TBL', 'TOR'];


// --- Global State Variables ---
let gameState = {
    // Shared state
    allPlayers: [],
    lineStructures: [],
    currentTeam: null, // Team being played
    linesToQuiz: 2,
    favoriteTeam: null, // NEW: User's selected favorite
    // Mode specific
    currentMode: 'quiz', // 'quiz' or 'scout'
    quizActive: false,
    timer: null,
    timeRemaining: 0,
    userLineup: {},
    mistakes: [],
    // Scout School state
    currentScoutPhase: 0,
    scoutPhaseProgress: 0,
    scoutPhaseCorrect: 0,
    scoutPhaseQuestionData: null,
    masteredTeams: new Set(),
    unlockedTeams: [], // Will be populated based on favorite/progress
};

// --- DOM Element Selection ---
const screens = { /* ... (keep existing screen selections) ... */
    start: document.getElementById('start-screen'),
    quiz: document.getElementById('quiz-screen'),
    debrief: document.getElementById('debrief-screen'),
    scoutPhase1: document.getElementById('scout-phase-1-screen'),
    scoutPhase2: document.getElementById('scout-phase-2-screen'),
    phaseComplete: document.getElementById('phase-complete-screen'),
};
const modeRadios = document.querySelectorAll('input[name="game-mode"]');
const favoriteTeamSelect = document.getElementById('favorite-team-select'); // NEW
const teamSelect = document.getElementById('team-select'); // Target team
const lineOptionsButtons = document.querySelectorAll('.line-options .line-btn');
const linesToBuildSection = document.getElementById('lines-to-build-section');
const startButton = document.getElementById('start-shift-btn');
const scoutModeInfo = document.getElementById('scout-mode-info');
// (Keep other existing DOM selections for quiz, phases, etc.)
const timerContainer = document.querySelector('.timer-bar-container');
const timerBar = document.getElementById('timer-bar');
const timerText = document.getElementById('timer-text');
const currentTeamDisplay = document.getElementById('current-team-display');
const lineSlotsContainer = document.getElementById('line-slots-container');
const playerPoolArea = document.querySelector('.player-pool-area');
const playerPool = document.getElementById('player-pool');
const poolCount = document.getElementById('pool-count');
const submitLineupButton = document.getElementById('submit-lineup-btn');
const phase1Team = document.getElementById('scout-phase-1-team');
const phase1CardDisplay = document.getElementById('phase-1-card-display');
const phase1Choices = document.getElementById('phase-1-choices');
const phase1Feedback = document.getElementById('phase-1-feedback');
const phase1Progress = document.getElementById('phase-1-progress');
const phase2Team = document.getElementById('scout-phase-2-team');
const phase2PlayerA = document.getElementById('phase-2-player-A');
const phase2PlayerB = document.getElementById('phase-2-player-B');
const phase2Feedback = document.getElementById('phase-2-feedback');
const phase2Progress = document.getElementById('phase-2-progress');
const phaseCompleteTitle = document.getElementById('phase-complete-title');
const phaseCompleteMessage = document.getElementById('phase-complete-message');
const nextPhaseButton = document.getElementById('next-phase-btn');
const teamMasteryBadge = document.getElementById('team-mastery-badge');
const masteredTeamName = document.getElementById('mastered-team-name');
const timeBonusDisplay = document.getElementById('time-bonus-display');
const debriefTimeBonus = document.getElementById('debrief-time-bonus');
const debriefAccuracy = document.getElementById('debrief-accuracy');
const debriefPoints = document.getElementById('debrief-points');
const mistakeList = document.getElementById('mistake-review-list');
const nextShiftButton = document.getElementById('next-shift-btn');


// --- Utility Functions --- (Keep setScreen, shuffleArray)
function setScreen(screenName) { /* ... (no changes needed) ... */
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
    } else {
        console.error("Screen not found:", screenName);
    }
     document.body.classList.toggle('learning-mode', gameState.currentMode === 'scout');
     screens.quiz.classList.toggle('learning-mode', gameState.currentMode === 'scout');
     screens.debrief.classList.toggle('learning-mode', gameState.currentMode === 'scout');
}
function shuffleArray(array) { /* ... (no changes needed) ... */
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


// --- Initialization ---

async function loadDataAndInitialize() {
    try {
        const playersResponse = await fetch('nhl_players.json');
        if (!playersResponse.ok) throw new Error('Failed to load nhl_players.json');
        gameState.allPlayers = await playersResponse.json();

        const linesResponse = await fetch('team_line_structures.json');
        if (!linesResponse.ok) throw new Error('Failed to load team_line_structures.json');
        gameState.lineStructures = await linesResponse.json();

        loadProgress(); // Load mastered/unlocked teams FIRST
        initializeStartScreen(); // THEN initialize UI
        setScreen('start');
    } catch (error) {
        console.error("Data loading error:", error);
        alert("Error loading game data. Check console.");
    }
}

function initializeStartScreen() {
    // Mode Selection
    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            gameState.currentMode = e.target.value;
            updateStartScreenUI(); // Update team lists based on mode
        });
    });

    // Populate Favorite Team Dropdown (All teams available here)
    const allTeamsSorted = gameState.lineStructures.map(t => t.team_abbr).sort();
    favoriteTeamSelect.innerHTML = '';
    allTeamsSorted.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        favoriteTeamSelect.appendChild(option);
    });
    // Set default favorite or load saved one
    favoriteTeamSelect.value = gameState.favoriteTeam || allTeamsSorted[0];
    gameState.favoriteTeam = favoriteTeamSelect.value; // Ensure state matches UI
    favoriteTeamSelect.addEventListener('change', (e) => {
        gameState.favoriteTeam = e.target.value;
        saveProgress(); // Save favorite team choice
        updateStartScreenUI(); // Update target team dropdown if needed
    });


    // Target Team Select (populated based on mode in updateStartScreenUI)
    teamSelect.addEventListener('change', (e) => gameState.currentTeam = e.target.value);

    // Line Options
    lineOptionsButtons.forEach(btn => { /* ... (no changes needed) ... */
        btn.addEventListener('click', (e) => {
            lineOptionsButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            gameState.linesToQuiz = parseInt(e.target.dataset.lines);
        });
    });

    // Start Button
    startButton.addEventListener('click', startGame);

    // Initial UI Update
    updateStartScreenUI();
}

function updateStartScreenUI() {
    const isScoutMode = gameState.currentMode === 'scout';
    linesToBuildSection.style.display = isScoutMode ? 'none' : 'block';
    scoutModeInfo.style.display = isScoutMode ? 'block' : 'none';

    // Populate Target Team Dropdown
    let teamsToShow;
    if (isScoutMode) {
        // Scout mode: Show unlocked teams + favorite team
        teamsToShow = [...new Set([gameState.favoriteTeam, ...gameState.unlockedTeams])].sort();
    } else {
        // Quiz mode: Show all teams
        teamsToShow = gameState.lineStructures.map(t => t.team_abbr).sort();
    }

    teamSelect.innerHTML = '';
    teamsToShow.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team + (gameState.masteredTeams.has(team) ? ' ✅' : ''); // Mark mastered teams
        teamSelect.appendChild(option);
    });

    // Set default target team
    if (isScoutMode) {
        // Default to favorite team if available, otherwise first unlocked
        gameState.currentTeam = teamsToShow.includes(gameState.favoriteTeam) ? gameState.favoriteTeam : teamsToShow[0];
    } else {
        // Default to first team or previously selected favorite
         gameState.currentTeam = teamsToShow.includes(gameState.favoriteTeam) ? gameState.favoriteTeam : teamsToShow[0];
    }
     teamSelect.value = gameState.currentTeam || teamsToShow[0]; // Ensure dropdown matches state

}


// --- Game Start Logic ---

function startGame() {
    // Read the selected target team directly from the dropdown at start time
    gameState.currentTeam = teamSelect.value;
    if (!gameState.currentTeam) return alert("Please select a target team.");

    if (gameState.currentMode === 'quiz') {
        startQuizMode();
    } else {
        startScoutSchool();
    }
}


// --- Player Card Creation (NEW Jersey Style) ---
function createPlayerCard(player, hideDetails = false) {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.setAttribute('draggable', true);
    card.dataset.playerId = player.id;
    card.dataset.position = player.position; // Store actual position

    // Apply Team Colors using CSS Variables
    const colors = teamColors[player.team_abbr] || teamColors['DEFAULT'];
    card.style.setProperty('--team-color-primary', colors.primary);
    card.style.setProperty('--team-color-secondary', colors.secondary);

    // Determine text color based on team (e.g., for white jerseys)
    if (darkTextTeams.includes(player.team_abbr)) {
        card.style.color = '#111'; // Dark text
        card.style.textShadow = '1px 1px 1px rgba(255,255,255,0.7)';
    } else {
        card.style.color = '#FFF'; // Light text
        card.style.textShadow = '1px 1px 2px rgba(0,0,0,0.7)';
    }


    // Content: Jersey Number and Name (Rating/Height/Age removed from display)
    const jerseyNumber = player.jersey_number || 'XX';
    const playerName = player.player_name || 'Unknown';

    card.innerHTML = `
        <div class="card-jersey-number">${jerseyNumber}</div>
        <div class="card-player-name">${playerName}</div>
    `;

    // Add drag listener
    card.addEventListener('dragstart', handleDragStart);

    // Add click listener (only if not hiding details - prevents clicking on Phase 1 card)
    if (!hideDetails) {
         card.addEventListener('click', handleCardClick);
    }

    // Phase 1 Specific: Hide the name visually using CSS (added in style.css)
    if (hideDetails) {
        // The HTML includes the name, but CSS hides .phase-card-display .card-player-name
    }


    return card; // Return the element itself
}


// --- Drag and Drop Handlers --- (Keep handleDragStart, handleDragOver, handleDragLeave)
function handleDragStart(e) { /* ... (no changes needed) ... */
    if (!gameState.quizActive && gameState.currentMode !== 'scout') return;
    e.dataTransfer.setData('text/plain', e.target.dataset.playerId);
    e.target.classList.add('dragging');
    const slot = e.target.closest('.line-slot');
    if (slot) {
        const [lineId, slotKey] = slot.dataset.slotId.split('-');
         if (gameState.userLineup[lineId]) {
            gameState.userLineup[lineId][slotKey] = null;
        }
        slot.classList.remove('feedback-correct', 'feedback-warning', 'feedback-incorrect');
    }
}
function handleDragOver(e) { /* ... (no changes needed) ... */
     e.preventDefault();
     if (!gameState.quizActive && gameState.currentMode !== 'scout') return;
    e.currentTarget.classList.add('drag-over');
}
function handleDragLeave(e) { /* ... (no changes needed) ... */
     if (!gameState.quizActive && gameState.currentMode !== 'scout') return;
    e.currentTarget.classList.remove('drag-over');
}


// Drop Handler (Keep existing logic, including Scout feedback)
function handleDrop(e) { /* ... (no changes needed, relies on stored position) ... */
    e.preventDefault();
     if (!gameState.quizActive && gameState.currentMode !== 'scout') return;

    const slot = e.currentTarget;
    const playerId = e.dataTransfer.getData('text/plain');
    const draggedCard = document.querySelector(`.player-card[data-player-id="${playerId}"]`);
    if (!draggedCard) return;

    const playerPosition = draggedCard.dataset.position; // Crucial: Use stored position
    const slotType = slot.dataset.positionType;

    slot.classList.remove('drag-over');
    draggedCard.classList.remove('dragging');

    // Position Validation
    const isPositionValid =
        (slotType === 'C' && playerPosition === 'C') ||
        (slotType === 'W' && ['L', 'R', 'C'].includes(playerPosition)) ||
        (slotType === 'D' && playerPosition === 'D');

    if (!isPositionValid) {
        if (gameState.currentMode === 'scout') {
             applyFeedback(slot, 'incorrect');
        } else if (!draggedCard.closest('.line-slot')) {
             draggedCard.classList.add('incorrect-flash');
             setTimeout(() => draggedCard.classList.remove('incorrect-flash'), UI_CONSTANTS.FEEDBACK_DURATION);
        }
        return;
    }

    // Handle existing player
    if (slot.children.length > 1) {
        const existingCard = slot.querySelector('.player-card');
        if (existingCard) {
            playerPool.appendChild(existingCard);
             const [lineId_old, slotKey_old] = slot.dataset.slotId.split('-');
             if (gameState.userLineup[lineId_old]) {
                 gameState.userLineup[lineId_old][slotKey_old] = null;
            }
        }
    }

    // Place new card
    slot.appendChild(draggedCard);

    // Update state
    const [lineId, slotKey] = slot.dataset.slotId.split('-');
    const player = gameState.allPlayers.find(p => p.id === playerId);
     if (gameState.userLineup[lineId]) {
        gameState.userLineup[lineId][slotKey] = player;
    }

    // Instant Feedback for Scout Mode Phase 3
    if (gameState.currentMode === 'scout' && gameState.currentScoutPhase === 3) {
        const correctPlayerForSlot = gameState.correctLineup[lineId]?.[slotKey];
        if (correctPlayerForSlot && player.player_name === correctPlayerForSlot.name) {
            applyFeedback(slot, 'correct');
        } else {
            applyFeedback(slot, 'incorrect');
        }
    }

    // Only auto-check completion in quiz mode
    if (gameState.currentMode === 'quiz') {
         checkQuizCompletion();
    }
}


// Click Handler (Keep existing logic)
function handleCardClick(e) { /* ... (no changes needed) ... */
      if (e.currentTarget.closest('#phase-1-card-display') || e.currentTarget.closest('.phase-2-card')) {
        return;
    }
     if (!gameState.quizActive && gameState.currentMode !== 'scout') return;

    const card = e.currentTarget;
    const slot = card.closest('.line-slot');

    if (slot) {
        playerPool.appendChild(card);
        const [lineId, slotKey] = slot.dataset.slotId.split('-');
         if (gameState.userLineup[lineId]) {
            gameState.userLineup[lineId][slotKey] = null;
        }
        slot.classList.remove('feedback-correct', 'feedback-warning', 'feedback-incorrect');
    }
}

// --- Attach Listeners (Keep existing logic) ---
function attachDragDropListeners() { /* ... (no changes needed) ... */
    document.querySelectorAll('.line-slot').forEach(slot => {
        slot.removeEventListener('dragover', handleDragOver);
        slot.removeEventListener('dragleave', handleDragLeave);
        slot.removeEventListener('drop', handleDrop);
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('dragleave', handleDragLeave);
        slot.addEventListener('drop', handleDrop);
    });
     playerPool.querySelectorAll('.player-card').forEach(card => {
         card.removeEventListener('dragstart', handleDragStart);
         card.addEventListener('dragstart', handleDragStart);
         card.removeEventListener('click', handleCardClick);
         card.addEventListener('click', handleCardClick);
     });
    lineSlotsContainer.querySelectorAll('.player-card').forEach(card => {
         card.removeEventListener('dragstart', handleDragStart);
         card.addEventListener('dragstart', handleDragStart);
          card.removeEventListener('click', handleCardClick);
         card.addEventListener('click', handleCardClick);
    });
}


// --- Apply Feedback (Keep existing logic) ---
function applyFeedback(element, type) { /* ... (no changes needed) ... */
     element.classList.remove('feedback-correct', 'feedback-warning', 'feedback-incorrect');
    element.classList.add(`feedback-${type}`);
    setTimeout(() => {
        element.classList.remove(`feedback-${type}`);
    }, UI_CONSTANTS.FEEDBACK_DURATION);
}


// --- Scout School Phase Implementations (Keep existing phase logic) ---
// startScoutSchool, startScoutPhase1, generatePhase1Question, handlePhase1Answer,
// startScoutPhase2, generatePhase2Question, handlePhase2Answer,
// startScoutPhase3, handleSubmitLineup, showPhaseCompleteScreen
// (These functions remain structurally the same, using the new createPlayerCard)

function startScoutSchool() { /* ... (no changes needed) ... */
    gameState.currentScoutPhase = 1;
    gameState.scoutPhaseProgress = 0;
    gameState.scoutPhaseCorrect = 0;
    startScoutPhase1();
}

function startScoutPhase1() { /* ... (no changes needed) ... */
     phase1Team.textContent = `Team: ${gameState.currentTeam}`;
    generatePhase1Question();
    setScreen('scoutPhase1');
}

function generatePhase1Question() { /* ... (Calls new createPlayerCard with hideDetails=true) ... */
    phase1Feedback.textContent = '';
    phase1Feedback.className = 'phase-feedback';

    const teamPlayers = gameState.allPlayers.filter(p => p.team_abbr === gameState.currentTeam)
                                       .sort((a, b) => b.rating - a.rating)
                                       .slice(0, 15); // Use top players for recognition
    if (teamPlayers.length < 4) { /* ... (error handling) ... */
         alert("Not enough player data for this team to run Phase 1.");
         goToStartScreen();
         return;
     }

    // Select target, ensure progress cycles
    const targetPlayerIndex = gameState.scoutPhaseProgress % Math.min(UI_CONSTANTS.PHASE_1_QUESTIONS, teamPlayers.length);
    const targetPlayer = teamPlayers[targetPlayerIndex];


    // Create card HIDDEN NAME
    const card = createPlayerCard(targetPlayer, true); // Pass 'true' to hide name/details
    phase1CardDisplay.innerHTML = '';
    phase1CardDisplay.appendChild(card);

    // Get distractors
    const distractors = shuffleArray(teamPlayers.filter(p => p.id !== targetPlayer.id)).slice(0, 3);
    const choices = shuffleArray([targetPlayer, ...distractors]);

    // Render choices
    phase1Choices.innerHTML = '';
    choices.forEach(player => { /* ... (button creation) ... */
        const button = document.createElement('button');
        button.className = 'choice-btn';
        button.textContent = player.player_name;
        button.onclick = () => handlePhase1Answer(player.id === targetPlayer.id, button, targetPlayer.id);
        phase1Choices.appendChild(button);
    });

    gameState.scoutPhaseQuestionData = { targetPlayerId: targetPlayer.id };
    updatePhaseProgress(1);
}

function handlePhase1Answer(isCorrect, button, targetPlayerId) { /* ... (no changes needed) ... */
    phase1Choices.querySelectorAll('button').forEach(btn => btn.disabled = true);

    if (isCorrect) {
        gameState.scoutPhaseCorrect++;
        phase1Feedback.textContent = 'CORRECT!';
        phase1Feedback.className = 'phase-feedback correct';
        button.classList.add('correct');
    } else {
        phase1Feedback.textContent = `INCORRECT! Correct was ${gameState.allPlayers.find(p=>p.id === targetPlayerId)?.player_name || '??'}`;
        phase1Feedback.className = 'phase-feedback incorrect';
        button.classList.add('incorrect');
        phase1Choices.querySelectorAll('button').forEach(btn => {
             const btnPlayerName = btn.textContent;
             const targetName = gameState.allPlayers.find(p=>p.id === targetPlayerId)?.player_name;
             if (btnPlayerName === targetName) {
                 btn.classList.add('correct');
             }
         });
    }

    gameState.scoutPhaseProgress++;

    if (gameState.scoutPhaseProgress >= UI_CONSTANTS.PHASE_1_QUESTIONS) {
        const accuracy = gameState.scoutPhaseCorrect / UI_CONSTANTS.PHASE_1_QUESTIONS;
        if (accuracy >= UI_CONSTANTS.PHASE_1_MASTERY_ACCURACY) {
            setTimeout(() => showPhaseCompleteScreen(1, true), 1500);
        } else {
             setTimeout(() => showPhaseCompleteScreen(1, false), 1500);
        }
    } else {
        setTimeout(generatePhase1Question, 1500);
    }
}

function startScoutPhase2() { /* ... (no changes needed) ... */
    gameState.scoutPhaseProgress = 0;
    gameState.scoutPhaseCorrect = 0;
    phase2Team.textContent = `Team: ${gameState.currentTeam}`;
    generatePhase2Question();
    setScreen('scoutPhase2');
}

function generatePhase2Question() { /* ... (Calls new createPlayerCard with hideDetails=false) ... */
    phase2Feedback.textContent = '';
    phase2Feedback.className = 'phase-feedback';
    phase2PlayerA.innerHTML = '';
    phase2PlayerB.innerHTML = '';
    phase2PlayerA.onclick = null;
    phase2PlayerB.onclick = null;

    const teamPlayers = gameState.allPlayers.filter(p => p.team_abbr === gameState.currentTeam)
                                       .sort((a, b) => b.rating - a.rating)
                                       .slice(0, 15); // Use top players
     if (teamPlayers.length < 2) { /* ... (error handling) ... */
         alert("Not enough player data for this team to run Phase 2.");
         goToStartScreen();
         return;
     }

    let playerA, playerB;
     let attempts = 0;
     do {
         const shuffledPlayers = shuffleArray([...teamPlayers]);
         playerA = shuffledPlayers[0];
         playerB = shuffledPlayers[1];
         attempts++;
     } while (playerA.rating === playerB.rating && attempts < 10 && teamPlayers.length > 2);


    // Create cards with NAME VISIBLE
    phase2PlayerA.appendChild(createPlayerCard(playerA, false));
    phase2PlayerB.appendChild(createPlayerCard(playerB, false));

    const higherRatedPlayerId = playerA.rating >= playerB.rating ? playerA.id : playerB.id;
    gameState.scoutPhaseQuestionData = { higherRatedPlayerId };

    phase2PlayerA.onclick = () => handlePhase2Answer(playerA.id === higherRatedPlayerId, phase2PlayerA);
    phase2PlayerB.onclick = () => handlePhase2Answer(playerB.id === higherRatedPlayerId, phase2PlayerB);

    updatePhaseProgress(2);
}

function handlePhase2Answer(isCorrect, selectedCardElement) { /* ... (no changes needed) ... */
     phase2PlayerA.onclick = null;
    phase2PlayerB.onclick = null;

    if (isCorrect) {
        gameState.scoutPhaseCorrect++;
        phase2Feedback.textContent = 'CORRECT!';
        phase2Feedback.className = 'phase-feedback correct';
        selectedCardElement.style.borderColor = '#39FF14';
    } else {
        phase2Feedback.textContent = 'INCORRECT!';
        phase2Feedback.className = 'phase-feedback incorrect';
        selectedCardElement.style.borderColor = 'var(--color-error-red)';

        const correctCard = (phase2PlayerA.querySelector(`[data-player-id="${gameState.scoutPhaseQuestionData.higherRatedPlayerId}"]`)) ? phase2PlayerA : phase2PlayerB;
         if (correctCard !== selectedCardElement) {
             correctCard.style.borderColor = '#39FF14';
         }
    }
     setTimeout(() => {
         phase2PlayerA.style.borderColor = 'transparent';
         phase2PlayerB.style.borderColor = 'transparent';
     }, UI_CONSTANTS.FEEDBACK_DURATION * 2);

    gameState.scoutPhaseProgress++;

    if (gameState.scoutPhaseProgress >= UI_CONSTANTS.PHASE_2_QUESTIONS) {
        const accuracy = gameState.scoutPhaseCorrect / UI_CONSTANTS.PHASE_2_QUESTIONS;
        if (accuracy >= UI_CONSTANTS.PHASE_2_MASTERY_ACCURACY) {
             setTimeout(() => showPhaseCompleteScreen(2, true), 1500);
        } else {
             setTimeout(() => showPhaseCompleteScreen(2, false), 1500);
        }
    } else {
        setTimeout(generatePhase2Question, 1500);
    }
}

function startScoutPhase3() { /* ... (Calls new createPlayerCard with hideDetails=false) ... */
     gameState.currentScoutPhase = 3; // Ensure phase is set
    gameState.userLineup = {};
    gameState.linesToQuiz = 3; // Learn all 3 lines

    setupLineupBuilderState();
    renderLineBuilderUI(); // Will use new card style
    timerContainer.style.display = 'none';
    submitLineupButton.style.display = 'block';
    submitLineupButton.textContent = 'SUBMIT LINEUP';
    submitLineupButton.onclick = handleSubmitLineup;
    setScreen('quiz'); // Reuse quiz screen
}

function handleSubmitLineup() { /* ... (no changes needed, uses updated saveProgress) ... */
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
     if (!allSlotsFilled) {
         alert("Please fill all line slots before submitting.");
         return;
     }

    const results = calculateScore();

    if (results.accuracy === 1) {
        gameState.masteredTeams.add(gameState.currentTeam);
        // Unlock next team
        const allTeams = gameState.lineStructures.map(t => t.team_abbr).sort();
        const currentIndex = allTeams.indexOf(gameState.currentTeam);
        // Find the next *unmastered* team
        let nextTeamFound = false;
        for(let i = currentIndex + 1; i < allTeams.length; i++) {
            if (!gameState.masteredTeams.has(allTeams[i])) {
                gameState.unlockedTeams.push(allTeams[i]);
                nextTeamFound = true;
                break;
            }
        }
         // If no next team found later, maybe loop back or add more complex logic
         // Ensure favorite team is always considered unlocked conceptually
         gameState.unlockedTeams = [...new Set([gameState.favoriteTeam, ...gameState.unlockedTeams])];


        saveProgress();
        showPhaseCompleteScreen(3, true);
    } else {
         alert(`Lineup incorrect (${results.correctSlots}/${results.totalSlots}). Review placements using the instant feedback and try again!`);
    }
}

function showPhaseCompleteScreen(phaseCompleted, passed) { /* ... (no changes needed) ... */
     teamMasteryBadge.style.display = 'none';

    if (passed) {
        phaseCompleteTitle.textContent = `PHASE ${phaseCompleted} COMPLETE!`;
        phaseCompleteTitle.style.color = '#39FF14';
        nextPhaseButton.style.display = 'block';

        if (phaseCompleted < 3) {
            phaseCompleteMessage.textContent = `Excellent work, scout. Prepare for Phase ${phaseCompleted + 1}.`;
            nextPhaseButton.textContent = 'CONTINUE TRAINING'; // Reset text
            nextPhaseButton.onclick = () => {
                if (phaseCompleted === 1) startScoutPhase2();
                if (phaseCompleted === 2) startScoutPhase3();
            };
        } else {
            phaseCompleteMessage.textContent = `You've mastered the ${gameState.currentTeam} roster!`;
            nextPhaseButton.textContent = 'RETURN TO MENU';
            nextPhaseButton.onclick = goToStartScreen;
            teamMasteryBadge.style.display = 'block';
            masteredTeamName.textContent = gameState.currentTeam;
        }
    } else {
        phaseCompleteTitle.textContent = `PHASE ${phaseCompleted} FAILED`;
        phaseCompleteTitle.style.color = 'var(--color-error-red)';
        phaseCompleteMessage.textContent = `Accuracy requirement not met. Drill needs repeating.`;
        nextPhaseButton.textContent = 'RETRY PHASE';
        nextPhaseButton.onclick = () => {
             gameState.scoutPhaseProgress = 0;
             gameState.scoutPhaseCorrect = 0;
             if (phaseCompleted === 1) startScoutPhase1();
             if (phaseCompleted === 2) startScoutPhase2();
              if (phaseCompleted === 3) startScoutPhase3(); // Retry Phase 3
        };
    }
    setScreen('phaseComplete');
}

// --- Shared Line Builder UI/Logic (Keep existing) ---
function setupLineupBuilderState() { /* ... (no changes needed) ... */
     const teamData = gameState.lineStructures.find(t => t.team_abbr === gameState.currentTeam);
    if (!teamData) return;

    gameState.correctLineup = {};
    // Use 3 lines for Scout Phase 3, otherwise use selected linesToQuiz
    const lines = (gameState.currentMode === 'scout' && gameState.currentScoutPhase === 3) ? 3 : gameState.linesToQuiz;

    for (let i = 1; i <= lines; i++) {
        const lineKey = `Line ${i}`;
        if (teamData.lines[lineKey]) {
            gameState.correctLineup[lineKey] = teamData.lines[lineKey];
            gameState.userLineup[lineKey] = Object.keys(teamData.lines[lineKey]).reduce((acc, slotKey) => {
                acc[slotKey] = null;
                return acc;
            }, {});
        }
    }
}
function renderLineBuilderUI() { /* ... (Calls new createPlayerCard, renders layout) ... */
     currentTeamDisplay.textContent = `Team: **${gameState.currentTeam}**`;

    // Render Line Slots
    lineSlotsContainer.innerHTML = '';
     // Determine number of lines based on mode/phase
     const linesToRender = (gameState.currentMode === 'scout' && gameState.currentScoutPhase === 3) ? 3 : gameState.linesToQuiz;

     // Ensure userLineup is initialized for the correct number of lines
     if (Object.keys(gameState.userLineup).length !== linesToRender) {
        setupLineupBuilderState(); // Re-initialize if mismatch
     }


     for (let i = 1; i <= linesToRender; i++) {
        const lineId = `Line ${i}`;
        if (!gameState.correctLineup[lineId]) continue; // Skip if line data doesn't exist

        const lineUnit = document.createElement('div');
        lineUnit.className = 'line-unit';
        lineUnit.innerHTML = `
            <h4>:: LINE ${i} ::</h4>
            <div class="line-slots" data-line-id="${lineId}">
                ${Object.keys(gameState.correctLineup[lineId]).map(slotId => `
                    <div class="line-slot" data-slot-id="${lineId}-${slotId}" data-position-type="${slotId.slice(0, 1).toUpperCase()}">
                        <div class="line-slot-label">${slotId}</div>
                        ${renderPlayerInSlot(gameState.userLineup[lineId]?.[slotId])}
                    </div>
                `).join('')}
            </div>
        `;
        lineSlotsContainer.appendChild(lineUnit);
    }


    // Render Player Pool (uses new createPlayerCard)
    playerPool.innerHTML = '';
     const allTeamPlayers = gameState.allPlayers.filter(p => p.team_abbr === gameState.currentTeam && ['C', 'L', 'R', 'D'].includes(p.position))
                                           .sort((a, b) => b.rating - a.rating);

    const playersNeededCount = linesToRender * 5;

    // Filter pool: include needed players not yet placed + extras
    const playersInSlots = new Set();
     Object.values(gameState.userLineup).forEach(line => {
         Object.values(line || {}).forEach(player => { // Add check for potentially undefined line
             if (player) playersInSlots.add(player.id);
         });
     });

    let poolCandidates = allTeamPlayers.slice(0, playersNeededCount + 5);

    // Ensure players for correct lines are available
    for (let i = 1; i <= linesToRender; i++) {
        const lineId = `Line ${i}`;
        if (gameState.correctLineup[lineId]) {
            Object.values(gameState.correctLineup[lineId]).forEach(correctPlayer => {
                if (correctPlayer && !poolCandidates.some(p => p.player_name === correctPlayer.name)) {
                    const fullPlayer = allTeamPlayers.find(p => p.player_name === correctPlayer.name);
                    if (fullPlayer) poolCandidates.push(fullPlayer);
                }
            });
        }
    }
    poolCandidates = poolCandidates.filter((player, index, self) => index === self.findIndex((p) => p.id === player.id));

    const finalPoolPlayers = poolCandidates.filter(p => !playersInSlots.has(p.id));

    finalPoolPlayers.forEach(player => {
        const card = createPlayerCard(player, false); // NAME VISIBLE in pool/Phase 3
        playerPool.appendChild(card);
    });
    poolCount.textContent = finalPoolPlayers.length;

    attachDragDropListeners();
}

function renderPlayerInSlot(player) { /* ... (no changes needed) ... */
     if (!player) return '';
     const card = createPlayerCard(player, false); // NAME VISIBLE in slots
     return card.outerHTML;
}

// --- Helper & Local Storage --- (Keep existing updatePhaseProgress, goToStartScreen)
function updatePhaseProgress(phase) { /* ... (no changes needed) ... */
      const progressElement = document.getElementById(`phase-${phase}-progress`);
     const totalQuestions = phase === 1 ? UI_CONSTANTS.PHASE_1_QUESTIONS : UI_CONSTANTS.PHASE_2_QUESTIONS;
     if (progressElement) {
         progressElement.textContent = `Progress: ${gameState.scoutPhaseProgress} / ${totalQuestions} | Correct: ${gameState.scoutPhaseCorrect}`;
     }
}
function goToStartScreen() { /* ... (no changes needed) ... */
      gameState.currentScoutPhase = 0;
     gameState.quizActive = false;
     updateStartScreenUI();
     setScreen('start');
}

// Update saveProgress to include favoriteTeam
function saveProgress() {
     try {
         const progress = {
             masteredTeams: Array.from(gameState.masteredTeams),
             unlockedTeams: Array.from(gameState.unlockedTeams),
             favoriteTeam: gameState.favoriteTeam // Save favorite team
         };
         localStorage.setItem('scoutSchoolProgress', JSON.stringify(progress));
     } catch (e) { console.warn("Could not save progress:", e); }
}

// Update loadProgress to include favoriteTeam and better unlock logic
function loadProgress() {
    try {
        const savedProgress = localStorage.getItem('scoutSchoolProgress');
        let initialFavorite = 'ANA'; // Default favorite if none saved
        let initialUnlocked = [initialFavorite]; // Start with default favorite unlocked

        if (savedProgress) {
            const progress = JSON.parse(savedProgress);
            gameState.masteredTeams = new Set(progress.masteredTeams || []);
            // Set favorite team from saved data or default
            gameState.favoriteTeam = progress.favoriteTeam || initialFavorite;
             // Unlocked teams = saved unlocks + favorite team
            gameState.unlockedTeams = [...new Set([gameState.favoriteTeam, ...(progress.unlockedTeams || [])])].sort();
        } else {
             // Initialize if no saved data
             gameState.masteredTeams = new Set();
             gameState.favoriteTeam = initialFavorite;
             gameState.unlockedTeams = [initialFavorite];
        }
    } catch (e) {
        console.warn("Could not load progress:", e);
        // Initialize defaults on error
        gameState.masteredTeams = new Set();
        gameState.favoriteTeam = 'ANA';
        gameState.unlockedTeams = ['ANA'];
    }
}


// --- Event Listeners & App Start ---
nextShiftButton.addEventListener('click', goToStartScreen); // Quiz debrief button

window.addEventListener('load', loadDataAndInitialize);