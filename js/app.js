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
    const archiveSection = document.querySelector('.archive-section');
    const archiveSubtitle = document.getElementById('archive-subtitle');
    const archiveToggleBtns = document.querySelectorAll('.archive-toggle-btn');

    const ARCHIVE_MODE_KEY = 'habitual_archive_mode';

    let draggedItem = null;
    let currentView = 'journal';
    let pendingDeleteId = null;
    let archiveMode = localStorage.getItem(ARCHIVE_MODE_KEY) || 'year';

    function refreshAll() {
        renderActivityGrid();
        renderHabits();
        updateStats();
        if (currentView === 'archive') renderArchivedList();
        if (currentView === 'training') renderTrainingView();
    }

    function afterMutation() {
        refreshAll();
        Sync.push();
    }

    function focusHabitInput() {
        if (currentView !== 'journal') switchView('journal');
        setTimeout(() => {
            habitInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => habitInput.focus(), 400);
        }, currentView !== 'journal' ? 100 : 0);
    }

    function init() {
        Storage.pruneOldData();
        initTheme();
        renderDate();
        renderQuote();
        setupArchiveToggle();
        renderActivityGrid();
        renderHabits();
        updateStats();
        setupNav();
        setupModal();
        setupBlockModal();
        setupBlockDeleteModal();
        setupTrainingActions();
        setupTrainingHeatmapToggle();

        setupMobileMenu();
        addForm.addEventListener('submit', onAddHabit);

        Sync.checkUrlToken();
        Sync.pull(refreshAll);

        newEntryBtn.addEventListener('click', onContextualAdd);
        mobileAddBtn.addEventListener('click', onContextualAdd);
    }

    function onContextualAdd() {
        if (currentView === 'training') {
            openBlockModal('create');
            return;
        }
        focusHabitInput();
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

        document.getElementById('view-journal').classList.toggle('hidden', view !== 'journal');
        document.getElementById('view-archive').classList.toggle('hidden', view !== 'archive');
        document.getElementById('view-training').classList.toggle('hidden', view !== 'training');

        if (view === 'archive') renderArchivedList();
        if (view === 'training') renderTrainingView();
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
        const monthsEl = document.getElementById('archive-months');
        monthsEl.innerHTML = '';

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayDay = today.getDay();

        let totalDays, startDow;
        const isMonthMode = archiveMode === 'month';

        if (isMonthMode) {
            // 5 week-columns ending today, anchored so data[0] lands on a Sunday.
            // Range: 29 days (today is Sunday) to 35 days (today is Saturday).
            totalDays = 29 + todayDay;
            startDow = 0;
        } else {
            const endDate = new Date(today);
            endDate.setDate(endDate.getDate() + (6 - todayDay));
            const startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - (53 * 7) + 1);
            totalDays = Math.round((endDate - startDate) / 86400000) + 1;
            startDow = startDate.getDay();
        }

        const data = Storage.getActivityData(totalDays);

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

        if (isMonthMode) return;

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

    function applyArchiveMode() {
        archiveSection.dataset.mode = archiveMode;
        archiveSubtitle.textContent = archiveMode === 'month' ? 'Monthly Exposure Grid' : 'Yearly Exposure Grid';
        archiveToggleBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === archiveMode);
        });
    }

    function setupArchiveToggle() {
        applyArchiveMode();
        archiveToggleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.mode === archiveMode) return;
                archiveMode = btn.dataset.mode;
                localStorage.setItem(ARCHIVE_MODE_KEY, archiveMode);
                applyArchiveMode();
                renderActivityGrid();
            });
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
                    afterMutation();
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
                afterMutation();
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
                afterMutation();
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
        afterMutation();
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
        afterMutation();
    }

    function onArchiveHabit(habitId) {
        Storage.archiveHabit(habitId);
        afterMutation();
    }

    // ===================================
    // Training
    // ===================================

    const TRAINING_HEATMAP_MODE_KEY = 'habitual_training_heatmap_mode';

    let trainingHeatmapMode = localStorage.getItem(TRAINING_HEATMAP_MODE_KEY) || 'month';
    let blockModalMode = 'create';
    let blockModalTargetId = null;
    let pendingBlockDeleteId = null;
    let cycleOverlayTimer = null;

    // --- Rendering ---

    function renderTrainingView() {
        const blocks = Storage.loadTrainingBlocks();
        const empty = document.getElementById('training-empty');
        const blockView = document.getElementById('training-block-view');

        if (blocks.length === 0) {
            empty.classList.remove('hidden');
            blockView.classList.add('hidden');
            return;
        }

        empty.classList.add('hidden');
        blockView.classList.remove('hidden');

        renderBlockHeader();
        renderTrainingProgress();
        renderTrainingStats();
        renderTrainingHeatmap();
        renderTrainingDayList();
    }

    function renderBlockHeader() {
        const active = Storage.getActiveBlock();
        if (!active) return;

        document.getElementById('training-block-name').textContent = active.name;

        const pillsEl = document.getElementById('training-block-pills');
        pillsEl.innerHTML = '';
        const blocks = Storage.loadTrainingBlocks();

        if (blocks.length <= 1) {
            pillsEl.classList.add('hidden');
        } else {
            pillsEl.classList.remove('hidden');
            blocks.forEach(b => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'training-block-pill' + (b.id === active.id ? ' active' : '');
                btn.textContent = b.name;
                btn.addEventListener('click', () => {
                    Storage.saveActiveBlockId(b.id);
                    Sync.push();
                    renderTrainingView();
                });
                pillsEl.appendChild(btn);
            });
        }
    }

    function renderTrainingProgress() {
        const active = Storage.getActiveBlock();
        if (!active) return;

        const ticks = Storage.getBlockTicks(active.id);
        const completedCount = Object.keys(ticks).length;
        const total = active.days.length;
        const cyclesCompleted = active.cyclesCompleted || 0;

        document.getElementById('training-cycle-label').textContent = `Cycle ${cyclesCompleted + 1}`;
        document.getElementById('training-progress-day').textContent = `${completedCount} / ${total} Days`;

        const pct = total > 0 ? (completedCount / total) * 100 : 0;
        document.getElementById('training-progress-fill').style.width = pct + '%';
    }

    function renderTrainingStats() {
        document.getElementById('training-streak').textContent = Storage.getTrainingStreak();
        document.getElementById('training-cycles').textContent = Storage.getTotalCyclesCompleted();
    }

    function renderTrainingHeatmap() {
        const grid = document.getElementById('training-heatmap-grid');
        const monthsEl = document.getElementById('training-heatmap-months');
        const subtitle = document.getElementById('training-heatmap-subtitle');
        const section = document.querySelector('.training-heatmap-section');

        section.dataset.mode = trainingHeatmapMode;
        subtitle.textContent = trainingHeatmapMode === 'month' ? 'Monthly Training Grid' : 'Yearly Training Grid';
        document.querySelectorAll('.training-heatmap-section .archive-toggle-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tmode === trainingHeatmapMode);
        });

        grid.innerHTML = '';
        monthsEl.innerHTML = '';

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayDay = today.getDay();
        const isMonthMode = trainingHeatmapMode === 'month';

        let totalDays, startDow;
        if (isMonthMode) {
            totalDays = 29 + todayDay;
            startDow = 0;
        } else {
            const endDate = new Date(today);
            endDate.setDate(endDate.getDate() + (6 - todayDay));
            const startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - (53 * 7) + 1);
            totalDays = Math.round((endDate - startDate) / 86400000) + 1;
            startDow = startDate.getDay();
        }

        const data = Storage.getTrainingActivityData(totalDays);

        for (let i = 0; i < startDow; i++) {
            const e = document.createElement('div');
            e.className = 'activity-cell';
            e.dataset.level = '0';
            e.style.visibility = 'hidden';
            grid.appendChild(e);
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
            cell.dataset.tooltip = day.count > 0
                ? `${dateStr}: ${day.count} day${day.count === 1 ? '' : 's'} ticked`
                : `${dateStr}: No training`;

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
            grid.appendChild(cell);
        });

        if (isMonthMode) return;

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

    function setupTrainingHeatmapToggle() {
        document.querySelectorAll('.training-heatmap-section .archive-toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.tmode === trainingHeatmapMode) return;
                trainingHeatmapMode = btn.dataset.tmode;
                localStorage.setItem(TRAINING_HEATMAP_MODE_KEY, trainingHeatmapMode);
                renderTrainingHeatmap();
            });
        });
    }

    function renderTrainingDayList() {
        const active = Storage.getActiveBlock();
        if (!active) return;

        const list = document.getElementById('training-day-list');
        list.innerHTML = '';

        active.days.forEach((day, index) => {
            const li = document.createElement('li');
            li.className = 'training-day-item';

            const isCompleted = Storage.isTrainingDayTicked(active.id, index);
            if (isCompleted) li.classList.add('completed');

            const checkBtn = document.createElement('button');
            checkBtn.type = 'button';
            checkBtn.className = 'training-day-check';
            checkBtn.setAttribute('aria-label', isCompleted ? 'Mark incomplete' : 'Mark complete');
            checkBtn.innerHTML = '<span class="material-symbols-outlined">check</span>';
            checkBtn.addEventListener('click', () => onToggleTrainingDay(active.id, index));

            const body = document.createElement('div');
            body.className = 'training-day-body';

            const top = document.createElement('div');
            top.className = 'training-day-top';

            const badge = document.createElement('span');
            badge.className = 'training-day-badge';
            badge.textContent = `Day ${index + 1}`;

            const title = document.createElement('span');
            title.className = 'training-day-title';
            title.textContent = day.title || `Day ${index + 1}`;

            top.appendChild(badge);
            top.appendChild(title);
            body.appendChild(top);

            if (day.notes && day.notes.trim()) {
                const notes = document.createElement('p');
                notes.className = 'training-day-notes';
                notes.textContent = day.notes;
                body.appendChild(notes);
            }

            li.appendChild(checkBtn);
            li.appendChild(body);
            list.appendChild(li);
        });
    }

    function onToggleTrainingDay(blockId, dayIndex) {
        const result = Storage.toggleTrainingDay(blockId, dayIndex);
        Sync.push();
        renderTrainingView();
        if (result.cycleCompleted) showCycleComplete();
    }

    function showCycleComplete() {
        const overlay = document.getElementById('cycle-complete-overlay');
        const titleEl = document.getElementById('cycle-complete-title');
        const labelEl = document.getElementById('cycle-complete-label');
        const block = Storage.getActiveBlock();
        labelEl.textContent = block ? `Cycle ${block.cyclesCompleted} Complete` : 'Cycle Complete';
        titleEl.textContent = block ? `${block.name} resets for the next round` : 'Reset for next round';

        overlay.classList.remove('hidden');
        requestAnimationFrame(() => overlay.classList.add('visible'));

        if (cycleOverlayTimer) clearTimeout(cycleOverlayTimer);
        cycleOverlayTimer = setTimeout(() => {
            overlay.classList.remove('visible');
            setTimeout(() => overlay.classList.add('hidden'), 400);
        }, 2200);
    }

    // --- Block Modal ---

    function setupTrainingActions() {
        document.getElementById('training-new-btn').addEventListener('click', () => openBlockModal('create'));
        document.getElementById('training-empty-create').addEventListener('click', () => openBlockModal('create'));
        document.getElementById('training-edit-btn').addEventListener('click', () => {
            const active = Storage.getActiveBlock();
            if (active) openBlockModal('edit', active.id);
        });
        document.getElementById('training-delete-btn').addEventListener('click', () => {
            const active = Storage.getActiveBlock();
            if (!active) return;
            pendingBlockDeleteId = active.id;
            document.getElementById('block-delete-modal').classList.remove('hidden');
        });
    }

    function openBlockModal(mode, blockId) {
        blockModalMode = mode;
        blockModalTargetId = blockId || null;

        const modal = document.getElementById('block-modal');
        const title = document.getElementById('block-modal-title');
        const nameInput = document.getElementById('block-name-input');
        const daysCountInput = document.getElementById('block-days-count');

        if (mode === 'edit' && blockId) {
            const block = Storage.loadTrainingBlocks().find(b => b.id === blockId);
            if (!block) return;
            title.textContent = 'Edit Block';
            nameInput.value = block.name;
            daysCountInput.value = block.days.length;
            renderBlockDaysList(block.days);
        } else {
            title.textContent = 'New Block';
            nameInput.value = '';
            daysCountInput.value = '3';
            renderBlockDaysList([
                { title: '', notes: '' },
                { title: '', notes: '' },
                { title: '', notes: '' },
            ]);
        }

        modal.classList.remove('hidden');
        setTimeout(() => nameInput.focus(), 50);
    }

    function closeBlockModal() {
        const modal = document.getElementById('block-modal');
        modal.classList.add('hidden');
        blockModalMode = 'create';
        blockModalTargetId = null;
    }

    function renderBlockDaysList(days) {
        const container = document.getElementById('block-days-list');
        container.innerHTML = '';
        days.forEach((day, i) => {
            const field = document.createElement('div');
            field.className = 'block-day-field';

            const header = document.createElement('div');
            header.className = 'block-day-field-header';
            header.textContent = `Day ${i + 1}`;

            const titleInput = document.createElement('input');
            titleInput.type = 'text';
            titleInput.className = 'block-day-title';
            titleInput.placeholder = 'Day title (e.g. Push Day)';
            titleInput.value = day.title || '';
            titleInput.maxLength = 60;

            const notesInput = document.createElement('textarea');
            notesInput.className = 'block-day-notes';
            notesInput.placeholder = 'Notes (exercises, sets, reminders...)';
            notesInput.value = day.notes || '';
            notesInput.rows = 2;

            field.appendChild(header);
            field.appendChild(titleInput);
            field.appendChild(notesInput);
            container.appendChild(field);
        });
    }

    function getCurrentDayValues() {
        const container = document.getElementById('block-days-list');
        const fields = container.querySelectorAll('.block-day-field');
        const days = [];
        fields.forEach(field => {
            const t = field.querySelector('.block-day-title').value.trim();
            const n = field.querySelector('.block-day-notes').value.trim();
            days.push({ title: t, notes: n });
        });
        return days;
    }

    function setupBlockModal() {
        const modal = document.getElementById('block-modal');
        const form = document.getElementById('block-form');
        const cancelBtn = document.getElementById('block-modal-cancel');
        const daysCountInput = document.getElementById('block-days-count');

        daysCountInput.addEventListener('input', () => {
            let count = parseInt(daysCountInput.value, 10);
            if (isNaN(count) || count < 1) count = 1;
            if (count > 30) count = 30;

            const current = getCurrentDayValues();
            const newDays = [];
            for (let i = 0; i < count; i++) {
                newDays.push(current[i] || { title: '', notes: '' });
            }
            renderBlockDaysList(newDays);
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('block-name-input').value.trim();
            if (!name) return;
            const days = getCurrentDayValues();
            if (days.length === 0) return;

            const filled = days.map((d, i) => ({
                title: d.title || `Day ${i + 1}`,
                notes: d.notes,
            }));

            if (blockModalMode === 'edit' && blockModalTargetId) {
                Storage.updateTrainingBlock(blockModalTargetId, { name, days: filled });
            } else {
                const block = Storage.createTrainingBlock(name, filled);
                Storage.saveActiveBlockId(block.id);
            }
            Sync.push();
            closeBlockModal();
            renderTrainingView();
        });

        cancelBtn.addEventListener('click', closeBlockModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeBlockModal();
        });
    }

    function setupBlockDeleteModal() {
        const modal = document.getElementById('block-delete-modal');
        const cancelBtn = document.getElementById('block-delete-cancel');
        const confirmBtn = document.getElementById('block-delete-confirm');

        const close = () => {
            pendingBlockDeleteId = null;
            modal.classList.add('hidden');
        };

        cancelBtn.addEventListener('click', close);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) close();
        });
        confirmBtn.addEventListener('click', () => {
            if (pendingBlockDeleteId) {
                Storage.deleteTrainingBlock(pendingBlockDeleteId);
                pendingBlockDeleteId = null;
                modal.classList.add('hidden');
                Sync.push();
                renderTrainingView();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
