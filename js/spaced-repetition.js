// 间隔重复算法 - 严格按照Anki逻辑
class SpacedRepetition {
    static calculateNextReview(progress, quality) {
        // quality: 1=again, 2=hard, 3=good, 4=easy
        const now = Date.now();
        let interval = progress.interval || 0;
        let easeFactor = progress.easeFactor || 2.5;
        let graduated = false; // 是否从学习阶段毕业

        if (progress.status === 'new' || progress.status === 'learning') {
            // 学习阶段
            if (quality < 3) {
                // 回答错误，重新开始学习步骤
                progress.learningStep = 0;
                interval = quality === 1 ? 1 : 6; // 1分钟或6分钟
                progress.status = 'learning';
            } else {
                // 回答正确，进入下一个学习步骤
                const learningSteps = [1, 10]; // 1分钟，10分钟
                progress.learningStep = (progress.learningStep || 0) + 1;
                
                if (progress.learningStep >= learningSteps.length) {
                    // 完成学习阶段，毕业到复习
                    interval = quality === 3 ? 1 : 4; // 1天或4天
                    progress.status = 'review';
                    graduated = true;
                } else {
                    // 还在学习阶段
                    interval = learningSteps[progress.learningStep];
                    progress.status = 'learning';
                }
            }
        } else {
            // 复习阶段
            if (quality < 3) {
                // 回答错误，回到学习阶段
                progress.learningStep = 0;
                interval = 1; // 1分钟
                progress.status = 'learning';
                // 降低难度因子
                easeFactor = Math.max(1.3, easeFactor - 0.2);
            } else {
                // 回答正确，计算新的复习间隔
                if (interval === 0) interval = 1;
                
                // 调整难度因子
                easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
                easeFactor = Math.max(1.3, easeFactor);
                
                // 计算新间隔
                interval = Math.round(interval * easeFactor);
                
                // 根据间隔长度确定状态
                if (interval >= 21) {
                    progress.status = 'review';
                }
                if (interval >= 180) {
                    progress.status = 'mastered';
                }
                graduated = true;
            }
        }

        progress.interval = interval;
        progress.easeFactor = easeFactor;
        progress.reviewCount++;
        progress.lastReviewed = now;
        
        // 计算下次复习时间
        const nextReview = now + (interval * (interval < 60 ? 60000 : 86400000)); // 分钟或天
        progress.nextReview = nextReview;

        return { progress, graduated };
    }

    static getDueCards() {
        const now = Date.now();
        const dueCards = [];
        
        // 遍历所有课程的所有语法
        Object.values(lessonsData).forEach(lesson => {
            lesson.grammar.forEach(grammar => {
                const progress = StorageManager.getCardProgress(grammar.id);
                if (progress.nextReview && progress.nextReview <= now) {
                    dueCards.push({...grammar, progress});
                }
            });
        });
        
        return dueCards;
    }

    static getNewCards(limit = 20) {
        const newCards = [];
        
        // 遍历所有课程的所有语法
        Object.values(lessonsData).forEach(lesson => {
            lesson.grammar.forEach(grammar => {
                const progress = StorageManager.getCardProgress(grammar.id);
                if (progress.status === 'new' && newCards.length < limit) {
                    newCards.push({...grammar, progress});
                }
            });
        });
        
        return newCards;
    }
}