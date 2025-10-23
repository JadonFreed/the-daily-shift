const QUESTIONS_PER_SHIFT = 10;
const TIME_LIMIT = 60; // seconds
// *** IMPORTANT FIX FOR GITHUB PAGES DEPLOYMENT ***
// Replace 'your-repo-name' with your actual GitHub repository name, e.g., '/the-daily-shift/'
const JSON_FILE = '/the-daily-shift/nhl_players.json'; 

let playersData = [];
let availableTeams = [];
let dailyQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let correctAnswers = 0;
let mistakes = [];
let timerInterval;
let startTime;

// --- Utility Functions ---

// Simple PRNG function seeded by the current date for deterministic daily questions
function seededRandom(seed) {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

const getDailySeed = () => {
    const today = new Date();
    // YYYYMMDD format for the seed
    const seedString = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    return seedString;
};

const shuffleArray = (array, seed) => {
    let currentIndex = array.length, randomIndex;
    let prng = (seed) => seededRandom(seed + 100);

    while (currentIndex !== 0) {
        randomIndex = Math.floor(prng(currentIndex) * currentIndex);
        currentIndex--;

        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]
        ];
    }
    return array;
}

const getTeams = (data) => {
    return [...new Set(data.map(p => p.team_abbr))].map(abbr => {
        return { abbr: abbr, name: data.find(p => p.team_abbr === abbr).team_name };
    }).sort((a, b) => a.name.localeCompare(b.name));
}

// --- Local Storage Management ---

const getTodayDateKey = () => new Date().toISOString().slice(0, 10);

const getSavedStats = () => ({
    highScore: parseInt(localStorage.getItem('highScore') || '0'),
    currentStreak: parseInt(localStorage.getItem('currentStreak') || '0'),
    lastPlayedDate: localStorage.getItem('lastPlayedDate')
});

const saveStats = (newScore, finalCorrect) => {
    const todayKey = getTodayDateKey();
    const stats = getSavedStats();
    
    if (newScore > stats.highScore) {
        localStorage.setItem('highScore', newScore.toString());
        document.getElementById('high-score').textContent = newScore;
    }

    let newStreak = stats.currentStreak;
    if (finalCorrect === QUESTIONS_PER_SHIFT) {
        const yesterday = new Date(todayKey);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = yesterday.toISOString().slice(0, 10);
        
        if (stats.lastPlayedDate === yesterdayKey) {
            newStreak += 1;
        } else if (stats.lastPlayedDate !== todayKey) {
            newStreak = 1;
        }
    } else {
        newStreak = 0;
    }
    
    if (stats.lastPlayedDate !== todayKey) {
        localStorage.setItem('currentStreak', newStreak.toString());
        localStorage.setItem('lastPlayedDate', todayKey);
        document.getElementById('current-streak').textContent = newStreak;
    }
};

// --- Game Initialization ---

const loadGame = async () => {
    try {
        const response = await fetch(JSON_FILE);
        playersData = await response.json();
        availableTeams = getTeams(playersData);

        const { highScore, currentStreak } = getSavedStats();
        
        document.getElementById('high-score').textContent = highScore;
        document.getElementById('current-streak').textContent = currentStreak;
        
        // Go to Main Menu
        renderMainMenu();

    } catch (error) {
        console.error("Failed to load NHL players data:", error);
        document.getElementById('game-area').innerHTML = `<p class="text-error-red">ERROR: Could not load player data. Please check ${JSON_FILE} path in script.js (remember to include /your-repo-name/).</p>`;
    }
};

// --- Menu Rendering ---

const renderMainMenu = (team1 = 'NYR', team2 = 'PIT') => { // Example live game: NYR vs PIT
    const area = document.getElementById('game-area');
    const todayKey = getTodayDateKey();
    const savedChallenge = JSON.parse(localStorage.getItem(`dailyShift_${todayKey}`));
    
    const dailyShiftButton = savedChallenge && savedChallenge.completed 
        ? `<button class="accent-button w-full opacity-50 cursor-not-allowed" disabled>DAILY SHIFT COMPLETE (RESET: TOMORROW)</button>`
        : `<button id="start-daily-shift" class="accent-button w-full">1. DAILY SHIFT (10 Random Questions, 60s)</button>`;

    area.innerHTML = `
        <div class="text-center space-y-6">
            <h2 class="text-2xl font-bold text-secondary-light border-b border-secondary-light/20 pb-2">SELECT GAME MODE</h2>

            <div class="space-y-4">
                <div class="p-4 border border-accent-cyan/20 rounded-lg">
                    ${dailyShiftButton}
                    <p class="text-xs text-secondary-light/70 mt-2">The original quick-fire challenge. Tests general knowledge.</p>
                </div>

                <div class="p-4 border border-accent-cyan/20 rounded-lg">
                    <button id="start-team-quiz" class="accent-button w-full bg-secondary-light/10 text-secondary-light hover:bg-accent-cyan/20">2. TEAM ROSTER QUIZ</button>
                    <p class="text-xs text-secondary-light/70 mt-2">Focus your study on a single team roster of your choice.</p>
                </div>
            </div>

            <div class="p-4 border border-error-red/50 rounded-lg bg-error-red/10 animate-pulse-slow">
                <p class="text-lg font-bold text-error-red">LIVE GAME ALERT: ${team1} vs ${team2}</p>
                <button id="start-live-quiz" class="accent-button w-full bg-error-red text-secondary-light hover:bg-error-red/80 mt-2">
                    3. BATTLE QUIZ: ${team1} vs ${team2}
                </button>
                <p class="text-xs text-secondary-light/70 mt-2">
                    (NOTE: This is a simulated alert. In a live application, this button would dynamically appear using the Scoreboard API found in search.)
                </p>
            </div>
            
        </div>
    `;

    if (!(savedChallenge && savedChallenge.completed)) {
        document.getElementById('start-daily-shift').addEventListener('click', () => {
             prepareDailyChallenge();
             startShift("Daily Shift");
        });
    }
    
    document.getElementById('start-team-quiz').addEventListener('click', renderTeamSelectScreen);
    document.getElementById('start-live-quiz').addEventListener('click', () => {
         prepareTeamCentricChallenge(team1, team2);
         startShift(`Battle Quiz: ${team1} vs ${team2}`);
    });
};

// --- Team Select Screen ---

const renderTeamSelectScreen = () => {
    const area = document.getElementById('game-area');
    
    const teamOptions = availableTeams.map(t => 
        `<option value="${t.abbr}">${t.team_name} (${t.abbr})</option>`
    ).join('');

    area.innerHTML = `
        <div class="space-y-6">
            <h2 class="text-2xl font-bold text-accent-cyan border-b border-accent-cyan/20 pb-2">TEAM ROSTER QUIZ</h2>
            
            <p class="text-secondary-light/80">Select a team to focus your 10-question roster quiz:</p>
            
            <select id="team-selector" class="w-full p-3 bg-secondary-light/10 text-secondary-light rounded-lg border border-accent-cyan/20">
                ${teamOptions}
            </select>

            <button id="start-team-centric-shift" class="accent-button w-full mt-4">START ROSTER QUIZ</button>
            <button id="back-to-menu" class="w-full text-secondary-light/50 hover:text-accent-cyan/80 mt-4">← Back to Main Menu</button>
        </div>
    `;

    document.getElementById('start-team-centric-shift').addEventListener('click', () => {
        const teamAbbr = document.getElementById('team-selector').value;
        const teamName = availableTeams.find(t => t.abbr === teamAbbr).name;
        prepareTeamCentricChallenge(teamAbbr);
        startShift(`Team Roster Quiz: ${teamName}`);
    });
    
    document.getElementById('back-to-menu').addEventListener('click', renderMainMenu);
}

// --- Question Generation Logic ---

const getRandomPlayer = (data, excludeIds = []) => {
    const availablePlayers = data.filter(p => !excludeIds.includes(p.id));
    if (availablePlayers.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * availablePlayers.length);
    return availablePlayers[randomIndex];
};

const generateIdentityCheck = (dailyPlayer) => {
    const correctPlayer = dailyPlayer;
    let options = [correctPlayer.player_name];
    let excludeIds = [correctPlayer.id];

    // Get 3 incorrect player names from the *entire* player pool
    while (options.length < 4) {
        const decoy = getRandomPlayer(playersData, excludeIds);
        if (decoy && !options.includes(decoy.player_name)) {
            options.push(decoy.player_name);
            excludeIds.push(decoy.id);
        }
    }

    return {
        type: "Identity Check",
        player: { // Only include display info, not the answer
            team_abbr: correctPlayer.team_abbr, 
            position: correctPlayer.position, 
            jersey_number: correctPlayer.jersey_number
        },
        question: `IDENTITY CHECK: Which player matches this card?`,
        options: shuffleArray(options, getDailySeed() + currentQuestionIndex),
        correctAnswer: correctPlayer.player_name,
        // Include full player data only for the Debrief Review
        debriefData: { name: correctPlayer.player_name, trait: correctPlayer.unique_trait }
    };
};

const generatePositionalDrill = (dailyPlayer) => {
    const correctPlayer = dailyPlayer;
    // Note: 'L' and 'R' are for forwards (LW/RW). For the quiz, simplify to C, F, D, G.
    const primaryPosition = correctPlayer.position.split('/')[0];
    const simplifiedPosition = ['L', 'R', 'C'].includes(primaryPosition) ? 'F' : primaryPosition;

    const allPositions = ['F', 'D', 'G'];
    let options = [simplifiedPosition];
    
    const decoyPositions = allPositions.filter(p => p !== simplifiedPosition);
    shuffleArray(decoyPositions, getDailySeed() + currentQuestionIndex + 1);

    while (options.length < 4 && decoyPositions.length > 0) {
        // Include "W" for forward as a close decoy if needed
        options.push(decoyPositions.pop() || 'W');
    }
    
    return {
        type: "Positional Drill",
        player: { // Only include info to ask the question
            name: correctPlayer.player_name,
            team_abbr: correctPlayer.team_abbr,
            jersey_number: correctPlayer.jersey_number
        },
        question: `POSITIONAL DRILL: What is the primary role of #${correctPlayer.jersey_number} ${correctPlayer.player_name} (${correctPlayer.team_abbr})?`,
        options: shuffleArray(options, getDailySeed() + currentQuestionIndex),
        correctAnswer: simplifiedPosition,
        debriefData: { name: correctPlayer.player_name, trait: correctPlayer.unique_trait }
    };
};

const generateJerseyNumberCheck = (dailyPlayer) => {
    const correctPlayer = dailyPlayer;
    let options = [correctPlayer.jersey_number];
    let excludeIds = [correctPlayer.id];
    
    // Get 3 incorrect jersey numbers from other players
    while (options.length < 4) {
        const decoy = getRandomPlayer(playersData, excludeIds);
        if (decoy && !options.includes(decoy.jersey_number)) {
            options.push(decoy.jersey_number);
            excludeIds.push(decoy.id);
        }
    }

    return {
        type: "Jersey Number Check",
        player: {
            name: correctPlayer.player_name,
            team_abbr: correctPlayer.team_abbr,
            position: correctPlayer.position
        },
        question: `JERSEY CHECK: What number does ${correctPlayer.player_name} (${correctPlayer.team_abbr}) wear?`,
        options: shuffleArray(options, getDailySeed() + currentQuestionIndex),
        correctAnswer: correctPlayer.jersey_number,
        debriefData: { name: correctPlayer.player_name, trait: correctPlayer.unique_trait }
    };
};

// --- Challenge Preparation ---

const prepareDailyChallenge = () => {
    const dailySeed = getDailySeed();
    const todayKey = getTodayDateKey();
    
    let availablePlayers = shuffleArray([...playersData], dailySeed);
    dailyQuestions = [];
    mistakes = [];

    const questionTypes = shuffleArray([
        'Identity Check', 'Positional Drill', 'Jersey Number Check', 
        'Identity Check', 'Positional Drill', 'Jersey Number Check',
        'Identity Check', 'Positional Drill', 'Jersey Number Check', 'Identity Check' 
    ], dailySeed + 1); // 4 of each Identity/Positional, 2 Jersey Check (for 10 total)

    for (let i = 0; i < QUESTIONS_PER_SHIFT; i++) {
        const player = availablePlayers.pop(); 
        
        if (!player) break;

        let question;
        const type = questionTypes[i];
        
        if (type === 'Identity Check') {
            question = generateIdentityCheck(player);
        } else if (type === 'Positional Drill') {
            question = generatePositionalDrill(player);
        } else if (type === 'Jersey Number Check') {
            question = generateJerseyNumberCheck(player);
        }
        
        dailyQuestions.push(question);
    }

    // Save the newly generated challenge
    localStorage.setItem(`dailyShift_${todayKey}`, JSON.stringify({
        questions: dailyQuestions,
        completed: false,
        finalScore: 0,
        finalCorrect: 0,
        mistakes: [],
        timeElapsed: 0
    }));
};

const prepareTeamCentricChallenge = (teamAbbr1, teamAbbr2 = null) => {
    const modeSeed = Date.now(); // Use current time for non-daily modes
    
    // Filter players by team(s)
    let teamPlayers = playersData.filter(p => p.team_abbr === teamAbbr1 || (teamAbbr2 && p.team_abbr === teamAbbr2));
    
    // Ensure we have enough players, otherwise select a few random from other teams
    while (teamPlayers.length < QUESTIONS_PER_SHIFT) {
        const randomPlayer = getRandomPlayer(playersData, teamPlayers.map(p => p.id));
        if (randomPlayer) teamPlayers.push(randomPlayer);
        else break;
    }

    let availablePlayers = shuffleArray(teamPlayers, modeSeed);
    dailyQuestions = [];
    mistakes = [];

    // All questions are Roster/Jersey focused for Team-Centric mode (no Identity Check on face/rating)
    const questionTypes = shuffleArray([
        'Positional Drill', 'Jersey Number Check', 'Positional Drill', 'Jersey Number Check',
        'Positional Drill', 'Jersey Number Check', 'Positional Drill', 'Jersey Number Check', 
        'Positional Drill', 'Jersey Number Check'
    ], modeSeed + 1);

    for (let i = 0; i < QUESTIONS_PER_SHIFT; i++) {
        const player = availablePlayers.pop();
        if (!player) break;

        let question;
        const type = questionTypes[i];
        
        if (type === 'Positional Drill') {
            question = generatePositionalDrill(player);
        } else if (type === 'Jersey Number Check') {
            question = generateJerseyNumberCheck(player);
        }
        dailyQuestions.push(question);
    }
}


// --- Game Flow and Rendering ---

const startShift = (modeName) => {
    currentQuestionIndex = 0;
    correctAnswers = 0;
    score = 0;
    mistakes = [];
    startTime = Date.now();
    
    const timerDisplay = document.createElement('div');
    timerDisplay.id = 'game-timer';
    timerDisplay.className = 'text-center text-3xl font-mono mb-4 text-accent-cyan glow-text';
    document.getElementById('app-container').prepend(timerDisplay);

    const updateTimer = () => {
        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        const remainingTime = TIME_LIMIT - elapsedTime;
        
        if (remainingTime <= 0) {
            clearInterval(timerInterval);
            endShift(modeName, true);
        } else {
            timerDisplay.textContent = `TIME: ${remainingTime}s`;
        }
    };
    
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
    updateTimer();
    
    renderQuestion(modeName, dailyQuestions[currentQuestionIndex]);
};

const endShift = (modeName, timedOut = false) => {
    clearInterval(timerInterval);
    const timeElapsed = timedOut ? TIME_LIMIT : Math.floor((Date.now() - startTime) / 1000);
    const timeRemaining = TIME_LIMIT - timeElapsed;

    // Calculate final score
    const basePoints = correctAnswers * 100;
    // Speed multiplier logic simplified slightly, max 1.5x
    const speedMultiplier = 1 + (timeRemaining > 0 ? timeRemaining / (TIME_LIMIT * 2) : 0);
    const finalScore = Math.floor(basePoints * speedMultiplier);
    
    // Save completion status only for Daily Shift mode for streaks
    if (modeName === "Daily Shift") {
        const todayKey = getTodayDateKey();
        localStorage.setItem(`dailyShift_${todayKey}`, JSON.stringify({
            questions: dailyQuestions,
            completed: true,
            finalScore: finalScore,
            finalCorrect: correctAnswers,
            mistakes: mistakes,
            timeElapsed: timeElapsed
        }));
        saveStats(finalScore, correctAnswers);
    }
    
    renderDebriefScreen(finalScore, correctAnswers, mistakes, timeElapsed, modeName);
};

const handleAnswer = (userAnswer, modeName) => {
    const currentQuestion = dailyQuestions[currentQuestionIndex];
    const isCorrect = userAnswer === currentQuestion.correctAnswer;
    const options = document.querySelectorAll('.option-button');
    let answeredButton;
    
    options.forEach(button => {
        button.disabled = true;
        if (button.textContent.trim() === userAnswer) {
            answeredButton = button;
        }
    });
    
    if (isCorrect) {
        correctAnswers++;
        score += 100;
        answeredButton.classList.add('pulse-correct');
    } else {
        answeredButton.classList.add('flash-incorrect');
        
        // Record mistake: use the non-answer properties for the review screen
        mistakes.push({
            questionType: currentQuestion.type,
            questionText: currentQuestion.question,
            userAnswer: userAnswer,
            correctAnswer: currentQuestion.correctAnswer,
            // Debrief data now explicitly contains the name and trait for the review
            debriefData: currentQuestion.debriefData
        });

        options.forEach(button => {
            if (button.textContent.trim() === currentQuestion.correctAnswer) {
                button.classList.add('text-primary-dark', 'bg-accent-cyan');
            }
        });
    }

    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < QUESTIONS_PER_SHIFT) {
            renderQuestion(modeName, dailyQuestions[currentQuestionIndex]);
        } else {
            endShift(modeName);
        }
    }, 1000);
};

const renderQuestion = (modeName, question) => {
    const area = document.getElementById('game-area');
    area.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between text-sm font-mono text-secondary-light/70">
                <span>MODE: <span class="text-accent-cyan">${modeName}</span></span>
                <span>QUESTION ${currentQuestionIndex + 1}/${QUESTIONS_PER_SHIFT}</span>
            </div>

            <div class="p-4 md:p-6 rounded-lg border border-accent-cyan/10">
                <h3 class="text-xl text-accent-cyan mb-4">${question.type}</h3>
                <p class="text-secondary-light/90 mb-6 kinetic-text">${question.question}</p>
                
                ${renderQuestionDisplay(question)}

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6" id="options-grid">
                    ${question.options.map((option) => `
                        <button class="option-button w-full bg-secondary-light/10 text-secondary-light py-3 px-4 rounded-lg hover:bg-accent-cyan/20 transition-colors duration-150" data-answer="${option}" data-mode="${modeName}">
                            ${option}
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.querySelectorAll('.option-button').forEach(button => {
        button.addEventListener('click', (e) => handleAnswer(e.target.dataset.answer, e.target.dataset.mode));
    });
};

const renderQuestionDisplay = (question) => {
    // Only show the card for Identity Check, where the Player Name is the question/answer
    if (question.type === 'Identity Check') {
        const p = question.player;
        return `
            <div class="player-card p-4 mx-auto w-48 text-center mb-6">
                <p class="text-4xl font-bold text-accent-cyan">#${p.jersey_number}</p>
                <p class="text-xl text-secondary-light/80">${p.team_abbr}</p>
                <p class="text-lg text-secondary-light">${p.position.split('/')[0]}</p>
            </div>
        `;
    }
    // Other modes display name/team in the question itself, so no need for an extra card.
    return '';
};


const renderDebriefScreen = (finalScore, finalCorrect, mistakes, timeElapsed, modeName) => {
    document.getElementById('game-timer').remove();
    const area = document.getElementById('game-area');
    const accuracy = ((finalCorrect / QUESTIONS_PER_SHIFT) * 100).toFixed(0);
    const timeRemaining = TIME_LIMIT - timeElapsed;
    const speedBonus = 1 + (timeRemaining > 0 ? timeRemaining / (TIME_LIMIT * 2) : 0);
    
    area.innerHTML = `
        <div class="text-center space-y-6">
            <h2 class="text-4xl md:text-5xl font-bold text-accent-cyan glow-text">DEBRIEF SCREEN</h2>
            
            <div class="grid grid-cols-2 gap-4 text-left p-4 bg-secondary-light/10 rounded-lg">
                <div><span class="text-accent-cyan block">Time Elapsed:</span> <span class="text-2xl">${timeElapsed}s</span></div>
                <div><span class="text-accent-cyan block">Accuracy:</span> <span class="text-2xl">${accuracy}%</span></div>
                <div><span class="text-accent-cyan block">Correct Answers:</span> <span class="text-2xl">${finalCorrect}/${QUESTIONS_PER_SHIFT}</span></div>
                <div><span class="text-accent-cyan block">Score Multiplier:</span> <span class="text-2xl">${speedBonus.toFixed(2)}x</span></div>
            </div>

            <h3 class="text-5xl font-bold py-4 border-y border-accent-cyan/50">TOTAL POINTS: <span class="text-accent-cyan">${finalScore}</span></h3>

            <h4 class="text-xl font-bold ${mistakes.length > 0 ? 'text-error-red' : 'text-accent-cyan'} mt-8">
                MISTAKE REVIEW (${mistakes.length} ERRORS)
            </h4>
            <div class="space-y-4 text-left max-h-60 overflow-y-auto pr-2">
                ${mistakes.length === 0 ? `
                    <p class="text-lg text-secondary-light/80">PERFECT SHIFT! No review needed.</p>
                ` : mistakes.map(m => `
                    <div class="p-3 border border-error-red/50 rounded-lg bg-error-red/10">
                        <p class="font-bold text-error-red">${m.questionType}: ${m.questionText}</p>
                        <p class="text-sm mt-1">Player: <span class="font-bold">${m.debriefData.name}</span></p>
                        <p class="text-sm">Your Answer: <span class="text-error-red">${m.userAnswer}</span></p>
                        <p class="text-sm">Correct Answer: <span class="text-accent-cyan">${m.correctAnswer}</span></p>
                        <p class="text-sm mt-2 text-secondary-light/90">
                            <span class="font-bold">Fact:</span> ${m.debriefData.trait}
                        </p>
                    </div>
                `).join('')}
            </div>
            
            <button id="back-to-main-menu" class="accent-button w-full mt-8">
                BACK TO MAIN MENU
            </button>
        </div>
    `;
    document.getElementById('back-to-main-menu').addEventListener('click', renderMainMenu);
};


// Start the application
document.addEventListener('DOMContentLoaded', loadGame);