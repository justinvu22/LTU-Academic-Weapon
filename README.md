# **🔍 ShadowSight Security Analytics Dashboard**

**LTU Academic Weapon** - A comprehensive AI-powered security analytics platform built with Next.js that processes user activity data client-side to identify potential security risks and data leakage.

## **📊 Project Overview**

ShadowSight is an enterprise-grade security analytics dashboard that visualizes user activity data to help identify potential security risks and data leakage. The system processes CSV data client-side, provides interactive visualizations, and offers machine learning-driven recommendations with real-time alert management.

## **🏗️ Architecture & Tech Stack**

### **Core Technologies**
- **Frontend**: Next.js 14.2.28, React 18, TypeScript 5.8.3
- **UI Framework**: Material UI + Tailwind CSS
- **Charts**: Recharts for data visualization
- **ML Engine**: TensorFlow.js for client-side machine learning
- **Data Processing**: PapaParse for CSV parsing
- **Storage**: IndexedDB for client-side data persistence
- **Export**: jsPDF + html2canvas for PDF generation

### **Build Status**: ✅ **Successful** (No compilation errors)

## **📁 Project Structure**

```
LTU-Academic-Weapon/
├── app/                          # Next.js application routes
│   ├── page.tsx                  # Home dashboard with activity statistics
│   ├── upload/                   # CSV file processing and data ingestion
│   ├── dashboard/                # Main analytics dashboard
│   ├── ml/                       # Machine learning insights and recommendations
│   ├── alerts/                   # Security alert management
│   ├── custom-alerts/            # Alert configuration
│   ├── trusted-activities/       # Allowlist management
│   ├── profile/settings/         # User configuration
│   └── api/                      # API routes
├── components/                   # Reusable React components
│   ├── ImmediateReview.tsx       # ML-detected security alert review system
│   ├── UserReviewModal.tsx       # User activity review interface
│   ├── AlertDetailsModal.tsx     # Detailed alert management
│   ├── AdvancedCharts.tsx        # Data visualization components
│   ├── ActivityCharts.tsx        # Activity trend visualizations
│   └── ActivityList.tsx          # Tabular activity display
├── utils/                        # Core logic and utilities
│   ├── storage.ts                # IndexedDB data persistence with versioning
│   ├── alertsManager.ts          # ML alert lifecycle management
│   ├── csvValidator.ts           # Data validation and field mapping
│   ├── csvParser.ts              # CSV processing and normalization
│   ├── dataProcessor.ts          # Statistical analysis and insights
│   ├── threatLearner.ts          # ML threat detection algorithms
│   ├── adaptiveConfig.ts         # Dynamic configuration management
│   ├── schemaAdapter.ts          # Flexible data schema handling
│   └── ml/                       # Machine Learning Engine
│       ├── userClustering.ts     # User behavior clustering
│       ├── sequencePatterns.ts   # Activity sequence analysis
│       ├── anomalyDetection.ts   # Statistical anomaly detection
│       └── heatmapAnalysis.ts    # Temporal pattern analysis
├── types/                        # TypeScript type definitions
│   └── activity.ts               # Core data models and interfaces
├── constants/                    # Application constants
├── hooks/                        # Custom React hooks
├── public/                       # Static assets
└── ml/                          # ML models and recommendation engine
```

## **🎯 Key Features Implemented**

### **✅ Data Processing Pipeline**
- **CSV Upload & Validation** - Automatic field mapping and validation
- **Large Dataset Optimization** - Handles 5MB+ files with 16,000+ activities
- **Chunked Processing** - Prevents UI freezing during analysis
- **IndexedDB Storage** - Client-side persistence with version tracking
- **Data Version Management** - Consistency tracking across components

### **✅ Machine Learning Capabilities**
- **Real-time Analysis** - Client-side ML processing with TensorFlow.js
- **Multi-dimensional Detection**:
  - Data exfiltration patterns
  - Unusual timing behaviors
  - Policy breach detection
  - Access violations
  - Bulk operations
  - High-risk sequences
  - User behavior clustering
  - Sequence pattern analysis
- **Confidence Scoring** - ML recommendation reliability metrics
- **Adaptive Learning** - Dynamic configuration based on data patterns

### **✅ Alert Management System**
- **AlertsManager Class** - Centralized alert lifecycle management
- **ML Alert Generation** - Automatic alert creation from ML insights
- **Status Tracking** - Pending → Reviewing → Resolved/Dismissed
- **Manager Actions** - Assignment and resolution workflows
- **Real-time Updates** - Event-driven component synchronization
- **ImmediateReview Component** - Real-time alert management interface

### **✅ Data Consistency & Storage**
- **Version Tracking** - Data versioning with timestamps
- **Automatic ML Data Clearing** - Prevents stale recommendations
- **Multiple Storage Scenarios** - New uploads, appends, recovery modes
- **Cache Invalidation** - ML recommendation cache management
- **Cross-component Synchronization** - Consistent data flow
- **Helper Functions** - Version checking utilities

### **✅ User Interface**
- **Dark Theme** - Modern security-focused design
- **Interactive Visualizations** - Charts, heatmaps, trend analysis
- **Responsive Design** - Desktop compatibility
- **Loading States** - Progress indicators for long operations
- **Error Boundaries** - Graceful error handling
- **Material UI Integration** - Professional component library

### **✅ Dashboard & Analytics**
- **Statistics Overview** - Total activities, high-risk activities, policy breaches
- **Risk Distribution Charts** - Visual risk assessment
- **Activity Timeline Trends** - Temporal pattern visualization
- **User Behavior Analytics** - Individual user risk profiles
- **Policy Breach Breakdowns** - Detailed violation analysis
- **Integration Usage Patterns** - System usage insights

## **🔧 Recent Enhancements**

### **Data Version Tracking System** *(Latest)*
- Timestamp-based version management in storage.ts
- Automatic ML data clearing on new uploads
- Cross-component consistency checks with helper functions
- Comprehensive storage scenario coverage (new, append, recovery)

### **ML Alert Integration**
- **ImmediateReview Component** - Real-time alert management interface
- **ML Page Integration** - Automatic alert generation from insights
- **Upload Handler Updates** - Clear old data before new processing
- **Navigation Flow** - Redirect to ML page after uploads

### **Storage Optimization**
- **Comprehensive Database Clearing** - Handles all legacy database names
- **Error Recovery** - Fallback strategies for storage failures
- **Performance Optimization** - Chunked storage for large datasets
- **IndexedDB Version Management** - Schema updates and migrations

### **Large Dataset Optimization** *(May 2023)*
- Optimized CSV parser for 5MB+ files with 16,000+ activities
- Implemented chunked processing to prevent UI freezing
- Added intelligent sampling for ML processing
- Enhanced error handling for date/time parsing

### **UI Improvements**
- Simplified activity list with better column organization
- Improved policy breach visualization with error handling
- Added automatic time detection from multiple data formats
- Enhanced loading states and progress indicators

## **🚀 Getting Started**

### **Prerequisites**
- Node.js 18+ 
- npm or yarn package manager

### **Installation**

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd LTU-Academic-Weapon
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open the application**: Visit [http://localhost:3000](http://localhost:3000)

5. **Upload CSV data**: Navigate to the Upload page to process your activity data.

### **Build for Production**
```bash
npm run build
npm start
```

## **📋 Usage Workflow**

### **Step 1: Data Upload**
- Navigate to `/upload`
- Upload ShadowSight-generated CSV files
- Automatic validation and field mapping
- Data stored in IndexedDB with version tracking

### **Step 2: Dashboard Analytics**
- View activity statistics on home page
- Navigate to `/dashboard` for detailed analysis
- Interactive filtering by date, users, risk levels
- Export reports to PDF

### **Step 3: ML Insights**
- Navigate to `/ml` for AI-powered recommendations
- Automatic alert generation from ML insights
- Review high-confidence threat detections
- Real-time processing of security patterns

### **Step 4: Alert Management**
- Navigate to `/alerts` for security alert review
- Use ImmediateReview component for real-time alerts
- Assign alerts to managers
- Track resolution status and actions

## **🔍 ML Detection Capabilities**

The system's machine learning engine detects:

- **Data Exfiltration**: Unusual file access patterns and bulk downloads
- **Suspicious Timing**: Activities outside normal business hours
- **Policy Breaches**: Automated policy violation detection
- **Access Violations**: Unauthorized system access attempts
- **Bulk Operations**: Mass file operations that may indicate data theft
- **High-Risk Sequences**: Patterns of activities that together indicate threats
- **User Clustering**: Identification of users with similar risk profiles
- **Anomaly Detection**: Statistical outliers in user behavior

## **📊 Current State Summary**

### **✅ Strengths**
1. **Comprehensive ML Engine** - Advanced client-side threat detection
2. **Robust Data Pipeline** - Handles large datasets efficiently
3. **Modern Architecture** - Clean separation of concerns with TypeScript
4. **Real-time Processing** - No backend dependencies required
5. **Data Consistency** - Version tracking and cache management
6. **Enterprise Features** - Alert management, audit trails, reporting

### **🔄 Active Systems**
- **Alert Management** - Full lifecycle from detection to resolution
- **ML Processing** - Real-time insights generation with TensorFlow.js
- **Data Storage** - Version-tracked IndexedDB persistence
- **Component Synchronization** - Event-driven updates across UI

### **🎯 Production Ready**
- ✅ Build successful with no compilation errors
- ✅ Complete feature set implemented
- ✅ Data consistency mechanisms in place
- ✅ Error handling and recovery systems
- ✅ Modern UI/UX implementation
- ✅ TypeScript type safety throughout

## **🛠️ Development**

### **Adding New Features**
1. Create components in `components/` directory
2. Add routes in `app/` directory
3. Define types in `types/` directory
4. Enhance ML capabilities in `utils/ml/` directory

### **Updating Data Processing**
- Modify CSV processing in `utils/csvParser.ts`
- Update ML algorithms in `utils/ml/` components
- Enhance storage logic in `utils/storage.ts`
- Update alert management in `utils/alertsManager.ts`

### **Code Quality**
- Full TypeScript implementation
- ESLint configuration for code quality
- Comprehensive error handling
- Performance optimizations for large datasets

## **📞 Support**

For questions, issues, or feature requests, please contact the ShadowSight development team.

## **📄 License**

This project is proprietary and confidential.

---

**ShadowSight Security Analytics Dashboard** - Empowering organizations with AI-driven security insights through advanced client-side analytics.
