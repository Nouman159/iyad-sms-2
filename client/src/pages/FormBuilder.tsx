import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useGuardedNavigation } from '@/hooks/use-guarded-navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Brain,
  Plus,
  Trash2,
  Move,
  Eye,
  Settings,
  FileText,
  Calendar,
  Phone,
  Mail,
  Hash,
  AlignLeft,
  CheckSquare,
  ToggleLeft,
  Star,
  Clock,
  Copy,
  Upload,
  Save,
  ArrowLeft,
  Bold,
  Italic,
  Type,
  ExternalLink,
  Send,
  ChevronDown,
  ChevronRight,
  Users
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ObjectUploader } from '@/components/ObjectUploader';

const questionTypeIcons = {
  sls: CheckSquare,
  text: FileText,
  email: Mail,
  phone: Phone,
  number: Hash,
  textarea: AlignLeft,
  select: ToggleLeft,
  multipleChoice: CheckSquare,
  checkbox: CheckSquare,
  radio: CheckSquare,
  rating: Star,
  date: Calendar,
  datetime: Clock,
  trueFalse: ToggleLeft,
  bcInput: Hash
};

const questionTypes = [
  { value: 'sls', label: 'SLS', icon: CheckSquare },
  { value: 'text', label: 'Text Input', icon: FileText },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'textarea', label: 'Long Text', icon: AlignLeft },
  { value: 'select', label: 'Dropdown', icon: ToggleLeft },
  { value: 'multipleChoice', label: 'Multiple Choice', icon: CheckSquare },
  { value: 'checkbox', label: 'Checkboxes', icon: CheckSquare },
  { value: 'radio', label: 'Radio Buttons', icon: CheckSquare },
  { value: 'rating', label: 'Rating Scale', icon: Star },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'datetime', label: 'Date & Time', icon: Clock },
  { value: 'trueFalse', label: 'True/False', icon: ToggleLeft },
  { value: 'bcInput', label: 'BC Number Input', icon: Hash }
];

interface Question {
  questionId: string;
  questionNo: number;
  type: string;
  question: string;
  required: boolean;
  options?: string[];
  scale?: number;
  sectionId?: string;
}

interface Section {
  id: string;
  title: string;
  name?: string;
  description?: string;
  order: number;
}

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  formType: z.string().min(1, "Form type is required"),
  formUrl: z.string().optional(),
  welcomeMessage: z.string().optional(),
  submissionType: z.string().optional(),
  allowEditResponse: z.boolean().optional(),
  submissionDeadline: z.date().optional(),
  liveStatus: z.string().optional(),
});

type CreateFormData = z.infer<typeof formSchema>;

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  'data-testid'?: string;
}

const RichTextEditor = ({ value, onChange, placeholder, 'data-testid': testId }: RichTextEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [fontSize, setFontSize] = useState('14');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  // Extract plain text from HTML value for textarea
  const getPlainText = (htmlValue: string) => {
    if (!htmlValue) return '';
    
    // Remove HTML tags and decode entities
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlValue;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  // Apply formatting to selected text or entire content
  const formatText = (formatType: 'bold' | 'italic') => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);
    
    let formattedText = '';
    let newCursorPos = start;
    
    if (selectedText) {
      // Format selected text
      if (formatType === 'bold') {
        formattedText = `<strong>${selectedText}</strong>`;
        setIsBold(!isBold);
      } else if (formatType === 'italic') {
        formattedText = `<em>${selectedText}</em>`;
        setIsItalic(!isItalic);
      }
      newCursorPos = start + formattedText.length;
    } else {
      // No selection, toggle format state for next typing
      if (formatType === 'bold') {
        setIsBold(!isBold);
      } else if (formatType === 'italic') {
        setIsItalic(!isItalic);
      }
      return;
    }
    
    const newValue = beforeText + formattedText + afterText;
    const wrappedContent = `<div style="font-size:${fontSize}px">${newValue}</div>`;
    
    // Update the textarea and form value
    textarea.value = newValue;
    onChange(wrappedContent);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    const wrappedContent = content ? `<div style="font-size:${fontSize}px">${content}</div>` : '';
    onChange(wrappedContent);
    adjustTextareaHeight(e.target);
  };

  // Auto-resize textarea
  const adjustTextareaHeight = (element?: HTMLTextAreaElement) => {
    const textarea = element || textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.max(120, textarea.scrollHeight) + 'px';
    }
  };

  const handleFontSizeChange = (newSize: string) => {
    setFontSize(newSize);
    if (textareaRef.current) {
      const content = textareaRef.current.value;
      const wrappedContent = content ? `<div style="font-size:${newSize}px">${content}</div>` : '';
      onChange(wrappedContent);
    }
  };

  // Initialize textarea with plain text from HTML value
  useEffect(() => {
    if (value) {
      const match = value.match(/<div style="font-size:(\d+)px">([\s\S]*)<\/div>/);
      if (match) {
        const [, savedSize, content] = match;
        setFontSize(savedSize);
        if (textareaRef.current && textareaRef.current.value !== getPlainText(content)) {
          textareaRef.current.value = getPlainText(content);
          adjustTextareaHeight();
        }
      } else {
        if (textareaRef.current && textareaRef.current.value !== getPlainText(value)) {
          textareaRef.current.value = getPlainText(value);
          adjustTextareaHeight();
        }
      }
    } else if (textareaRef.current && textareaRef.current.value) {
      textareaRef.current.value = '';
      adjustTextareaHeight();
    }
  }, [value]);

  // Adjust height on mount
  useEffect(() => {
    adjustTextareaHeight();
  }, []);

  return (
    <div className="border rounded-md">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText('bold')}
          className={`h-8 w-8 p-0 ${isBold ? 'bg-muted' : ''}`}
          data-testid="bold-button"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText('italic')}
          className={`h-8 w-8 p-0 ${isItalic ? 'bg-muted' : ''}`}
          data-testid="italic-button"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4" />
          <Select value={fontSize} onValueChange={handleFontSizeChange}>
            <SelectTrigger className="w-16 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12</SelectItem>
              <SelectItem value="14">14</SelectItem>
              <SelectItem value="16">16</SelectItem>
              <SelectItem value="18">18</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="24">24</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Simple Textarea Editor */}
      <Textarea
        ref={textareaRef}
        onChange={handleTextareaChange}
        placeholder={placeholder}
        className="border-0 resize-none focus:ring-0 rounded-none"
        style={{ 
          fontSize: `${fontSize}px`,
          minHeight: '120px'
        }}
        data-testid={testId}
        onInput={(e) => {
          adjustTextareaHeight(e.target as HTMLTextAreaElement);
        }}
        onBlur={(e) => {
          adjustTextareaHeight(e.target as HTMLTextAreaElement);
        }}
      />
    </div>
  );
};

// Helper function to format date and time as requested
const formatDateTime = (dateString: string | Date) => {
  const date = new Date(dateString);
  
  // Format date as dd mmm yyyy
  const day = date.getDate().toString().padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  
  // Format time as hh:mm am/pm
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const formattedHours = hours.toString().padStart(2, '0');
  
  return `${day} ${month} ${year} ${formattedHours}:${minutes} ${ampm}`;
};

export default function FormBuilder() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sections, setSections] = useState<Section[]>([
    { id: 'default', title: 'Section 1', name: '', order: 0 }
  ]);
  const [activeTab, setActiveTab] = useState('basic');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [urlValidation, setUrlValidation] = useState<{
    isChecking: boolean;
    isValid: boolean | null;
    message: string;
  }>({
    isChecking: false,
    isValid: null,
    message: ''
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormId, setEditFormId] = useState<string | null>(null);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [loadedFormData, setLoadedFormData] = useState<any>(null);
  const queryClient = useQueryClient();
  const pendingNavigationRef = useRef<string | null>(null);
  const builderUrlRef = useRef<string>('');

  // Manage Respondents state
  const [hierarchicalData, setHierarchicalData] = useState<{
    [centre: string]: {
      [level: string]: {
        [className: string]: {
          student_BC: string;
          fullName: string;
          selected: boolean;
        }[];
      };
    };
  }>({});
  const [expandedCentres, setExpandedCentres] = useState<Set<string>>(new Set());
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
  const [selectedRespondents, setSelectedRespondents] = useState<Set<string>>(new Set());

  // Form completion validation
  const isFormComplete = () => {
    const values = form.getValues();
    
    // Check Basic Info fields
    const hasTitle = values.title?.trim();
    const hasDescription = values.description?.trim();
    const hasFormType = values.formType;
    const hasFormUrl = values.formUrl?.trim();
    
    // Check if at least one question exists
    const hasQuestions = questions.length > 0;
    
    // Check Settings (for parents_survey form type)
    let hasValidSettings = true;
    if (values.formType === 'parents_survey') {
      hasValidSettings = !!(values.submissionType && values.liveStatus);
    }
    
    return hasTitle && hasDescription && hasFormType && hasFormUrl && hasQuestions && hasValidSettings;
  };

  const getIncompleteFields = () => {
    const values = form.getValues();
    const missing = [];
    
    if (!values.title?.trim()) missing.push('Form Title');
    if (!values.description?.trim()) missing.push('Description');
    if (!values.formType) missing.push('Form Type');
    if (!values.formUrl?.trim()) missing.push('Form URL');
    if (questions.length === 0) missing.push('At least one question');
    
    if (values.formType === 'parents_survey') {
      if (!values.submissionType) missing.push('Submission Type');
      if (!values.liveStatus) missing.push('Live Status');
    }
    
    return missing;
  };

  // URL validation function
  const validateFormUrl = async (url: string) => {
    if (!url.trim()) {
      setUrlValidation({
        isChecking: false,
        isValid: null,
        message: ''
      });
      return;
    }

    // Basic URL validation - only alphanumeric, underscore, and hyphen
    const urlPattern = /^[a-zA-Z0-9_-]+$/;
    if (!urlPattern.test(url)) {
      setUrlValidation({
        isChecking: false,
        isValid: false,
        message: 'URL can only contain letters, numbers, underscores, and hyphens'
      });
      return;
    }

    setUrlValidation({
      isChecking: true,
      isValid: null,
      message: 'Checking URL availability...'
    });

    try {
      // Check if URL is available
      const response = await fetch(`/api/forms/check-url/${encodeURIComponent(url)}`);
      const data = await response.json();
      
      if (response.ok && data.available) {
        setUrlValidation({
          isChecking: false,
          isValid: true,
          message: `URL will be: /${url}`
        });
      } else {
        setUrlValidation({
          isChecking: false,
          isValid: false,
          message: data.message || 'URL is not available'
        });
      }
    } catch (error) {
      setUrlValidation({
        isChecking: false,
        isValid: false,
        message: 'Error checking URL availability'
      });
    }
  };

  // Guarded navigation utility for programmatic navigation
  const guardedNavigate = useGuardedNavigation({
    hasUnsavedChanges,
    onNavigationBlocked: (targetPath: string) => {
      setPendingNavigation(targetPath);
      setShowExitDialog(true);
    },
  });

  const form = useForm<CreateFormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      description: '',
      formType: '',
      submissionType: 'one_per_child',
      allowEditResponse: false,
      submissionDeadline: undefined,
      liveStatus: 'open',
    }
  });

  const { reset, handleSubmit, watch } = form;

  // Detect edit mode from URL
  useEffect(() => {
    const currentPath = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    
    // Check for URL pattern: /apps/forms/edit/{formId}
    const editMatch = currentPath.match(/\/apps\/forms\/edit\/(.+)$/);
    if (editMatch) {
      setIsEditMode(true);
      setEditFormId(editMatch[1]);
      return;
    }
    
    // Check for query parameter: ?id={formId}
    const formIdFromQuery = searchParams.get('id');
    if (formIdFromQuery) {
      setIsEditMode(true);
      setEditFormId(formIdFromQuery);
      return;
    }
  }, []);

  // Load form data when in edit mode
  useEffect(() => {
    if (isEditMode && editFormId) {
      setIsLoadingForm(true);
      fetch(`/api/forms/${editFormId}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch form');
          }
          return response.json();
        })
        .then(formData => {
          // Store the loaded form data
          setLoadedFormData(formData);
          
          // Populate form with existing data
          form.reset({
            title: formData.title || '',
            description: formData.description || '',
            formType: formData.formType || '',
            formUrl: formData.formUrl || '',
            welcomeMessage: formData.settings?.welcomeMessage || '',
            submissionType: formData.settings?.submissionType || 'one_per_child',
            allowEditResponse: formData.settings?.allowEditResponse || false,
            submissionDeadline: formData.settings?.submissionDeadline ? new Date(formData.settings.submissionDeadline) : undefined,
            liveStatus: formData.settings?.liveStatus || 'open',
          });
          
          // Load questions
          if (formData.questions && Array.isArray(formData.questions)) {
            // Handle legacy questions with 'id' field, convert to new format, and normalize SLS questions
            const normalizedQuestions = formData.questions.map((q: any, index: number) => {
              const normalized = {
                ...q,
                questionId: q.questionId || q.id || Date.now().toString() + index,
                questionNo: q.questionNo || index + 1
              };
              
              // Normalize SLS questions: ensure required=true and proper options
              if (normalized.type === 'sls') {
                normalized.required = true;
                normalized.options = ['Strongly Agree', 'Agree', 'Disagree', 'Strongly Disagree'];
              }
              
              return normalized;
            });
            // Ensure questions have sequential numbering when loaded
            const renumberedQuestions = renumberAllQuestions(normalizedQuestions);
            setQuestions(renumberedQuestions);
          }

          // Load sections
          if (formData.sections && Array.isArray(formData.sections)) {
            setSections(formData.sections);
          } else if (questions.length > 0) {
            // If no sections but questions exist, assign them to default section
            const defaultSection = { id: 'default', title: 'Section 1', name: '', order: 0 };
            setSections([defaultSection]);
            setQuestions(questions.map(q => ({ ...q, sectionId: q.sectionId || 'default' })));
          }

          // Load icon URL if it exists in settings  
          if (formData.settings?.iconUrl) {
            setIconPreview(formData.settings.iconUrl);
            setIconUrl(formData.settings.iconUrl);
          } else if (formData.settings?.iconData) {
            // Fallback for legacy base64 data
            setIconPreview(formData.settings.iconData);
          }
          
          setIsLoadingForm(false);
          setHasUnsavedChanges(false);
        })
        .catch(error => {
          console.error('Error loading form:', error);
          toast({
            title: "Error",
            description: "Failed to load form data",
            variant: "destructive",
          });
          setIsLoadingForm(false);
          setLocation('/apps/forms'); // Redirect back to forms list
        });
    }
  }, [isEditMode, editFormId, form, toast, setLocation]);

  // Track changes for unsaved changes warning
  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      setHasUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  // Prevent browser navigation if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Create guard entry once on mount
  useEffect(() => {
    // Store the builder URL for restoration
    builderUrlRef.current = window.location.pathname + window.location.search + window.location.hash;
    
    // Replace current state with guard marker to avoid stack growth
    window.history.replaceState({ guard: true }, '', builderUrlRef.current);

    return () => {
      // Cleanup: Remove guard marker without affecting navigation
      if (window.history.state?.guard) {
        window.history.replaceState(null, '', builderUrlRef.current);
      }
    };
  }, []);

  // Intercept back/forward navigation attempts
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (hasUnsavedChanges && !e.state?.guard) {
        // Capture the intended navigation target (where we just navigated to)
        const targetUrl = window.location.href;
        
        // Extract builder path for router navigation
        const builderUrl = new URL(builderUrlRef.current, window.location.origin);
        const builderPath = builderUrl.pathname + builderUrl.search + builderUrl.hash;
        
        // Use router navigation to restore the builder, ensuring component stays mounted
        setLocation(builderPath, { replace: true });
        
        // Store full target URL for later navigation
        setPendingNavigation(targetUrl);
        setShowExitDialog(true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [hasUnsavedChanges, setLocation]);

  // Intercept all click-based navigation attempts
  useEffect(() => {
    const handleNavigationClick = (e: Event) => {
      if (!hasUnsavedChanges) return;

      const target = e.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (link && link.href && !link.href.startsWith('javascript:') && !link.href.startsWith('#')) {
        // Allow target="_blank" links (new tab/window)
        if (link.target === '_blank') return;
        
        // Allow modifier key navigation (new tab/window behaviors)
        if (e instanceof MouseEvent && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return;
        
        const currentUrl = window.location.href;
        const linkUrl = link.href;
        
        // Only intercept if navigating away from current page in same tab
        if (linkUrl !== currentUrl) {
          e.preventDefault();
          e.stopPropagation();
          
          // Store the full intended navigation destination
          setPendingNavigation(linkUrl);
          setShowExitDialog(true);
        }
      }
    };

    // Add event listener for all clicks to intercept navigation
    document.addEventListener('click', handleNavigationClick, true);
    
    return () => {
      document.removeEventListener('click', handleNavigationClick, true);
    };
  }, [hasUnsavedChanges]);

  // Auto-resize description textarea
  const adjustTextareaHeight = (element?: HTMLTextAreaElement) => {
    const textarea = element || document.getElementById('description') as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  };

  // Watch for description changes and adjust height
  const descriptionValue = watch('description');
  useEffect(() => {
    adjustTextareaHeight();
  }, [descriptionValue]);

  // Adjust height on component mount
  useEffect(() => {
    adjustTextareaHeight();
  }, []);

  // Handle icon upload
  const [iconUrl, setIconUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const handleGetUploadParameters = async () => {
    try {
      const response = await apiRequest('POST', '/api/objects/upload');
      const data = await response.json();
      return {
        method: 'PUT' as const,
        url: data.uploadURL
      };
    } catch (error) {
      console.error('Error getting upload parameters:', error);
      throw error;
    }
  };

  const handleUploadComplete = async (result: any) => {
    try {
      setIsUploading(true);
      const uploadedFiles = result.successful;
      if (uploadedFiles.length > 0) {
        const uploadURL = uploadedFiles[0].uploadURL;
        
        // Convert Google Cloud Storage URL to serving path
        const convertToServingUrl = (uploadUrl: string): string => {
          console.log('Original upload URL:', uploadUrl);
          
          if (!uploadUrl.startsWith("https://storage.googleapis.com/")) {
            return uploadUrl;
          }
          
          // Extract the path from the URL
          const url = new URL(uploadUrl);
          const rawObjectPath = url.pathname;
          console.log('Raw object path:', rawObjectPath);
          
          // The object path should be something like: /bucket-name/.private/uploads/some-id
          // We need to extract everything after the bucket name
          const pathParts = rawObjectPath.split('/').filter(part => part !== '');
          console.log('Path parts:', pathParts);
          
          // Remove bucket name (first part) and keep the rest
          if (pathParts.length > 1) {
            const objectPath = '/' + pathParts.slice(1).join('/');
            console.log('Object path for serving:', `/objects${objectPath}`);
            return `/objects${objectPath}`;
          }
          
          return uploadUrl;
        };
        
        const servingUrl = convertToServingUrl(uploadURL);
        
        // Set the icon URL and preview
        setIconUrl(uploadURL); // Keep original URL for form data
        setIconPreview(servingUrl); // Use serving URL for preview
        setHasUnsavedChanges(true);
        
        toast({
          title: "Success",
          description: "Icon uploaded successfully!",
        });
      }
    } catch (error) {
      console.error('Error handling upload:', error);
      toast({
        title: "Error", 
        description: "Failed to process uploaded icon",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const createFormMutation = useMutation({
    mutationFn: async (data: CreateFormData) => {
      const url = isEditMode ? `/api/forms/${editFormId}` : '/api/forms';
      const method = isEditMode ? 'PUT' : 'POST';
      
      // Prepare settings object containing welcome message and other settings
      const settings = {
        welcomeMessage: data.welcomeMessage || '',
        submissionType: data.submissionType,
        allowEditResponse: data.allowEditResponse,
        submissionDeadline: data.submissionDeadline,
        liveStatus: data.liveStatus,
        iconData: null as string | null,
        iconUrl: null as string | null,
        selectedRespondents: Array.from(selectedRespondents),
      };

      // Include icon URL in settings if available
      if (iconUrl) {
        settings.iconUrl = iconUrl;
      }
      
      // Remove settings fields from top level and nest them properly
      const { welcomeMessage, submissionType, allowEditResponse, submissionDeadline, liveStatus, ...otherData } = data;
      
      const response = await apiRequest(method, url, {
        ...otherData,
        questions: questions,
        sections: sections,
        settings: settings
      });
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Form ${isEditMode ? 'updated' : 'created'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/forms'] });
      if (isEditMode && editFormId) {
        queryClient.invalidateQueries({ queryKey: ['/api/forms', editFormId] });
      }
      setHasUnsavedChanges(false);
      
      // Only navigate away if there's a pending navigation (Save & Exit scenario)
      const targetNavigation = pendingNavigationRef.current;
      if (targetNavigation) {
        try {
          const targetUrl = new URL(targetNavigation);
          const currentOrigin = window.location.origin;
          
          if (targetUrl.origin === currentOrigin) {
            // Same origin - use wouter navigation with full path
            const fullPath = targetUrl.pathname + targetUrl.search + targetUrl.hash;
            setLocation(fullPath);
          } else {
            // Different origin - use window.location
            window.location.href = targetNavigation;
          }
        } catch {
          // Invalid URL - fallback to Forms page
          setLocation('/apps/forms');
        }
        pendingNavigationRef.current = null;
      }
      // If no pendingNavigation, remain on the builder (normal save behavior)
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || `Failed to ${isEditMode ? 'update' : 'create'} form`,
      });
    }
  });

  const preparePreviewMutation = useMutation({
    mutationFn: async (formId: string) => {
      const response = await apiRequest('POST', `/api/forms/${formId}/prepare-preview`, {});
      return await response.json();
    },
    onSuccess: () => {
      // Preview prepared successfully - open preview URL
      const formUrl = form.getValues().formUrl;
      if (formUrl) {
        window.open(`/preview/${formUrl}`, '_blank');
      }
    },
    onError: (error: any) => {
      console.error('Prepare preview error:', error);
      toast({
        title: "Preview Failed",
        description: error.message || "Failed to prepare preview",
        variant: "destructive",
      });
    },
  });

  const publishFormMutation = useMutation({
    mutationFn: async (data: CreateFormData) => {
      const url = `/api/forms/${editFormId}`;
      
      // Prepare settings object with live status set to open
      const settings = {
        welcomeMessage: data.welcomeMessage || '',
        submissionType: data.submissionType,
        allowEditResponse: data.allowEditResponse,
        submissionDeadline: data.submissionDeadline,
        liveStatus: 'open', // Set live status to open for published forms
        iconData: null as string | null,
        iconUrl: null as string | null,
        selectedRespondents: Array.from(selectedRespondents),
      };

      // Include icon URL in settings if available
      if (iconUrl) {
        settings.iconUrl = iconUrl;
      }
      
      // Remove settings fields from top level and nest them properly
      const { welcomeMessage, submissionType, allowEditResponse, submissionDeadline, liveStatus, ...otherData } = data;
      
      const response = await apiRequest('PUT', url, {
        ...otherData,
        status: 'active', // Set status to active (published)
        questions: questions,
        sections: sections,
        settings: settings
      });
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Form Published!",
        description: "Your form is now live and accessible to the public.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/forms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/forms', editFormId] });
      setHasUnsavedChanges(false);
      
      // Open the public form URL in a new tab
      const formUrl = form.getValues().formUrl;
      if (formUrl) {
        window.open(`/${formUrl}`, '_blank');
      } else {
        toast({
          title: "Warning",
          description: "Form URL is missing. Please check your form settings.",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      console.error('Form publish error:', error);
      toast({
        title: "Publishing Failed",
        description: error.message || "Failed to publish form",
        variant: "destructive",
      });
    },
  });

  const handleBack = () => {
    if (hasUnsavedChanges) {
      setPendingNavigation(window.location.origin + '/apps/forms');
      setShowExitDialog(true);
    } else {
      guardedNavigate('/apps/forms');
    }
  };

  const handleExitWithoutSaving = () => {
    setHasUnsavedChanges(false);
    setShowExitDialog(false);
    
    if (pendingNavigation) {
      try {
        const targetUrl = new URL(pendingNavigation);
        const currentOrigin = window.location.origin;
        
        if (targetUrl.origin === currentOrigin) {
          // Same origin - use wouter navigation with full path including search and hash
          const fullPath = targetUrl.pathname + targetUrl.search + targetUrl.hash;
          setLocation(fullPath);
        } else {
          // Different origin - use window.location
          window.location.href = pendingNavigation;
        }
      } catch {
        // Invalid URL - fallback to Forms page
        setLocation('/apps/forms');
      }
      setPendingNavigation(null);
    } else {
      setLocation('/apps/forms');
    }
  };

  const handlePreview = () => {
    if (!isFormComplete()) {
      const missing = getIncompleteFields();
      toast({
        title: "Form Not Ready for Preview",
        description: `Please complete the following: ${missing.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    if (editFormId) {
      // Prepare preview by copying draft to preview fields, then open URL
      preparePreviewMutation.mutate(editFormId);
    } else {
      toast({
        title: "Error",
        description: "Form ID is missing. Please save the form first.",
        variant: "destructive"
      });
    }
  };

  const handlePublish = () => {
    if (!isFormComplete()) {
      const missing = getIncompleteFields();
      toast({
        title: "Form Not Ready to Publish",
        description: `Please complete the following: ${missing.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    // Make sure we have a form ID to publish
    if (!editFormId) {
      toast({
        title: "Error",
        description: "Please save the form first before publishing.",
        variant: "destructive"
      });
      return;
    }

    const formData = form.getValues();
    publishFormMutation.mutate(formData);
  };

  const handleSave = async () => {
    // Trigger validation
    const isValid = await form.trigger();
    
    if (!isValid) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (questions.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one question to your form",
        variant: "destructive",
      });
      return;
    }
    
    const formData = form.getValues();
    // Store the pending navigation for use in onSuccess
    pendingNavigationRef.current = pendingNavigation;
    createFormMutation.mutate(formData);
    setShowExitDialog(false);
    setPendingNavigation(null);
  };

  const onSubmit = (data: CreateFormData) => {
    if (questions.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one question to your form",
        variant: "destructive",
      });
      return;
    }
    
    createFormMutation.mutate(data);
  };

  // Fetch hierarchical student data for Manage Respondents
  const fetchHierarchicalData = async () => {
    try {
      const response = await apiRequest('GET', '/api/students');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const students = await response.json();

      if (!Array.isArray(students)) {
        console.warn('Students data is not an array:', students);
        return;
      }

      const hierarchical: typeof hierarchicalData = {};

      students.forEach((student: any) => {
        try {
          const { centre, level, class: className, student_BC, fullName } = student;

          if (!centre || !level || !className || !student_BC || !fullName) {
            console.warn('Invalid student data:', student);
            return;
          }

          if (!hierarchical[centre]) {
            hierarchical[centre] = {};
          }
          if (!hierarchical[centre][level]) {
            hierarchical[centre][level] = {};
          }
          if (!hierarchical[centre][level][className]) {
            hierarchical[centre][level][className] = [];
          }

          hierarchical[centre][level][className].push({
            student_BC,
            fullName,
            selected: selectedRespondents.has(student_BC)
          });
        } catch (studentError) {
          console.warn('Error processing student:', student, studentError);
        }
      });

      setHierarchicalData(hierarchical);

      // Auto-select all students by default (only if no students are currently selected)
      if (selectedRespondents.size === 0) {
        const allStudentBCs = new Set<string>();
        students.forEach((student: any) => {
          if (student.student_BC) {
            allStudentBCs.add(student.student_BC);
          }
        });
        setSelectedRespondents(allStudentBCs);
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
      toast({
        title: "Error",
        description: "Failed to load student data. Please check your authentication and try again.",
        variant: "destructive",
      });
    }
  };

  // Toggle functions for expand/collapse
  const toggleCentre = (centre: string) => {
    const newExpanded = new Set(expandedCentres);
    if (newExpanded.has(centre)) {
      newExpanded.delete(centre);
    } else {
      newExpanded.add(centre);
    }
    setExpandedCentres(newExpanded);
  };

  const toggleLevel = (centre: string, level: string) => {
    const key = `${centre}-${level}`;
    const newExpanded = new Set(expandedLevels);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedLevels(newExpanded);
  };

  // Selection functions
  const toggleStudentSelection = (student_BC: string) => {
    const newSelected = new Set(selectedRespondents);
    if (newSelected.has(student_BC)) {
      newSelected.delete(student_BC);
    } else {
      newSelected.add(student_BC);
    }
    setSelectedRespondents(newSelected);
    setHasUnsavedChanges(true);
  };

  const selectAllInClass = (centre: string, level: string, className: string) => {
    const students = hierarchicalData[centre]?.[level]?.[className] || [];
    const newSelected = new Set(selectedRespondents);
    students.forEach(student => newSelected.add(student.student_BC));
    setSelectedRespondents(newSelected);
    setHasUnsavedChanges(true);
  };

  const deselectAllInClass = (centre: string, level: string, className: string) => {
    const students = hierarchicalData[centre]?.[level]?.[className] || [];
    const newSelected = new Set(selectedRespondents);
    students.forEach(student => newSelected.delete(student.student_BC));
    setSelectedRespondents(newSelected);
    setHasUnsavedChanges(true);
  };

  const selectAllInCentre = (centre: string) => {
    const newSelected = new Set(selectedRespondents);
    Object.values(hierarchicalData[centre] || {}).forEach(levels => {
      Object.values(levels).forEach(students => {
        students.forEach(student => newSelected.add(student.student_BC));
      });
    });
    setSelectedRespondents(newSelected);
    setHasUnsavedChanges(true);
  };

  const deselectAllInCentre = (centre: string) => {
    const newSelected = new Set(selectedRespondents);
    Object.values(hierarchicalData[centre] || {}).forEach(levels => {
      Object.values(levels).forEach(students => {
        students.forEach(student => newSelected.delete(student.student_BC));
      });
    });
    setSelectedRespondents(newSelected);
    setHasUnsavedChanges(true);
  };

  const selectAllInLevel = (centre: string, level: string) => {
    const newSelected = new Set(selectedRespondents);
    Object.values(hierarchicalData[centre]?.[level] || {}).forEach(students => {
      students.forEach(student => newSelected.add(student.student_BC));
    });
    setSelectedRespondents(newSelected);
    setHasUnsavedChanges(true);
  };

  const deselectAllInLevel = (centre: string, level: string) => {
    const newSelected = new Set(selectedRespondents);
    Object.values(hierarchicalData[centre]?.[level] || {}).forEach(students => {
      students.forEach(student => newSelected.delete(student.student_BC));
    });
    setSelectedRespondents(newSelected);
    setHasUnsavedChanges(true);
  };

  // Helper functions to calculate counts
  const getTotalStudentsCount = () => {
    let total = 0;
    Object.values(hierarchicalData).forEach(centre => {
      Object.values(centre).forEach(level => {
        Object.values(level).forEach(students => {
          total += students.length;
        });
      });
    });
    return total;
  };

  const getCentreStudentsCount = (centre: string) => {
    let total = 0;
    let selected = 0;
    Object.values(hierarchicalData[centre] || {}).forEach(level => {
      Object.values(level).forEach(students => {
        total += students.length;
        students.forEach(student => {
          if (selectedRespondents.has(student.student_BC)) {
            selected++;
          }
        });
      });
    });
    return { selected, total };
  };

  const getLevelStudentsCount = (centre: string, level: string) => {
    let total = 0;
    let selected = 0;
    Object.values(hierarchicalData[centre]?.[level] || {}).forEach(students => {
      total += students.length;
      students.forEach(student => {
        if (selectedRespondents.has(student.student_BC)) {
          selected++;
        }
      });
    });
    return { selected, total };
  };

  // Load hierarchical data when Manage Respondents tab is accessed
  const currentFormType = watch('formType');
  useEffect(() => {
    if (activeTab === 'manage-respondents' && currentFormType === 'parents_survey') {
      fetchHierarchicalData();
    }
  }, [activeTab, currentFormType]);

  // Load selected respondents from form settings
  useEffect(() => {
    if (loadedFormData?.settings?.selectedRespondents) {
      setSelectedRespondents(new Set(loadedFormData.settings.selectedRespondents));
    }
  }, [loadedFormData]);

  // Helper function to ensure all questions have sequential numbering based on section order
  const renumberAllQuestions = (questionList: Question[]) => {
    let currentNumber = 1;
    const renumberedQuestions = [...questionList];
    const processedQuestionIds = new Set<string>();
    
    // If we have sections, renumber questions section by section in display order
    if (sections && sections.length > 0) {
      // Sort sections by their order property to ensure correct sequencing
      const sortedSections = [...sections].sort((a, b) => (a.order || 0) - (b.order || 0));
      
      sortedSections.forEach(section => {
        // Get questions for this section
        const sectionQuestions = questionList.filter(q => 
          q.sectionId === section.id || (!q.sectionId && section.id === 'default')
        );
        
        // Renumber questions in this section
        sectionQuestions.forEach(sectionQuestion => {
          const questionIndex = renumberedQuestions.findIndex(q => q.questionId === sectionQuestion.questionId);
          if (questionIndex >= 0 && !processedQuestionIds.has(sectionQuestion.questionId)) {
            renumberedQuestions[questionIndex] = { 
              ...renumberedQuestions[questionIndex], 
              questionNo: currentNumber++ 
            };
            processedQuestionIds.add(sectionQuestion.questionId);
          }
        });
      });
    }
    
    // Handle any remaining unprocessed questions (fallback for questions without proper section assignment)
    questionList.forEach(question => {
      if (!processedQuestionIds.has(question.questionId)) {
        const questionIndex = renumberedQuestions.findIndex(q => q.questionId === question.questionId);
        if (questionIndex >= 0) {
          renumberedQuestions[questionIndex] = { 
            ...renumberedQuestions[questionIndex], 
            questionNo: currentNumber++ 
          };
          processedQuestionIds.add(question.questionId);
        }
      }
    });
    
    return renumberedQuestions;
  };

  // Centralized helper to update questions with automatic renumbering
  const setQuestionsRenumbered = (newQuestions: Question[]) => {
    const renumberedQuestions = renumberAllQuestions(newQuestions);
    setQuestions(renumberedQuestions);
  };

  // Ensure questions are renumbered whenever sections change (for section reordering and initial load)
  useEffect(() => {
    if (sections.length > 0 && questions.length > 0) {
      setQuestionsRenumbered(questions);
    }
  }, [sections]);

  // Watch for form type changes and automatically create "Section 0: Child's Identity" for Parents Survey
  const watchedFormType = watch('formType');
  useEffect(() => {
    if (watchedFormType === 'parents_survey') {
      // Check if "Section 0: Child's Identity" already exists using stable ID pattern
      const hasChildIdentitySection = sections.some(section => 
        section.id.startsWith('child-identity-')
      );
      
      if (!hasChildIdentitySection) {
        // Create the Child's Identity section as the first section
        const newSectionId = 'child-identity-' + Date.now().toString();
        const newSection: Section = {
          id: newSectionId,
          title: "Section 0: Child's Identity",
          name: "Child's Identity", 
          order: -1 // Make it appear first
        };
        
        // Create the BC input question for this section
        const bcQuestion: Question = {
          questionId: 'bc-input-' + Date.now().toString(),
          questionNo: 1,
          type: 'bcInput',
          question: "To start, enter your child's Birth Cert number (BC No.) and press enter. If you have more than 1 child in Iyad Perdaus for this year, enter their BC No. separated by a comma.",
          required: true,
          sectionId: newSectionId
        };
        
        // Update sections and questions
        setSections([newSection, ...sections]);
        setQuestionsRenumbered([bcQuestion, ...questions]);
        setHasUnsavedChanges(true);
      }
    }
  }, [watchedFormType, sections]);

  const addQuestion = (type?: string, targetSectionId?: string) => {
    const sectionId = targetSectionId || sections[0]?.id || 'default';
    const newQuestion: Question = {
      questionId: Date.now().toString(),
      questionNo: questions.length + 1, // Will be renumbered below
      type: type || 'text',
      question: '',
      required: type === 'sls' ? true : false,
      sectionId: sectionId,
      ...(type === 'sls' ? { options: ['Strongly Agree', 'Agree', 'Disagree', 'Strongly Disagree'] } : {}),
      ...(type === 'multipleChoice' || type === 'checkbox' || type === 'radio' || type === 'select' ? { options: ['Option 1', 'Option 2'] } : {}),
      ...(type === 'rating' ? { scale: 5 } : {})
    };
    
    // Add question and renumber all questions to ensure sequential order
    setQuestionsRenumbered([...questions, newQuestion]);
    setHasUnsavedChanges(true);
  };

  const updateQuestion = (id: string, field: string, value: any) => {
    setQuestions(questions.map(q => {
      if (q.questionId === id) {
        const updated = { ...q, [field]: value };
        
        // Enforce SLS invariants: required=true and proper options
        if (field === 'type' && value === 'sls') {
          updated.required = true;
          updated.options = ['Strongly Agree', 'Agree', 'Disagree', 'Strongly Disagree'];
        }
        
        // Prevent setting required=false for SLS questions
        if (field === 'required' && q.type === 'sls') {
          updated.required = true; // Force true for SLS
        }
        
        return updated;
      }
      return q;
    }));
    setHasUnsavedChanges(true);
  };

  const deleteQuestion = (id: string) => {
    const filtered = questions.filter(q => q.questionId !== id);
    // Renumber remaining questions to maintain sequential order
    setQuestionsRenumbered(filtered);
    setHasUnsavedChanges(true);
  };

  const copyQuestion = (id: string) => {
    const questionToCopy = questions.find(q => q.questionId === id);
    if (questionToCopy) {
      const newQuestion = {
        ...questionToCopy,
        questionId: Date.now().toString(),
        question: questionToCopy.question + ' (Copy)'
      };
      const questionIndex = questions.findIndex(q => q.questionId === id);
      const newQuestions = [...questions];
      newQuestions.splice(questionIndex + 1, 0, newQuestion);
      // Renumber all questions to maintain sequential order
      setQuestionsRenumbered(newQuestions);
      setHasUnsavedChanges(true);
    }
  };

  const addSection = () => {
    const newSection: Section = {
      id: Date.now().toString(),
      title: `Section ${sections.length + 1}`,
      name: '',
      order: sections.length
    };
    setSections([...sections, newSection]);
    setHasUnsavedChanges(true);
  };

  const updateSection = (id: string, field: keyof Section, value: string) => {
    setSections(sections.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
    setHasUnsavedChanges(true);
  };

  const deleteSection = (id: string) => {
    // Don't allow deleting the last section
    if (sections.length <= 1) return;
    
    // Move questions from deleted section to first remaining section
    const remainingSection = sections.find(s => s.id !== id);
    if (remainingSection) {
      const updatedQuestions = questions.map(q => 
        q.sectionId === id ? { ...q, sectionId: remainingSection.id } : q
      );
      setQuestions(updatedQuestions);
    }
    
    setSections(sections.filter(s => s.id !== id));
    setHasUnsavedChanges(true);
  };

  const moveQuestionToSection = (questionId: string, targetSectionId: string) => {
    setQuestionsRenumbered(questions.map(q => 
      q.questionId === questionId ? { ...q, sectionId: targetSectionId } : q
    ));
    setHasUnsavedChanges(true);
  };

  const getQuestionsBySection = (sectionId: string) => {
    return questions.filter(q => q.sectionId === sectionId || (!q.sectionId && sectionId === 'default'));
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const sourceDroppableId = result.source.droppableId;
    const destinationDroppableId = result.destination.droppableId;
    
    // Extract section IDs from droppable IDs
    const sourceSectionId = sourceDroppableId.replace('section-', '');
    const destinationSectionId = destinationDroppableId.replace('section-', '');
    
    const sourceQuestions = getQuestionsBySection(sourceSectionId);
    const destinationQuestions = sourceSectionId === destinationSectionId 
      ? sourceQuestions 
      : getQuestionsBySection(destinationSectionId);
    
    // Get the question being moved
    const draggedQuestion = sourceQuestions[result.source.index];
    
    if (sourceSectionId === destinationSectionId) {
      // Moving within the same section - reorder questions
      const updatedQuestions = questions.map(q => {
        if (q.sectionId === sourceSectionId || (!q.sectionId && sourceSectionId === 'default')) {
          const sectionQuestions = [...sourceQuestions];
          const [reorderedItem] = sectionQuestions.splice(result.source.index, 1);
          sectionQuestions.splice(result.destination.index, 0, reorderedItem);
          const questionIndex = sectionQuestions.findIndex(sq => sq.questionId === q.questionId);
          return questionIndex >= 0 ? sectionQuestions[questionIndex] : q;
        }
        return q;
      });
      // Renumber all questions to maintain sequential order after reordering
      setQuestionsRenumbered(updatedQuestions);
    } else {
      // Moving between sections - update section assignment
      const updatedQuestions = questions.map(q => 
        q.questionId === draggedQuestion.questionId 
          ? { ...q, sectionId: destinationSectionId }
          : q
      );
      // Renumber all questions to maintain sequential order after moving between sections
      setQuestionsRenumbered(updatedQuestions);
    }
    
    setHasUnsavedChanges(true);
  };

  const suggestQuestions = (formType: string) => {
    const suggestions = {
      survey: [
        { type: 'rating', question: 'How satisfied are you with our service?', scale: 5 },
        { type: 'multipleChoice', question: 'How did you hear about us?', options: ['Website', 'Social Media', 'Friend', 'Advertisement'] },
        { type: 'textarea', question: 'Any additional comments or suggestions?' }
      ],
      feedback: [
        { type: 'rating', question: 'Overall experience rating', scale: 5 },
        { type: 'text', question: 'What did you like most?' },
        { type: 'text', question: 'What could we improve?' }
      ],
      registration: [
        { type: 'text', question: 'Full Name' },
        { type: 'email', question: 'Email Address' },
        { type: 'phone', question: 'Phone Number' },
        { type: 'select', question: 'Department', options: ['IT', 'HR', 'Finance', 'Operations'] }
      ],
      assessment: [
        { type: 'multipleChoice', question: 'Sample multiple choice question', options: ['Option A', 'Option B', 'Option C', 'Option D'] },
        { type: 'trueFalse', question: 'Sample true/false question' },
        { type: 'textarea', question: 'Explain your answer' }
      ]
    };

    const formTypeKey = formType as keyof typeof suggestions;
    const suggestedQuestions = suggestions[formTypeKey] || [];
    
    const newQuestions = suggestedQuestions.map((q, index) => ({
      ...q,
      questionId: Date.now().toString() + Math.random().toString(),
      questionNo: questions.length + index + 1,
      required: false
    }));
    
    setQuestionsRenumbered([...questions, ...newQuestions]);
    setHasUnsavedChanges(true);
    setActiveTab('questions');
  };

  // Show loading state when loading form data
  if (isLoadingForm) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="text-foreground font-medium">Loading form...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="text-muted-foreground hover:text-foreground"
                data-testid="back-button"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Forms
              </Button>
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-semibold text-foreground">
                  AI Form Builder
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleSave}
                disabled={createFormMutation.isPending}
                className="bg-gray-600 hover:bg-gray-700"
                data-testid="save-form-button"
              >
                <Save className="h-4 w-4 mr-2" />
                {createFormMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button 
                variant="outline"
                onClick={handlePreview}
                disabled={!isFormComplete()}
                className="border-blue-200 hover:bg-blue-50"
                data-testid="preview-button"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button 
                onClick={handlePublish}
                disabled={!isFormComplete() || publishFormMutation.isPending}
                className="bg-primary hover:bg-primary/90"
                data-testid="publish-button"
              >
                <Send className="h-4 w-4 mr-2" />
                {publishFormMutation.isPending ? 'Publishing...' : 'Publish'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="basic" className="data-[state=active]:bg-[#01B4BA] data-[state=active]:text-white">Basic Info</TabsTrigger>
            <TabsTrigger value="questions" className="data-[state=active]:bg-[#01B4BA] data-[state=active]:text-white">Questions</TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-[#01B4BA] data-[state=active]:text-white">Settings</TabsTrigger>
            {form.watch('formType') === 'parents_survey' && (
              <TabsTrigger value="manage-respondents" className="data-[state=active]:bg-[#01B4BA] data-[state=active]:text-white">Manage Respondents</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Form Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Form Title</Label>
                  <Input
                    id="title"
                    {...form.register('title')}
                    placeholder="Enter form title..."
                    data-testid="input-title"
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.title.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...form.register('description')}
                    placeholder="Enter form description..."
                    className="resize-none min-h-[3rem]"
                    style={{
                      height: 'auto',
                      minHeight: '3rem'
                    }}
                    onInput={(e) => {
                      adjustTextareaHeight(e.target as HTMLTextAreaElement);
                    }}
                    onBlur={(e) => {
                      adjustTextareaHeight(e.target as HTMLTextAreaElement);
                    }}
                    data-testid="textarea-description"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Form Icon</Label>
                    <div className="mt-2">
                      <ObjectUploader
                        maxNumberOfFiles={1}
                        maxFileSize={5242880} // 5MB
                        onGetUploadParameters={handleGetUploadParameters}
                        onComplete={handleUploadComplete}
                        buttonClassName="flex items-center gap-2"
                      >
                        {isUploading ? 'uploading...' : 'upload'}
                      </ObjectUploader>
                      {iconPreview && (
                        <div className="mt-2">
                          <img 
                            src={iconPreview} 
                            alt="Icon preview" 
                            className="w-12 h-12 object-cover rounded-md border"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="formUrl">From URL</Label>
                    <div className="mt-2">
                      <Input
                        id="formUrl"
                        {...form.register('formUrl')}
                        placeholder="e.g., parents_survey_2025"
                        onChange={(e) => {
                          form.setValue('formUrl', e.target.value);
                          validateFormUrl(e.target.value);
                        }}
                        data-testid="input-form-url"
                      />
                      {urlValidation.message && (
                        <p className={`text-sm mt-1 ${
                          urlValidation.isValid === true 
                            ? 'text-green-600' 
                            : urlValidation.isValid === false 
                            ? 'text-destructive' 
                            : 'text-muted-foreground'
                        }`}>
                          {urlValidation.isChecking && (
                            <span className="inline-flex items-center gap-1">
                              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              {urlValidation.message}
                            </span>
                          )}
                          {!urlValidation.isChecking && urlValidation.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="formType">Form Type</Label>
                  <Select value={form.watch('formType')} onValueChange={(value) => form.setValue('formType', value)}>
                    <SelectTrigger data-testid="form-type-select">
                      <SelectValue placeholder="Select form type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="parents_survey">Parents Survey</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.formType && (
                    <p className="text-sm text-destructive mt-1">{form.formState.errors.formType.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="welcomeMessage">Welcome Screen Message</Label>
                  <RichTextEditor
                    value={form.watch('welcomeMessage') || ''}
                    onChange={(value) => form.setValue('welcomeMessage', value)}
                    placeholder="Enter welcome message that will be displayed when the form is launched..."
                    data-testid="rich-text-welcome-message"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Preview Link Section */}
            {isEditMode && editFormId && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-blue-500" />
                    Preview Link
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border">
                    <span className="text-sm text-blue-700 font-mono flex-1">
                      {form.watch('formUrl') ? `${window.location.origin}/preview/${form.watch('formUrl')}` : 'Save form to generate preview link'}
                    </span>
                    {form.watch('formUrl') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const link = `${window.location.origin}/preview/${form.watch('formUrl')}`;
                          navigator.clipboard.writeText(link);
                          toast({
                            title: "Copied!",
                            description: "Preview link copied to clipboard",
                          });
                        }}
                        className="h-8 w-8 p-0"
                        data-testid="copy-preview-link"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {loadedFormData?.lastSavedAt && (
                    <p className="text-sm text-muted-foreground">
                      Last saved: {formatDateTime(loadedFormData.lastSavedAt)}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Published Link Section */}
            {isEditMode && editFormId && loadedFormData?.status === 'active' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-green-500" />
                    Published Link
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border">
                    <span className="text-sm text-green-700 font-mono flex-1">
                      {form.watch('formUrl') ? `${window.location.origin}/${form.watch('formUrl')}` : 'Form URL not set'}
                    </span>
                    {form.watch('formUrl') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const link = `${window.location.origin}/${form.watch('formUrl')}`;
                          navigator.clipboard.writeText(link);
                          toast({
                            title: "Copied!",
                            description: "Published link copied to clipboard",
                          });
                        }}
                        className="h-8 w-8 p-0"
                        data-testid="copy-published-link"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {loadedFormData?.lastPublishedAt && (
                    <p className="text-sm text-muted-foreground">
                      Last published: {formatDateTime(loadedFormData.lastPublishedAt)}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="questions" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Form Questions</h3>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addSection}
                  className="border-blue-200 hover:bg-blue-50"
                  data-testid="add-section-button"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </div>
            </div>

            {sections.map((section, index) => {
              const sectionQuestions = getQuestionsBySection(section.id);
              
              // Calculate sequential section number
              const getSectionNumber = () => {
                if (section.id.startsWith('child-identity-')) {
                  return '0';
                }
                // Count non-child-identity sections that appear before this one
                let nonChildIdentityCount = 0;
                for (let i = 0; i < index; i++) {
                  if (!sections[i].id.startsWith('child-identity-')) {
                    nonChildIdentityCount++;
                  }
                }
                return (nonChildIdentityCount + 1).toString();
              };
              
              return (
                <Card key={section.id} className="p-6 border-2">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-lg font-semibold text-gray-700">
                        Section {getSectionNumber()}:
                      </span>
                      <Input
                        value={section.name || ''}
                        onChange={(e) => updateSection(section.id, 'name', e.target.value)}
                        className="text-lg font-semibold border-b border-gray-300 bg-transparent px-2 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-blue-500"
                        placeholder="Enter section name..."
                        data-testid={`section-name-${section.id}`}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Select onValueChange={(value) => addQuestion(value, section.id)} value="">
                        <SelectTrigger className="flex h-10 items-center justify-between rounded-md border px-3 py-2 text-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 w-40 hover:bg-[#e06b60] border-[#FF8075] bg-[#e06b60] text-[#F5FEFE] data-[placeholder]:text-[#F5FEFE] [&>svg]:opacity-100 [&>svg]:text-[#F5FEFE]" data-testid={`add-question-${section.id}`}>
                          <SelectValue placeholder="Add Question" />
                        </SelectTrigger>
                        <SelectContent>
                          {questionTypes.map((type) => {
                            const Icon = type.icon;
                            return (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  {type.label}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {sections.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSection(section.id)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`delete-section-${section.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId={`section-${section.id}`}>
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                          {sectionQuestions.map((question, index) => {
                            const Icon = questionTypeIcons[question.type as keyof typeof questionTypeIcons] || FileText;
                            return (
                              <Draggable key={question.questionId} draggableId={question.questionId} index={index}>
                                {(provided) => (
                                  <Card
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className="p-4 ml-4"
                                  >
                              <div className="flex items-start gap-4">
                                <div
                                  {...provided.dragHandleProps}
                                  className="mt-2 cursor-move text-muted-foreground hover:text-foreground"
                                >
                                  <Move className="h-4 w-4" />
                                </div>
                                <div className="flex-1 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    <Badge variant="outline">{question.type}</Badge>
                                    <Switch
                                      checked={question.required}
                                      onCheckedChange={(checked) => updateQuestion(question.questionId, 'required', checked)}
                                      disabled={question.type === 'sls'}
                                    />
                                    <Label className="text-xs">Required</Label>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <span className="text-sm font-semibold text-blue-600 mt-1 min-w-fit">
                                      {question.questionNo}.
                                    </span>
                                    <Textarea
                                      value={question.question}
                                      onChange={(e) => updateQuestion(question.questionId, 'question', e.target.value)}
                                      placeholder="Enter your question..."
                                      className="font-medium resize-none min-h-[2.5rem] flex-1"
                                      rows={1}
                                      style={{
                                        height: 'auto',
                                        minHeight: '2.5rem'
                                      }}
                                      onInput={(e) => {
                                        const target = e.target as HTMLTextAreaElement;
                                        target.style.height = 'auto';
                                        target.style.height = target.scrollHeight + 'px';
                                      }}
                                    />
                                  </div>
                                  
                                  {(question.type === 'multipleChoice' || question.type === 'checkbox' || question.type === 'radio' || question.type === 'select' || question.type === 'sls') && (
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">Options</Label>
                                      {question.options?.map((option, optionIndex) => (
                                        <div key={optionIndex} className="flex items-center gap-2">
                                          <Input
                                            value={option}
                                            onChange={(e) => {
                                              const newOptions = [...(question.options || [])];
                                              newOptions[optionIndex] = e.target.value;
                                              updateQuestion(question.questionId, 'options', newOptions);
                                            }}
                                            placeholder={`Option ${optionIndex + 1}`}
                                            disabled={question.type === 'sls'}
                                          />
                                          {question.options && question.options.length > 2 && question.type !== 'sls' && (
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                const newOptions = question.options?.filter((_, i) => i !== optionIndex);
                                                updateQuestion(question.questionId, 'options', newOptions);
                                              }}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          )}
                                        </div>
                                      ))}
                                      {question.type !== 'sls' && (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            const newOptions = [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`];
                                            updateQuestion(question.questionId, 'options', newOptions);
                                          }}
                                        >
                                          <Plus className="h-4 w-4 mr-2" />
                                          Add Option
                                        </Button>
                                      )}
                                    </div>
                                  )}

                                  {question.type === 'rating' && (
                                    <div>
                                      <Label className="text-sm font-medium">Rating Scale</Label>
                                      <Select 
                                        value={question.scale?.toString()} 
                                        onValueChange={(value) => updateQuestion(question.questionId, 'scale', parseInt(value))}
                                      >
                                        <SelectTrigger className="w-32">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="3">1-3</SelectItem>
                                          <SelectItem value="5">1-5</SelectItem>
                                          <SelectItem value="7">1-7</SelectItem>
                                          <SelectItem value="10">1-10</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyQuestion(question.questionId)}
                                    className="text-muted-foreground hover:text-foreground"
                                    data-testid={`copy-question-${question.questionId}`}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteQuestion(question.questionId)}
                                    className="text-destructive hover:text-destructive"
                                    data-testid={`delete-question-${question.questionId}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {sectionQuestions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No questions in this section</p>
                <p className="text-sm">Add questions using the dropdown above</p>
              </div>
            )}
          </Card>
        );
      })}

      {sections.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No sections created yet</p>
          <p className="text-sm">Click "Add Section" to get started</p>
        </div>
      )}
    </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Form Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Progress Bar</Label>
                    <p className="text-sm text-muted-foreground">Display completion progress to users</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Anonymous Responses</Label>
                    <p className="text-sm text-muted-foreground">Users can submit without logging in</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Send Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Notify administrators of new responses</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            {form.watch('formType') === 'parents_survey' && (
              <Card>
                <CardHeader>
                  <CardTitle>Parents Survey Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-base font-medium">Form Submission</Label>
                    <RadioGroup 
                      value={form.watch('submissionType') || 'one_per_child'} 
                      onValueChange={(value) => form.setValue('submissionType', value)}
                      className="mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="one_per_child" id="one_per_child" data-testid="radio-one-per-child" />
                        <Label htmlFor="one_per_child" className="text-sm font-normal cursor-pointer">
                          1 response per child
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="unlimited" id="unlimited" data-testid="radio-unlimited" />
                        <Label htmlFor="unlimited" className="text-sm font-normal cursor-pointer">
                          Unlimited responses
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">After submission, user can edit response</Label>
                    </div>
                    <Switch
                      checked={form.watch('allowEditResponse')}
                      onCheckedChange={(checked) => form.setValue('allowEditResponse', checked)}
                      data-testid="toggle-edit-response"
                    />
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-base font-medium">Submission deadline</Label>
                    <div className="mt-2 flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-[200px] justify-start text-left font-normal",
                              !form.watch('submissionDeadline') && "text-muted-foreground"
                            )}
                            data-testid="deadline-date-picker"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {form.watch('submissionDeadline') ? format(form.watch('submissionDeadline')!, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={form.watch('submissionDeadline')}
                            onSelect={(date) => form.setValue('submissionDeadline', date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <Input
                        type="time"
                        className="w-[120px]"
                        data-testid="deadline-time-picker"
                        onChange={(e) => {
                          const currentDate = form.watch('submissionDeadline') || new Date();
                          const [hours, minutes] = e.target.value.split(':');
                          const newDate = new Date(currentDate);
                          newDate.setHours(parseInt(hours), parseInt(minutes));
                          form.setValue('submissionDeadline', newDate);
                        }}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-base font-medium">Live status</Label>
                    <div className="mt-2">
                      <Select 
                        value={form.watch('liveStatus')} 
                        onValueChange={(value) => form.setValue('liveStatus', value)}
                      >
                        <SelectTrigger className="w-[200px]" data-testid="live-status-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="manage-respondents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Manage Respondents
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Select which students whose parents need to submit this survey. Students not selected will see an error message when they try to access the form.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.keys(hierarchicalData).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Loading student data...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
                        <div className="text-lg font-semibold text-blue-800">
                          Total No. of Respondents: {selectedRespondents.size}/{getTotalStudentsCount()}
                        </div>
                        <div className="text-sm text-blue-600 mt-1">
                          {selectedRespondents.size === getTotalStudentsCount() ?
                            "All students selected" :
                            `${getTotalStudentsCount() - selectedRespondents.size} students not selected`
                          }
                        </div>
                      </div>

                      {Object.entries(hierarchicalData).map(([centre, levels]) => {
                        const centreCount = getCentreStudentsCount(centre);
                        const isCentreFullySelected = centreCount.selected === centreCount.total;
                        const isCentrePartiallySelected = centreCount.selected > 0 && centreCount.selected < centreCount.total;

                        return (
                        <div key={centre} className="border rounded-lg">
                          <div className="flex items-center justify-between p-4">
                            <Button
                              variant="ghost"
                              className="flex-1 justify-start p-0 h-auto"
                              onClick={() => toggleCentre(centre)}
                            >
                              <div className="flex items-center gap-2">
                                {expandedCentres.has(centre) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <span className="font-medium text-lg">{centre}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  ({centreCount.selected}/{centreCount.total})
                                </span>
                              </div>
                            </Button>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={isCentreFullySelected ? "default" : "outline"}
                                onClick={() => selectAllInCentre(centre)}
                                disabled={isCentreFullySelected}
                                className="h-8"
                              >
                                Select All
                              </Button>
                              <Button
                                size="sm"
                                variant={centreCount.selected === 0 ? "default" : "outline"}
                                onClick={() => deselectAllInCentre(centre)}
                                disabled={centreCount.selected === 0}
                                className="h-8"
                              >
                                Deselect All
                              </Button>
                            </div>
                          </div>

                          {expandedCentres.has(centre) && (
                            <div className="px-4 pb-4 space-y-3">
                              {Object.entries(levels).map(([level, classes]) => {
                                const levelKey = `${centre}-${level}`;
                                const levelCount = getLevelStudentsCount(centre, level);
                                const isLevelFullySelected = levelCount.selected === levelCount.total;
                                const isLevelPartiallySelected = levelCount.selected > 0 && levelCount.selected < levelCount.total;

                                return (
                                  <div key={level} className="border-l-2 border-gray-200 ml-4">
                                    <div className="flex items-center justify-between p-3">
                                      <Button
                                        variant="ghost"
                                        className="flex-1 justify-start p-0 h-auto"
                                        onClick={() => toggleLevel(centre, level)}
                                      >
                                        <div className="flex items-center gap-2">
                                          {expandedLevels.has(levelKey) ? (
                                            <ChevronDown className="h-4 w-4" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4" />
                                          )}
                                          <span className="font-medium">{level}</span>
                                          <span className="text-sm text-muted-foreground ml-2">
                                            ({levelCount.selected}/{levelCount.total})
                                          </span>
                                        </div>
                                      </Button>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant={isLevelFullySelected ? "default" : "outline"}
                                          onClick={() => selectAllInLevel(centre, level)}
                                          disabled={isLevelFullySelected}
                                          className="h-7 text-xs px-2"
                                        >
                                          Select All
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant={levelCount.selected === 0 ? "default" : "outline"}
                                          onClick={() => deselectAllInLevel(centre, level)}
                                          disabled={levelCount.selected === 0}
                                          className="h-7 text-xs px-2"
                                        >
                                          Deselect All
                                        </Button>
                                      </div>
                                    </div>

                                    {expandedLevels.has(levelKey) && (
                                      <div className="ml-6 space-y-2">
                                        {Object.entries(classes).map(([className, students]) => {
                                          const allSelected = students.every(student =>
                                            selectedRespondents.has(student.student_BC)
                                          );
                                          const someSelected = students.some(student =>
                                            selectedRespondents.has(student.student_BC)
                                          );

                                          return (
                                            <div key={className} className="border rounded-md p-3 bg-gray-50">
                                              <div className="flex items-center justify-between mb-2">
                                                <span className="font-medium text-base">{className}</span>
                                                <div className="flex gap-2">
                                                  <Button
                                                    size="sm"
                                                    variant={allSelected ? "default" : "outline"}
                                                    onClick={() => selectAllInClass(centre, level, className)}
                                                    disabled={allSelected}
                                                  >
                                                    Select All
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant={!someSelected ? "default" : "outline"}
                                                    onClick={() => deselectAllInClass(centre, level, className)}
                                                    disabled={!someSelected}
                                                  >
                                                    Deselect All
                                                  </Button>
                                                </div>
                                              </div>

                                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {students.map((student) => (
                                                  <div
                                                    key={student.student_BC}
                                                    className="flex items-center space-x-2 p-2 rounded border bg-white"
                                                  >
                                                    <Checkbox
                                                      checked={selectedRespondents.has(student.student_BC)}
                                                      onCheckedChange={() => toggleStudentSelection(student.student_BC)}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                      <p className="text-sm font-medium truncate">{student.fullName}</p>
                                                      <p className="text-xs text-muted-foreground">BC: {student.student_BC}</p>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Do you want to save your form before leaving?
              <br />
              <span className="text-destructive font-medium">
                If you select "Don't Save", all changes will be lost.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleExitWithoutSaving} data-testid="button-dont-save">
              Don't Save
            </Button>
            <Button variant="outline" onClick={() => setShowExitDialog(false)} data-testid="button-cancel-exit">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createFormMutation.isPending} data-testid="button-save-exit">
              {createFormMutation.isPending ? 'Saving...' : 'Save & Exit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}