import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileText, CheckCircle, BarChart3, Edit, Eye, Trash2, Brain, Upload, Download, MoreVertical, Users, Plus } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import CSVUploader from '@/components/CSVUploader';
import type { Form } from '@shared/schema';

export default function Forms() {
  const [isCSVUploaderOpen, setIsCSVUploaderOpen] = useState(false);
  const [csvUploadType, setCsvUploadType] = useState<'questions' | 'respondents'>('questions');
  const [selectedFormForImport, setSelectedFormForImport] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch forms
  const { data: formsData = [], isLoading } = useQuery<Form[]>({
    queryKey: ['/api/forms'],
    retry: false,
  });

  // Sort forms by latest update (updatedAt desc, then createdAt desc as fallback)
  const forms = [...formsData].sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return dateB - dateA;
  });


  const handleCSVUpload = (uploadData: any) => {
    console.log('CSV Upload completed:', uploadData);
    // Invalidate queries to refresh the forms list
    if (uploadData.type === 'questions') {
      queryClient.invalidateQueries({ queryKey: ['/api/forms'] });
    }
    setIsCSVUploaderOpen(false);
    setSelectedFormForImport(null);
    toast({
      title: "CSV Import Successful",
      description: `Successfully imported ${uploadData.data.length} ${uploadData.type}`,
    });
  };

  const exportFormsToCSV = () => {
    if (forms.length === 0) {
      toast({
        title: "No Data to Export",
        description: "Create some forms first before exporting",
        variant: "destructive",
      });
      return;
    }

    try {
      const csvData = forms.map(form => ({
        name: form.name,
        description: form.description || '',
        type: form.formType,
        status: form.status,
        created: form.createdAt ? new Date(form.createdAt).toLocaleDateString() : 'N/A',
        questions: form.questions ? (Array.isArray(form.questions) && form.questions.length > 0 ? 'Yes' : 'No') : 'No'
      }));

      const headers = ['Name', 'Description', 'Type', 'Status', 'Created', 'Has Questions'];
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => [
          `"${row.name.replace(/"/g, '""')}"`,
          `"${row.description.replace(/"/g, '""')}"`,
          row.type,
          row.status,
          row.created,
          row.questions
        ].join(','))
      ].join('\n');

      // Add BOM for Excel compatibility
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      // Set download attributes
      a.href = url;
      a.download = `forms_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.style.display = 'none';
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Forms data exported to CSV file (${forms.length} forms)`,
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

  // Delete form mutation
  const deleteFormMutation = useMutation({
    mutationFn: async (formId: string) => {
      await apiRequest('DELETE', `/api/forms/${formId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/forms'] });
      toast({
        title: "Success",
        description: "Form deleted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete form",
        variant: "destructive",
      });
    },
  });

  const handleDeleteForm = (formId: string) => {
    if (confirm('Are you sure you want to delete this form?')) {
      deleteFormMutation.mutate(formId);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'draft':
        return <Badge className="bg-yellow-100 text-yellow-800">Draft</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6" data-testid="forms-loading">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="forms-page">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Forms</h1>
            <p className="text-muted-foreground">Create intelligent forms with AI assistance and bulk operations</p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Import CSV
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem 
                  onClick={() => {
                    if (forms.length === 0) {
                      toast({
                        title: "No Forms Available",
                        description: "Create a form first before importing questions",
                        variant: "destructive",
                      });
                      return;
                    }
                    // For simplicity, use the first form or let user pick later
                    setSelectedFormForImport(forms[0]?.id || null);
                    setCsvUploadType('questions');
                    setIsCSVUploaderOpen(true);
                  }}
                  data-testid="import-questions-csv"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Import Questions
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    setCsvUploadType('respondents');
                    setIsCSVUploaderOpen(true);
                  }}
                  data-testid="import-respondents-csv"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Import Respondents
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="outline" 
              onClick={exportFormsToCSV}
              className="flex items-center gap-2"
              data-testid="export-forms-csv"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            
            <Button 
              variant="outline"
              className="flex items-center gap-2" 
              onClick={() => setLocation('/apps/forms/builder')}
              data-testid="create-form-button"
            >
              <Plus className="h-4 w-4" />
              Create Your Form
            </Button>
            
            <Button 
              className="flex items-center gap-2" 
              onClick={() => setLocation('/apps/forms/builder')}
              data-testid="ai-form-builder-button"
            >
              <Brain className="h-4 w-4" />
              AI Form Builder
            </Button>
          </div>
        </div>


        {/* Forms List */}
        <div className="space-y-4">
          {forms.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No forms yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first form using our AI-powered form builder
                </p>
                <Button onClick={() => setLocation('/apps/forms/builder')} className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Create Your First Form
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {forms.map((form) => (
                <Card key={form.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{form.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {form.description || 'No description'}
                        </p>
                      </div>
                      {getStatusBadge(form.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <span>Type: {form.formType}</span>
                      <span>{form.createdAt ? new Date(form.createdAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          if (form.formUrl) {
                            // Open public form in new tab
                            window.open(`/${form.formUrl}`, '_blank');
                          } else {
                            toast({
                              title: "Form Preview Not Available",
                              description: "This form doesn't have a public URL yet",
                              variant: "destructive"
                            });
                          }
                        }}
                        data-testid={`view-form-${form.id}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          setLocation(`/apps/forms/edit/${form.id}`);
                        }}
                        data-testid={`edit-form-${form.id}`}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          setLocation(`/apps/forms/responses/${form.id}`);
                        }}
                        data-testid={`responses-form-${form.id}`}
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Responses
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleDeleteForm(form.id)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`delete-form-${form.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>


        {/* CSV Uploader Modal */}
        <CSVUploader
          isOpen={isCSVUploaderOpen}
          onClose={() => {
            setIsCSVUploaderOpen(false);
            setSelectedFormForImport(null);
          }}
          onUploadComplete={handleCSVUpload}
          uploadType={csvUploadType}
          formId={selectedFormForImport || undefined}
        />
      </div>
    </div>
  );
}