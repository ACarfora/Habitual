(() => {
    const habitList = document.getElementById('habit-list');
    const addForm = document.getElementById('add-habit-form');
    const habitInput = document.getElementById('habit-input');
    const activityGrid = document.getElementById('activity-grid');
    const todayDate = document.getElementById('today-date');
    const todayDayLabel = document.getElementById('today-day-label');
    const quoteLabel = document.getElementById('quote-label');
    const quoteText = document.getElementById('quote-text');
    const quoteAuthor = document.getElementById('quote-author');
    const statStreak = document.getElementById('stat-streak');
    const statEfficiency = document.getElementById('stat-efficiency');
    const newEntryBtn = document.getElementById('new-entry-btn');
    const mobileAddBtn = document.getElementById('mobile-add-btn');
    const archivedList = document.getElementById('archived-list');
    const deleteModal = document.getElementById('delete-modal');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');

    let draggedItem = null;
    let currentView = 'journal';
    let pendingDeleteId = null;

    function init() {
        Storage.pruneOldData();
        initTheme();
        renderDate();
        renderQuote();
        renderActivityGrid();
        renderHabits();
        updateStats();
        setupNav();
        setupModal();

        setupMobileMenu();
        addForm.addEventListener('submit', onAddHabit);

        newEntryBtn.addEventListener('click', () => {
            if (currentView !== 'journal') switchView('journal');
            setTimeout(() => {
                habitInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => habitInput.focus(), 400);
            }, currentView !== 'journal' ? 100 : 0);
        });

        mobileAddBtn.addEventListener('click', () => {
            if (currentView !== 'journal') switchView('journal');
            setTimeout(() => {
                habitInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => habitInput.focus(), 400);
            }, currentView !== 'journal' ? 100 : 0);
        });
    }

    // --- Theme ---

    function initTheme() {
        const saved = localStorage.getItem('habitual_theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (saved === 'dark' || (!saved && prefersDark)) {
            document.body.classList.add('dark');
        }

        updateThemeIcons();

        document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    }

    function toggleTheme() {
        document.body.classList.toggle('dark');
        const nowDark = document.body.classList.contains('dark');
        localStorage.setItem('habitual_theme', nowDark ? 'dark' : 'light');
        updateThemeIcons();
    }

    function updateThemeIcons() {
        const isDark = document.body.classList.contains('dark');
        const icon = isDark ? 'light_mode' : 'dark_mode';
        document.getElementById('theme-icon').textContent = icon;
    }

    // --- Mobile Menu ---

    function setupMobileMenu() {
        const hamburger = document.getElementById('hamburger');
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('mobile-sidebar-backdrop');

        hamburger.addEventListener('click', () => {
            sidebar.classList.add('mobile-open');
            backdrop.classList.remove('hidden');
        });

        backdrop.addEventListener('click', closeMobileMenu);
    }

    function closeMobileMenu() {
        document.getElementById('sidebar').classList.remove('mobile-open');
        document.getElementById('mobile-sidebar-backdrop').classList.add('hidden');
    }

    // --- Navigation ---

    function setupNav() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                switchView(item.dataset.view);
                closeMobileMenu();
            });
        });
    }

    function switchView(view) {
        currentView = view;

        document.querySelectorAll('.nav-item').forEach(n => {
            n.classList.toggle('active', n.dataset.view === view);
        });

        // Show/hide journal content
        const journalSections = document.querySelectorAll('.quote-section, .archive-section, .today-section');
        journalSections.forEach(s => s.classList.toggle('hidden', view !== 'journal'));

        // Show/hide archive view
        document.getElementById('view-archive').classList.toggle('hidden', view !== 'archive');

        if (view === 'archive') renderArchivedList();
    }

    // --- Date ---

    function renderDate() {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        todayDate.textContent = `${day}.${month}`;

        const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
        todayDayLabel.textContent = dayName;
    }

    // --- Quote ---

    function renderQuote() {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now - start;
        const dayOfYear = Math.floor(diff / 86400000);
        const index = (dayOfYear - 1) % QUOTES.length;
        const quote = QUOTES[index];

        quoteLabel.textContent = `Volume ${String(dayOfYear).padStart(3, '0')} // Daily Reflection`;
        quoteText.innerHTML = `\u201c${quote.text}\u201d`;
        quoteAuthor.textContent = `\u2014 ${quote.author}`;
    }

    // --- Activity Grid ---

    function renderActivityGrid() {
        activityGrid.innerHTML = '';

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayDay = today.getDay();

        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + (6 - todayDay));

        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - (53 * 7) + 1);

        const totalDays = Math.round((endDate - startDate) / 86400000) + 1;
        const data = Storage.getActivityData(totalDays);

        const startDow = startDate.getDay();
        for (let i = 0; i < startDow; i++) {
            const empty = document.createElement('div');
            empty.className = 'activity-cell';
            empty.dataset.level = '0';
            empty.style.visibility = 'hidden';
            activityGrid.appendChild(empty);
        }

        const monthColumns = {};
        let totalColumns = 0;

        data.forEach((day, i) => {
            const cell = document.createElement('div');
            cell.className = 'activity-cell';

            let level = 0;
            if (day.ratio > 0 && day.ratio <= 0.33) level = 1;
            else if (day.ratio > 0.33 && day.ratio <= 0.66) level = 2;
            else if (day.ratio > 0.66) level = 3;

            cell.dataset.level = level;

            const dateObj = new Date(day.date + 'T00:00:00');
            const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            cell.dataset.tooltip = day.total > 0
                ? `${dateStr}: ${day.completed}/${day.total}`
                : `${dateStr}: No habits`;

            const cellIndex = startDow + i;
            const col = Math.floor(cellIndex / 7);
            totalColumns = Math.max(totalColumns, col + 1);

            const monthKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}`;
            if (!(monthKey in monthColumns)) {
                monthColumns[monthKey] = {
                    col: col,
                    label: dateObj.toLocaleDateString('en-US', { month: 'short' })
                };
            }

            activityGrid.appendChild(cell);
        });

        const monthsEl = document.getElementById('archive-months');
        monthsEl.innerHTML = '';
        monthsEl.style.position = 'relative';

        const entries = Object.values(monthColumns);
        let lastPct = -10;
        entries.forEach(entry => {
            const pct = (entry.col / totalColumns) * 100;
            if (pct - lastPct < 4) return;
            lastPct = pct;

            const span = document.createElement('span');
            span.textContent = entry.label;
            span.style.position = 'absolute';
            span.style.left = pct + '%';
            monthsEl.appendChild(span);
        });
    }

    // --- Habits ---

    function renderHabits() {
        const habits = Storage.loadHabits();
        habitList.innerHTML = '';

        if (habits.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'empty-state';
            empty.textContent = 'No habits recorded yet. Add your first one above.';
            habitList.appendChild(empty);
            return;
        }

        habits.forEach((habit, index) => {
            const li = createHabitElement(habit, index, habits.length);
            habitList.appendChild(li);
        });
    }

    function createHabitElement(habit, index, total) {
        const li = document.createElement('li');
        li.className = 'habit-item';
        li.dataset.id = habit.id;
        li.draggable = true;

        const isCompleted = Storage.isCompletedToday(habit.id);
        if (isCompleted) li.classList.add('completed');

        const streak = Storage.getStreak(habit.id);

        // Left side
        const left = document.createElement('div');
        left.className = 'habit-item-left';

        const checkBtn = document.createElement('button');
        checkBtn.className = 'habit-check';
        checkBtn.setAttribute('aria-label', isCompleted ? 'Mark incomplete' : 'Mark complete');
        checkBtn.innerHTML = '<span class="material-symbols-outlined">check</span>';
        checkBtn.addEventListener('click', () => onToggleHabit(habit.id));

        const name = document.createElement('span');
        name.className = 'habit-name';
        name.textContent = habit.name;

        left.appendChild(checkBtn);
        left.appendChild(name);

        // Right side
        const right = document.createElement('div');
        right.className = 'habit-item-right';

        if (isCompleted) {
            const doneBadge = document.createElement('span');
            doneBadge.className = 'habit-badge habit-badge-done';
            doneBadge.textContent = 'Done';
            right.appendChild(doneBadge);
        } else if (streak > 0) {
            const streakBadge = document.createElement('span');
            streakBadge.className = 'habit-badge habit-badge-streak';
            streakBadge.textContent = `${streak}d`;
            right.appendChild(streakBadge);
        }

        // Archive button (replaces delete)
        const archiveBtn = document.createElement('button');
        archiveBtn.className = 'habit-delete';
        archiveBtn.setAttribute('aria-label', 'Archive habit');
        archiveBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:1.125rem">archive</span>';
        archiveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onArchiveHabit(habit.id);
        });
        right.appendChild(archiveBtn);

        // Drag events
        li.addEventListener('dragstart', (e) => {
            draggedItem = li;
            li.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        li.addEventListener('dragend', () => {
            li.classList.remove('dragging');
            draggedItem = null;
            document.querySelectorAll('.habit-item.drag-over').forEach(el => el.classList.remove('drag-over'));
        });

        li.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (draggedItem && draggedItem !== li) li.classList.add('drag-over');
        });

        li.addEventListener('dragleave', () => li.classList.remove('drag-over'));

        li.addEventListener('drop', (e) => {
            e.preventDefault();
            li.classList.remove('drag-over');
            if (draggedItem && draggedItem !== li) {
                const fromId = draggedItem.dataset.id;
                const toId = li.dataset.id;
                const habits = Storage.loadHabits();
                const fromIdx = habits.findIndex(h => h.id === fromId);
                const toIdx = habits.findIndex(h => h.id === toId);
                if (fromIdx !== -1 && toIdx !== -1) {
                    const [moved] = habits.splice(fromIdx, 1);
                    habits.splice(toIdx, 0, moved);
                    Storage.saveHabits(habits);
                    renderHabits();
                }
            }
        });

        li.appendChild(left);
        li.appendChild(right);

        return li;
    }

    // --- Archive View ---

    function renderArchivedList() {
        const archived = Storage.loadArchivedHabits();
        archivedList.innerHTML = '';

        if (archived.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'archived-empty';
            empty.textContent = 'No archived habits.';
            archivedList.appendChild(empty);
            return;
        }

        archived.forEach(habit => {
            const li = document.createElement('li');
            li.className = 'archived-item';

            const left = document.createElement('div');
            left.className = 'archived-item-left';

            const name = document.createElement('span');
            name.className = 'archived-item-name';
            name.textContent = habit.name;

            const meta = document.createElement('span');
            meta.className = 'archived-item-meta';
            const streak = Storage.getStreak(habit.id);
            const parts = [];
            if (habit.archivedAt) parts.push(`Archived ${habit.archivedAt}`);
            if (streak > 0) parts.push(`${streak}d streak`);
            meta.textContent = parts.join(' \u00B7 ');

            left.appendChild(name);
            left.appendChild(meta);

            const actions = document.createElement('div');
            actions.className = 'archived-item-actions';

            // Restore button
            const restoreBtn = document.createElement('button');
            restoreBtn.className = 'archived-btn';
            restoreBtn.setAttribute('aria-label', 'Restore habit');
            restoreBtn.innerHTML = '<span class="material-symbols-outlined">unarchive</span>';
            restoreBtn.addEventListener('click', () => {
                Storage.restoreHabit(habit.id);
                renderArchivedList();
                renderHabits();
                updateStats();
                renderActivityGrid();
            });

            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'archived-btn archived-btn-delete';
            deleteBtn.setAttribute('aria-label', 'Delete permanently');
            deleteBtn.innerHTML = '<span class="material-symbols-outlined">delete_forever</span>';
            deleteBtn.addEventListener('click', () => {
                pendingDeleteId = habit.id;
                deleteModal.classList.remove('hidden');
            });

            actions.appendChild(restoreBtn);
            actions.appendChild(deleteBtn);

            li.appendChild(left);
            li.appendChild(actions);
            archivedList.appendChild(li);
        });
    }

    // --- Delete Confirmation Modal ---

    function setupModal() {
        modalCancel.addEventListener('click', () => {
            pendingDeleteId = null;
            deleteModal.classList.add('hidden');
        });

        modalConfirm.addEventListener('click', () => {
            if (pendingDeleteId) {
                Storage.permanentlyDeleteHabit(pendingDeleteId);
                pendingDeleteId = null;
                deleteModal.classList.add('hidden');
                renderArchivedList();
                renderActivityGrid();
            }
        });

        // Close on backdrop click
        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) {
                pendingDeleteId = null;
                deleteModal.classList.add('hidden');
            }
        });
    }

    // --- Stats ---

    function updateStats() {
        const habits = Storage.loadHabits();
        const total = habits.length;

        let bestStreak = 0;
        habits.forEach(h => {
            const s = Storage.getStreak(h.id);
            if (s > bestStreak) bestStreak = s;
        });
        statStreak.textContent = bestStreak;

        if (total === 0) {
            statEfficiency.textContent = '0';
            return;
        }

        let completed = 0;
        habits.forEach(h => {
            if (Storage.isCompletedToday(h.id)) completed++;
        });

        const pct = Math.round((completed / total) * 100);
        statEfficiency.textContent = pct;
    }

    // --- Actions ---

    function onToggleHabit(habitId) {
        Storage.toggleCompletion(habitId);
        renderHabits();
        updateStats();
        renderActivityGrid();
    }

    function onAddHabit(e) {
        e.preventDefault();
        const name = habitInput.value.trim();
        if (!name) return;

        const habits = Storage.loadHabits();
        const habit = {
            id: 'h_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            name: name,
            createdAt: Storage.getTodayKey(),
        };
        habits.push(habit);
        Storage.saveHabits(habits);

        habitInput.value = '';
        renderHabits();
        updateStats();
        renderActivityGrid();
    }

    function onArchiveHabit(habitId) {
        Storage.archiveHabit(habitId);
        renderHabits();
        updateStats();
        renderActivityGrid();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
