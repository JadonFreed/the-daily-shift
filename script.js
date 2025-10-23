const QUESTIONS_PER_SHIFT = 10;
const TIME_LIMIT = 60; // seconds
// NOTE: Please ensure this path is correct for your repo!
const JSON_FILE = '/the-daily-shift/nhl_players_updated.json';

let playersData = [];
let availableTeams = [];
let dailyQuestions = [];
let currentQuestionIndex = 0;
let score = 0; // Current shift score
let correctAnswers = 0;
let mistakes = [];
let timerInterval;
let startTime;

// --- Rank System Configuration ---
const RANK_TIERS = [
    { score: 0, name: "ROOKIE", class: "rank-rookie" },
    { score: 500, name: "VETERAN", class: "rank-pro" },
    { score: 2500, name: "ALL-STAR", class: "rank-all-star" },
    { score: 5000, name: "THE CAPTAIN", class: "rank-captain" }
];


// --- Utility Functions ---

function seededRandom(seed) {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

const getDailySeed = () => {
    const today = new Date();
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

// --- Local Storage & Rank Management ---

const getTodayDateKey = () => new Date().toISOString().slice(0, 10);

const getSavedStats = () => ({
    highScore: parseInt(localStorage.getItem('highScore') || '0'),
    currentStreak: parseInt(localStorage.getItem('currentStreak') || '0'),
    totalScore: parseInt(localStorage.getItem('totalScore') || '0'), // New cumulative score
    lastPlayedDate: localStorage.getItem('lastPlayedDate')
});

const getRank = (totalScore) => {
    let currentRank = RANK_TIERS[0];
    for (const tier of RANK_TIERS) {
        if (totalScore >= tier.score) {
            currentRank = tier;
        }
    }
    return currentRank;
};

const updatePersistentUI = () => {
    const stats = getSavedStats();
    const currentRank = getRank(stats.totalScore);
    
    const rankElement = document.getElementById('player-rank');
    rankElement.textContent = currentRank.name;
    // Clear existing rank classes and apply new one
    rankElement.className = '';
    rankElement.classList.add('text-lg', 'font-bold', currentRank.class);
    
    document.getElementById('high-score').textContent = stats.highScore;
    document.getElementById('current-streak').textContent = stats.currentStreak;
};


const saveStats = (newScore, finalCorrect, modeName) => {
    const todayKey = getTodayDateKey();
    let stats = getSavedStats();
    
    // 1. Update High Score (if applicable to the core daily mode)
    if (modeName === "Daily Shift" && newScore > stats.highScore) {
        localStorage.setItem('highScore', newScore.toString());
    }
    
    // 2. Update Total Score (for all modes)
    stats.totalScore += newScore;
    localStorage.setItem('totalScore', stats.totalScore.toString());

    // 3. Update Streak (only for Daily Shift with 100% accuracy)
    let newStreak = stats.currentStreak;
    if (modeName === "Daily Shift") {
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
        }
    }
    
    updatePersistentUI();
};

// --- Game Initialization ---

const loadGame = async () => {
    try {
        const response = await fetch(JSON_FILE);
        
        if (!response.ok) {
             throw new Error(`HTTP error! status: ${response.status} at path ${JSON_FILE}`);
        }
        
        playersData = await response.json();
        availableTeams = getTeams(playersData);
        
        updatePersistentUI();
        renderMainMenu();

    } catch (error) {
        console.error("Failed to load NHL players data:", error);
        document.getElementById('game-area').innerHTML = `
            <p class="text-error-red text-xl font-bold">SYSTEM ERROR: DATA LOAD FAILED</p>
            <p class="text-secondary-light/70 mt-2">
                Check browser console for JSON path errors. (Path used: ${JSON_FILE})
            </p>
        `;
    }
};

// --- Menu Rendering ---

const renderMainMenu = () => {
    const area = document.getElementById('game-area');
    const todayKey = getTodayDateKey();
    const savedChallenge = JSON.parse(localStorage.getItem(`dailyShift_${todayKey}`));
    
    const dailyShiftButton = savedChallenge && savedChallenge.completed 
        ? `<button class="accent-button w-full opacity-50 cursor-not-allowed" disabled>1. DAILY SHIFT COMPLETE (RESET: TOMORROW)</button>`
        : `<button id="start-daily-shift" class="accent-button w-full">1. DAILY SHIFT (10 Questions, 60s)</button>`;

    area.innerHTML = `
        <div class="text-center space-y-6">
            <h2 class="text-2xl font-bold text-secondary-light border-b border-secondary-light/20 pb-2">SELECT GAME MODE</h2>

            <div class="space-y-4 text-left">
                <div class="p-4 border border-secondary-light/20 rounded-lg">
                    ${dailyShiftButton}
                    <p class="text-xs text-secondary-light/70 mt-2">The core challenge. One attempt per day. Boosts your streak.</p>
                </div>

                <div class="p-4 border border-secondary-light/20 rounded-lg">
                    <button id="start-team-quiz" class="secondary-button w-full">2. ROSTER DEEP DIVE (Select Team)</button>
                    <p class="text-xs text-secondary-light/70 mt-2">Focus on mastering one team's depth chart and numbers.</p>
                </div>

                <div class="p-4 border border-secondary-light/20 rounded-lg opacity-50 cursor-not-allowed">
                    <button class="secondary-button w-full cursor-not-allowed">3. BATTLE QUIZ (Live Game Mode - Disabled)</button>
                    <p class="text-xs text-secondary-light/70 mt-2">A future feature: Head-to-head quiz based on current NHL matchups.</p>
                </div>
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
};

// --- Team Select Screen ---

const renderTeamSelectScreen = () => {
    const area = document.getElementById('game-area');
    
    const teamOptions = availableTeams.map(t => 
        `<option value="${t.abbr}">${t.team_name} (${t.abbr})</option>`
    ).join('');

    area.innerHTML = `
        <div class="space-y-6">
            <h2 class="text-2xl font-bold text-secondary-light border-b border-secondary-light/20 pb-2">ROSTER DEEP DIVE</h2>
            
            <p class="text-secondary-light/80">Select a team to focus your 10-question roster quiz:</p>
            
            <select id="team-selector" class="w-full p-3 bg-secondary-light/10 text-secondary-light rounded-lg border border-secondary-light/30">
                ${teamOptions}
            </select>

            <button id="start-team-centric-shift" class="accent-button w-full mt-4">START ROSTER QUIZ</button>
            <button id="back-to-menu" class="w-full text-secondary-light/50 hover:text-accent-red mt-4">← Back to Main Menu</button>
        </div>
    `;

    document.getElementById('start-team-centric-shift').addEventListener('click', () => {
        const teamAbbr = document.getElementById('team-selector').value;
        const teamName = availableTeams.find(t => t.abbr === teamAbbr).name;
        prepareTeamCentricChallenge(teamAbbr);
        startShift(`Roster Deep Dive: ${teamName}`);
    });
    
    document.getElementById('back-to-menu').addEventListener('click', renderMainMenu);
}

// --- Question Generation Logic (Unchanged from last step) ---

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

    while (options.length < 4) {
        const decoy = getRandomPlayer(playersData, excludeIds);
        if (decoy && !options.includes(decoy.player_name)) {
            options.push(decoy.player_name);
            excludeIds.push(decoy.id);
        }
    }

    return {
        type: "Identity Check",
        player: { 
            team_abbr: correctPlayer.team_abbr, 
            position: correctPlayer.position, 
            jersey_number: correctPlayer.jersey_number
        },
        question: `IDENTITY CHECK: Which player matches this card?`,
        options: shuffleArray(options, getDailySeed() + currentQuestionIndex),
        correctAnswer: correctPlayer.player_name,
        debriefData: { name: correctPlayer.player_name, trait: correctPlayer.unique_trait }
    };
};

const generatePositionalDrill = (dailyPlayer) => {
    const correctPlayer = dailyPlayer;
    const primaryPosition = correctPlayer.position.split('/')[0];
    const simplifiedPosition = ['L', 'R', 'C'].includes(primaryPosition) ? 'F' : primaryPosition;

    const allPositions = ['F', 'D', 'G'];
    let options = [simplifiedPosition];
    
    const decoyPositions = allPositions.filter(p => p !== simplifiedPosition);
    shuffleArray(decoyPositions, getDailySeed() + currentQuestionIndex + 1);

    while (options.length < 4 && decoyPositions.length > 0) {
        options.push(decoyPositions.pop() || 'W');
    }
    
    return {
        type: "Positional Drill",
        player: { 
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
    ], dailySeed + 1);

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
    const modeSeed = Date.now();
    
    let teamPlayers = playersData.filter(p => p.team_abbr === teamAbbr1 || (teamAbbr2 && p.team_abbr === teamAbbr2));
    
    while (teamPlayers.length < QUESTIONS_PER_SHIFT) {
        const randomPlayer = getRandomPlayer(playersData, teamPlayers.map(p => p.id));
        if (randomPlayer) teamPlayers.push(randomPlayer);
        else break;
    }

    let availablePlayers = shuffleArray(teamPlayers, modeSeed);
    dailyQuestions = [];
    mistakes = [];

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
    timerDisplay.className = 'text-center text-3xl font-mono mb-4 text-accent-red font-bold'; // Using accent-red for timer
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
    const timerElement = document.getElementById('game-timer');
    if (timerElement) {
        timerElement.remove();
    }
    
    clearInterval(timerInterval);
    const timeElapsed = timedOut ? TIME_LIMIT : Math.floor((Date.now() - startTime) / 1000);
    const timeRemaining = TIME_LIMIT - timeElapsed;

    const basePoints = correctAnswers * 100;
    const speedMultiplier = 1 + (timeRemaining > 0 ? timeRemaining / (TIME_LIMIT * 2) : 0);
    const finalScore = Math.floor(basePoints * speedMultiplier);
    
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
    }
    
    saveStats(finalScore, correctAnswers, modeName);
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
        // Update score display immediately for better feedback
        document.getElementById('current-score-display').textContent = score;
    } else {
        answeredButton.classList.add('flash-incorrect');
        
        mistakes.push({
            questionType: currentQuestion.type,
            questionText: currentQuestion.question,
            userAnswer: userAnswer,
            correctAnswer: currentQuestion.correctAnswer,
            debriefData: currentQuestion.debriefData
        });

        options.forEach(button => {
            if (button.textContent.trim() === currentQuestion.correctAnswer) {
                button.classList.add('text-primary-dark', 'bg-secondary-light'); // Use secondary-light for correct answer glow
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
                <span>MODE: <span class="text-accent-red">${modeName}</span></span>
                <span>SCORE: <span id="current-score-display" class="text-secondary-light">${score}</span></span>
            </div>

            <div class="p-4 md:p-6 rounded-lg border border-secondary-light/20 bg-primary-dark/50">
                <h3 class="text-xl text-accent-red mb-4 font-bold">Q ${currentQuestionIndex + 1}/${QUESTIONS_PER_SHIFT} — ${question.type}</h3>
                <p class="text-secondary-light/90 mb-6 kinetic-text">${question.question}</p>
                
                ${renderQuestionDisplay(question)}

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6" id="options-grid">
                    ${question.options.map((option) => `
                        <button class="option-button w-full bg-secondary-light/10 text-secondary-light py-3 px-4 rounded-lg hover:bg-accent-red/50 transition-colors duration-150" data-answer="${option}" data-mode="${modeName}">
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
    if (question.type === 'Identity Check') {
        const p = question.player;
        return `
            <div class="player-card p-4 mx-auto w-48 text-center mb-6">
                <p class="text-5xl font-bold text-accent-red">#${p.jersey_number}</p>
                <p class="text-xl text-secondary-light/80">${p.team_abbr}</p>
                <p class="text-lg text-secondary-light">${p.position.split('/')[0]}</p>
            </div>
        `;
    }
    return '';
};


const renderDebriefScreen = (finalScore, finalCorrect, mistakes, timeElapsed, modeName) => {
    const currentRank = getRank(getSavedStats().totalScore);
    const area = document.getElementById('game-area');
    const accuracy = ((finalCorrect / QUESTIONS_PER_SHIFT) * 100).toFixed(0);
    const timeRemaining = TIME_LIMIT - timeElapsed;
    const speedBonus = 1 + (timeRemaining > 0 ? timeRemaining / (TIME_LIMIT * 2) : 0);
    
    area.innerHTML = `
        <div class="text-center space-y-6">
            <h2 class="text-4xl md:text-5xl font-bold text-secondary-light border-b border-secondary-light/20 pb-2">SHIFT COMPLETE</h2>
            <p class="text-xl font-bold text-accent-red">${modeName}</p>
            
            <div class="grid grid-cols-2 gap-4 text-left p-4 bg-secondary-light/10 rounded-lg">
                <div><span class="text-secondary-light/70 block">Accuracy:</span> <span class="text-2xl text-accent-red">${accuracy}%</span></div>
                <div><span class="text-secondary-light/70 block">Time Used:</span> <span class="text-2xl">${timeElapsed}s</span></div>
            </div>

            <h3 class="text-5xl font-bold py-4 border-y border-accent-red/50">POINTS EARNED: <span class="text-secondary-light">${finalScore}</span></h3>
            
            <div class="p-2 border border-rank-gold/50 rounded-lg bg-rank-gold/10">
                 <p class="text-secondary-light/80">NEW OVERALL RANK: <span class="${currentRank.class} text-2xl font-bold">${currentRank.name}</span></p>
                 <p class="text-xs text-secondary-light/70">Total Score: ${getSavedStats().totalScore}</p>
            </div>

            <h4 class="text-xl font-bold ${mistakes.length > 0 ? 'text-error-red' : 'text-secondary-light'} mt-8">
                MISTAKE REVIEW (${mistakes.length} ERRORS)
            </h4>
            <div class="space-y-4 text-left max-h-60 overflow-y-auto pr-2">
                ${mistakes.length === 0 ? `
                    <p class="text-lg text-secondary-light/80">PERFECT SHIFT! No review needed.</p>
                ` : mistakes.map(m => `
                    <div class="p-3 border border-error-red/50 rounded-lg bg-error-red/10">
                        <p class="font-bold text-error-red">${m.questionType}</p>
                        <p class="text-sm mt-1">Player: <span class="font-bold">${m.debriefData.name}</span></p>
                        <p class="text-sm">Correct Answer: <span class="text-secondary-light">${m.correctAnswer}</span></p>
                        <p class="text-sm mt-2 text-secondary-light/90">
                            <span class="font-bold text-accent-red">Fact:</span> ${m.debriefData.trait}
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