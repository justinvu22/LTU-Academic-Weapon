# Functions Integration with UIUX

This document explains how the external `src/functions` folder is integrated with the UIUX project.

## Overview

The UIUX project has been enhanced with advanced analytics functionality from the external Functions project. This integration allows the dashboard to display sophisticated charts and analytics visualizations.

## Integration Architecture

```
UIUX Project
├── src/
│   └── functions/
│       └── analytics/
│           └── integrations.ts  <-- Integration layer
├── app/
│   └── dashboard/
│       └── DashboardPage.tsx    <-- Uses integration layer
```

## How It Works

1. **Integration Layer (`UIUX/src/functions/analytics/integrations.ts`)**:
   - Provides wrapper functions that access the external Functions project
   - Currently uses mock data, but can be updated to use the actual Functions implementation
   - Serves as a bridge between the UIUX and Functions codebases

2. **Dashboard (`UIUX/app/dashboard/DashboardPage.tsx`)**:
   - Uses the integration layer to fetch data
   - Displays the data in various charts and visualizations
   - Includes three tabs:
     - Overview: Basic dashboard with summary metrics
     - Advanced Analytics: Charts from the Functions project
     - User Activity: User activity analysis from the Functions project

## Implemented Visualizations

The following visualizations have been integrated from the Functions project:

- **Risk Distribution**: Pie chart showing risk levels across activities
- **Policy Breach Distribution**: Pie chart showing types of policy breaches
- **Activity Timeline**: Line chart showing activity trends over time
- **User Activity by Day**: Stacked bar chart showing user activity patterns

## Future Integration Steps

To fully integrate with the external Functions project:

1. Update the integration layer to import and use actual code from the external Functions project:
   ```typescript
   import { processCSV } from '../../../../src/utils/csvProcessor';
   import { generateRecommendations } from '../../../../src/ml/recommendationEngine';
   ```

2. Implement file upload functionality to process CSV data:
   ```typescript
   import { CSVUploader } from '../../../../src/components/CSVUploader';
   ```

3. Add state management for user activities and analytics data:
   ```typescript
   import { useStore } from '../../../../src/store/useStore';
   ```

## Adding New Functionality

To add new analytics features from the Functions project:

1. Add new functions to the integration layer
2. Import and use these functions in the DashboardPage
3. Create new visualizations based on the data

## Dependency Management

The following dependencies are required for the integration:

- recharts
- jspdf
- html2canvas
- tailwindcss

Make sure these are installed in the UIUX project for the integration to work correctly. 