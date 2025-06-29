# Catan Portal

> **The Ultimate Catan Strategic Assistant** - More than just a resource tracker, this is your portal to maximizing win probability through intelligent board analysis and strategic recommendations.

A sophisticated browser extension for [colonist.io](https://colonist.io) that transforms your Catan experience by providing real-time strategic insights, resource tracking, and future board recommendations to help you dominate every game.

## Mission

Catan Portal isn't just another resource tracker. It's your strategic companion that analyzes the board state, tracks all player resources, and provides intelligent recommendations to maximize your win probability. Whether you're a casual player or a competitive strategist, this portal gives you the insights you need to make the best decisions.

## Features

### Strategic Intelligence

- **Future Board Recommendations**: Get intelligent suggestions for optimal moves
- **Win Probability Analysis**: Understand your chances and how to improve them
- **Strategic Resource Tracking**: Track all resources with theft detection and potential deltas

### Real-Time Resource Tracking

- **Complete Resource Monitoring**: Brick, Lumber, Wool, Grain, Ore
- **Smart Parsing**: Monitors dice rolls, trades, robber events, and building costs
- **Theft Detection**: Tracks robber, knight, and monopoly card effects
- **Resource Deltas**: Identifies potential resource discrepancies and theft opportunities

### Enhanced Gameplay

- **Draggable Interface**: Position the overlay anywhere on screen
- **Debug Mode Toggle**: Show/hide detailed event logs
- **Persistent Settings**: Username and preferences saved between sessions
- **Real-Time Updates**: Instant resource tracking from chat log analysis

### User Experience

- **Clean, Modern UI**: Beautiful overlay that doesn't interfere with gameplay
- **Customizable Position**: Drag and drop interface positioning
- **Smart Interactions**: Prevents dragging when using controls
- **Responsive Design**: Adapts to different screen sizes

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm
- Chrome/Edge browser

### Installation

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd ColonistPortal
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Build the extension:**

   ```bash
   npm run build
   ```

4. **Load in Chrome/Edge:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the project folder

### Development

For development with auto-rebuild:

```bash
npm run watch
```

## Project Structure

```
ColonistPortal/
├── content.js              # Main content script (entry point)
├── resource-tracker.js     # Core resource tracking and strategic logic
├── ui-overlay.js          # Modern, draggable UI overlay
├── webpack.config.js      # Webpack bundling configuration
├── package.json           # Dependencies and build scripts
├── manifest.json          # Browser extension manifest
├── card_images/           # Resource card SVG assets
│   ├── card_brick.svg
│   ├── card_grain.svg
│   ├── card_lumber.svg
│   ├── card_ore.svg
│   └── card_wool.svg
└── dist/                  # Built files (generated)
    └── content.bundle.js  # Bundled content script
```

## Architecture

The project uses a modular architecture for maintainability and extensibility:

- **ResourceTracker**: Core logic for resource counting, chat parsing, and strategic analysis
- **UIOverlay**: Modern, draggable interface with persistent settings
- **content.js**: Main coordinator that ties everything together

## How It Works

### Resource Tracking

The extension intelligently parses colonist.io chat logs to track:

- **Dice Roll Gains**: "got" messages for resource distribution
- **Initial Resources**: Starting settlement placement resources
- **Bank Trades**: Complex multi-resource exchanges
- **Theft Events**: Robber, knight, and monopoly card effects
- **Building Costs**: Roads, cities, settlements, and development cards
- **Resource Discarding**: When 7 is rolled

### Strategic Analysis

- **Resource Deltas**: Identifies discrepancies that might indicate theft
- **Player Patterns**: Analyzes resource flow and trading behavior
- **Board State**: Tracks building progress and development card usage

### User Interface

- **Draggable Overlay**: Click and drag to position anywhere on screen
- **Debug Mode**: Toggle detailed event logs for strategic analysis
- **Persistent Settings**: Username and preferences saved automatically
- **Smart Interactions**: Prevents accidental dragging when using controls

## Supported Chat Patterns

The extension recognizes and processes these chat log patterns:

- `"got"` - Dice roll resource gains
- `"received starting resources"` - Initial settlement placement
- `"gave bank ... and took"` - Bank trades (multiple resources)
- `"stole"` - Resource stealing (robber, knight, monopoly)
- `"discarded"` - Resource discarding when 7 is rolled
- `"built a road"` - Road building costs (1 lumber, 1 brick)
- `"built a city"` - City building costs (2 grain, 3 ore)
- `"built a settlement"` - Settlement building costs (1 lumber, 1 brick, 1 wool, 1 grain)
- `"bought development card"` - Development card costs (1 ore, 1 grain, 1 wool)

## Future Roadmap

This is just the beginning! Planned features include:

- **AI-Powered Recommendations**: Machine learning for optimal move suggestions
- **Advanced Analytics**: Win probability calculations and risk assessment
- **Multi-Game Tracking**: Historical performance analysis
- **Social Features**: Share strategies and compare with other players
- **Customizable Alerts**: Notifications for strategic opportunities

## Contributing

We welcome contributions! Whether it's:

- Bug reports and feature requests
- Code improvements and optimizations
- UI/UX enhancements
- Strategic algorithm improvements

Please feel free to open issues or submit pull requests.

## License

MIT License - Feel free to use, modify, and distribute as needed.

## Acknowledgments

Built for the Catan community by players who understand the strategic depth of this amazing game. Special thanks to the colonist.io team for providing such a great platform.

---

**Ready to dominate Catan? Install Catan Portal and start your journey to strategic mastery!**
