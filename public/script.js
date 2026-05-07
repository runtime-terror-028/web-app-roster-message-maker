document.addEventListener('DOMContentLoaded', () => {
    const rosterForm = document.getElementById('rosterForm');
    const addBtn = document.getElementById('addBtn');
    const copyBtn = document.getElementById('copyBtn');
    const rosterList = document.getElementById('rosterList');
    const outputMessage = document.getElementById('outputMessage');

    const inputs = {
        team: { input: document.getElementById('teamInput'), suggestions: document.getElementById('teamSuggestions'), selected: null },
        shift: { input: document.getElementById('shiftInput'), suggestions: document.getElementById('shiftSuggestions'), selected: null },
        staff: { input: document.getElementById('staffInput'), suggestions: document.getElementById('staffSuggestions'), selected: null },
        location: { input: document.getElementById('locationInput'), suggestions: document.getElementById('locationSuggestions'), selected: null }
    };

    let currentRoster = [];

    // Setup Autocomplete
    Object.keys(inputs).forEach(category => {
        setupAutocomplete(category);
    });

    function setupAutocomplete(category) {
        const { input, suggestions } = inputs[category];

        input.addEventListener('input', async (e) => {
            const query = e.target.value;
            if (query.length < 1) {
                suggestions.style.display = 'none';
                return;
            }

            try {
                let url = `/api/search?category=${category}&q=${query}`;
                if (category === 'staff' && inputs.location.selected) {
                    url += `&locationId=${inputs.location.selected.id}`;
                }

                const response = await fetch(url);
                const results = await response.json();
                
                renderSuggestions(category, results);
            } catch (error) {
                console.error(`Error fetching ${category} suggestions:`, error);
            }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !suggestions.contains(e.target)) {
                suggestions.style.display = 'none';
            }
        });
    }

    function renderSuggestions(category, results) {
        const { input, suggestions } = inputs[category];
        suggestions.innerHTML = '';
        
        if (results.length === 0) {
            suggestions.style.display = 'none';
            return;
        }

        results.forEach(item => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.textContent = item.name + (item.phone ? ` (${item.phone})` : '');
            div.addEventListener('click', () => {
                input.value = item.name;
                inputs[category].selected = item;
                suggestions.style.display = 'none';
            });
            suggestions.appendChild(div);
        });

        suggestions.style.display = 'block';
    }

    addBtn.addEventListener('click', () => {
        const team = inputs.team.selected;
        const shift = inputs.shift.selected;
        const staff = inputs.staff.selected;
        const location = inputs.location.selected;

        // Basic validation
        if (!team || !shift || !staff || !location) {
            alert('Please select all fields from the suggestions.');
            return;
        }

        // Check if input values match selected items
        if (inputs.team.input.value !== team.name || 
            inputs.shift.input.value !== shift.name || 
            inputs.staff.input.value !== staff.name || 
            inputs.location.input.value !== location.name) {
            alert('Please select from the dropdown suggestions to ensure data accuracy.');
            return;
        }

        // Check if staff is already in the current roster
        const isDuplicate = currentRoster.some(entry => entry.staffId === staff.id);
        if (isDuplicate) {
            alert(`${staff.name} is already added to the roster!`);
            return;
        }

        const entry = {
            id: Date.now(),
            staffId: staff.id, // Store the staff ID for duplicate checking
            team: team.name,
            shift: shift.name,
            staffName: staff.name,
            staffPhone: staff.phone,
            location: location.name
        };

        currentRoster.push(entry);
        renderRoster();
        resetInputs();
    });

    function resetInputs() {
        // Only clear staff input as per prompt 3 requirement
        inputs.staff.input.value = '';
        inputs.staff.selected = null;
    }

    function renderRoster() {
        rosterList.innerHTML = '';
        currentRoster.forEach(entry => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span><strong>${entry.team}</strong> | ${entry.shift} | ${entry.staffName} (${entry.location})</span>
                <button class="btn danger" onclick="removeEntry(${entry.id})">Remove</button>
            `;
            rosterList.appendChild(li);
        });

        generateMessage();
    }

    window.removeEntry = (id) => {
        currentRoster = currentRoster.filter(e => e.id !== id);
        renderRoster();
    };

    function generateMessage() {
        if (currentRoster.length === 0) {
            outputMessage.value = '';
            return;
        }

        const date = new Date().toLocaleDateString('en-GB');
        let msg = `Date: ${date}\n\n`;

        // Group by team then by shift
        const grouped = {};
        currentRoster.forEach(entry => {
            if (!grouped[entry.team]) grouped[entry.team] = {};
            if (!grouped[entry.team][entry.shift]) grouped[entry.team][entry.shift] = [];
            grouped[entry.team][entry.shift].push(entry);
        });

        Object.keys(grouped).forEach(teamName => {
            msg += `*${teamName}*\n\n`;
            const shifts = grouped[teamName];
            Object.keys(shifts).forEach(shiftName => {
                msg += `*${shiftName}*\n`;
                shifts[shiftName].forEach(entry => {
                    msg += `${entry.staffName} - (${entry.staffPhone}) - ${entry.location}\n`;
                });
                msg += `\n`;
            });
            msg += `-------------------------------------------------------------\n\n`;
        });

        outputMessage.value = msg.trim();
    }

    copyBtn.addEventListener('click', () => {
        const textToCopy = outputMessage.value;
        if (!textToCopy) {
            alert('Roster is empty!');
            return;
        }

        const copyToClipboard = (text) => {
            if (navigator.clipboard && window.isSecureContext) {
                return navigator.clipboard.writeText(text);
            } else {
                // Fallback for mobile and non-HTTPS environments
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "-9999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                return new Promise((res, rej) => {
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    successful ? res() : rej();
                });
            }
        };

        copyToClipboard(textToCopy).then(() => {
            const originalText = copyBtn.innerText;
            copyBtn.innerText = 'Copied!';
            setTimeout(() => {
                copyBtn.innerText = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Copy failed:', err);
            alert('Failed to copy. Please long-press the text box to copy manually.');
        });
    });
});
