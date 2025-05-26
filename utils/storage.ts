import { UserActivity } from '../types/activity';
import { AlertsManager } from './alertsManager';

/**
 * Check if code is running in browser
 */
const isBrowser = () => typeof window !== 'undefined';

/**
 * Store activities in IndexedDB for larger datasets (up to 10MB)
 * Uses chunked storage for performance optimization
 */
export async function storeActivitiesInIndexedDB(activities: UserActivity[]): Promise<boolean> {
  // Skip if not in browser
  if (!isBrowser()) {
    console.warn('IndexedDB operations can only run in browser');
    return false;
  }

  return new Promise((resolve, reject) => {
    try {
      console.log(`Storing ${activities.length} activities in IndexedDB...`);
      const startTime = performance.now();
      
      // Open IndexedDB
      const request = indexedDB.open('activityDatabase', 3); // Increased version for schema updates
      
      request.onupgradeneeded = (event) => {
        console.log(`Upgrading database to version ${event.newVersion}`);
        const db = request.result;
        
        // Create or update object stores
        if (!db.objectStoreNames.contains('activities')) {
          db.createObjectStore('activities', { keyPath: 'id' });
          console.log('Created activities object store');
        }
        
        // Create a separate store for metadata
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'id' });
          console.log('Created metadata object store');
        }
        
        // Create store for individual activities for direct access
        if (!db.objectStoreNames.contains('individualActivities')) {
          const individualStore = db.createObjectStore('individualActivities', { keyPath: 'id' });
          // Add indexes for common query patterns
          individualStore.createIndex('riskScore', 'riskScore', { unique: false });
          individualStore.createIndex('date', 'date', { unique: false });
          individualStore.createIndex('username', 'username', { unique: false });
          individualStore.createIndex('integration', 'integration', { unique: false });
          console.log('Created individual activities store with indexes');
        }
      };
      
      request.onerror = (event) => {
        console.error('IndexedDB error:', event);
        reject(new Error('Failed to open database'));
      };
      
      request.onsuccess = () => {
        const db = request.result;
        
        // Optimize for large datasets with transaction batching
        storeActivitiesInChunks(db, activities)
          .then(() => {
            const endTime = performance.now();
            console.log(`Storage complete. Took ${(endTime - startTime).toFixed(2)}ms`);
            resolve(true);
          })
          .catch(error => {
            console.error('Error storing activities:', error);
            // Attempt recovery by clearing and trying again with smaller chunks
            attemptRecoveryStorage(db, activities)
              .then(success => resolve(success))
              .catch(recoveryError => reject(recoveryError));
          });
      };
    } catch (error) {
      console.error('Error setting up IndexedDB:', error);
      reject(error);
    }
  });
}

/**
 * Attempt to recover from storage errors by using smaller chunks
 */
async function attemptRecoveryStorage(db: IDBDatabase, activities: UserActivity[]): Promise<boolean> {
  console.log('Attempting recovery storage with smaller chunks...');
  try {
    // Clear existing data
    await clearObjectStore(db, 'activities');
    await clearObjectStore(db, 'metadata');
    await clearObjectStore(db, 'individualActivities');
    
    // Use much smaller chunks for recovery
    const RECOVERY_CHUNK_SIZE = 50;
    const chunks = Math.ceil(activities.length / RECOVERY_CHUNK_SIZE);
    console.log(`Recovery mode: Storing data in ${chunks} small chunks of ${RECOVERY_CHUNK_SIZE} activities each`);
    
    // Store metadata with recovery flag
    await storeMetadata(db, activities.length, true);
    
    // Process in very small batches
    for (let i = 0; i < activities.length; i += RECOVERY_CHUNK_SIZE) {
      const chunk = activities.slice(i, i + RECOVERY_CHUNK_SIZE);
      const chunkNumber = Math.floor(i / RECOVERY_CHUNK_SIZE);
      
      await storeChunk(db, chunk, chunkNumber);
      
      // Log progress
      if (chunkNumber % 5 === 0 || chunkNumber === chunks - 1) {
        console.log(`Recovery storage: Stored chunk ${chunkNumber + 1} of ${chunks} (${Math.min(i + RECOVERY_CHUNK_SIZE, activities.length)} / ${activities.length} activities)`);
      }
      
      // Give UI thread time to breathe
      await sleep(20); // Longer sleep to ensure UI responsiveness
    }
    
    // Set flag in localStorage for quick availability check
    localStorage.setItem('hasStoredActivities', 'true');
    localStorage.setItem('activityCount', activities.length.toString());
    localStorage.setItem('lastStorageTime', Date.now().toString());
    
    // Store data version timestamp for consistency tracking
    const dataVersion = Date.now().toString();
    localStorage.setItem('data_version', dataVersion);
    console.log(`Data version set: ${dataVersion}`);
    
    // Clear old ML data when storing new activities
    AlertsManager.clearAllAlerts();
    localStorage.removeItem('ml_recommendations_cache');
    localStorage.removeItem('ml_last_processed');
    localStorage.removeItem('ml_processing_timestamp');
    console.log('Cleared ML data and recommendations cache');
    
    console.log('Recovery storage completed successfully');
    return true;
  } catch (error) {
    console.error('Recovery storage failed:', error);
    // Last resort - store a subset of data
    return storeSubsetOfActivities(db, activities);
  }
}

/**
 * Last resort storage - store only a subset of the data
 */
async function storeSubsetOfActivities(db: IDBDatabase, activities: UserActivity[]): Promise<boolean> {
  try {
    console.log('Last resort: Attempting to store a subset of activities...');
    // Take at most 100 activities - prioritize high risk ones
    const sortedActivities = [...activities].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));
    const subset = sortedActivities.slice(0, 100);
    
    // Clear existing data
    await clearObjectStore(db, 'activities');
    await clearObjectStore(db, 'metadata');
    await clearObjectStore(db, 'individualActivities');
    
    // Store metadata with recovery flag
    await storeMetadata(db, subset.length, true);
    
    // Store single chunk
    await storeChunk(db, subset, 0);
    
    // Set flag in localStorage
    localStorage.setItem('hasStoredActivities', 'true');
    localStorage.setItem('activityCount', subset.length.toString());
    localStorage.setItem('lastStorageTime', Date.now().toString());
    localStorage.setItem('partialDataStored', 'true');
    
    // Store data version timestamp for consistency tracking
    const dataVersion = Date.now().toString();
    localStorage.setItem('data_version', dataVersion);
    console.log(`Data version set: ${dataVersion}`);
    
    // Clear old ML data when storing new activities
    AlertsManager.clearAllAlerts();
    localStorage.removeItem('ml_recommendations_cache');
    localStorage.removeItem('ml_last_processed');
    localStorage.removeItem('ml_processing_timestamp');
    console.log('Cleared ML data and recommendations cache');
    
    console.log(`Last resort storage: Successfully stored ${subset.length} critical activities`);
    return true;
  } catch (finalError) {
    console.error('All storage attempts failed:', finalError);
    return false;
  }
}

/**
 * Store activities in chunks for better performance with large datasets
 */
async function storeActivitiesInChunks(db: IDBDatabase, activities: UserActivity[]): Promise<void> {
  const OPTIMAL_CHUNK_SIZE = 500; // Optimal chunk size for storage transactions
  
  // Clear existing data
  await clearObjectStore(db, 'activities');
  await clearObjectStore(db, 'metadata');
  
  // Clear individual activities
  await clearObjectStore(db, 'individualActivities');
  
  // Store metadata first
  await storeMetadata(db, activities.length);
  
  // Store activities in chunks
  const chunks = Math.ceil(activities.length / OPTIMAL_CHUNK_SIZE);
  console.log(`Storing data in ${chunks} chunks of ${OPTIMAL_CHUNK_SIZE} activities each`);
  
  // First store in chunks for fast bulk access
  for (let i = 0; i < activities.length; i += OPTIMAL_CHUNK_SIZE) {
    const chunk = activities.slice(i, i + OPTIMAL_CHUNK_SIZE);
    const chunkNumber = Math.floor(i / OPTIMAL_CHUNK_SIZE);
    
    await storeChunk(db, chunk, chunkNumber);
    
    // Log progress
    if (chunkNumber % 5 === 0 || chunkNumber === chunks - 1) {
      console.log(`Stored chunk ${chunkNumber + 1} of ${chunks} (${Math.min(i + OPTIMAL_CHUNK_SIZE, activities.length)} / ${activities.length} activities)`);
    }
    
    // Give UI thread time to breathe
    if (chunks > 5) {
      await sleep(10);
    }
  }
  
  // Now store individual activities for indexed access - do this in a separate transaction
  console.log('Storing individual activities for indexed access...');
  
  // Process in smaller batches for individual storage to avoid transaction limits
  const INDIVIDUAL_BATCH_SIZE = 100;
  const batches = Math.ceil(activities.length / INDIVIDUAL_BATCH_SIZE);
  
  for (let i = 0; i < activities.length; i += INDIVIDUAL_BATCH_SIZE) {
    const batch = activities.slice(i, i + INDIVIDUAL_BATCH_SIZE);
    const batchNumber = Math.floor(i / INDIVIDUAL_BATCH_SIZE);
    
    await storeIndividualActivities(db, batch);
    
    // Log progress
    if (batchNumber % 10 === 0 || batchNumber === batches - 1) {
      console.log(`Stored individual batch ${batchNumber + 1} of ${batches} (${Math.min(i + INDIVIDUAL_BATCH_SIZE, activities.length)} / ${activities.length} activities)`);
    }
    
    // Give UI thread time to breathe
    await sleep(5);
  }
  
  // Set flag in localStorage for quick availability check
  localStorage.setItem('hasStoredActivities', 'true');
  localStorage.setItem('activityCount', activities.length.toString());
  localStorage.setItem('lastStorageTime', Date.now().toString());
  localStorage.removeItem('partialDataStored'); // Clear partial flag if it exists
  
  // Store data version timestamp for consistency tracking
  const dataVersion = Date.now().toString();
  localStorage.setItem('data_version', dataVersion);
  console.log(`Data version set: ${dataVersion}`);
  
  // Clear old ML data when storing new activities
  AlertsManager.clearAllAlerts();
  localStorage.removeItem('ml_recommendations_cache');
  localStorage.removeItem('ml_last_processed');
  localStorage.removeItem('ml_processing_timestamp');
  console.log('Cleared ML data and recommendations cache');
}

/**
 * Store metadata about the current dataset
 */
function storeMetadata(db: IDBDatabase, totalCount: number, isRecoveryMode: boolean = false): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction('metadata', 'readwrite');
      const store = tx.objectStore('metadata');
      
      store.put({
        id: 'dataset_info',
        count: totalCount,
        timestamp: Date.now(),
        chunkSize: 500,
        version: 3,
        isRecoveryMode,
        lastUpdated: new Date().toISOString()
      });
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('Failed to store metadata'));
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Store individual activities for indexed access
 */
function storeIndividualActivities(db: IDBDatabase, activities: UserActivity[]): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction('individualActivities', 'readwrite');
      const store = tx.objectStore('individualActivities');
      
      // Add each activity individually
      activities.forEach(activity => {
        // Ensure the activity has a valid id
        if (!activity.id) {
          activity.id = `activity_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        }
        
        // Store the activity
        store.put(activity);
      });
      
      tx.oncomplete = () => resolve();
      tx.onerror = (event) => {
        console.error('Error in individual activity storage:', event);
        reject(new Error(`Failed to store individual activities: ${event}`));
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Store a chunk of activities
 */
function storeChunk(db: IDBDatabase, activities: UserActivity[], chunkNumber: number): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction('activities', 'readwrite');
      const store = tx.objectStore('activities');
      
      store.put({
        id: `chunk_${chunkNumber}`,
        data: activities,
        timestamp: Date.now()
      });
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error(`Failed to store chunk ${chunkNumber}`));
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Retrieve activities from IndexedDB with optimized loading
 */
export async function getActivitiesFromIndexedDB(): Promise<UserActivity[]> {
  // Skip if not in browser
  if (!isBrowser()) {
    console.warn('IndexedDB operations can only run in browser');
    return [];
  }

  return new Promise((resolve) => {
    try {
      console.log('Retrieving activities from IndexedDB...');
      const startTime = performance.now();
      
      // Check if we have a flag in localStorage first for quick availability check
      const hasActivities = localStorage.getItem('hasStoredActivities') === 'true';
      if (!hasActivities) {
        console.log('No activities flag in localStorage, returning empty array');
        resolve([]);
        return;
      }
      
      const request = indexedDB.open('activityDatabase', 3);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('activities')) {
          db.createObjectStore('activities', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('individualActivities')) {
          const individualStore = db.createObjectStore('individualActivities', { keyPath: 'id' });
          individualStore.createIndex('riskScore', 'riskScore', { unique: false });
          individualStore.createIndex('date', 'date', { unique: false });
          individualStore.createIndex('username', 'username', { unique: false });
          individualStore.createIndex('integration', 'integration', { unique: false });
        }
      };
      
      request.onerror = () => {
        console.error('IndexedDB error');
        console.log('Falling back to localStorage');
        fallbackToLocalStorage(resolve);
      };
      
      request.onsuccess = async () => {
        const db = request.result;
        
        try {
          // Get metadata first to understand data structure
          const metadata = await getMetadata(db);
          
          if (!metadata) {
            console.log('No metadata found, checking for legacy data format');
            const legacyData = await getLegacyData(db);
            if (legacyData.length > 0) {
              const endTime = performance.now();
              console.log(`Retrieved ${legacyData.length} activities (legacy format) in ${(endTime - startTime).toFixed(2)}ms`);
              resolve(legacyData);
            } else {
              console.log('No activities found in database, falling back to localStorage');
              fallbackToLocalStorage(resolve);
            }
            return;
          }
          
          console.log(`Found metadata: ${metadata.count} activities in database, version ${metadata.version}`);
          
          // Check if data was stored in recovery mode
          if (metadata.isRecoveryMode) {
            console.log('Data was stored in recovery mode - using optimized loading strategy');
          }
          
          // Check if we should use individual activities for better performance
          if (db.objectStoreNames.contains('individualActivities')) {
            try {
              const individualActivities = await getIndividualActivities(db);
              if (individualActivities.length > 0) {
                console.log(`Retrieved ${individualActivities.length} individual activities`);
                
                // Verify count matches metadata
                if (individualActivities.length === metadata.count) {
                  const endTime = performance.now();
                  console.log(`Retrieved activities via index in ${(endTime - startTime).toFixed(2)}ms`);
                  resolve(individualActivities);
                  return;
                } else {
                  console.log('Individual activities count mismatch, falling back to chunked loading');
                }
              }
            } catch (individualError) {
              console.warn('Error loading individual activities, falling back to chunks:', individualError);
            }
          }
          
          // Calculate number of chunks
          const totalChunks = Math.ceil(metadata.count / (metadata.chunkSize || 500));
          const allActivities: UserActivity[] = [];
          
          // Load chunks in sequence to avoid memory pressure
          for (let i = 0; i < totalChunks; i++) {
            try {
              const chunk = await getChunk(db, i);
              if (chunk && Array.isArray(chunk.data)) {
                allActivities.push(...chunk.data);
                
                // Log progress for larger datasets
                if (totalChunks > 5 && (i % 5 === 0 || i === totalChunks - 1)) {
                  console.log(`Loaded chunk ${i + 1} of ${totalChunks} (${allActivities.length} / ~${metadata.count} activities)`);
                }
              }
            } catch (chunkError) {
              console.warn(`Error loading chunk ${i}:`, chunkError);
              // Continue with other chunks even if one fails
            }
          }
          
          if (allActivities.length === 0) {
            console.warn('No activities loaded from chunks, falling back to localStorage');
            fallbackToLocalStorage(resolve);
            return;
          }
          
          const endTime = performance.now();
          console.log(`Retrieved ${allActivities.length} activities in ${(endTime - startTime).toFixed(2)}ms`);
          
          // Ensure essential fields are not undefined
          const processedActivities = allActivities.map(activity => ({
            ...activity,
            id: activity.id || `generated_${Math.random().toString(36).substr(2, 9)}`,
            riskScore: activity.riskScore || 0,
            timestamp: activity.timestamp || new Date().toISOString()
          }));
          
          resolve(processedActivities);
        } catch (dbError) {
          console.error('Error retrieving from IndexedDB:', dbError);
          fallbackToLocalStorage(resolve);
        }
      };
    } catch (error) {
      console.error('Error in getActivitiesFromIndexedDB:', error);
      fallbackToLocalStorage(resolve);
    }
  });
}

/**
 * Get individual activities for faster access
 */
function getIndividualActivities(db: IDBDatabase): Promise<UserActivity[]> {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction('individualActivities', 'readonly');
      const store = tx.objectStore('individualActivities');
      
      const activities: UserActivity[] = [];
      const request = store.openCursor();
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          activities.push(cursor.value);
          cursor.continue();
        } else {
          // Sort by timestamp if available
          activities.sort((a, b) => {
            if (a.timestamp && b.timestamp) {
              return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            }
            return 0;
          });
          
          resolve(activities);
        }
      };
      
      request.onerror = () => {
        reject(new Error('Failed to retrieve individual activities'));
      };
      
      tx.oncomplete = () => {
        if (activities.length === 0) {
          reject(new Error('No individual activities found'));
        }
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get metadata about the stored dataset
 */
function getMetadata(db: IDBDatabase): Promise<any> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('metadata', 'readonly');
      const store = tx.objectStore('metadata');
      
      const request = store.get('dataset_info');
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch (error) {
      console.warn('Error getting metadata:', error);
      resolve(null);
    }
  });
}

/**
 * Get activities from legacy storage format
 */
function getLegacyData(db: IDBDatabase): Promise<UserActivity[]> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('activities', 'readonly');
      const store = tx.objectStore('activities');
      
      // Check for legacy 'all_activities' entry first
      const allRequest = store.get('all_activities');
      
      allRequest.onsuccess = () => {
        if (allRequest.result && Array.isArray(allRequest.result.data)) {
          resolve(allRequest.result.data);
        } else {
          // Check for legacy metadata + chunks approach
          const metaRequest = store.get('metadata');
          
          metaRequest.onsuccess = async () => {
            if (metaRequest.result) {
              const totalChunks = Math.ceil(metaRequest.result.count / 1000);
              const allData: UserActivity[] = [];
              
              for (let i = 0; i < totalChunks; i++) {
                const chunkRequest = store.get(`chunk_${i}`);
                await new Promise<void>(resolve => {
                  chunkRequest.onsuccess = () => {
                    if (chunkRequest.result && Array.isArray(chunkRequest.result.data)) {
                      allData.push(...chunkRequest.result.data);
                    }
                    resolve();
                  };
                  chunkRequest.onerror = () => resolve();
                });
              }
              
              resolve(allData);
            } else {
              resolve([]);
            }
          };
          
          metaRequest.onerror = () => resolve([]);
        }
      };
      
      allRequest.onerror = () => resolve([]);
    } catch (error) {
      console.warn('Error retrieving legacy data:', error);
      resolve([]);
    }
  });
}

/**
 * Get a specific chunk of activities
 */
function getChunk(db: IDBDatabase, chunkNumber: number): Promise<any> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('activities', 'readonly');
      const store = tx.objectStore('activities');
      
      const request = store.get(`chunk_${chunkNumber}`);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch (error) {
      console.warn(`Error getting chunk ${chunkNumber}:`, error);
      resolve(null);
    }
  });
}

/**
 * Clear all stored activities
 */
export async function clearStoredActivities(): Promise<void> {
  // Skip if not in browser
  if (!isBrowser()) {
    console.warn('IndexedDB operations can only run in browser');
    return;
  }

  // Clear ALL database names to handle all legacy data sources
  const databasesToClear = [
    { name: 'ltu_academic_weapon', version: 1 }, // Root storage utility database
    { name: 'ActivityDB', version: 1 }, // Legacy database name
    { name: 'activityDatabase', version: 3 } // Current database
  ];

  console.log('[clearStoredActivities] Clearing all databases:', databasesToClear.map(db => db.name));

  for (const db of databasesToClear) {
    await clearDatabase(db.name, db.version);
  }

  // Clear localStorage flags and cached data
  const localStorageKeys = [
    'hasStoredActivities',
    'activityCount',
    'lastStorageTime',
    'partialDataStored',
    'lastDataUpload',
    'dataUploadType',
    'activities',
    'mockActivityData',
    'fallbackActivities',
    'csvValidationCache',
    'dataProcessingStats',
    'uploadProgress',
    'activitiesMetadata',
    'processedActivityData'
  ];
  
  localStorageKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Clear ML alerts as well
  localStorage.removeItem('ml_security_alerts');
  
  // Clear other ML-related data
  localStorage.removeItem('ml_processing_timestamp');
  localStorage.removeItem('ml_recommendations_cache');
  
  console.log('[clearStoredActivities] Cleared ML alerts and recommendations');
  
  console.log(`[clearStoredActivities] Cleared ${localStorageKeys.length} localStorage items`);
  console.log('[clearStoredActivities] All activities and metadata cleared from storage');
  
  // Trigger a storage cleared event to notify components
  window.dispatchEvent(new CustomEvent('storageCleared', { 
    detail: { 
      timestamp: Date.now(),
      clearedStores: ['activities', 'metadata', 'individualActivities'],
      clearedDatabases: databasesToClear.map(db => db.name)
    }
  }));
}

/**
 * Clear a specific database by name and version
 */
async function clearDatabase(dbName: string, version: number): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      console.log(`[clearDatabase] Opening database ${dbName} version ${version}`);
      const request = indexedDB.open(dbName, version);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        console.log(`[clearDatabase] Upgrade needed for ${dbName}, ensuring object stores exist`);
        
        // Create object stores if they don't exist during upgrade
        if (!db.objectStoreNames.contains('activities')) {
          db.createObjectStore('activities', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('individualActivities')) {
          const individualStore = db.createObjectStore('individualActivities', { keyPath: 'id' });
          individualStore.createIndex('riskScore', 'riskScore', { unique: false });
          individualStore.createIndex('date', 'date', { unique: false });
          individualStore.createIndex('username', 'username', { unique: false });
          individualStore.createIndex('integration', 'integration', { unique: false });
        }
      };
      
      request.onsuccess = async () => {
        const db = request.result;
        
        try {
          console.log(`[clearDatabase] Successfully opened ${dbName}, object stores:`, Array.from(db.objectStoreNames));
          
          // Get all object store names from the database
          const storeNames = Array.from(db.objectStoreNames);
          
          if (storeNames.length === 0) {
            console.log(`[clearDatabase] No object stores found in ${dbName}`);
            db.close();
            resolve();
            return;
          }
          
          console.log(`[clearDatabase] Clearing object stores in ${dbName}: ${storeNames.join(', ')}`);
          
          for (const storeName of storeNames) {
            try {
              await clearObjectStore(db, storeName);
              console.log(`[clearDatabase] Successfully cleared ${storeName} in ${dbName}`);
            } catch (storeError) {
              console.error(`[clearDatabase] Error clearing ${storeName} in ${dbName}:`, storeError);
              // Continue with other stores even if one fails
            }
          }
          
          console.log(`[clearDatabase] Successfully cleared all data from ${dbName}`);
          resolve();
        } catch (error) {
          console.error(`[clearDatabase] Error clearing ${dbName}:`, error);
          reject(error);
        } finally {
          db.close();
        }
      };
      
      request.onerror = () => {
        console.error(`[clearDatabase] Failed to open database ${dbName} for clearing`);
        // Don't reject here - the database might not exist, which is fine
        resolve();
      };
    } catch (error) {
      console.error(`[clearDatabase] Error clearing database ${dbName}:`, error);
      reject(error);
    }
  });
}

/**
 * Utility sleep function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fallback to localStorage if IndexedDB fails
 */
function fallbackToLocalStorage(resolve: (value: UserActivity[]) => void) {
  try {
    const storedDataString = localStorage.getItem('fallbackActivities');
    if (storedDataString) {
      const parsedData = JSON.parse(storedDataString);
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        console.log(`Retrieved ${parsedData.length} activities from localStorage fallback`);
        
        // Ensure essential fields are not undefined
        const processedActivities = parsedData.map((activity: any) => ({
          ...activity,
          id: activity.id || `generated_${Math.random().toString(36).substr(2, 9)}`,
          riskScore: activity.riskScore || 0,
          timestamp: activity.timestamp || new Date().toISOString()
        }));
        
        resolve(processedActivities);
        return;
      }
    }
    
    // If no localStorage data, return empty array
    console.log('No fallback data in localStorage either');
    resolve([]);
  } catch (e) {
    console.error('Error reading from localStorage:', e);
    resolve([]);
  }
}

/**
 * Clear an object store
 */
function clearObjectStore(db: IDBDatabase, storeName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to clear ${storeName}`));
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error(`Transaction failed when clearing ${storeName}`));
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get the current size of stored activities in bytes
 */
export async function getStoredActivitiesSize(): Promise<number> {
  try {
    const activities = await getActivitiesFromIndexedDB();
    
    // Estimate size by serializing the activities to JSON and measuring the length
    const jsonString = JSON.stringify(activities);
    return jsonString.length;
  } catch (error) {
    console.error('Error calculating activities size:', error);
    return 0;
  }
}

/**
 * Append new activities to existing ones
 * @param newActivities Activities to append to the existing data
 * @returns Object with success status and operation details
 */
export async function appendActivities(
  newActivities: UserActivity[]
): Promise<{ success: boolean; addedCount: number; remainingSpaceBytes: number }> {
  if (!newActivities || newActivities.length === 0) {
    return { success: true, addedCount: 0, remainingSpaceBytes: 10 * 1024 * 1024 };
  }

  try {
    console.log(`Attempting to append ${newActivities.length} activities to existing data...`);
    
    // Get existing activities
    const existingActivities = await getActivitiesFromIndexedDB();
    console.log(`Retrieved ${existingActivities.length} existing activities`);
    
    // Calculate current size
    const currentSizeBytes = await getStoredActivitiesSize();
    
    // Calculate max size (10MB in bytes)
    const MAX_SIZE_BYTES = 10 * 1024 * 1024;
    
    // Calculate remaining space
    const remainingSpaceBytes = MAX_SIZE_BYTES - currentSizeBytes;
    
    if (remainingSpaceBytes <= 0) {
      console.warn('Storage is already at maximum capacity (10MB). Cannot add more activities.');
      return { success: false, addedCount: 0, remainingSpaceBytes: 0 };
    }
    
    // Estimate size of new activities (based on average size of existing)
    const avgSizePerActivity = existingActivities.length > 0 
      ? currentSizeBytes / existingActivities.length 
      : 500; // Default estimate: 500 bytes per activity
    
    const estimatedNewSize = avgSizePerActivity * newActivities.length;
    console.log(`Estimated size of new activities: ${(estimatedNewSize / 1024).toFixed(2)}KB`);
    
    if (estimatedNewSize > remainingSpaceBytes) {
      // Calculate how many we can add
      const maxItemsToAdd = Math.floor(remainingSpaceBytes / avgSizePerActivity);
      console.warn(`Cannot add all activities due to size limits. Will add ${maxItemsToAdd} of ${newActivities.length}`);
      
      if (maxItemsToAdd <= 0) {
        return { success: false, addedCount: 0, remainingSpaceBytes };
      }
      
      // Add only what fits
      newActivities = newActivities.slice(0, maxItemsToAdd);
    }
    
    // Ensure new activities have unique IDs
    const processedActivities = newActivities.map(activity => ({
      ...activity,
      id: activity.id || `activity-${Date.now()}-${Math.floor(Math.random() * 1000000)}`
    }));
    
    // Combine with existing
    const combinedActivities = [...existingActivities, ...processedActivities];
    console.log(`Combined into ${combinedActivities.length} total activities`);
    
    // Store the combined data
    const success = await storeActivitiesInIndexedDB(combinedActivities);
    
    if (!success) {
      return { 
        success: false, 
        addedCount: 0, 
        remainingSpaceBytes 
      };
    }
    
    // Calculate new remaining space
    const newTotalSize = await getStoredActivitiesSize();
    const newRemainingBytes = Math.max(0, MAX_SIZE_BYTES - newTotalSize);
    
    return {
      success: true,
      addedCount: processedActivities.length,
      remainingSpaceBytes: newRemainingBytes
    };
  } catch (error) {
    console.error('Error appending activities:', error);
    return { 
      success: false, 
      addedCount: 0, 
      remainingSpaceBytes: 0 
    };
  }
}

/**
 * Get the current data version timestamp
 */
export function getDataVersion(): string | null {
  if (!isBrowser()) {
    return null;
  }
  return localStorage.getItem('data_version');
}

/**
 * Check if data version has changed since a given timestamp
 */
export function hasDataVersionChanged(lastKnownVersion: string | null): boolean {
  if (!isBrowser()) {
    return false;
  }
  const currentVersion = getDataVersion();
  return currentVersion !== lastKnownVersion;
}

/**
 * Reset the database entirely - useful for troubleshooting or when schema changes
 */
export async function resetDatabase(): Promise<boolean> {
  if (!isBrowser()) {
    console.warn('IndexedDB operations can only run in browser');
    return false;
  }

  return new Promise((resolve) => {
    try {
      console.log('Attempting to delete and reset the database...');
      
      // First, close any open connections
      const closeRequest = indexedDB.open('activityDatabase');
      closeRequest.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        db.close();
        
        // Now try to delete the database
        const deleteRequest = indexedDB.deleteDatabase('activityDatabase');
        
        deleteRequest.onsuccess = () => {
          console.log('Successfully deleted database');
          
          // Clear localStorage flags
          localStorage.removeItem('hasStoredActivities');
          localStorage.removeItem('activityCount');
          localStorage.removeItem('lastStorageTime');
          localStorage.removeItem('activities-total-count');
          localStorage.removeItem('activities-chunk-size');
          localStorage.removeItem('activities-is-chunked');
          localStorage.removeItem('activities-skip-individual');
          localStorage.removeItem('activities-last-updated');
          
          console.log('Database reset complete');
          resolve(true);
        };
        
        deleteRequest.onerror = () => {
          console.error('Error deleting database');
          resolve(false);
        };
      };
      
      closeRequest.onerror = () => {
        console.error('Error closing database connections');
        resolve(false);
      };
    } catch (error) {
      console.error('Error resetting database:', error);
      resolve(false);
    }
  });
} 