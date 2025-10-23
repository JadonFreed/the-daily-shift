const QUESTIONS_PER_SHIFT = 10;
const TIME_LIMIT = 60; // seconds
const JSON_FILE = 'nhl_players.json';

let playersData = [];
let dailyQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let correctAnswers = 0;
let timerInterval;
let startTime;
let mistakes = [];

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
    let prng = (seed) => seededRandom(seed + 100); // Start with a unique seed based on the daily seed

    // While there remain elements to shuffle.
    while (currentIndex !== 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(prng(currentIndex) * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]
        ];
    }
    return array;
}

// --- Local Storage Management ---

const getTodayDateKey = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const getSavedStats = () => ({
    highScore: parseInt(localStorage.getItem('highScore') || '0'),
    currentStreak: parseInt(localStorage.getItem('currentStreak') || '0'),
    lastPlayedDate: localStorage.getItem('lastPlayedDate')
});

const saveStats = (newScore, finalCorrect) => {
    const todayKey = getTodayDateKey();
    const stats = getSavedStats();
    
    // 1. Update High Score
    if (newScore > stats.highScore) {
        localStorage.setItem('highScore', newScore.toString());
        document.getElementById('high-score').textContent = newScore;
    }

    // 2. Update Streak
    let newStreak = stats.currentStreak;
    if (finalCorrect === QUESTIONS_PER_SHIFT) {
        // Check if today is the day after the last played date with a perfect score
        const yesterday = new Date(todayKey);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = yesterday.toISOString().slice(0, 10);
        
        if (stats.lastPlayedDate === yesterdayKey) {
            newStreak += 1; // Increment streak
        } else if (stats.lastPlayedDate !== todayKey) {
            newStreak = 1; // Start new streak
        }
    } else {
        newStreak = 0; // Streak broken
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
        const { highScore, currentStreak } = getSavedStats();
        
        // Update persistent stats on UI
        document.getElementById('high-score').textContent = highScore;
        document.getElementById('current-streak').textContent = currentStreak;
        
        // Prepare daily challenge
        prepareDailyChallenge();
        renderStartScreen();

    } catch (error) {
        console.error("Failed to load NHL players data:", error);
        document.getElementById('game-area').innerHTML = `<p class="text-error-red">ERROR: Could not load player data. Please check ${JSON_FILE}.</p>`;
    }
};

// --- Question Generation Logic ---

const getRandomPlayer = (excludeIds = []) => {
    const availablePlayers = playersData.filter(p => !excludeIds.includes(p.id));
    if (availablePlayers.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * availablePlayers.length);
    return availablePlayers[randomIndex];
};

const generateIdentityCheck = (dailyPlayer) => {
    const correctPlayer = dailyPlayer;
    let options = [correctPlayer.player_name];
    let excludeIds = [correctPlayer.id];

    while (options.length < 4) {
        const decoy = getRandomPlayer(excludeIds);
        if (decoy && !options.includes(decoy.player_name)) {
            options.push(decoy.player_name);
            excludeIds.push(decoy.id);
        }
    }

    return {
        type: "Identity Check",
        player: correctPlayer,
        question: `IDENTITY CHECK: Which player matches this card?`,
        options: shuffleArray(options, getDailySeed() + currentQuestionIndex), // Shuffle options deterministically
        correctAnswer: correctPlayer.player_name
    };
};

const generatePositionalDrill = (dailyPlayer) => {
    const correctPlayer = dailyPlayer;
    const allPositions = ['C', 'LW', 'RW', 'D', 'G'];
    let options = [correctPlayer.position.split('/')[0]];
    
    // Filter to get unique decoy positions
    const decoyPositions = allPositions.filter(p => !correctPlayer.position.includes(p));
    shuffleArray(decoyPositions, getDailySeed() + currentQuestionIndex + 1);

    while (options.length < 4 && decoyPositions.length > 0) {
        options.push(decoyPositions.pop());
    }
    
    return {
        type: "Positional Drill",
        player: correctPlayer,
        question: `POSITIONAL DRILL: What is the primary position of ${correctPlayer.player_name} (${correctPlayer.team_abbr})?`,
        options: shuffleArray(options, getDailySeed() + currentQuestionIndex),
        correctAnswer: correctPlayer.position.split('/')[0]
    };
};

const generateRatingMatchup = (dailyPlayer) => {
    const playerA = dailyPlayer;
    // Find a second player with a rating difference to make the question interesting
    let playerB;
    const playerA_rating = playerA.rating;
    
    // Attempt to find a player within a 5-15 rating band of playerA (if possible)
    let candidates = playersData.filter(p => 
        p.id !== playerA.id && 
        Math.abs(p.rating - playerA_rating) >= 5 && 
        Math.abs(p.rating - playerA_rating) <= 15
    );
    
    if (candidates.length === 0) {
        // Fallback: just pick a random player
        playerB = getRandomPlayer([playerA.id]);
    } else {
        playerB = candidates[Math.floor(seededRandom(getDailySeed() + currentQuestionIndex + 2) * candidates.length)];
    }

    if (!playerB) { 
        // Should not happen with large dataset but as a fail-safe
        playerB = getRandomPlayer([playerA.id]);
    }

    const higherPlayer = playerA.rating > playerB.rating ? playerA : playerB;
    const lowerPlayer = playerA.rating < playerB.rating ? playerA : playerB;
    const isTie = playerA.rating === playerB.rating;

    // Shuffle A and B to randomize display order
    const displayPlayers = shuffleArray([playerA, playerB], getDailySeed() + currentQuestionIndex);

    return {
        type: "Rating Matchup",
        player: playerA, // The 'main' player, though both are important
        playerB: playerB,
        question: `RATING MATCHUP: Which player has the higher Overall Rating?`,
        options: [
            `${displayPlayers[0].player_name} (${displayPlayers[0].rating})`,
            `${displayPlayers[1].player_name} (${displayPlayers[1].rating})`,
            "They have the same rating"
        ],
        correctAnswer: isTie ? "They have the same rating" : `${higherPlayer.player_name} (${higherPlayer.rating})`
    };
};


const prepareDailyChallenge = () => {
    const dailySeed = getDailySeed();
    const todayKey = getTodayDateKey();
    const savedChallenge = localStorage.getItem(`dailyShift_${todayKey}`);

    if (savedChallenge) {
        // Challenge for today already exists in localStorage
        const data = JSON.parse(savedChallenge);
        dailyQuestions = data.questions;
        // Check if the user already completed the shift today
        if (data.completed) {
            renderDebriefScreen(data.finalScore, data.finalCorrect, data.mistakes, data.timeElapsed);
            return;
        }
    } else {
        // Generate new challenge
        let availablePlayers = shuffleArray([...playersData], dailySeed); // Copy and shuffle players based on daily seed
        dailyQuestions = [];
        mistakes = [];

        // Distribute questions evenly across the three modes (5 questions from two modes, 5 from the third is complex. Let's aim for 3-4 from each mode for 10 questions.)
        
        const questionTypes = shuffleArray([
            'Identity Check', 'Positional Drill', 'Rating Matchup', 
            'Identity Check', 'Positional Drill', 'Rating Matchup',
            'Identity Check', 'Positional Drill', 'Rating Matchup', 'Rating Matchup' // 10 total
        ], dailySeed + 1);

        for (let i = 0; i < QUESTIONS_PER_SHIFT; i++) {
            let question;
            const player = availablePlayers.pop(); 

            // Use the determined question type for the current player
            if (questionTypes[i] === 'Identity Check') {
                question = generateIdentityCheck(player);
            } else if (questionTypes[i] === 'Positional Drill') {
                question = generatePositionalDrill(player);
            } else if (questionTypes[i] === 'Rating Matchup') {
                question = generateRatingMatchup(player);
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
    }
};

// --- Game Flow and Rendering ---

const renderStartScreen = () => {
    const area = document.getElementById('game-area');
    const todayKey = getTodayDateKey();
    const savedChallenge = JSON.parse(localStorage.getItem(`dailyShift_${todayKey}`));

    if (savedChallenge && savedChallenge.completed) {
        // User has already played today, show debrief immediately (handled in loadGame, but safe check here)
        return;
    }
    
    area.innerHTML = `
        <div class="text-center space-y-6">
            <h2 class="text-2xl font-bold text-secondary-light">THE DAILY SHIFT CHALLENGE</h2>
            <p class="text-secondary-light/80">
                You have one attempt per day. Answer ${QUESTIONS_PER_SHIFT} questions in 60 seconds.
            </p>
            <div class="flex justify-around text-lg font-mono">
                <div class="p-4 border border-accent-cyan/50 rounded-lg">
                    <span class="text-accent-cyan block">Questions</span> 10
                </div>
                <div class="p-4 border border-accent-cyan/50 rounded-lg">
                    <span class="text-accent-cyan block">Time Limit</span> 60s
                </div>
            </div>
            <button id="start-button" class="accent-button w-full">INITIATE SHIFT (START)</button>
        </div>
    `;
    
    document.getElementById('start-button').addEventListener('click', startShift);
};

const startShift = () => {
    currentQuestionIndex = 0;
    correctAnswers = 0;
    score = 0;
    mistakes = [];
    startTime = Date.now();
    
    // Start Timer
    const timerElement = document.getElementById('game-timer');
    if (timerElement) {
        timerElement.remove(); // Remove old timer if it exists
    }
    
    const timerDisplay = document.createElement('div');
    timerDisplay.id = 'game-timer';
    timerDisplay.className = 'text-center text-3xl font-mono mb-4 text-accent-cyan glow-text';
    document.getElementById('app-container').prepend(timerDisplay);

    const updateTimer = () => {
        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        const remainingTime = TIME_LIMIT - elapsedTime;
        
        if (remainingTime <= 0) {
            clearInterval(timerInterval);
            endShift(true); // Time's up
        } else {
            timerDisplay.textContent = `TIME: ${remainingTime}s`;
        }
    };
    
    clearInterval(timerInterval); // Clear any existing interval
    timerInterval = setInterval(updateTimer, 1000);
    updateTimer(); // Initial call
    
    renderQuestion(dailyQuestions[currentQuestionIndex]);
};

const endShift = (timedOut = false) => {
    clearInterval(timerInterval);
    const timeElapsed = timedOut ? TIME_LIMIT : Math.floor((Date.now() - startTime) / 1000);
    const timeRemaining = TIME_LIMIT - timeElapsed;

    // Calculate final score
    const basePoints = correctAnswers * 100;
    const speedMultiplier = 1 + (timeRemaining > 0 ? timeRemaining / TIME_LIMIT : 0);
    const finalScore = Math.floor(basePoints * speedMultiplier);
    
    // Save completion status
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
    renderDebriefScreen(finalScore, correctAnswers, mistakes, timeElapsed);
};

const handleAnswer = (userAnswer) => {
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
    
    // Micro-animation and Feedback
    if (isCorrect) {
        correctAnswers++;
        score += 100; // Base points
        answeredButton.classList.add('pulse-correct');
    } else {
        // Incorrect Answer: Button briefly turns error red
        answeredButton.classList.add('flash-incorrect');
        
        // Record mistake for debrief screen
        mistakes.push({
            questionType: currentQuestion.type,
            questionText: currentQuestion.question,
            player: currentQuestion.player,
            uniqueTrait: currentQuestion.player.unique_trait,
            userAnswer: userAnswer,
            correctAnswer: currentQuestion.correctAnswer
        });

        // Highlight the correct answer in accent color
        options.forEach(button => {
            if (button.textContent.trim() === currentQuestion.correctAnswer) {
                button.classList.add('text-primary-dark', 'bg-accent-cyan');
            }
        });
    }

    // Move to next question after a brief delay
    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < QUESTIONS_PER_SHIFT) {
            renderQuestion(dailyQuestions[currentQuestionIndex]);
        } else {
            endShift();
        }
    }, 1000); // 1-second pause for feedback animation
};

const renderQuestion = (question) => {
    const area = document.getElementById('game-area');
    area.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between text-sm font-mono text-secondary-light/70">
                <span>SCORE: <span class="text-accent-cyan">${score}</span></span>
                <span>QUESTION ${currentQuestionIndex + 1}/${QUESTIONS_PER_SHIFT}</span>
            </div>

            <div class="p-4 md:p-6 rounded-lg border border-accent-cyan/10">
                <h3 class="text-xl text-accent-cyan mb-4">${question.type}</h3>
                <p class="text-secondary-light/90 mb-6 kinetic-text">${question.question}</p>
                
                ${renderQuestionDisplay(question)}

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6" id="options-grid">
                    ${question.options.map((option, index) => `
                        <button class="option-button w-full bg-secondary-light/10 text-secondary-light py-3 px-4 rounded-lg hover:bg-accent-cyan/20 transition-colors duration-150" data-answer="${option}">
                            ${option}
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    // Attach event listeners to options
    document.querySelectorAll('.option-button').forEach(button => {
        button.addEventListener('click', (e) => handleAnswer(e.target.dataset.answer));
    });
};

const renderQuestionDisplay = (question) => {
    // Player Card (Identity Check & Positional Drill)
    if (question.type === 'Identity Check' || question.type === 'Positional Drill') {
        const p = question.player;
        return `
            <div class="player-card p-4 mx-auto w-48 text-center">
                <p class="text-4xl font-bold text-accent-cyan">${p.rating}</p>
                <p class="text-xl text-secondary-light/80">${p.team_abbr}</p>
                <p class="text-lg text-secondary-light">${p.position.split('/')[0]}</p>
                ${question.type === 'Positional Drill' ? `<p class="text-2xl mt-2 font-bold">${p.player_name}</p>` : ''}
            </div>
        `;
    }
    
    // Rating Matchup
    if (question.type === 'Rating Matchup') {
        const pA = question.player;
        const pB = question.playerB;
        return `
            <div class="flex justify-center space-x-6">
                <div class="player-card p-4 w-48 text-center">
                    <p class="text-2xl font-bold text-secondary-light">PLAYER A</p>
                    <p class="text-xl text-secondary-light">${pA.player_name}</p>
                    <p class="text-lg text-accent-cyan/70">${pA.team_abbr}</p>
                </div>
                <div class="player-card p-4 w-48 text-center">
                    <p class="text-2xl font-bold text-secondary-light">PLAYER B</p>
                    <p class="text-xl text-secondary-light">${pB.player_name}</p>
                    <p class="text-lg text-accent-cyan/70">${pB.team_abbr}</p>
                </div>
            </div>
        `;
    }
    return '';
};


const renderDebriefScreen = (finalScore, finalCorrect, mistakes, timeElapsed) => {
    document.getElementById('game-timer').remove();
    const area = document.getElementById('game-area');
    const accuracy = ((finalCorrect / QUESTIONS_PER_SHIFT) * 100).toFixed(0);
    const timeRemaining = TIME_LIMIT - timeElapsed;
    const speedBonus = 1 + (timeRemaining > 0 ? timeRemaining / TIME_LIMIT : 0);
    const basePoints = finalCorrect * 100;
    
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

            <h4 class="text-xl font-bold text-error-red mt-8">MISTAKE REVIEW (${mistakes.length} ERRORS)</h4>
            <div class="space-y-4 text-left max-h-60 overflow-y-auto pr-2">
                ${mistakes.length === 0 ? `
                    <p class="text-lg text-secondary-light/80">PERFECT SHIFT! No review needed.</p>
                ` : mistakes.map(m => `
                    <div class="p-3 border border-error-red/50 rounded-lg bg-error-red/10">
                        <p class="font-bold text-error-red">${m.questionType}: ${m.questionText}</p>
                        <p class="text-sm mt-1">Your Answer: <span class="text-error-red">${m.userAnswer}</span></p>
                        <p class="text-sm">Correct Answer: <span class="text-accent-cyan">${m.correctAnswer}</span></p>
                        <p class="text-sm mt-2 text-secondary-light/90">
                            <span class="font-bold">Fact:</span> ${m.uniqueTrait}
                        </p>
                    </div>
                `).join('')}
            </div>
            
            <button class="accent-button w-full mt-8" disabled>
                DAILY SHIFT COMPLETE - RESET TOMORROW
            </button>
        </div>
    `;
};


// Start the application
document.addEventListener('DOMContentLoaded', loadGame);