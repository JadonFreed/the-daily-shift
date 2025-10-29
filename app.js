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
    'ANA': { primary: '#F47A38', secondary: '#B9975B' }, 'ARI': { primary: '#8C2633', secondary: '#E2D6B5' },
    'BOS': { primary: '#FFB81C', secondary: '#000000' }, 'BUF': { primary: '#003087', secondary: '#FFB81C' },
    'CGY': { primary: '#C8102E', secondary: '#F1BE48' }, 'CAR': { primary: '#CC0000', secondary: '#000000' },
    'CHI': { primary: '#CF0A2C', secondary: '#000000' }, 'COL': { primary: '#6F263D', secondary: '#236192' },
    'CBJ': { primary: '#002654', secondary: '#CE1126' }, 'DAL': { primary: '#006847', secondary: '#8F8F8C' },
    'DET': { primary: '#CE1126', secondary: '#FFFFFF' }, 'EDM': { primary: '#041E42', secondary: '#FF4C00' },
    'FLA': { primary: '#C8102E', secondary: '#041E42' }, 'LAK': { primary: '#111111', secondary: '#A2AAAD' },
    'MIN': { primary: '#154734', secondary: '#A6192E' }, 'MTL': { primary: '#AF1E2D', secondary: '#192168' },
    'NSH': { primary: '#FFB81C', secondary: '#041E42' }, 'NJD': { primary: '#CE1126', secondary: '#000000' },
    'NYI': { primary: '#00539B', secondary: '#F47D30' }, 'NYR': { primary: '#0038A8', secondary: '#CE1126' },
    'OTT': { primary: '#C52032', secondary: '#000000' }, 'PHI': { primary: '#F74902', secondary: '#000000' },
    'PIT': { primary: '#FCB514', secondary: '#000000' }, 'SJS': { primary: '#006D75', secondary: '#000000' },
    'SEA': { primary: '#001F5B', secondary: '#99D9D9' }, 'STL': { primary: '#002F87', secondary: '#FCB514' },
    'TBL': { primary: '#002868', secondary: '#FFFFFF' }, 'TOR': { primary: '#00205B', secondary: '#FFFFFF' },
    'VAN': { primary: '#00205B', secondary: '#00843D' }, 'VGK': { primary: '#B4975A', secondary: '#333F42' },
    'WSH': { primary: '#C8102E', secondary: '#041E42' }, 'WPG': { primary: '#041E42', secondary: '#AC162C' },
    'DEFAULT': { primary: '#555555', secondary: '#BBBBBB' }
};
const darkTextTeams = ['DET', 'TBL', 'TOR']; // Teams needing dark text


// --- Global State Variables ---
let gameState = {
    allPlayers: [], lineStructures: [], currentTeam: null, linesToQuiz: 2,
    favoriteTeam: 'ANA', // Default favorite
    currentMode: 'quiz', quizActive: false, timer: null, timeRemaining: 0,
    userLineup: {}, mistakes: [],
    currentScoutPhase: 0, scoutPhaseProgress: 0, scoutPhaseCorrect: 0,
    scoutPhaseQuestionData: null, masteredTeams: new Set(), unlockedTeams: ['ANA'], // Start with default fav unlocked
};

// --- DOM Element Selection --- (Keep all from previous version)
const screens = {
    start: document.getElementById('start-screen'), quiz: document.getElementById('quiz-screen'),
    debrief: document.getElementById('debrief-screen'), scoutPhase1: document.getElementById('scout-phase-1-screen'),
    scoutPhase2: document.getElementById('scout-phase-2-screen'), phaseComplete: document.getElementById('phase-complete-screen'),
};
const modeRadios = document.querySelectorAll('input[name="game-mode"]');
const favoriteTeamSelect = document.getElementById('favorite-team-select');
const teamSelect = document.getElementById('team-select');
const lineOptionsButtons = document.querySelectorAll('.line-options .line-btn');
const linesToBuildSection = document.getElementById('lines-to-build-section');
const startButton = document.getElementById('start-shift-btn');
const scoutModeInfo = document.getElementById('scout-mode-info');
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
function setScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
         // Add/Remove body classes based on mode
        document.body.classList.toggle('learning-mode', gameState.currentMode === 'scout');
        screens.quiz?.classList.toggle('learning-mode', gameState.currentMode === 'scout'); // Check if exists
        screens.debrief?.classList.toggle('learning-mode', gameState.currentMode === 'scout');
    } else {
        console.error("Screen not found:", screenName);
    }
}
function shuffleArray(array) { /* ... (no changes) ... */
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// --- Initialization ---
async function loadDataAndInitialize() {
    try {
        // Fetch data
        const [playersResponse, linesResponse] = await Promise.all([
            fetch('nhl_players.json'),
            fetch('team_line_structures.json')
        ]);
        if (!playersResponse.ok) throw new Error('Failed to load nhl_players.json');
        if (!linesResponse.ok) throw new Error('Failed to load team_line_structures.json');
        gameState.allPlayers = await playersResponse.json();
        gameState.lineStructures = await linesResponse.json();

        loadProgress(); // Load favorite, mastered, unlocked
        initializeStartScreen(); // Setup UI based on loaded progress
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
            updateStartScreenUI();
        });
    });

    // Populate Favorite Team Dropdown
    const allTeamsSorted = gameState.lineStructures.map(t => t.team_abbr).sort();
    favoriteTeamSelect.innerHTML = ''; // Clear first
    allTeamsSorted.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        favoriteTeamSelect.appendChild(option);
    });
    // Set favorite dropdown value AFTER populating
    favoriteTeamSelect.value = gameState.favoriteTeam;
    favoriteTeamSelect.addEventListener('change', (e) => {
        gameState.favoriteTeam = e.target.value;
        // Ensure favorite team is considered "unlocked"
        if (!gameState.unlockedTeams.includes(gameState.favoriteTeam)) {
            gameState.unlockedTeams.push(gameState.favoriteTeam);
            gameState.unlockedTeams.sort(); // Keep it sorted
        }
        saveProgress();
        updateStartScreenUI(); // Update target list and default
    });

    // Target Team Select (populated by updateStartScreenUI)
    teamSelect.addEventListener('change', (e) => gameState.currentTeam = e.target.value);

    // Line Options (for Quiz Mode)
    lineOptionsButtons.forEach(btn => { /* ... (no changes) ... */
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
        // Ensure favorite is always in the list, then add others unlocked, then sort
        teamsToShow = [...new Set([gameState.favoriteTeam, ...gameState.unlockedTeams])].sort();
    } else {
        teamsToShow = gameState.lineStructures.map(t => t.team_abbr).sort();
    }

    const currentTargetValue = teamSelect.value; // Store current selection if possible
    teamSelect.innerHTML = '';
    teamsToShow.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team + (gameState.masteredTeams.has(team) ? ' ✅' : '');
        teamSelect.appendChild(option);
    });

    // Set default target team
    let defaultTarget;
    if (isScoutMode) {
        // Default to favorite team if it's in the list, otherwise first unlocked
        defaultTarget = teamsToShow.includes(gameState.favoriteTeam) ? gameState.favoriteTeam : teamsToShow[0];
    } else {
        // Default to favorite if available, else first team, or keep selection if valid
        defaultTarget = teamsToShow.includes(currentTargetValue) ? currentTargetValue : (teamsToShow.includes(gameState.favoriteTeam) ? gameState.favoriteTeam : teamsToShow[0]);
    }
    teamSelect.value = defaultTarget || teamsToShow[0]; // Set dropdown value
    gameState.currentTeam = teamSelect.value; // Sync state
}


// --- Game Start ---
function startGame() {
    gameState.currentTeam = teamSelect.value; // Get selected target team
    if (!gameState.currentTeam) return alert("Please select a target team.");

    if (gameState.currentMode === 'quiz') {
        startQuizMode();
    } else {
        startScoutSchool();
    }
}

// --- Player Card Creation (Jersey Style) ---
function createPlayerCard(player, hideNameForGuessing = false) {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.setAttribute('draggable', !hideNameForGuessing); // Not draggable in Phase 1 display
    card.dataset.playerId = player.id;
    card.dataset.position = player.position;

    const colors = teamColors[player.team_abbr] || teamColors['DEFAULT'];
    card.style.setProperty('--team-color-primary', colors.primary);
    card.style.setProperty('--team-color-secondary', colors.secondary);

    // Set dark text class if needed
    if (darkTextTeams.includes(player.team_abbr)) {
        card.classList.add('dark-text');
    }

    const jerseyNumber = player.jersey_number || 'XX';
    const playerName = player.player_name || 'Unknown';

    // Content: Jersey Number and Name (only hide name in phase 1)
    card.innerHTML = `
        <div class="card-jersey-number">${jerseyNumber}</div>
        <div class="card-player-name">${playerName}</div>
    `;

    // CSS handles hiding name in Phase 1 via `.phase-card-display .card-player-name { display: none; }`

    // Add listeners only if it's not the static Phase 1 display card
    if (!hideNameForGuessing) {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('click', handleCardClick);
    } else {
        card.style.cursor = 'default'; // Indicate non-interactive
    }

    return card;
}


// --- QUIZ MODE --- (Keep startQuizMode, startTimer, updateTimerDisplay, checkQuizCompletion, endQuiz, calculateScore, renderDebrief as is, they adapt based on gameState.currentMode)
function startQuizMode() { /* ... (no changes needed) ... */
    gameState.quizActive = true;
    gameState.timeRemaining = UI_CONSTANTS.TIMER_SECONDS;
    gameState.userLineup = {};
    gameState.mistakes = [];

    setupLineupBuilderState();
    renderLineBuilderUI();
    timerContainer.style.display = 'block';
    submitLineupButton.style.display = 'none';
    startTimer();
    setScreen('quiz');
}
function startTimer() { /* ... (no changes needed) ... */
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
            endQuiz(true);
        }
    }, 1000);
}
function updateTimerDisplay() { /* ... (no changes needed) ... */
     const timeRatio = Math.max(0, gameState.timeRemaining / UI_CONSTANTS.TIMER_SECONDS);
    timerBar.style.width = `${timeRatio * 100}%`;
    timerText.textContent = `${gameState.timeRemaining}:00`;
    timerBar.style.backgroundColor = gameState.timeRemaining <= 10 ? 'var(--color-error-red)' : 'var(--color-accent-cyan)';
    timerBar.style.boxShadow = `0 0 10px ${gameState.timeRemaining <= 10 ? 'var(--color-error-red)' : 'var(--color-accent-cyan)'}`;
}
function checkQuizCompletion() { /* ... (no changes needed) ... */
    if (gameState.currentMode !== 'scout') {
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
            endQuiz(false);
        }
    }
}
function endQuiz(timeUp) { /* ... (no changes needed) ... */
     gameState.quizActive = false;
    clearInterval(gameState.timer);
    const results = calculateScore();
    renderDebrief(results, timeUp);
    setScreen('debrief');
}
function calculateScore() { /* ... (no changes needed - handles learning mode score) ... */
    let correctSlots = 0;
    let totalSlots = 0;
    const currentMistakes = []; // Use local var for calculation

    for (const lineId in gameState.correctLineup) {
        for (const slotKey in gameState.correctLineup[lineId]) {
            totalSlots++;
            const correctPlayer = gameState.correctLineup[lineId][slotKey];
            const userPlayer = gameState.userLineup[lineId]?.[slotKey]; // Safe access

            if (userPlayer && correctPlayer && userPlayer.player_name === correctPlayer.name) {
                correctSlots++;
            } else if (gameState.currentMode === 'quiz') { // Only log mistakes for quiz debrief
                 currentMistakes.push({ lineId, slotKey, user: userPlayer, correct: correctPlayer });
            }
        }
    }

    if (gameState.currentMode === 'quiz') {
         gameState.mistakes = currentMistakes; // Update global mistakes only for quiz mode
    }

    const accuracy = totalSlots > 0 ? (correctSlots / totalSlots) : 0;
    const speedBonus = gameState.timeRemaining > 0 ? (gameState.timeRemaining / UI_CONSTANTS.SCORE_MULTIPLIER_TIME_FACTOR) : 0;
    const baseScore = totalSlots * UI_CONSTANTS.POINTS_PER_CORRECT_SLOT * accuracy;
    const finalScore = gameState.currentMode === 'scout' ? Math.round(baseScore) : Math.round(baseScore * (1 + speedBonus));

    return { correctSlots, totalSlots, accuracy, finalScore, speedBonus };
}
function renderDebrief(results, timeUp) { /* ... (no changes needed - handles learning mode display) ... */
    document.getElementById('debrief-title').textContent = timeUp ? "DEBRIEF: TIME OVERRUN" : "DEBRIEF: LINEUP VERIFIED";
    const accuracyPct = (results.accuracy * 100).toFixed(0);

    timeBonusDisplay.style.display = gameState.currentMode === 'scout' ? 'none' : 'block';
    debriefTimeBonus.textContent = `${results.speedBonus.toFixed(2)}x`;
    debriefAccuracy.textContent = `${accuracyPct}% (${results.correctSlots}/${results.totalSlots})`;
    debriefPoints.textContent = results.finalScore;

    mistakeList.innerHTML = '';
    if (gameState.mistakes.length === 0) {
        mistakeList.innerHTML = '<p class="review-placeholder">No errors detected.</p>';
    } else {
        gameState.mistakes.forEach(m => {
            const userPlayerName = m.user ? m.user.player_name : "EMPTY";
            const correctPlayer = m.correct;
            const correctPlayerObj = gameState.allPlayers.find(p => p.player_name === correctPlayer.name);
            const correctPlayerTrait = correctPlayerObj?.unique_trait || "Data pending.";
            const item = document.createElement('div');
            item.className = 'mistake-item';
            item.innerHTML = `<p><strong>ERROR ${m.lineId}-${m.slotKey}:</strong> Placed <span class="accent-text">${userPlayerName}</span>.</p>
                              <p class="correct-answer">**CORRECT:** ${correctPlayer.name} (Rtg: ${correctPlayer.rating})</p>
                              <p class="correct-answer">**WHY?** *${correctPlayerTrait}*</p>`;
            mistakeList.appendChild(item);
        });
    }
}


// --- SCOUT SCHOOL MODE --- (Keep structure, uses new createPlayerCard)
function startScoutSchool() { /* ... (no changes needed) ... */
    gameState.currentScoutPhase = 1;
    gameState.scoutPhaseProgress = 0;
    gameState.scoutPhaseCorrect = 0;
    startScoutPhase1();
}

// --- Phase 1 ---
function startScoutPhase1() { /* ... (no changes needed) ... */
    phase1Team.textContent = `Team: ${gameState.currentTeam}`;
    generatePhase1Question();
    setScreen('scoutPhase1');
}
function generatePhase1Question() { /* ... (Calls createPlayerCard(targetPlayer, true)) ... */
    phase1Feedback.textContent = '';
    phase1Feedback.className = 'phase-feedback';

    const teamPlayers = gameState.allPlayers.filter(p => p.team_abbr === gameState.currentTeam && ['C', 'L', 'R', 'D'].includes(p.position))
                                       .sort((a, b) => b.rating - a.rating)
                                       .slice(0, 15);
     if (teamPlayers.length < 4) { alert("Not enough players."); goToStartScreen(); return; }

    const targetPlayerIndex = gameState.scoutPhaseProgress % Math.min(UI_CONSTANTS.PHASE_1_QUESTIONS, teamPlayers.length);
    const targetPlayer = teamPlayers[targetPlayerIndex];

    // Create card HIDDEN NAME
    const card = createPlayerCard(targetPlayer, true); // hideNameForGuessing = true
    phase1CardDisplay.innerHTML = '';
    phase1CardDisplay.appendChild(card);

    // Get distractors and render choices
    const distractors = shuffleArray(teamPlayers.filter(p => p.id !== targetPlayer.id)).slice(0, 3);
    const choices = shuffleArray([targetPlayer, ...distractors]);
    phase1Choices.innerHTML = '';
    choices.forEach(player => {
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
     const targetName = gameState.allPlayers.find(p=>p.id === targetPlayerId)?.player_name || '??';

    if (isCorrect) {
        gameState.scoutPhaseCorrect++;
        phase1Feedback.textContent = 'CORRECT!';
        phase1Feedback.className = 'phase-feedback correct';
        button.classList.add('correct');
    } else {
        phase1Feedback.textContent = `INCORRECT! Correct was ${targetName}`;
        phase1Feedback.className = 'phase-feedback incorrect';
        button.classList.add('incorrect');
        phase1Choices.querySelectorAll('button').forEach(btn => {
             if (btn.textContent === targetName) { btn.classList.add('correct'); }
         });
    }
    gameState.scoutPhaseProgress++;

    if (gameState.scoutPhaseProgress >= UI_CONSTANTS.PHASE_1_QUESTIONS) {
        const accuracy = gameState.scoutPhaseCorrect / UI_CONSTANTS.PHASE_1_QUESTIONS;
        setTimeout(() => showPhaseCompleteScreen(1, accuracy >= UI_CONSTANTS.PHASE_1_MASTERY_ACCURACY), 1500);
    } else {
        setTimeout(generatePhase1Question, 1500);
    }
}

// --- Phase 2 ---
function startScoutPhase2() { /* ... (no changes needed) ... */
    gameState.scoutPhaseProgress = 0;
    gameState.scoutPhaseCorrect = 0;
    phase2Team.textContent = `Team: ${gameState.currentTeam}`;
    generatePhase2Question();
    setScreen('scoutPhase2');
}
function generatePhase2Question() { /* ... (Calls createPlayerCard(player, false)) ... */
     phase2Feedback.textContent = ''; phase2Feedback.className = 'phase-feedback';
     phase2PlayerA.innerHTML = ''; phase2PlayerB.innerHTML = '';
     phase2PlayerA.onclick = null; phase2PlayerB.onclick = null;
     phase2PlayerA.style.borderColor = 'transparent'; phase2PlayerB.style.borderColor = 'transparent';


    const teamPlayers = gameState.allPlayers.filter(p => p.team_abbr === gameState.currentTeam && ['C', 'L', 'R', 'D'].includes(p.position))
                                       .sort((a, b) => b.rating - a.rating)
                                       .slice(0, 15);
     if (teamPlayers.length < 2) { alert("Not enough players."); goToStartScreen(); return; }

    let playerA, playerB, attempts = 0;
     do { /* ... (select two different players) ... */
         const shuffledPlayers = shuffleArray([...teamPlayers]);
         playerA = shuffledPlayers[0];
         playerB = shuffledPlayers[1];
         attempts++;
     } while (playerA.rating === playerB.rating && attempts < 10 && teamPlayers.length > 2);

    // Create cards NAME VISIBLE
    phase2PlayerA.appendChild(createPlayerCard(playerA, false));
    phase2PlayerB.appendChild(createPlayerCard(playerB, false));

    const higherRatedPlayerId = playerA.rating >= playerB.rating ? playerA.id : playerB.id;
    gameState.scoutPhaseQuestionData = { higherRatedPlayerId };

    phase2PlayerA.onclick = () => handlePhase2Answer(playerA.id === higherRatedPlayerId, phase2PlayerA);
    phase2PlayerB.onclick = () => handlePhase2Answer(playerB.id === higherRatedPlayerId, phase2PlayerB);

    updatePhaseProgress(2);
}
function handlePhase2Answer(isCorrect, selectedCardElement) { /* ... (no changes needed) ... */
    phase2PlayerA.onclick = null; phase2PlayerB.onclick = null;

    if (isCorrect) {
        gameState.scoutPhaseCorrect++;
        phase2Feedback.textContent = 'CORRECT!';
        phase2Feedback.className = 'phase-feedback correct';
        selectedCardElement.style.borderColor = 'var(--color-feedback-green)';
    } else {
        phase2Feedback.textContent = 'INCORRECT!';
        phase2Feedback.className = 'phase-feedback incorrect';
        selectedCardElement.style.borderColor = 'var(--color-error-red)';
        const correctCard = (phase2PlayerA.querySelector(`[data-player-id="${gameState.scoutPhaseQuestionData.higherRatedPlayerId}"]`)) ? phase2PlayerA : phase2PlayerB;
        if (correctCard !== selectedCardElement) { correctCard.style.borderColor = 'var(--color-feedback-green)'; }
    }

    gameState.scoutPhaseProgress++;

    if (gameState.scoutPhaseProgress >= UI_CONSTANTS.PHASE_2_QUESTIONS) {
        const accuracy = gameState.scoutPhaseCorrect / UI_CONSTANTS.PHASE_2_QUESTIONS;
        setTimeout(() => showPhaseCompleteScreen(2, accuracy >= UI_CONSTANTS.PHASE_2_MASTERY_ACCURACY), 1500);
    } else {
        setTimeout(generatePhase2Question, 1500);
    }
}


// --- Phase 3 ---
function startScoutPhase3() { /* ... (Calls renderLineBuilderUI which uses new card style) ... */
     gameState.currentScoutPhase = 3;
    gameState.userLineup = {};
    gameState.linesToQuiz = 3; // Always 3 lines for mastery

    setupLineupBuilderState();
    renderLineBuilderUI(); // Renders board with new card style
    timerContainer.style.display = 'none';
    submitLineupButton.style.display = 'block';
    submitLineupButton.textContent = 'SUBMIT LINEUP';
    submitLineupButton.onclick = handleSubmitLineup;
    setScreen('quiz');
}
function handleSubmitLineup() { /* ... (no changes needed) ... */
     let allSlotsFilled = true; /* ... (check if filled) ... */
     for (const lineId in gameState.userLineup) {
        for (const slotKey in gameState.userLineup[lineId]) {
            if (gameState.userLineup[lineId][slotKey] === null) {
                allSlotsFilled = false; break;
            }
        }
        if (!allSlotsFilled) break;
    }
     if (!allSlotsFilled) { alert("Please fill all line slots."); return; }

    const results = calculateScore();

    if (results.accuracy === 1) { // 100% needed for mastery
        gameState.masteredTeams.add(gameState.currentTeam);
        // Unlock next *unmastered* team
        const allTeams = gameState.lineStructures.map(t => t.team_abbr).sort();
        const currentIndex = allTeams.indexOf(gameState.currentTeam);
        let nextTeamAdded = false;
        for (let i = 0; i < allTeams.length; i++) { // Loop through all teams
            const team = allTeams[(currentIndex + 1 + i) % allTeams.length]; // Start check from next team, wrap around
             if (!gameState.masteredTeams.has(team) && !gameState.unlockedTeams.includes(team)) {
                 gameState.unlockedTeams.push(team);
                 gameState.unlockedTeams.sort();
                 nextTeamAdded = true;
                 break;
            }
        }
        saveProgress();
        showPhaseCompleteScreen(3, true);
    } else {
         alert(`Lineup incorrect (${results.correctSlots}/${results.totalSlots}). Review placements using the instant feedback and try again!`);
    }
}


// --- Phase Completion Screen ---
function showPhaseCompleteScreen(phaseCompleted, passed) { /* ... (Added failed class for title) ... */
    teamMasteryBadge.style.display = 'none';
    phaseCompleteTitle.classList.toggle('failed', !passed); // Add/remove 'failed' class

    if (passed) {
        phaseCompleteTitle.textContent = `PHASE ${phaseCompleted} COMPLETE!`;
        nextPhaseButton.style.display = 'block';

        if (phaseCompleted < 3) {
            phaseCompleteMessage.textContent = `Excellent work, scout. Prepare for Phase ${phaseCompleted + 1}.`;
            nextPhaseButton.textContent = 'CONTINUE TRAINING';
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
        phaseCompleteMessage.textContent = `Accuracy requirement not met. Drill needs repeating.`;
        nextPhaseButton.textContent = 'RETRY PHASE';
        nextPhaseButton.onclick = () => {
             gameState.scoutPhaseProgress = 0;
             gameState.scoutPhaseCorrect = 0;
             if (phaseCompleted === 1) startScoutPhase1();
             if (phaseCompleted === 2) startScoutPhase2();
             if (phaseCompleted === 3) startScoutPhase3();
        };
    }
    setScreen('phaseComplete');
}

// --- Shared Line Builder UI/Logic --- (Keep setupLineupBuilderState, renderLineBuilderUI, renderPlayerInSlot - uses new card style)
function setupLineupBuilderState() { /* ... (no changes needed) ... */
    const teamData = gameState.lineStructures.find(t => t.team_abbr === gameState.currentTeam);
    if (!teamData) return;
    gameState.correctLineup = {};
    const lines = (gameState.currentMode === 'scout' && gameState.currentScoutPhase === 3) ? 3 : gameState.linesToQuiz;
    for (let i = 1; i <= lines; i++) {
        const lineKey = `Line ${i}`;
        if (teamData.lines[lineKey]) {
            gameState.correctLineup[lineKey] = teamData.lines[lineKey];
            gameState.userLineup[lineKey] = Object.keys(teamData.lines[lineKey]).reduce((acc, slotKey) => { acc[slotKey] = null; return acc; }, {});
        }
    }
}
function renderLineBuilderUI() { /* ... (no changes needed - logic handles new card) ... */
    currentTeamDisplay.textContent = `Team: **${gameState.currentTeam}**`;
    lineSlotsContainer.innerHTML = '';
    const linesToRender = (gameState.currentMode === 'scout' && gameState.currentScoutPhase === 3) ? 3 : gameState.linesToQuiz;

    if (Object.keys(gameState.userLineup).length !== linesToRender || !gameState.userLineup[`Line ${linesToRender}`]) {
        setupLineupBuilderState();
    }

    for (let i = 1; i <= linesToRender; i++) {
        const lineId = `Line ${i}`;
        if (!gameState.correctLineup[lineId]) continue;
        const lineUnit = document.createElement('div');
        lineUnit.className = 'line-unit';
        lineUnit.innerHTML = `<h4>:: LINE ${i} ::</h4>
                              <div class="line-slots" data-line-id="${lineId}">
                                  ${Object.keys(gameState.correctLineup[lineId]).map(slotId => `
                                      <div class="line-slot" data-slot-id="${lineId}-${slotId}" data-position-type="${slotId.slice(0, 1).toUpperCase()}">
                                          <div class="line-slot-label">${slotId}</div>
                                          ${renderPlayerInSlot(gameState.userLineup[lineId]?.[slotId])}
                                      </div>`).join('')}
                              </div>`;
        lineSlotsContainer.appendChild(lineUnit);
    }

    playerPool.innerHTML = '';
    const allTeamPlayers = gameState.allPlayers.filter(p => p.team_abbr === gameState.currentTeam && ['C', 'L', 'R', 'D'].includes(p.position))
                                          .sort((a, b) => b.rating - a.rating);
    const playersNeededCount = linesToRender * 5;
    const playersInSlots = new Set();
    Object.values(gameState.userLineup).forEach(line => { Object.values(line || {}).forEach(player => { if (player) playersInSlots.add(player.id); }); });

    let poolCandidates = allTeamPlayers.slice(0, playersNeededCount + 7); // Add a few more extras

    // Ensure needed players are available
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
    poolCandidates = poolCandidates.filter((p, i, self) => i === self.findIndex(pl => pl.id === p.id)); // Unique

    const finalPoolPlayers = poolCandidates.filter(p => !playersInSlots.has(p.id));
    finalPoolPlayers.forEach(player => { playerPool.appendChild(createPlayerCard(player, false)); }); // Name Visible
    poolCount.textContent = finalPoolPlayers.length;

    attachDragDropListeners();
}
function renderPlayerInSlot(player) { /* ... (no changes needed) ... */
     if (!player) return '';
     const card = createPlayerCard(player, false); // Name Visible
     return card.outerHTML;
}

// --- Helpers & Local Storage --- (Keep updatePhaseProgress, goToStartScreen, saveProgress, loadProgress - logic is updated)
function updatePhaseProgress(phase) { /* ... (no changes needed) ... */
     const progressElement = document.getElementById(`phase-${phase}-progress`);
     const totalQuestions = phase === 1 ? UI_CONSTANTS.PHASE_1_QUESTIONS : UI_CONSTANTS.PHASE_2_QUESTIONS;
     if (progressElement) { progressElement.textContent = `Progress: ${gameState.scoutPhaseProgress} / ${totalQuestions} | Correct: ${gameState.scoutPhaseCorrect}`; }
}
function goToStartScreen() { /* ... (no changes needed) ... */
     gameState.currentScoutPhase = 0; gameState.quizActive = false;
     updateStartScreenUI(); setScreen('start');
}
function saveProgress() { /* ... (no changes needed - already saves favoriteTeam) ... */
     try {
         const progress = {
             masteredTeams: Array.from(gameState.masteredTeams),
             unlockedTeams: Array.from(gameState.unlockedTeams),
             favoriteTeam: gameState.favoriteTeam
         };
         localStorage.setItem('scoutSchoolProgress', JSON.stringify(progress));
     } catch (e) { console.warn("Could not save progress:", e); }
}
function loadProgress() { /* ... (no changes needed - already loads favoriteTeam and sets unlocks) ... */
    try {
        const savedProgress = localStorage.getItem('scoutSchoolProgress');
        let initialFavorite = 'ANA'; // Fallback favorite
        let initialUnlocked = [initialFavorite];

        if (savedProgress) {
            const progress = JSON.parse(savedProgress);
            gameState.masteredTeams = new Set(progress.masteredTeams || []);
            gameState.favoriteTeam = progress.favoriteTeam || initialFavorite;
            // Ensure unlocked includes favorite, then add saved, then make unique & sort
            gameState.unlockedTeams = [...new Set([gameState.favoriteTeam, ...(progress.unlockedTeams || [])])].sort();
        } else {
             gameState.masteredTeams = new Set();
             gameState.favoriteTeam = initialFavorite;
             gameState.unlockedTeams = [initialFavorite];
             // Save initial state if nothing was loaded
             saveProgress();
        }
    } catch (e) {
        console.warn("Could not load progress:", e);
        gameState.masteredTeams = new Set();
        gameState.favoriteTeam = 'ANA';
        gameState.unlockedTeams = ['ANA'];
    }
}

// --- Event Listeners & App Start ---
nextShiftButton.addEventListener('click', goToStartScreen);
window.addEventListener('load', loadDataAndInitialize);