// Simple Node.js script to test CSV parsing - optimized for large files
const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function testCSVParsing() {
  console.log('Starting CSV parsing test - safe version for large files...');
  
  // Read the file line by line instead of loading it all at once
  const csvPath = path.join(__dirname, 'data_sheet', 'large_activity_data.csv');
  console.log(`Reading file: ${csvPath}`);
  
  try {
    // Create a read stream and readline interface
    const fileStream = fs.createReadStream(csvPath, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    // Read the first 10 lines
    const lines = [];
    let lineCount = 0;
    
    console.log('Reading header and first few lines...');
    
    for await (const line of rl) {
      lines.push(line);
      lineCount++;
      
      // Stop after reading 10 lines
      if (lineCount >= 10) {
        break;
      }
    }
    
    console.log(`Read ${lines.length} lines from the file`);
    
    // Check the CSV header
    if (lines.length > 0) {
      const header = lines[0];
      console.log('CSV Header:', header);
      
      // Parse the header to get column names
      const headers = header.split(',').map(h => h.trim());
      console.log('Column names:', headers);
      
      // Check for required fields
      const hasUserField = headers.includes('user');
      const hasDateField = headers.includes('date');
      const hasTimeField = headers.includes('time');
      
      console.log('Has user field:', hasUserField);
      console.log('Has date field:', hasDateField);
      console.log('Has time field:', hasTimeField);
      
      // Show the first data row
      if (lines.length > 1) {
        console.log('First data row:');
        const firstDataRow = lines[1];
        console.log(firstDataRow);
        
        // Parse the row manually
        const values = firstDataRow.split(',');
        const row = {};
        
        headers.forEach((header, index) => {
          if (index < values.length) {
            row[header] = values[index];
          }
        });
        
        console.log('Parsed first row:');
        console.log(row);
        
        // Check specific fields
        console.log('User value:', row.user);
        console.log('Date value:', row.date);
        console.log('Time value:', row.time);
      }
      
      return {
        success: true,
        message: 'CSV header analysis successful',
        hasUserField,
        hasDateField,
        hasTimeField
      };
    } else {
      return {
        success: false,
        message: 'No lines read from the file'
      };
    }
  } catch (error) {
    console.error('Error:', error.message);
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

// Run the test
testCSVParsing().then(result => {
  console.log('\nTest result:', result.success ? 'PASSED' : 'FAILED');
  if (!result.success) {
    console.error('Error message:', result.message);
    process.exit(1);
  } else {
    console.log('CSV format check results:');
    console.log(`- User field: ${result.hasUserField ? 'FOUND ✅' : 'MISSING ❌'}`);
    console.log(`- Date field: ${result.hasDateField ? 'FOUND ✅' : 'MISSING ❌'}`);
    console.log(`- Time field: ${result.hasTimeField ? 'FOUND ✅' : 'MISSING ❌'}`);
  }
}); 