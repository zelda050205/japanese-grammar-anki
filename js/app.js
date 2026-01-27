// 应用状态
let currentMode = 'menu';
let currentLesson = null;
let currentStudyCards = [];
let currentCardIndex = 0;
let isCardFlipped = false;
let studyMode = 'learn';
let parsedData = null;

// 初始化应用
function initApp() {
    console.log('🔄 强制重置所有数据...');
    localStorage.clear();
    localStorage.setItem('appInitialized', 'true');
    console.log('✅ 系统已完全重置，准备接收新内容');
    
    updateStats();
    updateCounts();
}

// 更新统计信息
function updateStats() {
    const stats = StorageManager.getTodayStats();
    document.getElementById('today-new').textContent = stats.newCards || 0;
    document.getElementById('today-review').textContent = stats.reviewCards || 0;
    
    const dueCount = SpacedRepetition.getDueCards().length;
    document.getElementById('due-count').textContent = dueCount;
}

function updateCounts() {
    const newCards = SpacedRepetition.getNewCards().length;
    const dueCards = SpacedRepetition.getDueCards().length;
    
    document.getElementById('new-count').textContent = newCards;
    document.getElementById('review-count').textContent = dueCards;
}

// 显示课程列表
function showLessonList(mode) {
    studyMode = mode;
    currentMode = 'lesson-list';
    
    document.getElementById('main-menu').classList.remove('active');
    document.getElementById('lesson-list').classList.add('active');
    
    const title = mode === 'learn' ? '选择要学习的课程' : '浏览课程';
    document.getElementById('lesson-list-title').textContent = title;
    
    renderLessonList();
}

function renderLessonList() {
    const container = document.getElementById('lessons-container');
    container.innerHTML = '';
    
    Object.entries(lessonsData).forEach(([lessonId, lesson]) => {
        const lessonDiv = document.createElement('div');
        lessonDiv.className = 'lesson-item';
        lessonDiv.onclick = () => selectLesson(lessonId);
        
        const totalGrammar = lesson.grammar.length;
        let learnedCount = 0;
        lesson.grammar.forEach(grammar => {
            const progress = StorageManager.getCardProgress(grammar.id);
            if (progress.status !== 'new') learnedCount++;
        });
        
        const progressPercent = totalGrammar > 0 ? (learnedCount / totalGrammar) * 100 : 0;
        
        lessonDiv.innerHTML = `
            <div>
                <div class="lesson-title">${lesson.title}</div>
                <div class="lesson-subtitle">${lesson.subtitle}</div>
            </div>
            <div class="lesson-progress">
                <div class="progress-text">${learnedCount}/${totalGrammar}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%"></div>
                </div>
            </div>
        `;
        
        container.appendChild(lessonDiv);
    });
}

function selectLesson(lessonId) {
    currentLesson = lessonId;
    const lesson = lessonsData[lessonId];
    
    if (studyMode === 'learn') {
        startLessonStudy(lessonId);
    } else {
        showGrammarList(lessonId);
    }
}

function showGrammarList(lessonId) {
    currentMode = 'grammar-list';
    document.getElementById('lesson-list').classList.remove('active');
    document.getElementById('grammar-list').classList.add('active');
    
    const lesson = lessonsData[lessonId];
    document.getElementById('grammar-list-title').textContent = lesson.title;
    
    renderGrammarList(lesson.grammar);
}

function renderGrammarList(grammarList) {
    const container = document.getElementById('grammar-container');
    container.innerHTML = '';
    
    if (grammarList.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; margin-top: 50px;">暂无语法内容，请先上传语法文档</p>';
        return;
    }
    
    grammarList.forEach(grammar => {
        const progress = StorageManager.getCardProgress(grammar.id);
        const grammarDiv = document.createElement('div');
        grammarDiv.className = 'grammar-item';
        grammarDiv.onclick = () => studySingleGrammar(grammar);
        
        let statusClass = 'status-new';
        let statusText = '新语法';
        let nextReviewText = '';
        
        switch(progress.status) {
            case 'learning':
                statusClass = 'status-learning';
                statusText = '学习中';
                break;
            case 'review':
                statusClass = 'status-review';
                statusText = '复习中';
                if (progress.nextReview) {
                    const nextDate = new Date(progress.nextReview);
                    nextReviewText = nextDate > new Date() ? 
                        `下次复习: ${nextDate.toLocaleDateString()}` : '待复习';
                }
                break;
            case 'mastered':
                statusClass = 'status-mastered';
                statusText = '已掌握';
                break;
        }
        
        grammarDiv.innerHTML = `
            <div class="grammar-pattern">${grammar.pattern}</div>
            <div class="grammar-meaning">${grammar.meaning}</div>
            <div class="grammar-status">
                <span class="status-badge ${statusClass}">${statusText}</span>
                <span class="next-review">${nextReviewText}</span>
            </div>
        `;
        
        container.appendChild(grammarDiv);
    });
}

// 开始学习
function startLessonStudy(lessonId) {
    const lesson = lessonsData[lessonId];
    const newCards = lesson.grammar.filter(grammar => {
        const progress = StorageManager.getCardProgress(grammar.id);
        return progress.status === 'new';
    });
    
    if (newCards.length === 0) {
        alert('这一课的所有语法都已经学过了！');
        return;
    }
    
    currentStudyCards = newCards.slice(0, 5);
    startStudySession();
}

function startReview() {
    const dueCards = SpacedRepetition.getDueCards();
    
    if (dueCards.length === 0) {
        alert('暂时没有需要复习的语法！');
        return;
    }
    
    currentStudyCards = dueCards;
    studyMode = 'review';
    startStudySession();
}

function studySingleGrammar(grammar) {
    currentStudyCards = [grammar];
    studyMode = 'browse';
    startStudySession();
}

function startStudySession() {
    currentMode = 'study';
    currentCardIndex = 0;
    isCardFlipped = false;
    
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById('study-screen').classList.add('active');
    
    showCurrentCard();
}

function showCurrentCard() {
    if (currentCardIndex >= currentStudyCards.length) {
        finishStudySession();
        return;
    }
    
    const card = currentStudyCards[currentCardIndex];
    isCardFlipped = false;
    
    const progressText = `第 ${currentCardIndex + 1} 张 / 共 ${currentStudyCards.length} 张`;
    document.getElementById('study-progress-text').textContent = progressText;
    
    const progressPercent = ((currentCardIndex + 1) / currentStudyCards.length) * 100;
    document.getElementById('study-progress-bar').style.width = progressPercent + '%';
    
    document.getElementById('study-pattern').textContent = card.pattern;
    document.getElementById('card-front').classList.remove('hidden');
    document.getElementById('card-back').classList.add('hidden');
    document.getElementById('study-buttons').classList.add('hidden');
    
    document.getElementById('study-meaning').textContent = card.meaning;
    document.getElementById('study-connection').textContent = card.connection;
    document.getElementById('study-notes').textContent = card.notes;
    
    displayExamples(card.examples);
}

function displayExamples(examples) {
    const container = document.getElementById('study-examples');
    container.innerHTML = '<h4 style="margin-top: 0; color: #333;">例句：</h4>';
    
    if (!examples || examples.length === 0) {
        container.innerHTML += '<p style="color: #666;">暂无例句</p>';
        return;
    }
    
    const currentCard = currentStudyCards[currentCardIndex];
    
    examples.forEach((example, index) => {
        const exampleDiv = document.createElement('div');
        exampleDiv.className = 'example-item';
        exampleDiv.onclick = () => speakJapanese(example.japanese);
        
        const processedJapanese = processJapaneseText(example.japanese, example.furigana, currentCard.pattern);
        
        exampleDiv.innerHTML = `
            <div class="example-japanese">${processedJapanese}</div>
            <div class="example-chinese">${example.chinese}</div>
        `;
        
        container.appendChild(exampleDiv);
    });
}

function processJapaneseText(japanese, furigana, grammarPattern) {
    const furiganaMatches = furigana.match(/([^(]+)\\(([^)]+)\\)/g) || [];
    let processedText = japanese;
    
    const furiganaMap = {};
    furiganaMatches.forEach(match => {
        const [, kanji, reading] = match.match(/([^(]+)\\(([^)]+)\\)/);
        furiganaMap[kanji] = reading;
    });
    
    const currentCard = currentStudyCards[currentCardIndex];
    const currentLesson = getCurrentLessonFromCard(currentCard);
    const allGrammarKeywords = getAllGrammarKeywordsFromLesson(currentLesson);
    
    let result = processedText;
    
    allGrammarKeywords.forEach(keyword => {
        if (result.includes(keyword)) {
            const regex = new RegExp(`(?<!<[^>]*>)${escapeRegExp(keyword)}(?![^<]*>)`, 'g');
            result = result.replace(regex, `<span class="grammar-highlight">${keyword}</span>`);
        }
    });
    
    Object.keys(furiganaMap).forEach(kanji => {
        const reading = furiganaMap[kanji];
        if (result.includes(kanji) && !result.includes(`<span class="grammar-highlight">${kanji}</span>`)) {
            const regex = new RegExp(`(?<!<[^>]*>)${escapeRegExp(kanji)}(?![^<]*>)`, 'g');
            result = result.replace(regex, 
                `<span class="furigana-text">${kanji}<span class="furigana">${reading}</span></span>`);
        }
    });
    
    return result;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
}

function getCurrentLessonFromCard(card) {
    for (const [lessonId, lesson] of Object.entries(lessonsData)) {
        if (lesson.grammar.some(g => g.id === card.id)) {
            return lesson;
        }
    }
    return null;
}

function getAllGrammarKeywordsFromLesson(lesson) {
    if (!lesson) return [];
    
    const allKeywords = new Set();
    
    lesson.grammar.forEach(grammar => {
        const keywords = extractGrammarKeywords(grammar.pattern);
        keywords.forEach(keyword => allKeywords.add(keyword));
    });
    
    return Array.from(allKeywords).sort((a, b) => b.length - a.length);
}

function extractGrammarKeywords(pattern) {
    const keywords = [];
    
    const cleanPattern = pattern.replace(/[～〜]/g, '').replace(/[（）()]/g, '');
    
    if (pattern.includes('際')) {
        keywords.push('際は', '際に', '際');
    }
    if (pattern.includes('に際して')) {
        keywords.push('に際して');
    }
    if (pattern.includes('にあたって')) {
        keywords.push('にあたって');
    }
    if (pattern.includes('とたん')) {
        keywords.push('とたんに', 'とたん');
    }
    if (pattern.includes('うちに')) {
        keywords.push('うちに');
    }
    if (pattern.includes('最中')) {
        keywords.push('最中に', '最中だ', '最中');
    }
    if (pattern.includes('ばかりだ')) {
        keywords.push('ばかりだ', 'ばかり');
    }
    if (pattern.includes('一方だ')) {
        keywords.push('一方だ', '一方');
    }
    
    const dynamicKeywords = extractDynamicKeywords(cleanPattern);
    keywords.push(...dynamicKeywords);
    
    return [...new Set(keywords)].sort((a, b) => b.length - a.length);
}

function extractDynamicKeywords(pattern) {
    const keywords = [];
    
    const hiraganaMatches = pattern.match(/[ぁ-ゟ]+/g) || [];
    const katakanaMatches = pattern.match(/[ァ-ヿ]+/g) || [];
    
    keywords.push(...hiraganaMatches);
    keywords.push(...katakanaMatches);
    
    const kanjiMatches = pattern.match(/[一-龯]+/g) || [];
    keywords.push(...kanjiMatches);
    
    return keywords.filter(k => k.length >= 2);
}

function flipCard() {
    if (isCardFlipped) return;
    
    isCardFlipped = true;
    document.getElementById('card-front').classList.add('hidden');
    document.getElementById('card-back').classList.remove('hidden');
    document.getElementById('study-buttons').classList.remove('hidden');
    
    updateButtonIntervals();
}

function updateButtonIntervals() {
    const card = currentStudyCards[currentCardIndex];
    const progress = StorageManager.getCardProgress(card.id);
    
    let intervals = {};
    
    if (progress.status === 'new' || progress.status === 'learning') {
        intervals = {
            1: '1分钟',
            2: '6分钟',
            3: progress.learningStep === 0 ? '10分钟' : '1天',
            4: '4天'
        };
    } else {
        const currentInterval = progress.interval || 1;
        const easeFactor = progress.easeFactor || 2.5;
        
        intervals = {
            1: '1分钟',
            2: '6分钟',
            3: `${Math.round(currentInterval * easeFactor)}天`,
            4: `${Math.round(currentInterval * easeFactor * 1.3)}天`
        };
    }
    
    document.querySelector('.btn-again small').textContent = intervals[1];
    document.querySelector('.btn-hard small').textContent = intervals[2];
    document.querySelector('.btn-good small').textContent = intervals[3];
    document.querySelector('.btn-easy small').textContent = intervals[4];
}

function answerCard(quality) {
    const card = currentStudyCards[currentCardIndex];
    let progress = StorageManager.getCardProgress(card.id);
    
    const result = SpacedRepetition.calculateNextReview(progress, quality);
    progress = result.progress;
    const graduated = result.graduated;
    
    StorageManager.saveCardProgress(card.id, progress);
    
    if (progress.reviewCount === 1) {
        StorageManager.updateTodayStats('new');
    } else {
        StorageManager.updateTodayStats('review');
    }
    
    if (!graduated) {
        const reinsertPosition = Math.min(currentCardIndex + 3, currentStudyCards.length);
        const cardToReinsert = {...card};
        cardToReinsert.progress = progress;
        
        if (reinsertPosition < currentStudyCards.length) {
            currentStudyCards.splice(reinsertPosition, 0, cardToReinsert);
        } else {
            currentStudyCards.push(cardToReinsert);
        }
    }
    
    currentCardIndex++;
    setTimeout(() => {
        showCurrentCard();
    }, 300);
}

function finishStudySession() {
    alert('学习完成！');
    backToMenu();
}

function speakJapanese(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 0.8;
        speechSynthesis.speak(utterance);
    }
}

// 导航功能
function backToMenu() {
    currentMode = 'menu';
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById('main-menu').classList.add('active');
    
    updateStats();
    updateCounts();
}

function backToLessonList() {
    document.getElementById('grammar-list').classList.remove('active');
    document.getElementById('lesson-list').classList.add('active');
    currentMode = 'lesson-list';
}

// 统计功能
function showStats() {
    currentMode = 'stats';
    document.getElementById('main-menu').classList.remove('active');
    document.getElementById('stats-screen').classList.add('active');
    
    renderStats();
}

function renderStats() {
    const container = document.getElementById('stats-content');
    
    let totalCards = 0;
    let newCards = 0;
    let learningCards = 0;
    let reviewCards = 0;
    let masteredCards = 0;
    
    Object.values(lessonsData).forEach(lesson => {
        lesson.grammar.forEach(grammar => {
            totalCards++;
            const progress = StorageManager.getCardProgress(grammar.id);
            switch(progress.status) {
                case 'new': newCards++; break;
                case 'learning': learningCards++; break;
                case 'review': reviewCards++; break;
                case 'mastered': masteredCards++; break;
            }
        });
    });
    
    const todayStats = StorageManager.getTodayStats();
    
    container.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 15px;">
            <h3 style="margin-bottom: 15px; color: #333;">今日学习</h3>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>新学语法：</span>
                <span style="color: #007bff; font-weight: bold;">${todayStats.newCards || 0} 个</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>复习语法：</span>
                <span style="color: #28a745; font-weight: bold;">${todayStats.reviewCards || 0} 个</span>
            </div>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 15px;">
            <h3 style="margin-bottom: 15px; color: #333;">总体进度</h3>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>总语法数：</span>
                <span style="font-weight: bold;">${totalCards} 个</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>新语法：</span>
                <span style="color: #6c757d; font-weight: bold;">${newCards} 个</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>学习中：</span>
                <span style="color: #ffc107; font-weight: bold;">${learningCards} 个</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>复习中：</span>
                <span style="color: #28a745; font-weight: bold;">${reviewCards} 个</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>已掌握：</span>
                <span style="color: #6f42c1; font-weight: bold;">${masteredCards} 个</span>
            </div>
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 10px;">
            <h3 style="margin-bottom: 15px; color: #333;">学习进度</h3>
            <div style="background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden; margin-bottom: 10px;">
                <div style="height: 100%; background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%); width: ${totalCards > 0 ? ((totalCards - newCards) / totalCards) * 100 : 0}%; transition: width 0.3s ease;"></div>
            </div>
            <div style="text-align: center; color: #666; font-size: 14px;">
                已学习 ${totalCards - newCards} / ${totalCards} 个语法 (${totalCards > 0 ? Math.round(((totalCards - newCards) / totalCards) * 100) : 0}%)
            </div>
        </div>
    `;
}

// 上传功能
function showUpload() {
    currentMode = 'upload';
    document.getElementById('main-menu').classList.remove('active');
    document.getElementById('upload-screen').classList.add('active');
    
    initUploadArea();
}

function initUploadArea() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const uploadResult = document.getElementById('upload-result');
    
    uploadResult.style.display = 'none';
    parsedData = null;
    
    uploadArea.onclick = () => fileInput.click();
    
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
    };
    
    uploadArea.ondragover = (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    };
    
    uploadArea.ondragleave = () => {
        uploadArea.classList.remove('dragover');
    };
    
    uploadArea.ondrop = (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                handleFileUpload(file);
            } else {
                showError('请选择 .txt 格式的文件');
            }
        }
    };
}

function handleFileUpload(file) {
    if (!file.name.endsWith('.txt')) {
        showError('请选择 .txt 格式的文件');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        try {
            parsedData = parseGrammarFile(content);
            displayParseResult(parsedData);
        } catch (error) {
            showError('文件解析失败：' + error.message);
        }
    };
    
    reader.onerror = () => {
        showError('文件读取失败，请重试');
    };
    
    reader.readAsText(file, 'UTF-8');
}

function parseGrammarFile(content) {
    const lines = content.split('\\n').map(line => line.trim()).filter(line => line);
    const lessons = {};
    let currentLesson = null;
    let currentGrammar = null;
    let parseState = 'looking_for_lesson';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.match(/^第\\d+课$/)) {
            const lessonNumber = parseInt(line.match(/\\d+/)[0]);
            currentLesson = lessonNumber;
            
            if (!lessons[currentLesson]) {
                lessons[currentLesson] = {
                    title: lessonsData[currentLesson] ? lessonsData[currentLesson].title : line,
                    subtitle: lessonsData[currentLesson] ? lessonsData[currentLesson].subtitle : "自定义语法",
                    grammar: []
                };
            }
            parseState = 'looking_for_example';
            continue;
        }
        
        if (!currentLesson) {
            continue;
        }
        
        if (parseState === 'looking_for_example') {
            const grammarId = Date.now() + Math.random() + lessons[currentLesson].grammar.length;
            currentGrammar = {
                id: grammarId,
                pattern: '',
                meaning: '',
                connection: '',
                notes: '',
                examples: [{
                    japanese: line,
                    furigana: line,
                    chinese: ''
                }]
            };
            parseState = 'looking_for_translation';
            continue;
        }
        
        if (parseState === 'looking_for_translation') {
            if (currentGrammar && currentGrammar.examples.length > 0) {
                currentGrammar.examples[0].chinese = line;
            }
            parseState = 'looking_for_grammar';
            continue;
        }
        
        if (parseState === 'looking_for_grammar') {
            if (line.includes('「') && line.includes('」')) {
                const grammarMatch = line.match(/「([^」]+)」[：:]\s*(.+)/);
                if (grammarMatch) {
                    const grammarPattern = grammarMatch[1];
                    const explanation = grammarMatch[2];
                    
                    currentGrammar.pattern = grammarPattern;
                    currentGrammar.meaning = explanation;
                    
                    if (currentGrammar.examples[0]) {
                        currentGrammar.examples[0].furigana = highlightGrammarInSentence(
                            currentGrammar.examples[0].japanese, 
                            grammarPattern
                        );
                    }
                }
                
                lessons[currentLesson].grammar.push(currentGrammar);
                currentGrammar = null;
                parseState = 'looking_for_example';
            } else {
                if (currentGrammar) {
                    currentGrammar.notes += (currentGrammar.notes ? ' ' : '') + line;
                }
            }
            continue;
        }
    }
    
    if (currentGrammar && currentLesson) {
        lessons[currentLesson].grammar.push(currentGrammar);
    }
    
    if (Object.keys(lessons).length === 0) {
        throw new Error('未找到有效的语法内容，请检查文件格式');
    }
    
    return lessons;
}

function highlightGrammarInSentence(sentence, grammarPattern) {
    return sentence;
}

function displayParseResult(data) {
    const resultDiv = document.getElementById('upload-result');
    const parseResultDiv = document.getElementById('parse-result');
    
    let html = '';
    let totalGrammar = 0;
    
    Object.entries(data).forEach(([lessonId, lesson]) => {
        totalGrammar += lesson.grammar.length;
        
        html += `
            <div class="parsed-lesson">
                <h4>${lesson.title} (${lesson.grammar.length} 个语法)</h4>
        `;
        
        lesson.grammar.forEach((grammar, index) => {
            html += `
                <div class="parsed-grammar">
                    <div class="parsed-pattern">${grammar.pattern}</div>
                    <div class="parsed-meaning">${grammar.meaning}</div>
                    ${grammar.connection ? `<div class="parsed-meaning">接续：${grammar.connection}</div>` : ''}
                    ${grammar.notes ? `<div class="parsed-meaning">注意：${grammar.notes}</div>` : ''}
                    <div class="parsed-examples">
                        ${grammar.examples.length} 个例句
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    });
    
    parseResultDiv.innerHTML = `
        <div class="success-message">
            ✅ 解析成功！共找到 ${Object.keys(data).length} 个课程，${totalGrammar} 个语法条目
        </div>
        ${html}
    `;
    
    resultDiv.style.display = 'block';
}

function confirmUpload() {
    if (!parsedData) {
        showError('没有可添加的数据');
        return;
    }
    
    try {
        Object.entries(parsedData).forEach(([lessonId, lesson]) => {
            if (lessonsData[lessonId]) {
                lessonsData[lessonId].grammar = lessonsData[lessonId].grammar.concat(lesson.grammar);
            } else {
                lessonsData[lessonId] = lesson;
            }
        });
        
        localStorage.setItem('customLessons', JSON.stringify(lessonsData));
        
        showSuccess('语法内容已成功添加到系统中！');
        
        updateStats();
        updateCounts();
        
        setTimeout(() => {
            backToMenu();
        }, 3000);
        
    } catch (error) {
        showError('添加失败：' + error.message);
    }
}

function cancelUpload() {
    parsedData = null;
    document.getElementById('upload-result').style.display = 'none';
    document.getElementById('file-input').value = '';
}

function showError(message) {
    const parseResultDiv = document.getElementById('parse-result');
    parseResultDiv.innerHTML = `
        <div class="error-message">
            ❌ ${message}
        </div>
    `;
    document.getElementById('upload-result').style.display = 'block';
}

function showSuccess(message) {
    const parseResultDiv = document.getElementById('parse-result');
    parseResultDiv.innerHTML = `
        <div class="success-message">
            ✅ ${message}
        </div>
    `;
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});
