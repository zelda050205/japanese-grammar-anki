// 本地存储管理
class StorageManager {
    static getCardProgress(cardId) {
        const progress = localStorage.getItem('cardProgress');
        const data = progress ? JSON.parse(progress) : {};
        return data[cardId] || {
            id: cardId,
            status: 'new', // new, learning, review, mastered
            interval: 0,
            easeFactor: 2.5,
            reviewCount: 0,
            lastReviewed: null,
            nextReview: null
        };
    }

    static saveCardProgress(cardId, progress) {
        const allProgress = localStorage.getItem('cardProgress');
        const data = allProgress ? JSON.parse(allProgress) : {};
        data[cardId] = progress;
        localStorage.setItem('cardProgress', JSON.stringify(data));
    }

    static getTodayStats() {
        const today = new Date().toDateString();
        const stats = localStorage.getItem('todayStats');
        const data = stats ? JSON.parse(stats) : {};
        
        if (data.date !== today) {
            return { date: today, newCards: 0, reviewCards: 0 };
        }
        return data;
    }

    static updateTodayStats(type) {
        const today = new Date().toDateString();
        let stats = this.getTodayStats();
        
        if (type === 'new') {
            stats.newCards = (stats.newCards || 0) + 1;
        } else if (type === 'review') {
            stats.reviewCards = (stats.reviewCards || 0) + 1;
        }
        
        stats.date = today;
        localStorage.setItem('todayStats', JSON.stringify(stats));
    }
}