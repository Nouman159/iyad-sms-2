import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Download, FileText, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import type { Form, FormResponse } from '@shared/schema';

interface FormResponsesParams {
  id: string;
}

export default function FormResponses() {
  const params = useParams<FormResponsesParams>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const formId = params?.id;

  // Fetch form details
  const { data: form, isLoading: formLoading, isError: formError, error: formErrorObj } = useQuery<Form>({
    queryKey: [`/api/forms/${formId}`],
    enabled: !!formId,
    retry: false,
  });

  // Fetch form responses
  const { data: responses = [], isLoading: responsesLoading, isError: responsesError, error: responsesErrorObj } = useQuery<FormResponse[]>({
    queryKey: [`/api/forms/${formId}/responses`],
    enabled: !!formId,
    retry: false,
  });

  const exportResponsesToCSV = () => {
    if (responses.length === 0) {
      toast({
        title: "No Data to Export",
        description: "No responses available to export",
        variant: "destructive",
      });
      return;
    }

    try {
      // Extract all unique question keys from responses
      const allKeys = new Set<string>();
      responses.forEach(response => {
        if (response.responses && typeof response.responses === 'object') {
          Object.keys(response.responses).forEach(key => allKeys.add(key));
        }
      });

      const headers = ['Response ID', 'Submitted At', ...Array.from(allKeys)];
      const accessors = ['id', 'submittedAt', ...Array.from(allKeys)];
      const csvData = responses.map(response => {
        const row: any = {
          id: response.id,
          submittedAt: response.submittedAt ? new Date(response.submittedAt).toLocaleString() : 'N/A',
        };
        
        // Add response data
        if (response.responses && typeof response.responses === 'object') {
          allKeys.forEach(key => {
            row[key] = (response.responses as any)[key] || '';
          });
        } else {
          allKeys.forEach(key => {
            row[key] = '';
          });
        }
        
        return row;
      });

      const csvContent = [
        headers.join(','),
        ...csvData.map(row => accessors.map(accessor => {
          const value = row[accessor] || '';
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(','))
      ].join('\n');

      // Add BOM for Excel compatibility
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      a.href = url;
      const sanitizedName = (form?.name || 'form').replace(/[^a-zA-Z0-9-_]/g, '_');
      a.download = `${sanitizedName}_responses_${new Date().toISOString().split('T')[0]}.csv`;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Responses exported to CSV file (${responses.length} responses)`,
      });
    } catch (error) {
      console.error('CSV Export Error:', error);
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting CSV",
        variant: "destructive",
      });
    }
  };

  // Handle authentication errors
  if (formError || responsesError) {
    const error = formErrorObj || responsesErrorObj;
    if (error && isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return null;
    }
  }

  if (formLoading || responsesLoading) {
    return (
      <div className="p-6" data-testid="responses-loading">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Handle form not found or error states
  if (!form || formError) {
    return (
      <div className="p-6" data-testid="form-not-found">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {formError ? 'Error loading form' : 'Form not found'}
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                {formError 
                  ? 'There was an error loading the form. Please try again.'
                  : 'The requested form could not be found.'
                }
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setLocation('/apps/forms')}
                  variant="outline"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Forms
                </Button>
                {formError && (
                  <Button 
                    onClick={() => window.location.reload()}
                    data-testid="retry-button"
                  >
                    Retry
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Sort responses by submitted date (newest first) and extract question keys
  const sortedResponses = [...responses].sort((a, b) => {
    const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return dateB - dateA;
  });

  // Extract unique question keys for table columns
  const questionKeys = new Set<string>();
  sortedResponses.forEach(response => {
    if (response.responses && typeof response.responses === 'object') {
      Object.keys(response.responses).forEach(key => questionKeys.add(key));
    }
  });
  const columns = Array.from(questionKeys);

  return (
    <div className="p-6" data-testid="form-responses-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setLocation('/apps/forms')}
              data-testid="back-to-forms"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Forms
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{form.name} - Responses</h1>
              <p className="text-muted-foreground">
                {form.description || 'View and manage form responses'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={form.status === 'active' ? 'default' : 'secondary'}>
              {form.status}
            </Badge>
            <Button 
              variant="outline" 
              onClick={exportResponsesToCSV}
              className="flex items-center gap-2"
              data-testid="export-responses-csv"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Responses</p>
                  <p className="text-2xl font-bold">{responses.length}</p>
                </div>
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Last Response</p>
                  <p className="text-2xl font-bold">
                    {sortedResponses.length > 0 && sortedResponses[0]?.submittedAt 
                      ? new Date(sortedResponses[0].submittedAt).toLocaleDateString()
                      : 'N/A'
                    }
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card data-testid="questions-count-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Questions</p>
                  <p className="text-2xl font-bold" data-testid="questions-count">
                    {form.questions && Array.isArray(form.questions) 
                      ? form.questions.length 
                      : columns.length || 0
                    }
                  </p>
                </div>
                <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="form-status-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Form Status</p>
                  <p className="text-2xl font-bold capitalize" data-testid="form-status">
                    {form.status || 'Unknown'}
                  </p>
                </div>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  form.status === 'active' ? 'bg-green-100 text-green-600' : 
                  form.status === 'inactive' ? 'bg-red-100 text-red-600' : 
                  'bg-gray-100 text-gray-600'
                }`}>
                  <div className="h-3 w-3 rounded-full bg-current"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Responses Table */}
        <Card>
          <CardHeader>
            <CardTitle>Form Responses</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedResponses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No responses yet</h3>
                <p className="text-muted-foreground text-center">
                  {responsesError 
                    ? 'Error loading responses. Please refresh the page to try again.'
                    : 'Responses will appear here once people submit your form.'
                  }
                </p>
                {responsesError && (
                  <Button 
                    onClick={() => window.location.reload()}
                    className="mt-4"
                    data-testid="refresh-page-button"
                  >
                    Refresh Page
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Response ID</TableHead>
                      <TableHead className="w-48">Submitted At</TableHead>
                      {columns.map((column) => (
                        <TableHead key={column} className="min-w-32">
                          <span className="font-medium truncate" title={column}>
                            {column}
                          </span>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedResponses.map((response) => (
                      <TableRow 
                        key={response.id} 
                        data-testid={`response-row-${response.id}`}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <TableCell className="font-mono text-sm">
                          <span 
                            className="text-muted-foreground hover:text-foreground cursor-pointer" 
                            title={`Full ID: ${response.id}`}
                          >
                            {response.id.slice(-8)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {response.submittedAt 
                            ? new Date(response.submittedAt).toLocaleString(undefined, {
                                year: 'numeric',
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'N/A'
                          }
                        </TableCell>
                        {columns.map((column) => (
                          <TableCell key={column} className="max-w-xs">
                            <div className="truncate" title={
                              response.responses && typeof response.responses === 'object'
                                ? String((response.responses as any)[column] || '')
                                : ''
                            }>
                              {response.responses && typeof response.responses === 'object'
                                ? String((response.responses as any)[column] || '—')
                                : '—'
                              }
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}