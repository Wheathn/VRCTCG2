const getRandomFromRarity = (set, rarity, cardData) => {
    const names = cardData[set]._name || [];
    const rarities = cardData[set]._rarity || [];
    let validIndices = [];

    for (let i = 1; i < names.length; i++) { // Start at 1 to skip ID 0
        if (rarities[i] === rarity && names[i] && names[i] !== 'null') {
            validIndices.push(i);
        }
    }

    if (validIndices.length === 0) {
        console.warn(`[Pack] No valid cards found for rarity '${rarity}' in set '${set}'.`);
        return -1;
    }

    return validIndices[Math.floor(Math.random() * validIndices.length)];
};

const getRandomRarity = (setId) => {
    const isSwordShield = setId >= 18 && setId <= 32;
    const premiumRarities = isSwordShield
        ? ["Rare Holo", "Rare Holo V", "Rare Holo VMAX", "Rare Holo VSTAR", "Rare Ultra", "Rare Secret", "Rare Rainbow", "Rare Shiny", "Trainer Gallery Rare Holo", "Radiant Rare", "Amazing Rare"]
        : ["Double Rare", "Illustration Rare", "Ultra Rare", "Special Illustration Rare", "Hyper Rare"];

    const rholoSlotRoll = Math.floor(Math.random() * 100) + 1; // 1-100
    if (rholoSlotRoll <= 50) return "Common"; // 50%
    if (rholoSlotRoll <= 80) return "Uncommon"; // 30%
    if (rholoSlotRoll <= 95) return "Rare"; // 15%
    if (!isSwordShield && rholoSlotRoll <= 97) return "ACE SPEC Rare"; // 2% for Scarlet & Violet
    return premiumRarities[Math.floor(Math.random() * premiumRarities.length)]; // 5% or 3%
};

const getRareSlotRarity = (setId) => {
    const rareSlotRoll = Math.floor(Math.random() * 1000) + 1; // 1-1000
    let rarity = "Rare";

    if (setId === 21) { // Champion's Path (SWSH35)
        if (rareSlotRoll <= 400) rarity = "Rare Holo"; // 40%
        else if (rareSlotRoll <= 650) rarity = "Rare Holo V"; // 25%
        else if (rareSlotRoll <= 850) rarity = "Rare Holo VMAX"; // 20%
        else if (rareSlotRoll <= 900) rarity = "Amazing Rare"; // 5%
        else if (rareSlotRoll <= 950) rarity = "Rare Ultra"; // 5%
        else if (rareSlotRoll <= 980) rarity = "Rare Secret"; // 3%
        else rarity = "Rare Shiny"; // 2%
    } else if (setId === 23) { // Shining Fates (SWSH45)
        if (rareSlotRoll <= 400) rarity = "Rare"; // 40%
        else if (rareSlotRoll <= 600) rarity = "Rare Holo"; // 20%
        else if (rareSlotRoll <= 750) rarity = "Rare Holo V"; // 15%
        else if (rareSlotRoll <= 850) rarity = "Rare Holo VMAX"; // 10%
        else if (rareSlotRoll <= 900) rarity = "Amazing Rare"; // 5%
        else if (rareSlotRoll <= 950) rarity = "Rare Ultra"; // 5%
        else if (rareSlotRoll <= 970) rarity = "Rare Secret"; // 2%
        else rarity = "Rare Shiny"; // 3%
    } else if (setId >= 18 && setId <= 32) { // Sword & Shield
        if (rareSlotRoll <= 432) rarity = "Rare"; // 43.2%
        else if (rareSlotRoll <= 687) rarity = "Rare Holo"; // 25.5%
        else if (rareSlotRoll <= 838) rarity = "Rare Holo V"; // 15.1%
        else if (rareSlotRoll <= 891) rarity = "Rare Holo VMAX"; // 5.3%
        else if (rareSlotRoll <= 917) rarity = "Rare Holo VSTAR"; // 2.6%
        else if (rareSlotRoll <= 940) rarity = "Rare Ultra"; // 2.3%
        else if (rareSlotRoll <= 960) rarity = "Radiant Rare"; // 2.0%
        else if (rareSlotRoll <= 980) rarity = "Amazing Rare"; // 2.0%
        else if (rareSlotRoll <= 987) rarity = "Rare Secret"; // 0.7%
        else if (rareSlotRoll <= 998) rarity = "Rare Rainbow"; // 1.1%
        else if (rareSlotRoll <= 999) rarity = "Trainer Gallery Rare Holo"; // 0.1%
        else rarity = "Rare Shiny"; // 0.1%
    } else if (setId >= 2 && setId <= 15) { // Scarlet & Violet
        if (rareSlotRoll <= 649) rarity = "Rare"; // 64.98%
        else if (rareSlotRoll <= 784) rarity = "Double Rare"; // 13.54%
        else if (rareSlotRoll <= 860) rarity = "Illustration Rare"; // 7.52%
        else if (rareSlotRoll <= 925) rarity = "Ultra Rare"; // 6.48%
        else if (rareSlotRoll <= 965) rarity = "Shiny Rare"; // 4.0%
        else if (rareSlotRoll <= 995) rarity = "Shiny Ultra Rare"; // 3.0%
        else if (rareSlotRoll <= 998) rarity = "Special Illustration Rare"; // 0.3%
        else rarity = "Hyper Rare"; // 0.2%
    }

    return rarity;
};

const getRandomFromRarityWithReroll = (set, setId, initialRarity, isRareSlot, cardData) => {
    const swordShieldRareRarities = [
        "Rare", "Rare Holo", "Rare Holo V", "Rare Holo VMAX", "Rare Holo VSTAR",
        "Rare Ultra", "Radiant Rare", "Amazing Rare", "Rare Secret", "Rare Rainbow",
        "Trainer Gallery Rare Holo", "Rare Shiny"
    ];
    const scarletVioletRareRarities = [
        "Rare", "Double Rare", "Illustration Rare", "Ultra Rare", "Shiny Rare",
        "Shiny Ultra Rare", "Special Illustration Rare", "Hyper Rare"
    ];
    const validRarities = (setId === 1 || setId === 17) ? ["Promo"]
        : (setId >= 18 && setId <= 32) ? swordShieldRareRarities
            : (setId >= 2 && setId <= 15) ? scarletVioletRareRarities
                : ["Rare"];

    let currentRarity = initialRarity;
    const maxAttempts = 50;
    let attempts = 0;

    while (attempts < maxAttempts) {
        console.log(`[Pack] Attempt ${attempts + 1}: Trying rarity '${currentRarity}' for set '${set}'`);
        const cardId = getRandomFromRarity(set, currentRarity, cardData);
        if (cardId !== -1) {
            console.log(`[Pack] Selected card ID ${cardId} with rarity '${currentRarity}' for set '${set}'`);
            return cardId;
        }

        attempts++;
        console.warn(`[Pack] Attempt ${attempts}: No valid cards for rarity '${currentRarity}' in set '${set}'. Rerolling...`);
        currentRarity = isRareSlot
            ? validRarities[Math.floor(Math.random() * validRarities.length)]
            : getRandomRarity(setId);
    }

    console.error(`[Pack] Exhausted reroll attempts (${maxAttempts}) for rarity '${initialRarity}' in set '${set}'. Using fallback.`);
    return getFallbackCard(set, setId, initialRarity, isRareSlot, cardData);
};

const getFallbackCard = (set, setId, fallbackRarity, isRareSlot, cardData) => {
    const swordShieldFullRarities = [
        "Rare Shiny", "Trainer Gallery Rare Holo", "Rare Rainbow", "Rare Secret",
        "Amazing Rare", "Radiant Rare", "Rare Ultra", "Rare Holo VSTAR",
        "Rare Holo VMAX", "Rare Holo V", "Rare Holo", "Rare", "Uncommon", "Common"
    ];
    const scarletVioletFullRarities = [
        "Hyper Rare", "Special Illustration Rare", "Shiny Ultra Rare", "Shiny Rare",
        "Ultra Rare", "Illustration Rare", "Double Rare", "Rare", "ACE SPEC Rare",
        "Uncommon", "Common"
    ];
    const rarityHierarchy = isRareSlot
        ? ((setId >= 18 && setId <= 32) ? swordShieldFullRarities.slice(0, -2)
            : (setId >= 2 && setId <= 15) ? scarletVioletFullRarities.slice(0, -2)
                : ["Promo"])
        : ((setId >= 18 && setId <= 32) ? swordShieldFullRarities
            : (setId >= 2 && setId <= 15) ? scarletVioletFullRarities
                : ["Promo"]);

    let currentRarityIndex = rarityHierarchy.indexOf(fallbackRarity);
    if (currentRarityIndex === -1) {
        console.warn(`[Pack] Fallback rarity '${fallbackRarity}' not found in hierarchy for set '${set}'. Starting from first available rarity.`);
        currentRarityIndex = 0;
    }

    for (let i = currentRarityIndex; i < rarityHierarchy.length; i++) {
        const currentRarity = rarityHierarchy[i];
        const cardId = getRandomFromRarity(set, currentRarity, cardData);
        if (cardId !== -1) {
            console.log(`[Pack] Fallback to '${currentRarity}' for set '${set}', selected card ID: ${cardId}`);
            return cardId;
        }
    }

    const names = cardData[set]._name || [];
    for (let i = 1; i < names.length; i++) {
        if (names[i] && names[i] !== 'null') {
            console.log(`[Pack] No cards in rarity hierarchy for set '${set}'. Selected valid card ID: ${i}`);
            return i;
        }
    }

    console.error(`[Pack] No valid cards found in set '${set}'. Returning default card ID 1.`);
    return 1;
};

const generateBoosterPack = (set, setId, cardData) => {
    if (!cardData[set] || !cardData[set]._name || !cardData[set]._name.length || !cardData[set]._rarity) {
        console.error(`[Pack] Invalid card data for set '${set}'`);
        return [];
    }

    // Ensure SVE set exists for energy card
    if (!cardData['SVE'] || !cardData['SVE']._name || !cardData['SVE']._rarity) {
        console.error(`[Pack] Invalid card data for energy set 'SVE'`);
        return [];
    }

    let setType;
    if (setId === 1) setType = "Scarlet & Violet Promo";
    else if (setId === 17) setType = "Sword & Shield Promo";
    else if (setId >= 2 && setId <= 15) setType = "Scarlet & Violet";
    else if (setId >= 18 && setId <= 32) setType = "Sword & Shield";
    else setType = "Unknown";

    console.log(`Opening a new ${setType} booster pack for set ${set} (SetID: ${setId})...`);

    const cardCount = (setId === 1 || setId === 17) ? 5 : 11;
    const cardNums = new Array(cardCount).fill(0);
    const openedCards = [];

    if (setId === 1 || setId === 17) {
        // Promo packs: 5 Promo cards
        for (let i = 0; i < 5; i++) {
            let cardId = getRandomFromRarity(set, "Promo", cardData);
            if (cardId === -1) cardId = getFallbackCard(set, setId, "Promo", false, cardData);
            cardNums[i] = cardId;
            openedCards.push({
                id: `${set}:${cardId}`,
                name: cardData[set]._name[cardId] || 'Unknown Card',
                rarity: cardData[set]._rarity[cardId] || 'Promo'
            });
        }
    } else {
        // Scarlet & Violet or Sword & Shield: 1 Energy (from SVE with drop table) + 4 Commons + 3 Uncommons + 2 Reverse Holo + 1 Rare Slot
        // First card: Energy from SVE with 1/15 chance for IDs 9-16, 14/15 for IDs 1-8
        cardNums[0] = (Math.floor(Math.random() * 15) + 1 === 1) ? Math.floor(Math.random() * 8) + 9 : Math.floor(Math.random() * 8) + 1;
        openedCards.push({
            id: `SVE:${cardNums[0]}`,
            name: cardData['SVE']._name[cardNums[0]] || 'Unknown Energy Card',
            rarity: cardData['SVE']._rarity[cardNums[0]] || 'Energy'
        });

        // 4 Commons
        for (let i = 1; i <= 4; i++) {
            let cardId = getRandomFromRarity(set, "Common", cardData);
            if (cardId === -1) cardId = getFallbackCard(set, setId, "Common", false, cardData);
            cardNums[i] = cardId;
            openedCards.push({
                id: `${set}:${cardId}`,
                name: cardData[set]._name[cardId] || 'Unknown Card',
                rarity: cardData[set]._rarity[cardId] || 'Common'
            });
        }

        // 3 Uncommons
        for (let i = 5; i <= 7; i++) {
            let cardId = getRandomFromRarity(set, "Uncommon", cardData);
            if (cardId === -1) cardId = getFallbackCard(set, setId, "Uncommon", false, cardData);
            cardNums[i] = cardId;
            openedCards.push({
                id: `${set}:${cardId}`,
                name: cardData[set]._name[cardId] || 'Unknown Card',
                rarity: cardData[set]._rarity[cardId] || 'Uncommon'
            });
        }

        // 2 Reverse Holo
        for (let i = 8; i <= 9; i++) {
            const reverseHoloRarity = getRandomRarity(setId);
            let cardId = getRandomFromRarityWithReroll(set, setId, reverseHoloRarity, false, cardData);
            cardNums[i] = cardId;
            openedCards.push({
                id: `${set}:${cardId}`,
                name: cardData[set]._name[cardId] || 'Unknown Card',
                rarity: cardData[set]._rarity[cardId] || reverseHoloRarity
            });
        }

        // 1 Rare Slot
        const rareSlotRarity = getRareSlotRarity(setId);
        let cardId = getRandomFromRarityWithReroll(set, setId, rareSlotRarity, true, cardData);
        cardNums[10] = cardId;
        openedCards.push({
            id: `${set}:${cardId}`,
            name: cardData[set]._name[cardId] || 'Unknown Card',
            rarity: cardData[set]._rarity[cardId] || rareSlotRarity
        });
    }

    return openedCards;
};

module.exports = { generateBoosterPack };