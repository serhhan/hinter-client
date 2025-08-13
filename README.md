# Hinter Client

## ⚡ One-Command Setup

**For first-time users - just copy & paste this command:**

```bash
docker run -p 3000:3000 \
  --user root \
  --name hinter-client \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd)/hinter-core-data:/app/hinter-core-data \
  -e CONTAINER_MODE=true \
  -e HOST_HINTER_CORE_DATA_PATH=$(pwd)/hinter-core-data \
  serhann/hinter-client:latest
```

**Then open:** http://localhost:3000

That's it! The app will automatically manage everything for you.

---

## 🚀 Advanced Setup Options

### Simple Setup (Docker)

```bash
# Basic run - hinter-client will manage hinter-core automatically
docker run -p 3000:3000 \
  --user root \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd)/hinter-core-data:/app/hinter-core-data \
  -e CONTAINER_MODE=true \
  -e HOST_HINTER_CORE_DATA_PATH=$(pwd)/hinter-core-data \
  serhann/hinter-client:latest

# Open http://localhost:3000
```

### Advanced Setup (Full Control)

```bash
# 1. Run hinter-core manually
docker run -d --name hinter-core \
  --network host \
  -v $(pwd)/hinter-core-data:/app/hinter-core-data \
  bbenligiray/hinter-core:latest

# 2. Run hinter-client
docker run -p 3000:3000 \
  -v $(pwd)/hinter-core-data:/app/hinter-core-data \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e CONTAINER_MODE=true \
  -e HINTER_CORE_CONTAINER_NAME=hinter-core \
  serhann/hinter-client:latest

# Open http://localhost:3000
```

### For Developers

```bash
git clone <repository-url>
cd hinter-client
pnpm install
pnpm run dev
# Open http://localhost:5173
```

## 🚀 Features

### Core Functionality

- **📝 Report Management**: Create, edit, and distribute markdown reports with YAML frontmatter metadata
- **👥 Peer Network**: Manage peer connections with public key validation and secure communication
- **🏷️ Group Organization**: Organize peers into groups for efficient bulk report distribution
- **⚡ Real-time Sync**: Automatic synchronization of reports and messages across the network
- **📎 File Attachments**: Support for file uploads and source path management
- **📌 Entry Pinning**: Pin important reports for easy access and organization

### User Interface

- **🎨 Modern UI**: Clean, responsive design built with TailwindCSS 4
- **🌙 Component-based**: Modular Svelte 5 components for maintainable code
- **📱 Mobile-friendly**: Responsive design that works on all device sizes
- **🔔 Notifications**: Toast notification system for user feedback
- **👤 Avatars**: Visual peer identification system

### Technical Features

- **🔒 Secure**: Public key cryptography for peer authentication
- **🐳 Docker Ready**: Full containerization support with Docker Compose
- **🔧 API-driven**: RESTful API endpoints for all functionality
- **📊 Metadata Rich**: YAML frontmatter support for structured report metadata
- **🔄 Live Updates**: Real-time UI updates with reactive data stores

## 🛠️ Technology Stack

- **Frontend**: Svelte 5 + SvelteKit
- **Styling**: TailwindCSS 4
- **Language**: TypeScript
- **Backend**: Node.js with SvelteKit API routes
- **P2P Core**: hinter-core integration
- **Containerization**: Docker + Docker Compose
- **Package Manager**: PNPM
- **Code Quality**: ESLint + Prettier

## 📋 Prerequisites

- **Node.js** 18+
- **PNPM** (recommended) or npm
- **Docker** and **Docker Compose** (for containerized deployment)

## 🚀 Quick Start

### Development Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd hinter-client
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Start development server**

   ```bash
   pnpm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

### Docker Deployment

#### Option 1: Using Docker Compose (Recommended)

1. **Clone and setup**

   ```bash
   git clone <repository-url>
   cd hinter-client
   ```

2. **Deploy with Docker Compose**

   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   Navigate to `http://localhost:3000`

#### Option 2: Quick Start with Docker Run (For 3rd Party Users)

If you just want to run the application without cloning the repository:

1. **Pull the Docker image**

   ```bash
   docker pull your-org/hinter-client:latest
   ```

2. **Run hinter-core container**

   ```bash
   docker run -d --name hinter-core \
     --network host \
     -v $(pwd)/hinter-core-data:/app/hinter-core-data \
     bbenligiray/hinter-core:latest
   ```

3. **Run hinter-client container**

   ```bash
   docker run -d --name hinter-client \
     -p 3000:3000 \
     -v $(pwd)/hinter-core-data:/app/hinter-core-data \
     -v /var/run/docker.sock:/var/run/docker.sock \
     -e NODE_ENV=production \
     -e PORT=3000 \
     -e HOST=0.0.0.0 \
     -e CONTAINER_MODE=true \
     -e HOST_HINTER_CORE_DATA_PATH=$(pwd)/hinter-core-data \
     -e HINTER_CORE_CONTAINER_NAME=hinter-core \
     your-org/hinter-client:latest
   ```

4. **Access the application**
   Navigate to `http://localhost:3000`

#### Docker Setup Benefits

The Docker setup automatically:

- Builds the Hinter Client application
- Pulls and runs the latest hinter-core container
- Sets up networking between containers
- Persists data in `./hinter-core-data`

## 📁 Project Structure

```
hinter-client/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── chat/           # Chat-related components
│   │   ├── planner/        # Planning and organization tools
│   │   ├── AddPeerModal.svelte
│   │   ├── EntryModal.svelte
│   │   ├── PeerCard.svelte
│   │   └── ...
│   ├── lib/
│   │   ├── server/         # Server-side utilities
│   │   ├── services/       # Business logic services
│   │   ├── stores/         # Svelte stores for state management
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Utility functions
│   ├── routes/             # SvelteKit routes and API endpoints
│   │   ├── api/           # REST API endpoints
│   │   ├── entries/       # Entry management pages
│   │   ├── peers/         # Peer management pages
│   │   └── settings/      # Settings and configuration
│   └── assets/            # Static assets and icons
├── docker-compose.yml     # Multi-container setup
├── Dockerfile            # Container build instructions
└── package.json          # Dependencies and scripts
```

## 🏗️ Key Components

### Report Management

- **EntryModal**: Create and edit reports with metadata
- **EntryCard**: Display report summaries and metadata
- **MetadataViewer**: Visualize YAML frontmatter data

### Peer Management

- **PeerCard**: Individual peer display with status
- **AddPeerModal**: Add new peers with validation
- **EditPeerModal**: Modify existing peer information
- **PeerDropdown**: Group and peer selection interface

### Core Features

- **SideBar**: Main navigation and quick access
- **ToastContainer**: Global notification system
- **Avatar**: Visual peer identification
- **MarkdownRenderer**: Rich text display for reports

## 🌐 API Endpoints

### Peers

- `GET /api/peers` - List all peers
- `POST /api/peers` - Add new peer
- `PUT /api/peers/[alias]/[publicKey]` - Update peer
- `DELETE /api/peers/[alias]/[publicKey]` - Remove peer

### Entries

- `GET /api/entries` - List all entries
- `POST /api/entries` - Create new entry
- `PUT /api/entries/[id]` - Update entry
- `DELETE /api/entries/[id]` - Delete entry

### Groups

- `GET /api/groups` - List all groups
- `POST /api/groups` - Create group
- `PUT /api/groups/[name]` - Update group

### System

- `GET /api/settings` - Get application settings
- `POST /api/settings` - Update settings
- `POST /api/sync` - Trigger manual sync
- `POST /api/upload` - Upload files

## 🔒 Security Features

- **Public Key Authentication**: 64-character hexadecimal public keys
- **Input Validation**: Comprehensive validation on all inputs
- **Secure Communication**: P2P encryption via hinter-core
- **Container Isolation**: Dockerized deployment for security

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style (ESLint + Prettier)
- Write TypeScript for type safety
- Update documentation as needed

## 📝 Configuration

### Environment Variables

- `NODE_ENV`: Environment mode (development/production)
- `PORT`: Server port (default: 3000)
- `HOST`: Server host (default: 0.0.0.0)
- `CONTAINER_MODE`: Enable container-specific features
- `HOST_HINTER_CORE_DATA_PATH`: Path to hinter-core data
- `HINTER_CORE_CONTAINER_NAME`: Name of hinter-core container

### Docker Configuration

The `docker-compose.yml` file provides a complete setup with:

- Automatic hinter-core integration
- Volume mounting for data persistence
- Network configuration for container communication
- Health checks and restart policies

## 🐛 Troubleshooting

### Common Issues

**Port conflicts**

```bash
# Change the port in docker-compose.yml
ports:
  - '3001:3000'  # Use different host port
```

**Permission issues**

```bash
# Fix Docker socket permissions (Linux)
sudo chmod 666 /var/run/docker.sock
```

**Build failures**

```bash
# Clear Docker cache
docker system prune -a
docker-compose build --no-cache
```

**Container management**

```bash
# Check running containers
docker ps

# View logs
docker logs hinter-client
docker logs hinter-core

# Stop containers
docker stop hinter-client hinter-core

# Remove containers
docker rm hinter-client hinter-core

# Update to latest version
docker pull serhann/hinter-client:latest
docker pull bbenligiray/hinter-core:latest
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
