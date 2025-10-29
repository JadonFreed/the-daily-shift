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
const teamColors = { /* ... (Keep the full teamColors object from the previous version) ... */
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
const darkTextTeams = ['DET', 'TBL', 'TOR'];

// --- Global State Variables ---
let gameState = {
    // Data
    allPlayers: [], // Skaters from nhl_players.json
    allGoalies: [], // Goalies from all_goalies_ratings_final.csv + lookup info
    lineStructures: [],
    // Settings & Mode
    currentTeam: null, linesToQuiz: 2, favoriteTeam: 'ANA', currentMode: 'quiz',
    // Quiz State
    quizActive: false, timer: null, timeRemaining: 0, userLineup: {}, mistakes: [],
    // Scout School State
    currentScoutPhase: 0, // Now includes 4
    scoutPhaseProgress: 0, scoutPhaseCorrect: 0, scoutPhaseQuestionData: null,
    masteredTeams: new Set(), unlockedTeams: ['ANA'],
    correctGoalieRoles: { Starter: null, Backup: null }, // Store correct goalie IDs for Phase 4
    userGoalieRoles: { Starter: null, Backup: null }, // Store user placed goalie objects for Phase 4
};

// --- DOM Element Selection --- (Add Phase 4 elements)
const screens = { /* ... (keep existing screen selections, add phase 4) ... */
    start: document.getElementById('start-screen'), quiz: document.getElementById('quiz-screen'),
    debrief: document.getElementById('debrief-screen'), scoutPhase1: document.getElementById('scout-phase-1-screen'),
    scoutPhase2: document.getElementById('scout-phase-2-screen'),
    scoutPhase4: document.getElementById('scout-phase-4-screen'), // NEW
    phaseComplete: document.getElementById('phase-complete-screen'),
};
// (Keep other existing DOM selections...)
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
// Phase 4 Elements
const phase4Team = document.getElementById('scout-phase-4-team');
const goalieSlotStarter = document.getElementById('goalie-slot-starter');
const goalieSlotBackup = document.getElementById('goalie-slot-backup');
const goaliePool = document.getElementById('goalie-pool');
const phase4Feedback = document.getElementById('phase-4-feedback');
// Phase Complete Elements
const phaseCompleteTitle = document.getElementById('phase-complete-title');
const phaseCompleteMessage = document.getElementById('phase-complete-message');
const nextPhaseButton = document.getElementById('next-phase-btn');
const teamMasteryBadge = document.getElementById('team-mastery-badge');
const masteredTeamName = document.getElementById('mastered-team-name');
// Debrief Elements
const timeBonusDisplay = document.getElementById('time-bonus-display');
const debriefTimeBonus = document.getElementById('debrief-time-bonus');
const debriefAccuracy = document.getElementById('debrief-accuracy');
const debriefPoints = document.getElementById('debrief-points');
const mistakeList = document.getElementById('mistake-review-list');
const nextShiftButton = document.getElementById('next-shift-btn');

// --- Utility Functions --- (Keep setScreen, shuffleArray)
function setScreen(screenName) { /* ... no changes ... */
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
        document.body.classList.toggle('learning-mode', gameState.currentMode === 'scout');
        screens.quiz?.classList.toggle('learning-mode', gameState.currentMode === 'scout');
        screens.debrief?.classList.toggle('learning-mode', gameState.currentMode === 'scout');
    } else { console.error("Screen not found:", screenName); }
}
function shuffleArray(array) { /* ... no changes ... */
    for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[array[i], array[j]] = [array[j], array[i]]; } return array;
}


// --- Initialization --- (Update to load goalies)
async function loadDataAndInitialize() {
    try {
        // Fetch all data concurrently
        const [playersResponse, linesResponse, goaliesResponse, lookupResponse] = await Promise.all([
            fetch('nhl_players.json'), // Skaters already enriched
            fetch('team_line_structures.json'),
            fetch('all_goalies_ratings_final.csv'), // Goalie ratings CSV
            fetch('allPlayersLookup.csv') // Player lookup CSV
        ]);

        // Process Skaters and Lines
        if (!playersResponse.ok) throw new Error('Failed to load nhl_players.json');
        if (!linesResponse.ok) throw new Error('Failed to load team_line_structures.json');
        gameState.allPlayers = await playersResponse.json();
        gameState.lineStructures = await linesResponse.json();

        // Process Goalies
        if (!goaliesResponse.ok) throw new Error('Failed to load all_goalies_ratings_final.csv');
        if (!lookupResponse.ok) throw new Error('Failed to load allPlayersLookup.csv');

        // Need to parse CSVs (simple parser, assumes comma delimiter and header)
        const goaliesCSVText = await goaliesResponse.text();
        const lookupCSVText = await lookupResponse.text();

        // Basic CSV Parsing (replace with a library like PapaParse for robustness if needed)
        const parseCSV = (text) => {
            const lines = text.trim().split('\n');
            const header = lines[0].split(',').map(h => h.trim());
            return lines.slice(1).map(line => {
                const values = line.split(',');
                const obj = {};
                header.forEach((key, index) => {
                    // Basic handling for quoted strings if needed, otherwise simple assignment
                    let value = values[index]?.trim();
                    if (value?.startsWith('"') && value?.endsWith('"')) {
                        value = value.slice(1, -1);
                    }
                    obj[key] = value;
                });
                return obj;
            });
        };

        const goalieRatingsData = parseCSV(goaliesCSVText);
        const lookupData = parseCSV(lookupCSVText);

        // Create enriched goalie data
        gameState.allGoalies = goalieRatingsData.map(goalie => {
            const lookupInfo = lookupData.find(p => p.playerId === goalie.playerId);
            const birthDate = lookupInfo?.birthDate ? new Date(lookupInfo.birthDate) : null;
            const age = birthDate && !isNaN(birthDate)
                      ? Math.floor((new Date() - birthDate) / (1000 * 60 * 60 * 24 * 365.25))
                      : '?';

            return {
                id: goalie.playerId, // Use 'id' for consistency
                player_name: goalie.name || 'Unknown Goalie',
                team_abbr: goalie.team,
                position: 'G', // Explicitly set position
                rating: parseFloat(goalie.GSAx_Per60_Stabilized) || 0, // Use GSAx as rating
                jersey_number: lookupInfo?.primaryNumber || 'XX',
                age: age,
                height: lookupInfo?.height || '?',
                // Add any other goalie-specific fields if needed
            };
        });

        // Ensure allPlayers only contains skaters (filter out G position if present from json)
        gameState.allPlayers = gameState.allPlayers.filter(p => p.position !== 'G');


        loadProgress(); // Load favorite, mastered, unlocked
        initializeStartScreen(); // Setup UI based on loaded progress
        setScreen('start');
    } catch (error) {
        console.error("Data loading error:", error);
        alert("Error loading or processing game data. Check console.");
    }
}
// (initializeStartScreen, updateStartScreenUI remain the same as previous version)
function initializeStartScreen() { /* ... no changes ... */
    modeRadios.forEach(radio => { radio.addEventListener('change', (e) => { gameState.currentMode = e.target.value; updateStartScreenUI(); }); });
    const allTeamsSorted = gameState.lineStructures.map(t => t.team_abbr).sort();
    favoriteTeamSelect.innerHTML = '';
    allTeamsSorted.forEach(team => { const option = document.createElement('option'); option.value = team; option.textContent = team; favoriteTeamSelect.appendChild(option); });
    favoriteTeamSelect.value = gameState.favoriteTeam;
    favoriteTeamSelect.addEventListener('change', (e) => { gameState.favoriteTeam = e.target.value; if (!gameState.unlockedTeams.includes(gameState.favoriteTeam)) { gameState.unlockedTeams.push(gameState.favoriteTeam); gameState.unlockedTeams.sort(); } saveProgress(); updateStartScreenUI(); });
    teamSelect.addEventListener('change', (e) => gameState.currentTeam = e.target.value);
    lineOptionsButtons.forEach(btn => { btn.addEventListener('click', (e) => { lineOptionsButtons.forEach(b => b.classList.remove('active')); e.target.classList.add('active'); gameState.linesToQuiz = parseInt(e.target.dataset.lines); }); });
    startButton.addEventListener('click', startGame);
    updateStartScreenUI();
}
function updateStartScreenUI() { /* ... no changes ... */
    const isScoutMode = gameState.currentMode === 'scout';
    linesToBuildSection.style.display = isScoutMode ? 'none' : 'block';
    scoutModeInfo.style.display = isScoutMode ? 'block' : 'none';
    let teamsToShow;
    if (isScoutMode) { teamsToShow = [...new Set([gameState.favoriteTeam, ...gameState.unlockedTeams])].sort(); }
    else { teamsToShow = gameState.lineStructures.map(t => t.team_abbr).sort(); }
    const currentTargetValue = teamSelect.value;
    teamSelect.innerHTML = '';
    teamsToShow.forEach(team => { const option = document.createElement('option'); option.value = team; option.textContent = team + (gameState.masteredTeams.has(team) ? ' ✅' : ''); teamSelect.appendChild(option); });
    let defaultTarget;
    if (isScoutMode) { defaultTarget = teamsToShow.includes(gameState.favoriteTeam) ? gameState.favoriteTeam : teamsToShow[0]; }
    else { defaultTarget = teamsToShow.includes(currentTargetValue) ? currentTargetValue : (teamsToShow.includes(gameState.favoriteTeam) ? gameState.favoriteTeam : teamsToShow[0]); }
    teamSelect.value = defaultTarget || teamsToShow[0];
    gameState.currentTeam = teamSelect.value;
}

// --- Game Start ---
function startGame() { /* ... (no changes) ... */
    gameState.currentTeam = teamSelect.value;
    if (!gameState.currentTeam) return alert("Please select a target team.");
    if (gameState.currentMode === 'quiz') { startQuizMode(); }
    else { startScoutSchool(); }
}

// --- Player Card Creation (Handles Goalies implicitly) ---
function createPlayerCard(player, hideNameForGuessing = false) { // No specific goalie changes needed here
    const card = document.createElement('div');
    card.className = 'player-card';
    card.setAttribute('draggable', !hideNameForGuessing);
    card.dataset.playerId = player.id; // Use consistent 'id'
    card.dataset.position = player.position;

    const colors = teamColors[player.team_abbr] || teamColors['DEFAULT'];
    card.style.setProperty('--team-color-primary', colors.primary);
    card.style.setProperty('--team-color-secondary', colors.secondary);
    if (darkTextTeams.includes(player.team_abbr)) { card.classList.add('dark-text'); }

    const jerseyNumber = player.jersey_number || 'XX';
    const playerName = player.player_name || 'Unknown';
    const playerPosition = player.position || '?';

    card.innerHTML = `
        <div class="card-jersey-number">${jerseyNumber}</div>
        <div class="card-player-name">${playerName}</div>
        <div class="card-player-position">${playerPosition}</div>
    `;

    if (!hideNameForGuessing) {
        card.addEventListener('dragstart', handleDragStart); // Use general handler
        card.addEventListener('click', handleCardClick); // Use general handler
    } else {
        card.style.cursor = 'default';
    }
    return card;
}


// --- QUIZ MODE --- (No changes needed in these functions)
function startQuizMode() { /* ... */ }
function startTimer() { /* ... */ }
function updateTimerDisplay() { /* ... */ }
function checkQuizCompletion() { /* ... */ }
function endQuiz(timeUp) { /* ... */ }
function calculateScore() { /* ... */ }
function renderDebrief(results, timeUp) { /* ... */ }


// --- SCOUT SCHOOL MODE ---
function startScoutSchool() { // Starts Phase 1
    gameState.currentScoutPhase = 1;
    gameState.scoutPhaseProgress = 0;
    gameState.scoutPhaseCorrect = 0;
    startScoutPhase1();
}

// --- Phase 1: Identification --- (No changes needed)
function startScoutPhase1() { /* ... */ }
function generatePhase1Question() { /* ... */ }
function handlePhase1Answer(isCorrect, button, targetPlayerId) { /* ... */ }

// --- Phase 2: Evaluation --- (No changes needed)
function startScoutPhase2() { /* ... */ }
function generatePhase2Question() { /* ... */ }
function handlePhase2Answer(isCorrect, selectedCardElement) { /* ... */ }

// --- Phase 3: Line Construction --- (No changes needed in start/submit)
function startScoutPhase3() { /* ... */ }
function handleSubmitLineup() { // Only checks line accuracy
     let allSlotsFilled = true; /* ... (check lines filled) ... */
     if (!allSlotsFilled) { alert("Please fill all line slots."); return; }
    const results = calculateScore(); // Calculates based on lines
    if (results.accuracy === 1) {
        // Don't mark as mastered yet, proceed to Phase 4
        showPhaseCompleteScreen(3, true);
    } else {
         alert(`Lineup incorrect (${results.correctSlots}/${results.totalSlots}). Review placements and try again!`);
    }
}


// --- *** NEW: Phase 4: Goalie Tandem *** ---
function startScoutPhase4() {
    gameState.currentScoutPhase = 4;
    phase4Team.textContent = `Team: ${gameState.currentTeam}`;
    phase4Feedback.textContent = '';
    gameState.userGoalieRoles = { Starter: null, Backup: null }; // Reset user placement
    gameState.correctGoalieRoles = { Starter: null, Backup: null }; // Reset correct roles

    // Get goalies for the current team
    const teamGoalies = gameState.allGoalies.filter(g => g.team_abbr === gameState.currentTeam)
                                       .sort((a, b) => b.rating - a.rating); // Sort by GSAx (rating)

    if (teamGoalies.length < 2) {
        // If fewer than 2 goalies, maybe auto-complete or show message?
        console.warn(`Team ${gameState.currentTeam} has fewer than 2 goalies. Auto-completing Phase 4.`);
        // Mark team as mastered directly
        markTeamAsMastered();
        showPhaseCompleteScreen(4, true); // Show final mastery screen
        return;
    }

    // Determine Starter and Backup
    gameState.correctGoalieRoles.Starter = teamGoalies[0].id;
    gameState.correctGoalieRoles.Backup = teamGoalies[1].id;

    // Render slots (clear previous content)
    goalieSlotStarter.innerHTML = '<div class="goalie-slot-label">STARTER</div>';
    goalieSlotBackup.innerHTML = '<div class="goalie-slot-label">BACKUP</div>';
    goalieSlotStarter.classList.remove('feedback-correct', 'feedback-incorrect');
    goalieSlotBackup.classList.remove('feedback-correct', 'feedback-incorrect');


    // Render goalie pool
    goaliePool.innerHTML = '';
    teamGoalies.forEach(goalie => {
        const card = createPlayerCard(goalie, false); // Use player card style, name visible
        // Override dragstart for goalies
        card.removeEventListener('dragstart', handleDragStart); // Remove generic one
        card.addEventListener('dragstart', handleGoalieDragStart); // Add specific one
        // Override click for goalies
         card.removeEventListener('click', handleCardClick);
         card.addEventListener('click', handleGoalieCardClick); // Specific click handler
        goaliePool.appendChild(card);
    });

    // Add drop listeners to goalie slots
    [goalieSlotStarter, goalieSlotBackup].forEach(slot => {
         slot.removeEventListener('dragover', handleGoalieDragOver); // Prevent duplicates
         slot.removeEventListener('dragleave', handleGoalieDragLeave);
         slot.removeEventListener('drop', handleGoalieDrop);
         slot.addEventListener('dragover', handleGoalieDragOver);
         slot.addEventListener('dragleave', handleGoalieDragLeave);
         slot.addEventListener('drop', handleGoalieDrop);
    });

    setScreen('scoutPhase4');
}

function handleGoalieDragStart(e) {
    // Similar to handleDragStart, but specific for goalies
    e.dataTransfer.setData('text/plain', e.target.dataset.playerId);
    e.target.classList.add('dragging');
    const slot = e.target.closest('.goalie-slot');
    if (slot) {
        const role = slot.dataset.role; // Starter or Backup
        gameState.userGoalieRoles[role] = null; // Clear from state
        slot.classList.remove('feedback-correct', 'feedback-incorrect'); // Clear feedback
    }
}

function handleGoalieDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleGoalieDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleGoalieDrop(e) {
    e.preventDefault();
    const slot = e.currentTarget;
    const role = slot.dataset.role; // 'Starter' or 'Backup'
    const goalieId = e.dataTransfer.getData('text/plain');
    const draggedCard = document.querySelector(`.player-card[data-player-id="${goalieId}"]`);

    slot.classList.remove('drag-over');
    if (!draggedCard) return;
    draggedCard.classList.remove('dragging');

    // If slot is already filled, move existing goalie back to pool
    const existingCard = slot.querySelector('.player-card');
    if (existingCard) {
        goaliePool.appendChild(existingCard);
        // Clear previous goalie from state if needed (though overwrite below handles it)
    }

    // Place new card
    slot.appendChild(draggedCard);

    // Update user state
    const goalie = gameState.allGoalies.find(g => g.id === goalieId);
    gameState.userGoalieRoles[role] = goalie;

    // Instant Feedback
    if (goalieId === gameState.correctGoalieRoles[role]) {
        applyFeedback(slot, 'correct');
    } else {
        applyFeedback(slot, 'incorrect');
    }

    // Check if both slots are now correctly filled
    checkPhase4Completion();
}

// Allow clicking goalie card in slot back to pool
function handleGoalieCardClick(e) {
     const card = e.currentTarget;
     const slot = card.closest('.goalie-slot');
     if (slot) {
         goaliePool.appendChild(card); // Move visually
         const role = slot.dataset.role;
         gameState.userGoalieRoles[role] = null; // Update state
         slot.classList.remove('feedback-correct', 'feedback-incorrect'); // Clear feedback
     }
}


function checkPhase4Completion() {
    const starterCorrect = gameState.userGoalieRoles.Starter?.id === gameState.correctGoalieRoles.Starter;
    const backupCorrect = gameState.userGoalieRoles.Backup?.id === gameState.correctGoalieRoles.Backup;

    if (starterCorrect && backupCorrect) {
        phase4Feedback.textContent = "Goalie Tandem Correct!";
        phase4Feedback.className = 'phase-feedback correct';
        // Mark team as mastered NOW
        markTeamAsMastered();
        // Show final mastery screen after a delay
        setTimeout(() => showPhaseCompleteScreen(4, true), 1000);
    } else {
         // Clear feedback if one is correct but the other isn't yet, or both wrong
         phase4Feedback.textContent = "";
         phase4Feedback.className = 'phase-feedback';
    }
}

// --- Phase Completion Screen (Updated) ---
function showPhaseCompleteScreen(phaseCompleted, passed) {
    teamMasteryBadge.style.display = 'none';
    phaseCompleteTitle.classList.toggle('failed', !passed);

    if (passed) {
        phaseCompleteTitle.textContent = phaseCompleted === 4 ? `TEAM MASTERED!` : `PHASE ${phaseCompleted} COMPLETE!`;
        phaseCompleteTitle.style.color = 'var(--color-feedback-green)';
        nextPhaseButton.style.display = 'block';

        if (phaseCompleted < 3) { // After Phase 1 or 2
            phaseCompleteMessage.textContent = `Excellent work. Prepare for Phase ${phaseCompleted + 1}.`;
            nextPhaseButton.textContent = 'CONTINUE TRAINING';
            nextPhaseButton.onclick = () => {
                if (phaseCompleted === 1) startScoutPhase2();
                if (phaseCompleted === 2) startScoutPhase3();
            };
        } else if (phaseCompleted === 3) { // After Phase 3 (Lines done)
             phaseCompleteMessage.textContent = `Lines constructed accurately. Now, identify the Goalie Tandem.`;
             nextPhaseButton.textContent = 'PROCEED TO PHASE 4';
             nextPhaseButton.onclick = startScoutPhase4; // Go to Phase 4
        } else { // After Phase 4 (Team Mastered)
            phaseCompleteMessage.textContent = `You've mastered the ${gameState.currentTeam} roster and goalie tandem!`;
            nextPhaseButton.textContent = 'RETURN TO MENU';
            nextPhaseButton.onclick = goToStartScreen;
            teamMasteryBadge.style.display = 'block';
            masteredTeamName.textContent = gameState.currentTeam;
        }
    } else { // Failed phase
        phaseCompleteTitle.textContent = `PHASE ${phaseCompleted} FAILED`;
        phaseCompleteMessage.textContent = `Accuracy requirement not met. Drill needs repeating.`;
        nextPhaseButton.textContent = 'RETRY PHASE';
        nextPhaseButton.onclick = () => {
             gameState.scoutPhaseProgress = 0;
             gameState.scoutPhaseCorrect = 0;
             if (phaseCompleted === 1) startScoutPhase1();
             if (phaseCompleted === 2) startScoutPhase2();
             // Retry phase 3 or 4 just restarts them
             if (phaseCompleted === 3) startScoutPhase3();
             if (phaseCompleted === 4) startScoutPhase4(); // Should be rare to fail phase 4
        };
    }
    setScreen('phaseComplete');
}


// --- Shared Line Builder UI/Logic --- (No changes needed in these functions)
function setupLineupBuilderState() { /* ... */ }
function renderLineBuilderUI() { /* ... */ }
function renderPlayerInSlot(player) { /* ... */ }

// --- Drag and Drop Handlers --- (Keep all drag/drop/click handlers as they are specific)
function handleDragStart(e) { /* ... */ }
function handleDragOver(e) { /* ... */ }
function handleDragLeave(e) { /* ... */ }
function handleDrop(e) { /* ... */ }
function handleCardClick(e) { /* ... */ }
function attachDragDropListeners() { /* ... */ }
function applyFeedback(element, type) { /* ... */ }


// --- Helpers & Local Storage ---
function updatePhaseProgress(phase) {
     const progressElement = document.getElementById(`phase-${phase}-progress`);
     const totalQuestions = phase === 1 ? UI_CONSTANTS.PHASE_1_QUESTIONS : UI_CONSTANTS.PHASE_2_QUESTIONS;
     if (progressElement) { progressElement.textContent = `Progress: ${gameState.scoutPhaseProgress} / ${totalQuestions} | Correct: ${gameState.scoutPhaseCorrect}`; }
}
function goToStartScreen() {
     gameState.currentScoutPhase = 0; gameState.quizActive = false;
     updateStartScreenUI(); setScreen('start');
}
function markTeamAsMastered() {
     gameState.masteredTeams.add(gameState.currentTeam);
     // Unlock next *unmastered* team logic
     const allTeams = gameState.lineStructures.map(t => t.team_abbr).sort();
     const currentIndex = allTeams.indexOf(gameState.currentTeam);
     for (let i = 0; i < allTeams.length; i++) {
         const team = allTeams[(currentIndex + 1 + i) % allTeams.length];
         if (!gameState.masteredTeams.has(team) && !gameState.unlockedTeams.includes(team)) {
             gameState.unlockedTeams.push(team);
             gameState.unlockedTeams.sort();
             break;
         }
     }
     saveProgress(); // Save after mastering
}
// (Keep saveProgress and loadProgress as they are)
function saveProgress() {
     try { const progress = { masteredTeams: Array.from(gameState.masteredTeams), unlockedTeams: Array.from(gameState.unlockedTeams), favoriteTeam: gameState.favoriteTeam }; localStorage.setItem('scoutSchoolProgress', JSON.stringify(progress)); } catch (e) { console.warn("Could not save progress:", e); }
}
function loadProgress() {
    try {
        const savedProgress = localStorage.getItem('scoutSchoolProgress');
        let initialFavorite = gameState.lineStructures.length > 0 ? gameState.lineStructures[0].team_abbr : 'ANA';
        let initialUnlocked = [initialFavorite]; // Start with favorite unlocked

        if (savedProgress) {
            const progress = JSON.parse(savedProgress);
            gameState.masteredTeams = new Set(progress.masteredTeams || []);
            gameState.favoriteTeam = progress.favoriteTeam || initialFavorite;
            // Ensure unlocked includes favorite, then add saved, make unique & sort
            gameState.unlockedTeams = [...new Set([gameState.favoriteTeam, ...(progress.unlockedTeams || [])])].sort();
        } else {
             gameState.masteredTeams = new Set();
             gameState.favoriteTeam = initialFavorite;
             gameState.unlockedTeams = [initialFavorite];
             saveProgress(); // Save initial state
        }
    } catch (e) {
        console.warn("Could not load progress:", e);
        gameState.masteredTeams = new Set();
        gameState.favoriteTeam = gameState.lineStructures.length > 0 ? gameState.lineStructures[0].team_abbr : 'ANA';
        gameState.unlockedTeams = [gameState.favoriteTeam];
    }
}

// --- Event Listeners & App Start ---
nextShiftButton.addEventListener('click', goToStartScreen);
window.addEventListener('load', loadDataAndInitialize);