// 游戏词库 - 将从文件中加载
let fullWordList = [];
let gameWordList = [];
const GAME_WORDS_COUNT = 1000; // 计时模式每次游戏使用的字符数量
const HISTORY_GAMES_COUNT = 10; // 10次游戏内不重复

// 游戏设置
const GAME_TIME = 60;       // 游戏总时间（秒）
const SKIP_CHANCES = 5;     // 跳过次数（总次数）
const ERROR_TIMEOUT = 1500; // 错误提示显示时间（毫秒）

// 闯关模式难度设置
const LEVELS = {
    easy: { name: '初露锋芒', count: 200 },
    medium: { name: '超凡入圣', count: 500 },
    hard: { name: '天外飞仙', count: 1000 }
};

// 旋转速度设置（秒/圈）
const ROTATION_SPEEDS = {
    slow: 1.2,       // 慢速 - 固定值
    medium: 0.8,     // 中速 - 固定值
    fast: 0.5,      // 快速 - 固定值
};

// 游戏状态
let gameRunning = false;
let currentWord = '';
let score = 0;
let timeLeft = GAME_TIME;
let skipChancesLeft = SKIP_CHANCES; // 剩余跳过次数
let gameTimer = null;
let gameMode = 'time';      // 'time'=计时模式, 'level'=闯关模式
let speedSetting = 'medium'; // 'slow'=慢速, 'medium'=中速, 'fast'=快速
let currentLevel = 1;       // 当前关卡（闯关模式）
let currentLevelDifficulty = 'easy'; // 当前等级难度
let usedWordIndices = new Set(); // 当前游戏中已使用的字的索引
let historyUsedWords = new Set(); // 历史游戏中已使用的字
let currentRotationSpeed = ROTATION_SPEEDS.medium; // 当前旋转速度

// DOM元素
const menuContainer = document.getElementById('menu-container');
const settingsContainer = document.getElementById('settings-container');
const gameContainer = document.getElementById('game-container');
const timerElement = document.getElementById('timer');
const timerLabel = document.getElementById('timer-label');
const scoreElement = document.getElementById('score');
const scoreLabel = document.getElementById('score-label');
const rotatingWordElement = document.getElementById('rotating-word');
const wordInput = document.getElementById('word-input');
const skipBtn = document.getElementById('skip-btn');
const skipTimerElement = document.getElementById('skip-timer');
const backBtn = document.getElementById('back-btn');
const settingsIcon = document.getElementById('settings-icon');
const themeIcon = document.getElementById('theme-icon');
const settingsCloseBtn = document.getElementById('settings-close-btn');
const clearRecordsBtn = document.getElementById('clear-records');
const errorMessage = document.getElementById('error-message');
const modeButtons = document.querySelectorAll('.mode-btn');
const speedButtons = document.querySelectorAll('.speed-btn');

// 记录元素
const timeModeRecord = document.getElementById('time-mode-record');
const easyLevelRecord = document.getElementById('easy-level-record');
const mediumLevelRecord = document.getElementById('medium-level-record');
const hardLevelRecord = document.getElementById('hard-level-record');

// 主题设置
let isDarkTheme = true; // 默认为暗色主题

// 从本地存储加载记录
function loadRecords() {
    const records = JSON.parse(localStorage.getItem('gameRecords')) || {
        timeMode: 0,
        easyLevel: 0,
        mediumLevel: 0,
        hardLevel: 0
    };
    
    timeModeRecord.textContent = records.timeMode;
    easyLevelRecord.textContent = `${records.easyLevel}/${LEVELS.easy.count}`;
    mediumLevelRecord.textContent = `${records.mediumLevel}/${LEVELS.medium.count}`;
    hardLevelRecord.textContent = `${records.hardLevel}/${LEVELS.hard.count}`;
}

// 保存记录到本地存储
function saveRecord(mode, value) {
    const records = JSON.parse(localStorage.getItem('gameRecords')) || {
        timeMode: 0,
        easyLevel: 0,
        mediumLevel: 0,
        hardLevel: 0
    };
    
    if (mode === 'time' && value > records.timeMode) {
        records.timeMode = value;
    } else if (mode === 'level') {
        if (currentLevelDifficulty === 'easy' && value > records.easyLevel) {
            records.easyLevel = value;
        } else if (currentLevelDifficulty === 'medium' && value > records.mediumLevel) {
            records.mediumLevel = value;
        } else if (currentLevelDifficulty === 'hard' && value > records.hardLevel) {
            records.hardLevel = value;
        }
    }
    
    localStorage.setItem('gameRecords', JSON.stringify(records));
    loadRecords();
}

// 清空记录
clearRecordsBtn.addEventListener('click', () => {
    if (confirm('确定要清空所有游戏记录吗？')) {
        localStorage.removeItem('gameRecords');
        loadRecords();
    }
});

// 模式按钮点击事件
modeButtons.forEach(button => {
    button.addEventListener('click', () => {
        gameMode = button.getAttribute('data-mode');
        menuContainer.style.display = 'none';
        gameContainer.style.display = 'flex';
        
        // 准备游戏词库，然后初始化游戏
        prepareGameWordList();
        initGame();
    });
});

// 速度设置事件
speedButtons.forEach(button => {
    button.addEventListener('click', () => {
        // 移除所有按钮的激活状态
        speedButtons.forEach(btn => btn.classList.remove('active'));
        // 添加当前按钮的激活状态
        button.classList.add('active');
        // 更新速度设置
        speedSetting = button.getAttribute('data-speed');
        // 立即更新旋转速度
        setRotationSpeed();
    });
});

// 设置图标点击事件
settingsIcon.addEventListener('click', () => {
    settingsContainer.style.display = 'flex';
});

// 关闭设置按钮点击事件
settingsCloseBtn.addEventListener('click', () => {
    settingsContainer.style.display = 'none';
});

// 返回菜单按钮点击事件
backBtn.addEventListener('click', () => {
    if (confirm('确定要退出游戏吗？')) {
        gameRunning = false;
        clearInterval(gameTimer);
        gameContainer.style.display = 'none';
        menuContainer.style.display = 'flex';
    }
});

// 游戏初始化
function initGame() {
    gameRunning = true;
    score = 0;
    currentLevel = 1;
    currentLevelDifficulty = 'easy';
    
    // 设置当前旋转速度
    currentRotationSpeed = ROTATION_SPEEDS[speedSetting];
    
    if (gameMode === 'time') {
        // 计时模式
        timeLeft = GAME_TIME;
        timerLabel.textContent = '时间';
        scoreLabel.textContent = '得分';
        startGameTimer();
    } else {
        // 闯关模式
        timerLabel.textContent = '关卡';
        scoreLabel.textContent = '剩余';
        timerElement.textContent = '1/' + LEVELS[currentLevelDifficulty].count;
        scoreElement.textContent = LEVELS[currentLevelDifficulty].count - score;
    }
    
    skipChancesLeft = SKIP_CHANCES;
    updateSkipTimer();
    
    nextWord();
    wordInput.focus();
}

// 开始游戏计时器（仅计时模式）
function startGameTimer() {
    clearInterval(gameTimer);
    gameTimer = setInterval(() => {
        timeLeft--;
        updateTimer();
        
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

// 更新计时/关卡显示
function updateTimer() {
    if (gameMode === 'time') {
        timerElement.textContent = timeLeft;
    } else {
        timerElement.textContent = currentLevel + '/' + LEVELS[currentLevelDifficulty].count;
    }
}

// 更新分数/剩余显示
function updateScore() {
    if (gameMode === 'time') {
        scoreElement.textContent = score;
    } else {
        scoreElement.textContent = LEVELS[currentLevelDifficulty].count - score;
    }
}

// 更新跳过按钮计时
function updateSkipTimer() {
    skipTimerElement.textContent = skipChancesLeft;
    
    // 更新跳过按钮的状态
    if (skipChancesLeft <= 0) {
        skipBtn.classList.add('disabled');
        skipBtn.disabled = true;
    } else {
        skipBtn.classList.remove('disabled');
        skipBtn.disabled = false;
    }
}

// 随机选择一个词
function getRandomWord() {
    // 确保不重复选择当前词
    let newWord;
    let attempts = 0;
    const maxAttempts = 100; // 防止无限循环
    
    do {
        // 如果gameWordList为空或者尝试次数过多，重新准备一批字
        if (gameWordList.length === 0 || attempts > maxAttempts) {
            prepareGameWordList();
        }
        
        const randomIndex = Math.floor(Math.random() * gameWordList.length);
        newWord = gameWordList[randomIndex];
        
        // 从游戏词库中移除已使用的字
        if (newWord !== currentWord) {
            gameWordList.splice(randomIndex, 1);
        }
        
        attempts++;
    } while (newWord === currentWord && attempts < maxAttempts);
    
    return newWord;
}

// 设置旋转速度
function setRotationSpeed() {
    // 根据当前速度设置设定旋转速度
    currentRotationSpeed = ROTATION_SPEEDS[speedSetting];
    rotatingWordElement.style.animation = `rotate ${currentRotationSpeed}s linear infinite, glow 2s ease-in-out infinite alternate`;
}

// 下一个词
function nextWord() {
    currentWord = getRandomWord();
    rotatingWordElement.textContent = currentWord;
    setRotationSpeed();
    wordInput.value = '';
    
    // 闯关模式更新关卡
    if (gameMode === 'level' && score > 0) {
        currentLevel++;
        updateTimer();
        
        // 切换难度等级
        if (currentLevelDifficulty === 'easy' && currentLevel > LEVELS.easy.count) {
            currentLevelDifficulty = 'medium';
            currentLevel = 1;
        } else if (currentLevelDifficulty === 'medium' && currentLevel > LEVELS.medium.count) {
            currentLevelDifficulty = 'hard';
            currentLevel = 1;
        }
    }
}

// 显示错误提示
function showError() {
    errorMessage.classList.add('show');
    
    // 输入框抖动效果
    wordInput.classList.add('shake');
    
    // 一段时间后自动隐藏错误提示
    setTimeout(() => {
        errorMessage.classList.remove('show');
        wordInput.classList.remove('shake');
    }, ERROR_TIMEOUT);
}

// 检查猜测
function checkGuess() {
    const guess = wordInput.value.trim();
    
    if (guess === '') return; // 忽略空输入
    
    if (guess === currentWord) {
        // 正确猜测
        score++;
        updateScore();
        nextWord();
        
        // 添加正确动画效果
        rotatingWordElement.classList.add('correct');
        setTimeout(() => {
            rotatingWordElement.classList.remove('correct');
        }, 300);
        
        // 闯关模式检查是否完成所有关卡
        if (gameMode === 'level') {
            if (currentLevelDifficulty === 'hard' && score >= LEVELS.hard.count) {
                endGame(true);
            } else {
                saveRecord('level', score);
            }
        }
    } else {
        // 错误猜测
        showError();
        wordInput.value = ''; // 清空输入
    }
}

// 结束游戏
function endGame(isCompleted = false) {
    gameRunning = false;
    clearInterval(gameTimer);
    
    if (gameMode === 'time') {
        alert(`游戏结束！你的最终得分：${score}`);
        saveRecord('time', score);
    } else {
        if (isCompleted) {
            alert(`恭喜你通过了所有关卡！`);
            saveRecord('level', LEVELS.hard.count);
        } else {
            alert(`游戏结束！你完成了 ${score} 个关卡。`);
            saveRecord('level', score);
        }
    }
    
    // 返回主菜单
    gameContainer.style.display = 'none';
    menuContainer.style.display = 'flex';
}

// 事件监听
wordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        checkGuess();
    }
});

skipBtn.addEventListener('click', () => {
    if (gameRunning && skipChancesLeft > 0) {
        // 减少跳过次数
        skipChancesLeft--;
        // 更新显示
        updateSkipTimer();
        // 跳到下一个字
        nextWord();
    }
});

// 添加正确和错误动画样式
const style = document.createElement('style');
style.textContent = `
    .rotating-word.correct {
        transform: scale(1.2);
        color: #8ffe00;
    }
    
    #word-input.shake {
        animation: shake 0.5s ease-in-out;
    }
`;
document.head.appendChild(style);

// 页面加载完成后自动初始化界面
document.addEventListener('DOMContentLoaded', function() {
    // 加载字库
    loadWordList();
    
    // 加载主题设置
    loadThemeSetting();
    
    // 加载游戏记录
    loadRecords();
    
    // 确保所有元素都已加载
    menuContainer.style.display = 'flex';
    gameContainer.style.display = 'none';
    settingsContainer.style.display = 'none';
    
    // 初始化速度选择
    speedButtons.forEach(button => {
        if (button.getAttribute('data-speed') === speedSetting) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
});

// 加载汉字库
function loadWordList() {
    fetch('ziku/现代汉语常用字表.txt')
        .then(response => response.text())
        .then(text => {
            // 提取汉字字符
            const matches = text.match(/\s+\d+\s+(\S+)\s+\d+/g);
            if (matches) {
                fullWordList = matches.map(match => {
                    const parts = match.trim().split(/\s+/);
                    if (parts.length >= 2) {
                        return parts[1];
                    }
                    return null;
                }).filter(char => char !== null);
                
                console.log(`成功加载${fullWordList.length}个汉字`);

                // 加载历史使用过的字
                loadHistoryWords();
            } else {
                console.error('无法从文件中提取汉字');
                // 使用备用字库
                fullWordList = ['物', '理', '化', '生', '数', '学', '语', '文',
                               '爱', '好', '游', '戏', '电', '脑', '手', '机',
                               '天', '地', '人', '山', '水', '木', '火', '土',
                               '春', '夏', '秋', '冬', '风', '雨', '雷', '电'];
            }
        })
        .catch(error => {
            console.error('加载字库文件失败:', error);
            // 使用备用字库
            fullWordList = ['物', '理', '化', '生', '数', '学', '语', '文',
                           '爱', '好', '游', '戏', '电', '脑', '手', '机',
                           '天', '地', '人', '山', '水', '木', '火', '土',
                           '春', '夏', '秋', '冬', '风', '雨', '雷', '电'];
        });
}

// 加载历史使用过的字
function loadHistoryWords() {
    const historyWords = localStorage.getItem('historyUsedWords');
    if (historyWords) {
        historyUsedWords = new Set(JSON.parse(historyWords));
        console.log(`加载了${historyUsedWords.size}个历史使用过的字`);
    }
}

// 保存历史使用过的字
function saveHistoryWords() {
    // 如果历史记录太多，清空重新开始
    if (historyUsedWords.size > fullWordList.length * 0.9) {
        historyUsedWords.clear();
    }
    localStorage.setItem('historyUsedWords', JSON.stringify(Array.from(historyUsedWords)));
}

// 准备游戏词库 - 根据游戏模式选择字符
function prepareGameWordList() {
    gameWordList = [];
    usedWordIndices.clear();
    
    if (gameMode === 'time') {
        // 计时模式：从未在历史中使用过的字中选择
        prepareTimeModeDictionary();
    } else {
        // 闯关模式：随机使用整个字库
        prepareLevelModeDictionary();
    }
    
    console.log(`准备了${gameWordList.length}个字供游戏使用`);
}

// 为计时模式准备词库 - 10次游戏内不重复
function prepareTimeModeDictionary() {
    // 创建可用字符索引列表（排除历史使用过的）
    const availableIndices = [];
    for (let i = 0; i < fullWordList.length; i++) {
        if (!historyUsedWords.has(fullWordList[i])) {
            availableIndices.push(i);
        }
    }
    
    // 如果可用字符不足，则重置历史记录
    if (availableIndices.length < GAME_WORDS_COUNT) {
        console.log('可用字符不足，重置历史记录');
        historyUsedWords.clear();
        for (let i = 0; i < fullWordList.length; i++) {
            availableIndices.push(i);
        }
    }
    
    // 随机选择指定数量的字符
    const maxCount = Math.min(availableIndices.length, GAME_WORDS_COUNT);
    while (gameWordList.length < maxCount && availableIndices.length > 0) {
        const randomPosition = Math.floor(Math.random() * availableIndices.length);
        const randomIndex = availableIndices[randomPosition];
        
        // 从可用列表中移除
        availableIndices.splice(randomPosition, 1);
        
        // 添加到游戏词库
        const word = fullWordList[randomIndex];
        gameWordList.push(word);
        
        // 添加到当前游戏使用记录和历史记录
        usedWordIndices.add(randomIndex);
        historyUsedWords.add(word);
    }
    
    // 保存到本地存储
    saveHistoryWords();
}

// 为闯关模式准备词库 - 随机使用整个字库
function prepareLevelModeDictionary() {
    // 闯关模式直接随机使用整个字库
    const shuffledIndices = [];
    for (let i = 0; i < fullWordList.length; i++) {
        shuffledIndices.push(i);
    }
    
    // 随机打乱顺序
    for (let i = shuffledIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
    }
    
    // 取前面部分作为游戏词库
    const maxLevel = Math.max(LEVELS.easy.count, LEVELS.medium.count, LEVELS.hard.count);
    const neededCount = Math.min(fullWordList.length, maxLevel * 2); // 预留足够的字符
    
    for (let i = 0; i < neededCount && i < shuffledIndices.length; i++) {
        const index = shuffledIndices[i];
        gameWordList.push(fullWordList[index]);
    }
}

// 主题图标点击事件
themeIcon.addEventListener('click', () => {
    toggleTheme();
});

// 切换主题
function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    
    if (isDarkTheme) {
        // 切换为暗色模式
        document.body.classList.remove('light-theme');
        themeIcon.textContent = '☀️'; // 显示亮色图标（表示可切换到亮色）
    } else {
        // 切换为亮色模式
        document.body.classList.add('light-theme');
        themeIcon.textContent = '🌙'; // 显示暗色图标（表示可切换到暗色）
    }
    
    // 保存主题设置到本地存储
    localStorage.setItem('isDarkTheme', isDarkTheme.toString());
}

// 加载保存的主题设置
function loadThemeSetting() {
    const savedTheme = localStorage.getItem('isDarkTheme');
    if (savedTheme !== null) {
        isDarkTheme = savedTheme === 'true';
        if (!isDarkTheme) {
            document.body.classList.add('light-theme');
            themeIcon.textContent = '🌙';
        }
    }
} 