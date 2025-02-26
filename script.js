// Global variables
let characters = [];
const skillMap = {
    'acrobatics': 'Acro',
    'arcana': 'Arca',
    'athletics': 'Athl',
    'crafting': 'Craf',
    'deception': 'Dece',
    'diplomacy': 'Dipl',
    'intimidation': 'Inti',
    'medicine': 'Medi',
    'nature': 'Natu',
    'occultism': 'Occu',
    'performance': 'Perf',
    'religion': 'Reli',
    'society': 'Soci',
    'stealth': 'Stea',
    'survival': 'Surv',
    'thievery': 'Thie'
};

// Function to show status message
function showStatusMessage(message, isError = false) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    statusDiv.className = isError ? 'error' : 'success';
    statusDiv.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 3000);
}

// Function to process JSON data
function processJsonData(jsonText) {
    try {
        const jsonData = JSON.parse(jsonText);
        
        // Check if this is valid PF2e character data
        if (!jsonData.build) {
            showStatusMessage('Invalid PF2e character data. Make sure your JSON contains character build information.', true);
            return false;
        }
        
        // Extract character data
        const characterData = extractCharacterData(jsonData);
        
        // Add character to our list
        characters.push(characterData);
        
        // Add row to the table
        addCharacterRow(characterData);
        
        // Update highest values
        updateHighestValues();
        
        showStatusMessage(`Character "${characterData.name}" imported successfully!`);
        return true;
    } catch (error) {
        showStatusMessage('Error parsing JSON: ' + error.message, true);
        return false;
    }
}

// Function to extract character data from JSON
function extractCharacterData(data) {
    // Get numeric values or handle if not present
    function getNumeric(value, defaultValue = 0) {
        return (value !== undefined && value !== null) ? Number(value) : defaultValue;
    }

    // Calculate total skill value by adding proficiency level plus ability modifier
    function calculateSkillValue(profValue, abilityScore) {
        const abilityMod = Math.floor((abilityScore - 10) / 2);
        return getNumeric(profValue) + abilityMod;
    }

    // Extract archetypes from feats
    const archetypes = [];
    if (data.build?.feats) {
        data.build.feats.forEach(feat => {
            // Check for Dedication feats which indicate archetypes
            if (feat && feat[0] && feat[0].includes('Dedication')) {
                // Extract the archetype name (remove " Dedication" suffix)
                const archetypeName = feat[0].replace(' Dedication', '');
                if (!archetypes.includes(archetypeName)) {
                    archetypes.push(archetypeName);
                }
            }
        });
    }

    // Extract healing feats and abilities
    const healingAbilities = [];
    
    // Check for Battle Medicine feat
    let hasBattleMedicine = false;
    if (data.build?.feats) {
        data.build.feats.forEach(feat => {
            if (feat && feat[0] === "Battle Medicine") {
                hasBattleMedicine = true;
                healingAbilities.push("Battle Medicine");
            }
            // Can add more healing feat checks here in the future
        });
    }

    // Create the character data object
    const characterData = {
        name: data.build?.name || 'Unknown',
        class: data.build?.class || 'Unknown',
        archetypes: archetypes,
        level: getNumeric(data.build?.level, 1),
        healingAbilities: healingAbilities,
        hasBattleMedicine: hasBattleMedicine,
        
        // Ability scores
        abilities: {
            str: getNumeric(data.build?.abilities?.str),
            dex: getNumeric(data.build?.abilities?.dex),
            con: getNumeric(data.build?.abilities?.con),
            int: getNumeric(data.build?.abilities?.int),
            wis: getNumeric(data.build?.abilities?.wis),
            cha: getNumeric(data.build?.abilities?.cha)
        },
        
        // Defenses
        defenses: {
            ac: getNumeric(data.build?.acTotal?.acTotal),
            fort: 10 + getNumeric(data.build?.proficiencies?.fortitude),
            ref: 10 + getNumeric(data.build?.proficiencies?.reflex),
            will: 10 + getNumeric(data.build?.proficiencies?.will)
        },
        
        // Skills
        skills: {}
    };

    // Process all skills
    for (const [skill, abbrev] of Object.entries(skillMap)) {
        const profValue = getNumeric(data.build?.proficiencies?.[skill]);
        
        // Determine which ability score to use for this skill
        let abilityScore;
        switch(skill) {
            case 'athletics':
                abilityScore = characterData.abilities.str;
                break;
            case 'acrobatics':
            case 'stealth':
            case 'thievery':
                abilityScore = characterData.abilities.dex;
                break;
            case 'arcana':
            case 'crafting':
            case 'society':
            case 'occultism':
                abilityScore = characterData.abilities.int;
                break;
            case 'medicine':
            case 'nature':
            case 'religion':
            case 'survival':
                abilityScore = characterData.abilities.wis;
                break;
            case 'deception':
            case 'diplomacy':
            case 'intimidation':
            case 'performance':
                abilityScore = characterData.abilities.cha;
                break;
            default:
                abilityScore = 10; // Fallback
        }
        
        // Add item bonus if present
        let itemBonus = 0;
        if (data.build?.mods && data.build.mods[skill.charAt(0).toUpperCase() + skill.slice(1)]) {
            itemBonus = getNumeric(data.build.mods[skill.charAt(0).toUpperCase() + skill.slice(1)]["Item Bonus"]);
        }
        
        // Calculate total skill value
        characterData.skills[skill] = calculateSkillValue(profValue, abilityScore) + itemBonus;
    }

    return characterData;
}

// Function to add a character row to the table
function addCharacterRow(character) {
    const tbody = document.getElementById('characterRows');
    
    // Clear "No characters" message if it exists
    if (document.querySelector('.no-characters')) {
        tbody.innerHTML = '';
    }
    
    const row = document.createElement('tr');
    
    // Format class as pill
    const classDisplay = `<span class="pill pill-class">${character.class}</span>`;
    
    // Format archetypes as pills
    const archetypesDisplay = character.archetypes.length > 0 
        ? character.archetypes.map(archetype => `<span class="pill pill-archetype">${archetype}</span>`).join(' ')
        : '-';
        
    // Format healing abilities as pills
    const healingDisplay = character.healingAbilities.length > 0
        ? character.healingAbilities.map(ability => `<span class="pill pill-healing">${ability}</span>`).join(' ')
        : '-';
        
    row.innerHTML = `
        <td class="character-name info-group">${character.name}</td>
        <td class="info-group">${classDisplay}</td>
        <td class="info-group">${archetypesDisplay}</td>
        <td class="info-group">${character.level}</td>
        <td class="healing-group">${healingDisplay}</td>
        
        <td class="ability-group">${character.abilities.str}</td>
        <td class="ability-group">${character.abilities.dex}</td>
        <td class="ability-group">${character.abilities.con}</td>
        <td class="ability-group">${character.abilities.int}</td>
        <td class="ability-group">${character.abilities.wis}</td>
        <td class="ability-group">${character.abilities.cha}</td>
        
        <td class="defense-group">${character.defenses.ac}</td>
        <td class="defense-group">${character.defenses.fort}</td>
        <td class="defense-group">${character.defenses.ref}</td>
        <td class="defense-group">${character.defenses.will}</td>
    `;
    
    // Skills
    for (const skill of Object.keys(skillMap)) {
        row.innerHTML += `<td class="skill-group">${character.skills[skill]}</td>`;
    }
    
    tbody.appendChild(row);
}

// Function to check if at least one character has Battle Medicine
function hasBattleMedicine() {
    return characters.some(character => character.hasBattleMedicine);
}

// Function to update party composition warnings
function updatePartyWarnings() {
    // Create warnings container if it doesn't exist
    let warningsContainer = document.getElementById('warningsContainer');
    if (!warningsContainer) {
        warningsContainer = document.createElement('div');
        warningsContainer.id = 'warningsContainer';
        warningsContainer.className = 'warnings-container';
        
        const title = document.createElement('h2');
        title.className = 'warnings-title';
        title.textContent = 'Party Composition Warnings';
        warningsContainer.appendChild(title);
        
        const warningsGrid = document.createElement('div');
        warningsGrid.id = 'warningsGrid';
        warningsGrid.className = 'warnings-grid';
        warningsContainer.appendChild(warningsGrid);
        
        document.querySelector('.container').appendChild(warningsContainer);
    }
    
    const warningsGrid = document.getElementById('warningsGrid');
    warningsGrid.innerHTML = ''; // Clear existing warnings
    
    // Don't show warnings if no characters
    if (characters.length === 0) {
        warningsGrid.innerHTML = '<div class="warning-card">No characters imported yet</div>';
        return;
    }
    
    // Battle Medicine warning
    addWarning(
        warningsGrid,
        'Battle Medicine',
        'At least one character should have Battle Medicine for emergency healing',
        hasBattleMedicine()
    );
    
    // Zero Skills warning - directly check the Highest Values row
    const highestRow = document.getElementById('highestValues');
    const zeroSkills = [];
    
    // Skills start at index 12 in the highest values row
    let skillIndex = 0;
    for (let i = 12; i < highestRow.cells.length; i++) {
        const value = parseInt(highestRow.cells[i].textContent);
        if (value === 0 || isNaN(value)) { // Check for 0 or NaN (like "-")
            const skillKey = Object.keys(skillMap)[skillIndex];
            if (skillKey) { // Make sure we have a valid skill key
                const skillName = skillKey.charAt(0).toUpperCase() + skillKey.slice(1);
                zeroSkills.push(skillName);
            }
        }
        skillIndex++;
    }
    
    // Always display a skills warning card, but make it success or error as appropriate
    if (zeroSkills.length > 0) {
        addWarning(
            warningsGrid,
            'Missing Skills',
            `No character has training in: ${zeroSkills.join(', ')}`,
            false
        );
    } else {
        addWarning(
            warningsGrid,
            'Skill Coverage',
            'Full skill coverage achieved. At least one character has training in every skill.',
            true
        );
    }
}

// Helper function to add a warning card
function addWarning(container, title, description, isSuccess) {
    const card = document.createElement('div');
    card.className = `warning-card ${isSuccess ? 'success' : 'error'}`;
    
    const icon = document.createElement('div');
    icon.className = 'warning-icon';
    icon.innerHTML = isSuccess ? '✅' : '⚠️';
    
    const content = document.createElement('div');
    content.className = 'warning-content';
    
    const titleElem = document.createElement('div');
    titleElem.className = 'warning-title';
    titleElem.textContent = title;
    
    const descElem = document.createElement('div');
    descElem.className = 'warning-description';
    descElem.textContent = description;
    
    content.appendChild(titleElem);
    content.appendChild(descElem);
    
    card.appendChild(icon);
    card.appendChild(content);
    
    container.appendChild(card);
}

// Function to update the highest values row
function updateHighestValues() {
    if (characters.length === 0) {
        return;
    }

    const highestRow = document.getElementById('highestValues');
    const cells = highestRow.cells;
    
    // Skip the first cell (the "Highest Values" header with colspan=4)
    // Cells start at index 1
    
    // Skip the healing column (it doesn't have highest values)
    // index 1 is healing
    
    // Abilities (starting at index 2)
    cells[2].textContent = Math.max(...characters.map(c => c.abilities.str));
    cells[3].textContent = Math.max(...characters.map(c => c.abilities.dex));
    cells[4].textContent = Math.max(...characters.map(c => c.abilities.con));
    cells[5].textContent = Math.max(...characters.map(c => c.abilities.int));
    cells[6].textContent = Math.max(...characters.map(c => c.abilities.wis));
    cells[7].textContent = Math.max(...characters.map(c => c.abilities.cha));
    
    // Defenses (starting at index 8)
    cells[8].textContent = Math.max(...characters.map(c => c.defenses.ac));
    cells[9].textContent = Math.max(...characters.map(c => c.defenses.fort));
    cells[10].textContent = Math.max(...characters.map(c => c.defenses.ref));
    cells[11].textContent = Math.max(...characters.map(c => c.defenses.will));
    
    // Skills (starting at index 12)
    let cellIndex = 12;
    for (const skill of Object.keys(skillMap)) {
        cells[cellIndex].textContent = Math.max(...characters.map(c => c.skills[skill]));
        cellIndex++;
    }

    // Highlight highest values in the table
    highlightHighestValues();
    
    // Update party composition warnings
    updatePartyWarnings();
}

// Function to highlight the highest values in each column
function highlightHighestValues() {
    const table = document.getElementById('characterTable');
    const tbody = document.getElementById('characterRows');
    const tfoot = document.querySelector('tfoot');
    const rows = tbody.rows;
    
    if (rows.length === 0) return;
    
    // Get the highest values from the footer row
    const highestRow = tfoot.rows[0];
    const highestValues = [];
    
    // Skip healing column which doesn't have highest values
    // Collect highest values starting from abilities
    for (let i = 2; i < highestRow.cells.length; i++) {
        highestValues.push(parseInt(highestRow.cells[i].textContent));
    }
    
    // For each value cell in the character rows
    for (let row = 0; row < rows.length; row++) {
        // Start at column 5 (STR) - skip name, class, archetypes, level, healing
        for (let col = 5; col < rows[row].cells.length; col++) {
            const cellValue = parseInt(rows[row].cells[col].textContent);
            // Compare with corresponding value in highestValues (accounting for the offset)
            const highestValue = highestValues[col - 5];
            
            if (!isNaN(cellValue) && !isNaN(highestValue) && cellValue === highestValue) {
                rows[row].cells[col].classList.add('highest');
            } else {
                rows[row].cells[col].classList.remove('highest');
            }
        }
    }
}

// Event Listener for Import Button (File)
document.getElementById('importButton').addEventListener('click', function() {
    const fileInput = document.getElementById('jsonFileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        showStatusMessage('Please select a file first', true);
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const success = processJsonData(e.target.result);
        if (success) {
            // Reset file input
            fileInput.value = '';
        }
    };
    
    reader.readAsText(file);
});

// Event Listener for Import from Clipboard Button
document.getElementById('clipboardButton').addEventListener('click', async function() {
    try {
        const clipboardText = await navigator.clipboard.readText();
        
        if (!clipboardText) {
            showStatusMessage('Clipboard is empty', true);
            return;
        }
        
        const success = processJsonData(clipboardText);
        
    } catch (error) {
        showStatusMessage('Error accessing clipboard: ' + error.message, true);
    }
});

// Event Listener for Clear Button
document.getElementById('clearButton').addEventListener('click', function() {
    // Clear the characters array
    characters = [];
    
    // Clear the table body
    const tbody = document.getElementById('characterRows');
    tbody.innerHTML = '<tr><td colspan="31" class="no-characters">No characters imported yet</td></tr>';
    
    // Reset highest values row
    const highestRow = document.getElementById('highestValues');
    const cells = highestRow.cells;
    
    for (let i = 1; i < cells.length; i++) {
        cells[i].textContent = '-';
    }
    
    // Update warnings
    updatePartyWarnings();
    
    showStatusMessage('All characters cleared');
});

// Initialize with example data
window.addEventListener('DOMContentLoaded', () => {
    // Check if we have any character data in the paste.txt
    try {
        const jsonString = document.querySelector('.document_content')?.textContent;
        if (jsonString) {
            processJsonData(jsonString);
        }
    } catch (e) {
        console.log('No initial data to load:', e);
    }
});