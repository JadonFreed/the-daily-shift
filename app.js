const UI_CONSTANTS = {
    TIMER_SECONDS: 60,
    POINTS_PER_CORRECT_SLOT: 10,
    SCORE_MULTIPLIER_TIME_FACTOR: 60,
    FEEDBACK_DURATION: 500,
    PHASE_1_QUESTIONS: 10,
    PHASE_1_MASTERY_ACCURACY: 0.8,
    PHASE_2_QUESTIONS: 10, // Keep 10 questions for the new Phase 2
    PHASE_2_MASTERY_ACCURACY: 0.8, // 80% accuracy for Line Assignment
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
const darkTextTeams = ['DET', 'TBL', 'TOR'];

// --- Global State Variables ---
let gameState = {
    allPlayers: [], allGoalies: [], lineStructures: [], currentTeam: null,
    linesToQuiz: 2, favoriteTeam: 'ANA', currentMode: 'quiz',
    quizActive: false, timer: null, timeRemaining: 0,
    userLineup: {}, mistakes: [],
    currentScoutPhase: 0, scoutPhaseProgress: 0, scoutPhaseCorrect: 0,
    scoutPhaseQuestionData: null, masteredTeams: new Set(), unlockedTeams: ['ANA'],
    correctGoalieRoles: { Starter: null, Backup: null },
    userGoalieRoles: { Starter: null, Backup: null },
};

// --- DOM Element Selection ---
const screens = {
    start: document.getElementById('start-screen'), quiz: document.getElementById('quiz-screen'),
    debrief: document.getElementById('debrief-screen'), scoutPhase1: document.getElementById('scout-phase-1-screen'),
    scoutPhase2: document.getElementById('scout-phase-2-screen'),
    scoutPhase4: document.getElementById('scout-phase-4-screen'),
    phaseComplete: document.getElementById('phase-complete-screen'),
};
// (All other DOM selections remain the same as the previous version)
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
const phase4Team = document.getElementById('scout-phase-4-team');
const goalieSlotStarter = document.getElementById('goalie-slot-starter');
const goalieSlotBackup = document.getElementById('goalie-slot-backup');
const goaliePool = document.getElementById('goalie-pool');
const phase4Feedback = document.getElementById('phase-4-feedback');
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

// --- Utility Functions ---
function setScreen(screenName) { /* ... (no changes) ... */
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
        document.body.classList.toggle('learning-mode', gameState.currentMode === 'scout');
        screens.quiz?.classList.toggle('learning-mode', gameState.currentMode === 'scout');
        screens.debrief?.classList.toggle('learning-mode', gameState.currentMode === 'scout');
    } else { console.error("Screen not found:", screenName); }
}
function shuffleArray(array) { /* ... (no changes) ... */
    for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } return array;
}

// --- Initialization ---
async function loadDataAndInitialize() {
    try {
        const [playersResponse, linesResponse, goaliesResponse, lookupResponse] = await Promise.all([
            fetch('nhl_players.json'),
            fetch('team_line_structures.json'),
            fetch('all_goalies_ratings_final.csv'),
            fetch('allPlayersLookup.csv')
        ]);
        if (!playersResponse.ok) throw new Error('Failed to load nhl_players.json');
        if (!linesResponse.ok) throw new Error('Failed to load team_line_structures.json');
        if (!goaliesResponse.ok) throw new Error('Failed to load all_goalies_ratings_final.csv');
        if (!lookupResponse.ok) throw new Error('Failed to load allPlayersLookup.csv');

        gameState.allPlayers = await playersResponse.json();
        gameState.lineStructures = await linesResponse.json();

        // CSV Parsing
        const goaliesCSVText = await goaliesResponse.text();
        const lookupCSVText = await lookupResponse.text();
        const parseCSV = (text) => {
            const lines = text.trim().split('\n');
            const header = lines[0].split(',').map(h => h.trim());
            return lines.slice(1).map(line => {
                const values = line.split(',');
                const obj = {};
                header.forEach((key, index) => {
                    let value = values[index]?.trim();
                    if (value?.startsWith('"') && value?.endsWith('"')) { value = value.slice(1, -1); }
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
                id: goalie.playerId,
                player_name: goalie.name || 'Unknown Goalie',
                team_abbr: goalie.team,
                position: 'G',
                rating: parseFloat(goalie.GSAx_Per60_Stabilized) || 0,
                jersey_number: lookupInfo?.primaryNumber || 'XX',
                age: age,
                height: lookupInfo?.height || '?',
            };
        });
        gameState.allPlayers = gameState.allPlayers.filter(p => p.position !== 'G');

        loadProgress();
        initializeStartScreen();
        setScreen('start');
    } catch (error) {
        console.error("Data loading error:", error);
        alert("Error loading or processing game data. Check console.");
    }
}
function initializeStartScreen() { /* ... (no changes) ... */
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
function updateStartScreenUI() { /* ... (no changes) ... */
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

// --- Player Card Creation ---
function createPlayerCard(player, hideNameForGuessing = false) { /* ... (no changes) ... */
    const card = document.createElement('div');
    card.className = 'player-card';
    card.setAttribute('draggable', !hideNameForGuessing);
    card.dataset.playerId = player.id;
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
        <div class="card-player-position">${playerPosition}</div>`;
    if (!hideNameForGuessing) {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('click', handleCardClick);
    } else { card.style.cursor = 'default'; }
    return card;
}

// --- QUIZ MODE --- (No changes needed)
function startQuizMode() { /* ... */ }
function startTimer() { /* ... */ }
function updateTimerDisplay() { /* ... */ }
function checkQuizCompletion() { /* ... */ }
function endQuiz(timeUp) { /* ... */ }
function calculateScore() { /* ... */ }
function renderDebrief(results, timeUp) { /* ... */ }


// --- SCOUT SCHOOL MODE ---
function startScoutSchool() { /* ... (no changes) ... */
    gameState.currentScoutPhase = 1; gameState.scoutPhaseProgress = 0; gameState.scoutPhaseCorrect = 0;
    startScoutPhase1();
}

// --- Phase 1: Identification --- (No changes needed)
function startScoutPhase1() { /* ... */ }
function generatePhase1Question() { /* ... */ }
function handlePhase1Answer(isCorrect, button, targetPlayerId) { /* ... */ }


// --- *** NEW: Phase 2: Line Assignment *** ---
function startScoutPhase2() {
    gameState.scoutPhaseProgress = 0;
    gameState.scoutPhaseCorrect = 0;
    phase2Team.textContent = `Team: ${gameState.currentTeam}`;
    generatePhase2Question(); // Call the new function
    setScreen('scoutPhase2');
}

/** Finds the line number (1, 2, or 3) for a player. Returns 4 for "Depth" (not top 3). */
function findPlayerLine(playerName) {
    const teamData = gameState.lineStructures.find(t => t.team_abbr === gameState.currentTeam);
    if (!teamData) return 4; // Default to depth if no team data
    if (Object.values(teamData.lines['Line 1'] || {}).some(p => p && p.name === playerName)) return 1;
    if (Object.values(teamData.lines['Line 2'] || {}).some(p => p && p.name === playerName)) return 2;
    if (Object.values(teamData.lines['Line 3'] || {}).some(p => p && p.name === playerName)) return 3;
    return 4; // Player is not in the top 3 lines
}

function generatePhase2Question() {
    phase2Feedback.textContent = ''; phase2Feedback.className = 'phase-feedback';
    phase2PlayerA.innerHTML = ''; phase2PlayerB.innerHTML = '';
    phase2PlayerA.onclick = null; phase2PlayerB.onclick = null;
    phase2PlayerA.style.borderColor = 'transparent'; phase2PlayerB.style.borderColor = 'transparent';

    const teamSkaters = gameState.allPlayers.filter(p => p.team_abbr === gameState.currentTeam && ['C', 'L', 'R', 'D'].includes(p.position));
    if (teamSkaters.length < 2) { alert("Not enough skaters."); goToStartScreen(); return; }

    let playerA, playerB, lineA, lineB, attempts = 0;
    
    // Find two players on different lines
    do {
        const shuffledPlayers = shuffleArray([...teamSkaters]);
        playerA = shuffledPlayers[0];
        playerB = shuffledPlayers[1];
        lineA = findPlayerLine(playerA.player_name);
        lineB = findPlayerLine(playerB.player_name);
        attempts++;
    } while (lineA === lineB && attempts < 20); // Try 20 times to find different-line players

    // If still same line (e.g., small roster data), just pick two different players
    if (lineA === lineB && teamSkaters.length > 1) {
         playerB = teamSkaters.find(p => p.id !== playerA.id) || teamSkaters[1];
         lineB = findPlayerLine(playerB.player_name);
    }
    
    if (!playerA || !playerB) { alert("Error finding players."); goToStartScreen(); return; }

    // Create cards (Name VISIBLE)
    phase2PlayerA.appendChild(createPlayerCard(playerA, false));
    phase2PlayerB.appendChild(createPlayerCard(playerB, false));

    // Determine the correct answer
    // Lower line number means "higher" line (Line 1 < Line 2)
    const higherLinePlayerId = (lineA <= lineB) ? playerA.id : playerB.id;
    // Handle edge case where both are "Depth" (lineA == lineB == 4)
    if (lineA === 4 && lineB === 4) {
         // If both are depth, pick one randomly (or based on rating as fallback)
         gameState.scoutPhaseQuestionData = { higherLinePlayerId: playerA.rating >= playerB.rating ? playerA.id : playerB.id };
    } else {
         gameState.scoutPhaseQuestionData = { higherLinePlayerId };
    }


    phase2PlayerA.onclick = () => handlePhase2Answer(playerA.id === gameState.scoutPhaseQuestionData.higherLinePlayerId, phase2PlayerA);
    phase2PlayerB.onclick = () => handlePhase2Answer(playerB.id === gameState.scoutPhaseQuestionData.higherLinePlayerId, phase2PlayerB);

    updatePhaseProgress(2);
}

function handlePhase2Answer(isCorrect, selectedCardElement) {
    phase2PlayerA.onclick = null; phase2PlayerB.onclick = null; // Disable clicks

    if (isCorrect) {
        gameState.scoutPhaseCorrect++;
        phase2Feedback.textContent = 'CORRECT!';
        phase2Feedback.className = 'phase-feedback correct';
        selectedCardElement.style.borderColor = 'var(--color-feedback-green)';
    } else {
        phase2Feedback.textContent = 'INCORRECT!';
        phase2Feedback.className = 'phase-feedback incorrect';
        selectedCardElement.style.borderColor = 'var(--color-error-red)';
        
        // Highlight the correct card
        const correctCard = (phase2PlayerA.querySelector(`[data-player-id="${gameState.scoutPhaseQuestionData.higherLinePlayerId}"]`)) ? phase2PlayerA : phase2PlayerB;
        if (correctCard !== selectedCardElement) { 
            correctCard.style.borderColor = 'var(--color-feedback-green)';
        }
    }

    gameState.scoutPhaseProgress++;

    if (gameState.scoutPhaseProgress >= UI_CONSTANTS.PHASE_2_QUESTIONS) {
        const accuracy = gameState.scoutPhaseCorrect / UI_CONSTANTS.PHASE_2_QUESTIONS;
        setTimeout(() => showPhaseCompleteScreen(2, accuracy >= UI_CONSTANTS.PHASE_2_MASTERY_ACCURACY), 1500);
    } else {
        setTimeout(generatePhase2Question, 1500);
    }
}


// --- Phase 3: Line Construction --- (No changes needed)
function startScoutPhase3() { /* ... */ }
function handleSubmitLineup() { /* ... */ }

// --- Phase 4: Goalie Tandem --- (No changes needed)
function startScoutPhase4() { /* ... */ }
function handleGoalieDragStart(e) { /* ... */ }
function handleGoalieDragOver(e) { /* ... */ }
function handleGoalieDragLeave(e) { /* ... */ }
function handleGoalieDrop(e) { /* ... */ }
function handleGoalieCardClick(e) { /* ... */ }
function checkPhase4Completion() { /* ... */ }

// --- Phase Completion Screen --- (No changes needed)
function showPhaseCompleteScreen(phaseCompleted, passed) { /* ... */ }

// --- Shared Line Builder UI/Logic --- (No changes needed)
function setupLineupBuilderState() { /* ... */ }
function renderLineBuilderUI() { /* ... */ }
function renderPlayerInSlot(player) { /* ... */ }

// --- Drag and Drop Handlers --- (No changes needed)
function handleDragStart(e) { /* ... */ }
function handleDragOver(e) { /* ... */ }
function handleDragLeave(e) { /* ... */ }
function handleDrop(e) { /* ... */ }
function handleCardClick(e) { /* ... */ }
function attachDragDropListeners() { /* ... */ }
function applyFeedback(element, type) { /* ... */ }

// --- Helpers & Local Storage --- (No changes needed)
function updatePhaseProgress(phase) { /* ... */ }
function goToStartScreen() { /* ... */ }
function markTeamAsMastered() { /* ... */ }
function saveProgress() { /* ... */ }
function loadProgress() { /* ... */ }

// --- Event Listeners & App Start ---
nextShiftButton.addEventListener('click', goToStartScreen);
window.addEventListener('load', loadDataAndInitialize);