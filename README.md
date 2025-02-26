# PF2e Character Comparison Tool

https://plasticmacaroni.github.io/pathbuilder-viewer/

A browser-based tool for comparing Pathfinder 2e character statistics, highlighting highest values, and providing party composition warnings.

## Setup

1. Download all files to maintain the following folder structure:

   ```
   pf2e-character-comparison/
   ├── index.html        # Main HTML file
   ├── style.css         # Styles
   ├── script.js         # Main JavaScript
   └── warnings/         # Warning YAML files
       ├── battle-medicine.yaml
       ├── skill-coverage.yaml
       ├── frontline.yaml
       └── magic-user.yaml
   ```

2. Open `index.html` in a modern web browser
3. No server required - works completely in the browser

## Features

- **Character Import**: Load character data from JSON files or clipboard
- **Stat Comparison**: View character stats side by side
- **Visual Highlighting**: Golden text for highest values in each category
- **Party Composition Warnings**: Automatic detection of potential party composition issues
- **Responsive Design**: Dark mode interface that works on various devices
- **Healing Detection**: Comprehensive tracking of healing-related abilities
- **Modular Warnings**: YAML-based configuration for easy extensibility

## How to Use

### Importing Characters

1. **From File**: Click "Import from File" and select a PF2e character JSON file
2. **From Clipboard**: Copy JSON data to clipboard and click "Import from Clipboard"
3. **Clear All**: Remove all characters with the "Clear All" button

### Reading the Table

- **Character Info**: Name, class (as pill), archetypes (as pills), and level
- **Healing and Sustain**: Displays healing abilities as color-coded pills
- **Ability Scores**: STR, DEX, CON, INT, WIS, CHA values
- **Defenses**: AC, Fortitude, Reflex, Will
- **Skills**: Abbreviated skill bonuses
- **Highest Values**: Bottom row shows the highest value for each column
- **Highlighting**: Values in gold match the highest in their column

### Party Composition Warnings

Warnings appear at the bottom of the page and are automatically updated when characters are added or removed:

- **Green (✅)**: Indicates a successful check (party meets this requirement)
- **Red (⚠️)**: Indicates a warning (party may have an issue)

## Adding New Warnings

The warning system is designed to be completely modular using YAML files. Each warning is defined in its own file and contains all the logic needed to perform its check.

### Warning File Structure

Each warning file follows this structure:

```yaml
title: Battle Medicine
description: Emergency healing option
checkFunction: |
  function() {
    // Check if any character has Battle Medicine
    for (const character of characters) {
      if (character.healingAbilities) {
        for (const ability of character.healingAbilities) {
          if (ability === "Battle Medicine") {
            return true;
          }
        }
      }
    }
    return false;
  }
successMessage: At least one character has Battle Medicine for emergency healing
failureMessage: No character has Battle Medicine for emergency healing
```

- **title**: The title of the warning shown in the card
- **description**: Brief description of what this warning checks for
- **checkFunction**: JavaScript function that returns true (success) or false (warning)
  - This must be completely self-contained and only reference the global `characters` array
  - Can access any property of characters defined in the data extraction logic
- **successMessage**: Message displayed when the check passes
- **failureMessage**: Message displayed when the check fails

### How to Add a New Warning

1. **Create a new YAML file** in the `warnings/` directory
2. **Write your warning configuration** following the structure above
3. **Add your warning to the list** in the `loadWarnings()` function in `script.js`:

```javascript
const warningFiles = [
  "warnings/battle-medicine.yaml",
  "warnings/skill-coverage.yaml",
  "warnings/frontline.yaml",
  "warnings/magic-user.yaml",
  "warnings/your-new-warning.yaml", // Add your file here
];
```

### Template Variables in Messages

You can use template variables in your success and failure messages by using double curly braces:

```yaml
failureMessage: "No character has training in: {{zeroSkillsList.join(', ')}}"
```

Inside the template, you can use any JavaScript expression. To make data available to templates:

1. Store data in a global variable within your `checkFunction`
2. Reference that variable in your template

### Examples

#### Simple Check: Frontline Character

```yaml
title: Frontline Character
description: Tank or frontline combat role
checkFunction: |
  function() {
    for (const character of characters) {
      if (character.abilities && character.defenses) {
        if (character.abilities.str >= 16 && character.defenses.ac >= 18) {
          return true;
        }
      }
    }
    return false;
  }
successMessage: Party has at least one character with good Strength and AC for frontline combat
failureMessage: Consider adding a character with high Strength and AC to tank damage in combat
```

#### Complex Check with Template Variables: Skill Coverage

```yaml
title: Skill Coverage
description: Party skill proficiency distribution
checkFunction: |
  function() {
    // If there are no characters, don't show a warning
    if (characters.length === 0) return true;
    
    // Define all skills to check
    const allSkills = {
      'acrobatics': 'Acrobatics',
      'arcana': 'Arcana',
      // ... more skills ...
    };
    
    // Find skills with no training
    const zeroSkills = [];
    
    for (const [skillKey, skillName] of Object.entries(allSkills)) {
      // Check if any character has a non-zero value for this skill
      let hasTraining = false;
      
      for (const character of characters) {
        if (character.skills && character.skills[skillKey] > 0) {
          hasTraining = true;
          break;
        }
      }
      
      if (!hasTraining) {
        zeroSkills.push(skillName);
      }
    }
    
    // Store for use in the message template
    window.zeroSkillsList = zeroSkills;
    
    return zeroSkills.length === 0;
  }
successMessage: Full skill coverage achieved. At least one character has training in every skill.
failureMessage: "No character has training in: {{zeroSkillsList.join(', ')}}"
```

## Character Data Structure

When writing warning checks, you can access the following properties of each character:

- `name` - Character name
- `class` - Character class
- `archetypes` - Array of archetype names
- `level` - Character level
- `healingAbilities` - Array of healing-related abilities
- `abilities` - Object with `str`, `dex`, `con`, `int`, `wis`, `cha` values
- `defenses` - Object with `ac`, `fort`, `ref`, `will` values
- `skills` - Object with skill values mapped to skill keys from `skillMap`

## Customizing the Tool

### Adding More Healing Abilities

To detect more healing-related abilities, add them to the `healingFeats` array in the `extractCharacterData()` function.

### Changing Appearance

Modify the `style.css` file to adjust colors, spacing, and layout.

### Adding Character Properties

If you need to extract additional properties from character data for warnings, add them to the `characterData` object in the `extractCharacterData()` function.
