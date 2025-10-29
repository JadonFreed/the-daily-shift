document.addEventListener('DOMContentLoaded', () => {
    
    // --- DOM Elements ---
    const screens = {
        start: document.getElementById('start-screen'),
        game: document.getElementById('game-screen'),
        debrief: document.getElementById('debrief-screen')
    };
    const buttons = {
        start: document.getElementById('start-button'),
        playAgain: document.getElementById('play-again-button')
    };
    const hud = {
        timer: document.getElementById('timer'),
        counter: document.getElementById('question-counter'),
        score: document.getElementById('score-display')
    };
    const questionArea = {
        title: document.getElementById('question-title'),
        content: document.getElementById('question-content'),
        options: document.getElementById('answer-options')
    };
    const debriefStats = {
        score: document.getElementById('final-score'),
        accuracy: document.getElementById('final-accuracy'),
        time: document.getElementById('final-time'),
        review: document.getElementById('mistake-review-area')
    };
    const localStats = {
        highScore: document.getElementById('local-high-score'),
        streak: document.getElementById('local-streak')
    };

    // --- Game State ---
    let allPlayers = [];
    let dailyQuestions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let timeLeft = 60;
    let timerInterval = null;
    let mistakes = [];
    const TOTAL_QUESTIONS = 10;
    const GAME_TIME = 60;

    // --- Core Game Functions ---

    /**
     * Initializes the game: loads player data and sets up start button.
     */
    async function initGame() {
        try {
            const response = await fetch('./nhl_players.json');
            if (!response.ok) throw new Error('Failed to load player data.');
            allPlayers = await response.json();
            
            // Filter out players with missing data if any
            allPlayers = allPlayers.filter(p => p.player_name && p.position && p.rating && p.team_abbr);

            console.log(`Loaded ${allPlayers.length} players.`);
            buttons.start.addEventListener('click', startGame);
            buttons.playAgain.addEventListener('click', () => showScreen('start'));
            updateLocalStats();
        } catch (error) {
            console.error(error);
            questionArea.title.textContent = "Error loading game data. Please refresh.";
        }
    }

    /**
     * Resets state variables and starts the game loop.
     */
    function startGame() {
        currentQuestionIndex = 0;
        score = 0;
        timeLeft = GAME_TIME;
        mistakes = [];
        dailyQuestions = generateDailyQuestions();
        
        updateHUD();
        displayQuestion();
        startTimer();
        showScreen('game');
    }

    /**
     * Ends the game, calculates score, and shows debrief screen.
     */
    function endGame() {
        clearInterval(timerInterval);
        showScreen('debrief');
        
        const timeTaken = GAME_TIME - timeLeft;
        const accuracy = (score / TOTAL_QUESTIONS) * 100;
        const speedMultiplier = 1 + (timeLeft / GAME_TIME); // Multiplier based on time left
        const finalScore = Math.round((score * 10) * speedMultiplier); // 10 base points per correct * multiplier

        // Display stats
        debriefStats.score.textContent = finalScore;
        debriefStats.accuracy.textContent = `${accuracy.toFixed(0)}%`;
        debriefStats.time.textContent = `${timeTaken}s`;
        
        displayMistakeReview();
        
        // Update localStorage
        updateLocalStorage(finalScore, accuracy === 100);
    }

    // --- Screen & HUD ---

    /**
     * Manages which game screen is visible.
     * @param {string} screenName - 'start', 'game', or 'debrief'
     */
    function showScreen(screenName) {
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        screens[screenName].classList.add('active');
    }

    /**
     * Updates the timer, question counter, and score display.
     */
    function updateHUD() {
        hud.counter.textContent = `${currentQuestionIndex + 1} / ${TOTAL_QUESTIONS}`;
        hud.score.textContent = score * 10; // Show score as base points (10 per)
    }

    /**
     * Starts the 60-second countdown timer.
     */
    function startTimer() {
        clearInterval(timerInterval);
        hud.timer.textContent = `0:${timeLeft < 10 ? '0' : ''}${timeLeft}`;
        
        timerInterval = setInterval(() => {
            timeLeft--;
            hud.timer.textContent = `0:${timeLeft < 10 ? '0' : ''}${timeLeft}`;
            if (timeLeft <= 0) {
                endGame();
            }
        }, 1000);
    }

    // --- Question Generation & Display ---

    /**
     * Creates an array of 10 random questions from the three modes.
     */
    function generateDailyQuestions() {
        const questions = [];
        const modes = ['identity', 'position', 'rating'];
        
        for (let i = 0; i < TOTAL_QUESTIONS; i++) {
            const mode = modes[Math.floor(Math.random() * modes.length)];
            questions.push(generateQuestion(mode));
        }
        return questions;
    }

    /**
     * Generates a single question object based on mode.
     * @param {string} mode - 'identity', 'position', or 'rating'
     */
    function generateQuestion(mode) {
        switch (mode) {
            case 'identity': {
                const [correctPlayer, ...decoys] = getRandomPlayers(4);
                const options = shuffle([correctPlayer.player_name, decoys[0].player_name, decoys[1].player_name, decoys[2].player_name]);
                return { type: 'identity', player: correctPlayer, options, answer: correctPlayer.player_name };
            }
            case 'position': {
                const player = getRandomPlayers(1)[0];
                const allPos = ['C', 'LW', 'RW', 'D', 'G'];
                // Handle multi-positions like 'C/RW'
                const correctPos = player.position.split('/')[0].trim(); 
                const decoyPos = shuffle(allPos.filter(p => p !== correctPos)).slice(0, 3);
                const options = shuffle([correctPos, ...decoyPos]);
                return { type: 'position', player, options, answer: correctPos };
            }
            case 'rating': {
                const [playerA, playerB] = getRandomPlayers(2);
                // Determine correct answer (higher rating)
                const answer = playerA.rating >= playerB.rating ? playerA.player_name : playerB.player_name;
                return { type: 'rating', playerA, playerB, answer };
            }
        }
    }

    /**
     * Renders the current question to the DOM.
     */
    function displayQuestion() {
        if (currentQuestionIndex >= TOTAL_QUESTIONS) {
            endGame();
            return;
        }

        const q = dailyQuestions[currentQuestionIndex];
        questionArea.content.innerHTML = '';
        questionArea.options.innerHTML = '';

        switch (q.type) {
            case 'identity':
                questionArea.title.textContent = 'Identity Check';
                questionArea.content.innerHTML = `
                    <div class="player-card">
                        <div class="player-card-rating">${q.player.rating}</div>
                        <div class="player-card-details">${q.player.position} | ${q.player.team_abbr}</div>
                    </div>
                `;
                q.options.forEach(name => {
                    const btn = createAnswerButton(name, () => handleAnswer(name === q.answer, q, btn));
                    questionArea.options.appendChild(btn);
                });
                break;
            
            case 'position':
                questionArea.title.textContent = 'Positional Drill';
                questionArea.content.innerHTML = `
                    <h3 class="kinetic-text-question">${q.player.player_name}</h3>
                    <p class="kinetic-text-team">${q.player.team_name}</p>
                `;
                q.options.forEach(pos => {
                    const btn = createAnswerButton(pos, () => handleAnswer(pos === q.answer, q, btn));
                    questionArea.options.appendChild(btn);
                });
                break;

            case 'rating':
                questionArea.title.textContent = 'Rating Matchup';
                // Buttons are created in the content area for H2H
                const btnA = createMatchupButton(q.playerA, () => handleAnswer(q.playerA.rating >= q.playerB.rating, q, btnA));
                const btnB = createMatchupButton(q.playerB, () => handleAnswer(q.playerB.rating >= q.playerA.rating, q, btnB));
                const vs = document.createElement('span');
                vs.className = 'vs-text';
                vs.textContent = 'VS';
                
                questionArea.content.className = 'matchup-container';
                questionArea.content.append(btnA, vs, btnB);
                break;
        }
    }

    /**
     * Helper to create a standard multiple-choice button.
     */
    function createAnswerButton(text, onClick) {
        const btn = document.createElement('button');
        btn.className = 'answer-option';
        btn.textContent = text;
        btn.onclick = onClick;
        return btn;
    }

    /**
     * Helper to create a head-to-head matchup button.
     */
    function createMatchupButton(player, onClick) {
        const btn = document.createElement('button');
        btn.className = 'matchup-player';
        btn.innerHTML = `<h3>${player.player_name}</h3><p>${player.team_abbr}</p>`;
        btn.onclick = onClick;
        return btn;
    }

    // --- Answer Handling & Feedback ---

    /**
     * Processes the user's answer, provides feedback, and advances the game.
     * @param {boolean} isCorrect - If the user's choice was correct.
     * @param {object} questionData - The data for the question.
     * @param {HTMLElement} clickedButton - The button element the user clicked.
     */
    function handleAnswer(isCorrect, questionData, clickedButton) {
        // Disable all buttons to prevent double-clicks
        document.querySelectorAll('#answer-options button, #question-content button').forEach(b => b.disabled = true);

        if (isCorrect) {
            score++;
            clickedButton.classList.add('correct');
        } else {
            clickedButton.classList.add('incorrect');
            mistakes.push(questionData);
            
            // If incorrect, also highlight the correct answer
            highlightCorrectAnswer(questionData);
        }

        setTimeout(() => {
            currentQuestionIndex++;
            updateHUD();
            displayQuestion();
        }, 800); // Wait for feedback animation
    }

    /**
     * Finds and highlights the correct answer if the user was wrong.
     */
    function highlightCorrectAnswer(q) {
        let correctButton;
        if (q.type === 'rating') {
            // Find the button with the correct player name
            const buttons = questionArea.content.querySelectorAll('.matchup-player');
            buttons.forEach(btn => {
                if (btn.innerHTML.includes(q.answer)) {
                    correctButton = btn;
                }
            });
        } else {
            // Find the button with the correct text content
            const buttons = questionArea.options.querySelectorAll('.answer-option');
            buttons.forEach(btn => {
                if (btn.textContent === q.answer) {
                    correctButton = btn;
                }
            });
        }
        
        if (correctButton && !correctButton.classList.contains('incorrect')) {
            correctButton.classList.add('correct');
        }
    }

    /**
     * Populates the mistake review section on the debrief screen.
     */
    function displayMistakeReview() {
        debriefStats.review.innerHTML = ''; // Clear previous
        if (mistakes.length === 0) {
            debriefStats.review.innerHTML = '<p>Perfect Shift! No mistakes.</p>';
            return;
        }

        mistakes.forEach(q => {
            let questionText = '';
            let correctAnswer = '';
            let trait = '';

            switch (q.type) {
                case 'identity':
                    questionText = `Identity Check for: ${q.player.team_abbr}, ${q.player.position}, ${q.player.rating} Rating`;
                    correctAnswer = q.player.player_name;
                    trait = q.player.unique_trait;
                    break;
                case 'position':
                    questionText = `Position for: ${q.player.player_name}`;
                    correctAnswer = q.answer;
                    trait = q.player.unique_trait;
                    break;
                case 'rating':
                    questionText = `Rating Matchup: ${q.playerA.player_name} (${q.playerA.rating}) vs ${q.playerB.player_name} (${q.playerB.rating})`;
                    correctAnswer = q.answer; // Name of the player with the higher rating
                    trait = allPlayers.find(p => p.player_name === q.answer)?.unique_trait || '';
                    break;
            }

            const card = document.createElement('div');
            card.className = 'mistake-card';
            card.innerHTML = `
                <p class="mistake-question"><b>You Missed:</b> ${questionText}</p>
                <p class="mistake-answer"><b>Correct Answer:</b> ${correctAnswer}</p>
                <p class="mistake-trait">${trait}</p>
            `;
            debriefStats.review.appendChild(card);
        });
    }

    // --- LocalStorage & Stats ---

    function updateLocalStats() {
        const highScore = localStorage.getItem('dailyShiftHighScore') || 0;
        const streak = localStorage.getItem('dailyShiftStreak') || 0;
        localStats.highScore.textContent = highScore;
        localStats.streak.textContent = streak;
    }

    function updateLocalStorage(newScore, wasPerfect) {
        // High Score
        const oldHighScore = localStorage.getItem('dailyShiftHighScore') || 0;
        if (newScore > oldHighScore) {
            localStorage.setItem('dailyShiftHighScore', newScore);
        }
        
        // Streak (Simplified: resets on non-perfect game)
        let currentStreak = parseInt(localStorage.getItem('dailyShiftStreak') || 0);
        if (wasPerfect) {
            currentStreak++;
        } else {
            currentStreak = 0; // Streak breaks
        }
        localStorage.setItem('dailyShiftStreak', currentStreak);

        // Update display on start screen
        updateLocalStats();
    }


    // --- Utility Helpers ---

    /**
     * Gets a specified number of unique random players.
     * @param {number} count - Number of players to get.
     */
    function getRandomPlayers(count) {
        return shuffle([...allPlayers]).slice(0, count);
    }

    /**
     * Shuffles an array in place using Fisher-Yates.
     * @param {Array} array - The array to shuffle.
     */
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // --- Start The Game ---
    initGame();
});