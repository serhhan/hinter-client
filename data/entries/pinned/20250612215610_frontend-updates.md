# Frontend Updates on Local Node.js Server and Svelte UI

I have built a basic local Node.js server for Hinter Core, which reads and manages files locally. On top of this, I have developed a simple UI using Svelte that currently displays:

- Peers
- Incoming and outgoing reports

At this stage, the UI is primarily for visualization purposes and does not support write actions yet. The avatars shown are seeded by the user's public key.

Upcoming features in development include:

- Rendering markdown files in a formatted view
- Creating manual reports
- Tracking report read status to enable notifications for new reports (the "0" on peer cards will soon display unread counts)
- Adding an Entries page with support for creating entries via a markdown editor
- Adding and removing peers

Currently, no code changes have been pushed yet; this is just testing on local. When the project matures enough, a PR will be opened.

A video demo of this progress has been shared in the hinter-core Slack channel.

Feedback and ideas are welcome.

Technologies used: Node.js for the server and Svelte for the frontend UI.
