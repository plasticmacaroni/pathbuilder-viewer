// Global variables
let characters = [];
let warnings = [];
let healingAbilities = []; // New variable to store healing abilities
let tenuousTips = []; // New array to store tenuous tips
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

// Function to load warnings and healing abilities from YAML files
async function loadWarnings() {
    try {
        // List of warning files to load
        const warningFiles = [
            'warnings/battle-medicine.yaml',
            'warnings/skill-coverage.yaml',
            'warnings/level-consistency.yaml',
            'warnings/knowledge-skills.yaml',
            'warnings/charisma-skills.yaml',
            // Add more warning files here
        ];

        await loadYamlFiles(warningFiles, warnings, "warnings");

        // Load healing abilities from YAML
        await loadHealingAbilities();
    } catch (error) {
        console.error('Error loading warnings or healing abilities:', error);
    }
}

// Helper function to load healing abilities
async function loadHealingAbilities() {
    try {
        const healingResponse = await fetch('content/healing-abilities.yaml');
        if (healingResponse.ok) {
            const healingYaml = await healingResponse.text();
            const healingConfig = jsyaml.load(healingYaml);

            // Store the abilities list
            healingAbilities = healingConfig.abilities || [];
            console.log(`Loaded ${healingAbilities.length} healing abilities`);
        } else {
            console.error('Failed to load healing abilities');
            // Fallback to a minimal list if file can't be loaded
            healingAbilities = ["Battle Medicine", "Healing Font", "Lay on Hands", "Shield Block"];
        }
    } catch (error) {
        console.error('Error loading healing abilities:', error);
    }
}

// Function to load tenuous tips from YAML files
async function loadTenuousTips() {
    try {
        // List of tip files to load
        const tipFiles = [
            'tenuous-tips/bard-performance.yaml',
            'tenuous-tips/thievery-tools.yaml',
            'tenuous-tips/detect-magic.yaml',
            'tenuous-tips/dispel-magic.yaml',
            'tenuous-tips/trick-magic-item.yaml',
            'tenuous-tips/sight.yaml',
            'tenuous-tips/intimidating-glare.yaml',
            // Add more tip files here
        ];

        await loadYamlFiles(tipFiles, tenuousTips, "tenuous tips");
    } catch (error) {
        console.error('Error loading tenuous tips:', error);
    }
}

// Function to process the JSON data from input
function processJsonData(jsonString) {
    try {
        // Parse the JSON data
        const inputData = JSON.parse(jsonString);
        const processedData = preprocessCharacterData(inputData);

        // Add to characters array
        characters.push(processedData);

        // Add to the table
        addCharacterRow(processedData);

        // Update highest values
        updateHighestValues();

        // Update party warnings
        updatePartyWarnings();

        // Save to cache
        saveCharactersToCache(characters);

        showStatusMessage('Character imported successfully!');

        // Add this to your processJsonData function
        console.log("Processed character data:", characters[characters.length - 1]);
        console.log("Skills:", characters[characters.length - 1].extracted.skills);

        // After adding character and rendering
        renderCharacters();
        updateHighestValues();

        return true;
    } catch (error) {
        console.error('Error processing JSON data:', error);
        showStatusMessage('Error processing character data: ' + error.message, true);
        return false;
    }
}

// Extract skill values - KEEP THIS VERSION as it handles level calculation correctly
function extractSkills(data) {
    const skills = {};
    const skillProficiencies = {};
    const level = data.build?.level || 0; // Get character level

    // Map skills to abilities
    const skillMap = {
        'acrobatics': 'dex',
        'arcana': 'int',
        'athletics': 'str',
        'crafting': 'int',
        'deception': 'cha',
        'diplomacy': 'cha',
        'intimidation': 'cha',
        'medicine': 'wis',
        'nature': 'wis',
        'occultism': 'int',
        'performance': 'cha',
        'religion': 'wis',
        'society': 'int',
        'stealth': 'dex',
        'survival': 'wis',
        'thievery': 'dex'
    };

    for (const skill in skillMap) {
        const abilityKey = skillMap[skill];
        const profBonus = getNumeric(data.build?.proficiencies?.[skill]);
        const abilityScore = getNumeric(data.build?.abilities?.[abilityKey]);
        const abilityMod = Math.floor((abilityScore - 10) / 2);

        // Store proficiency letter
        skillProficiencies[skill] = getProficiencyLevel(profBonus);

        // Add level ONLY if trained (profBonus > 0)
        const itemBonus = data.build?.mods?.[capitalizeFirstLetter(skill)]?.["Item Bonus"] || 0;

        // Fix: Only add level if character has proficiency
        skills[skill] = (profBonus > 0 ? level : 0) + profBonus + abilityMod + itemBonus;
    }

    // Same fix for perception
    const perceptionProf = getNumeric(data.build?.proficiencies?.perception);
    const wisScore = getNumeric(data.build?.abilities?.wis);
    const wisMod = Math.floor((wisScore - 10) / 2);
    const perceptionItemBonus = data.build?.mods?.Perception?.["Item Bonus"] || 0;

    // Fix: Only add level if character has perception proficiency
    skills.perception = (perceptionProf > 0 ? level : 0) + perceptionProf + wisMod + perceptionItemBonus;

    return { skills, skillProficiencies };
}

// Helper to get proficiency level from numeric value
function getProficiencyLevel(numericValue) {
    switch (numericValue) {
        case 0: return "U"; // Untrained
        case 2: return "T"; // Trained
        case 4: return "E"; // Expert
        case 6: return "M"; // Master
        case 8: return "L"; // Legendary
        default: return "U"; // Default to Untrained
    }
}

// Helper to capitalize first letter for mod matching
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Extract archetypes from feats
function extractArchetypes(data) {
    const archetypes = [];
    if (data.build?.feats) {
        data.build.feats.forEach(feat => {
            if (feat && feat[0] && feat[0].includes('Dedication')) {
                const archetypeName = feat[0].replace(' Dedication', '');
                if (!archetypes.includes(archetypeName)) {
                    archetypes.push(archetypeName);
                }
            }
        });
    }
    return archetypes;
}

// Extract healing abilities
function extractHealingAbilities(data) {
    const characterHealingAbilities = [];

    // Use the globally loaded healingAbilities from the YAML file
    // instead of the limited hard-coded list

    // Check for healing class features and feats
    if (data.build?.feats) {
        data.build.feats.forEach(feat => {
            if (feat && feat[0]) {
                // Check against the full list of healing abilities
                if (healingAbilities.includes(feat[0])) {
                    characterHealingAbilities.push(feat[0]);
                }
            }
        });
    }

    // Check for healing spells
    if (data.build?.spellsKnown) {
        let hasHealingSpells = false;

        // Check prepared spells
        if (data.build.spellCasters) {
            for (const caster of data.build.spellCasters) {
                if (caster.prepared) {
                    for (const levelData of caster.prepared) {
                        for (const spell of levelData.list) {
                            if (spell.includes('Heal') ||
                                spell === 'Soothe' ||
                                healingAbilities.includes(spell)) {
                                hasHealingSpells = true;
                                break;
                            }
                        }
                        if (hasHealingSpells) break;
                    }
                }
                if (caster.spells) {
                    for (const levelData of caster.spells) {
                        for (const spell of levelData.list) {
                            if (spell.includes('Heal') ||
                                spell === 'Soothe' ||
                                healingAbilities.includes(spell)) {
                                hasHealingSpells = true;
                                break;
                            }
                        }
                        if (hasHealingSpells) break;
                    }
                }
            }
        }

        // Also check spellsKnown
        for (const level in data.build.spellsKnown) {
            const spells = data.build.spellsKnown[level];
            for (const spell of spells) {
                if (spell && (
                    spell.includes('Heal') ||
                    spell === 'Soothe' ||
                    healingAbilities.includes(spell))) {
                    hasHealingSpells = true;
                    break;
                }
            }
            if (hasHealingSpells) break;
        }

        if (hasHealingSpells) {
            characterHealingAbilities.push('Healing Spells');
        }
    }

    // Check focus spells
    if (data.build?.focus) {
        let hasFocusHealing = false;

        // Loop through traditions
        for (const tradition in data.build.focus) {
            // Loop through abilities
            for (const ability in data.build.focus[tradition]) {
                // Check focus spells
                const focusSpells = data.build.focus[tradition][ability].focusSpells || [];

                for (const spell of focusSpells) {
                    if (spell.includes('Heal') ||
                        spell === 'Lay on Hands' ||
                        spell === 'Life Boost' ||
                        healingAbilities.includes(spell)) {
                        hasFocusHealing = true;
                        break;
                    }
                }
                if (hasFocusHealing) break;
            }
            if (hasFocusHealing) break;
        }

        if (hasFocusHealing) {
            characterHealingAbilities.push('Focus Healing');
        }
    }

    return characterHealingAbilities;
}

// Extract defense values
function extractDefenseValues(data) {
    return {
        ac: getNumeric(data.build?.acTotal?.acTotal),
        fort: 10 + getNumeric(data.build?.proficiencies?.fortitude),
        ref: 10 + getNumeric(data.build?.proficiencies?.reflex),
        will: 10 + getNumeric(data.build?.proficiencies?.will)
    };
}

// Get numeric value or default
function getNumeric(value, defaultValue = 0) {
    return (value !== undefined && value !== null) ? Number(value) : defaultValue;
}

// Helper function to get a value from a nested object using a dot-notation path
function getValueByPath(obj, path) {
    if (!path || !obj) return undefined;

    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
        if (current === null || current === undefined) {
            return undefined;
        }
        current = current[part];
    }

    return current;
}

// Update the character row function to properly handle proficiency display and action buttons
function addCharacterRow(character) {
    const tbody = document.getElementById('characterRows');
    const tableStructure = window.tableStructure;

    // Clear "No characters" message if it exists
    if (document.querySelector('.no-characters')) {
        tbody.innerHTML = '';
    }

    const row = document.createElement('tr');

    // Find character index (needed for delete functionality)
    const characterIndex = characters.indexOf(character);

    // For each section and column in the structure
    tableStructure.sections.forEach(section => {
        section.columns.forEach(column => {
            const cell = document.createElement('td');
            // Get the actual value based on YAML jsonPath
            const value = getValueByPath(character, column.jsonPath);

            // Add class based on section for styling
            cell.classList.add(`${section.id}-group`);

            // Handle action buttons if specified in YAML
            if (column.displayType === 'action-buttons') {
                // Create delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-character-btn';
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                deleteBtn.title = `Remove ${character.build?.name || 'Character'}`;

                // Connect to existing removeCharacter function
                deleteBtn.addEventListener('click', function () {
                    if (confirm(`Are you sure you want to remove ${character.build?.name || 'this character'}?`)) {
                        removeCharacter(characterIndex);
                    }
                });

                cell.appendChild(deleteBtn);
            }
            // Handle proficiency display if specified in YAML
            else if (column.showProficiency && column.proficiencyPath) {
                const proficiencyValue = getValueByPath(character, column.proficiencyPath);
                const skillValue = getValueByPath(character, column.jsonPath);

                if (proficiencyValue !== undefined) {
                    // Convert numeric proficiency to string code if needed
                    let profCode;
                    if (typeof proficiencyValue === 'number') {
                        // Convert numerical proficiency to letter code
                        if (proficiencyValue === 0) profCode = 'U'; // Untrained
                        else if (proficiencyValue === 2) profCode = 'T'; // Trained
                        else if (proficiencyValue === 4) profCode = 'E'; // Expert
                        else if (proficiencyValue === 6) profCode = 'M'; // Master
                        else if (proficiencyValue === 8) profCode = 'L'; // Legendary
                        else profCode = 'U'; // Default
                    } else {
                        // If it's already a string code, use it as is
                        profCode = proficiencyValue;
                    }

                    // Set proficiency as a data attribute for styling
                    cell.dataset.proficiency = profCode;

                    // Display based on the YAML-specified display type
                    if (column.displayType === 'proficiency-badge') {
                        const profLabel = getProficiencyLabel(profCode);

                        // Format the display value with a plus sign for positive AND zero numbers
                        let displayValue = skillValue;
                        if (typeof skillValue === 'number' && skillValue >= 0) {
                            displayValue = '+' + skillValue;
                        }

                        cell.innerHTML = `<span class="value">${displayValue !== undefined ? displayValue : '-'}</span>
                                        <span class="prof-badge prof-${profCode.toLowerCase()}" 
                                        title="${profLabel}">${profCode}</span>`;
                    } else if (column.displayType === 'proficiency-pill-list' && Array.isArray(skillValue)) {
                        // For traditions, display pills with proficiency badges
                        if (skillValue.length > 0) {
                            const items = skillValue.map(item => {
                                const itemKey = item.toLowerCase();
                                const itemProf = proficiencyValue[itemKey] || 'U';
                                const profLabel = getProficiencyLabel(itemProf);

                                return `<span class="pill pill-${section.id}">
                                    ${item} <span class="prof-badge prof-${itemProf.toLowerCase()}" 
                                    title="${profLabel}">${itemProf}</span>
                                </span>`;
                            });
                            cell.innerHTML = items.join(' ');
                        } else {
                            cell.textContent = '-';
                        }
                    } else {
                        // Default to just showing the value
                        cell.textContent = skillValue !== undefined ? skillValue : '-';
                    }
                } else {
                    cell.textContent = skillValue !== undefined ? skillValue : '-';
                }
            }
            // Handle other display types from YAML
            else if (column.displayType === 'pill' && value) {
                cell.innerHTML = `<span class="pill pill-${section.id}">${value}</span>`;
            } else if (column.displayType === 'pill-list' && Array.isArray(value) && value.length > 0) {
                cell.innerHTML = value.map(item =>
                    `<span class="pill pill-${section.id}">${item}</span>`
                ).join(' ');
            } else if (column.displayType === 'lore-proficiency-list' && Array.isArray(value)) {
                // Handle lore skills with proficiency badges
                if (value.length > 0) {
                    const items = value.map(lore => {
                        if (Array.isArray(lore) && lore.length >= 2) {
                            const loreName = lore[0];
                            const loreValue = lore[1];

                            // Skip untrained lore skills
                            if (loreValue === 0) return '';

                            // Convert numeric proficiency to letter code
                            let profCode = "U"; // Default to untrained
                            if (loreValue === 2) profCode = "T";
                            else if (loreValue === 4) profCode = "E";
                            else if (loreValue === 6) profCode = "M";
                            else if (loreValue === 8) profCode = "L";

                            // Skip untrained lore skills
                            if (profCode === "U") return '';

                            const profLabel = getProficiencyLabel(profCode);

                            // Use stronger styling for better visibility
                            return `<span class="pill pill-${section.id}" style="font-weight: bold; color: #000;">
                                ${loreName} <span class="prof-badge prof-${profCode.toLowerCase()}" 
                                style="color: #fff; font-weight: bold;"
                                title="${profLabel}">${profCode}</span>
                            </span>`;
                        }
                        return '';
                    }).filter(item => item); // Remove empty items

                    cell.innerHTML = items.length > 0 ? items.join(' ') : '-';
                } else {
                    cell.textContent = '-';
                }
            } else if (section.id === 'ability') {
                // For ability scores, add the modifier in parentheses
                if (typeof value === 'number') {
                    // Calculate the ability modifier
                    const modifier = Math.floor((value - 10) / 2);

                    // Format the modifier with + sign for positive and 0 values
                    const formattedModifier = modifier >= 0 ? `+${modifier}` : `${modifier}`;

                    // Display both the raw score and the modifier
                    cell.textContent = `${value} (${formattedModifier})`;
                } else {
                    cell.textContent = value !== undefined ? value : '-';
                }
            } else if ((section.id === 'defense' || section.id === 'skills') && typeof value === 'number') {
                // For defenses and skills, add plus sign before positive and zero values
                if (column.displayType === 'proficiency-badge') {
                    const profCode = column.proficiencyPath ?
                        getProficiencyLevel(getValueByPath(character, column.proficiencyPath)) : "U";
                    const profLabel = getProficiencyLabel(profCode);

                    // Format with plus sign for positive and zero numbers
                    const displayValue = value >= 0 ? `+${value}` : value;

                    cell.innerHTML = `<span class="value">${displayValue}</span>
                                    <span class="prof-badge prof-${profCode.toLowerCase()}" 
                                    title="${profLabel}">${profCode}</span>`;
                } else {
                    // Simple plus sign for values without badges
                    cell.textContent = value >= 0 ? `+${value}` : value;
                }
            } else if (section.id === 'senses') {
                cell.classList.add('senses-group');
                // Apply the same styling/structure as skill groups
            } else {
                // Default display
                cell.textContent = value !== undefined ? value : '-';
            }

            row.appendChild(cell);
        });
    });

    tbody.appendChild(row);
}

// Helper function to get the full proficiency label
function getProficiencyLabel(profCode) {
    switch (profCode) {
        case 'U': return 'Untrained';
        case 'T': return 'Trained';
        case 'E': return 'Expert';
        case 'M': return 'Master';
        case 'L': return 'Legendary';
        default: return 'Unknown';
    }
}

// Function to update the highest values row in the table footer
function updateHighestValues() {
    if (characters.length === 0) return;

    const tableStructure = window.tableStructure;
    const footerRow = document.getElementById('highestValues');

    if (!footerRow) return;

    let columnIndex = 0;

    // Process each section and column
    tableStructure.sections.forEach(section => {
        section.columns.forEach(column => {
            // Skip first column in actions section (it shows "Highest:")
            if (section.id === 'actions' && section.columns.indexOf(column) === 0) {
                columnIndex++;
                return;
            }

            // Only process columns marked for highest value
            if (column.highestValue && column.jsonPath) {
                const cell = footerRow.children[columnIndex];

                // Find highest value across all characters
                let highestValue = null;

                for (const character of characters) {
                    const value = getValueByPath(character, column.jsonPath);

                    // Only compare numeric values
                    if (typeof value === 'number') {
                        if (highestValue === null || value > highestValue) {
                            highestValue = value;
                        }
                    }
                }

                // Format and display the highest value
                if (highestValue !== null) {
                    // Format differently based on section type
                    if (section.id === 'defense' || section.id === 'skills') {
                        cell.textContent = highestValue >= 0 ? `+${highestValue}` : highestValue;
                    } else if (section.id === 'ability') {
                        // For ability scores, also show the modifier
                        const modifier = Math.floor((highestValue - 10) / 2);
                        const formattedMod = modifier >= 0 ? `+${modifier}` : modifier;
                        cell.textContent = `${highestValue} (${formattedMod})`;
                    } else {
                        cell.textContent = highestValue;
                    }

                    // Add highlighting class
                    cell.classList.add('highest-value');
                }
            }

            columnIndex++;
        });
    });

    // After setting highest values, highlight matching cells in the table
    highlightMatchingValues();
}

// Highlight cells in the table that match the highest values
function highlightMatchingValues() {
    const footerRow = document.getElementById('highestValues');
    const tbody = document.getElementById('characterRows');

    if (!footerRow || !tbody) return;

    // For each column in the footer row
    for (let i = 0; i < footerRow.children.length; i++) {
        const footerCell = footerRow.children[i];

        // Skip cells that don't have highest values
        if (!footerCell.classList.contains('highest-value')) continue;

        const highestValue = footerCell.textContent;

        // Check each row in the body
        Array.from(tbody.children).forEach(row => {
            // Skip the "no characters" row
            if (row.classList.contains('no-characters')) return;

            const cell = row.children[i];
            if (!cell) return;

            // Compare based on cell content or value spans
            let cellValue;

            // For cells with proficiency badges, extract just the value part
            const valueSpan = cell.querySelector('.value');
            if (valueSpan) {
                cellValue = valueSpan.textContent;
            } else if (cell.textContent) {
                cellValue = cell.textContent;
            }

            // Add or remove highlighting
            if (cellValue === highestValue) {
                cell.classList.add('highest-value');
            } else {
                cell.classList.remove('highest-value');
            }
        });
    }
}

// Build skill map from YAML structure
function buildSkillMap() {
    const tableStructure = window.tableStructure;
    const skillsSection = tableStructure.sections.find(s => s.id === 'skills');

    if (!skillsSection) return {};

    const skillMap = {};
    skillsSection.columns.forEach(column => {
        // Use the last part of the jsonPath as the key if it has dots
        const key = column.jsonPath?.includes('.') ?
            column.jsonPath.split('.').pop() : column.id;
        skillMap[key] = column.fullTitle || column.title;
    });

    return skillMap;
}

// Function to update party warnings
function updatePartyWarnings() {
    const warningsGrid = document.getElementById('warningsGrid');
    warningsGrid.innerHTML = ''; // Clear existing warnings

    // Don't show warnings if no characters
    if (characters.length === 0) {
        warningsGrid.innerHTML = '<div class="warning-card">No adventurers in your party yet. Import some brave souls!</div>';
        // Also update tenuous tips when there are no characters
        updateTenuousTips();
        return;
    }

    // Process each warning
    warnings.forEach(warning => {
        try {
            // Evaluate the check function
            let isSuccess = false;

            // Handle multi-line function
            if (typeof warning.checkFunction === 'string') {
                const fn = new Function('return ' + warning.checkFunction)();
                isSuccess = fn();
            }

            // Process message templates
            let message = isSuccess ? warning.successMessage : warning.failureMessage;

            // Replace template variables
            message = message.replace(/{{(.*?)}}/g, (match, expr) => {
                try {
                    // Handle common window variables
                    if (expr.startsWith('window.')) {
                        const windowVarPath = expr.replace('window.', '');
                        return window[windowVarPath] || '';
                    }

                    // Handle direct variable references
                    if (window[expr] !== undefined) {
                        return window[expr];
                    }

                    // Handle method calls safely (like .join)
                    if (expr.includes('.join')) {
                        const varName = expr.split('.')[0];
                        if (window[varName] && Array.isArray(window[varName])) {
                            return window[varName].join(', ');
                        }
                    }

                    return '';
                } catch (e) {
                    console.error(`Error processing template expression ${expr}:`, e);
                    return '';
                }
            });

            addWarning(
                warningsGrid,
                warning.title,
                message,
                isSuccess
            );
        } catch (error) {
            console.error(`Error processing warning "${warning.title}":`, error);
        }
    });

    // ADDED: Always update tenuous tips when warnings are updated
    updateTenuousTips();
}

// Helper function to add a warning card
function addWarning(container, title, description, isSuccess) {
    const card = document.createElement('div');
    card.className = `warning-card ${isSuccess ? 'success' : 'error'}`;

    // Add more context information
    if (!isSuccess) {
        card.dataset.priority = 'high'; // Add priority attribute
    }

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

// Event Listener for Import Button (File)
document.getElementById('importButton').addEventListener('click', function () {
    const fileInput = document.getElementById('jsonFileInput');
    const file = fileInput.files[0];

    if (!file) {
        showStatusMessage('Please select a file first', true);
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        const success = processJsonData(e.target.result);
        if (success) {
            // Reset file input
            fileInput.value = '';
        }
    };

    reader.readAsText(file);
});

// Event Listener for Import from Clipboard Button
document.getElementById('clipboardButton').addEventListener('click', async function () {
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
document.getElementById('clearButton').addEventListener('click', function () {
    // Clear the characters array
    characters = [];

    // Clear the table body
    const tbody = document.getElementById('characterRows');
    const totalColumns = calculateTotalColumns(window.tableStructure);
    tbody.innerHTML = `<tr><td colspan="${totalColumns}" class="no-characters">No characters imported yet</td></tr>`;

    // Reset highest values row
    const highestRow = document.getElementById('highestValues');
    const cells = highestRow.cells;

    for (let i = 1; i < cells.length; i++) {
        cells[i].textContent = '-';
    }

    // Update warnings
    updatePartyWarnings();

    // Clear character cache
    clearCharacterCache();

    showStatusMessage('All characters cleared');
});

// Add these functions to handle character caching
function saveCharactersToCache(charactersToSave) {
    try {
        localStorage.setItem('pf2e-characters', JSON.stringify(charactersToSave));
    } catch (error) {
        console.error('Error saving characters to cache:', error);
    }
}

function loadCharactersFromCache() {
    try {
        const cachedCharacters = localStorage.getItem('pf2e-characters');
        if (cachedCharacters) {
            characters = JSON.parse(cachedCharacters);
            console.log('Loaded characters from cache:', characters.length);
        }
    } catch (error) {
        console.error('Error loading characters from cache:', error);
        showStatusMessage('Error loading saved characters.', true);
    }
}

function clearCharacterCache() {
    try {
        localStorage.removeItem('pf2e-characters');
    } catch (error) {
        console.error('Error clearing character cache:', error);
    }
}

// Function to render characters - ensures table is properly updated
function renderCharacters() {
    // Clear the table first
    const tbody = document.getElementById('characterRows');
    tbody.innerHTML = '';

    // If there are no characters, show the "No characters" message
    if (characters.length === 0) {
        const totalColumns = calculateTotalColumns(window.tableStructure);
        tbody.innerHTML = `<tr><td colspan="${totalColumns}" class="no-characters">No characters imported yet</td></tr>`;
        return;
    }

    // Add each character to the table
    for (const character of characters) {
        addCharacterRow(character);
    }

    // Update warnings
    updatePartyWarnings();
    // Note: We don't need to call updateTenuousTips() here as it's already called by updatePartyWarnings()

    // Update highest values after rendering all characters
    updateHighestValues();
}

// Initialize the application
async function init() {
    try {
        // Load the table structure from YAML
        const response = await fetch('config/table-structure.yaml');
        const yamlText = await response.text();
        const tableStructure = jsyaml.load(yamlText);

        // Store the table structure globally for later use
        window.tableStructure = tableStructure;

        // Initialize the table with the loaded structure
        initializeTableStructure(tableStructure);

        // Load warnings, healing abilities, and tenuous tips
        await Promise.all([
            loadWarnings(),
            loadTenuousTips()
        ]);

        // Load characters from cache
        loadCharactersFromCache();

        // Render characters if any were loaded
        renderCharacters();

        // Update global skill map - if this function exists in your codebase
        if (typeof updateGlobalSkillMap === 'function') {
            updateGlobalSkillMap();
        }

        // Since initializeUI doesn't exist, use any existing initialization code
        // If you have event listeners or other initialization code, call them directly here
        // For example, if you have setupEventListeners(), call it:
        if (typeof setupEventListeners === 'function') {
            setupEventListeners();
        }

    } catch (error) {
        console.error('Error loading table structure:', error);
        showStatusMessage('Error initializing application. Please check console for details.', 'error');
    }
}

// Make sure this code is executed when the document is loaded
document.addEventListener('DOMContentLoaded', init);

// Add party export to clipboard functionality
async function exportPartyToClipboard() {
    if (characters.length === 0) {
        showStatusMessage('No characters to export!', true);
        return;
    }

    // Create a party object with metadata and character array
    const partyExport = {
        format: 'pf2e-character-comparison-party',
        version: '1.0',
        exportDate: new Date().toISOString(),
        characters: characters
    };

    // Convert to JSON string
    const partyJson = JSON.stringify(partyExport);

    try {
        // Copy to clipboard
        await navigator.clipboard.writeText(partyJson);
        showStatusMessage(`Party with ${characters.length} characters copied to clipboard! Share this text with others.`);
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        showStatusMessage('Failed to copy to clipboard. Please check browser permissions.', true);
    }
}

// Add party import from clipboard functionality
async function importPartyFromClipboard() {
    try {
        const clipboardText = await navigator.clipboard.readText();

        if (!clipboardText) {
            showStatusMessage('Clipboard is empty', true);
            return;
        }

        try {
            const partyData = JSON.parse(clipboardText);

            // Validate it's a party export file
            if (!partyData.format || partyData.format !== 'pf2e-character-comparison-party') {
                showStatusMessage('Invalid party data format in clipboard', true);
                return;
            }

            // Load all characters
            if (Array.isArray(partyData.characters) && partyData.characters.length > 0) {
                characters = partyData.characters;
                renderCharacters();
                showStatusMessage(`Imported party with ${partyData.characters.length} characters!`);
                saveCharactersToCache(characters);
            } else {
                showStatusMessage('No characters found in the party data', true);
            }
        } catch (error) {
            console.error('Error parsing party data:', error);
            showStatusMessage('Error parsing clipboard content. Make sure it contains valid party data.', true);
        }
    } catch (error) {
        console.error('Error accessing clipboard:', error);
        showStatusMessage('Error accessing clipboard: ' + error.message, true);
    }
}

// Replace the file-based party export/import event listeners with these in your initialization code
document.getElementById('exportPartyClipboardButton').addEventListener('click', exportPartyToClipboard);
document.getElementById('importPartyClipboardButton').addEventListener('click', importPartyFromClipboard);

// Extract value from character based on path specified in YAML
function extractValueByPath(object, path) {
    if (!path) return undefined;

    // Handle nested properties via dot notation
    const parts = path.split('.');
    let current = object;

    for (const part of parts) {
        if (current === null || current === undefined) {
            return undefined;
        }
        current = current[part];
    }

    return current;
}

// Function to generate table header based on YAML structure
function generateTableHeader(tableStructure) {
    const thead = document.createElement('thead');

    // First row - section headers
    const headerRow = document.createElement('tr');

    tableStructure.sections.forEach(section => {
        const sectionHeader = document.createElement('th');
        sectionHeader.className = `${section.id}-group`;

        // Automatically calculate colspan based on number of columns in this section
        const colspan = section.columns.length;
        sectionHeader.colSpan = colspan;

        // Add icon if specified
        if (section.icon) {
            sectionHeader.innerHTML = `<i class="fas fa-${section.icon}"></i> ${section.title}`;
        } else {
            sectionHeader.textContent = section.title;
        }

        headerRow.appendChild(sectionHeader);
    });

    thead.appendChild(headerRow);

    // Second row - column headers
    const columnRow = document.createElement('tr');

    tableStructure.sections.forEach(section => {
        section.columns.forEach(column => {
            const columnHeader = document.createElement('th');
            columnHeader.className = `${section.id}-group`;

            // Set column title with icon if specified
            if (column.icon) {
                columnHeader.innerHTML = `<i class="fas fa-${column.icon}"></i> ${column.title}`;
            } else {
                columnHeader.textContent = column.title;
            }

            // Add tooltip if fullTitle is specified
            if (column.fullTitle) {
                columnHeader.title = column.fullTitle;
            }

            columnRow.appendChild(columnHeader);
        });
    });

    thead.appendChild(columnRow);
    return thead;
}

// Helper function to calculate total columns in the table
function calculateTotalColumns(tableStructure) {
    let totalColumns = 0;

    tableStructure.sections.forEach(section => {
        totalColumns += section.columns.length;
    });

    return totalColumns;
}

// Initialize the table structure from YAML
function initializeTableStructure(tableStructure) {
    const table = document.getElementById('characterTable');

    // Clear existing content
    table.innerHTML = '';

    // Add the headers
    table.appendChild(generateTableHeader(tableStructure));

    // Add the body
    const tbody = document.createElement('tbody');
    tbody.id = 'characterRows';

    // Calculate total columns
    const totalColumns = calculateTotalColumns(tableStructure);

    // Add the "No characters" row
    const noCharactersRow = document.createElement('tr');
    const noCharactersCell = document.createElement('td');
    noCharactersCell.className = 'no-characters';
    noCharactersCell.colSpan = totalColumns;
    noCharactersCell.textContent = 'No adventurers in your party yet. Import some brave souls!';

    noCharactersRow.appendChild(noCharactersCell);
    tbody.appendChild(noCharactersRow);
    table.appendChild(tbody);

    // Add the footer with highest values row
    const tfoot = document.createElement('tfoot');
    tfoot.appendChild(generateHighestValuesRow(tableStructure));
    table.appendChild(tfoot);
}

// Generate the highest values row for the footer
function generateHighestValuesRow(tableStructure) {
    const row = document.createElement('tr');
    row.id = 'highestValues';

    // For each section and column in the structure
    tableStructure.sections.forEach(section => {
        section.columns.forEach(column => {
            const cell = document.createElement('td');
            cell.classList.add(`${section.id}-group`);

            // Add "Highest" text to the first column
            if (section.id === 'actions' && section.columns.indexOf(column) === 0) {
                cell.textContent = 'Highest Values';
                cell.style.textAlign = 'right';
            } else {
                cell.textContent = '-';

                // Mark cells that should show highest values
                if (column.highestValue) {
                    cell.dataset.columnId = column.id;
                }
            }

            row.appendChild(cell);
        });
    });

    return row;
}

// Update the global skill map
function updateGlobalSkillMap() {
    window.skillMap = buildSkillMap();
}

// Load the table structure from YAML file
async function loadTableStructure() {
    try {
        const response = await fetch('config/table-structure.yaml');
        const yamlText = await response.text();
        return jsyaml.load(yamlText);
    } catch (error) {
        console.error('Error loading table structure:', error);
        return null;
    }
}

// Helper function to add tradition if the character is proficient in it
function addTraditionIfProficient(prof, traditionName, traditions, proficiencies) {
    const traditionKey = traditionName.toLowerCase();
    const profKey = `casting${traditionName}`;

    if (prof[profKey] > 0 && !traditions.includes(traditionName)) {
        traditions.push(traditionName);
        proficiencies[traditionKey] = getProficiencyLevel(parseInt(prof[profKey]));
    }
}

// Function to extract spell traditions from character data
function extractSpellTraditions(data) {
    const traditions = [];
    const proficiencies = {};

    // Determine if the character is a full spellcaster or just has focus spells
    const hasSpellCasters = Boolean(data.build?.spellCasters && data.build.spellCasters.length > 0);

    // Process actual spellcasting traditions (classes with full spellcasting)
    if (hasSpellCasters) {
        // Check spellcasters array first for most reliable source
        for (const caster of data.build.spellCasters) {
            if (caster.magicTradition && caster.proficiency && caster.proficiency > 0) {
                const tradition = caster.magicTradition.charAt(0).toUpperCase() + caster.magicTradition.slice(1);
                if (!traditions.includes(tradition)) {
                    traditions.push(tradition);
                    proficiencies[tradition.toLowerCase()] = getProficiencyLevel(parseInt(caster.proficiency));
                }
            }
        }

        // If we found actual spellcasters, also check proficiencies as backup
        if (data.build.proficiencies) {
            const prof = data.build.proficiencies;
            // Add traditions not already found in spellCasters
            addTraditionIfProficient(prof, "Arcane", traditions, proficiencies);
            addTraditionIfProficient(prof, "Divine", traditions, proficiencies);
            addTraditionIfProficient(prof, "Occult", traditions, proficiencies);
            addTraditionIfProficient(prof, "Primal", traditions, proficiencies);
        }
    }

    // For non-spellcasters with focus magic, we'll only show traditions if they
    // have specific spellcasting feats that grant limited spell access
    if (!hasSpellCasters && data.build?.focus) {
        // Look for feats that grant limited spellcasting
        const spellcastingFeats = [
            "Basic Cleric Spellcasting", "Basic Wizard Spellcasting",
            "Basic Bard Spellcasting", "Basic Druid Spellcasting",
            "Basic Sorcerer Spellcasting", "Basic Oracle Spellcasting",
            "Basic Witch Spellcasting", "Basic Psychic Spellcasting"
        ];

        const hasCastingFeat = data.build.feats &&
            data.build.feats.some(feat =>
                feat && spellcastingFeats.includes(typeof feat === 'string' ? feat : feat[0])
            );

        // Only include focus traditions if they have a spellcasting feat
        if (hasCastingFeat && data.build.proficiencies) {
            const prof = data.build.proficiencies;
            // Add all traditions the character is proficient in
            addTraditionIfProficient(prof, "Arcane", traditions, proficiencies);
            addTraditionIfProficient(prof, "Divine", traditions, proficiencies);
            addTraditionIfProficient(prof, "Occult", traditions, proficiencies);
            addTraditionIfProficient(prof, "Primal", traditions, proficiencies);
        }
    }

    return {
        traditions: traditions,
        proficiencies: proficiencies
    };
}

// Preprocess character data to extract all needed values
function preprocessCharacterData(data) {
    // Get success flag from the data
    const success = data.success === true;

    // If not successful, return the data as is
    if (!success) return data;

    // Extract skills and proficiencies
    const { skills, skillProficiencies } = extractSkills(data);

    // Extract spell traditions
    const { traditions, proficiencies: traditionProficiencies } = extractSpellTraditions(data);

    // Create the extracted data object
    const extracted = {
        archetypes: extractArchetypes(data),
        healingAbilities: extractHealingAbilities(data),
        skills: skills,
        skillProficiencies: skillProficiencies,
        defenses: extractDefenseValues(data),
        magicTraditions: traditions,
        traditionProficiencies: traditionProficiencies
    };

    // Add senses data to the extracted information
    extracted.senses = extractVisionTypes(data);

    // Return the processed data
    return {
        ...data,
        extracted
    };
}

// Function to update tenuous tips display
function updateTenuousTips() {
    const tipsGrid = document.getElementById('tenuousTipsGrid');
    tipsGrid.innerHTML = ''; // Clear existing tips

    // Don't show tips if no characters
    if (characters.length === 0) {
        tipsGrid.innerHTML = '<div class="warning-card">No adventurers in your party yet. Import some brave souls!</div>';
        return;
    }

    // Process each tip
    tenuousTips.forEach(tip => {
        try {
            // Evaluate the check function
            let isSuccess = false;

            // Handle multi-line function
            if (typeof tip.checkFunction === 'string') {
                const fn = new Function('return ' + tip.checkFunction)();
                isSuccess = fn();
            }

            // Process message templates
            let message = isSuccess ? tip.successMessage : tip.failureMessage;

            // Replace template variables (same as in updatePartyWarnings)
            message = message.replace(/{{(.*?)}}/g, (match, expr) => {
                try {
                    // Handle common window variables
                    if (expr.startsWith('window.')) {
                        const windowVarPath = expr.replace('window.', '');
                        return window[windowVarPath] || '';
                    }

                    // Handle direct variable references
                    if (window[expr] !== undefined) {
                        return window[expr];
                    }

                    // Handle method calls safely (like .join)
                    if (expr.includes('.join')) {
                        const varName = expr.split('.')[0];
                        if (window[varName] && Array.isArray(window[varName])) {
                            return window[varName].join(', ');
                        }
                    }

                    return '';
                } catch (e) {
                    console.error(`Error processing template expression ${expr}:`, e);
                    return '';
                }
            });

            // Use the same addWarning function as updatePartyWarnings
            addWarning(
                tipsGrid,
                tip.title,
                message,
                isSuccess
            );
        } catch (error) {
            console.error(`Error processing tip "${tip.title}":`, error);
        }
    });
}

// Extract vision information
function extractVisionTypes(data) {
    const allSenses = [];

    // Check for vision types in specials/abilities
    if (data.build && data.build.specials && Array.isArray(data.build.specials)) {
        for (const special of data.build.specials) {
            if (typeof special === 'string') {
                if (special.toLowerCase().includes('darkvision')) {
                    allSenses.push("Darkvision");
                }
                if (special.toLowerCase().includes('low-light vision')) {
                    allSenses.push("Low-Light Vision");
                }
                if (special.toLowerCase().includes('scent')) {
                    allSenses.push("Scent");
                }
                if (special.toLowerCase().includes('tremorsense')) {
                    allSenses.push("Tremorsense");
                }
            }
        }
    }

    // Check for ancestry that might have darkvision inherently
    const darkvisionAncestries = ['dwarf', 'gnome', 'half-orc', 'orc'];
    if (data.build?.ancestry &&
        darkvisionAncestries.includes(data.build.ancestry.toLowerCase()) &&
        !allSenses.includes("Darkvision")) {
        allSenses.push("Darkvision");
    }

    // Check for familiar senses
    if (data.build?.familiars && Array.isArray(data.build.familiars)) {
        for (const familiar of data.build.familiars) {
            if (familiar.abilities && Array.isArray(familiar.abilities)) {
                // Define all possible familiar senses
                const sensesToCheck = [
                    'Darkvision',
                    'Low-Light Vision',
                    'Scent',
                    'Tremorsense',
                    'Echolocation',
                    'Greater Darkvision',
                    'See Invisibility',
                    'Wavesense'
                ];

                // Check each sense
                for (const sense of sensesToCheck) {
                    if (familiar.abilities.includes(sense) &&
                        !allSenses.includes(sense) &&
                        !allSenses.includes(`${sense} (Familiar)`)) {
                        allSenses.push(`${sense} (Familiar)`);
                    }
                }
            }
        }
    }

    return {
        allSenses: allSenses
    };
}

// Fix the removeCharacter function to call renderCharacters instead of undefined buildTable
function removeCharacter(index) {
    if (index >= 0 && index < characters.length) {
        // Remove from array
        characters.splice(index, 1);

        // Save updated list to cache
        saveCharactersToCache(characters);

        // Rebuild the entire table with updated characters list
        renderCharacters();

        // Update warnings and tips
        updatePartyWarnings();

        showStatusMessage('Character removed successfully!');
    }
}

// Update the renderSection function to add remove buttons in the header
function renderSection(section, data) {
    const sectionElement = document.createElement('div');
    sectionElement.className = 'table-section';
    sectionElement.id = `section-${section.id}`;

    // Create section header
    const headerElement = document.createElement('div');
    headerElement.className = 'section-header';
    headerElement.innerHTML = `<i class="fas fa-${section.icon}"></i> ${section.title}`;
    sectionElement.appendChild(headerElement);

    // Generate table
    const tableElement = document.createElement('table');
    tableElement.className = 'character-table';

    // Create header row
    const headerRow = document.createElement('tr');
    headerRow.className = 'table-header';

    // Add empty cell for row headers
    headerRow.appendChild(document.createElement('th'));

    // Add character headers with remove buttons
    characters.forEach((character, index) => {
        const th = document.createElement('th');
        th.className = `character-${index}`;

        // Create header content with name and remove button
        const headerContent = document.createElement('div');
        headerContent.className = 'character-header';

        // Add character name
        const nameSpan = document.createElement('span');
        nameSpan.textContent = character.build?.name || `Character ${index + 1}`;
        nameSpan.className = 'character-name';
        headerContent.appendChild(nameSpan);

        // Add remove button (only in the first section)
        if (section.id === 'info') {
            const removeButton = document.createElement('button');
            removeButton.className = 'remove-character-btn';
            removeButton.innerHTML = '<i class="fas fa-times"></i>';
            removeButton.title = `Remove ${character.build?.name || 'Character'}`;
            removeButton.onclick = (e) => {
                e.stopPropagation(); // Prevent event bubbling
                if (confirm(`Are you sure you want to remove ${character.build?.name || 'this character'}?`)) {
                    removeCharacter(index);
                }
            };
            headerContent.appendChild(removeButton);
        }

        th.appendChild(headerContent);
        headerRow.appendChild(th);
    });

    tableElement.appendChild(headerRow);

    // Create rows for each column
    // ... rest of the rendering logic ...

    return sectionElement;
}

// Helper function to load YAML files
async function loadYamlFiles(fileList, targetArray, description) {
    targetArray.length = 0; // Clear array

    // Load each file
    for (const file of fileList) {
        const response = await fetch(file);
        if (response.ok) {
            const yamlText = await response.text();
            const config = jsyaml.load(yamlText);
            targetArray.push(config);
        } else {
            console.error(`Failed to load ${description} file: ${file}`);
        }
    }

    console.log(`Loaded ${targetArray.length} ${description}`);
    return true;
}
