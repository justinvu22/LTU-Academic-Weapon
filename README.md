# ShadowSight Dashboard Documentation

## Project Overview
ShadowSight Dashboard is a comprehensive TypeScript-based web application built with Next.js for monitoring and analyzing user activities for security risks. The dashboard allows security teams to upload CSV data of user activities, analyze risk patterns, visualize security metrics, and receive ML-powered recommendations.

## Features
1. **CSV Data Upload**: Upload and process CSV files containing user activity data
2. **Activity Visualization**: Multiple chart types to visualize activity data and risk patterns
3. **Risk Analysis**: Detailed analysis of risk scores, breach categories, and policy violations
4. **ML-powered Recommendations**: TensorFlow.js based recommendation engine for security insights
5. **Activity Details**: Detailed view of individual activities with full context
6. **Advanced Analytics**: Complex visualizations and pattern recognition for deeper insights

## Tech Stack
- **Framework**: Next.js with TypeScript
- **UI Components**: Material UI (MUI) and Headless UI
- **Data Visualization**: Chart.js, Recharts, D3.js
- **CSV Processing**: PapaParser
- **File Handling**: React-Dropzone
- **Machine Learning**: TensorFlow.js
- **State Management**: Zustand
- **Animation**: Framer Motion
- **Date Handling**: date-fns

## Architecture

### Directory Structure
- `src/components`: UI components
- `src/app`: App pages and layouts
- `src/ml`: Machine learning models and recommendation engine
- `src/utils`: Utility functions
- `src/types`: TypeScript type definitions
- `src/store`: State management

### Core Components
1. **FileUploader/CSVUploader**: Components for uploading CSV activity data
2. **ActivityStats**: Displays summary statistics of activities
3. **ActivityList**: Lists all activities with filtering and sorting
4. **ActivityCharts**: Visualizes activity data through multiple chart types
5. **ActivityDetail**: Shows detailed view of an individual activity
6. **RecommendationList**: Displays ML-generated security recommendations
7. **AdvancedCharts**: Complex visualizations for deeper analysis

### Data Flow
1. User uploads CSV via CSVUploader component
2. CSV data is processed by csvProcessor utility
3. Activities are stored in application state (Zustand)
4. Activity statistics are calculated
5. ML model generates recommendations
6. UI components render data visualizations and lists

## Data Model

### Key Types

#### UserActivity
Represents a single security-relevant user activity with:
- User identification
- Date and time
- Risk score
- Integration type (email, cloud, USB, application)
- Policies breached
- Activity values (destinations, cloud provider, device, etc.)
- Status

#### PolicyBreach
Contains breach categories:
- Data leakage
- PII (Personally Identifiable Information)
- PHI (Protected Health Information)
- PCI (Payment Card Information)
- Financial data
- Sensitive information
- User at risk indicators
- Fraud indicators

#### MLRecommendation
Machine learning generated recommendations with:
- Title and description
- Severity level
- Confidence score
- Affected users
- Suggested actions

## ML Recommendation Engine

The recommendation engine uses TensorFlow.js to:
1. Extract features from user activities
2. Identify risk patterns
3. Calculate confidence scores
4. Generate actionable recommendations

Risk patterns detected include:
- High risk scores
- Multiple breach categories
- Activities during unusual hours
- Handling of sensitive data

## Current Implementation Status

The project has implemented:
- Complete data model and type definitions
- CSV upload and processing functionality
- Basic dashboard UI
- Activity visualization charts
- Recommendation engine with TensorFlow integration
- Activity details view
- Risk analysis metrics

## Getting Started

### For Team need to pull the code from master branch
```bash

git fetch origin

# and then 

git pull
```

### Prerequisites
- Node.js (version specified in package.json)
- npm or yarn

### Installation
```bash
npm install
# or
yarn install
```

### Development
```bash
npm run dev
# or
yarn dev
```

### Build
```bash
npm run build
# or
yarn build
```

### Testing
```bash
npm run test
# or
yarn test
```

## Future Enhancements
- Enhanced ML model training with user feedback
- Real-time activity monitoring
- Integration with security information and event management (SIEM) systems
- Customizable alerting and notification system
- User behavior baseline analysis
- Automated response workflows 
