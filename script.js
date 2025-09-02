class SuanpanMathTrainer {
    constructor() {
        this.currentProblem = 0;
        this.totalProblems = 0;
        this.correctAnswers = 0;
        this.startTime = null;
        this.problems = [];
        this.timerInterval = null;
        this.records = JSON.parse(localStorage.getItem('suanpanRecords') || '[]');
        
        this.initializeElements();
        this.attachEventListeners();
        this.displayLeaderboard();
    }

    initializeElements() {
        this.elements = {
            settingsPanel: document.getElementById('settingsPanel'),
            gameArea: document.getElementById('gameArea'),
            resultsArea: document.getElementById('resultsArea'),
            startBtn: document.getElementById('startBtn'),
            backToSettings: document.getElementById('backToSettings'),
            restartBtn: document.getElementById('restartBtn'),
            maxDigits: document.getElementById('maxDigits'),
            problemCount: document.getElementById('problemCount'),
            numbersInProblem: document.getElementById('numbersInProblem'),
            operationType: document.getElementById('operationType'),
            allowRemainders: document.getElementById('allowRemainders'),
            problemText: document.getElementById('problemText'),
            answerInput: document.getElementById('answerInput'),
            feedback: document.getElementById('feedback'),
            progressFill: document.getElementById('progressFill'),
            progressText: document.getElementById('progressText'),
            timer: document.getElementById('timer'),
            finalTime: document.getElementById('finalTime'),
            accuracy: document.getElementById('accuracy'),
            problemsPerMin: document.getElementById('problemsPerMin'),
            leaderboardList: document.getElementById('leaderboardList'),
            leaderboardFilter: document.getElementById('leaderboardFilter'),
            clearRecords: document.getElementById('clearRecords')
        };
    }

    attachEventListeners() {
        this.elements.startBtn.addEventListener('click', () => this.startPractice());
        this.elements.backToSettings.addEventListener('click', () => this.backToSettings());
        this.elements.restartBtn.addEventListener('click', () => this.backToSettings());
        this.elements.answerInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.checkAnswer();
            }
        });
        this.elements.leaderboardFilter.addEventListener('change', () => this.displayLeaderboard());
        this.elements.clearRecords.addEventListener('click', () => this.clearRecords());
    }

    generateNumber(digits) {
        if (digits === 1) {
            return Math.floor(Math.random() * 9) + 1;
        }
        
        const min = Math.pow(10, digits - 1);
        const max = Math.pow(10, digits) - 1;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    generateProblem() {
        const maxDigits = parseInt(this.elements.maxDigits.value);
        const numbersCount = parseInt(this.elements.numbersInProblem.value);
        const operationType = this.elements.operationType.value;
        
        let operation;
        if (operationType === 'mixed') {
            const operations = ['addition', 'subtraction', 'multiplication', 'division'];
            operation = operations[Math.floor(Math.random() * operations.length)];
        } else {
            operation = operationType;
        }

        const numbers = [];
        
        if (operation === 'division') {
            const divisor = this.generateNumber(Math.min(maxDigits, 3));
            let dividend;
            
            if (this.elements.allowRemainders.checked) {
                dividend = this.generateNumber(maxDigits);
            } else {
                const quotient = this.generateNumber(Math.max(1, maxDigits - 2));
                dividend = divisor * quotient;
            }
            
            numbers.push(dividend, divisor);
        } else {
            for (let i = 0; i < numbersCount; i++) {
                const digits = Math.floor(Math.random() * maxDigits) + 1;
                numbers.push(this.generateNumber(digits));
            }
        }

        return {
            numbers: numbers,
            operation: operation,
            answer: this.calculateAnswer(numbers, operation)
        };
    }

    calculateAnswer(numbers, operation) {
        switch (operation) {
            case 'addition':
                return numbers.reduce((sum, num) => sum + num, 0);
            case 'subtraction':
                return numbers.reduce((diff, num, index) => index === 0 ? num : diff - num);
            case 'multiplication':
                return numbers.reduce((product, num) => product * num, 1);
            case 'division':
                const result = numbers[0] / numbers[1];
                if (this.elements.allowRemainders.checked) {
                    const quotient = Math.floor(result);
                    const remainder = numbers[0] % numbers[1];
                    return remainder === 0 ? quotient : `${quotient}r${remainder}`;
                } else {
                    return result;
                }
            default:
                return 0;
        }
    }

    formatProblem(problem) {
        const { numbers, operation } = problem;
        let symbol;
        
        switch (operation) {
            case 'addition': symbol = '+'; break;
            case 'subtraction': symbol = '−'; break;
            case 'multiplication': symbol = '×'; break;
            case 'division': symbol = '÷'; break;
        }

        if (numbers.length === 2) {
            return `${numbers[0]} ${symbol} ${numbers[1]} = ?`;
        } else {
            return numbers.slice(0, -1).join(` ${symbol} `) + ` ${symbol} ${numbers[numbers.length - 1]} = ?`;
        }
    }

    startPractice() {
        this.totalProblems = parseInt(this.elements.problemCount.value);
        this.currentProblem = 0;
        this.correctAnswers = 0;
        this.problems = [];
        
        // Generate all problems
        for (let i = 0; i < this.totalProblems; i++) {
            this.problems.push(this.generateProblem());
        }
        
        this.elements.settingsPanel.style.display = 'none';
        this.elements.gameArea.style.display = 'block';
        this.elements.resultsArea.style.display = 'none';
        
        this.startTime = Date.now();
        this.startTimer();
        this.showNextProblem();
    }

    showNextProblem() {
        if (this.currentProblem >= this.totalProblems) {
            this.endPractice();
            return;
        }

        const problem = this.problems[this.currentProblem];
        this.elements.problemText.textContent = this.formatProblem(problem);
        this.elements.answerInput.value = '';
        this.elements.answerInput.focus();
        this.elements.feedback.textContent = '';
        this.elements.feedback.className = '';
        
        this.updateProgress();
    }

    updateProgress() {
        const percentage = (this.currentProblem / this.totalProblems) * 100;
        this.elements.progressFill.style.width = `${percentage}%`;
        this.elements.progressText.textContent = `${this.currentProblem} / ${this.totalProblems}`;
    }

    checkAnswer() {
        const userAnswer = this.elements.answerInput.value.trim();
        if (!userAnswer) return;

        const problem = this.problems[this.currentProblem];
        const correctAnswer = problem.answer.toString();
        
        let isCorrect = false;
        
        if (typeof problem.answer === 'string' && problem.answer.includes('r')) {
            const normalizedUser = userAnswer.toLowerCase().replace(/\s/g, '');
            const normalizedCorrect = correctAnswer.toLowerCase();
            isCorrect = normalizedUser === normalizedCorrect;
        } else {
            isCorrect = parseFloat(userAnswer) === parseFloat(correctAnswer);
        }

        if (isCorrect) {
            this.correctAnswers++;
            this.elements.feedback.textContent = 'Correct!';
            this.elements.feedback.className = 'feedback-correct';
        } else {
            this.elements.feedback.textContent = 'Incorrect';
            this.elements.feedback.className = 'feedback-incorrect';
        }
        
        // Always advance to next problem after a short delay
        setTimeout(() => {
            this.currentProblem++;
            this.showNextProblem();
        }, 800);
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            this.elements.timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 100);
    }

    endPractice() {
        clearInterval(this.timerInterval);
        
        const endTime = Date.now();
        const totalTime = endTime - this.startTime;
        const minutes = Math.floor(totalTime / 60000);
        const seconds = Math.floor((totalTime % 60000) / 1000);
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        const accuracy = ((this.correctAnswers / this.totalProblems) * 100).toFixed(1);
        const problemsPerMin = ((this.totalProblems / (totalTime / 60000))).toFixed(1);
        
        this.elements.finalTime.textContent = timeString;
        this.elements.accuracy.textContent = `${accuracy}%`;
        this.elements.problemsPerMin.textContent = problemsPerMin;
        
        // Save to leaderboard
        this.saveRecord({
            operation: this.elements.operationType.value,
            digits: `${this.elements.maxDigits.value} max`,
            problems: this.totalProblems,
            time: timeString,
            accuracy: parseFloat(accuracy),
            problemsPerMin: parseFloat(problemsPerMin),
            date: new Date().toLocaleDateString(),
            totalTimeMs: totalTime
        });
        
        this.elements.gameArea.style.display = 'none';
        this.elements.resultsArea.style.display = 'block';
        this.displayLeaderboard();
    }

    saveRecord(record) {
        this.records.push(record);
        
        // Sort by problems per minute (descending)
        this.records.sort((a, b) => b.problemsPerMin - a.problemsPerMin);
        
        // Keep only top 50 records
        this.records = this.records.slice(0, 50);
        
        localStorage.setItem('suanpanRecords', JSON.stringify(this.records));
    }

    displayLeaderboard() {
        const filter = this.elements.leaderboardFilter.value;
        let filteredRecords = this.records;
        
        if (filter !== 'all') {
            filteredRecords = this.records.filter(record => record.operation === filter);
        }
        
        if (filteredRecords.length === 0) {
            this.elements.leaderboardList.innerHTML = '<p style="text-align: center; color: #718096;">No records yet. Complete a practice session to see your records here!</p>';
            return;
        }
        
        const html = filteredRecords.slice(0, 10).map((record, index) => `
            <div class="record-item">
                <div>
                    <div class="record-details">
                        #${index + 1} • ${record.operation} • ${record.digits} • ${record.problems} problems • ${record.accuracy}% accuracy
                    </div>
                    <div style="font-size: 12px; color: #a0aec0;">${record.date}</div>
                </div>
                <div class="record-time">
                    ${record.problemsPerMin}/min<br>
                    <span style="font-size: 0.9em; color: #718096;">${record.time}</span>
                </div>
            </div>
        `).join('');
        
        this.elements.leaderboardList.innerHTML = html;
    }

    clearRecords() {
        if (confirm('are you sure?')) {
            this.records = [];
            localStorage.removeItem('suanpanRecords');
            this.displayLeaderboard();
        }
    }

    backToSettings() {
        clearInterval(this.timerInterval);
        this.elements.settingsPanel.style.display = 'block';
        this.elements.gameArea.style.display = 'none';
        this.elements.resultsArea.style.display = 'none';
        this.elements.timer.textContent = '00:00';
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new SuanpanMathTrainer();
});