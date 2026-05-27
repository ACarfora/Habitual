const Storage = (() => {
    const HABITS_KEY = 'habitual_habits';
    const COMPLETIONS_KEY = 'habitual_completions';

    function formatDateKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function getTodayKey() {
        return formatDateKey(new Date());
    }

    function loadHabits() {
        const raw = localStorage.getItem(HABITS_KEY);
        if (!raw) return [];
        try { return JSON.parse(raw); } catch { return []; }
    }

    function saveHabits(habits) {
        localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
    }

    function loadCompletions() {
        const raw = localStorage.getItem(COMPLETIONS_KEY);
        if (!raw) return {};
        try { return JSON.parse(raw); } catch { return {}; }
    }

    function saveCompletions(completions) {
        localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(completions));
    }

    function isCompletedToday(habitId) {
        const completions = loadCompletions();
        const today = getTodayKey();
        return !!(completions[today] && completions[today][habitId]);
    }

    function toggleCompletion(habitId) {
        const completions = loadCompletions();
        const today = getTodayKey();
        if (!completions[today]) completions[today] = {};

        if (completions[today][habitId]) {
            delete completions[today][habitId];
        } else {
            completions[today][habitId] = true;
        }
        saveCompletions(completions);
        return !!completions[today][habitId];
    }

    function getStreak(habitId) {
        const completions = loadCompletions();
        let streak = 0;
        const date = new Date();

        const todayKey = getTodayKey();
        if (completions[todayKey] && completions[todayKey][habitId]) {
            streak = 1;
        } else {
            date.setDate(date.getDate() - 1);
        }

        if (streak === 1) {
            date.setDate(date.getDate() - 1);
        }

        while (true) {
            const key = formatDateKey(date);
            if (completions[key] && completions[key][habitId]) {
                streak++;
                date.setDate(date.getDate() - 1);
            } else {
                break;
            }
        }

        return streak;
    }

    // Returns an array of { date, ratio } for the last N days
    // ratio = completedHabits / totalHabits for that day (0 to 1)
    function getActivityData(days) {
        const completions = loadCompletions();
        const habits = loadHabits();
        const totalHabits = habits.length;
        const habitIds = new Set(habits.map(h => h.id));
        const data = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const key = formatDateKey(date);
            let completed = 0;

            if (completions[key]) {
                for (const id of Object.keys(completions[key])) {
                    if (habitIds.has(id)) completed++;
                }
            }

            const ratio = totalHabits > 0 ? completed / totalHabits : 0;
            data.push({
                date: key,
                ratio: ratio,
                completed: completed,
                total: totalHabits,
                isToday: i === 0,
            });
        }

        return data;
    }

    function pruneOldData() {
        const completions = loadCompletions();
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 400);
        const cutoffKey = formatDateKey(cutoff);

        let changed = false;
        for (const key of Object.keys(completions)) {
            if (key < cutoffKey) {
                delete completions[key];
                changed = true;
            }
        }
        if (changed) saveCompletions(completions);
    }

    // --- Archive ---

    const ARCHIVED_KEY = 'habitual_archived';

    function loadArchivedHabits() {
        const raw = localStorage.getItem(ARCHIVED_KEY);
        if (!raw) return [];
        try { return JSON.parse(raw); } catch { return []; }
    }

    function saveArchivedHabits(habits) {
        localStorage.setItem(ARCHIVED_KEY, JSON.stringify(habits));
    }

    function archiveHabit(habitId) {
        const habits = loadHabits();
        const index = habits.findIndex(h => h.id === habitId);
        if (index === -1) return;

        const [habit] = habits.splice(index, 1);
        habit.archivedAt = getTodayKey();
        saveHabits(habits);

        const archived = loadArchivedHabits();
        archived.push(habit);
        saveArchivedHabits(archived);
    }

    function restoreHabit(habitId) {
        const archived = loadArchivedHabits();
        const index = archived.findIndex(h => h.id === habitId);
        if (index === -1) return;

        const [habit] = archived.splice(index, 1);
        delete habit.archivedAt;
        saveArchivedHabits(archived);

        const habits = loadHabits();
        habits.push(habit);
        saveHabits(habits);
    }

    function permanentlyDeleteHabit(habitId) {
        const archived = loadArchivedHabits().filter(h => h.id !== habitId);
        saveArchivedHabits(archived);
    }

    // --- Training ---

    const TRAINING_BLOCKS_KEY = 'habitual_training_blocks';
    const TRAINING_ACTIVE_KEY = 'habitual_training_active_block';
    const TRAINING_TICKS_KEY = 'habitual_training_ticks';
    const TRAINING_ACTIVITY_KEY = 'habitual_training_activity';

    function loadTrainingBlocks() {
        const raw = localStorage.getItem(TRAINING_BLOCKS_KEY);
        if (!raw) return [];
        try { return JSON.parse(raw); } catch { return []; }
    }

    function saveTrainingBlocks(blocks) {
        localStorage.setItem(TRAINING_BLOCKS_KEY, JSON.stringify(blocks));
    }

    function loadActiveBlockId() {
        return localStorage.getItem(TRAINING_ACTIVE_KEY) || '';
    }

    function saveActiveBlockId(id) {
        if (id) localStorage.setItem(TRAINING_ACTIVE_KEY, id);
        else localStorage.removeItem(TRAINING_ACTIVE_KEY);
    }

    function loadTrainingTicks() {
        const raw = localStorage.getItem(TRAINING_TICKS_KEY);
        if (!raw) return {};
        try { return JSON.parse(raw); } catch { return {}; }
    }

    function saveTrainingTicks(ticks) {
        localStorage.setItem(TRAINING_TICKS_KEY, JSON.stringify(ticks));
    }

    function loadTrainingActivity() {
        const raw = localStorage.getItem(TRAINING_ACTIVITY_KEY);
        if (!raw) return {};
        try { return JSON.parse(raw); } catch { return {}; }
    }

    function saveTrainingActivity(activity) {
        localStorage.setItem(TRAINING_ACTIVITY_KEY, JSON.stringify(activity));
    }

    function createTrainingBlock(name, days) {
        const blocks = loadTrainingBlocks();
        const block = {
            id: 'tb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            name: name,
            days: days,
            createdAt: getTodayKey(),
            cyclesCompleted: 0,
        };
        blocks.push(block);
        saveTrainingBlocks(blocks);
        if (!loadActiveBlockId()) saveActiveBlockId(block.id);
        return block;
    }

    function updateTrainingBlock(id, updates) {
        const blocks = loadTrainingBlocks();
        const block = blocks.find(b => b.id === id);
        if (!block) return null;

        if (updates.name !== undefined) block.name = updates.name;
        if (updates.days !== undefined) {
            block.days = updates.days;
            // If day count shrank, prune ticks pointing to removed indices
            const ticks = loadTrainingTicks();
            if (ticks[id]) {
                const activity = loadTrainingActivity();
                Object.keys(ticks[id]).forEach(idxStr => {
                    const idx = parseInt(idxStr, 10);
                    if (idx >= block.days.length) {
                        const tickDate = ticks[id][idxStr];
                        delete ticks[id][idxStr];
                        if (activity[tickDate]) {
                            activity[tickDate]--;
                            if (activity[tickDate] <= 0) delete activity[tickDate];
                        }
                    }
                });
                if (Object.keys(ticks[id]).length === 0) delete ticks[id];
                saveTrainingTicks(ticks);
                saveTrainingActivity(activity);
            }
        }
        saveTrainingBlocks(blocks);
        return block;
    }

    function deleteTrainingBlock(id) {
        const blocks = loadTrainingBlocks().filter(b => b.id !== id);
        saveTrainingBlocks(blocks);

        const ticks = loadTrainingTicks();
        if (ticks[id]) {
            delete ticks[id];
            saveTrainingTicks(ticks);
        }

        if (loadActiveBlockId() === id) {
            saveActiveBlockId(blocks.length > 0 ? blocks[0].id : '');
        }
    }

    function getActiveBlock() {
        const blocks = loadTrainingBlocks();
        if (blocks.length === 0) return null;
        const activeId = loadActiveBlockId();
        return blocks.find(b => b.id === activeId) || blocks[0];
    }

    function getBlockTicks(blockId) {
        const ticks = loadTrainingTicks();
        return ticks[blockId] || {};
    }

    function isTrainingDayTicked(blockId, dayIndex) {
        const blockTicks = getBlockTicks(blockId);
        return Object.prototype.hasOwnProperty.call(blockTicks, String(dayIndex));
    }

    // Returns { cycleCompleted: bool } — true when this tick completed a cycle
    function toggleTrainingDay(blockId, dayIndex) {
        const blocks = loadTrainingBlocks();
        const block = blocks.find(b => b.id === blockId);
        if (!block) return { cycleCompleted: false };

        const ticks = loadTrainingTicks();
        const activity = loadTrainingActivity();
        if (!ticks[blockId]) ticks[blockId] = {};

        const key = String(dayIndex);
        const today = getTodayKey();

        if (Object.prototype.hasOwnProperty.call(ticks[blockId], key)) {
            // Un-tick: decrement activity for the date the tick was made
            const tickDate = ticks[blockId][key];
            delete ticks[blockId][key];
            if (activity[tickDate]) {
                activity[tickDate]--;
                if (activity[tickDate] <= 0) delete activity[tickDate];
            }
            if (Object.keys(ticks[blockId]).length === 0) delete ticks[blockId];
            saveTrainingTicks(ticks);
            saveTrainingActivity(activity);
            return { cycleCompleted: false };
        }

        // Tick: record date, increment today's activity
        ticks[blockId][key] = today;
        activity[today] = (activity[today] || 0) + 1;

        // Cycle complete check
        const cycleCompleted = Object.keys(ticks[blockId]).length === block.days.length;
        if (cycleCompleted) {
            block.cyclesCompleted = (block.cyclesCompleted || 0) + 1;
            delete ticks[blockId];
            saveTrainingBlocks(blocks);
        }

        saveTrainingTicks(ticks);
        saveTrainingActivity(activity);
        return { cycleCompleted };
    }

    function getTrainingStreak() {
        const activity = loadTrainingActivity();
        let streak = 0;
        const date = new Date();
        const todayKey = getTodayKey();

        if (activity[todayKey]) {
            streak = activity[todayKey];
        }
        date.setDate(date.getDate() - 1);

        while (true) {
            const key = formatDateKey(date);
            if (activity[key]) {
                streak += activity[key];
                date.setDate(date.getDate() - 1);
            } else {
                break;
            }
        }
        return streak;
    }

    function getTotalCyclesCompleted() {
        return loadTrainingBlocks().reduce((sum, b) => sum + (b.cyclesCompleted || 0), 0);
    }

    // For the training heatmap: array of { date, ratio } for the last N days
    function getTrainingActivityData(days) {
        const activity = loadTrainingActivity();
        const data = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const key = formatDateKey(date);
            const count = activity[key] || 0;
            let ratio = 0;
            if (count === 1) ratio = 0.33;
            else if (count === 2) ratio = 0.66;
            else if (count >= 3) ratio = 1;
            data.push({ date: key, count, ratio, isToday: i === 0 });
        }
        return data;
    }

    // --- Sync ---

    const LAST_MODIFIED_KEY = 'habitual_last_modified';

    function getLastModified() {
        return parseInt(localStorage.getItem(LAST_MODIFIED_KEY), 10) || 0;
    }

    function touchLastModified() {
        const now = Date.now();
        localStorage.setItem(LAST_MODIFIED_KEY, now);
        return now;
    }

    function exportAll() {
        return {
            habits: loadHabits(),
            completions: loadCompletions(),
            archived: loadArchivedHabits(),
            trainingBlocks: loadTrainingBlocks(),
            trainingActiveBlock: loadActiveBlockId(),
            trainingTicks: loadTrainingTicks(),
            trainingActivity: loadTrainingActivity(),
            lastModified: getLastModified(),
        };
    }

    function importAll(data) {
        if (data.habits) saveHabits(data.habits);
        if (data.completions) saveCompletions(data.completions);
        if (data.archived) saveArchivedHabits(data.archived);
        if (data.trainingBlocks) saveTrainingBlocks(data.trainingBlocks);
        if (data.trainingActiveBlock !== undefined) saveActiveBlockId(data.trainingActiveBlock);
        if (data.trainingTicks) saveTrainingTicks(data.trainingTicks);
        if (data.trainingActivity) saveTrainingActivity(data.trainingActivity);
        if (data.lastModified) localStorage.setItem(LAST_MODIFIED_KEY, data.lastModified);
    }

    return {
        getTodayKey,
        formatDateKey,
        loadHabits,
        saveHabits,
        isCompletedToday,
        toggleCompletion,
        getStreak,
        getActivityData,
        pruneOldData,
        loadArchivedHabits,
        archiveHabit,
        restoreHabit,
        permanentlyDeleteHabit,
        // Training
        loadTrainingBlocks,
        createTrainingBlock,
        updateTrainingBlock,
        deleteTrainingBlock,
        loadActiveBlockId,
        saveActiveBlockId,
        getActiveBlock,
        getBlockTicks,
        isTrainingDayTicked,
        toggleTrainingDay,
        getTrainingStreak,
        getTotalCyclesCompleted,
        getTrainingActivityData,
        // Sync
        getLastModified,
        touchLastModified,
        exportAll,
        importAll,
    };
})();
