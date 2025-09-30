import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Edit
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface CSVUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (data: any) => void;
  uploadType: 'questions' | 'respondents';
  formId?: string; // Required for question uploads
}

interface ParsedRow {
  index: number;
  data: any;
  valid: boolean;
  errors: string[];
}

const questionSampleCSV = `question_type,question_text,required,options,scale
text,"What is your name?",true,,
email,"What is your email address?",true,,
multipleChoice,"What is your favorite color?",false,"Red,Blue,Green,Yellow",
rating,"Rate our service",true,,5
textarea,"Any additional comments?",false,,`;

const respondentSampleCSV = `name,email,department,phone
John Doe,john.doe@example.com,IT,+1234567890
Jane Smith,jane.smith@example.com,HR,+1234567891
Bob Johnson,bob.johnson@example.com,Finance,+1234567892`;

export default function CSVUploader({ isOpen, onClose, onUploadComplete, uploadType, formId }: CSVUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState('');
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const sampleCSV = uploadType === 'questions' ? questionSampleCSV : respondentSampleCSV;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
      
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCsvContent(content);
        parseCSV(content);
      };
      reader.readAsText(selectedFile);
    }
  };

  const parseCSV = (content: string) => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      setValidationErrors(['CSV file must contain at least a header row and one data row']);
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const requiredHeaders = uploadType === 'questions' 
      ? ['question_type', 'question_text', 'required']
      : ['name', 'email'];

    // Validate headers
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      setValidationErrors([`Missing required headers: ${missingHeaders.join(', ')}`]);
      return;
    }

    const parsed: ParsedRow[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      const rowData: any = {};
      
      headers.forEach((header, index) => {
        rowData[header] = values[index] || '';
      });

      const rowErrors = validateRow(rowData, uploadType);
      parsed.push({
        index: i,
        data: rowData,
        valid: rowErrors.length === 0,
        errors: rowErrors
      });

      if (rowErrors.length > 0) {
        errors.push(`Row ${i}: ${rowErrors.join(', ')}`);
      }
    }

    setParsedData(parsed);
    setValidationErrors(errors);
    setPreviewData(parsed.slice(0, 5).map(p => p.data)); // Show first 5 for preview
    
    if (errors.length === 0) {
      setActiveTab('preview');
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result.map(item => item.replace(/^"|"$/g, ''));
  };

  const validateRow = (data: any, type: 'questions' | 'respondents'): string[] => {
    const errors: string[] = [];

    if (type === 'questions') {
      if (!data.question_type) errors.push('Question type is required');
      if (!data.question_text) errors.push('Question text is required');
      
      const validTypes = ['sls', 'text', 'email', 'phone', 'number', 'textarea', 'select', 'multipleChoice', 'checkbox', 'radio', 'rating', 'date', 'datetime', 'trueFalse'];
      if (data.question_type && !validTypes.includes(data.question_type)) {
        errors.push(`Invalid question type: ${data.question_type}`);
      }
      
      if (data.required && !['true', 'false', '1', '0'].includes(data.required.toLowerCase())) {
        errors.push('Required field must be true/false or 1/0');
      }

      // Type-specific validation
      const optionBasedTypes = ['select', 'multipleChoice', 'checkbox', 'radio'];
      if (optionBasedTypes.includes(data.question_type) && !data.options) {
        errors.push(`${data.question_type} questions require options`);
      }

      if (data.question_type === 'rating') {
        if (!data.scale) {
          errors.push('Rating questions require a scale value');
        } else {
          const scale = parseInt(data.scale);
          if (isNaN(scale) || ![3, 5, 7, 10].includes(scale)) {
            errors.push('Rating scale must be 3, 5, 7, or 10');
          }
        }
      }
    } else {
      if (!data.name) errors.push('Name is required');
      if (!data.email) errors.push('Email is required');
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (data.email && !emailRegex.test(data.email)) {
        errors.push('Invalid email format');
      }
    }

    return errors;
  };

  const handleUpload = async () => {
    if (parsedData.length === 0 || validationErrors.length > 0) {
      toast({
        title: "Cannot Upload",
        description: "Please fix validation errors first",
        variant: "destructive",
      });
      return;
    }

    if (uploadType === 'questions' && !formId) {
      toast({
        title: "Cannot Upload Questions",
        description: "No form selected for question import",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);

    try {
      const validRows = parsedData.filter(row => row.valid);
      const processedData = validRows.map(row => {
        if (uploadType === 'questions') {
          return {
            type: row.data.question_type,
            question: row.data.question_text,
            required: ['true', '1'].includes(row.data.required?.toLowerCase()),
            options: row.data.options ? row.data.options.split(',').map((opt: string) => opt.trim()).filter(Boolean) : undefined,
            scale: row.data.scale ? parseInt(row.data.scale) : undefined
          };
        } else {
          return {
            name: row.data.name,
            email: row.data.email,
            department: row.data.department || '',
            phone: row.data.phone || ''
          };
        }
      });

      setUploadProgress(25);

      // Make API call to persist data
      if (uploadType === 'questions') {
        await apiRequest('POST', `/api/forms/${formId}/questions/bulk`, { questions: processedData });
      } else {
        await apiRequest('POST', '/api/respondents/bulk', { respondents: processedData });
      }

      setUploadProgress(100);

      onUploadComplete({
        type: uploadType,
        data: processedData,
        summary: {
          total: parsedData.length,
          valid: validRows.length,
          invalid: parsedData.length - validRows.length
        }
      });

      toast({
        title: "Upload Successful",
        description: `Successfully imported ${validRows.length} ${uploadType}`,
      });

      handleClose();
    } catch (error) {
      console.error('CSV Upload Error:', error);
      toast({
        title: "Upload Failed",
        description: "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setCsvContent('');
    setParsedData([]);
    setValidationErrors([]);
    setPreviewData([]);
    setUploadProgress(0);
    setIsProcessing(false);
    setActiveTab('upload');
    onClose();
  };

  const downloadSample = () => {
    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${uploadType}_sample.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="csv-uploader-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            CSV Import - {uploadType === 'questions' ? 'Questions' : 'Respondents'}
          </DialogTitle>
          <DialogDescription>
            Import {uploadType} from a CSV file for bulk operations
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="preview" disabled={parsedData.length === 0}>Preview</TabsTrigger>
            <TabsTrigger value="process" disabled={validationErrors.length > 0}>Import</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Upload CSV File</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="csv-file">Select CSV File</Label>
                    <Input
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      ref={fileInputRef}
                      data-testid="csv-file-input"
                    />
                  </div>
                  
                  {file && (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">{file.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setFile(null);
                          setCsvContent('');
                          setParsedData([]);
                          setValidationErrors([]);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <div className="text-center">
                    <Button
                      variant="outline"
                      onClick={downloadSample}
                      className="flex items-center gap-2"
                      data-testid="download-sample-button"
                    >
                      <Download className="h-4 w-4" />
                      Download Sample CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">CSV Format Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  {uploadType === 'questions' ? (
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium">Required Headers:</h4>
                        <ul className="text-sm list-disc list-inside space-y-1">
                          <li><code>question_type</code> - Type of question</li>
                          <li><code>question_text</code> - The question content</li>
                          <li><code>required</code> - true/false or 1/0</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium">Optional Headers:</h4>
                        <ul className="text-sm list-disc list-inside space-y-1">
                          <li><code>options</code> - Comma-separated options</li>
                          <li><code>scale</code> - Rating scale (3, 5, 7, 10)</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium">Supported Question Types:</h4>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {['text', 'email', 'phone', 'number', 'textarea', 'select', 'multipleChoice', 'checkbox', 'radio', 'rating', 'date', 'datetime', 'trueFalse'].map(type => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium">Required Headers:</h4>
                        <ul className="text-sm list-disc list-inside space-y-1">
                          <li><code>name</code> - Full name</li>
                          <li><code>email</code> - Email address</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium">Optional Headers:</h4>
                        <ul className="text-sm list-disc list-inside space-y-1">
                          <li><code>department</code> - Department name</li>
                          <li><code>phone</code> - Phone number</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Validation Errors:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {validationErrors.slice(0, 5).map((error, index) => (
                        <li key={index} className="text-sm">{error}</li>
                      ))}
                      {validationErrors.length > 5 && (
                        <li className="text-sm">... and {validationErrors.length - 5} more errors</li>
                      )}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Data Preview</h3>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {parsedData.filter(r => r.valid).length} Valid
                </Badge>
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {parsedData.filter(r => !r.valid).length} Invalid
                </Badge>
              </div>
            </div>

            {previewData.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          {Object.keys(previewData[0]).map((header) => (
                            <th key={header} className="text-left p-2 font-medium">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, index) => (
                          <tr key={index} className="border-b">
                            {Object.values(row).map((value: any, cellIndex) => (
                              <td key={cellIndex} className="p-2">
                                {value?.toString() || ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedData.length > 5 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Showing first 5 rows of {parsedData.length} total
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="process" className="space-y-4">
            <div className="text-center space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Ready to Import</h3>
                <p className="text-muted-foreground">
                  {parsedData.filter(r => r.valid).length} {uploadType} will be imported
                </p>
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-sm text-muted-foreground">
                    Processing... {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {activeTab === 'upload' && parsedData.length > 0 && validationErrors.length === 0 && (
            <Button onClick={() => setActiveTab('preview')}>
              Preview Data
            </Button>
          )}
          {activeTab === 'preview' && (
            <Button onClick={() => setActiveTab('process')}>
              Proceed to Import
            </Button>
          )}
          {activeTab === 'process' && (
            <Button 
              onClick={handleUpload}
              disabled={isProcessing || validationErrors.length > 0}
              data-testid="upload-csv-button"
            >
              {isProcessing ? 'Importing...' : 'Import CSV'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}