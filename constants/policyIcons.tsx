import React from 'react';
import { 
  FaDatabase, 
  FaEnvelope, 
  FaExclamationTriangle, 
  FaFile, 
  FaFileAlt,
  FaFileArchive,
  FaFileExcel,
  FaFilePdf,
  FaFilePowerpoint,
  FaLaptop, 
  FaLock, 
  FaMoneyBill,  
  FaUser, 
  FaUsb,
  FaShieldAlt,
  FaEye,
  FaCreditCard,
  FaExclamationCircle
} from "react-icons/fa";

/**
 * Policy icon mapping for visualizing different types of policy breaches
 */
export const policyIcons: Record<string, React.ReactNode> = {
  // Main breach categories
  dataLeakage: <FaFile title="Data Leakage" />,
  pii: <FaUser title="PII" />,
  phi: <FaShieldAlt title="PHI" />,
  pci: <FaCreditCard title="PCI" />,
  financial: <FaMoneyBill title="Financial" />,
  sensitive: <FaLock title="Sensitive" />,
  userAtRisk: <FaExclamationCircle title="User At Risk" />,
  fraud: <FaExclamationTriangle title="Fraud" />,
  
  // Integration types
  email: <FaEnvelope title="Email" />,
  usb: <FaUsb title="USB" />,
  cloud: <FaDatabase title="Cloud" />,
  application: <FaLaptop title="Application" />,
  
  // Specific breach types
  emailContainedDocuments: <FaFileAlt title="Email Documents" />,
  emailContainedSpreadsheets: <FaFileExcel title="Email Spreadsheets" />,
  emailContainedPDFs: <FaFilePdf title="Email PDFs" />,
  emailContainedZipFiles: <FaFileArchive title="Email Zip Files" />,
  emailWasSentToExternalDomain: <FaEnvelope title="External Email" />,
  emailWasSentToPersonalEmailAddress: <FaEnvelope title="Personal Email" />,
  
  cloudUploadContainedDocuments: <FaFileAlt title="Cloud Documents" />,
  cloudUploadContainedPDFs: <FaFilePdf title="Cloud PDFs" />,
  cloudUploadContainedSpreadsheets: <FaFileExcel title="Cloud Spreadsheets" />,
  cloudUploadContainedPresentations: <FaFilePowerpoint title="Cloud Presentations" />,
  cloudUploadContainedZipFiles: <FaFileArchive title="Cloud Zip Files" />,
  cloudUploadContainedPII: <FaUser title="Cloud PII" />,
  cloudUploadContainedConfidentialData: <FaLock title="Cloud Confidential" />,
  
  usbContainedDocuments: <FaFileAlt title="USB Documents" />,
  usbContainedPDFs: <FaFilePdf title="USB PDFs" />,
  usbContainedSpreadsheets: <FaFileExcel title="USB Spreadsheets" />,
  usbContainedPresentations: <FaFilePowerpoint title="USB Presentations" />,
  usbContainedZipFiles: <FaFileArchive title="USB Zip Files" />,
  usbContainedPHI: <FaShieldAlt title="USB PHI" />,
  usbContainedConfidentialData: <FaLock title="USB Confidential" />,
  usbContainedFraudIndicators: <FaExclamationTriangle title="USB Fraud" />,
  usbEnhancedMonitoring: <FaEye title="USB Monitoring" />,
  
  // Other common terms
  Internal: <FaLock title="Internal" />,
  Confidential: <FaLock title="Confidential" />,
  Documents: <FaFileAlt title="Documents" />,
  PDFs: <FaFilePdf title="PDFs" />,
  Spreadsheets: <FaFileExcel title="Spreadsheets" />
}; 