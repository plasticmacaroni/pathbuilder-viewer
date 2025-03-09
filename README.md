# Pathbuilder Viewer

A configuration-driven character viewer for Pathfinder 2e characters created with Pathbuilder.

## Overview

This application allows you to import and compare Pathfinder 2e characters exported from Pathbuilder. It uses a fully configuration-driven approach where nearly all logic is defined in YAML configuration files rather than hardcoded JavaScript.

## Features

- Import characters from JSON files or clipboard
- Compare characters side-by-side with their key attributes
- Highlight highest values among party members
- Show party composition warnings and suggestions
- Display "tenuous tips" for party abilities
- Fully configurable display through YAML configuration

## Configuration-Driven Architecture

The application uses a configuration-driven architecture where:

1. Data structure and extraction rules are defined in YAML
2. UI layout and display options are defined in YAML
3. Formulas and calculations are defined in YAML
4. JavaScript only provides the core engine that processes the configuration

### Key Components

- **Table Structure**: Defines sections, columns, and their display properties
- **Preprocessing Rules**: Define how to extract and compute values from character data
- **Template System**: Defines how to display and format values
- **Extractor Functions**: Define reusable calculations for character attributes

## Configuration File Structure

The main configuration file is `config/table-structure.yaml`, which has the following structure:

```yaml
# Global definitions
globals:
  # Common configurations used across the system

# Preprocessing rules
preprocessing:
  # Extractors define reusable functions
  extractors:
    # ...

  # Extracted fields define what data to extract from characters
  extractedFields:
    # ...

# Table structure
sections:
  # UI sections definition
  - id: section_id
    title: "Section Title"
    icon: section_icon
    columns:
      # Column definitions
      - id: column_id
        title: "Column Title"
        # ...
```

## Available Calculation Types

The system supports several types of calculations that can be defined in the configuration:

### 1. Direct JSON Path

Access values directly from the character data:

```yaml
jsonPath: build.abilities.str
```

### 2. Computed Values

Calculate values with a formula:

```yaml
formula: "sum"
params:
  values: ["build.attributes.speed", "build.attributes.speedBonus"]
```

### 3. Templated Values

Apply formatting to values using templates:

```yaml
template: "{value} ({abilityModifier(value)|modifier})"
```

### 4. Extraction Functions

Extract and transform complex data structures:

```yaml
formula: "extractArchetypes"
params:
  feats: "build.feats"
```

## Template System

The template system allows you to format values with a powerful syntax:

### Basic Template Syntax

```
{variableName|transform1|transform2=param1,param2}
```

- `variableName`: The variable to display (e.g., `value`)
- `transform`: Optional transform to apply (can chain multiple)
- `param1,param2`: Optional parameters for the transform

### Available Template Functions

These functions can be called within templates:

| Function          | Description                            | Example                       |
| ----------------- | -------------------------------------- | ----------------------------- |
| `abilityModifier` | Calculates ability modifier from score | `{abilityModifier(value)}`    |
| `formatModifier`  | Formats a number as a modifier (+/-)   | `{value\|modifier}`           |
| `calculateSpeed`  | Calculates total speed                 | `{calculateSpeed(character)}` |

### Available Template Transforms

These transforms can be applied to values:

| Transform     | Description                         | Example                       |
| ------------- | ----------------------------------- | ----------------------------- |
| `prefix`      | Adds a prefix to a value            | `{value\|prefix=+}`           |
| `modifier`    | Formats as +/- modifier             | `{value\|modifier}`           |
| `units`       | Adds units to a value               | `{value\|units=ft}`           |
| `format`      | Applies a format string             | `{value\|format=%s ft}`       |
| `conditional` | Shows different text based on value | `{value\|conditional=Yes,No}` |

## Formula Types

These formula types can be used in extractors and computed values:

### 1. Sum Formula

Adds multiple values together:

```yaml
formula: "sum"
params:
  values: ["path.to.value1", "path.to.value2"]
```

### 2. Skill Calculation

Calculates skill bonuses with level scaling:

```yaml
formula: "skillCalculation"
params:
  profValue: "build.proficiencies.acrobatics"
  abilityMod: "abilityModifier(build.abilities.dex)"
  level: "build.level"
  itemBonus: "build.mods.Acrobatics['Item Bonus']"
```

### 3. Custom JavaScript Formula

Define a custom JavaScript formula:

```yaml
formula: "Math.floor((value - 10) / 2)"
```

## Display Types

The system supports various display types for columns:

| Display Type            | Description                            |
| ----------------------- | -------------------------------------- |
| `pill`                  | Displays value in a colored pill       |
| `pill-list`             | Displays array values as colored pills |
| `proficiency-badge`     | Shows value with proficiency badge     |
| `proficiency-pill-list` | Shows list with proficiency badges     |
| `lore-proficiency-list` | Special display for lore skills        |
| `action-buttons`        | Shows action buttons (e.g., delete)    |

## Adding New Features

### Adding a New Column

1. Add a new column definition to the appropriate section in `config/table-structure.yaml`:

```yaml
- id: new_column
  title: "New Column"
  icon: icon-name
  jsonPath: path.to.value
  highestValue: true
```

### Adding a New Calculation

1. Add a new extractor in the preprocessing section:

```yaml
extractors:
  newCalculation:
    formula: "your calculation logic"
    description: "What this calculation does"
```

2. Add a new extracted field that uses this extractor:

```yaml
extractedFields:
  newField:
    type: "value"
    formula: "newCalculation"
    params:
      param1: "value1"
```

### Adding a New Display Type

1. Create a new helper function in script.js
2. Add the display type to your column configuration

## Examples

### Basic Stat Display

```yaml
- id: str
  title: STR
  icon: dumbbell
  jsonPath: build.abilities.str
  template: "{value} ({abilityModifier(value)|modifier})"
  highestValue: true
```

### Computed Speed Display

```yaml
- id: speed
  title: Speed
  icon: person-running
  jsonPath: extracted.speed
  template: "{value|units=ft}"
  highestValue: true
```

### Complex Skill Display

```yaml
- id: acrobatics
  title: Acro
  icon: person-falling
  jsonPath: extracted.skills.acrobatics
  proficiencyPath: extracted.skillProficiencies.acrobatics
  showProficiency: true
  displayType: proficiency-badge
  highestValue: true
```

## Extending the System

You can extend the system by:

1. Adding new global configurations
2. Creating new extraction methods in JavaScript
3. Registering new template functions
4. Adding new transform types

Follow the existing patterns in the code to ensure compatibility.

## Advanced Tips

1. Use fallback values in paths: `build.abilities.str || 10`
2. Combine multiple transforms: `{value|modifier|prefix=}`
3. Use conditional displays: `{value|conditional=Has darkvision,No darkvision}`
4. Format complex data: `{value|format=%s feet}`

## Troubleshooting

If values aren't displaying correctly:

1. Check console for debugging information
2. Verify your JSON paths against the actual character data
3. Make sure extractors and parameters are correctly defined
4. Try adding fallback values to prevent "undefined" issues
