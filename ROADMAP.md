# GridLang Roadmap

A checklist of planned features, refactoring work, and bug fixes. Checked items are supported by the current repository implementation; this does not imply end-to-end production verification.

## Add Features

### 1. Improve Quiz

- [ ] **1.1** Provide a quiz for every theme.
- [ ] **1.2** Include quiz activity in the heatmap, or add a separate chart that clearly distinguishes daily activity:
  - [ ] Daily sentence / vocabulary practice count.
  - [ ] Daily quiz practice count.

### 2. Optional Images for Vocabulary

- [x] Allow users to optionally upload an image for each vocabulary item.

### 3. Bulk Image Upload

- [ ] Support uploading images for multiple vocabulary items in one batch.

### 4. Multi-user Management

- [ ] Add support for multiple members / user accounts, with each member's learning data managed separately.

### 5. Graph Visualization

- [x] Render the **Graph** tab as an interactive network graph with nodes, connections, and a force-directed layout (Cytoscape.js).

### 6. Remember Button in Today

- [ ] Add a **Remember** button to each item in **Today**.
- [ ] When clicked, remove that sentence card from the current grid and randomly select a replacement sentence card.

## Refactor

### 1. Remote Database

- [ ] Set up a remote database, such as PostgreSQL, as the shared source of truth for application data.
- [ ] Design and implement the database schema, migrations, and secure server-side data access.
- [ ] Plan and execute migration of existing local data (including user learning progress and activity history) to the remote database.

### 2. Cross-device Data Synchronization and Concurrent Editing

- [ ] Ensure phones, computers, tablets, and other devices belonging to the same user read from and write to the same remote database.
- [ ] Implement authentication and user-scoped data access so each user can only access their own data.
- [ ] Handle simultaneous edits from multiple devices safely, using an explicit conflict-resolution strategy (for example, optimistic concurrency control with version numbers, transactions, and retry or merge behavior).
- [ ] Define synchronization behavior for offline edits, reconnects, duplicate requests, and stale data.
- [ ] Add tests for concurrent updates and cross-device synchronization to prevent lost updates and data corruption.

## Bug Fixes

### 1. Preserve Heatmap Activity During Data Import and Export

- [x] **1.1** Include the relevant heatmap activity data when exporting / downloading a backup file.
- [x] **1.2** Restore and record the heatmap activity data when importing a JSON backup.

### 2. Randomize Today's Sentences

- [x] Select Today's sentences using a date-seeded shuffle (stable within the same day; not a fresh random draw on every refresh).
