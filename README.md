# PF2e Character Comparison Tool
https://plasticmacaroni.github.io/pathbuilder-viewer/

A browser-based tool for comparing Pathfinder 2e character statistics, highlighting highest values, and providing party composition warnings.

## Setup

1. Download all three files (`index.html`, `style.css`, and `script.js`) to the same directory
2. Open `index.html` in a modern web browser
3. No server required - works completely in the browser

## Features

- **Character Import**: Load character data from JSON files or clipboard
- **Stat Comparison**: View character stats side by side
- **Visual Highlighting**: Golden text for highest values in each category
- **Party Composition Warnings**: Automatic detection of potential party composition issues
- **Responsive Design**: Dark mode interface that works on various devices

## How to Use

### Importing Characters

1. **From File**: Click "Import from File" and select a PF2e character JSON file
2. **From Clipboard**: Copy JSON data to clipboard and click "Import from Clipboard"
3. **Clear All**: Remove all characters with the "Clear All" button

### Reading the Table

- **Character Info**: Name, class (as pill), archetypes (as pills), and level
- **Healing**: Displays healing-related abilities as color-coded pills
- **Ability Scores**: STR, DEX, CON, INT, WIS, CHA values
- **Defenses**: AC, Fortitude, Reflex, Will
- **Skills**: Abbreviated skill bonuses
- **Highest Values**: Bottom row shows the highest value for each column
- **Highlighting**: Values in gold match the highest in their column

### Party Composition Warnings

Warnings appear at the bottom of the page and are automatically updated when characters are added or removed:

- **Green (✅)**: Indicates a successful check (party meets this requirement)
- **Red (⚠️)**: Indicates a warning (party may have an issue)

## Warning System

The warning system checks for key party composition elements and provides feedback on potential gaps.

### Current Warnings

1. **Battle Medicine**: Checks if at least one character has the Battle Medicine feat
2. **Skill Coverage**: Checks if at least one character has training in every skill

### How Warnings Work

The warning system uses a modular approach:

1. The `updatePartyWarnings()` function creates the warnings container
2. Individual checks are run within this function 
3. The `addWarning()` helper function creates the warning cards
4. Each warning has:
   - A title
   - A description
   - A success/failure state (determines color)

## Adding New Warnings

To add a new warning, follow these steps:

### 1. Add a Detection Function (if needed)

Create a function that returns a boolean indicating if the warning condition is met:

```javascript
// Example: Check if party has a frontline character (STR ≥ 18)
function hasFrontlineCharacter() {
    return characters.some(character => character.abilities.str >= 18);
}
```

### 2. Add the Warning to updatePartyWarnings()

Add your new warning check inside the `updatePartyWarnings()` function in `script.js`:

```javascript
// Add this inside the updatePartyWarnings() function

// Frontline Character warning
addWarning(
    warningsGrid,
    'Frontline Character',
    'Party should have at least one character with high Strength (18+) for frontline combat',
    hasFrontlineCharacter()
);
```

### 3. Warning Parameters

When calling `addWarning()`, provide these parameters:

1. `container`: The DOM element to add the warning to (use `warningsGrid`)
2. `title`: Short title for the warning (e.g., "Frontline Character")
3. `description`: Detailed explanation of the warning
4. `isSuccess`: Boolean - `true` shows green success, `false` shows red warning

### Example: Adding a Healer Warning

```javascript
// 1. Add the detection function
function hasHealer() {
    return characters.some(character => 
        character.skills.medicine >= 4 || // High medicine skill
        character.class === "Cleric" ||   // Class-based healing
        character.archetypes.includes("Cleric") // Archetype healing
    );
}

// 2. Add to updatePartyWarnings()
addWarning(
    warningsGrid,
    'Dedicated Healer',
    'Party should have at least one character focused on healing',
    hasHealer()
);
```

## Extending the Tool

### Adding Healing Ability Detection

To detect more healing abilities, modify the `extractCharacterData()` function:

```javascript
// Find this section in extractCharacterData()
if (data.build?.feats) {
    data.build.feats.forEach(feat => {
        if (feat && feat[0] === "Battle Medicine") {
            hasBattleMedicine = true;
            healingAbilities.push("Battle Medicine");
        }
        // Add new healing feat detection here
        if (feat && feat[0] === "Treat Wounds") {
            healingAbilities.push("Treat Wounds");
        }
    });
}
```

### Customizing Appearance

The tool uses a modular CSS structure. To customize the appearance:

- Edit color schemes in `style.css`
- Modify pill colors in the `.pill-class`, `.pill-archetype`, and `.pill-healing` classes
- Adjust the warning card styles in the `.warning-card` section
