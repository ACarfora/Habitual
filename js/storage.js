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
            lastModified: getLastModified(),
        };
    }

    function importAll(data) {
        if (data.habits) saveHabits(data.habits);
        if (data.completions) saveCompletions(data.completions);
        if (data.archived) saveArchivedHabits(data.archived);
        if (data.lastModified) localStorage.setItem(LAST_MODIFIED_KEY, data.lastModified);
    }

    return {
        getTodayKey,
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
        getLastModified,
        touchLastModified,
        exportAll,
        importAll,
    };
})();
