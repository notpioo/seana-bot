
// Configuration page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    loadConfig();
    
    // Add event listeners
    document.getElementById('addOwnerBtn').addEventListener('click', addOwnerField);
    document.getElementById('submitConfig').addEventListener('click', saveConfig);
});

// Load configuration from server
async function loadConfig() {
    try {
        // Show loading indicator
        const formInputs = document.querySelectorAll('.form-input');
        formInputs.forEach(input => {
            input.disabled = true;
        });
        
        // Fetch configuration from server
        const response = await fetch('/api/bot/config');
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to load configuration');
        }
        
        const config = data.config;
        
        // Populate form with config values
        document.getElementById('botName').value = config.botName || '';
        document.getElementById('packname').value = config.packname || '';
        document.getElementById('authorname').value = config.authorname || '';
        document.getElementById('footerText').value = config.footerText || '';
        document.getElementById('limit').value = config.limit || 0;
        document.getElementById('balanceLimit').value = config.balanceLimit || 0;
        document.getElementById('prefix').value = config.prefix || '.#/!';
        
        // Set prefix type radio button
        const prefixType = config.prefixType || 'multi';
        document.getElementById(`${prefixType}Prefix`).checked = true;
        
        // Set checkboxes
        document.getElementById('onlineOnConnect').checked = config.onlineOnConnect || false;
        document.getElementById('premiumNotification').checked = config.premiumNotification || false;
        document.getElementById('sewaNotification').checked = config.sewaNotification || false;
        document.getElementById('joinToUse').checked = config.joinToUse || false;
        
        // Load owners
        const ownerContainer = document.getElementById('ownerContainer');
        ownerContainer.innerHTML = '';
        
        if (config.owners && config.owners.length > 0) {
            config.owners.forEach((owner, index) => {
                const ownerEntry = createOwnerEntry(index, owner.name, owner.number);
                ownerContainer.appendChild(ownerEntry);
            });
        } else {
            // Add at least one empty owner field
            const ownerEntry = createOwnerEntry(0);
            ownerContainer.appendChild(ownerEntry);
        }
        
        // Enable form inputs after loading
        formInputs.forEach(input => {
            input.disabled = false;
        });
        
    } catch (error) {
        console.error('Error loading config:', error);
        alert(`Failed to load configuration: ${error.message}`);
        
        // Enable form inputs even if loading fails
        const formInputs = document.querySelectorAll('.form-input');
        formInputs.forEach(input => {
            input.disabled = false;
        });
    }
}

// Create an owner entry element
function createOwnerEntry(index, name = '', number = '') {
    const entry = document.createElement('div');
    entry.className = 'owner-entry';
    entry.innerHTML = `
        <div class="owner-fields">
            <div class="input-group">
                <label for="ownerName${index}">Owner Name*</label>
                <input type="text" id="ownerName${index}" class="form-input" placeholder="Enter owner name" value="${name}">
            </div>
            
            <div class="input-group">
                <label for="ownerNumber${index}">Owner Number*</label>
                <input type="text" id="ownerNumber${index}" class="form-input" placeholder="Enter phone number" value="${number}">
            </div>
            
            <button class="remove-owner-btn" data-index="${index}">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add event listener to remove button
    setTimeout(() => {
        const removeBtn = entry.querySelector('.remove-owner-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                entry.remove();
            });
        }
    }, 0);
    
    return entry;
}

// Add a new owner field
function addOwnerField() {
    const ownerContainer = document.getElementById('ownerContainer');
    const index = ownerContainer.children.length;
    const ownerEntry = createOwnerEntry(index);
    ownerContainer.appendChild(ownerEntry);
}

// Save configuration to server
async function saveConfig() {
    try {
        // Show loading state
        const submitBtn = document.getElementById('submitConfig');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;
        
        // Collect all form data
        const config = {
            botName: document.getElementById('botName').value,
            packname: document.getElementById('packname').value,
            authorname: document.getElementById('authorname').value,
            footerText: document.getElementById('footerText').value,
            limit: parseInt(document.getElementById('limit').value) || 0,
            balanceLimit: parseInt(document.getElementById('balanceLimit').value) || 0,
            prefix: document.getElementById('prefix').value,
            prefixType: document.querySelector('input[name="prefixType"]:checked')?.value || 'multi',
            onlineOnConnect: document.getElementById('onlineOnConnect').checked,
            premiumNotification: document.getElementById('premiumNotification').checked,
            sewaNotification: document.getElementById('sewaNotification').checked,
            joinToUse: document.getElementById('joinToUse').checked,
            owners: []
        };
        
        // Collect owner data
        const ownerEntries = document.querySelectorAll('.owner-entry');
        ownerEntries.forEach((entry, index) => {
            const name = document.getElementById(`ownerName${index}`)?.value;
            const number = document.getElementById(`ownerNumber${index}`)?.value;
            
            if (name && number) {
                config.owners.push({ name, number });
            }
        });
        
        // Validate required fields
        const requiredFields = ['botName', 'packname', 'authorname', 'footerText', 'limit', 'balanceLimit', 'prefix'];
        let missingFields = [];
        
        requiredFields.forEach(field => {
            if (!config[field]) {
                missingFields.push(field);
            }
        });
        
        if (config.owners.length === 0) {
            missingFields.push('owner');
        }
        
        if (missingFields.length > 0) {
            alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
            return;
        }
        
        // Send config to server
        const response = await fetch('/api/bot/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Failed to save configuration');
        }
        
        // Show success notification
        alert('Configuration saved successfully!');
        
        // Reset button state
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
        
    } catch (error) {
        console.error('Error saving config:', error);
        alert(`Error saving configuration: ${error.message}`);
        
        // Reset button state
        const submitBtn = document.getElementById('submitConfig');
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Submit';
        submitBtn.disabled = false;
    }
}

// Add CSS to show the loading state
const style = document.createElement('style');
style.innerHTML = `
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
.fa-spin {
    animation: spin 1s linear infinite;
}
`;
document.head.appendChild(style);
