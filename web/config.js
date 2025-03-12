
// Configuration page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    loadConfig();
    
    // Add event listeners
    document.getElementById('addOwnerBtn').addEventListener('click', addOwnerField);
    document.getElementById('submitConfig').addEventListener('click', saveConfig);
});

// Load configuration
async function loadConfig() {
    try {
        // Sample code to load config from server or Firebase
        // This would be replaced with actual API calls in production
        const config = {
            botName: 'BabyChand Bot',
            packname: 'BabyChand',
            authorname: 'Darraaaa',
            footerText: '2022 © BabyChand Bot',
            limit: 20,
            balanceLimit: 250,
            owners: [
                { name: 'Darraaaa', number: '628570957572' },
                { name: 'Renn', number: '6287883480816' },
                { name: 'Pioo', number: '6289536066429' }
            ],
            prefix: '.#/!',
            prefixType: 'multi',
            onlineOnConnect: true,
            premiumNotification: true,
            sewaNotification: true,
            joinToUse: false
        };
        
        // Populate form with config values
        document.getElementById('botName').value = config.botName;
        document.getElementById('packname').value = config.packname;
        document.getElementById('authorname').value = config.authorname;
        document.getElementById('footerText').value = config.footerText;
        document.getElementById('limit').value = config.limit;
        document.getElementById('balanceLimit').value = config.balanceLimit;
        document.getElementById('prefix').value = config.prefix;
        
        // Set prefix type radio button
        document.getElementById(`${config.prefixType}Prefix`).checked = true;
        
        // Set checkboxes
        document.getElementById('onlineOnConnect').checked = config.onlineOnConnect;
        document.getElementById('premiumNotification').checked = config.premiumNotification;
        document.getElementById('sewaNotification').checked = config.sewaNotification;
        document.getElementById('joinToUse').checked = config.joinToUse;
        
        // Load owners
        const ownerContainer = document.getElementById('ownerContainer');
        ownerContainer.innerHTML = '';
        
        config.owners.forEach((owner, index) => {
            const ownerEntry = createOwnerEntry(index, owner.name, owner.number);
            ownerContainer.appendChild(ownerEntry);
        });
        
    } catch (error) {
        console.error('Error loading config:', error);
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

// Save configuration
async function saveConfig() {
    try {
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
            return;
        }
        
        // Here would be code to save config to server or Firebase
        console.log('Saving config:', config);
        
        // Show success notification
        alert('Configuration saved successfully!');
        
    } catch (error) {
        console.error('Error saving config:', error);
        alert('Error saving configuration. Please try again.');
    }
}
