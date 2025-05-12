import { generateRecommendations } from './recommendationEngine';
import { UserActivity } from '../types/UserActivityType';

describe('Recommendation Engine', () => {
  describe('generateRecommendations', () => {
    it('should generate recommendations with varied confidence levels', () => {
      // Create sample activities for testing
      const sampleActivities: UserActivity[] = [
        // High risk user with multiple issues
        {
          activityId: 'activity1',
          user: 'high.risk.user@zenith.com',
          date: '01/01/2023',
          time: '22:30',
          riskScore: 2500,
          integration: 'si-email',
          policiesBreached: {
            dataLeakage: ['emailContainedDocuments'],
            pii: ['emailContainedPII'],
            phi: ['emailContainedPHI'],
          },
          values: {
            destinations: ['external@example.com'],
          },
          status: 'concern',
        },
        {
          activityId: 'activity2',
          user: 'high.risk.user@zenith.com',
          date: '02/01/2023',
          time: '23:15',
          riskScore: 2200,
          integration: 'si-email',
          policiesBreached: {
            dataLeakage: ['emailContainedDocuments'],
            pii: ['emailContainedPII'],
          },
          values: {
            destinations: ['another@example.com'],
          },
          status: 'concern',
        },
        
        // Medium risk user
        {
          activityId: 'activity3',
          user: 'medium.risk.user@zenith.com',
          date: '01/01/2023',
          time: '15:30',
          riskScore: 1600,
          integration: 'si-cloud',
          policiesBreached: {
            dataLeakage: ['cloudUploadContainedDocuments'],
          },
          values: {
            cloudProvider: 'Dropbox',
          },
          status: 'underReview',
        },
        
        // Low risk user
        {
          activityId: 'activity4',
          user: 'low.risk.user@zenith.com',
          date: '01/01/2023',
          time: '10:30',
          riskScore: 800,
          integration: 'si-email',
          policiesBreached: {
            dataLeakage: ['emailContainedDocuments'],
          },
          values: {
            destinations: ['colleague@zenith.com'],
          },
          status: 'trusted',
        },
      ];

      // Generate recommendations
      const recommendations = generateRecommendations(sampleActivities);
      
      // Verify recommendations were generated
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Check if we have varied confidence levels
      const confidenceScores = recommendations.map(r => r.confidence);
      const uniqueConfidenceScores = new Set(confidenceScores);
      
      // We should have more than one unique confidence score
      expect(uniqueConfidenceScores.size).toBeGreaterThan(1);
      
      // Verify high risk user has higher confidence recommendation
      const highRiskRecs = recommendations.filter(
        r => r.affectedUsers.includes('high.risk.user@zenith.com')
      );
      
      if (highRiskRecs.length > 0) {
        expect(highRiskRecs[0].confidence).toBeGreaterThan(0.8);
      }
      
      // Verify recommendations are sorted by confidence (highest first)
      let previousConfidence = 1.0;
      for (const rec of recommendations) {
        expect(rec.confidence).toBeLessThanOrEqual(previousConfidence);
        previousConfidence = rec.confidence;
      }
    });
  });
}); 