# Viking Manufacturing Assembly System - Standard Work Document

## Overview
The Viking Manufacturing Assembly System is a comprehensive shop floor management tool that helps track assembly cards (work orders) through different manufacturing phases and workstations. The system provides three main views for different user roles and workflow management needs.

## System Access

### Login Process
1. Navigate to the Viking Manufacturing Assembly System
2. Enter your authorized email address (@vikingeng.com or @stonetreeinvest.com domains only)
3. Enter your password
4. Click "Sign In"

**Default Admin Credentials for Testing:**
- Email: david.brown@stonetreeinvest.com
- Password: admin123

## Main System Views

### 1. Material Handler View
**Purpose:** This view is designed for material handlers to manage the flow of assembly cards through different workflow phases.

**Key Features:**
- **Phase-based Organization:** Assembly cards are organized by workflow phases (Planning, Fabrication, Assembly, Testing, Delivery)
- **Drag & Drop Functionality:** Cards can be moved between phases by dragging and dropping
- **Color-coded Status Indicators:**
  - Orange: Phase 1 work
  - Blue: Electrical work (Type E cards)
  - Purple "P": Cards delivered to paint
  - Green "P": Cards in picking status
- **Card Information Display:** Each card shows priority, type, customer, and current status

**How to Use:**
1. Select "Material Handler View" from the main navigation
2. View assembly cards organized by workflow phases
3. To move a card to a different phase:
   - Click and drag the assembly card
   - Drop it into the desired phase column
   - The system automatically updates the card status
4. Monitor card progress through visual status indicators
5. Use the search and filter options to find specific cards

### 2. Schedule View (Gantt Chart)
**Purpose:** Provides a timeline-based view of all assembly work for production scheduling and resource planning.

**Key Features:**
- **Timeline Visualization:** Shows assembly cards plotted against time
- **Resource Allocation:** Displays which assemblers are assigned to which cards
- **Dependency Management:** Shows relationships between assembly cards
- **Progress Tracking:** Visual indication of completion status
- **Multi-week Planning:** Extended timeline for long-term scheduling

**How to Use:**
1. Select "Schedule View" from the main navigation
2. View the Gantt chart showing all active assembly cards
3. Timeline shows:
   - Start and end dates for each assembly card
   - Current progress status
   - Resource assignments
   - Dependencies between cards
4. Use the timeline controls to navigate different time periods
5. Identify scheduling conflicts and resource bottlenecks
6. Plan ahead for upcoming work requirements

### 3. Build Bay Map
**Purpose:** Visual representation of the shop floor layout showing assembler stations and current work assignments.

**Key Features:**
- **Floor Plan Layout:** Visual map of the manufacturing floor
- **Assembler Stations:** Shows all workstations/machines with their current status
- **Real-time Assignment:** Displays which assembly cards are currently assigned to each station
- **Station Types:** Different assembler types (Mechanical, Electrical, Final Assembly, Quality Control)
- **Capacity Management:** Visual indication of station availability

**How to Use:**
1. Select "Build Bay Map" from the main navigation
2. View the visual layout of the manufacturing floor
3. See at a glance:
   - Which stations are currently occupied
   - What work is being performed at each station
   - Available capacity for new work
4. Assign work to specific stations by:
   - Dragging assembly cards to available assembler stations
   - Confirming the assignment
5. Monitor overall floor utilization and workflow

## Assembly Card Management

### Creating New Assembly Cards
1. Click the "Create Assembly Card" button (+ icon)
2. Fill in required information:
   - **Priority:** Set the urgency level (Low, Medium, High, Critical)
   - **Type:** Select card type (M-Mechanical, E-Electrical, S-Sub Assembly, P-Pre-Assembly)
   - **Customer:** Enter customer name
   - **Phase:** Select current workflow phase
   - **Duration:** Estimated completion time
   - **Description:** Detailed work instructions
3. Set dependencies if the card relies on other work being completed first
4. Assign to an assembler if immediate assignment is needed
5. Click "Create" to add the card to the system

### Editing Assembly Cards
1. Click on any assembly card to open the details
2. Click the "Edit" button
3. Modify any fields as needed
4. Update status, priority, or assignments
5. Save changes

### Managing Dependencies
- Dependencies ensure work is completed in the correct order
- Cards with unmet dependencies will show visual indicators
- The system prevents starting work on cards with incomplete dependencies
- Use the Schedule View to visualize dependency chains

## User Role Permissions

### Admin Users
- Full access to all views and functions
- Can create, edit, and delete assembly cards
- User management capabilities
- System configuration access

### Production Supervisors
- Access to all three main views
- Can create and edit assembly cards
- Can assign work to assemblers
- Cannot access user management

### Material Handlers
- Primary access to Material Handler View
- Can move cards between workflow phases
- Limited editing capabilities
- Focus on workflow management

### Schedulers
- Primary access to Schedule View and Build Bay Map
- Can assign work to assemblers
- Timeline and resource planning focus
- Limited workflow phase management

### Assemblers
- View-only access to their assigned work
- Can update work progress and status
- Cannot reassign or create new cards

## Key System Concepts

### Assembly Card Types
- **M (Mechanical):** Standard mechanical assembly work
- **E (Electrical):** Electrical systems and wiring work
- **S (Sub Assembly):** Component sub-assemblies
- **P (Pre-Assembly):** Preparatory work before main assembly

### Workflow Phases
1. **Planning:** Initial planning and material preparation
2. **Fabrication:** Parts manufacturing and preparation
3. **Assembly:** Main assembly work
4. **Testing:** Quality control and testing
5. **Delivery:** Final delivery preparation

### Status Indicators
- **Picking:** Material gathering phase (Green "P")
- **Assembling:** Active assembly work
- **Delivered to Paint:** Sent for painting/finishing (Purple "P")
- **Testing:** Quality control phase
- **Complete:** Finished and ready for delivery

## Best Practices

### For Material Handlers
1. Regularly review cards in Planning phase for material readiness
2. Move cards promptly when phase work is completed
3. Monitor for bottlenecks in any particular phase
4. Coordinate with assemblers on material availability

### For Schedulers
1. Use the Gantt chart to identify resource conflicts
2. Plan work assignments considering assembler capabilities
3. Monitor dependency chains to prevent delays
4. Balance workload across available assemblers

### For Production Supervisors
1. Review all three views daily for complete situational awareness
2. Address priority conflicts and resource shortages
3. Ensure proper work sequencing through dependency management
4. Monitor overall system throughput and efficiency

## Troubleshooting

### Common Issues
- **Cards not moving:** Check for unmet dependencies
- **Login problems:** Verify email domain is authorized
- **Assignment conflicts:** Use Build Bay Map to check resource availability
- **Timeline issues:** Review dependencies in Schedule View

### System Maintenance
- Regular review of completed cards for archiving
- Periodic cleanup of old or cancelled work orders
- User access review for personnel changes
- Backup and system health monitoring

## Contact Information
For technical support or system issues, contact the system administrator or IT support team.

---
*This document serves as a quick reference guide for Viking Manufacturing Assembly System users. For detailed training or advanced features, please consult with your supervisor or system administrator.*