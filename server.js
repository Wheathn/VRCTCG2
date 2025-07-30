require('dotenv').config();
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');
const { generateBoosterPack } = require('./packLogic');

const app = express();
const PORT = process.env.PORT || 3000;
const CARD_DATA_DIR = path.join(__dirname, 'CardData');
const PLAYER_DATA_DIR = process.env.PLAYER_DATA_PATH || path.join(__dirname, 'PlayerData');
const IP_MAPPING_FILE = path.join(PLAYER_DATA_DIR, 'ip_mappings.json');
const XOR_KEY = 0x5A;
const SHIFT_VALUE = 42;

const SET_IDS = {
    'SVE': 0,
    'SVP': 1,
    'SV1': 2,
    'SV2': 3,
    'SV3': 4,
    'SV3PT5': 5,
    'SV4': 6,
    'SV4PT5': 7,
    'SV5': 8,
    'SV6': 9,
    'SV6PT5': 10,
    'SV7': 11,
    'SV8': 12,
    'SV8PT5': 13,
    'SV9': 14,
    'SV10': 15,
    'SWSHP': 17,
    'SWSH1': 18,
    'SWSH2': 19,
    'SWSH3': 20,
    'SWSH35': 21,
    'SWSH4': 23,
    'SWSH45': 23
};

app.use(express.json());

// Ensure PlayerData directory exists
async function ensurePlayerDataDir() {
    try {
        await fs.mkdir(PLAYER_DATA_DIR, { recursive: true });
        console.log(`PlayerData directory ensured at ${PLAYER_DATA_DIR}`);
    } catch (error) {
        console.error('Error creating PlayerData directory:', error.message);
    }
}

// Load/save IP-to-username mappings
async function loadIpMappings() {
    try {
        const data = await fs.readFile(IP_MAPPING_FILE, 'utf8');
        const mappings = JSON.parse(data);
        for (const [ip, username] of Object.entries(mappings)) {
            ipToUsername.set(ip, username);
        }
        console.log(`Loaded ${ipToUsername.size} IP mappings from ${IP_MAPPING_FILE}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`No IP mappings file found at ${IP_MAPPING_FILE}, starting fresh`);
        } else {
            console.error('Error loading IP mappings:', error.message);
        }
    }
}

async function saveIpMappings() {
    try {
        const mappings = Object.fromEntries(ipToUsername);
        await fs.writeFile(IP_MAPPING_FILE, JSON.stringify(mappings, null, 2));
        console.log(`Saved ${ipToUsername.size} IP mappings to ${IP_MAPPING_FILE}`);
    } catch (error) {
        console.error('Error saving IP mappings:', error.message);
    }
}

// Pack definitions with costs
const PACKS = {
    'SVP': { name: 'Scarlet & Violet Promo', cost: 100 },
    'SV1': { name: 'Paldea Evolved', cost: 100 },
    'SV2': { name: 'Scarlet & Violet Base Set', cost: 100 },
    'SWSHP': { name: 'Sword & Shield Promo', cost: 100 },
    'SWSH1': { name: 'Sword & Shield Base Set', cost: 100 },
    'SWSH35': { name: 'Champion\'s Path', cost: 120 },
    'SWSH45': { name: 'Shining Fates', cost: 120 }
};

// Load card data from txt files
let cardData = {};
async function loadCardData() {
    try {
        const files = await fs.readdir(CARD_DATA_DIR);
        const txtFiles = files.filter(file => file.endsWith('_data.txt'));
        console.log(`Found ${txtFiles.length} card data files in ${CARD_DATA_DIR}`);

        for (const file of txtFiles) {
            try {
                const filePath = path.join(CARD_DATA_DIR, file);
                const content = await fs.readFile(filePath, 'utf8');
                const setCode = file.replace('_data.txt', '').toUpperCase();

                const lines = content.split('\n').map(line => line.trim()).filter(line => line);
                const data = {};

                for (const line of lines) {
                    const [keyPart, value] = line.split('=').map(part => part.trim());
                    if (!keyPart || !value) continue;

                    const keyMatch = keyPart.match(/private\s+string(?:\[\])?\s+(\w+)/);
                    if (!keyMatch) continue;
                    const key = keyMatch[1];

                    if (keyPart.includes('[]')) {
                        try {
                            const arrayContent = value.replace(/^{|};?$/g, '').split(',').map(item => item.trim().replace(/^"|"$/g, ''));
                            data[key] = arrayContent;
                        } catch (error) {
                            console.warn(`Failed to parse array ${key} in ${file}:`, error.message);
                            data[key] = [];
                        }
                    } else {
                        data[key] = value.replace(/^"|"|;$/g, '');
                    }
                }

                cardData[setCode] = data;
                console.log(`Loaded card data for set ${setCode}`);
            } catch (error) {
                console.error(`Error loading card data from ${file}:`, error.message);
            }
        }
        console.log(`Loaded card data for ${Object.keys(cardData).length} sets`);
    } catch (error) {
        console.error('Error loading card data directory:', error.message);
        cardData = {};
    }
}

// Deobfuscation functions
function hexDecode(hexString) {
    if (!hexString || hexString.length % 2 !== 0) return '';
    let result = '';
    for (let i = 0; i < hexString.length; i += 2) {
        const hexPair = hexString.substr(i, 2);
        result += String.fromCharCode(parseInt(hexPair, 16));
    }
    return result;
}

function deobfuscate(obfuscatedHex) {
    let result = '';
    for (let i = 0; i < obfuscatedHex.length; i += 2) {
        const hexPair = obfuscatedHex.substr(i, 2);
        let value = parseInt(hexPair, 16);
        let unshifted = (value - SHIFT_VALUE + 256) % 256;
        let unxored = unshifted ^ XOR_KEY;
        result += unxored.toString(16).padStart(2, '0');
    }
    return result;
}

// Load or create player data
async function getPlayerData(username) {
    const filePath = path.join(PLAYER_DATA_DIR, `${username}.json`);
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            const newPlayer = {
                password: '',
                ip: '',
                currency: 25000,
                cards: {}
            };
            await fs.writeFile(filePath, JSON.stringify(newPlayer, null, 2));
            console.log(`Created new player data for ${username} with 25000 currency at ${filePath}`);
            return newPlayer;
        }
        console.error(`Error reading player data for ${username}:`, error.message);
        throw error;
    }
}

async function savePlayerData(username, data) {
    const filePath = path.join(PLAYER_DATA_DIR, `${username}.json`);
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        console.log(`Saved player data for ${username} at ${filePath}`);
    } catch (error) {
        console.error(`Error saving player data for ${username}:`, error.message);
        throw error;
    }
}

// IP to username mapping
const ipToUsername = new Map();

// Middleware to get client IP
function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;
    console.log(`[getClientIp] Raw x-forwarded-for: ${forwarded}, req.ip: ${req.ip}, Selected IP: ${ip}`);
    return ip;
}

// Login endpoint
app.get('/login', async (req, res) => {
    console.log('Handling /login');
    const obfuscatedUsername = req.query.n || '';
    const obfuscatedPassword = req.query.p || '';

    if (!obfuscatedUsername || !obfuscatedPassword) {
        console.log('[login] Missing username or password');
        return res.status(400).json({ error: 'Username and password required' });
    }

    const encodedUsername = deobfuscate(obfuscatedUsername);
    const encodedPassword = deobfuscate(obfuscatedPassword);
    const username = hexDecode(encodedUsername);
    const password = hexDecode(encodedPassword);

    if (!username || !password) {
        console.log('[login] Invalid username or password format');
        return res.status(400).json({ error: 'Invalid username or password format' });
    }

    try {
        const playerData = await getPlayerData(username);
        const clientIp = getClientIp(req);
        if (!playerData.password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            playerData.password = hashedPassword;
            playerData.ip = clientIp;
            await savePlayerData(username, playerData);
            ipToUsername.set(clientIp, username);
            await saveIpMappings();
            console.log(`[login] Registered new user: ${username} with IP ${clientIp}`);
            return res.json({ message: 'Account created and logged in', username });
        }

        const match = await bcrypt.compare(password, playerData.password);
        if (!match) {
            console.log(`[login] Password mismatch for ${username}`);
            return res.status(401).json({ error: 'Invalid password' });
        }

        playerData.ip = clientIp;
        await savePlayerData(username, playerData);
        ipToUsername.set(clientIp, username);
        await saveIpMappings();
        console.log(`[login] Logged in user: ${username} with IP ${clientIp}`);
        res.json({ message: 'Logged in successfully', username });
    } catch (error) {
        console.error('[login] Error in /login:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Middleware to get username from IP or JSON files
async function getUsernameFromIP(req, res, next) {
    const clientIp = getClientIp(req);
    let username = ipToUsername.get(clientIp);
    if (!username) {
        try {
            const files = await fs.readdir(PLAYER_DATA_DIR);
            const jsonFiles = files.filter(file => file.endsWith('.json') && file !== 'ip_mappings.json');
            for (const file of jsonFiles) {
                const filePath = path.join(PLAYER_DATA_DIR, file);
                const data = await fs.readFile(filePath, 'utf8');
                const playerData = JSON.parse(data);
                if (playerData.ip === clientIp && playerData.password) {
                    username = file.replace('.json', '');
                    ipToUsername.set(clientIp, username);
                    await saveIpMappings();
                    console.log(`[getUsernameFromIP] Matched IP ${clientIp} to user ${username} from JSON`);
                    break;
                }
            }
        } catch (error) {
            console.error('[getUsernameFromIP] Error scanning JSON files:', error.message);
        }
    }

    if (!username) {
        console.log(`[getUsernameFromIP] No username found for IP ${clientIp}`);
        return res.status(401).json({ error: 'Not authenticated. Please login first via /login.' });
    }

    req.username = username;
    next();
}

// Pack opening endpoint
app.get('/openpack/:pack', getUsernameFromIP, async (req, res) => {
    const { pack } = req.params;
    if (!PACKS[pack]) {
        return res.status(400).json({ error: `Unknown pack: ${pack}` });
    }

    try {
        const playerData = await getPlayerData(req.username);
        const packCost = PACKS[pack].cost;

        if (playerData.currency < packCost) {
            return res.status(400).json({ error: `Insufficient currency. Need ${packCost}, have ${playerData.currency}` });
        }

        const set = pack.toUpperCase();
        const setId = SET_IDS[set] || 0;
        const setData = cardData[set];
        if (!setData || !setData._name || !setData._name.length || !setData._rarity) {
            return res.status(400).json({ error: `No card data available for pack ${pack}` });
        }

        // Generate pack
        const openedCards = generateBoosterPack(set, setId, cardData);

        if (openedCards.length === 0) {
            return res.status(400).json({ error: `Failed to generate pack for ${pack}` });
        }

        // Update player inventory
        playerData.currency -= packCost;
        if (!playerData.cards[set]) {
            playerData.cards[set] = {};
        }
        for (const card of openedCards) {
            const cardId = parseInt(card.id.split(':')[1]);
            playerData.cards[set][cardId] = (playerData.cards[set][cardId] || 0) + 1;
        }

        await savePlayerData(req.username, playerData);
        res.json({
            message: `Opened ${pack} pack successfully`,
            cards: openedCards,
            newCurrency: playerData.currency
        });
    } catch (error) {
        console.error('Error in /openpack:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get player inventory
app.get('/inventory', getUsernameFromIP, async (req, res) => {
    try {
        const playerData = await getPlayerData(req.username);
        res.json({
            username: req.username,
            currency: playerData.currency,
            cards: playerData.cards
        });
    } catch (error) {
        console.error('Error in /inventory:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
async function startServer() {
    await ensurePlayerDataDir();
    await loadCardData();
    await loadIpMappings();
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

startServer().catch(error => {
    console.error('Failed to start server:', error.message);
    process.exit(1);
});