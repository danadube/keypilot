# KeyPilot Platform Architecture

## Overview

KeyPilot is a modular **Real Estate Operations Platform** designed to manage the full lifecycle of real estate activity including properties, showings, clients, tasks, marketing, and analytics.

The platform is composed of several **modules**, each responsible for a specific operational area.

The UI uses a **Module Navigation Model**:

- **Top Navigation Bar** → selects the active module
- **Sidebar Navigation** → shows tools/pages within that module
- **Main Content Area** → displays the selected page
- **Global Header** → platform-level controls (search, notifications, profile)

This structure allows the system to scale without overcrowding navigation.

---

# Platform Navigation Structure

## Global Layout

**Top Bar**

- KeyPilot Logo
- Module Navigation Tabs
- Global Search
- Notifications
- User Profile Menu

**Sidebar**

- Contextual navigation based on the selected module

**Main Content**

- Current module page

---

# Platform Modules

The following modules make up the KeyPilot platform:

1. PropertyVault
2. ShowingHQ
3. ClientKeep
4. FarmTrackr
5. TaskPilot
6. MarketPilot
7. SellerPulse
8. Insight

Each module has its own:

- Overview Dashboard
- Sidebar Navigation
- Data Models
- Feature Set
- Settings

---

# Module Navigation Order

The modules should appear in this order in the **top navigation bar**:

1. PropertyVault
2. ShowingHQ
3. ClientKeep
4. FarmTrackr
5. TaskPilot
6. MarketPilot
7. SellerPulse
8. Insight

---

# Module Definitions

## PropertyVault

**Purpose:** Central database of all property records.

### Sidebar

- Overview
- All Properties
- Active Listings
- Pending
- Sold
- Archived
- Property Documents
- Photos & Media
- Open Houses
- Showings
- Property Activity
- Settings

### Core Responsibilities

- Property records
- Listing status tracking
- Property documents
- Media library
- Property activity timeline
- Associations with showings and open houses

---

## ShowingHQ

**Purpose:** Manage showing activity and feedback.

### Sidebar

- Overview
- Showing Requests
- Scheduled Showings
- Feedback
- Buyer Agents
- Buyers
- Activity
- Notes
- Templates
- Settings

### Core Responsibilities

- Showing scheduling
- Showing request management
- Feedback collection
- Buyer agent tracking
- Showing history

---

## ClientKeep

**Purpose:** Customer relationship management.

### Sidebar

- Overview
- All Contacts
- Leads
- Clients
- Buyer Agents
- Sellers
- Tags
- Communication Log
- Follow-ups
- Pipelines
- Settings

### Core Responsibilities

- Contact database
- Lead tracking
- Relationship status
- Communication history
- Follow-up reminders

---

## FarmTrackr

**Purpose:** Geographic farming intelligence and territory management.

### Sidebar

- Overview
- Farm Areas
- Territory Map
- Lead Generation
- Market Watch
- Activity
- Reports
- Settings

### Core Responsibilities

- Geographic farm area definition
- Territory tracking
- Lead generation from farm areas
- Market activity monitoring
- Farming intelligence reports

---

## TaskPilot

**Purpose:** Operational task and workflow management.

### Sidebar

- Overview
- My Tasks
- Team Tasks
- Calendar
- Workflows
- Automations
- Due Today
- Overdue
- Completed
- Templates
- Settings

### Core Responsibilities

- Task management
- Workflow automation
- Listing preparation tasks
- Transaction timelines
- Internal operations

---

## MarketPilot

**Purpose:** Marketing campaign management.

### Sidebar

- Overview
- Campaigns
- Email
- Social
- Print
- Open House Promotion
- Listing Promotion
- Templates
- Content Calendar
- Assets
- Settings

### Core Responsibilities

- Marketing campaigns
- Email marketing
- Social media planning
- Content scheduling
- Asset management

---

## SellerPulse

**Purpose:** Seller-facing listing activity reports.

### Sidebar

- Overview
- Seller Reports
- Listing Activity
- Showings Summary
- Open House Summary
- Feedback Trends
- Communication Updates
- Report Templates
- Shared Reports
- Settings

### Core Responsibilities

- Seller reporting
- Listing activity tracking
- Showing feedback aggregation
- Report generation

---

## Insight

**Purpose:** Platform analytics and business intelligence.

### Sidebar

- Overview
- Performance Dashboard
- Lead Analytics
- Showing Analytics
- Open House Analytics
- Property Analytics
- Campaign Analytics
- Conversion Reports
- Custom Reports
- Exports
- Settings

### Core Responsibilities

- KPI dashboards
- Conversion tracking
- Business analytics
- Custom reporting
- Data export

---

# Module Page Pattern

Each module should follow a consistent structure:

1. Overview (dashboard)
2. Core Objects / Records
3. Activity or Reports
4. Templates / Automations
5. Settings

This keeps the UI consistent across modules.

---

# Data Relationships

KeyPilot modules share interconnected data.

**Examples:**

- **PropertyVault** → Properties
- **ShowingHQ** → Showings connected to properties
- **ClientKeep** → Contacts connected to showings or listings
- **TaskPilot** → Tasks connected to properties or contacts
- **MarketPilot** → Campaigns connected to listings
- **SellerPulse** → Reports generated from property and showing data
- **FarmTrackr** → Farming intelligence, territories
- **Insight** → Analytics across all modules

---

# Platform Dashboard

The platform should include a **global dashboard** showing high-level metrics from each module.

**Example widgets:**

- Properties Active
- Upcoming Showings
- Pending Feedback
- Leads Added
- Tasks Due Today
- Active Campaigns
- Seller Reports Pending

Each widget links to the relevant module.

---

# Navigation Principles

1. **Top navigation selects modules**
2. **Sidebar navigation shows module tools**
3. **Breadcrumbs indicate context**

**Example:**

`PropertyVault > Active Listings > 479 Desert Holly Dr`

---

# Future Expansion

The architecture is designed to support future modules such as:

- FarmTrackr (farming intelligence)
- FarmTrackr (geographic farming intelligence)
- Transactions
- Vendor Management
- Automation Engine
- Document Management
- Client Portal
- AI Assistant

The navigation model supports adding modules without redesigning the UI.

---

# Design Guidelines

## Top Navigation

- Module tabs
- Active module highlighted
- Consistent spacing
- Optional icons

## Sidebar

- Module title
- Clear hierarchy
- Minimal nesting
- Consistent item ordering

## Main Workspace

- Header with page title
- Actions on the right
- Content below

---

# Branding

**Platform Name:** KeyPilot

**Modules:**

- PropertyVault
- ShowingHQ
- ClientKeep
- FarmTrackr
- TaskPilot
- MarketPilot
- SellerPulse
- Insight

**Tagline:**

**The Real Estate Operations Platform**
