import { UserActivity } from '../types/activity';

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
      
      request.onsuccess = (event) => {
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

  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open('activityDatabase', 2);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('activities')) {
          db.createObjectStore('activities', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = async () => {
        const db = request.result;
        
        try {
          await clearObjectStore(db, 'activities');
          await clearObjectStore(db, 'metadata');
          
          // Clear localStorage flags
          localStorage.removeItem('hasStoredActivities');
          localStorage.removeItem('activityCount');
          localStorage.removeItem('lastStorageTime');
          
          console.log('All activities cleared from storage');
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      
      request.onerror = () => {
        reject(new Error('Failed to open database for clearing'));
      };
    } catch (error) {
      console.error('Error clearing activities:', error);
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