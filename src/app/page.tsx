'use client';

import React, { useState } from 'react';
import { Container, Typography, Box, Tabs, Tab, Button, Dialog } from '@mui/material';
import { FileUploader } from '../components/FileUploader';
import { ActivityStats } from '../components/ActivityStats';
import { ActivityList } from '../components/ActivityList';
import { ActivityCharts } from '../components/ActivityCharts';
import { ActivityDetail } from '../components/ActivityDetail';
import { RecommendationList } from '../components/RecommendationList';
import { AdvancedCharts } from '../components/AdvancedCharts';
import { processCSV, calculateActivityStats } from '../utils/csvProcessor';
import { generateRecommendations } from '../ml/recommendationEngine';
import { UserActivity, MLRecommendation } from '../types/UserActivityType';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Home() {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<MLRecommendation[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [selectedActivity, setSelectedActivity] = useState<UserActivity | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  
  const handleActivitySelect = (activity: UserActivity) => {
    setSelectedActivity(activity);
    setDetailOpen(true);
  };

  const handleDetailClose = () => {
    setDetailOpen(false);
  };

  const handleFileUpload = async (file: File) => {
    try {
      const text = await file.text();
      const processedActivities = processCSV(text);
      setActivities(processedActivities);
      setStats(calculateActivityStats(processedActivities));
      setRecommendations(generateRecommendations(processedActivities));
      
      // Log the first few activities for debugging
      if (processedActivities.length > 0) {
        console.log('First activity:', processedActivities[0]);
        console.log('Status values:', [...new Set(processedActivities.map(a => a.status))]);
      }
    } catch (error) {
      console.error('Error processing file:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          ShadowSight Dashboard
        </Typography>
        
        <FileUploader onFileUpload={handleFileUpload} />
        
        {stats && (
          <Box sx={{ mt: 4 }}>
            <ActivityStats stats={stats} />
          </Box>
        )}
        
        {activities.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab label="Activity List" />
                <Tab label="Charts" />
                <Tab label="Advanced Analytics" />
                <Tab label="Recommendations" />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <ActivityList 
                activities={activities} 
                onActivitySelect={handleActivitySelect}
              />
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <ActivityCharts stats={stats} />
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <AdvancedCharts activities={activities} stats={stats} />
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <RecommendationList recommendations={recommendations} />
            </TabPanel>
          </Box>
        )}
        
        {/* Activity Detail Dialog */}
        <Dialog
          open={detailOpen}
          onClose={handleDetailClose}
          maxWidth="md"
          fullWidth
        >
          {selectedActivity && <ActivityDetail activity={selectedActivity} />}
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={handleDetailClose} variant="contained">
              Close
            </Button>
          </Box>
        </Dialog>
      </Box>
    </Container>
  );
} 