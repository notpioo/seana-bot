
/**
 * Bot Settings Module
 * Loads configuration from settings.json
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../lib/utils/logger');

// Cache for configuration
let configCache = null;
let lastConfigLoadTime = 0;

// Default configuration
const defaultConfig = {
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

/**
 * Get bot configuration with cache invalidation
 * @param {boolean} forceReload - Force reload from disk
 * @returns {Promise<Object>} Bot configuration
 */
async function getBotConfig(forceReload = false) {
    try {
        const configFilePath = path.join(__dirname, 'settings.json');
        
        // Check if file has been modified since last load
        const stats = await fs.stat(configFilePath).catch(() => null);
        const fileModTime = stats ? stats.mtimeMs : 0;
        
        // Use cache if available and not forced to reload
        if (!forceReload && configCache && fileModTime <= lastConfigLoadTime) {
            return configCache;
        }
        
        // Load from file
        const data = await fs.readFile(configFilePath, 'utf8');
        const config = JSON.parse(data);
        
        // Update cache
        configCache = config;
        lastConfigLoadTime = Date.now();
        
        logger.info('Bot configuration loaded from disk');
        return config;
    } catch (error) {
        logger.error('Config file not found or invalid, using default config', error);
        // Save default config if file doesn't exist
        await saveBotConfig(defaultConfig);
        configCache = defaultConfig;
        lastConfigLoadTime = Date.now();
        return defaultConfig;
    }
}

/**
 * Save bot configuration
 * @param {Object} config - Bot configuration to save
 * @returns {Promise<boolean>} Success status
 */
async function saveBotConfig(config) {
    try {
        const configFilePath = path.join(__dirname, 'settings.json');
        await fs.writeFile(configFilePath, JSON.stringify(config, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving config:', error);
        return false;
    }
}

/**
 * Get owner numbers as an array of strings
 * @returns {Promise<string[]>} Array of owner numbers
 */
async function getOwnerNumbers() {
    const config = await getBotConfig();
    return config.owners.map(owner => owner.number);
}

/**
 * Check if a number is an owner
 * @param {string} number - Number to check
 * @returns {Promise<boolean>} True if number is an owner
 */
async function isOwner(number) {
    const ownerNumbers = await getOwnerNumbers();
    return ownerNumbers.includes(number);
}

/**
 * Get bot prefix based on configuration
 * @returns {Promise<string|string[]>} Bot prefix or array of prefixes
 */
async function getPrefix() {
    const config = await getBotConfig();
    if (config.prefixType === 'empty') {
        return '';
    } else if (config.prefixType === 'single') {
        return config.prefix.charAt(0);
    } else {
        // For multi prefix
        return config.prefix.split('');
    }
}

module.exports = {
    getBotConfig,
    saveBotConfig,
    getOwnerNumbers,
    isOwner,
    getPrefix
};
