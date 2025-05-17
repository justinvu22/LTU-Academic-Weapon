# ShadowSight Security Analytics Dashboard

ShadowSight is an AI-powered security analytics dashboard that visualizes user activity data to help identify potential security risks and data leakage. The system processes CSV data client-side, provides interactive visualizations, and offers machine learning-driven recommendations.

## Key Features

- **CSV File Ingestion**: Upload and process ShadowSight-generated CSV files with user activity data
- **Interactive Visualizations**: View activity trends through various chart types (line, bar, pie, heatmaps)
- **Machine Learning Insights**: Receive AI-driven recommendations to mitigate security risks
- **Real-time Client-side Processing**: All operations performed in-browser without a backend
- **Interactive Filtering**: Analyze specific time periods and user behaviors
- **Risk Assessment**: Identify high-risk activities and policy breaches
- **Detailed Dashboard**: Monitor trends, statistics, and anomalies

## Technology Stack

- **Frontend**: Next.js, React, TypeScript
- **UI Components**: Material UI, Tailwind CSS
- **Charts**: Recharts
- **Machine Learning**: TensorFlow.js
- **CSV Processing**: PapaParse
- **PDF Export**: jsPDF, html2canvas

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Open the application**: Visit [http://localhost:3000](http://localhost:3000)

4. **Upload CSV data**: Navigate to the Upload page to process your activity data.

## Project Structure

```
LTU-Academic-Weapon/
├── app/                   # Next.js application routes
│   ├── alerts/            # Alerts dashboard
│   ├── custom-alerts/     # Custom alerts configuration
│   ├── dashboard/         # Main dashboard
│   ├── trusted-activities/# Trusted activities management
│   ├── upload/            # CSV data upload
│   └── page.tsx           # Home page
├── components/            # Reusable React components
│   ├── ActivityCharts.tsx # Activity visualization charts
│   ├── ActivityList.tsx   # Activity data table
│   └── AdvancedCharts.tsx # Advanced visualization components
├── ml/                    # Machine learning models
│   └── recommendationEngine.ts # ML-based recommendation system
├── constants/             # Application constants
├── src/
│   ├── contexts/          # React context providers
│   └── functions/         # Utility functions
├── types/                 # TypeScript type definitions
├── public/                # Static assets
└── UI_components/         # UI component library
```

## Features & Functionality

### CSV Data Processing

Upload CSV files containing user activity data. The system processes the data client-side and provides:

- Activity statistics and metrics
- Risk score analysis
- Policy breach detection
- Temporal pattern analysis

### Dashboard Visualizations

- Risk distribution charts
- Activity timeline trends
- User behavior analytics
- Policy breach breakdowns
- Integration usage patterns

### Machine Learning Capabilities

The ML recommendation engine analyzes patterns in user activities to detect:

- High-risk activity sequences
- Unusual time patterns
- Sensitive data access
- Bulk operations
- Failed access attempts
- Multi-location access
- Data exfiltration risks
- Unusual application usage
- Account sharing
- Cross-user patterns

### Interactive Filtering

Filter data by:
- Date ranges
- Risk levels
- Users
- Integration types
- Activity types
- Policy breach categories

## Development

### Add New Features

1. Create components in the `components/` directory
2. Add routes in the `app/` directory
3. Define types in the `types/` directory
4. Enhance ML capabilities in the `ml/` directory

### Update Data Processing

Modify data processing logic in:
- CSV upload components
- ML recommendation engine
- Activity data context

## Contact

For any questions or support, please contact the ShadowSight team.

## License

This project is proprietary and confidential.

## Recent Updates

### Large Dataset Optimization (May 2023)
- Optimized CSV parser to efficiently handle large files (5MB+) with 16,000+ activities
- Implemented chunked processing to prevent UI freezing during data analysis
- Added intelligent sampling for ML processing of large datasets
- Enhanced error handling for date/time parsing in various formats
- Fixed heatmap visualization for large activity files with improved integration categorization

### UI Improvements
- Simplified activity list by removing unnecessary columns (Activity and Integration)
- Reorganized activity list columns for better information hierarchy
- Improved policy breach visualization with better error handling
- Added automatic time detection from multiple data formats (timestamp, date/time fields, hour)

### Data Processing Enhancements
- Added intelligent field detection to automatically identify user, date, and time columns
- Improved risk score calculation and normalization
- Enhanced policy breach detection and categorization
- Fixed issues with sequence pattern analysis
- Implemented better error boundaries to prevent analysis failures

### Code Quality Improvements
- Fixed TypeScript errors in ML components for better code stability
- Added proper null/undefined checks for timestamps and risk scores
- Improved ESLint configuration for better code quality enforcement
- Added custom logger utility to manage console logs properly

### Feature Enhancements
- Implemented Custom Alerts UI in alerts page
- Added synthetic policy breach generation based on risk scores
- Enhanced time distribution calculation with better hour extraction

### Developer Experience
- Enhanced error handling in data processing components
- Improved documentation throughout the codebase
- Added diagnostic logging for easier troubleshooting
- Optimized memory usage for large dataset processing
