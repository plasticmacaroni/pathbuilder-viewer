// Global variables
let characters = [];
let warnings = [];
let healingAbilities = []; // New variable to store healing abilities
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
            // Add more warning files here
        ];

        warnings = [];

        // Load each warning file
        for (const file of warningFiles) {
            const response = await fetch(file);
            if (response.ok) {
                const yamlText = await response.text();
                const warningConfig = jsyaml.load(yamlText);
                warnings.push(warningConfig);
            } else {
                console.error(`Failed to load warning file: ${file}`);
            }
        }

        console.log(`Loaded ${warnings.length} warnings`);

        // Load healing abilities from YAML
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
        console.error('Error loading warnings or healing abilities:', error);
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
    } catch (error) {
        console.error('Error processing JSON data:', error);
        showStatusMessage('Error processing character data: ' + error.message, true);
    }
}

// Preprocess character data to extract derived values
function preprocessCharacterData(data) {
    // Store original data and add extracted data section
    const processedData = {
        ...data,
        extracted: {
            archetypes: extractArchetypes(data),
            healingAbilities: extractHealingAbilities(data),
            skills: extractSkillValues(data),
            skillProficiencies: extractSkillProficiencies(data),
            defenses: extractDefenseValues(data)
        }
    };

    return processedData;
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
    const healingAbilities = [];
    // Example healing abilities to look for
    const healingFeats = [
        'Battle Medicine',
        'Treat Wounds',
        'Healing Hands',
        'Lay on Hands',
        'Wholeness of Body'
    ];

    // Check for healing class features and feats
    if (data.build?.feats) {
        data.build.feats.forEach(feat => {
            if (feat && feat[0] && healingFeats.includes(feat[0])) {
                healingAbilities.push(feat[0]);
            }
        });
    }

    // Check for healing spells
    if (data.build?.spellsKnown) {
        for (const level in data.build.spellsKnown) {
            const spells = data.build.spellsKnown[level];
            spells.forEach(spell => {
                if (spell && spell.includes('Heal')) {
                    if (!healingAbilities.includes('Healing Spells')) {
                        healingAbilities.push('Healing Spells');
                    }
                }
            });
        }
    }

    return healingAbilities;
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

// Extract skill proficiency levels
function extractSkillProficiencies(data) {
    const proficiencies = {};

    for (const skill in skillMap) {
        const profValue = getNumeric(data.build?.proficiencies?.[skill]);

        // Convert numeric proficiency to letter code
        let profLevel = "U"; // Default to Untrained
        if (profValue === 2) profLevel = "T";
        else if (profValue === 4) profLevel = "E";
        else if (profValue === 6) profLevel = "M";
        else if (profValue === 8) profLevel = "L";

        proficiencies[skill] = profLevel;
    }

    return proficiencies;
}

// Extract skill values
function extractSkillValues(data) {
    const skills = {};

    for (const skill in skillMap) {
        const profValue = getNumeric(data.build?.proficiencies?.[skill]);

        // Determine which ability score to use for this skill
        let abilityScore;
        switch (skill) {
            case 'athletics':
                abilityScore = getNumeric(data.build?.abilities?.str);
                break;
            case 'acrobatics':
            case 'stealth':
            case 'thievery':
                abilityScore = getNumeric(data.build?.abilities?.dex);
                break;
            case 'arcana':
            case 'crafting':
            case 'society':
            case 'occultism':
                abilityScore = getNumeric(data.build?.abilities?.int);
                break;
            case 'medicine':
            case 'nature':
            case 'religion':
            case 'survival':
                abilityScore = getNumeric(data.build?.abilities?.wis);
                break;
            case 'deception':
            case 'diplomacy':
            case 'intimidation':
            case 'performance':
                abilityScore = getNumeric(data.build?.abilities?.cha);
                break;
            default:
                abilityScore = 10; // Fallback
        }

        // Calculate ability modifier
        const abilityMod = Math.floor((abilityScore - 10) / 2);

        // Add item bonus if present
        let itemBonus = 0;
        if (data.build?.mods && data.build.mods[skill.charAt(0).toUpperCase() + skill.slice(1)]) {
            itemBonus = getNumeric(data.build.mods[skill.charAt(0).toUpperCase() + skill.slice(1)]["Item Bonus"]);
        }

        // Calculate total skill value
        skills[skill] = profValue + abilityMod + itemBonus;
    }

    return skills;
}

// Get numeric value or default
function getNumeric(value, defaultValue = 0) {
    return (value !== undefined && value !== null) ? Number(value) : defaultValue;
}

// Extract a value from an object using a dot-notation path
function getValueByPath(obj, path) {
    if (!path) return undefined;

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

// Add a character row based on YAML schema
function addCharacterRow(character) {
    const tbody = document.getElementById('characterRows');
    const tableStructure = window.tableStructure;

    // Clear "No characters" message if it exists
    if (document.querySelector('.no-characters')) {
        tbody.innerHTML = '';
    }

    const row = document.createElement('tr');

    // For each section and column in the structure
    tableStructure.sections.forEach(section => {
        section.columns.forEach(column => {
            const cell = document.createElement('td');
            cell.className = `${section.id}-group`;

            // Store column info as data attributes
            cell.dataset.columnId = column.id;
            cell.dataset.jsonPath = column.jsonPath || '';
            cell.dataset.highestValue = column.highestValue.toString();

            // Set proficiency data attribute if needed
            if (column.showProficiency) {
                const proficiency = getValueByPath(character, column.proficiencyPath);
                if (proficiency) {
                    cell.dataset.proficiency = proficiency;
                }
            }

            // Extract value from character JSON using path from YAML
            const value = getValueByPath(character, column.jsonPath);

            // Format value based on display type specified in YAML
            if (column.displayType === 'pill' && value) {
                cell.innerHTML = `<span class="pill pill-${section.id}">${value}</span>`;
            } else if (column.displayType === 'pill-list' && Array.isArray(value) && value.length > 0) {
                cell.innerHTML = value.map(item =>
                    `<span class="pill pill-${section.id}">${item}</span>`
                ).join(' ');
            } else {
                // Default display
                cell.textContent = value !== undefined ? value : '-';
            }

            row.appendChild(cell);
        });
    });

    tbody.appendChild(row);
}

// Update the highest values row based on YAML schema
function updateHighestValues() {
    if (characters.length === 0) {
        return;
    }

    const tableStructure = window.tableStructure;
    const highestRow = document.getElementById('highestValues');

    // Skip the first cell (the "Highest Values" header)
    let cellIndex = 1;

    // Process each section and column from YAML
    tableStructure.sections.slice(1).forEach(section => {
        section.columns.forEach(column => {
            if (cellIndex < highestRow.cells.length) {
                const cell = highestRow.cells[cellIndex];

                // Only update if this column should track highest value (from YAML)
                if (column.highestValue) {
                    // Calculate highest value using jsonPath from YAML
                    const values = characters.map(character => {
                        const value = getValueByPath(character, column.jsonPath);
                        return typeof value === 'number' ? value : Number.MIN_SAFE_INTEGER;
                    });

                    const highestValue = Math.max(...values);
                    cell.textContent = isNaN(highestValue) || highestValue === Number.MIN_SAFE_INTEGER ? '-' : highestValue;
                } else {
                    cell.textContent = '-';
                }

                cellIndex++;
            }
        });
    });

    // Highlight highest values in the table
    highlightHighestValues();
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

// Function to update party composition warnings using the loaded YAML warnings
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

    // Process each warning from loaded YAML files
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

            // Handle template variables in the message - replace {{variable}} with its value
            message = message.replace(/{{(.*?)}}/g, (match, expr) => {
                try {
                    return eval(expr) || '';
                } catch (e) {
                    console.error(`Error evaluating template expression ${expr}:`, e);
                    return '';
                }
            });

            // Add the warning card
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

// Function to highlight the highest values in each column
function highlightHighestValues() {
    const tbody = document.getElementById('characterRows');
    const highestRow = document.getElementById('highestValues');
    const rows = tbody.rows;

    if (rows.length === 0) return;

    // For each character row
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const cells = rows[rowIndex].cells;

        // For each cell in the row
        for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
            const cell = cells[cellIndex];

            // Skip cells without jsonPath or not marked for highest value
            if (!cell.dataset.jsonPath || cell.dataset.highestValue !== 'true') {
                continue;
            }

            // Find matching column in highest row by columnId
            const columnId = cell.dataset.columnId;
            const highestCell = Array.from(highestRow.cells).find(
                hc => hc.dataset.columnId === columnId
            );

            if (highestCell) {
                const cellValue = parseInt(cell.textContent);
                const highestValue = parseInt(highestCell.textContent);

                if (!isNaN(cellValue) && !isNaN(highestValue) && cellValue === highestValue) {
                    cell.classList.add('highest');
                } else {
                    cell.classList.remove('highest');
                }
            }
        }
    }
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
function saveCharactersToCache(characters) {
    localStorage.setItem('pf2eCharacters', JSON.stringify(characters));
}

function loadCharactersFromCache() {
    const cachedCharacters = localStorage.getItem('pf2eCharacters');
    if (cachedCharacters) {
        return JSON.parse(cachedCharacters);
    }
    return [];
}

function clearCharacterCache() {
    localStorage.removeItem('pf2eCharacters');
}

// New function to render all characters from the characters array
function renderCharacters() {
    // Clear the table first
    const tbody = document.getElementById('characterRows');
    tbody.innerHTML = '';

    // If there are no characters, show the "No characters" message
    if (characters.length === 0) {
        tbody.innerHTML = '<tr><td colspan="31" class="no-characters">No characters imported yet</td></tr>';
        return;
    }

    // Add each character to the table
    for (const character of characters) {
        addCharacterRow(character);
    }

    // Update the highest values and highlighting
    updateHighestValues();
}

// Initialize the application
async function init() {
    try {
        // Load table structure first
        const tableStructure = await loadTableStructure();

        if (!tableStructure) {
            console.error('Failed to load table structure');
            return;
        }

        // Store the table structure for later use
        window.tableStructure = tableStructure;

        // Initialize the table structure
        initializeTableStructure(tableStructure);

        // Update the global skill map
        updateGlobalSkillMap();

        // Load warnings
        await loadWarnings();

        // Load characters from cache
        characters = loadCharactersFromCache();

        // Render the characters
        renderCharacters();

        // Update party warnings
        updatePartyWarnings();

        // Check for data in paste.txt
        try {
            const jsonString = document.querySelector('.document_content')?.textContent;
            if (jsonString) {
                processJsonData(jsonString);
            }
        } catch (e) {
            console.log('No initial data to load:', e);
        }
    } catch (error) {
        console.error('Error during initialization:', error);
    }
}

// When DOM is ready, initialize the app
window.addEventListener('DOMContentLoaded', init);

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
                saveCharactersToCache();
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

            // Add icon if specified
            if (column.icon) {
                columnHeader.innerHTML = `<i class="fas fa-${column.icon}"></i> ${column.title}`;
            } else {
                columnHeader.textContent = column.title;
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

// Generate the highest values row based on YAML structure
function generateHighestValuesRow(tableStructure) {
    const row = document.createElement('tr');
    row.id = 'highestValues';

    // For each section
    tableStructure.sections.forEach((section, sectionIndex) => {
        if (sectionIndex === 0) {
            // First section is usually a header like "Highest Values"
            const cell = document.createElement('td');
            cell.className = `${section.id}-group`;

            // Calculate the colspan based on number of columns in this section
            cell.colSpan = section.columns.length;

            cell.textContent = 'Highest Values';
            row.appendChild(cell);
        } else {
            // For remaining sections, add individual column cells
            section.columns.forEach(column => {
                const cell = document.createElement('td');
                cell.className = `${section.id}-group`;
                cell.textContent = '-';

                // Store column info as data attributes for later reference
                cell.dataset.columnId = column.id;
                cell.dataset.jsonPath = column.jsonPath || '';
                cell.dataset.highestValue = column.highestValue.toString();

                row.appendChild(cell);
            });
        }
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