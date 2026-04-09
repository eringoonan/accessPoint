import { getUserConditions, addUserCondition, getAllConditions, removeUserCondition } from '../api/conditionsApi.js';

export function createUserConditionsSection(type = 'view') {
    const container = document.createElement('div');
    container.className = 'user-conditions-section';

    if (type === 'view') {
        renderView(container);
    } else {
        renderAdd(container);
    }

    return container;
}

async function renderView(container) {
    container.innerHTML = `<h3>Your Conditions</h3><p>Loading...</p>`;

    try {
        const conditions = await getUserConditions();

        if (!conditions.length) {
            container.innerHTML = `<h3>Your Conditions</h3><p class="no-conditions">No conditions saved.</p>`;
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'conditions-grid';

        conditions.forEach(c => {
            const card = document.createElement('div');
            card.className = 'condition-card';

            const name = document.createElement('strong');
            name.textContent = c.condition_name;

            const severity = document.createElement('span');
            severity.className = `severity-badge severity-${c.severity_level}`;
            severity.textContent =
                c.severity_level.charAt(0).toUpperCase() + c.severity_level.slice(1);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn btn-danger btn-remove-condition';
            removeBtn.textContent = 'Remove';

            // ✅ Remove handler
            removeBtn.addEventListener('click', async () => {
                const confirmDelete = confirm(`Remove "${c.condition_name}"?`);

                if (!confirmDelete) return;

                try {
                    await removeUserCondition(c.condition_id);

                    // Refresh view
                    renderView(container);

                } catch (err) {
                    alert('Failed to remove condition');
                    console.error(err);
                }
            });

    card.appendChild(name);
    card.appendChild(severity);
    card.appendChild(removeBtn);

    grid.appendChild(card);
});

        container.innerHTML = `<h3>Your Conditions</h3>`;
        container.appendChild(grid);

    } catch (err) {
        container.innerHTML = `<p style="color: #a32d2d;">Failed to load conditions</p>`;
    }
}

async function renderAdd(container) {
    container.innerHTML = `<h3>Add Condition</h3><p>Loading...</p>`;

    try {
        const conditions = await getAllConditions();

        const form = document.createElement('div');
        form.className = 'add-condition-form';

        const conditionLabel = document.createElement('label');
        conditionLabel.textContent = 'Condition';
        conditionLabel.className = 'condition-label';

        const select = document.createElement('select');
        select.className = 'condition-dropdown';
        conditions.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.condition_id;
            opt.textContent = c.condition_name;
            select.appendChild(opt);
        });

        const severityLabel = document.createElement('label');
        severityLabel.textContent = 'Severity';
        severityLabel.className = 'condition-label';

        // ← was missing declaration entirely
        const severitySelect = document.createElement('select');
        severitySelect.className = 'severity-dropdown';

        const severityOptions = ['mild', 'moderate', 'severe'];
        severityOptions.forEach(level => {
            const opt = document.createElement('option');
            opt.value = level;
            opt.textContent = level.charAt(0).toUpperCase() + level.slice(1);
            severitySelect.appendChild(opt);
        });

        const btn = document.createElement('button');
        btn.textContent = 'Add Condition';
        btn.className = 'btn btn-conditions-add';

        const msg = document.createElement('p');
        msg.className = 'condition-msg';

        btn.addEventListener('click', async () => {
            try {
                // severity is a string enum now, not parseInt
                await addUserCondition(select.value, severitySelect.value);
                msg.textContent = 'Condition added!';
                msg.style.color = '#0f6e56';
            } catch (err) {
                msg.textContent = err.message === 'CONDITION_ALREADY_SAVED'
                    ? 'Already added'
                    : 'Error adding condition';
                msg.style.color = '#a32d2d';
            }
        });

        form.appendChild(conditionLabel);
        form.appendChild(select);
        form.appendChild(severityLabel);
        form.appendChild(severitySelect);
        form.appendChild(btn);
        form.appendChild(msg);

        container.innerHTML = `<h3>Add Condition</h3>`;
        container.appendChild(form);

    } catch (err) {
        container.innerHTML = `<p style="color: #a32d2d;">Failed to load conditions</p>`;
    }
}