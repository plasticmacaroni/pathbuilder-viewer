# PF2e Character Comparison Tool
(pathbuilder-viewer)

## Overview

This tool allows Pathfinder 2e players to compare multiple character sheets side-by-side with a focus on numerical attributes. It's designed to help Game Masters and players identify the highest values across a party, optimize team composition, or simply compare different character builds.

## Features

- **Import JSON Character Data**: Load character sheets exported from Pathbuilder 2e or compatible tools
- **Multiple Import Methods**: Import via file upload or directly from clipboard
- **Dark Mode Interface**: Eye-friendly design for gaming sessions
- **Highlight System**:
  - Bright green highlighting for the highest value in the current view
  - Darker green highlighting for values that match all-time highest values
- **Summary Row**: Displays the highest values for each attribute across all imported characters
- **Archetype Detection**: Automatically detects and displays character archetypes

## How to Use

### Importing Characters

1. **File Import**:
   - Click "Import from File"
   - Select a JSON file containing a PF2e character (from Pathbuilder or similar)
   - The character will be added to the comparison table

2. **Clipboard Import**:
   - Copy JSON character data to your clipboard
   - Click "Import from Clipboard"
   - The character will be added to the comparison table

3. **Clear All**:
   - Click "Clear All" to remove all characters and reset the table

### Reading the Table

- **Character Info**: Name, class, archetypes, and level
- **Ability Scores**: STR, DEX, CON, INT, WIS, CHA
- **Defenses**: AC, Fortitude, Reflex, Will
- **Skills**: All 16 core PF2e skills with abbreviated names
- **Summary Row**: Shows the highest value for each column across all characters

### Understanding Highlighting

- **Bright Green**: The highest value in the current view for that attribute
- **Darker Green**: Values that match the highest recorded value (from the summary row)
- Multiple cells may be highlighted if there are ties

## Technical Details

### Data Processing

The tool extracts the following information from character JSON data:

1. **Basic Info**:
   - Character name
   - Class
   - Level
   - Archetypes (detected from Dedication feats)

2. **Ability Scores**: Direct values from the character build

3. **Defenses**:
   - AC: Total AC from the character build
   - Saves: 10 + proficiency bonus (following PF2e rules)

4. **Skills**:
   - Calculates total skill values by combining:
     - Proficiency bonus
     - Relevant ability modifier
     - Item bonuses (if present)

### Archetype Detection

Archetypes are automatically detected by scanning the character's feats for any containing "Dedication" in the name. The tool strips off the "Dedication" suffix and displays the archetype name.

### Limitations

- The tool currently works best with Pathbuilder 2e exports
- Some custom or homebrew content may not parse correctly
- Character data is stored in browser memory only and is not persisted between sessions

## Troubleshooting

### Import Issues

If you encounter problems importing character data:

1. **Check JSON Format**: Ensure the data is valid JSON from a PF2e character builder
2. **Required Fields**: The JSON must contain a `build` object with character information
3. **Browser Support**: Make sure you're using a modern browser with clipboard API support

### Display Issues

If the table doesn't display correctly:

1. **Refresh the Page**: Sometimes a simple refresh can fix display glitches
2. **Clear All**: Try clearing all characters and reimporting them
3. **Browser Zoom**: Adjust your browser zoom level if the table is too wide

## Privacy Note

All character data processing happens entirely in your browser. No data is sent to any server or stored permanently. Closing the browser tab will clear all character data.
