# Report for Mertcan: Project Proposal for Mertcan

## Summary

This report shares a project proposal for a fully decentralized Chat & DAO platform. The platform aims to empower users and communities with full ownership and governance of their data and interactions, featuring:

- Decentralized chat infrastructure (P2P, Gun.js)
- Blockchain-based identity and wallet login
- Each community as a DAO with its own governance and treasury
- Global governance via a parent DAO
- Utility token-based economy for participation, governance, and premium features
- Decentralized, DAO-driven moderation and transparent, on-chain enforcement

The technical architecture combines Gun.js for real-time, decentralized data and smart contracts for critical state and governance. The user experience is wallet-first, with flexible server-level economic models and DAO-based governance. The MVP roadmap includes wallet login, Gun.js chat, DAO deployment, and moderation tools, with future phases expanding governance and economic features.

---

## Full Project Proposal

## 1. Project Summary & Vision

This project aims to develop a **fully decentralized Chat & DAO (Decentralized Autonomous Organization) platform**, designed to empower users and communities with full ownership and governance of their data and interactions.

Traditional chat and community platforms (e.g., Discord, Telegram) operate through centralized servers and data control. In contrast, our platform will enable users to **create and manage their own communities**, with **decentralized data ownership** and **blockchain-based governance and economy**.

### Vision

- **Fully decentralized chat infrastructure** → User data and communication flow are distributed across a P2P network.
- **Blockchain-based identity and authorization** → Users authenticate via blockchain wallets (no centralized identity database).
- **Server-as-a-DAO model** → Each community server operates as a DAO with its own governance structure.
- **Global governance through a parent DAO** → Cross-server governance decisions can be made via an overarching DAO.
- **Utility token-based economy** → Server creation, DAO participation, and platform features are powered by a system token.
- **Platform revenue model** → Server creation fees and premium features provide economic sustainability.
- **Decentralized moderation** → Community-driven moderation and content control are implemented via DAO-based voting mechanisms.

This architecture aims to provide a platform where users can:

- Freely create and govern their communities.
- Maintain full control over their identity and data.
- Participate in a transparent and sustainable token-driven economy.
- Engage in a **self-governing ecosystem** that aligns with the core principles of Web3.

## 2. User Experience & General Flow

The platform is designed to provide a seamless experience where users can interact, participate in governance, and manage communities in a fully decentralized manner.

### User Flow

1. **Login via Wallet**  
   Users connect their blockchain wallet (e.g., MetaMask, WalletConnect) to authenticate. No centralized account is required.

2. **Join a Server**

   - Users can freely join any public server and participate in chat channels without staking (unless the server defines an entry fee).
   - Each server is independently operated and has its own wallet and DAO mechanism.

3. **DAO Membership & Participation Fees**

   - Each server DAO can define its own participation fee (staking amount or one-time fee) required to become a DAO member.
   - Collected participation fees go directly into the server DAO’s treasury (server wallet).
   - By staking tokens, users unlock:
     - DAO membership and governance rights
     - Special roles, ranks, and labels (similar to Discord Nitro perks)
     - Access to premium/private channels or features (as defined by the server DAO)

4. **Chat Participation**

   - All users (DAO members or not) can participate in public channels, unless a server explicitly restricts this.
   - DAO members gain access to private or premium channels.
   - All messages are encrypted and distributed via Gun.js.

5. **Server Lifecycle & Governance**

   - Each server operates its own DAO governance system and manages its own treasury via its server wallet.
   - DAO members can vote on:
     - Server policies
     - Treasury allocation
     - Moderation decisions
     - Feature upgrades
     - Entry fees and tokenomics settings

6. **Platform-wide Governance**
   - Servers participate in the global governance layer via the parent DAO.
   - Servers may have voting rights in platform-level decisions depending on their stake or activity.

### Key Experience Principles

- **Wallet-first authentication** → Decentralized identity.
- **Free entry or fee-based entry (server-defined)** → Servers define their own economic model.
- **Stake-based governance & perks** → Adds value and incentives for DAO participation.
- **Per-server DAO and wallet architecture** → Ensures independence and flexibility.
- **Direct flow of participation fees to server DAO treasury** → Sustainable server economies.
- **End-to-end encrypted communication** → Data privacy is a core priority.
- **DAO-based moderation** → Balanced approach to content control without centralized authority.

## 3. Technical Architecture

The platform architecture is designed as a hybrid system combining:

- **Decentralized peer-to-peer data layer** ([Gun.js](https://gun.eco/))
- **On-chain smart contracts** for critical state and governance
- **Blockchain-based identity and authorization**
- **Optional server-specific economic models (via DAO wallets)**

### 3.1 Data & Communication Layer — [Gun.js](https://gun.eco/)

- **[Gun.js](https://gun.eco/)** provides a **P2P, real-time graph database** optimized for decentralized chat and social data.
- Each client node participates in the Gun.js mesh network.
- Data is propagated using **eventual consistency** with conflict resolution via **[HAM - Hypothetical Amnesia Machine](https://gun.eco/docs/Conflict-Resolution-with-Guns)**.
- **End-to-end encryption** is implemented via **[Gun.js SEA (Security, Encryption, Authorization)](https://gun.eco/docs/SEA)** module:
  - Public channels → may or may not be encrypted (configurable).
  - Private channels & DMs → always end-to-end encrypted.
- **Relay nodes** can be used to improve availability but are optional; servers may choose to run their own relay nodes.
- **Optional WebRTC layer** is supported via **[Gun AXE (Advanced eXchange Equation)](https://gun.eco/docs/AXE)** for direct peer-to-peer message delivery (ideal for DMs and small servers).

#### How Gun.js Works

- **Gun.js** is a decentralized, peer-to-peer (P2P), real-time **graph database**.
- It uses an **append-only graph data model**, where data is represented as a graph of nodes and edges.
- Data is stored and synchronized across peers using a **Gossip Protocol** — changes are broadcast to connected peers.
- **Conflict resolution** is handled by the [HAM (Hypothetical Amnesia Machine)](https://gun.eco/docs/Conflict-Resolution-with-Guns) algorithm, ensuring eventual consistency:
  - Uses timestamp-based resolution and vector clocks.
- Gun.js is **schema-less**, allowing flexible data models (documents, trees, graphs).
- **Persistence** is optional:
  - On the client side → data can be cached in **IndexedDB** via Gun.js.
  - On the server side → relay nodes can persist data using **Gun.js with Radisk** storage adapter.
- **Security & privacy**:
  - Encryption is provided via the [SEA module](https://gun.eco/docs/SEA).
  - The network itself is public — proper encryption is mandatory for sensitive data (DMs, private channels).
- **Optional P2P transport**:
  - Direct peer-to-peer connections can be established via [Gun AXE](https://gun.eco/docs/AXE), which adds WebRTC support.

##### Strengths of Gun.js

- Lightweight (~9kb gzipped core).
- Scales horizontally — no centralized server required.
- Ideal for **high-frequency, non-critical data** (chat messages, profiles, presence).
- Offline-first — clients can operate offline and sync when reconnected.

##### Limitations of Gun.js

- Provides **eventual consistency**, not strict consistency (fine for chat, not ideal for financial state).
- Requires careful **encryption design** — by default, data is public on the mesh network.
- Not optimized for large complex queries (it’s not a SQL or traditional NoSQL database).
- **Not a blockchain** — smart contracts are used for critical state and guarantees.

##### Conclusion

Gun.js is used as the **data layer** for chat and social interactions, where **real-time, low-latency** experience is critical, and **strict consensus is not required**.

Critical state (DAO membership, treasury, governance) is handled on-chain to ensure transparency and trust.

#### Network Topology & Relay Nodes

- The platform will operate its own set of **official relay nodes** to ensure privacy, data availability, and performance.
- Servers (DAOs) will primarily connect through these official relay nodes.
- Public clients may also connect to these relay nodes for an optimal experience.
- Direct peer-to-peer connections (via **Gun AXE**) may be used for DMs and small groups.
- The Gun.js mesh network remains global — clients only synchronize the data they are subscribed to (their current servers / chats).
- This architecture ensures that:
  - Data flows are controlled and monitored by the platform.
  - Server operators (DAOs) maintain control of their own data availability.
  - The network remains decentralized and resilient.

### 3.2 Identity & Authorization

- Users authenticate by signing a message via their blockchain wallet (MetaMask, WalletConnect, etc.).
- The wallet address serves as the unique identity across the platform.
- **Gun.js SEA keys** can be derived or associated with the wallet identity for encrypted data.
- User profiles and roles are stored in Gun.js, with sensitive data encrypted.

### 3.3 DAO & Governance Layer

#### Per-Server DAO

- Each server operates as an **independent DAO** with:
  - Its own **smart contract (DAO contract)**.
  - Its own **DAO treasury wallet** (owned by the DAO contract).
  - Its own **governance parameters** (participation fee, voting rules, role structure).
- Server admins configure initial DAO parameters on creation.

#### Server Creation Flow

1. User triggers a **Create Server** transaction on the **Platform Factory Contract**.
2. User pays a **platform fee** and/or **stakes tokens** (configurable).
3. A new **DAO contract** and **server wallet** are deployed for the server.
4. Server metadata is written to Gun.js and linked to the DAO contract address.

#### DAO Participation & Fees

- DAO members **stake tokens** to gain governance rights and special roles.
- Servers define their own participation fee, which goes directly to their DAO treasury.
- DAO members can vote on:
  - Treasury usage.
  - Moderation decisions.
  - Server policies.
  - Entry fee changes.
  - Feature unlocks.

#### Platform-wide Governance

- The platform operates a **parent DAO** (governance contract).
- Servers may stake tokens to participate in platform-level governance.
- The parent DAO governs:
  - Platform fees.
  - Relay node policies.
  - Global moderation policies.
  - Protocol upgrades.

### Architecture Summary Diagram (Text Version)

[Wallets] → [Smart Contracts: Parent DAO + Server DAOs] → [Gun.js Mesh Network] → [Client Apps]

Gun.js → chat data, profiles, encrypted messages.

Smart Contracts → critical state: DAO membership, treasury, governance votes.

Wallets → user identity and authorization.

Optional: WebRTC (AXE) → direct P2P message delivery.

### Key Design Principles

- **Off-chain data for scalability** → chat messages and social data live in Gun.js.
- **On-chain state for trust** → DAO membership, treasury management, governance are on-chain.
- **User-controlled identity** → no centralized accounts, only wallet-based login.
- **Server-level economic autonomy** → each DAO defines its own economy.
- **Composable and extensible** → platform can evolve with new modules and integrations.

## 4. Utility Token Model

The platform introduces a **Utility Token** that powers key actions and incentives across the ecosystem.  
This ensures that the token has **real, meaningful use** and supports a sustainable economic model.

### Key Principles

- The token is used to drive **participation**, **governance**, and **server economies**.
- All flows are **on-chain and transparent** — no hidden fees or central intermediaries.
- Each server operates its own DAO and defines part of its token economics (flexible, server-controlled).

### Token Use Cases

#### Server Creation

- To create a new server (DAO), a user must interact with the **Platform Factory Contract**.
- The user pays a **platform fee** and/or **stakes a certain amount of Utility Tokens**.
- Fees can be:
  - Burned → deflationary effect on the token.
  - Sent to the parent DAO treasury → to fund platform operations and rewards.
- The platform may define **minimum stake / fee thresholds** to prevent spam server creation.

#### DAO Membership & Participation

- Each server DAO can define its own **participation fee** — either as a stake or one-time fee.
- Users can **stake Utility Tokens** into the server DAO to become members and unlock perks:
  - DAO voting rights.
  - Special roles, ranks, and labels.
  - Access to premium channels or server features.
- The tokens staked for DAO membership go directly to the **server DAO’s treasury**.

#### DAO Governance

- Token-weighted voting → DAO members vote using their staked tokens.
- Possible votes include:
  - Server treasury spending.
  - Moderation decisions (e.g. banning a user or content).
  - Feature unlocks or upgrades.
  - Entry fee / stake policy changes.

#### Platform-wide Governance

- Servers can **stake tokens at the parent DAO level** to gain voting rights in global platform decisions.
- Possible platform-level votes:
  - Protocol upgrades.
  - Platform-wide fees.
  - Relay node policies.
  - Global moderation guidelines.

#### Additional Uses (Future Scope)

- **Premium features** (client-side cosmetic upgrades, etc.) could be unlocked with token payments.
- **Tipping** between users in chat.
- **Cross-server premium subscriptions** using tokens.
- **Marketplace interactions** (server plugins, bots, premium content).

### Token Flow Summary Diagram (Text Version)

[User Wallet] → [Platform Factory Contract] → [Parent DAO Treasury]

↓

[Server DAO Contract] → [Server DAO Treasury]

↓

[User Stake for DAO Membership] → [DAO Votes & Perks]

### Summary

- The Utility Token has clear, meaningful uses at **every layer** of the platform:

  - Platform level → server creation, global governance.
  - Server level → DAO membership, treasury funding, governance, perks.
  - User level → premium features, tipping, identity customization.

- The system ensures that:
  - Tokens are **actively used**, not just speculative.
  - Server DAOs are economically independent.
  - The parent DAO remains funded and able to govern the ecosystem.

## 5. Moderation & Server Deactivation Mechanism

To maintain the integrity of the platform and ensure that malicious or harmful content can be addressed, the platform includes a **DAO-driven Moderation & Server Deactivation mechanism**.

This system balances **decentralization** with the need for **responsible governance**.

### Principles

- The platform should avoid **centralized censorship**.
- At the same time, there must be mechanisms to allow **community-driven moderation**.
- The process must be **transparent**, **on-chain**, and **enforceable**.

### Moderation Process

#### Per-Server Moderation

- Each server DAO can enforce its own **local moderation policies**.
- Server DAO members can:
  - Vote to mute / ban users within their server.
  - Vote to delete or hide content (where applicable).
- The server DAO treasury may be used to fund moderation tools or incentives.

#### Platform-wide Moderation & Server Deactivation

- The **Parent DAO** has the power to initiate **Platform-wide moderation actions**.
- The Parent DAO can vote to:
  - **Deactivate a server** (ban from platform relay nodes and official client apps).
  - **Blacklist a server** from the official server directory and discovery mechanisms.
  - These actions are enforced via an **on-chain "Banned Servers List"** managed by the Parent DAO contract.

### Enforcement

- The official **relay nodes** operated by the platform will not propagate data from banned servers.
- The official **client apps** will not display or connect to banned servers.
- Decentralized clients (outside the official app) may choose to ignore the ban list, but they will not benefit from the official relay infrastructure.
- The on-chain **Banned Servers List** is public and transparent — anyone can verify why a server was banned.

### Moderation Flow Summary (Text Version)

[Server DAO Moderation] → [Per-server actions: mute/ban users, manage content]

↓

[Parent DAO Moderation] → [Platform-wide ban proposal → DAO vote → Update on-chain Banned Servers List]

↓

[Relay Nodes & Official Clients] → Enforce ban list → Block banned servers from platform infrastructure

### Key Benefits

- Ensures moderation decisions are **transparent and community-driven**.
- Avoids **centralized censorship** while still providing tools to combat abuse.
- Gives individual servers control over their own space.
- Provides an escalation path to the Parent DAO for cases where server-wide bans are needed.
- Protects platform reputation and safety.

### Limitations

- **Truly decentralized clients** outside the official infrastructure may still connect to banned servers.
- The system relies on DAO participation — sufficient voter turnout is required for effective governance.

### Summary

This Moderation & Server Deactivation mechanism provides a **balanced governance model**:

- Local server DAOs govern their own spaces.
- The Parent DAO governs the overall platform integrity.
- Enforcement is transparent and on-chain.
- Users and server operators remain in control — no centralized authority is required.

#### FAQ / Common Objections

**Q: What if someone creates an illegal or malicious server?**  
A: The Parent DAO has the authority to initiate a platform-wide ban through an on-chain vote.  
If the DAO votes to ban a server, the server is added to the **on-chain Banned Servers List**.  
All official relay nodes and clients will enforce this ban and block traffic from the server.  
The process is fully transparent and auditable.

**Q: Can banned servers bypass the ban by using alternative clients?**  
A: Technically yes — the system is decentralized and anyone can run their own client or relay node.  
However, banned servers will lose access to the **official relay infrastructure** and **official client apps**, severely limiting their reach and visibility.  
This balances decentralization with practical enforcement.

**Q: How does this system protect the platform legally?**  
A: The platform provides a transparent and community-governed moderation process.  
Illegal content is not hosted by the platform; it is distributed P2P by server operators.  
The platform’s relay nodes and official clients enforce bans according to DAO decisions.  
This provides a governance and enforcement framework that demonstrates **reasonable efforts** to combat abuse and illegal activity.

**Q: Does the Parent DAO have too much power?**  
A: No. The Parent DAO only governs **platform-level infrastructure** (relay nodes, official clients).  
Individual servers retain full control over their own DAO, moderation policies, and community rules.  
The Parent DAO can only intervene if a server threatens the integrity or safety of the overall platform.

## 6. Risks & Mitigations

Every decentralized system involves trade-offs.  
This section identifies key risks and explains how the platform design mitigates them.

### Technical Risks

| Risk                                                                              | Mitigation Strategy                                                                                                            |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Eventual consistency (Gun.js HAM)** may cause temporary divergence in chat data | Acceptable for chat; critical state (DAO, treasury, governance) is handled on-chain for strong consistency                     |
| **Relay node failure / unavailability**                                           | Platform will operate multiple official relay nodes; servers are encouraged to run their own relay nodes for redundancy        |
| **Metadata leakage** (Gun.js exposes node IDs)                                    | Sensitive data (DMs, private channels) is fully end-to-end encrypted via SEA; metadata minimization practices will be followed |
| **Network scalability** under high load                                           | Horizontal scaling of relay nodes + use of WebRTC AXE for P2P traffic where possible                                           |
| **P2P clients outside official relays bypassing bans**                            | Official infrastructure (relays, clients) will enforce DAO bans; P2P bypass is technically possible but limited in visibility  |

### Governance & Community Risks

| Risk                                  | Mitigation Strategy                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **DAO apathy / low participation**    | Incentives for participation (staking rewards, voting incentives); platform UX optimized for easy DAO voting |
| **DAO capture / abuse** by a minority | Token-weighted governance + quorum requirements; transparent governance history on-chain                     |
| **Bad actors using DAO funds**        | Treasury actions subject to DAO vote; transparency through on-chain record                                   |
| **Censorship concerns**               | No centralized party can unilaterally ban servers or users; bans require DAO votes and are transparent       |

### Legal & Regulatory Risks

| Risk                               | Mitigation Strategy                                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Illegal content on servers**     | Platform enforces bans via Parent DAO governance; official infrastructure blocks banned servers; platform does not host content            |
| **Token classified as a security** | Clear Utility Token model: token required for participation, governance, and feature unlocks; no promises of investment returns            |
| **KYC/AML concerns**               | The platform operates as a decentralized protocol; no centralized custody of funds; DAO-controlled treasuries are on-chain and transparent |

### Summary

The platform design balances **decentralization** with **responsible governance** and **legal awareness**.

- Technical risks are mitigated through architectural design (on-chain critical state, redundant relays, strong encryption).
- Governance risks are addressed through transparent DAO processes and incentives.
- Legal risks are minimized through DAO-based moderation and a clear utility-focused token model.

No system can eliminate all risks, but this architecture is designed to provide a **robust and responsible foundation** for a decentralized Chat & DAO ecosystem.

## 7. MVP Roadmap

To deliver the platform in a sustainable and iterative way, development will proceed through well-defined phases.  
Each phase builds upon the previous one, ensuring that core functionality is prioritized early, while allowing flexibility for future expansion.

### Phase 1 — MVP

**Core Focus:** Wallet-based chat & basic DAO infrastructure

- Wallet login & authentication (MetaMask, WalletConnect)
- Gun.js chat layer (public & private channels)
- End-to-end encrypted DMs using SEA
- Server creation via Platform Factory Contract
- Initial DAO deployment per server:
  - DAO smart contract per server
  - Server DAO treasury wallet
  - Server-specific participation fee configuration
- Basic DAO membership via staking
- Server moderation tools (local DAO vote-based mute/ban)
- Official relay node infrastructure deployed and operational

**Goal:** Launch functional decentralized chat + DAO prototype

---

### Phase 2 — Advanced DAO Features & Governance

**Core Focus:** Expand DAO functionality, introduce platform-level governance

- Parent DAO governance contract deployed:
  - Global moderation decisions (server bans)
  - Relay node policies
  - Platform fee management
- On-chain Banned Servers List integration
- Enhanced server DAO features:
  - Treasury spending proposals
  - DAO-configurable voting thresholds & quorums
  - Advanced role & rank configuration
- Tipping and microtransaction features (optional)
- Cross-server identity reputation system (optional)

**Goal:** Fully functional multi-layer governance system across platform and servers

---

### Phase 3 — Economic Model & Scaling

**Core Focus:** Strengthen token utility and scale the platform

- Advanced server monetization options:
  - Premium roles / labels
  - Pay-to-access private channels
  - Cross-server premium subscriptions
- Expanded token utility (marketplace, plugins, content unlocks)
- Scalable relay node architecture:
  - Distributed global relay network
  - Relay node operator incentives
- WebRTC AXE integration for optimized DM performance
- Open SDKs / APIs for 3rd party client development
- Legal & compliance review for production launch

**Goal:** Deliver a scalable, sustainable, and extensible decentralized Chat & DAO platform with strong token utility

## 8. References & Technologies

### References

- [Gun.js Official Website](https://gun.eco/)
- [Gun.js Documentation](https://gun.eco/docs/)
- [HAM: Hypothetical Amnesia Machine](https://gun.eco/docs/Conflict-Resolution-with-Guns)
- [SEA: Security, Encryption, Authorization](https://gun.eco/docs/SEA)
- [AXE: Advanced eXchange Equation](https://gun.eco/docs/AXE)
- [Gun.js GitHub Repository](https://github.com/amark/gun)

### Core Technologies

#### Data & Communication Layer

- **Gun.js** — decentralized, real-time, P2P graph database
- **Gun.js SEA** — encryption and identity layer
- **Gun.js AXE** — WebRTC peer-to-peer transport (optional)

#### Blockchain & DAO Layer

- **Solidity** — smart contract development
- **EVM-compatible blockchain** (Ethereum, Polygon, etc.)
- **Parent DAO contract** — platform governance
- **Server DAO contracts** — per-server governance and treasury

#### Identity & Client Layer

- **Wallet-based login** — MetaMask, WalletConnect
- **Gun.js SEA keys** — associated with wallet identity
- **Official relay nodes** — platform-operated and server-operated

#### Future Tools & Features

- **Premium feature unlocks** — token-driven
- **Tipping & microtransactions**
- **Cross-server identity & reputation**
- **Marketplace & plugins**
