// Global variables
let characters = [];
let warnings = [];
let healingAbilities = []; // New variable to store healing abilities
let tenuousTips = []; // New array to store tenuous tips

// Configuration constants
// Proficiency system configuration
const PROFICIENCY_CONFIG = {
    levels: {
        0: { code: 'U', label: 'Untrained' },
        2: { code: 'T', label: 'Trained' },
        4: { code: 'E', label: 'Expert' },
        6: { code: 'M', label: 'Master' },
        8: { code: 'L', label: 'Legendary' }
    },
    // Map proficiency codes back to values (for reverse lookups)
    values: {
        'U': 0,
        'T': 2,
        'E': 4,
        'M': 6,
        'L': 8
    },
    getCode: function (value) {
        return this.levels[value]?.code || 'U';
    },
    getLabel: function (code) {
        for (const [value, data] of Object.entries(this.levels)) {
            if (data.code === code) return data.label;
        }
        return 'Unknown';
    },
    getValue: function (code) {
        return this.values[code] || 0;
    }
};

// Template function registry - for configuration-driven function calls in templates
const TEMPLATE_FUNCTIONS = {
    // Common template functions
    abilityModifier: function (score) {
        if (typeof score !== 'number') return 0;
        return Math.floor((score - 10) / 2);
    },
    formatModifier: function (value) {
        if (typeof value !== 'number') return value;
        return value >= 0 ? `+${value}` : `${value}`;
    },
    calculateSpeed: function (character) {
        const baseSpeed = character.build?.attributes?.speed || 0;
        const speedBonus = character.build?.attributes?.speedBonus || 0;
        return baseSpeed + speedBonus;
    }
};

// Make functions available globally for backward compatibility
Object.entries(TEMPLATE_FUNCTIONS).forEach(([name, fn]) => {
    window[name] = fn;
});

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

// Preprocess character data to extract all needed values
function preprocessCharacterData(data) {
    // Get success flag from the data
    const success = data.success === true;

    // If not successful, return the data as is
    if (!success) return data;

    // Create extracted data container
    const extracted = {};

    // Get the preprocessing rules from the table structure configuration
    const preprocessingRules = window.tableStructure?.preprocessing;

    if (preprocessingRules) {
        // Process all fields defined in the preprocessingRules
        processExtractedFields(data, extracted, preprocessingRules);
    } else {
        // Fallback to legacy extraction if no preprocessing rules defined
        console.warn("No preprocessing rules found in configuration. Using legacy extraction.");
        return legacyPreprocessCharacterData(data);
    }

    // Return the processed data
    return {
        ...data,
        extracted
    };
}

// New function to process extracted fields based on YAML configuration
function processExtractedFields(data, extractedData, preprocessingRules) {
    const extractors = preprocessingRules.extractors || {};
    const extractedFields = preprocessingRules.extractedFields || {};

    // Process each extractor
    const evaluatedExtractors = {};
    for (const [name, extractor] of Object.entries(extractors)) {
        evaluatedExtractors[name] = createExtractorFunction(extractor.formula);
    }

    // Process each extracted field
    for (const [fieldName, fieldConfig] of Object.entries(extractedFields)) {
        extractedData[fieldName] = extractField(data, fieldConfig, evaluatedExtractors);
    }
}

// Helper to evaluate a path or value
function evaluatePath(pathOrValue, context = {}) {
    // Add debugging for speed calculations
    if (pathOrValue && typeof pathOrValue === 'string' && pathOrValue.includes('speed')) {
        console.log(`Evaluating path: ${pathOrValue}`);
    }

    if (typeof pathOrValue === 'string' && pathOrValue.includes('(')) {
        // Handle function calls like abilityModifier(build.abilities.str)
        const funcMatch = pathOrValue.match(/(\w+)\((.*)\)/);
        if (funcMatch) {
            const [, funcName, argStr] = funcMatch;
            const arg = evaluatePath(argStr, context);
            const func = context[funcName] || window[funcName];
            if (typeof func === 'function') {
                return func(arg);
            }
        }
    } else if (typeof pathOrValue === 'string' && pathOrValue.includes('.')) {
        // Handle object paths
        const data = context.data || window.currentProcessingCharacter;
        const result = getValueByPath(data, pathOrValue);

        // Add debugging for speed-related paths
        if (pathOrValue && pathOrValue.includes('speed')) {
            console.log(`Path: ${pathOrValue}, Value:`, result);
        }

        // If the path contains "|| 0", split it and return the default if the value is undefined
        if (pathOrValue.includes('||')) {
            const [actualPath, defaultValue] = pathOrValue.split('||').map(p => p.trim());
            const value = getValueByPath(data, actualPath);

            if (value === undefined || value === null) {
                return defaultValue === '0' ? 0 : defaultValue;
            }
            return value;
        }

        return result;
    }

    // Direct value
    return pathOrValue;
}

// Extract a field based on its configuration
function extractField(data, fieldConfig, extractors) {
    // Store the data in a thread-local variable for path evaluation
    window.currentProcessingCharacter = data;

    try {
        const { type, formula, params } = fieldConfig;

        if (type === 'object' && fieldConfig.fields) {
            // Process an object with multiple fields
            const result = {};
            for (const [subFieldName, subFieldConfig] of Object.entries(fieldConfig.fields)) {
                result[subFieldName] = extractField(data, subFieldConfig, extractors);
            }
            return result;
        } else if (formula) {
            // Use a predefined extractor or evaluate the formula
            const extractor = typeof formula === 'string' && extractors[formula]
                ? extractors[formula]
                : createExtractorFunction(formula);

            // Extract using the evaluated parameters
            const evaluatedParams = {};
            if (params) {
                for (const [paramName, paramValue] of Object.entries(params)) {
                    evaluatedParams[paramName] = evaluatePath(paramValue, {
                        data,
                        ...extractors
                    });
                }
            }

            return extractor(evaluatedParams);
        }

        // Default - return empty based on type
        return type === 'array' ? [] : (type === 'object' ? {} : null);
    } finally {
        // Clear the thread-local variable
        delete window.currentProcessingCharacter;
    }
}

// Legacy preprocessing function as fallback
function legacyPreprocessCharacterData(data) {
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

// Extract skill values using the configuration-driven proficiency system
function extractSkills(data) {
    const skills = {};
    const skillProficiencies = {};
    const level = getPathValue(data, 'build.level', { defaultValue: 0 });

    // Define skill to ability mapping (should be in configuration)
    const skillAbilityMap = {
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

    // Calculate each skill
    for (const [skill, abilityKey] of Object.entries(skillAbilityMap)) {
        const profBonus = getNumeric(getPathValue(data, `build.proficiencies.${skill}`));
        const abilityScore = getNumeric(getPathValue(data, `build.abilities.${abilityKey}`));
        const abilityMod = characterAttributes.getAbilityModifier(abilityScore);

        // Store proficiency code using the configuration
        skillProficiencies[skill] = PROFICIENCY_CONFIG.getCode(profBonus);

        // Calculate skill value with item bonus
        const itemBonus = getPathValue(
            data,
            `build.mods.${capitalizeFirstLetter(skill)}.["Item Bonus"]`,
            { defaultValue: 0 }
        );

        // Add level only if trained (profBonus > 0)
        skills[skill] = (profBonus > 0 ? level : 0) + profBonus + abilityMod + itemBonus;
    }

    // Handle perception separately
    const perceptionProf = getNumeric(getPathValue(data, 'build.proficiencies.perception'));
    const wisScore = getNumeric(getPathValue(data, 'build.abilities.wis'));
    const wisMod = characterAttributes.getAbilityModifier(wisScore);
    const perceptionItemBonus = getPathValue(data, 'build.mods.Perception.["Item Bonus"]', { defaultValue: 0 });

    // Calculate perception (add level only if trained)
    skills.perception = (perceptionProf > 0 ? level : 0) + perceptionProf + wisMod + perceptionItemBonus;
    skillProficiencies.perception = PROFICIENCY_CONFIG.getCode(perceptionProf);

    return { skills, skillProficiencies };
}

// Helper function that uses the configuration system for getting proficiency level
function getProficiencyLevel(numericValue) {
    return PROFICIENCY_CONFIG.getCode(numericValue);
}

// Helper function to get the full proficiency label using the configuration
function getProficiencyLabel(profCode) {
    return PROFICIENCY_CONFIG.getLabel(profCode);
}

// Extract vision information using a more configuration-driven approach
function extractVisionTypes(data) {
    // This should ideally come from configuration
    const VISION_TYPES = [
        { name: "Darkvision", keywords: ["darkvision"] },
        { name: "Low-Light Vision", keywords: ["low-light", "lowlight", "low light"] },
        { name: "Scent", keywords: ["scent"] },
        { name: "Tremorsense", keywords: ["tremorsense"] }
    ];

    const DARKVISION_ANCESTRIES = ['dwarf', 'gnome', 'half-orc', 'orc'];

    const allSenses = [];

    // Check for vision types in specials/abilities
    const specials = getPathValue(data, 'build.specials', { defaultValue: [] });
    if (Array.isArray(specials)) {
        for (const special of specials) {
            if (typeof special !== 'string') continue;

            // Check against configured vision types
            for (const visionType of VISION_TYPES) {
                if (visionType.keywords.some(keyword => special.toLowerCase().includes(keyword)) &&
                    !allSenses.includes(visionType.name)) {
                    allSenses.push(visionType.name);
                }
            }
        }
    }

    // Check for ancestry that might have darkvision inherently
    const ancestry = getPathValue(data, 'build.ancestry', { defaultValue: '' }).toLowerCase();
    if (ancestry && DARKVISION_ANCESTRIES.includes(ancestry) && !allSenses.includes("Darkvision")) {
        allSenses.push("Darkvision");
    }

    // Check for familiar senses
    const familiars = getPathValue(data, 'build.familiars', { defaultValue: [] });
    if (Array.isArray(familiars)) {
        for (const familiar of familiars) {
            const abilities = getPathValue(familiar, 'abilities', { defaultValue: [] });
            if (!Array.isArray(abilities)) continue;

            // Define all possible familiar senses (should be in configuration)
            const FAMILIAR_SENSES = [
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
            for (const sense of FAMILIAR_SENSES) {
                if (abilities.includes(sense) &&
                    !allSenses.includes(sense) &&
                    !allSenses.includes(`${sense} (Familiar)`)) {
                    allSenses.push(`${sense} (Familiar)`);
                }
            }
        }
    }

    return {
        allSenses: allSenses
    };
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
    const level = getNumeric(getPathValue(data, 'build.level'));

    // Fortitude Save
    const fortProf = getNumeric(getPathValue(data, 'build.proficiencies.fortitude'));
    const conScore = getNumeric(getPathValue(data, 'build.abilities.con'));
    const conMod = TEMPLATE_FUNCTIONS.abilityModifier(conScore);
    // Attempt to get item bonus, defaulting to 0 if not found or path is invalid
    // Note: Pathbuilder JSON might structure mods differently, this attempts a common pattern.
    const fortItemBonus = getNumeric(getPathValue(data, "build.mods.Fortitude.Item Bonus", { defaultValue: 0 })) ||
        getNumeric(getPathValue(data, "build.mods.Fortitude Save.Item Bonus", { defaultValue: 0 })); // Adding fallback path
    const fortValue = (fortProf > 0 ? level : 0) + fortProf + conMod + fortItemBonus;

    // Reflex Save
    const refProf = getNumeric(getPathValue(data, 'build.proficiencies.reflex'));
    const dexScore = getNumeric(getPathValue(data, 'build.abilities.dex'));
    const dexMod = TEMPLATE_FUNCTIONS.abilityModifier(dexScore);
    // Attempt to get item bonus, defaulting to 0
    const refItemBonus = getNumeric(getPathValue(data, "build.mods.Reflex.Item Bonus", { defaultValue: 0 })) ||
        getNumeric(getPathValue(data, "build.mods.Reflex Save.Item Bonus", { defaultValue: 0 })); // Adding fallback path
    const refValue = (refProf > 0 ? level : 0) + refProf + dexMod + refItemBonus;

    // Will Save
    const willProf = getNumeric(getPathValue(data, 'build.proficiencies.will'));
    const wisScore = getNumeric(getPathValue(data, 'build.abilities.wis'));
    const wisMod = TEMPLATE_FUNCTIONS.abilityModifier(wisScore);
    // Attempt to get item bonus, defaulting to 0
    const willItemBonus = getNumeric(getPathValue(data, "build.mods.Will.Item Bonus", { defaultValue: 0 })) ||
        getNumeric(getPathValue(data, "build.mods.Will Save.Item Bonus", { defaultValue: 0 })); // Adding fallback path
    const willValue = (willProf > 0 ? level : 0) + willProf + wisMod + willItemBonus;

    return {
        ac: getNumeric(getPathValue(data, 'build.acTotal.acTotal')), // AC calculation remains the same
        fort: fortValue,
        ref: refValue,
        will: willValue
    };
}

// Get numeric value or default
function getNumeric(value, defaultValue = 0) {
    return (value !== undefined && value !== null) ? Number(value) : defaultValue;
}

// Helper function to get a value from a nested object using a dot-notation path
function getValueByPath(obj, path) {
    if (!path || !obj) return undefined;

    // Debug logging for speed-related paths
    if (path && typeof path === 'string' && path.includes('speed')) {
        console.log(`Looking up path: ${path}`);
    }

    // Handle fallback notation (path || defaultValue)
    if (typeof path === 'string' && path.includes('||')) {
        const [actualPath, defaultValue] = path.split('||').map(p => p.trim());
        const value = getValueByPath(obj, actualPath);

        if (path.includes('speed')) {
            console.log(`Path with fallback: ${actualPath}, Value:`, value,
                `Default:`, defaultValue,
                `Using:`, (value !== undefined && value !== null) ? value : defaultValue);
        }

        if (value === undefined || value === null) {
            return defaultValue === '0' ? 0 : defaultValue;
        }
        return value;
    }

    // Handle nested properties via dot notation
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
        if (current === null || current === undefined) {
            if (path.includes('speed')) {
                console.log(`Path ${path} resolved to undefined at part: ${part}`);
            }
            return undefined;
        }
        current = current[part];

        // Debug for speed
        if (path.includes('speed')) {
            console.log(`Path ${path} -> ${part} = `, current);
        }
    }

    return current;
}

// New function to handle computed values based on YAML configuration
function getComputedValue(character, computedConfig) {
    if (!computedConfig || !computedConfig.formula) return undefined;

    // Handle different formula types
    switch (computedConfig.formula) {
        case 'combine':
            if (!computedConfig.paths || !Array.isArray(computedConfig.paths)) return undefined;

            // Get all values from specified paths
            const values = computedConfig.paths.map(path => {
                const val = getValueByPath(character, path);
                console.log(`Path: ${path}, Value:`, val);
                return val;
            });

            // If a template is provided, use it to format the values
            if (computedConfig.template) {
                const result = formatWithTemplate(values, computedConfig.template);
                console.log(`Template: ${computedConfig.template}, Result: ${result}`);

                // Don't return empty templates with just placeholder text
                if (result === 'ft' || result === ' ft') return '';

                return result;
            }

            // Default: Just join non-null values
            return values.filter(v => v !== null && v !== undefined).join(' ');

        case 'sum':
            if (!computedConfig.paths || !Array.isArray(computedConfig.paths)) return undefined;

            // Get all values from specified paths
            const numValues = computedConfig.paths.map(path => {
                // Add more debug info for speed calculations
                let val;
                if (path.includes('speed')) {
                    console.log(`Computing value from path: ${path}`);
                    val = getValueByPath(character, path);
                    console.log(`  Found value: ${val} (type: ${typeof val})`);
                } else {
                    val = getValueByPath(character, path);
                }

                // Special handling for paths with fallback values like "path || 0"
                if (typeof path === 'string' && path.includes('||')) {
                    const [actualPath, defaultValue] = path.split('||').map(p => p.trim());
                    val = getValueByPath(character, actualPath);
                    if (val === undefined || val === null) {
                        val = defaultValue === '0' ? 0 : defaultValue;
                    }
                    console.log(`  Path with fallback: ${actualPath}, Value: ${val}`);
                }

                // Convert to number or use 0 if undefined/null
                return val !== undefined && val !== null ? Number(val) : 0;
            });

            // Sum the values
            const sum = numValues.reduce((total, val) => {
                console.log(`  Adding: ${val} to running total: ${total}`);
                return total + val;
            }, 0);
            console.log(`Final sum: ${sum}`);

            // If template provided, use it
            if (computedConfig.template) {
                // Replace {sum} with the calculated sum
                return computedConfig.template.replace('{sum}', sum);
            }

            return sum;

        // Add other formula types as needed (multiply, etc.)
        default:
            return undefined;
    }
}

// Helper to format values using a template string with placeholders
function formatWithTemplate(values, template) {
    return template.replace(/\{(\d+)(?:\|([^}]+))?\}/g, (match, index, options) => {
        const value = values[parseInt(index)];

        // If value is undefined/null, return empty string
        if (value === undefined || value === null) return '';

        // Process options if specified
        if (options) {
            const optionParts = options.split('|').map(p => p.trim());

            for (const option of optionParts) {
                // Process prefix option
                if (option.startsWith('prefix=')) {
                    const prefix = option.substring(7).replace(/[" ]/g, '');
                    // Only add prefix if value exists
                    if (value) return prefix + value;
                }

                // Process ability score modifier
                if (option === 'modifier') {
                    // Calculate ability modifier: (score - 10) / 2, rounded down
                    const abilityMod = Math.floor((value - 10) / 2);
                    // Format with + for positive and 0 values
                    return abilityMod >= 0 ? `+${abilityMod}` : `${abilityMod}`;
                }
            }
        }

        return value;
    });
}

// Helper function to create cell content based on column type and character data
function createCellContent(character, column, section) {
    try {
        // Get value based on either jsonPath or computedValue
        let value;

        // Special handling for speed column - use our unified calculator
        if (column.id === 'speed') {
            value = characterAttributes.calculateSpeed(character);
        } else if (column.computedValue) {
            value = getComputedValue(character, column.computedValue);
        } else {
            value = getPathValue(character, column.jsonPath);
        }

        // Get display value based on template if provided
        let displayValue = value;
        if (column.template) {
            displayValue = renderTemplate(column.template, { value });
        } else if (column.id === 'speed' && typeof value === 'number') {
            // Special handling for speed display
            displayValue = `${value} ft`;
        }

        // Handle different display types
        if (column.displayType === 'action-buttons') {
            // Return a button element for actions
            return createActionButtons(character, column);
        } else if (column.showProficiency && column.proficiencyPath) {
            // Handle proficiency displays
            return createProficiencyDisplay(character, column, section, value, displayValue);
        } else if (column.displayType === 'pill' && value) {
            // Handle pill display
            return `<span class="pill pill-${section.id}">${displayValue}</span>`;
        } else if (column.displayType === 'pill-list' && Array.isArray(value) && value.length > 0) {
            // Handle pill list
            return value.map(item =>
                `<span class="pill pill-${section.id}">${item}</span>`
            ).join(' ');
        } else if (column.displayType === 'lore-proficiency-list' && Array.isArray(value)) {
            // Handle lore skills
            return createLoreProficiencyList(value, section);
        } else if ((section.id === 'defense' || section.id === 'skills') && typeof value === 'number') {
            // Format numbers for defense and skills
            return value >= 0 ? `+${value}` : value.toString();
        } else {
            // Default display
            return displayValue !== undefined ? displayValue : '-';
        }
    } catch (error) {
        console.error(`Error creating cell content for ${column.id}:`, error);
        return '-';
    }
}

// Helper to create action buttons
function createActionButtons(character, column) {
    const characterIndex = characters.indexOf(character);

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

    const container = document.createElement('div');
    container.appendChild(deleteBtn);
    return container;
}

// Helper to create proficiency display
function createProficiencyDisplay(character, column, section, value, displayValue) {
    const proficiencyValue = getPathValue(character, column.proficiencyPath);

    if (proficiencyValue === undefined) {
        return displayValue !== undefined ? displayValue : '-';
    }

    // Convert to proficiency code using our configuration system
    let profCode;
    if (typeof proficiencyValue === 'number') {
        profCode = PROFICIENCY_CONFIG.getCode(proficiencyValue);
    } else {
        profCode = proficiencyValue;
    }

    // Get label from configuration
    const profLabel = PROFICIENCY_CONFIG.getLabel(profCode);

    // Different displays based on display type
    if (column.displayType === 'proficiency-badge') {
        // Format numeric values with plus sign
        let formattedValue = value;
        if (typeof value === 'number' && value >= 0) {
            formattedValue = '+' + value;
        }

        return `<span class="value">${formattedValue !== undefined ? formattedValue : '-'}</span>
                <span class="prof-badge prof-${profCode.toLowerCase()}" 
                title="${profLabel}">${profCode}</span>`;
    } else if (column.displayType === 'proficiency-pill-list' && Array.isArray(value)) {
        // Handle traditions
        if (value.length === 0) return '-';

        const items = value.map(item => {
            const itemKey = item.toLowerCase();
            const itemProf = proficiencyValue[itemKey] || 'U';
            const itemProfLabel = PROFICIENCY_CONFIG.getLabel(itemProf);

            return `<span class="pill pill-${section.id}">
                ${item} <span class="prof-badge prof-${itemProf.toLowerCase()}" 
                title="${itemProfLabel}">${itemProf}</span>
            </span>`;
        });

        return items.join(' ');
    } else {
        // Default to just showing the value
        return displayValue !== undefined ? displayValue : '-';
    }
}

// Helper to create lore proficiency list
function createLoreProficiencyList(value, section) {
    if (!Array.isArray(value) || value.length === 0) return '-';

    const items = value.map(lore => {
        if (!Array.isArray(lore) || lore.length < 2) return '';

        const loreName = lore[0];
        const loreValue = lore[1];

        // Skip untrained lore skills
        if (loreValue === 0) return '';

        // Get proficiency code from configuration
        const profCode = PROFICIENCY_CONFIG.getCode(loreValue);

        // Skip untrained lore skills
        if (profCode === "U") return '';

        const profLabel = PROFICIENCY_CONFIG.getLabel(profCode);

        return `<span class="pill pill-${section.id}" style="font-weight: bold; color: #000;">
            ${loreName} <span class="prof-badge prof-${profCode.toLowerCase()}" 
            style="color: #fff; font-weight: bold;"
            title="${profLabel}">${profCode}</span>
        </span>`;
    }).filter(item => item); // Remove empty items

    return items.length > 0 ? items.join(' ') : '-';
}

// Update the character row function to use our modular helpers
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

            // Add class based on section for styling
            cell.classList.add(`${section.id}-group`);

            // Add column-specific class if needed
            if (column.id) {
                cell.classList.add(`column-${column.id}`);
            }

            // Add proficiency data attribute if applicable
            if (column.proficiencyPath) {
                const profValue = getPathValue(character, column.proficiencyPath);
                if (profValue !== undefined) {
                    const profCode = typeof profValue === 'number'
                        ? PROFICIENCY_CONFIG.getCode(profValue)
                        : profValue;
                    cell.dataset.proficiency = profCode;
                }
            }

            // Create cell content
            const content = createCellContent(character, column, section);

            // Set content based on type
            if (content instanceof HTMLElement) {
                cell.appendChild(content);
            } else {
                cell.innerHTML = content;
            }

            row.appendChild(cell);
        });
    });

    tbody.appendChild(row);
}

// Function to calculate the highest value for a specific column across all characters
function calculateHighestValue(column, characters) {
    let highestValue = null;
    let highestFormatted = null;
    let highestCharacter = null;

    for (const character of characters) {
        let value, formattedValue;

        // Special handling for specific column types
        if (column.id === 'speed') {
            // Use our unified speed calculator
            value = characterAttributes.calculateSpeed(character);
            formattedValue = characterAttributes.calculateSpeed(character, { formatted: true });

            // Debug logging
            console.log(`Character ${character.build?.name} speed: ${value} ft`);
        } else if (column.computedValue) {
            // Handle computed values
            formattedValue = getComputedValue(character, column.computedValue);

            // Extract numeric value for comparison
            if (formattedValue) {
                // For values like "25 ft (+5)" extract just the base number
                const numericMatch = formattedValue.match(/^(\d+)/);
                if (numericMatch) {
                    value = parseInt(numericMatch[1]);
                }
            }
        } else if (column.jsonPath) {
            // Handle direct JSON paths
            value = getPathValue(character, column.jsonPath);
        }

        // Only compare numeric values
        if (typeof value === 'number') {
            if (highestValue === null || value > highestValue) {
                highestValue = value;
                highestFormatted = formattedValue; // Store formatted value for display
                highestCharacter = character;
            }
        }
    }

    return { value: highestValue, formatted: highestFormatted, character: highestCharacter };
}

// Format a highest value for display based on column type
function formatHighestValue(highestData, column, section) {
    const { value, formatted, character } = highestData;

    if (value === null) return null;

    // Format based on column and section type
    if (column.id === 'speed') {
        return `${value} ft`;
    } else if (column.computedValue && formatted) {
        return formatted;
    } else if (section.id === 'defense' || section.id === 'skills') {
        return value >= 0 ? `+${value}` : value.toString();
    } else if (section.id === 'ability') {
        // For ability scores, also show the modifier
        const modifier = characterAttributes.getAbilityModifier(value);
        const formattedMod = modifier >= 0 ? `+${modifier}` : modifier.toString();
        return `${value} (${formattedMod})`;
    } else {
        return value.toString();
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
            if (column.highestValue && (column.jsonPath || column.computedValue)) {
                const cell = footerRow.children[columnIndex];

                // Calculate highest value
                const highestData = calculateHighestValue(column, characters);

                // Format and display the highest value
                if (highestData.value !== null) {
                    const formattedValue = formatHighestValue(highestData, column, section);

                    // Set the cell content
                    cell.textContent = formattedValue;

                    // Add highlighting class
                    cell.classList.add('highest-value');

                    // Add data attribute to track which character has this highest value
                    if (highestData.character) {
                        const characterIndex = characters.indexOf(highestData.character);
                        if (characterIndex >= 0) {
                            cell.dataset.characterIndex = characterIndex;
                        }
                    }
                } else {
                    // No valid highest value
                    cell.textContent = '-';
                    cell.classList.remove('highest-value');
                    delete cell.dataset.characterIndex;
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

            // Special handling for speed values (ignore spaces in comparison)
            const isSpeedColumn = highestValue.includes('ft');
            if (isSpeedColumn) {
                // Normalize both values to remove spaces
                const normalizedHighest = highestValue.replace(/\s+/g, '');
                const normalizedCell = cellValue.replace(/\s+/g, '');

                if (normalizedCell === normalizedHighest) {
                    cell.classList.add('highest-value');
                } else {
                    cell.classList.remove('highest-value');
                }
            } else {
                // Regular comparison for other values
                if (cellValue === highestValue) {
                    cell.classList.add('highest-value');
                } else {
                    cell.classList.remove('highest-value');
                }
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

        // Register any global extractor functions that may be referenced in YAML
        window.abilityModifier = abilityModifier;

        console.log("Loaded table structure with preprocessing:", tableStructure);

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

    // Create extracted data container
    const extracted = {};

    // Get the preprocessing rules from the table structure configuration
    const preprocessingRules = window.tableStructure?.preprocessing;

    if (preprocessingRules) {
        // Process all fields defined in the preprocessingRules
        processExtractedFields(data, extracted, preprocessingRules);
    } else {
        // Fallback to legacy extraction if no preprocessing rules defined
        console.warn("No preprocessing rules found in configuration. Using legacy extraction.");
        return legacyPreprocessCharacterData(data);
    }

    // Return the processed data
    return {
        ...data,
        extracted
    };
}

// New function to process extracted fields based on YAML configuration
function processExtractedFields(data, extractedData, preprocessingRules) {
    const extractors = preprocessingRules.extractors || {};
    const extractedFields = preprocessingRules.extractedFields || {};

    // Process each extractor
    const evaluatedExtractors = {};
    for (const [name, extractor] of Object.entries(extractors)) {
        evaluatedExtractors[name] = createExtractorFunction(extractor.formula);
    }

    // Process each extracted field
    for (const [fieldName, fieldConfig] of Object.entries(extractedFields)) {
        extractedData[fieldName] = extractField(data, fieldConfig, evaluatedExtractors);
    }
}

// Create an extractor function from a formula string
function createExtractorFunction(formulaStr) {
    try {
        // For predefined formulas like "sum", "extractArchetypes", etc.
        if (typeof formulaStr === 'string' && !formulaStr.includes('(') && !formulaStr.includes('+')) {
            return (params) => {
                switch (formulaStr) {
                    case 'sum':
                        // Improved sum formula with better debugging
                        console.log('Sum parameters:', params);
                        const total = params.values.reduce((total, path) => {
                            const value = evaluatePath(path);
                            console.log(`  Path: ${path}, Value: ${value}, Running total: ${total + (typeof value === 'number' ? value : 0)}`);
                            return total + (typeof value === 'number' ? value : 0);
                        }, 0);
                        console.log(`Final sum: ${total}`);
                        return total;
                    case 'extractArchetypes':
                        return extractArchetypes({ build: { feats: params.feats } });
                    case 'extractTraditions':
                        return extractSpellTraditions({
                            build: {
                                spellCasters: params.spellCasters,
                                proficiencies: params.proficiencies
                            }
                        }).traditions;
                    case 'extractTraditionProficiencies':
                        return extractSpellTraditions({
                            build: {
                                spellCasters: params.spellCasters,
                                proficiencies: params.proficiencies
                            }
                        }).proficiencies;
                    case 'extractHealingAbilities':
                        return extractHealingAbilities({
                            build: {
                                feats: params.feats,
                                spellsKnown: params.spellsKnown,
                                focus: params.focus
                            }
                        });
                    case 'extractVisionTypes':
                        return extractVisionTypes({
                            build: {
                                specials: params.specials,
                                ancestry: params.ancestry,
                                familiars: params.familiars
                            }
                        });
                    case 'skillCalculation':
                        // Use the values directly from the params object
                        // Ensure they are numeric, defaulting to 0 if not
                        const profValue = getNumeric(params.profValue);
                        const abilityMod = getNumeric(params.abilityMod);
                        const level = getNumeric(params.level);
                        const itemBonus = getNumeric(params.itemBonus);
                        // Perform the calculation
                        return (profValue > 0 ? level : 0) + profValue + abilityMod + itemBonus;
                    case 'saveBonus':
                        // Calculate save bonus (10 + proficiency)
                        // This case might be obsolete now but leaving it harmlessly
                        const saveProf = getNumeric(params.profValue); // Use getNumeric here too for safety
                        return 10 + saveProf;
                    default:
                        console.warn(`Unknown formula: ${formulaStr}`);
                        return 0;
                }
            };
        }

        // For simple math formulas, create a function that evaluates the formula
        return new Function('value', `return ${formulaStr}`);
    } catch (error) {
        console.error(`Error creating extractor function from formula "${formulaStr}":`, error);
        return () => 0; // Return default function
    }
}

// Helper to evaluate a path or value
function evaluatePath(pathOrValue, context = {}) {
    // Add debugging for speed calculations
    if (pathOrValue && typeof pathOrValue === 'string' && pathOrValue.includes('speed')) {
        console.log(`Evaluating path: ${pathOrValue}`);
    }

    if (typeof pathOrValue === 'string' && pathOrValue.includes('(')) {
        // Handle function calls like abilityModifier(build.abilities.str)
        const funcMatch = pathOrValue.match(/(\w+)\((.*)\)/);
        if (funcMatch) {
            const [, funcName, argStr] = funcMatch;
            const arg = evaluatePath(argStr, context);
            const func = context[funcName] || window[funcName];
            if (typeof func === 'function') {
                return func(arg);
            }
        }
    } else if (typeof pathOrValue === 'string' && pathOrValue.includes('.')) {
        // Handle object paths
        const data = context.data || window.currentProcessingCharacter;
        const result = getValueByPath(data, pathOrValue);

        // Add debugging for speed-related paths
        if (pathOrValue && pathOrValue.includes('speed')) {
            console.log(`Path: ${pathOrValue}, Value:`, result);
        }

        // If the path contains "|| 0", split it and return the default if the value is undefined
        if (pathOrValue.includes('||')) {
            const [actualPath, defaultValue] = pathOrValue.split('||').map(p => p.trim());
            const value = getValueByPath(data, actualPath);

            if (value === undefined || value === null) {
                return defaultValue === '0' ? 0 : defaultValue;
            }
            return value;
        }

        return result;
    }

    // Direct value
    return pathOrValue;
}

// Extract a field based on its configuration
function extractField(data, fieldConfig, extractors) {
    // Store the data in a thread-local variable for path evaluation
    window.currentProcessingCharacter = data;

    try {
        const { type, formula, params } = fieldConfig;

        if (type === 'object' && fieldConfig.fields) {
            // Process an object with multiple fields
            const result = {};
            for (const [subFieldName, subFieldConfig] of Object.entries(fieldConfig.fields)) {
                result[subFieldName] = extractField(data, subFieldConfig, extractors);
            }
            return result;
        } else if (formula) {
            // Use a predefined extractor or evaluate the formula
            const extractor = typeof formula === 'string' && extractors[formula]
                ? extractors[formula]
                : createExtractorFunction(formula);

            // Extract using the evaluated parameters
            const evaluatedParams = {};
            if (params) {
                for (const [paramName, paramValue] of Object.entries(params)) {
                    evaluatedParams[paramName] = evaluatePath(paramValue, {
                        data,
                        ...extractors
                    });
                }
            }

            return extractor(evaluatedParams);
        }

        // Default - return empty based on type
        return type === 'array' ? [] : (type === 'object' ? {} : null);
    } finally {
        // Clear the thread-local variable
        delete window.currentProcessingCharacter;
    }
}

// Legacy preprocessing function as fallback
function legacyPreprocessCharacterData(data) {
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

// Template transform configuration - defines transforms that can be applied in templates
const TEMPLATE_TRANSFORMS = {
    // Add a prefix to a value
    prefix: function (value, prefix = '') {
        if (value === undefined || value === null || value === '') return '';

        // For numeric values, special handling
        if (typeof value === 'number') {
            return value >= 0 ? prefix + value : value.toString();
        }

        return prefix + value;
    },

    // Format as a modifier (adds + for positive numbers)
    modifier: function (value) {
        if (typeof value !== 'number') return value;
        return value >= 0 ? `+${value}` : `${value}`;
    },

    // Format with units
    units: function (value, unit = '') {
        if (value === undefined || value === null) return '';
        return `${value} ${unit}`;
    },

    // Apply a format string (like sprintf)
    format: function (value, format = '%s') {
        if (value === undefined || value === null) return '';
        return format.replace(/%[sd]/, value.toString());
    },

    // Conditional display
    conditional: function (value, trueText = '', falseText = '') {
        return value ? trueText : falseText;
    }
};

// Enhanced template rendering function
function renderTemplate(template, context, options = {}) {
    if (!template) return context.value;

    const defaults = {
        debug: false,
        functions: TEMPLATE_FUNCTIONS,
        transforms: TEMPLATE_TRANSFORMS
    };

    const settings = { ...defaults, ...options };

    try {
        return template.replace(/\{([^}]+)\}/g, (match, expr) => {
            // Split by pipe to get variable name and transforms
            const parts = expr.split('|').map(p => p.trim());
            const varName = parts[0];

            // Get the base value
            let value;

            // Extract the value from context
            if (varName === 'value') {
                value = context.value;
            } else if (varName.includes('(')) {
                // Handle function calls like abilityModifier(value)
                const funcMatch = varName.match(/(\w+)\((.*)\)/);
                if (funcMatch) {
                    const [, funcName, argName] = funcMatch;
                    const argValue = argName === 'value' ? context.value : context[argName];

                    // Find the function
                    const func = settings.functions[funcName];
                    if (typeof func === 'function') {
                        value = func(argValue);
                    } else {
                        console.warn(`Unknown function in template: ${funcName}`);
                        value = '';
                    }
                }
            } else {
                value = context[varName];
            }

            // Apply transforms in sequence
            if (parts.length > 1) {
                for (let i = 1; i < parts.length; i++) {
                    const transformExpr = parts[i];

                    // Extract transform name and arguments
                    const transformMatch = transformExpr.match(/([^=]+)(?:=(.+))?/);
                    if (transformMatch) {
                        const [, transformName, argsStr] = transformMatch;

                        // Find the transform function
                        const transform = settings.transforms[transformName];
                        if (typeof transform === 'function') {
                            // Parse arguments if provided
                            const args = argsStr ? argsStr.split(',').map(a => {
                                // Remove quotes from string arguments
                                return a.trim().replace(/^["']|["']$/g, '');
                            }) : [];

                            // Apply the transform
                            value = transform(value, ...args);
                        }
                    }
                }
            }

            return value !== undefined && value !== null ? value.toString() : '';
        });
    } catch (error) {
        console.error(`Error rendering template "${template}":`, error);
        return template;
    }
}

// Enhanced path evaluation function that consolidates getValueByPath, evaluatePath, and extractValueByPath
function getPathValue(obj, path, options = {}) {
    // Default options
    const defaults = {
        defaultValue: undefined,
        debug: false,
        context: null
    };
    const settings = { ...defaults, ...options };

    // Handle empty paths
    if (!path) return settings.defaultValue;

    // For debugging specific paths
    if (settings.debug || (typeof path === 'string' && path.includes('speed'))) {
        console.log(`Looking up path: ${path}`);
    }

    try {
        // Special case - handle function calls like abilityModifier(build.abilities.str)
        if (typeof path === 'string' && path.includes('(')) {
            const funcMatch = path.match(/(\w+)\((.*)\)/);
            if (funcMatch) {
                const [, funcName, argStr] = funcMatch;
                const arg = getPathValue(obj, argStr, options);

                // Look for function in registry first, then fall back to window
                const func = TEMPLATE_FUNCTIONS[funcName] || window[funcName];
                if (typeof func === 'function') {
                    return func(arg);
                }
                return settings.defaultValue;
            }
        }

        // Handle fallback notation (path || defaultValue)
        if (typeof path === 'string' && path.includes('||')) {
            const [actualPath, fallbackValue] = path.split('||').map(p => p.trim());
            const value = getPathValue(obj, actualPath, { ...options, defaultValue: undefined });

            if (settings.debug || (typeof path === 'string' && path.includes('speed'))) {
                console.log(`Path with fallback: ${actualPath}, Value:`, value,
                    `Fallback:`, fallbackValue,
                    `Using:`, (value !== undefined && value !== null) ? value : fallbackValue);
            }

            if (value === undefined || value === null) {
                // Convert string fallback to appropriate type if needed
                if (fallbackValue === '0') return 0;
                if (fallbackValue === 'true') return true;
                if (fallbackValue === 'false') return false;
                return fallbackValue;
            }

            return value;
        }

        // Handle regular dot notation path
        if (typeof path === 'string' && path.includes('.')) {
            const parts = path.split('.');
            let current = settings.context || obj;

            for (const part of parts) {
                if (current === null || current === undefined) {
                    if (settings.debug) {
                        console.log(`Path ${path} resolved to undefined at part: ${part}`);
                    }
                    return settings.defaultValue;
                }

                current = current[part];

                if (settings.debug) {
                    console.log(`Path ${path} -> ${part} = `, current);
                }
            }

            // Return default if the final value is undefined or null
            if (current === undefined || current === null) {
                return settings.defaultValue;
            }

            return current;
        }

        // Direct value
        return path;
    } catch (error) {
        console.error(`Error evaluating path "${path}":`, error);
        return settings.defaultValue;
    }
}

// Character attribute calculation module - handles consistent calculation of character attributes
const characterAttributes = {
    // Calculate speed consistently across the application
    calculateSpeed: function (character, options = {}) {
        const defaults = {
            formatted: false,
            debug: false
        };
        const settings = { ...defaults, ...options };

        try {
            // Extract base speed and bonus
            const baseSpeed = getPathValue(character, 'build.attributes.speed', { defaultValue: 0 });
            const speedBonus = getPathValue(character, 'build.attributes.speedBonus', { defaultValue: 0 });

            // Calculate total
            const totalSpeed = baseSpeed + speedBonus;

            if (settings.debug) {
                console.log(`Speed calculation for ${character.build?.name || 'character'}:`,
                    `Base: ${baseSpeed}, Bonus: ${speedBonus}, Total: ${totalSpeed}`);
            }

            // Return formatted or numeric value based on options
            return settings.formatted ? `${totalSpeed} ft` : totalSpeed;
        } catch (error) {
            console.error('Error calculating speed:', error);
            return settings.formatted ? '0 ft' : 0;
        }
    },

    // Calculate ability modifier
    getAbilityModifier: function (score) {
        if (typeof score !== 'number') return 0;
        return Math.floor((score - 10) / 2);
    },

    // Calculate skill value
    calculateSkill: function (character, skillName, options = {}) {
        const defaults = {
            formatted: false
        };
        const settings = { ...defaults, ...options };

        try {
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

            const abilityKey = skillMap[skillName];
            if (!abilityKey) return settings.formatted ? '-' : 0;

            const level = getPathValue(character, 'build.level', { defaultValue: 0 });
            const profBonus = getPathValue(character, `build.proficiencies.${skillName}`, { defaultValue: 0 });
            const abilityScore = getPathValue(character, `build.abilities.${abilityKey}`, { defaultValue: 10 });
            const abilityMod = this.getAbilityModifier(abilityScore);
            const itemBonus = getPathValue(character,
                `build.mods.${skillName.charAt(0).toUpperCase() + skillName.slice(1)}.["Item Bonus"]`,
                { defaultValue: 0 });

            // Calculate skill value (add level only if trained)
            const skillValue = (profBonus > 0 ? level : 0) + profBonus + abilityMod + itemBonus;

            // Return formatted or numeric value
            return settings.formatted ? (skillValue >= 0 ? `+${skillValue}` : skillValue.toString()) : skillValue;
        } catch (error) {
            console.error(`Error calculating skill ${skillName}:`, error);
            return settings.formatted ? '-' : 0;
        }
    }
};

// Register with template functions
TEMPLATE_FUNCTIONS.calculateSpeed = characterAttributes.calculateSpeed;
TEMPLATE_FUNCTIONS.getAbilityModifier = characterAttributes.getAbilityModifier;
TEMPLATE_FUNCTIONS.calculateSkill = characterAttributes.calculateSkill;
