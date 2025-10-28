const UI_CONSTANTS = {
    TIMER_SECONDS: 60,
    POINTS_PER_CORRECT_SLOT: 10,
    SCORE_MULTIPLIER_TIME_FACTOR: 60,
    FEEDBACK_DURATION: 500, // ms for feedback flash/pulse
    // Scout School Constants
    PHASE_1_QUESTIONS: 10,
    PHASE_1_MASTERY_ACCURACY: 0.8, // 80%
    PHASE_2_QUESTIONS: 10,
    PHASE_2_MASTERY_ACCURACY: 0.9, // 90%
};

// --- Global State Variables ---
let gameState = {
    // Shared state
    allPlayers: [],
    lineStructures: [],
    currentTeam: null,
    linesToQuiz: 2, // Used for both modes
    // Mode specific
    currentMode: 'quiz', // 'quiz' or 'scout'
    quizActive: false,
    timer: null,
    timeRemaining: 0,
    userLineup: {}, // Used for quiz and phase 3
    mistakes: [], // Used for quiz debrief
    // Scout School state
    currentScoutPhase: 0, // 1, 2, or 3
    scoutPhaseProgress: 0,
    scoutPhaseCorrect: 0,
    scoutPhaseQuestionData: null, // Holds data for current phase question
    masteredTeams: new Set(), // Store mastered team abbreviations
    unlockedTeams: ['ANA'], // Start with one unlocked team
};

// --- DOM Element Selection ---
const screens = {
    start: document.getElementById('start-screen'),
    quiz: document.getElementById('quiz-screen'), // Used for Quiz Mode & Scout Phase 3
    debrief: document.getElementById('debrief-screen'), // Used for Quiz Mode results
    scoutPhase1: document.getElementById('scout-phase-1-screen'),
    scoutPhase2: document.getElementById('scout-phase-2-screen'),
    phaseComplete: document.getElementById('phase-complete-screen'),
};
const modeRadios = document.querySelectorAll('input[name="game-mode"]');
const teamSelect = document.getElementById('team-select');
const lineOptionsButtons = document.querySelectorAll('.line-options .line-btn');
const linesToBuildSection = document.getElementById('lines-to-build-section');
const startButton = document.getElementById('start-shift-btn');
const scoutModeInfo = document.getElementById('scout-mode-info');
// Quiz Screen Elements
const timerContainer = document.querySelector('.timer-bar-container');
const timerBar = document.getElementById('timer-bar');
const timerText = document.getElementById('timer-text');
const currentTeamDisplay = document.getElementById('current-team-display');
const lineSlotsContainer = document.getElementById('line-slots-container');
const playerPoolArea = document.querySelector('.player-pool-area');
const playerPool = document.getElementById('player-pool');
const poolCount = document.getElementById('pool-count');
const submitLineupButton = document.getElementById('submit-lineup-btn'); // For Scout Phase 3
// Phase 1 Elements
const phase1Team = document.getElementById('scout-phase-1-team');
const phase1CardDisplay = document.getElementById('phase-1-card-display');
const phase1Choices = document.getElementById('phase-1-choices');
const phase1Feedback = document.getElementById('phase-1-feedback');
const phase1Progress = document.getElementById('phase-1-progress');
// Phase 2 Elements
const phase2Team = document.getElementById('scout-phase-2-team');
const phase2PlayerA = document.getElementById('phase-2-player-A');
const phase2PlayerB = document.getElementById('phase-2-player-B');
const phase2Feedback = document.getElementById('phase-2-feedback');
const phase2Progress = document.getElementById('phase-2-progress');
// Phase Complete Elements
const phaseCompleteTitle = document.getElementById('phase-complete-title');
const phaseCompleteMessage = document.getElementById('phase-complete-message');
const nextPhaseButton = document.getElementById('next-phase-btn');
const teamMasteryBadge = document.getElementById('team-mastery-badge');
const masteredTeamName = document.getElementById('mastered-team-name');
// Debrief Elements (Quiz Mode)
const timeBonusDisplay = document.getElementById('time-bonus-display');
const debriefTimeBonus = document.getElementById('debrief-time-bonus');
const debriefAccuracy = document.getElementById('debrief-accuracy');
const debriefPoints = document.getElementById('debrief-points');
const mistakeList = document.getElementById('mistake-review-list');
const nextShiftButton = document.getElementById('next-shift-btn'); // Quiz Debrief button

// --- Utility Functions ---

function setScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
    } else {
        console.error("Screen not found:", screenName);
    }
     // Add/Remove body classes based on mode for styling hooks
     document.body.classList.toggle('learning-mode', gameState.currentMode === 'scout');
     screens.quiz.classList.toggle('learning-mode', gameState.currentMode === 'scout');
     screens.debrief.classList.toggle('learning-mode', gameState.currentMode === 'scout');
}

// Fisher-Yates Shuffle
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
        const playersResponse = await fetch('nhl_players.json');
        if (!playersResponse.ok) throw new Error('Failed to load nhl_players.json');
        gameState.allPlayers = await playersResponse.json();

        const linesResponse = await fetch('team_line_structures.json');
        if (!linesResponse.ok) throw new Error('Failed to load team_line_structures.json');
        gameState.lineStructures = await linesResponse.json();

        // Load progress from localStorage (Optional)
        loadProgress();

        initializeStartScreen();
        setScreen('start');
    } catch (error) {
        console.error("Data loading error:", error);
        alert("Error loading game data. Check console.");
    }
}

function initializeStartScreen() {
    // Mode Selection Logic
    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            gameState.currentMode = e.target.value;
            updateStartScreenUI();
        });
    });

    // Team Select Logic (updated for unlocks)
    teamSelect.addEventListener('change', (e) => gameState.currentTeam = e.target.value);

    // Line Options Logic
    lineOptionsButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            lineOptionsButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            gameState.linesToQuiz = parseInt(e.target.dataset.lines);
        });
    });

    // Start Button Logic
    startButton.addEventListener('click', startGame);

    // Initial UI setup
    updateStartScreenUI();
}

function updateStartScreenUI() {
    const isScoutMode = gameState.currentMode === 'scout';
    linesToBuildSection.style.display = isScoutMode ? 'none' : 'block'; // Hide lines choice in Scout mode start
    scoutModeInfo.style.display = isScoutMode ? 'block' : 'none';

    // Populate Team Dropdown based on mode
    const teamsToShow = isScoutMode ? gameState.unlockedTeams : gameState.lineStructures.map(t => t.team_abbr).sort();
    teamSelect.innerHTML = ''; // Clear existing options
    teamsToShow.forEach(team => {
        const option = document.createElement('option');
        option.value = team;
        option.textContent = team;
        teamSelect.appendChild(option);
    });

    // Set default team selection
    gameState.currentTeam = teamsToShow[0] || null;
    if (teamSelect.options.length > 0) {
        teamSelect.value = gameState.currentTeam;
    }
}


// --- Game Start Logic ---

function startGame() {
    if (!gameState.currentTeam) return alert("Please select a team.");

    if (gameState.currentMode === 'quiz') {
        startQuizMode();
    } else {
        startScoutSchool();
    }
}

// --- QUIZ MODE ---

function startQuizMode() {
    gameState.quizActive = true;
    gameState.timeRemaining = UI_CONSTANTS.TIMER_SECONDS;
    gameState.userLineup = {};
    gameState.mistakes = [];

    setupLineupBuilderState(); // Setup correct lineup based on team/linesToQuiz
    renderLineBuilderUI(); // Render slots and pool
    timerContainer.style.display = 'block'; // Show timer
    submitLineupButton.style.display = 'none'; // Hide submit button
    startTimer();
    setScreen('quiz');
}

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
     const timeRatio = Math.max(0, gameState.timeRemaining / UI_CONSTANTS.TIMER_SECONDS);
    timerBar.style.width = `${timeRatio * 100}%`;
    timerText.textContent = `${gameState.timeRemaining}:00`;
    timerBar.style.backgroundColor = gameState.timeRemaining <= 10 ? 'var(--color-error-red)' : 'var(--color-accent-cyan)';
    timerBar.style.boxShadow = `0 0 10px ${gameState.timeRemaining <= 10 ? 'var(--color-error-red)' : 'var(--color-accent-cyan)'}`;
}

function checkQuizCompletion() {
    // Only automatically end quiz if NOT in learning mode
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
            endQuiz(false); // Completed by filling slots
        }
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
    // Score calculation logic (remains mostly the same as before)
     let correctSlots = 0;
    let totalSlots = 0;
    const mistakes = []; // Reset mistakes for this calculation

    for (const lineId in gameState.correctLineup) {
        for (const slotKey in gameState.correctLineup[lineId]) {
            totalSlots++;
            const correctPlayer = gameState.correctLineup[lineId][slotKey];
            const userPlayer = gameState.userLineup[lineId][slotKey];

            if (userPlayer && correctPlayer && userPlayer.player_name === correctPlayer.name) {
                correctSlots++;
            } else {
                mistakes.push({ lineId, slotKey, user: userPlayer, correct: correctPlayer });
            }
        }
    }
    // Don't overwrite gameState.mistakes if in learning mode
    if (gameState.currentMode === 'quiz') {
         gameState.mistakes = mistakes;
    }


    const accuracy = totalSlots > 0 ? (correctSlots / totalSlots) : 0;
    const speedBonus = gameState.timeRemaining > 0 ? (gameState.timeRemaining / UI_CONSTANTS.SCORE_MULTIPLIER_TIME_FACTOR) : 0;
    const baseScore = totalSlots * UI_CONSTANTS.POINTS_PER_CORRECT_SLOT * accuracy;
     // No speed bonus in learning mode score calculation
    const finalScore = gameState.currentMode === 'scout' ? Math.round(baseScore) : Math.round(baseScore * (1 + speedBonus));


    return { correctSlots, totalSlots, accuracy, finalScore, speedBonus };
}

function renderDebrief(results, timeUp) {
    // Debrief rendering logic (remains mostly the same)
     document.getElementById('debrief-title').textContent = timeUp
        ? "DEBRIEF SCREEN: TIME OVERRUN"
        : "DEBRIEF SCREEN: LINEUP VERIFIED";

    const accuracyPct = (results.accuracy * 100).toFixed(0);

    // Hide time bonus display if in learning mode (or based on results.speedBonus)
    timeBonusDisplay.style.display = gameState.currentMode === 'scout' ? 'none' : 'block';
    debriefTimeBonus.textContent = `${results.speedBonus.toFixed(2)}x`;
    debriefAccuracy.textContent = `${accuracyPct}% (${results.correctSlots}/${results.totalSlots})`;
    debriefPoints.textContent = results.finalScore;

    mistakeList.innerHTML = ''; // Clear previous mistakes

    if (gameState.mistakes.length === 0) {
        mistakeList.innerHTML = '<p class="review-placeholder">No errors detected.</p>';
    } else {
        gameState.mistakes.forEach(m => {
            const userPlayerName = m.user ? m.user.player_name : "EMPTY SLOT";
            const correctPlayer = m.correct;
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

// --- SCOUT SCHOOL MODE ---

function startScoutSchool() {
    gameState.currentScoutPhase = 1;
    gameState.scoutPhaseProgress = 0;
    gameState.scoutPhaseCorrect = 0;
    startScoutPhase1();
}

// --- Scout Phase 1: Identification ---
function startScoutPhase1() {
    phase1Team.textContent = `Team: ${gameState.currentTeam}`;
    generatePhase1Question();
    setScreen('scoutPhase1');
}

function generatePhase1Question() {
    phase1Feedback.textContent = ''; // Clear feedback
    phase1Feedback.className = 'phase-feedback'; // Reset feedback class

    // Get ~15 top players for the current team
    const teamPlayers = gameState.allPlayers.filter(p => p.team_abbr === gameState.currentTeam)
                                       .sort((a, b) => b.rating - a.rating)
                                       .slice(0, 15);
    if (teamPlayers.length < 4) {
         alert("Not enough player data for this team to run Phase 1.");
         goToStartScreen();
         return;
     }

    // Select the target player
    const targetPlayer = teamPlayers[gameState.scoutPhaseProgress % teamPlayers.length]; // Cycle through players

    // Create the card (without name)
    const card = createPlayerCard(targetPlayer, true); // Pass 'true' to hide name
    phase1CardDisplay.innerHTML = ''; // Clear previous card
    phase1CardDisplay.appendChild(card);

    // Get 3 incorrect names (distractors)
    const distractors = shuffleArray(teamPlayers.filter(p => p.id !== targetPlayer.id)).slice(0, 3);
    const choices = shuffleArray([targetPlayer, ...distractors]);

    // Render choices
    phase1Choices.innerHTML = '';
    choices.forEach(player => {
        const button = document.createElement('button');
        button.className = 'choice-btn';
        button.textContent = player.player_name;
        button.onclick = () => handlePhase1Answer(player.id === targetPlayer.id, button, targetPlayer.id);
        phase1Choices.appendChild(button);
    });

    gameState.scoutPhaseQuestionData = { targetPlayerId: targetPlayer.id };
    updatePhaseProgress(1); // Update progress display
}

function handlePhase1Answer(isCorrect, button, targetPlayerId) {
     // Disable buttons after answer
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
        // Highlight the correct button
        phase1Choices.querySelectorAll('button').forEach(btn => {
             const btnPlayerName = btn.textContent;
             const targetName = gameState.allPlayers.find(p=>p.id === targetPlayerId)?.player_name;
             if (btnPlayerName === targetName) {
                 btn.classList.add('correct'); // Show the right answer
             }
         });
    }

    gameState.scoutPhaseProgress++;

    // Check for phase completion
    if (gameState.scoutPhaseProgress >= UI_CONSTANTS.PHASE_1_QUESTIONS) {
        const accuracy = gameState.scoutPhaseCorrect / UI_CONSTANTS.PHASE_1_QUESTIONS;
        if (accuracy >= UI_CONSTANTS.PHASE_1_MASTERY_ACCURACY) {
            setTimeout(() => showPhaseCompleteScreen(1, true), 1500); // Proceed
        } else {
             setTimeout(() => showPhaseCompleteScreen(1, false), 1500); // Repeat needed
        }
    } else {
        setTimeout(generatePhase1Question, 1500); // Next question after delay
    }
}


// --- Scout Phase 2: Evaluation ---
function startScoutPhase2() {
    gameState.scoutPhaseProgress = 0; // Reset progress for phase 2
    gameState.scoutPhaseCorrect = 0;
    phase2Team.textContent = `Team: ${gameState.currentTeam}`;
    generatePhase2Question();
    setScreen('scoutPhase2');
}

function generatePhase2Question() {
    phase2Feedback.textContent = '';
    phase2Feedback.className = 'phase-feedback';
    phase2PlayerA.innerHTML = ''; // Clear previous cards
    phase2PlayerB.innerHTML = '';
    phase2PlayerA.onclick = null; // Remove old listeners
    phase2PlayerB.onclick = null;

    // Get ~15 top players
    const teamPlayers = gameState.allPlayers.filter(p => p.team_abbr === gameState.currentTeam)
                                       .sort((a, b) => b.rating - a.rating)
                                       .slice(0, 15);
     if (teamPlayers.length < 2) {
         alert("Not enough player data for this team to run Phase 2.");
         goToStartScreen();
         return;
     }

    // Select two different players ensuring ratings aren't identical if possible
    let playerA, playerB;
     let attempts = 0;
     do {
         const shuffledPlayers = shuffleArray([...teamPlayers]);
         playerA = shuffledPlayers[0];
         playerB = shuffledPlayers[1];
         attempts++;
     } while (playerA.rating === playerB.rating && attempts < 10 && teamPlayers.length > 2); // Try to avoid ties


    // Create and display cards (with names visible)
    phase2PlayerA.appendChild(createPlayerCard(playerA));
    phase2PlayerB.appendChild(createPlayerCard(playerB));

    // Store correct answer and attach listeners
    const higherRatedPlayerId = playerA.rating >= playerB.rating ? playerA.id : playerB.id;
    gameState.scoutPhaseQuestionData = { higherRatedPlayerId };

    phase2PlayerA.onclick = () => handlePhase2Answer(playerA.id === higherRatedPlayerId, phase2PlayerA);
    phase2PlayerB.onclick = () => handlePhase2Answer(playerB.id === higherRatedPlayerId, phase2PlayerB);

    updatePhaseProgress(2);
}

function handlePhase2Answer(isCorrect, selectedCardElement) {
    phase2PlayerA.onclick = null; // Disable further clicks
    phase2PlayerB.onclick = null;

    if (isCorrect) {
        gameState.scoutPhaseCorrect++;
        phase2Feedback.textContent = 'CORRECT!';
        phase2Feedback.className = 'phase-feedback correct';
        selectedCardElement.style.borderColor = '#39FF14'; // Simple green border feedback
    } else {
        phase2Feedback.textContent = 'INCORRECT!';
        phase2Feedback.className = 'phase-feedback incorrect';
        selectedCardElement.style.borderColor = 'var(--color-error-red)'; // Red border feedback

        // Highlight the correct card
        const correctCard = (phase2PlayerA.querySelector(`[data-player-id="${gameState.scoutPhaseQuestionData.higherRatedPlayerId}"]`)) ? phase2PlayerA : phase2PlayerB;
         if (correctCard !== selectedCardElement) { // Don't re-highlight if they clicked wrong one
             correctCard.style.borderColor = '#39FF14';
         }
    }
     // Reset border styles after a delay
     setTimeout(() => {
         phase2PlayerA.style.borderColor = 'transparent';
         phase2PlayerB.style.borderColor = 'transparent';
     }, UI_CONSTANTS.FEEDBACK_DURATION * 2);

    gameState.scoutPhaseProgress++;

    // Check for phase completion
    if (gameState.scoutPhaseProgress >= UI_CONSTANTS.PHASE_2_QUESTIONS) {
        const accuracy = gameState.scoutPhaseCorrect / UI_CONSTANTS.PHASE_2_QUESTIONS;
        if (accuracy >= UI_CONSTANTS.PHASE_2_MASTERY_ACCURACY) {
             setTimeout(() => showPhaseCompleteScreen(2, true), 1500); // Proceed
        } else {
             setTimeout(() => showPhaseCompleteScreen(2, false), 1500); // Repeat needed
        }
    } else {
        setTimeout(generatePhase2Question, 1500); // Next question
    }
}


// --- Scout Phase 3: Line Construction Practicum ---
function startScoutPhase3() {
    gameState.scoutPhaseProgress = 0; // Reset needed? Maybe not for phase 3.
    gameState.scoutPhaseCorrect = 0; // Not used for accuracy here.
    gameState.userLineup = {}; // Reset user lineup
    gameState.linesToQuiz = 3; // Default to 3 lines for learning, could make optional later

    setupLineupBuilderState(); // Setup correct lineup based on team/linesToQuiz
    renderLineBuilderUI(); // Render slots and pool
    timerContainer.style.display = 'none'; // Hide timer
    submitLineupButton.style.display = 'block'; // Show Submit button
    submitLineupButton.textContent = 'SUBMIT LINEUP';
    submitLineupButton.onclick = handleSubmitLineup; // Assign submit handler
    setScreen('quiz'); // Reuse the quiz screen layout
}

function handleSubmitLineup() {
    // Check if all slots are filled first
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

    // Calculate accuracy (reusing calculateScore logic)
    const results = calculateScore(); // Uses gameState.userLineup and gameState.correctLineup

    // Check for mastery (100% accuracy required for Phase 3)
    if (results.accuracy === 1) {
        // Mark team as mastered
        gameState.masteredTeams.add(gameState.currentTeam);
        // Unlock next team (simple example: find next unmastered team alphabetically)
        const allTeams = gameState.lineStructures.map(t => t.team_abbr).sort();
        const currentIndex = allTeams.indexOf(gameState.currentTeam);
        if (currentIndex < allTeams.length - 1) {
            const nextTeam = allTeams[currentIndex + 1];
            if (!gameState.masteredTeams.has(nextTeam)) {
                 gameState.unlockedTeams.push(nextTeam);
                 // Ensure no duplicates if logic changes
                 gameState.unlockedTeams = [...new Set(gameState.unlockedTeams)];
            }
        }
        saveProgress(); // Save mastery and unlocks
        showPhaseCompleteScreen(3, true); // Show mastery screen
    } else {
         // Show feedback indicating errors, prompt to try again or review
         alert(`Lineup incorrect (${results.correctSlots}/${results.totalSlots}). Review placements and try again!`);
         // Optionally, could highlight incorrect slots here, but instant feedback is primary.
    }
}


// --- Phase Completion Screen ---

function showPhaseCompleteScreen(phaseCompleted, passed) {
    teamMasteryBadge.style.display = 'none'; // Hide badge initially

    if (passed) {
        phaseCompleteTitle.textContent = `PHASE ${phaseCompleted} COMPLETE!`;
        phaseCompleteTitle.style.color = '#39FF14'; // Green
        nextPhaseButton.style.display = 'block'; // Show continue button

        if (phaseCompleted < 3) {
            phaseCompleteMessage.textContent = `Excellent work, scout. Prepare for Phase ${phaseCompleted + 1}.`;
            nextPhaseButton.onclick = () => {
                if (phaseCompleted === 1) startScoutPhase2();
                if (phaseCompleted === 2) startScoutPhase3();
            };
        } else { // Phase 3 completed (Team Mastered)
            phaseCompleteMessage.textContent = `You've mastered the ${gameState.currentTeam} roster!`;
            nextPhaseButton.textContent = 'RETURN TO MENU';
            nextPhaseButton.onclick = goToStartScreen; // Go back to start
            // Show mastery badge
            teamMasteryBadge.style.display = 'block';
            masteredTeamName.textContent = gameState.currentTeam;
        }
    } else { // Failed phase mastery
        phaseCompleteTitle.textContent = `PHASE ${phaseCompleted} FAILED`;
        phaseCompleteTitle.style.color = 'var(--color-error-red)'; // Red
        phaseCompleteMessage.textContent = `Accuracy requirement not met. Drill needs repeating.`;
        nextPhaseButton.textContent = 'RETRY PHASE';
        nextPhaseButton.onclick = () => {
             // Restart the failed phase
             gameState.scoutPhaseProgress = 0;
             gameState.scoutPhaseCorrect = 0;
             if (phaseCompleted === 1) startScoutPhase1();
             if (phaseCompleted === 2) startScoutPhase2();
             // Phase 3 failure is handled by the submit button alert, maybe return to quiz screen?
              if (phaseCompleted === 3) startScoutPhase3(); // Or simply stay on the screen
        };
    }
    setScreen('phaseComplete');
}

// --- Shared Line Builder UI and Logic (Used by Quiz & Phase 3) ---

function setupLineupBuilderState() {
    const teamData = gameState.lineStructures.find(t => t.team_abbr === gameState.currentTeam);
    if (!teamData) return;

    gameState.correctLineup = {};
    const lines = gameState.currentMode === 'scout' ? 3 : gameState.linesToQuiz; // Force 3 lines for Scout Phase 3 learning

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

function renderLineBuilderUI() {
    currentTeamDisplay.textContent = `Team: **${gameState.currentTeam}**`;

    // Render Line Slots
    lineSlotsContainer.innerHTML = '';
    for (const lineId in gameState.correctLineup) {
        const lineNum = lineId.split(' ')[1]; // Get number like "1", "2", "3"
        const lineUnit = document.createElement('div');
        lineUnit.className = 'line-unit';
        lineUnit.innerHTML = `
            <h4>:: LINE ${lineNum} ::</h4>
            <div class="line-slots" data-line-id="${lineId}">
                ${Object.keys(gameState.correctLineup[lineId]).map(slotId => `
                    <div class="line-slot" data-slot-id="${lineId}-${slotId}" data-position-type="${slotId.slice(0, 1).toUpperCase()}">
                        <div class="line-slot-label">${slotId}</div>
                        ${renderPlayerInSlot(gameState.userLineup[lineId]?.[slotId]) /* Render existing player if any */}
                    </div>
                `).join('')}
            </div>
        `;
        lineSlotsContainer.appendChild(lineUnit);
    }

    // Render Player Pool
    playerPool.innerHTML = '';
     // Get all players for the team, filter positions, sort by rating
     const allTeamPlayers = gameState.allPlayers.filter(p => p.team_abbr === gameState.currentTeam && ['C', 'L', 'R', 'D'].includes(p.position))
                                           .sort((a, b) => b.rating - a.rating);

    // Determine players needed based on correct lineup (e.g., 3 lines * 5 slots = 15)
    const playersInCorrectLines = new Set();
    Object.values(gameState.correctLineup).forEach(line => {
        Object.values(line).forEach(player => {
            if (player) playersInCorrectLines.add(player.name);
        });
    });

    const lines = gameState.currentMode === 'scout' ? 3 : gameState.linesToQuiz;
    const playersNeededCount = lines * 5;


    // Filter pool: include needed players not yet placed + extras
    const playersInSlots = new Set();
     Object.values(gameState.userLineup).forEach(line => {
         Object.values(line).forEach(player => {
             if (player) playersInSlots.add(player.id);
         });
     });

    // Take top N players, add some extras, ensure needed ones are available if not placed
    let poolCandidates = allTeamPlayers.slice(0, playersNeededCount + 5);

    // Ensure all players required for the correct lineup are at least available if not placed
    Object.values(gameState.correctLineup).forEach(line => {
        Object.values(line).forEach(correctPlayer => {
            if (correctPlayer && !poolCandidates.some(p => p.player_name === correctPlayer.name)) {
                const fullPlayer = allTeamPlayers.find(p => p.player_name === correctPlayer.name);
                if (fullPlayer) poolCandidates.push(fullPlayer);
            }
        });
    });
    // Remove duplicates
    poolCandidates = poolCandidates.filter((player, index, self) =>
        index === self.findIndex((p) => p.id === player.id)
    );


    const finalPoolPlayers = poolCandidates.filter(p => !playersInSlots.has(p.id));


    finalPoolPlayers.forEach(player => {
        const card = createPlayerCard(player);
        playerPool.appendChild(card);
    });
    poolCount.textContent = finalPoolPlayers.length;


    attachDragDropListeners(); // Reattach listeners after rendering
}

function renderPlayerInSlot(player) {
    if (!player) return '';
    // Create a card element string to insert
     // Note: We might need to adjust createPlayerCard to return the element, not just add listeners
     const card = createPlayerCard(player); // Assuming this returns the DOM element now
     return card.outerHTML; // Convert element to string for insertion
}

// --- Player Card Creation (Modified for Scout Mode Hiding) ---
function createPlayerCard(player, hideName = false) { // Added hideName flag
    const card = document.createElement('div');
    card.className = 'player-card';
    card.setAttribute('draggable', true);
    card.dataset.playerId = player.id;
    card.dataset.position = player.position; // Store actual position

    const displayName = hideName ? `Player #${player.jersey_number || 'XX'}` : player.player_name;
    const jerseyDisplay = hideName ? "" : `<span class="jersey-number">#${player.jersey_number || 'XX'}</span>`; // Hide jersey if name is hidden

    // Decide which details to show based on hideName
    let detailsHTML = '';
    if (hideName) {
        // Show identifying details EXCEPT name for Phase 1
         detailsHTML = `
            <span>POS: ${player.position}</span>
             <span>AGE: ${player.age || '?'}</span>
             <span>HT: ${player.height || '?'}</span>`;
    } else {
        // Show Age and Height for Phase 2/3/Quiz
         detailsHTML = `
             <span>AGE: ${player.age || '?'}</span>
             <span>HT: ${player.height || '?'}</span>`;
    }


    card.innerHTML = `
        <div class="card-header">
             <span class="player-name">${displayName}</span>
             ${jerseyDisplay}
        </div>
        <div class="card-details">
           ${detailsHTML}
        </div>
        <div class="card-footer rating-tag">
            RATING: ${player.rating}
        </div>
    `;

    card.addEventListener('dragstart', handleDragStart);
    // Only allow clicking back to pool if NOT in identification phase card display
    if (!hideName) {
        card.addEventListener('click', handleCardClick);
    }
    return card; // Return the element itself
}


// --- Drag and Drop Handlers (Modified for Phase 3 Feedback) ---

function handleDragStart(e) {
     if (!gameState.quizActive && gameState.currentMode !== 'scout') return; // Allow drag in scout mode phase 3
    e.dataTransfer.setData('text/plain', e.target.dataset.playerId);
    e.target.classList.add('dragging');
    const slot = e.target.closest('.line-slot');
    if (slot) {
        const [lineId, slotKey] = slot.dataset.slotId.split('-');
         if (gameState.userLineup[lineId]) {
            gameState.userLineup[lineId][slotKey] = null;
        }
         // Clear feedback when dragging out
        slot.classList.remove('feedback-correct', 'feedback-warning', 'feedback-incorrect');
    }
}

function handleDragOver(e) {
    e.preventDefault();
     if (!gameState.quizActive && gameState.currentMode !== 'scout') return;
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
     if (!gameState.quizActive && gameState.currentMode !== 'scout') return;
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
     if (!gameState.quizActive && gameState.currentMode !== 'scout') return;

    const slot = e.currentTarget;
    const playerId = e.dataTransfer.getData('text/plain');
    const draggedCard = document.querySelector(`.player-card[data-player-id="${playerId}"]`);
    if (!draggedCard) return; // Card not found

    const playerPosition = draggedCard.dataset.position; // Use stored actual position
    const slotType = slot.dataset.positionType; // C, W, or D

    slot.classList.remove('drag-over');
    draggedCard.classList.remove('dragging');

    // Position Validation
    const isPositionValid =
        (slotType === 'C' && playerPosition === 'C') ||
        (slotType === 'W' && ['L', 'R', 'C'].includes(playerPosition)) ||
        (slotType === 'D' && playerPosition === 'D');

    if (!isPositionValid) {
        if (gameState.currentMode === 'scout') {
             // Instant feedback: Incorrect Position (Red)
             applyFeedback(slot, 'incorrect');
        } else if (!draggedCard.closest('.line-slot')) {
            // Quiz mode flash if dragged from pool
             draggedCard.classList.add('incorrect-flash');
             setTimeout(() => draggedCard.classList.remove('incorrect-flash'), UI_CONSTANTS.FEEDBACK_DURATION);
        }
        return; // Reject drop
    }

    // --- Slot is valid position-wise ---

    // Handle existing player in slot
    if (slot.children.length > 1) { // Label + Card
        const existingCard = slot.querySelector('.player-card');
        if (existingCard) {
            playerPool.appendChild(existingCard); // Return to pool
             const [lineId_old, slotKey_old] = slot.dataset.slotId.split('-');
             if (gameState.userLineup[lineId_old]) {
                 gameState.userLineup[lineId_old][slotKey_old] = null; // Update state
            }
        }
    }

    // Place new card
    slot.appendChild(draggedCard); // Append the actual element

    // Update state
    const [lineId, slotKey] = slot.dataset.slotId.split('-');
    const player = gameState.allPlayers.find(p => p.id === playerId);
     if (gameState.userLineup[lineId]) {
        gameState.userLineup[lineId][slotKey] = player;
    }


    // --- Instant Feedback for Scout Mode Phase 3 ---
    if (gameState.currentMode === 'scout' && gameState.currentScoutPhase === 3) {
        const correctPlayerForSlot = gameState.correctLineup[lineId]?.[slotKey];
        if (correctPlayerForSlot && player.player_name === correctPlayerForSlot.name) {
            applyFeedback(slot, 'correct'); // Correct player, correct slot (Green)
        } else {
             // Correct position type, but wrong player for this rank (Yellow/Warning or just Red)
             // Simple version: Just mark as incorrect if not the exact right player
            applyFeedback(slot, 'incorrect'); // Incorrect player for this specific slot (Red)
        }
    }

    // Only check for quiz completion automatically in quiz mode
    if (gameState.currentMode === 'quiz') {
         checkQuizCompletion();
    }
}

function handleCardClick(e) {
    // Only allow moving back to pool if not in specific scout phases display areas
     if (e.currentTarget.closest('#phase-1-card-display') || e.currentTarget.closest('.phase-2-card')) {
        return; // Don't allow click-to-pool from phase 1 display or phase 2 cards
    }

     if (!gameState.quizActive && gameState.currentMode !== 'scout') return; // Allow in phase 3

    const card = e.currentTarget;
    const slot = card.closest('.line-slot');

    if (slot) {
        playerPool.appendChild(card); // Move back to pool visually
        const [lineId, slotKey] = slot.dataset.slotId.split('-');
         if (gameState.userLineup[lineId]) {
            gameState.userLineup[lineId][slotKey] = null; // Update state
        }
         // Clear feedback when moved out
        slot.classList.remove('feedback-correct', 'feedback-warning', 'feedback-incorrect');
    }
}

function attachDragDropListeners() {
    document.querySelectorAll('.line-slot').forEach(slot => {
        slot.removeEventListener('dragover', handleDragOver); // Remove old listener
        slot.removeEventListener('dragleave', handleDragLeave); // Remove old listener
        slot.removeEventListener('drop', handleDrop); // Remove old listener
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('dragleave', handleDragLeave);
        slot.addEventListener('drop', handleDrop);
    });
     // Re-attach dragstart to cards in the pool (cards in slots have it from creation)
     playerPool.querySelectorAll('.player-card').forEach(card => {
         card.removeEventListener('dragstart', handleDragStart); // Avoid duplicates
         card.addEventListener('dragstart', handleDragStart);
         card.removeEventListener('click', handleCardClick); // Avoid duplicates
         card.addEventListener('click', handleCardClick);
     });
    // Ensure cards currently in slots also have listeners (might be needed if re-rendering slots)
    lineSlotsContainer.querySelectorAll('.player-card').forEach(card => {
         card.removeEventListener('dragstart', handleDragStart);
         card.addEventListener('dragstart', handleDragStart);
          card.removeEventListener('click', handleCardClick);
         card.addEventListener('click', handleCardClick);
    });
}

function applyFeedback(element, type) {
    element.classList.remove('feedback-correct', 'feedback-warning', 'feedback-incorrect');
    // Add the new feedback class
    element.classList.add(`feedback-${type}`);
    // Remove the class after a short duration
    setTimeout(() => {
        element.classList.remove(`feedback-${type}`);
    }, UI_CONSTANTS.FEEDBACK_DURATION);
}


// --- Helper Functions ---
function updatePhaseProgress(phase) {
     const progressElement = document.getElementById(`phase-${phase}-progress`);
     const totalQuestions = phase === 1 ? UI_CONSTANTS.PHASE_1_QUESTIONS : UI_CONSTANTS.PHASE_2_QUESTIONS;
     if (progressElement) {
         progressElement.textContent = `Progress: ${gameState.scoutPhaseProgress} / ${totalQuestions} | Correct: ${gameState.scoutPhaseCorrect}`;
     }
}

function goToStartScreen() {
     gameState.currentScoutPhase = 0; // Reset phase
     gameState.quizActive = false; // Ensure quiz isn't marked active
     updateStartScreenUI(); // Update dropdowns etc.
     setScreen('start');
}

// --- Local Storage for Progress (Optional but Recommended) ---
function saveProgress() {
     try {
         const progress = {
             masteredTeams: Array.from(gameState.masteredTeams),
             unlockedTeams: Array.from(gameState.unlockedTeams)
         };
         localStorage.setItem('scoutSchoolProgress', JSON.stringify(progress));
     } catch (e) {
         console.warn("Could not save progress to localStorage:", e);
     }
}

function loadProgress() {
     try {
         const savedProgress = localStorage.getItem('scoutSchoolProgress');
         if (savedProgress) {
             const progress = JSON.parse(savedProgress);
             gameState.masteredTeams = new Set(progress.masteredTeams || []);
             // Ensure starting team is always unlocked
             const initialUnlocked = ['ANA'];
             gameState.unlockedTeams = [...new Set([...initialUnlocked, ...(progress.unlockedTeams || [])])];

         } else {
            // Initialize if no saved data
            gameState.masteredTeams = new Set();
            gameState.unlockedTeams = ['ANA']; // Default starting team
         }
     } catch (e) {
         console.warn("Could not load progress from localStorage:", e);
          // Initialize defaults on error
         gameState.masteredTeams = new Set();
         gameState.unlockedTeams = ['ANA'];
     }
}


// --- Event Listeners & App Start ---
nextShiftButton.addEventListener('click', goToStartScreen); // Quiz debrief button

window.addEventListener('load', loadDataAndInitialize);