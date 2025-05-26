/**
 * CSV Header Validation Utility
 * Ensures CSV files contain the exact required headers for activity data
 */

export interface CSVValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingHeaders: string[];
  extraHeaders: string[];
  actualHeaders: string[];
}

export class CSVValidator {
  // Required headers exactly as specified by the user
  private static readonly REQUIRED_HEADERS = [
    'activityId',
    'user', 
    'date',
    'time',
    'riskScore',
    'integration',
    'policiesBreached',
    'values',
    'status',
    'managerAction'
  ];

  /**
   * Validate CSV headers against required format
   */
  static validateHeaders(csvText: string): CSVValidationResult {
    const result: CSVValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      missingHeaders: [],
      extraHeaders: [],
      actualHeaders: []
    };

    try {
      // Extract first line (header row)
      const lines = csvText.trim().split('\n');
      if (lines.length === 0) {
        result.errors.push('CSV file is empty');
        return result;
      }

      const headerLine = lines[0].trim();
      if (!headerLine) {
        result.errors.push('CSV file has no header row');
        return result;
      }

      // Parse headers (handle quotes and trim whitespace)
      const actualHeaders = headerLine
        .split(',')
        .map(header => header.trim().replace(/^["']|["']$/g, ''))
        .filter(header => header.length > 0);

      result.actualHeaders = actualHeaders;

      // Check for missing required headers
      for (const requiredHeader of this.REQUIRED_HEADERS) {
        if (!actualHeaders.includes(requiredHeader)) {
          result.missingHeaders.push(requiredHeader);
        }
      }

      // Check for extra headers (not required but might be acceptable)
      for (const actualHeader of actualHeaders) {
        if (!this.REQUIRED_HEADERS.includes(actualHeader)) {
          result.extraHeaders.push(actualHeader);
        }
      }

      // Validation logic
      if (result.missingHeaders.length > 0) {
        result.errors.push(
          `Missing required headers: ${result.missingHeaders.join(', ')}`
        );
      }

      if (result.extraHeaders.length > 0) {
        result.warnings.push(
          `Extra headers found (will be ignored): ${result.extraHeaders.join(', ')}`
        );
      }

      // Check if file has at least some data rows
      if (lines.length < 2) {
        result.errors.push('CSV file must contain at least one data row');
      }

      // File is valid if no errors
      result.isValid = result.errors.length === 0;

      return result;

    } catch (error) {
      result.errors.push(`Error parsing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Validate CSV file before processing
   */
  static async validateFile(file: File): Promise<CSVValidationResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const csvText = event.target?.result as string;
          const validation = this.validateHeaders(csvText);
          resolve(validation);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      // Read only the first 1KB to check headers (efficient for large files)
      const headerChunk = file.slice(0, 1024);
      reader.readAsText(headerChunk);
    });
  }

  /**
   * Get a user-friendly error message for validation failures
   */
  static getValidationMessage(validation: CSVValidationResult): string {
    if (validation.isValid) {
      return 'CSV file format is valid';
    }

    let message = 'CSV validation failed:\n';
    
    if (validation.errors.length > 0) {
      message += '\nErrors:\n';
      validation.errors.forEach(error => {
        message += `• ${error}\n`;
      });
    }

    if (validation.warnings.length > 0) {
      message += '\nWarnings:\n';
      validation.warnings.forEach(warning => {
        message += `• ${warning}\n`;
      });
    }

    message += '\nRequired headers:\n';
    this.REQUIRED_HEADERS.forEach(header => {
      const status = validation.missingHeaders.includes(header) ? '❌' : '✅';
      message += `${status} ${header}\n`;
    });

    if (validation.actualHeaders.length > 0) {
      message += `\nYour file headers: ${validation.actualHeaders.join(', ')}`;
    }

    return message;
  }

  /**
   * Get required headers list
   */
  static getRequiredHeaders(): string[] {
    return [...this.REQUIRED_HEADERS];
  }
} 