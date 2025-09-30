import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Download, 
  FileText, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  X,
  Eye,
  Database
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { InsertStudent } from '@shared/schema';

interface StudentCSVUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (data: any) => void;
}

interface ParsedStudentRow {
  index: number;
  data: Partial<InsertStudent>;
  valid: boolean;
  errors: string[];
}

const studentSampleCSV = `BC No,Name,Center,Level,Class,Session,Admission Date,Start Date,End Date,Birthdate,Gender,Enrolment Status
BC001,John Doe,Main Center,Grade 8,8A,2024-2025,2024-01-15,2024-02-01,2024-12-20,2010-05-15,Male,Active
BC002,Alice Smith,East Center,Grade 9,9B,2024-2025,2024-01-15,2024-02-01,2024-12-20,2009-08-20,Female,Active
BC003,Mike Johnson,West Center,Grade 7,7C,2024-2025,2024-01-15,2024-02-01,2024-12-20,2011-03-10,Male,Active`;

export default function StudentCSVUploader({ isOpen, onClose, onUploadComplete }: StudentCSVUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState('');
  const [parsedData, setParsedData] = useState<ParsedStudentRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const isCSV = selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv');
      const isExcel = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');
      
      if (!isCSV && !isExcel) {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV or Excel file (.csv, .xlsx, .xls)",
          variant: "destructive",
        });
        return;
      }
      
      setFile(selectedFile);
      
      if (isCSV) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setCsvContent(content);
          parseCSVWithPapa(content);
        };
        reader.readAsText(selectedFile);
      } else {
        // Handle Excel files with xlsx library
        const reader = new FileReader();
        reader.onload = (e) => {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          parseExcelFile(data);
        };
        reader.readAsArrayBuffer(selectedFile);
      }
    }
  };

  const parseExcelFile = (data: Uint8Array) => {
    try {
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length < 2) {
        setValidationErrors(['Excel file must contain at least a header row and one data row']);
        return;
      }

      // Convert to CSV-like structure for processing
      const headers = (jsonData[0] as string[]).map(h => String(h || '').trim());
      const csvContent = jsonData.map(row => 
        (row as any[]).map(cell => 
          String(cell || '').includes(',') ? `"${cell}"` : String(cell || '')
        ).join(',')
      ).join('\n');
      
      setCsvContent(csvContent);
      parseDataRows(headers, jsonData.slice(1) as any[][]);
    } catch (error) {
      console.error('Excel parsing error:', error);
      toast({
        title: "Excel Parsing Error",
        description: "Failed to parse Excel file. Please check the file format.",
        variant: "destructive",
      });
    }
  };

  // Helper function to check if a field is already mapped
  const isKnownField = (header: string): boolean => {
    const knownFields = [
      'bc no', 'bc_no', 'bcno', 'studentid', 'student_id', 'id',
      'firstname', 'first_name', 'lastname', 'last_name',
      'fullname', 'full_name', 'name', 'center', 'centre', 'learning_center', 'learning center', 'branch', 'campus', 'location', 'center name', 'centre name',
      'level', 'std', 'standard', 'year', 'year_level', 'student_level', 'class level', 'grade level',
      'session', 'timing', 'time_slot', 'time slot', 'session time', 'schedule', 'batch',
      'admission date', 'admission_date', 'admissiondate',
      'start date', 'start_date', 'startdate',
      'end date', 'end_date', 'enddate',
      'birthdate', 'birth_date', 'date_of_birth', 'dateofbirth', 'dob',
      'enrolment status', 'enrolment_status', 'enrollment_status', 'enrollment', 'status',
      'email', 'email_address', 'phonenumber', 'phone_number', 'phone',
      'gender', 'grade', 'class_level', 'class', 'classroom', 'section',
      'guardianname', 'guardian_name', 'parent_name',
      'guardianemail', 'guardian_email', 'parent_email',
      'guardianphone', 'guardian_phone', 'parent_phone',
      'address', 'emergencycontact', 'emergency_contact',
      'emergencyphone', 'emergency_phone', 'medicalinfo', 'medical_info', 'medical_information'
    ];
    return knownFields.includes(header.toLowerCase());
  };

  const parseCSVWithPapa = (content: string) => {
    Papa.parse(content, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length < 2) {
          setValidationErrors(['CSV file must contain at least a header row and one data row']);
          return;
        }

        const headers = (results.data[0] as string[]).map(h => String(h || '').trim());
        const dataRows = results.data.slice(1) as string[][];
        
        parseDataRows(headers, dataRows);
      },
      error: (error: any) => {
        console.error('CSV parsing error:', error);
        toast({
          title: "CSV Parsing Error", 
          description: "Failed to parse CSV file. Please check the file format.",
          variant: "destructive",
        });
      }
    });
  };

  const parseDataRows = (headers: string[], dataRows: any[][]) => {
    const requiredHeaders = ['BC No'];
    
    // Validate required headers (case-insensitive)
    const headerMap = new Map();
    headers.forEach((header, index) => {
      headerMap.set(header.toLowerCase(), index);
    });

    const missingHeaders = requiredHeaders.filter(h => {
      const variants = [
        h.toLowerCase(),
        h.replace(/\s+/g, '_').toLowerCase(),
        h.replace(/\s+/g, '').toLowerCase(),
        'bc no.',
        'bc_no',
        'bc_no.',
        'bcno',
        'bcno.',
        'student_id',
        'studentid',
        'id'
      ];
      return !variants.some(variant => headerMap.has(variant));
    });

    if (missingHeaders.length > 0) {
      setValidationErrors([`Missing required headers: ${missingHeaders.join(', ')}`]);
      return;
    }

    const parsed: ParsedStudentRow[] = [];
    const errors: string[] = [];

    dataRows.forEach((row, index) => {
      if (!row || row.every(cell => !cell || String(cell).trim() === '')) return;

      const rowData: Partial<InsertStudent> = {};
      
      // Map row data to student fields
      headers.forEach((header, colIndex) => {
        const value = row[colIndex] ? String(row[colIndex]).trim() : '';
        const normalizedHeader = header.toLowerCase();
        
        // Map common variations - only set fields if they have values
        // Initialize additionalData if it doesn't exist
        if (!rowData.additionalData) {
          rowData.additionalData = {};
        }
        
        switch (normalizedHeader) {
          case 'bc no':
          case 'bc no.':
          case 'bc_no':
          case 'bc_no.':
          case 'bcno':
          case 'bcno.':
          case 'studentid':
          case 'student_id':
          case 'id':
            if (value) {
              rowData.student_BC = value;
              (rowData.additionalData as any).bcNo = value;
            }
            break;
          case 'firstname':
          case 'first_name':
          case 'lastname':
          case 'last_name':
            // These fields are no longer used - data stored in additionalData
            if (value) (rowData.additionalData as any)[header] = value;
            break;
          case 'center':
          case 'centre':
          case 'learning_center':
          case 'learning center':
          case 'branch':
          case 'campus':
          case 'location':
          case 'center name':
          case 'centre name':
            if (value && !rowData.centre) { // Only set if not already set (first-wins)
              rowData.centre = value;
              (rowData.additionalData as any).center = value;
            }
            break;
          case 'level':
          case 'std':
          case 'standard':
          case 'year':
          case 'year_level':
          case 'student_level':
          case 'class level':
          case 'grade level':
            if (value && !rowData.level) { // Only set if not already set (first-wins)
              rowData.level = value;
            }
            break;
          case 'session':
          case 'timing':
          case 'time_slot':
          case 'time slot':
          case 'session time':
          case 'schedule':
          case 'batch':
            if (value && !(rowData.additionalData as any)?.session) { // Only set if not already set
              if (!rowData.additionalData) rowData.additionalData = {};
              (rowData.additionalData as any).session = value;
              // Also store as session_info for consistency with existing data
              (rowData.additionalData as any).session_info = value;
            }
            break;
          case 'admission date':
          case 'admission_date':
          case 'admissiondate':
            if (value) (rowData.additionalData as any).admissionDate = value;
            break;
          case 'start date':
          case 'start_date':
          case 'startdate':
            if (value) (rowData.additionalData as any).startDate = value;
            break;
          case 'end date':
          case 'end_date':
          case 'enddate':
            if (value) (rowData.additionalData as any).endDate = value;
            break;
          case 'birthdate':
          case 'birth_date':
          case 'date_of_birth':
          case 'dateofbirth':
          case 'dob':
            if (value) rowData.dateOfBirth = value;
            break;
          case 'enrolment status':
          case 'enrolment_status':
          case 'enrollment_status':
          case 'enrollment':
          case 'status':
            if (value) {
              rowData.status = value.toLowerCase();
              (rowData.additionalData as any).enrollment = value;
            }
            break;
          case 'fullname':
          case 'full_name':
          case 'name':
            if (value) rowData.fullName = value;
            break;
          case 'email':
          case 'email_address':
          case 'phonenumber':
          case 'phone_number':
          case 'phone':
            // These fields are no longer used - data stored in additionalData
            if (value) (rowData.additionalData as any)[header] = value;
            break;
          case 'gender':
            if (value) rowData.gender = value;
            break;
          case 'grade':
          case 'class_level':
            if (value) rowData.level = value;
            break;
          case 'class':
          case 'classroom':
            if (value) rowData.class = value;
            break;
          case 'section':
            if (value) {
              if (!rowData.additionalData) rowData.additionalData = {};
              (rowData.additionalData as any).section = value;
            }
            break;
          case 'guardianname':
          case 'guardian_name':
          case 'parent_name':
            if (value) rowData.guardianName = value;
            break;
          case 'guardianemail':
          case 'guardian_email':
          case 'parent_email':
            if (value) rowData.guardianEmail = value;
            break;
          case 'guardianphone':
          case 'guardian_phone':
          case 'parent_phone':
            if (value) rowData.guardianPhone = value;
            break;
          case 'address':
            if (value) rowData.address = value;
            break;
          case 'emergencycontact':
          case 'emergency_contact':
            if (value) rowData.emergencyContact = value;
            break;
          case 'emergencyphone':
          case 'emergency_phone':
            if (value) rowData.emergencyPhone = value;
            break;
          case 'medicalinfo':
          case 'medical_info':
          case 'medical_information':
            if (value) rowData.medicalInfo = value;
            break;
        }
      });

      // Note: firstName and lastName are no longer used
      // fullName should be provided directly in the CSV
      
      // Store all unmapped fields in additionalData
      headers.forEach((header, colIndex) => {
        const value = row[colIndex] ? String(row[colIndex]).trim() : '';
        if (value && header && !isKnownField(header.toLowerCase())) {
          if (!rowData.additionalData) rowData.additionalData = {};
          (rowData.additionalData as any)[header] = value;
        }
      });

      const rowErrors = validateStudentRow(rowData);
      parsed.push({
        index: index + 2, // +2 because we skipped header and arrays are 0-indexed
        data: rowData,
        valid: rowErrors.length === 0,
        errors: rowErrors
      });

      if (rowErrors.length > 0) {
        errors.push(`Row ${index + 2}: ${rowErrors.join(', ')}`);
      }
    });

    setParsedData(parsed);
    setValidationErrors(errors);
    
    // Create preview data using original Excel headers and raw values
    const previewSample = dataRows.slice(0, 5).map(row => {
      const obj: Record<string, any> = {};
      headers.forEach((header, index) => {
        const value = row[index] ? String(row[index]).trim() : '';
        obj[header] = value;
      });
      return obj;
    });
    setPreviewData(previewSample);
    
    if (errors.length === 0) {
      setActiveTab('preview');
    }
  };

  const validateStudentRow = (data: Partial<InsertStudent>): string[] => {
    const errors: string[] = [];

    // Required fields validation - only BC No is required
    if (!data.student_BC?.trim()) {
      errors.push('BC No is required');
    }

    // Note: Email and phone number are no longer stored in main fields
    // They would be in additionalData if needed

    // Guardian email validation (if provided)
    if (data.guardianEmail?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.guardianEmail.trim())) {
        errors.push('Invalid guardian email format');
      }
    }

    return errors;
  };

  const downloadSampleCSV = () => {
    const blob = new Blob([studentSampleCSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_sample.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleUpload = async () => {
    if (!parsedData || parsedData.length === 0) return;

    setIsProcessing(true);
    setUploadProgress(0);

    try {
      const validStudents = parsedData
        .filter(row => row.valid)
        .map(row => {
          const studentData = { ...row.data } as Partial<InsertStudent>;
          // Preserve status from CSV, default to 'active' if not provided
          if (!studentData.status?.trim()) {
            studentData.status = 'active';
          } else {
            // Normalize common status values
            const status = studentData.status.toLowerCase().trim();
            if (['active', 'inactive', 'transferred', 'graduated'].includes(status)) {
              studentData.status = status as any;
            } else {
              studentData.status = 'active'; // fallback for unknown values
            }
          }
          return studentData;
        });

      setUploadProgress(50);

      const response = await apiRequest('POST', '/api/students/bulk', {
        students: validStudents
      });

      setUploadProgress(100);

      toast({
        title: "Import Successful",
        description: `Successfully imported ${validStudents.length} students`,
      });

      onUploadComplete(response);
      handleClose();
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import students. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    setFile(null);
    setCsvContent('');
    setParsedData([]);
    setValidationErrors([]);
    setPreviewData([]);
    setActiveTab('upload');
    setIsProcessing(false);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>Import Student Data</span>
          </DialogTitle>
          <DialogDescription>
            Upload CSV or Excel files to import student records into the database
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload" className="flex items-center space-x-2">
                <Upload className="w-4 h-4" />
                <span>Upload</span>
              </TabsTrigger>
              <TabsTrigger value="preview" disabled={parsedData.length === 0}>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="sample">
                <FileText className="w-4 h-4 mr-2" />
                Sample
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden mt-4">
              <TabsContent value="upload" className="h-full space-y-4">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="w-5 h-5" />
                      <span>Upload Student Data</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="file-upload">Select File</Label>
                      <Input
                        id="file-upload"
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileSelect}
                        ref={fileInputRef}
                        className="mt-1"
                        data-testid="file-input-students"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Supported formats: CSV, Excel (.xlsx, .xls)
                      </p>
                    </div>

                    {file && (
                      <Alert>
                        <FileText className="h-4 w-4" />
                        <AlertDescription>
                          Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(2)} KB)
                        </AlertDescription>
                      </Alert>
                    )}

                    {validationErrors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="font-semibold mb-2">Validation Errors:</div>
                          <ul className="list-disc list-inside space-y-1">
                            {validationErrors.slice(0, 10).map((error, index) => (
                              <li key={index} className="text-sm">{error}</li>
                            ))}
                            {validationErrors.length > 10 && (
                              <li className="text-sm font-medium">
                                ... and {validationErrors.length - 10} more errors
                              </li>
                            )}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="preview" className="h-full">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Eye className="w-5 h-5" />
                        <span>Data Preview</span>
                      </div>
                      <Badge variant="secondary">
                        {parsedData.filter(p => p.valid).length} valid / {parsedData.length} total
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-full overflow-auto">
                    {previewData.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-border">
                          <thead>
                            <tr className="bg-muted">
                              {Object.keys(previewData[0]).map((header) => (
                                <th key={header} className="border border-border px-2 py-1 text-left font-medium">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.map((row, index) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                                {Object.values(row).map((value, cellIndex) => (
                                  <td key={cellIndex} className="border border-border px-2 py-1 text-sm">
                                    {String(value)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-32">
                        <p className="text-muted-foreground">No data to preview</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sample" className="h-full">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-5 h-5" />
                        <span>Sample Format</span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={downloadSampleCSV}
                        data-testid="download-sample-csv"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Sample
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Required Fields:</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          <li><code>studentId</code> - Unique student identifier</li>
                          <li><code>firstName</code> - Student's first name</li>
                          <li><code>lastName</code> - Student's last name</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Optional Fields:</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          <li><code>email</code> - Student email address</li>
                          <li><code>phoneNumber</code> - Student phone number</li>
                          <li><code>dateOfBirth</code> - Birth date (YYYY-MM-DD)</li>
                          <li><code>gender</code> - Student gender</li>
                          <li><code>grade</code> - Current grade/year</li>
                          <li><code>class</code> - Class designation</li>
                          <li><code>section</code> - Section/division</li>
                          <li><code>guardianName</code> - Parent/guardian name</li>
                          <li><code>guardianEmail</code> - Parent/guardian email</li>
                          <li><code>guardianPhone</code> - Parent/guardian phone</li>
                          <li><code>address</code> - Student address</li>
                          <li><code>emergencyContact</code> - Emergency contact name</li>
                          <li><code>emergencyPhone</code> - Emergency contact phone</li>
                          <li><code>medicalInfo</code> - Medical information/notes</li>
                        </ul>
                      </div>

                      <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                        <pre className="text-xs whitespace-pre-wrap">{studentSampleCSV}</pre>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex-1">
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="text-sm text-muted-foreground">Importing students...</div>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
              Cancel
            </Button>
            {activeTab === 'preview' && (
              <Button 
                onClick={handleUpload}
                disabled={isProcessing || validationErrors.length > 0}
                data-testid="upload-students-button"
              >
                {isProcessing ? 'Importing...' : 'Import Students'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}