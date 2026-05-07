document.addEventListener('DOMContentLoaded', async () => {
    const staffForm = document.getElementById('staffForm');
    const staffSearch = document.getElementById('staffSearch');
    const staffSuggestions = document.getElementById('staffSuggestions');
    const staffIdInput = document.getElementById('staffId');
    const nameInput = document.getElementById('name');
    const phoneInput = document.getElementById('phone');
    const locationSelect = document.getElementById('location');
    const teamSelect = document.getElementById('team');
    const submitBtn = document.getElementById('submitBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const formTitle = document.getElementById('formTitle');
    const statusMessage = document.getElementById('statusMessage');

    // Populate dropdowns
    try {
        const [locRes, teamRes] = await Promise.all([
            fetch('/api/locations'),
            fetch('/api/teams')
        ]);
        const locations = await locRes.json();
        const teams = await teamRes.json();

        locations.forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc.id;
            opt.textContent = loc.name;
            locationSelect.appendChild(opt);
        });

        teams.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            teamSelect.appendChild(opt);
        });
    } catch (err) {
        console.error('Failed to load metadata:', err);
    }

    // Staff search for editing
    staffSearch.addEventListener('input', async (e) => {
        const query = e.target.value;
        if (query.length < 1) {
            staffSuggestions.style.display = 'none';
            return;
        }

        try {
            const res = await fetch(`/api/search?category=staff&q=${query}`);
            const results = await res.json();
            renderSuggestions(results);
        } catch (err) {
            console.error(err);
        }
    });

    function renderSuggestions(results) {
        staffSuggestions.innerHTML = '';
        if (results.length === 0) {
            staffSuggestions.style.display = 'none';
            return;
        }

        results.forEach(item => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.textContent = `${item.name} (${item.phone})`;
            div.addEventListener('click', () => {
                loadStaffForEdit(item.id);
                staffSuggestions.style.display = 'none';
                staffSearch.value = '';
            });
            staffSuggestions.appendChild(div);
        });
        staffSuggestions.style.display = 'block';
    }

    async function loadStaffForEdit(id) {
        try {
            const res = await fetch(`/api/staff/${id}`);
            const staff = await res.json();

            staffIdInput.value = staff.id;
            nameInput.value = staff.name;
            phoneInput.value = staff.phone;
            locationSelect.value = staff.default_location_id || '';
            teamSelect.value = staff.team_id || '';

            formTitle.textContent = 'Edit Staff';
            submitBtn.textContent = 'Update Staff';
            cancelBtn.style.display = 'block';
            deleteBtn.style.display = 'block';
            window.scrollTo({ top: document.getElementById('formSection').offsetTop, behavior: 'smooth' });
        } catch (err) {
            console.error(err);
        }
    }

    // Proactive duplicate check
    let duplicateTimeout;
    const checkDuplicate = async () => {
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        const currentId = staffIdInput.value;

        if (name.length > 2 && phone.length > 5 && !currentId) {
            clearTimeout(duplicateTimeout);
            duplicateTimeout = setTimeout(async () => {
                try {
                    const res = await fetch(`/api/search?category=staff&q=${name}`);
                    const results = await res.json();
                    
                    const isDuplicate = results.some(s => 
                        s.name.toLowerCase() === name.toLowerCase() && 
                        s.phone.replace(/\s+/g, '') === phone.replace(/\s+/g, '')
                    );

                    if (isDuplicate) {
                        showStatus('Warning: A staff member with this name and phone already exists!', 'orange');
                        submitBtn.disabled = true;
                        submitBtn.style.opacity = '0.5';
                    } else {
                        submitBtn.disabled = false;
                        submitBtn.style.opacity = '1';
                    }
                } catch (err) {
                    console.error('Duplicate check failed:', err);
                }
            }, 500);
        } else {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
    };

    nameInput.addEventListener('input', checkDuplicate);
    phoneInput.addEventListener('input', checkDuplicate);

    function resetForm() {
        staffForm.reset();
        staffIdInput.value = '';
        formTitle.textContent = 'Add New Staff';
        submitBtn.textContent = 'Add Staff';
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        cancelBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
    }

    cancelBtn.addEventListener('click', resetForm);

    staffForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = staffIdInput.value;
        const data = {
            name: nameInput.value,
            phone: phoneInput.value,
            default_location_id: locationSelect.value,
            team_id: teamSelect.value
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/staff/${id}` : '/api/staff';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();
            if (res.ok) {
                showStatus(result.message, 'green');
                resetForm();
            } else {
                showStatus(result.error || 'Operation failed', 'red');
            }
        } catch (err) {
            showStatus('Network error', 'red');
        }
    });

    deleteBtn.addEventListener('click', async () => {
        const id = staffIdInput.value;
        if (!id || !confirm('Are you sure you want to delete this staff member?')) return;

        try {
            const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showStatus('Staff deleted successfully', 'green');
                resetForm();
            } else {
                showStatus('Failed to delete', 'red');
            }
        } catch (err) {
            showStatus('Network error', 'red');
        }
    });

    function showStatus(msg, color) {
        statusMessage.textContent = msg;
        statusMessage.style.color = color;
        statusMessage.style.display = 'block';
        setTimeout(() => { statusMessage.style.display = 'none'; }, 5000);
    }

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!staffSearch.contains(e.target) && !staffSuggestions.contains(e.target)) {
            staffSuggestions.style.display = 'none';
        }
    });
});
