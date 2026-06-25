# Flujo IDE

A mobile code editor for Android with AI assistant integration and MCP (Model Context Protocol) support. Built with React Native and Expo, CodePilot brings the power of modern desktop editors to your mobile device.

## Features

- **Code Editor** - Full-featured editor powered by CodeMirror 6 in a WebView, with syntax highlighting for 15+ languages
- **AI Chat Assistant** - Integrated chat panel supporting multiple LLM providers (OpenAI, Claude, Gemini) with BYOK (Bring Your Own Key)
- **MCP Client** - Connect to Model Context Protocol servers to extend AI capabilities with custom tools and resources
- **File Manager** - Local file system with tree view, create/rename/delete files and folders
- **Multiple Tabs** - Open and switch between multiple files with a tab bar
- **Dark/Light Themes** - VS Code-inspired themes with automatic system preference detection
- **Settings Panel** - Configure API keys, MCP servers, and editor preferences

## Tech Stack

- **Framework**: React Native with Expo SDK 56
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based routing with bottom tabs)
- **Editor**: CodeMirror 6 running in a React Native WebView
- **State Management**: React Context API
- **Storage**: AsyncStorage for local persistence
- **LLM Integration**: Adapter pattern supporting OpenAI, Anthropic Claude, and Google Gemini
- **MCP Protocol**: JSON-RPC over SSE (Server-Sent Events) transport

## Architecture

```
CodePilot/
|
|-- app/                        # Expo Router screens
|   |-- _layout.tsx             # Root layout with providers
|   |-- (tabs)/
|       |-- _layout.tsx         # Tab bar configuration
|       |-- editor.tsx          # Code editor screen
|       |-- files.tsx           # File manager screen
|       |-- chat.tsx            # AI chat screen
|       |-- mcp.tsx             # MCP server management
|       |-- settings.tsx        # Settings screen
|
|-- src/
|   |-- components/
|   |   |-- chat/              # ChatInput, ChatMessage, ModelSelector
|   |   |-- editor/            # CodeMirrorWebView, TabBar
|   |   |-- files/             # FileTree, CreateFileModal
|   |   |-- mcp/              # ServerCard, AddServerModal, ToolsList
|   |   |-- common/           # Reusable UI components
|   |
|   |-- contexts/             # React Context providers
|   |   |-- ThemeContext       # Dark/light theme management
|   |   |-- EditorContext      # File tabs and editor state
|   |   |-- ChatContext        # Chat messages and LLM interaction
|   |   |-- MCPContext         # MCP server connections and tools
|   |   |-- SettingsContext    # User preferences and API keys
|   |
|   |-- services/
|   |   |-- llm/              # LLM adapters (OpenAI, Claude, Gemini)
|   |   |-- mcp/              # MCP client and server manager
|   |   |-- FileService       # File system operations
|   |   |-- StorageService    # AsyncStorage wrapper
|   |
|   |-- constants/            # Theme colors, config values
|   |-- hooks/                # Custom React hooks
|   |-- types/                # TypeScript type definitions
|   |-- utils/                # Utility functions
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npx expo`)
- Android device or emulator (for running the app)

### Installation

```bash
# Clone the repository
git clone https://github.com/flujopy2025-beep/flujo.ide.git
cd flujo.ide

# Install dependencies
npm install

# Start the development server
npx expo start
```

### Running on Android

```bash
# Start with Android target
npx expo start --android
```

Or scan the QR code from the Expo dev server with the Expo Go app on your Android device.

## Usage

### Editor

Open files from the file manager or create new ones. The editor supports syntax highlighting for JavaScript, TypeScript, Python, HTML, CSS, JSON, and more. Use the tab bar to switch between open files.

### AI Chat

1. Go to **Settings** and enter your API key for OpenAI, Claude, or Gemini
2. Navigate to the **Chat** tab
3. Select your preferred model from the dropdown
4. Start chatting with the AI about your code

### MCP Integration

1. Navigate to the **MCP** tab
2. Tap "Add Server" to configure a new MCP server
3. Enter the server URL (SSE endpoint) and optional headers
4. Once connected, the AI chat can use tools provided by the MCP server

### File Management

- Browse the project file tree in the **Files** tab
- Long-press on files or folders for rename/delete options
- Use the "+" button to create new files or folders

## Screenshots

<!-- Add screenshots here -->

| Editor | Chat | Files | MCP |
|--------|------|-------|-----|
| ![Editor](screenshots/editor.png) | ![Chat](screenshots/chat.png) | ![Files](screenshots/files.png) | ![MCP](screenshots/mcp.png) |

## Contributing

Contributions are welcome! Here is how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Write TypeScript with strict types (avoid `any`)
- Follow the existing component patterns (functional components with hooks)
- Use the `useTheme()` hook for all color references
- Keep business logic in services, UI logic in contexts
- Use `StyleSheet.create` for all styles

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
