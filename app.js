const UI_CONSTANTS = {
    TIMER_SECONDS: 60,
    POINTS_PER_CORRECT_SLOT: 10,
    SCORE_MULTIPLIER_TIME_FACTOR: 60,
    FEEDBACK_DURATION: 500,
    PHASE_1_QUESTIONS: 10,
    PHASE_1_MASTERY_ACCURACY: 0.8,
    PHASE_2_QUESTIONS: 10,
    PHASE_2_MASTERY_ACCURACY: 0.9,
    DIVISION_QUIZ_QUESTIONS: 10, // New constant for division quiz
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
    // Handle new teams or old abbreviations
    'ARI': { primary: '#8C2633', secondary: '#E2D6B5' }, // Placeholder for ARI/UTA
    'UTA': { primary: '#5D2B7F', secondary: '#B5B5B7' }, // Placeholder for Utah
    'DEFAULT': { primary: '#555555', secondary: '#BBBBBB' }
};
const darkTextTeams = ['DET', 'TBL', 'TOR']; // Teams needing dark text

// --- *** NEW NHL DIVISION DATA *** ---
const NHL_DIVISIONS = {
    "Eastern": {
        "Atlantic": ["BOS", "BUF", "DET", "FLA", "MTL", "OTT", "TBL", "TOR"],
        "Metropolitan": ["CAR", "CBJ", "NJD", "NYI", "NYR", "PHI", "PIT", "WSH"]
    },
    "Western": {
        "Central": ["ARI", "CHI", "COL", "DAL", "MIN", "NSH", "STL", "WPG"], // Note: ARI is moving
        "Pacific": ["ANA", "CGY", "EDM", "LAK", "SJS", "SEA", "VAN", "VGK"]
    }
};
// Helper to get a flat list of all divisions
const ALL_DIVISIONS = {
    ...NHL_DIVISIONS.Eastern,
    ...NHL_DIVISIONS.Western
};


// --- Global State Variables ---
let gameState = {
    allPlayers: [], lineStructures: [], currentTeam: null, linesToQuiz: 2,
    favoriteTeam: 'ANA', // Default favorite
    currentMode: 'quiz', quizActive: false, timer: null, timeRemaining: 0,
    userLineup: {}, mistakes: [],
    currentScoutPhase: 0, scoutPhaseProgress: 0, scoutPhaseCorrect: 0,
    scoutPhaseQuestionData: null, masteredTeams: new Set(), unlockedTeams: ['ANA'],
    currentDivisionQuiz: null, // Holds the division name being quizzed
};

// --- DOM Element Selection ---
const screens = {
    start: document.getElementById('start-screen'), quiz: document.getElementById('quiz-screen'),
    debrief: document.getElementById('debrief-screen'), scoutPhase1: document.getElementById('scout-phase-1-screen'),
    scoutPhase2: document.getElementById('scout-phase-2-screen'), phaseComplete: document.getElementById('phase-complete-screen'),
    divisionQuiz: document.getElementById('division-quiz-screen'), // New Screen
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

// Division Mastery DOM
const divisionMasterySection = document.getElementById('division-mastery-section');
const divisionMasteryPlaceholder = document.getElementById('division-mastery-placeholder');
const divisionQuizButtons = document.getElementById('division-quiz-buttons');

// Phase 1 DOM
const phase1Team = document.getElementById('scout-phase-1-team');
const phase1CardDisplay = document.getElementById('phase-1-card-display');
const phase1Choices = document.getElementById('phase-1-choices');
const phase1Feedback = document.getElementById('phase-1-feedback');
const phase1Progress = document.getElementById('phase-1-progress');

// Phase 2 DOM
const phase2Team = document.getElementById('scout-phase-2-team');
const phase2CardDisplay = document.getElementById('phase-2-card-display');
const phase2Choices = document.getElementById('phase-2-choices');
const phase2Feedback = document.getElementById('phase-2-feedback');
const phase2Progress = document.getElementById('phase-2-progress');

// Division Quiz DOM
const divisionQuizTitle = document.getElementById('division-quiz-title');
const divisionQuizCardDisplay = document.getElementById('division-quiz-card-display');
const divisionQuizChoices = document.getElementById('division-quiz-choices');
const divisionQuizFeedback = document.getElementById('division-quiz-feedback');
const divisionQuizProgress = document.getElementById('division-quiz-progress');
const divisionQuizExitBtn = document.getElementById('division-quiz-exit-btn');

// Phase Complete DOM
const phaseCompleteTitle = document.getElementById('phase-complete-title');
const phaseCompleteMessage = document.getElementById('phase-complete-message');
const nextPhaseButton = document.getElementById('next-phase-btn');
const teamMasteryBadge = document.getElementById('team-mastery-badge');
const masteredTeamName = document.getElementById('mastered-team-name');

// Debrief DOM
const timeBonusDisplay = document.getElementById('time-bonus-display');
const debriefTimeBonus = document.getElementById('debrief-time-bonus');
const debriefAccuracy = document.getElementById('debrief-accuracy');
const debriefPoints = document.getElementById('debrief-points');
const mistakeList = document.getElementById('mistake-review-list');
const nextShiftButton = document.getElementById('next-shift-btn');


// --- Utility Functions ---
function setScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
        document.body.classList.toggle('learning-mode', gameState.currentMode === 'scout' || screenName === 'divisionQuiz');
        screens.quiz?.classList.toggle('learning-mode', gameState.currentMode === 'scout');
        screens.debrief?.classList.toggle('learning-mode', gameState.currentMode === 'scout');
    } else {
        console.error("Screen not found:", screenName);
    }
}
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// --- Initialization ---
async function loadDataAndInitialize() {
    try {
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
        updateDivisionMasteryUI(); // Check for unlocked division quizzes
        setScreen('start');
    } catch (error) {
        console.error("Data loading error:", error);
        alert("Error loading game data. Check console. Make sure 'nhl_players.json' and 'team_line_structures.json' are present.");
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
    favoriteTeamSelect.innerHTML = '';
    allTeamsSorted.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        favoriteTeamSelect.appendChild(option);
    });
    favoriteTeamSelect.value = gameState.favoriteTeam; // Set dropdown to loaded/default favorite
    favoriteTeamSelect.addEventListener('change', (e) => {
        gameState.favoriteTeam = e.target.value;
        if (!gameState.unlockedTeams.includes(gameState.favoriteTeam)) {
            gameState.unlockedTeams.push(gameState.favoriteTeam);
            gameState.unlockedTeams.sort();
        }
        saveProgress();
        updateStartScreenUI();
    });

    // Target Team Select (populated by updateStartScreenUI)
    teamSelect.addEventListener('change', (e) => gameState.currentTeam = e.target.value);

    // Line Options (for Quiz Mode)
    lineOptionsButtons.forEach(btn => {
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
    divisionMasterySection.style.display = isScoutMode ? 'block' : 'none';

    // --- *** NEW: Populate Target Team Dropdown with Divisions *** ---
    let teamsToShow;
    const currentTargetValue = teamSelect.value;
    teamSelect.innerHTML = ''; // Clear existing options

    if (isScoutMode) {
        teamsToShow = [...new Set([gameState.favoriteTeam, ...gameState.unlockedTeams])].sort();
    } else {
        teamsToShow = gameState.lineStructures.map(t => t.team_abbr).sort();
    }

    // Create a map of teams for quick lookup
    const teamsToShowSet = new Set(teamsToShow);

    // Loop through conferences and divisions
    for (const [conference, divisions] of Object.entries(NHL_DIVISIONS)) {
        for (const [divisionName, teamAbbrs] of Object.entries(divisions)) {
            // Filter teams in this division that are in the teamsToShow list
            const relevantTeams = teamAbbrs.filter(team => teamsToShowSet.has(team)).sort();

            if (relevantTeams.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = `${divisionName} Division`;
                
                relevantTeams.forEach(team => {
                    const option = document.createElement('option');
                    option.value = team;
                    option.textContent = team + (gameState.masteredTeams.has(team) ? ' ✅' : '');
                    optgroup.appendChild(option);
                });
                teamSelect.appendChild(optgroup);
            }
        }
    }
    // --- *** END NEW DROPDOWN LOGIC *** ---


    // Set default target team
    let defaultTarget;
    if (isScoutMode) {
        defaultTarget = teamsToShow.includes(gameState.favoriteTeam) ? gameState.favoriteTeam : teamsToShow[0];
    } else {
        defaultTarget = teamsToShow.includes(currentTargetValue) ? currentTargetValue : (teamsToShow.includes(gameState.favoriteTeam) ? gameState.favoriteTeam : teamsToShow[0]);
    }
    teamSelect.value = defaultTarget || teamsToShow[0];
    gameState.currentTeam = teamSelect.value;
}


// --- Game Start ---
function startGame() {
    gameState.currentTeam = teamSelect.value;
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
    card.setAttribute('draggable', !hideNameForGuessing);
    card.dataset.playerId = player.id;
    card.dataset.position = player.position; // Store actual position

    const colors = teamColors[player.team_abbr] || teamColors['DEFAULT'];
    card.style.setProperty('--team-color-primary', colors.primary);
    card.style.setProperty('--team-color-secondary', colors.secondary);

    if (darkTextTeams.includes(player.team_abbr)) {
        card.classList.add('dark-text');
    }

    const jerseyNumber = player.jersey_number || 'XX';
    const playerName = player.player_name || 'Unknown';
    const playerPosition = player.position || '?';

    card.innerHTML = `
        <div class="card-jersey-number">${jerseyNumber}</div>
        <div class="card-player-name">${playerName}</div>
        <div class="card-player-position">${playerPosition}</div>
    `;
    
    // CSS handles hiding/showing name and position
    if (hideNameForGuessing) {
        card.classList.add('hide-name');
    }

    if (!hideNameForGuessing) {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('click', handleCardClick);
    } else {
        card.style.cursor = 'default';
    }

    return card;
}


// --- QUIZ MODE ---
function startQuizMode() {
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
function startTimer() {
    clearInterval(gameState.timer);
    gameState.timeRemaining = UI_CONSTANTS.TIMER_SECONDS;
    updateTimerDisplay();
    gameState.timer = setInterval(() => {
        if (!gameState.quizActive) { clearInterval(gameState.timer); return; }
        gameState.timeRemaining -= 1;
        updateTimerDisplay();
        if (gameState.timeRemaining <= 0) { endQuiz(true); }
    }, 1000);
}
function updateTimerDisplay() {
     const timeRatio = Math.max(0, gameState.timeRemaining / UI_CONSTANTS.TIMER_SECONDS);
    timerBar.style.width = `${timeRatio * 100}%`;
    
    const minutes = Math.floor(gameState.timeRemaining / 60);
    const seconds = gameState.timeRemaining % 60;
    timerText.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    timerBar.style.backgroundColor = gameState.timeRemaining <= 10 ? 'var(--color-error-red)' : 'var(--color-accent-cyan)';
    timerBar.style.boxShadow = `0 0 10px ${gameState.timeRemaining <= 10 ? 'var(--color-error-red)' : 'var(--color-accent-cyan)'}`;
}
function checkQuizCompletion() {
    if (gameState.currentMode !== 'scout') {
        let allSlotsFilled = true;
        for (const lineId in gameState.userLineup) {
            for (const slotKey in gameState.userLineup[lineId]) {
                if (gameState.userLineup[lineId][slotKey] === null) { allSlotsFilled = false; break; }
            }
            if (!allSlotsFilled) break;
        }
        if (allSlotsFilled) { endQuiz(false); }
    }
}
function endQuiz(timeUp) {
     gameState.quizActive = false;
    clearInterval(gameState.timer);
    const results = calculateScore();
    renderDebrief(results, timeUp);
    setScreen('debrief');
}
function calculateScore() {
    let correctSlots = 0;
    let totalSlots = 0;
    const currentMistakes = [];
    for (const lineId in gameState.correctLineup) {
        for (const slotKey in gameState.correctLineup[lineId]) {
            totalSlots++;
            const correctPlayer = gameState.correctLineup[lineId][slotKey]; // {name: "...", rating: ...}
            const userPlayer = gameState.userLineup[lineId]?.[slotKey]; // Full player object
            if (userPlayer && correctPlayer && userPlayer.player_name === correctPlayer.name) {
                correctSlots++;
            } else if (gameState.currentMode === 'quiz') {
                 currentMistakes.push({ lineId, slotKey, user: userPlayer, correct: correctPlayer });
            }
        }
    }
    if (gameState.currentMode === 'quiz') { gameState.mistakes = currentMistakes; }
    const accuracy = totalSlots > 0 ? (correctSlots / totalSlots) : 0;
    const speedBonus = gameState.timeRemaining > 0 ? (gameState.timeRemaining / UI_CONSTANTS.SCORE_MULTIPLIER_TIME_FACTOR) : 0;
    const baseScore = totalSlots * UI_CONSTANTS.POINTS_PER_CORRECT_SLOT * accuracy;
    const finalScore = gameState.currentMode === 'scout' ? Math.round(baseScore) : Math.round(baseScore * (1 + speedBonus));
    return { correctSlots, totalSlots, accuracy, finalScore, speedBonus };
}
function renderDebrief(results, timeUp) {
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
            const correctPlayer = m.correct; // {name: "...", rating: ...}
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


// --- SCOUT SCHOOL MODE ---
function startScoutSchool() {
    gameState.currentScoutPhase = 1;
    gameState.scoutPhaseProgress = 0;
    gameState.scoutPhaseCorrect = 0;
    startScoutPhase1();
}

// --- Phase 1 ---
function startScoutPhase1() {
    phase1Team.textContent = `Team: ${gameState.currentTeam}`;
    generatePhase1Question();
    setScreen('scoutPhase1');
}
function generatePhase1Question() {
    phase1Feedback.textContent = '';
    phase1Feedback.className = 'phase-feedback';
    // Get top 15 skaters
    const teamPlayers = gameState.allPlayers.filter(p => p.team_abbr === gameState.currentTeam && ['C', 'L', 'R', 'D'].includes(p.position))
                                       .sort((a, b) => b.rating - a.rating)
                                       .slice(0, 15);
     if (teamPlayers.length < 4) { alert("Not enough players for Scout School."); goToStartScreen(); return; }
    
    const targetPlayerIndex = gameState.scoutPhaseProgress % Math.min(UI_CONSTANTS.PHASE_1_QUESTIONS, teamPlayers.length);
    const targetPlayer = teamPlayers[targetPlayerIndex];

    const card = createPlayerCard(targetPlayer, true); // hideNameForGuessing = true
    phase1CardDisplay.innerHTML = '';
    phase1CardDisplay.appendChild(card);

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
    updatePhaseProgress(1, UI_CONSTANTS.PHASE_1_QUESTIONS);
}
function handlePhase1Answer(isCorrect, button, targetPlayerId) {
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
    updatePhaseProgress(1, UI_CONSTANTS.PHASE_1_QUESTIONS);
    
    if (gameState.scoutPhaseProgress >= UI_CONSTANTS.PHASE_1_QUESTIONS) {
        const accuracy = gameState.scoutPhaseCorrect / UI_CONSTANTS.PHASE_1_QUESTIONS;
        setTimeout(() => showPhaseCompleteScreen(1, accuracy >= UI_CONSTANTS.PHASE_1_MASTERY_ACCURACY), 1500);
    } else {
        setTimeout(generatePhase1Question, 1500);
    }
}

// --- Phase 2 ---
function startScoutPhase2() {
    gameState.scoutPhaseProgress = 0;
    gameState.scoutPhaseCorrect = 0;
    phase2Team.textContent = `Team: ${gameState.currentTeam}`;
    generatePhase2Question();
    setScreen('scoutPhase2');
}

function generatePhase2Question() {
    phase2Feedback.textContent = ''; 
    phase2Feedback.className = 'phase-feedback';
    phase2CardDisplay.innerHTML = '';
    phase2Choices.innerHTML = '';

    const teamData = gameState.lineStructures.find(t => t.team_abbr === gameState.currentTeam);
    if (!teamData || !teamData.lines) {
        alert("No line data found for this team.");
        goToStartScreen();
        return;
    }

    const playerPool = [];
    const linesToQuiz = ['Line 1', 'Line 2', 'Line 3'];

    for (const lineId of linesToQuiz) {
        if (teamData.lines[lineId]) {
            Object.values(teamData.lines[lineId]).forEach(playerInfo => {
                const fullPlayer = gameState.allPlayers.find(p => p.player_name === playerInfo.name);
                if (fullPlayer) {
                    playerPool.push({ player: fullPlayer, correctLine: lineId });
                }
            });
        }
    }

    if (playerPool.length === 0) {
        alert("Not enough line data for Scout School on this team.");
        goToStartScreen();
        return;
    }

    const questionData = playerPool[Math.floor(Math.random() * playerPool.length)];
    const targetPlayer = questionData.player;
    const correctAnswer = questionData.correctLine;

    const card = createPlayerCard(targetPlayer, false); // false = show name
    phase2CardDisplay.appendChild(card);

    gameState.scoutPhaseQuestionData = { correctAnswer };

    const choices = ["Line 1", "Line 2", "Line 3"];
    choices.forEach(lineName => {
        const button = document.createElement('button');
        button.className = 'choice-btn';
        button.textContent = lineName;
        button.onclick = () => handlePhase2Answer(lineName === correctAnswer, button, correctAnswer);
        phase2Choices.appendChild(button);
    });

    updatePhaseProgress(2, UI_CONSTANTS.PHASE_2_QUESTIONS);
}

function handlePhase2Answer(isCorrect, button, correctAnswer) {
    phase2Choices.querySelectorAll('button').forEach(btn => btn.disabled = true);

    if (isCorrect) {
        gameState.scoutPhaseCorrect++;
        phase2Feedback.textContent = 'CORRECT!';
        phase2Feedback.className = 'phase-feedback correct';
        button.classList.add('correct');
    } else {
        phase2Feedback.textContent = `INCORRECT! Player is on ${correctAnswer}`;
        phase2Feedback.className = 'phase-feedback incorrect';
        button.classList.add('incorrect');
        phase2Choices.querySelectorAll('button').forEach(btn => {
            if (btn.textContent === correctAnswer) { btn.classList.add('correct'); }
        });
    }
    
    gameState.scoutPhaseProgress++;
    updatePhaseProgress(2, UI_CONSTANTS.PHASE_2_QUESTIONS);

    if (gameState.scoutPhaseProgress >= UI_CONSTANTS.PHASE_2_QUESTIONS) {
        const accuracy = gameState.scoutPhaseCorrect / UI_CONSTANTS.PHASE_2_QUESTIONS;
        setTimeout(() => showPhaseCompleteScreen(2, accuracy >= UI_CONSTANTS.PHASE_2_MASTERY_ACCURACY), 1500);
    } else {
        setTimeout(generatePhase2Question, 1500);
    }
}

// --- Phase 3 ---
function startScoutPhase3() {
     gameState.currentScoutPhase = 3;
    gameState.userLineup = {};
    gameState.linesToQuiz = 3; // Always 3 lines for mastery
    setupLineupBuilderState();
    renderLineBuilderUI();
    timerContainer.style.display = 'none';
    submitLineupButton.style.display = 'block';
    submitLineupButton.textContent = 'SUBMIT LINEUP';
    submitLineupButton.onclick = handleSubmitLineup;
    setScreen('quiz');
}
function handleSubmitLineup() {
     let allSlotsFilled = true;
     for (const lineId in gameState.userLineup) {
        for (const slotKey in gameState.userLineup[lineId]) {
            if (gameState.userLineup[lineId][slotKey] === null) { allSlotsFilled = false; break; }
        }
        if (!allSlotsFilled) break;
    }
     if (!allSlotsFilled) { alert("Please fill all line slots."); return; }
    
    const results = calculateScore();
    if (results.accuracy === 1) { // 100% needed
        gameState.masteredTeams.add(gameState.currentTeam);
        
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
        saveProgress();
        showPhaseCompleteScreen(3, true);
    } else {
         Object.keys(gameState.userLineup).forEach(lineId => {
            Object.keys(gameState.userLineup[lineId]).forEach(slotKey => {
                const userPlayer = gameState.userLineup[lineId][slotKey];
                const correctPlayer = gameState.correctLineup[lineId][slotKey];
                const slotElement = document.querySelector(`[data-slot-id="${lineId}-${slotKey}"]`);
                if (slotElement) {
                    if (userPlayer && correctPlayer && userPlayer.player_name === correctPlayer.name) {
                        applyFeedback(slotElement, 'correct');
                    } else {
                        applyFeedback(slotElement, 'incorrect');
                    }
                }
            });
         });
         alert(`Lineup incorrect (${results.correctSlots}/${results.totalSlots}). Review placements and try again!`);
    }
}


// --- Phase Completion Screen ---
function showPhaseCompleteScreen(phaseCompleted, passed) {
    teamMasteryBadge.style.display = 'none';
    phaseCompleteTitle.classList.toggle('failed', !passed);
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

// --- *** NEW: DIVISION QUIZ MODE *** ---
function startDivisionQuiz(divisionName) {
    gameState.currentDivisionQuiz = divisionName;
    gameState.scoutPhaseProgress = 0;
    gameState.scoutPhaseCorrect = 0;
    
    divisionQuizTitle.textContent = `DIVISION QUIZ: ${divisionName.toUpperCase()}`;
    divisionQuizExitBtn.onclick = goToStartScreen;
    
    generateDivisionQuizQuestion();
    setScreen('divisionQuiz');
}

function generateDivisionQuizQuestion() {
    // 1. Reset UI
    divisionQuizFeedback.textContent = '';
    divisionQuizFeedback.className = 'phase-feedback';
    divisionQuizCardDisplay.innerHTML = '';
    divisionQuizChoices.innerHTML = '';

    // 2. Get all teams in this division
    const divisionTeams = ALL_DIVISIONS[gameState.currentDivisionQuiz];
    if (!divisionTeams) {
        alert("Error: Could not find division teams.");
        goToStartScreen();
        return;
    }

    // 3. Get all players from all teams in this division (top 15 from each)
    const playerPool = [];
    divisionTeams.forEach(teamAbbr => {
        const teamPlayers = gameState.allPlayers
            .filter(p => p.team_abbr === teamAbbr && ['C', 'L', 'R', 'D'].includes(p.position))
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 15);
        playerPool.push(...teamPlayers);
    });

    if (playerPool.length === 0) {
        alert("Error: No players found for this division.");
        goToStartScreen();
        return;
    }

    // 4. Pick a random player to ask about
    const targetPlayer = playerPool[Math.floor(Math.random() * playerPool.length)];
    const correctAnswer = targetPlayer.team_abbr; // The answer is the team's abbreviation

    // 5. Display the player card (name visible)
    const card = createPlayerCard(targetPlayer, false);
    divisionQuizCardDisplay.appendChild(card);

    // 6. Store correct answer
    gameState.scoutPhaseQuestionData = { correctAnswer };

    // 7. Display choices (all 8 teams in the division)
    divisionQuizChoices.className = 'phase-choices division-quiz-choices'; // Use new class
    divisionTeams.forEach(teamAbbr => {
        const button = document.createElement('button');
        button.className = 'choice-btn';
        button.textContent = teamAbbr;
        button.onclick = () => handleDivisionQuizAnswer(teamAbbr === correctAnswer, button, correctAnswer);
        divisionQuizChoices.appendChild(button);
    });

    // 8. Update progress
    updatePhaseProgress('division-quiz', UI_CONSTANTS.DIVISION_QUIZ_QUESTIONS);
}

function handleDivisionQuizAnswer(isCorrect, button, correctAnswer) {
    divisionQuizChoices.querySelectorAll('button').forEach(btn => btn.disabled = true);

    if (isCorrect) {
        gameState.scoutPhaseCorrect++;
        divisionQuizFeedback.textContent = 'CORRECT!';
        divisionQuizFeedback.className = 'phase-feedback correct';
        button.classList.add('correct');
    } else {
        divisionQuizFeedback.textContent = `INCORRECT! Player is on ${correctAnswer}`;
        divisionQuizFeedback.className = 'phase-feedback incorrect';
        button.classList.add('incorrect');
        divisionQuizChoices.querySelectorAll('button').forEach(btn => {
            if (btn.textContent === correctAnswer) { btn.classList.add('correct'); }
        });
    }

    gameState.scoutPhaseProgress++;
    updatePhaseProgress('division-quiz', UI_CONSTANTS.DIVISION_QUIZ_QUESTIONS);

    if (gameState.scoutPhaseProgress >= UI_CONSTANTS.DIVISION_QUIZ_QUESTIONS) {
        const accuracy = gameState.scoutPhaseCorrect / UI_CONSTANTS.DIVISION_QUIZ_QUESTIONS;
        // Show a simple alert for completion, then go back to start
        setTimeout(() => {
            alert(`Division Quiz Complete!\nScore: ${gameState.scoutPhaseCorrect} / ${UI_CONSTANTS.DIVISION_QUIZ_QUESTIONS} (${accuracy * 100}%)`);
            goToStartScreen();
        }, 1500);
    } else {
        setTimeout(generateDivisionQuizQuestion, 1500);
    }
}
// --- *** END NEW DIVISION QUIZ MODE *** ---


// --- Shared Line Builder UI/Logic ---
function setupLineupBuilderState() {
    const teamData = gameState.lineStructures.find(t => t.team_abbr === gameState.currentTeam);
    if (!teamData) {
        console.error(`No line structure found for ${gameState.currentTeam}`);
        alert(`Error: No line data for ${gameState.currentTeam}. Returning to menu.`);
        goToStartScreen();
        return;
    }
    
    gameState.correctLineup = {};
    gameState.userLineup = {}; 
    
    const lines = (gameState.currentMode === 'scout' && gameState.currentScoutPhase === 3) ? 3 : gameState.linesToQuiz;
    
    for (let i = 1; i <= lines; i++) {
        const lineKey = `Line ${i}`;
        if (teamData.lines[lineKey]) {
            gameState.correctLineup[lineKey] = teamData.lines[lineKey];
            gameState.userLineup[lineKey] = Object.keys(teamData.lines[lineKey]).reduce((acc, slotKey) => { acc[slotKey] = null; return acc; }, {});
        }
    }
}
function renderLineBuilderUI() {
    currentTeamDisplay.textContent = `Team: ${gameState.currentTeam}`;
    lineSlotsContainer.innerHTML = '';
    const linesToRender = (gameState.currentMode === 'scout' && gameState.currentScoutPhase === 3) ? 3 : gameState.linesToQuiz;

    if (Object.keys(gameState.userLineup).length !== linesToRender || !gameState.userLineup[`Line ${linesToRender}`]) {
        setupLineupBuilderState();
        if (Object.keys(gameState.correctLineup).length === 0) return;
    }

    for (let i = 1; i <= linesToRender; i++) {
        const lineId = `Line ${i}`;
        if (!gameState.correctLineup[lineId]) continue;
        
        const lineUnit = document.createElement('div');
        lineUnit.className = 'line-unit';
        lineUnit.innerHTML = `<h4>:: LINE ${i} ::</h4>
                              <div class="line-slots" data-line-id="${lineId}">
                                  ${Object.keys(gameState.correctLineup[lineId]).map(slotId => {
                                      const slotKey = slotId;
                                      let posType;
                                      if (slotKey === 'C') posType = 'C';
                                      else if (slotKey.includes('W')) posType = 'W';
                                      else if (slotKey.includes('D')) posType = 'D';
                                      else posType = slotKey.slice(0, 1).toUpperCase();

                                      return `
                                      <div class="line-slot" data-slot-id="${lineId}-${slotId}" data-position-type="${posType}">
                                          <div class="line-slot-label">${slotId}</div>
                                          ${renderPlayerInSlot(gameState.userLineup[lineId]?.[slotId])}
                                      </div>`;
                                  }).join('')}
                              </div>`;
        lineSlotsContainer.appendChild(lineUnit);
    }

    playerPool.innerHTML = '';
    const allTeamPlayers = gameState.allPlayers.filter(p => p.team_abbr === gameState.currentTeam && ['C', 'L', 'R', 'D'].includes(p.position))
                                          .sort((a, b) => b.rating - a.rating);
    const playersNeededCount = linesToRender * 5; 
    const playersInSlots = new Set();
    Object.values(gameState.userLineup).forEach(line => { 
        Object.values(line || {}).forEach(player => { 
            if (player) playersInSlots.add(player.id); 
        }); 
    });

    let poolCandidates = allTeamPlayers.slice(0, playersNeededCount + 7);

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
    
    poolCandidates = poolCandidates.filter((p, i, self) => i === self.findIndex(pl => pl.id === p.id));
    const finalPoolPlayers = poolCandidates.filter(p => !playersInSlots.has(p.id));
    finalPoolPlayers.forEach(player => { 
        playerPool.appendChild(createPlayerCard(player, false)); 
    });
    
    poolCount.textContent = finalPoolPlayers.length;
    attachDragDropListeners();
}
function renderPlayerInSlot(player) {
     if (!player) return '';
     const card = createPlayerCard(player, false); // Name Visible
     return card.outerHTML;
}

// --- Drag and Drop Handlers ---
function handleDragStart(e) {
    if (!gameState.quizActive && !(gameState.currentMode === 'scout' && gameState.currentScoutPhase === 3)) return;
    
    e.dataTransfer.setData('text/plain', e.target.dataset.playerId);
    e.target.classList.add('dragging');
    
    const slot = e.target.closest('.line-slot');
    if (slot) {
        const [lineId, slotKey] = slot.dataset.slotId.split('-');
         if (gameState.userLineup[lineId]) { gameState.userLineup[lineId][slotKey] = null; }
        slot.classList.remove('feedback-correct', 'feedback-warning', 'feedback-incorrect');
    }
}
function handleDragOver(e) {
    e.preventDefault();
    if (!gameState.quizActive && !(gameState.currentMode === 'scout' && gameState.currentScoutPhase === 3)) return;
    e.currentTarget.classList.add('drag-over');
}
function handleDragLeave(e) {
    if (!gameState.quizActive && !(gameState.currentMode === 'scout' && gameState.currentScoutPhase === 3)) return;
    e.currentTarget.classList.remove('drag-over');
}
function handleDrop(e) {
    e.preventDefault();
    if (!gameState.quizActive && !(gameState.currentMode === 'scout' && gameState.currentScoutPhase === 3)) return;
    
    const slot = e.currentTarget;
    const playerId = e.dataTransfer.getData('text/plain');
    const draggedCard = document.querySelector(`.player-card[data-player-id="${playerId}"]`);
    
    if (!draggedCard) return;
    
    const playerPosition = draggedCard.dataset.position; 
    const slotType = slot.dataset.positionType;
    
    slot.classList.remove('drag-over');
    draggedCard.classList.remove('dragging');

    const isPositionValid =
        (slotType === 'C' && playerPosition === 'C') ||
        (slotType === 'W' && ['L', 'R', 'C'].includes(playerPosition)) || 
        (slotType === 'D' && playerPosition === 'D');

    if (!isPositionValid) {
        if (gameState.currentMode === 'scout') {
            applyFeedback(slot, 'incorrect'); 
        }
        else if (!draggedCard.closest('.line-slot')) {
             draggedCard.classList.add('incorrect-flash');
             setTimeout(() => draggedCard.classList.remove('incorrect-flash'), UI_CONSTANTS.FEEDBACK_DURATION);
        }
        return;
    }
    
    if (slot.children.length > 1) { 
        const existingCard = slot.querySelector('.player-card');
        if (existingCard) {
            playerPool.appendChild(existingCard); 
        }
    }
    
    slot.appendChild(draggedCard); 
    
    const [lineId, slotKey] = slot.dataset.slotId.split('-');
    const player = gameState.allPlayers.find(p => p.id === playerId);
     if (gameState.userLineup[lineId]) { gameState.userLineup[lineId][slotKey] = player; }
    
    if (gameState.currentMode === 'scout' && gameState.currentScoutPhase === 3) {
        const correctPlayerForSlot = gameState.correctLineup[lineId]?.[slotKey];
        if (correctPlayerForSlot && player.player_name === correctPlayerForSlot.name) {
            applyFeedback(slot, 'correct');
        } else {
            applyFeedback(slot, 'incorrect');
        }
    }
    
    if (gameState.currentMode === 'quiz') { checkQuizCompletion(); }
}
function handleCardClick(e) {
     if (e.currentTarget.closest('#phase-1-card-display') || e.currentTarget.closest('#phase-2-card-display') || e.currentTarget.closest('#division-quiz-card-display')) { return; }
     
     if (!gameState.quizActive && !(gameState.currentMode === 'scout' && gameState.currentScoutPhase === 3)) return;
    
    const card = e.currentTarget;
    const slot = card.closest('.line-slot');
    
    if (slot) {
        playerPool.appendChild(card);
        const [lineId, slotKey] = slot.dataset.slotId.split('-');
         if (gameState.userLineup[lineId]) { gameState.userLineup[lineId][slotKey] = null; }
        slot.classList.remove('feedback-correct', 'feedback-warning', 'feedback-incorrect');
    }
}
function attachDragDropListeners() {
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
function applyFeedback(element, type) {
    element.classList.remove('feedback-correct', 'feedback-warning', 'feedback-incorrect');
    element.classList.add(`feedback-${type}`);
    setTimeout(() => { element.classList.remove(`feedback-${type}`); }, UI_CONSTANTS.FEEDBACK_DURATION + 1000); 
}


// --- Helpers & Local Storage ---
function updatePhaseProgress(phase, totalQuestions) {
     const progressElement = document.getElementById(`phase-${phase}-progress`) || document.getElementById('division-quiz-progress');
     if (progressElement) { 
         progressElement.textContent = `Progress: ${gameState.scoutPhaseProgress} / ${totalQuestions} | Correct: ${gameState.scoutPhaseCorrect}`; 
    }
}
function goToStartScreen() {
     gameState.currentScoutPhase = 0; 
     gameState.quizActive = false;
     gameState.currentDivisionQuiz = null;
     clearInterval(gameState.timer);
     updateStartScreenUI(); 
     updateDivisionMasteryUI(); // Check for new division quizzes
     setScreen('start');
}

// --- NEW: Check for mastered divisions and show buttons ---
function updateDivisionMasteryUI() {
    divisionQuizButtons.innerHTML = ''; // Clear old buttons
    let unlockedCount = 0;

    for (const [divisionName, teamAbbrs] of Object.entries(ALL_DIVISIONS)) {
        // Check if every team in this division is in the masteredTeams set
        const isMastered = teamAbbrs.every(team => gameState.masteredTeams.has(team));
        
        if (isMastered) {
            unlockedCount++;
            const button = document.createElement('button');
            button.className = 'action-btn division-quiz-btn';
            button.textContent = `START ${divisionName.toUpperCase()} QUIZ`;
            button.onclick = () => startDivisionQuiz(divisionName);
            divisionQuizButtons.appendChild(button);
        }
    }

    // Show/hide placeholder text
    divisionMasteryPlaceholder.style.display = (unlockedCount === 0) ? 'block' : 'none';
}

function saveProgress() {
     try {
         const progress = {
             masteredTeams: Array.from(gameState.masteredTeams),
             unlockedTeams: Array.from(gameState.unlockedTeams),
             favoriteTeam: gameState.favoriteTeam
         };
         localStorage.setItem('scoutSchoolProgress', JSON.stringify(progress));
     } catch (e) { console.warn("Could not save progress:", e); }
}
function loadProgress() {
    try {
        const savedProgress = localStorage.getItem('scoutSchoolProgress');
        let initialFavorite = gameState.lineStructures.length > 0 ? gameState.lineStructures[0].team_abbr : 'ANA';
        let initialUnlocked = [initialFavorite];

        if (savedProgress) {
            const progress = JSON.parse(savedProgress);
            gameState.masteredTeams = new Set(progress.masteredTeams || []);
            gameState.favoriteTeam = progress.favoriteTeam || initialFavorite;
            gameState.unlockedTeams = [...new Set([gameState.favoriteTeam, ...(progress.unlockedTeams || initialUnlocked)])].sort();
        } else {
             gameState.masteredTeams = new Set();
             gameState.favoriteTeam = initialFavorite;
             gameState.unlockedTeams = [initialFavorite];
             saveProgress(); 
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