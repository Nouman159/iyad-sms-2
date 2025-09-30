import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText,
  ArrowRight,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import DOMPurify from 'dompurify';
import confetti from 'canvas-confetti';

// BC Input Component with lookup functionality
interface BCInputComponentProps {
  questionId: string;
  value: string;
  onChange: (value: string) => void;
}

interface StudentData {
  student_BC: string;
  fullName: string;
  level: string;
  class: string;
}

const BCInputComponent = ({ questionId, value, onChange, formId }: BCInputComponentProps & { formId?: string }) => {
  const [bcInput, setBcInput] = useState('');
  const [foundStudents, setFoundStudents] = useState<StudentData[]>([]);
  const [notFoundBCs, setNotFoundBCs] = useState<string[]>([]);
  const [notSelectedStudents, setNotSelectedStudents] = useState<StudentData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [duplicateCardBC, setDuplicateCardBC] = useState<string | null>(null);

  // Initialize state from existing form data
  useEffect(() => {
    if (value && value.trim()) {
      try {
        const parsedValue = JSON.parse(value);
        if (parsedValue.foundStudents) {
          setFoundStudents(parsedValue.foundStudents);
          setHasSearched(true);
        }
        if (parsedValue.notFoundBCNumbers) {
          setNotFoundBCs(parsedValue.notFoundBCNumbers);
          setHasSearched(true);
        }
      } catch (error) {
        // Value is not JSON, ignore
      }
    }
  }, [value]);

  const handleLookup = async () => {
    if (!bcInput.trim()) return;
    
    setIsLoading(true);
    
    // Parse BC numbers (comma separated)
    const bcNumbers = bcInput.split(',').map(bc => bc.trim()).filter(bc => bc);
    
    try {
      const response: any = await apiRequest('POST', '/api/public/students/lookup-bc', {
        bcNumbers,
        formId
      });

      // Parse JSON from Response object
      const data = await response.json();

      // Deduplicate found students by BC number
      const existingBCs = new Set(foundStudents.map(s => s.student_BC));
      const newStudents = (data.foundStudents || []).filter((s: StudentData) => !existingBCs.has(s.student_BC));
      const duplicateStudents = (data.foundStudents || []).filter((s: StudentData) => existingBCs.has(s.student_BC));

      // If there are duplicate students, show glowing effect
      if (duplicateStudents.length > 0) {
        const duplicateBC = duplicateStudents[0].student_BC;
        setDuplicateCardBC(duplicateBC);
        // Clear the duplicate indicator after 3 seconds
        setTimeout(() => setDuplicateCardBC(null), 3000);
      }

      const newFoundStudents = [...foundStudents, ...newStudents];
      const newNotFoundBCs = data.notFoundBCNumbers || [];
      const newNotSelectedStudents = data.notSelectedStudents || [];

      // Update state in batch for better React performance
      setFoundStudents(newFoundStudents);
      setNotFoundBCs(newNotFoundBCs);
      setNotSelectedStudents(prevNotSelected => {
        // Merge with existing not selected students, avoiding duplicates
        const existingNotSelectedBCs = new Set(prevNotSelected.map(s => s.student_BC));
        const uniqueNewNotSelected = newNotSelectedStudents.filter((s: StudentData) => !existingNotSelectedBCs.has(s.student_BC));
        return [...prevNotSelected, ...uniqueNewNotSelected];
      });
      setHasSearched(true);
      setBcInput(''); // Clear input

      // Update the form response immediately
      updateFormResponse(newFoundStudents, newNotFoundBCs, '');

    } catch (error) {
      const newNotFoundBCs = bcNumbers;
      setNotFoundBCs(newNotFoundBCs);
      setFoundStudents(foundStudents);
      setHasSearched(true);
      
      // Update form response even on error
      updateFormResponse(foundStudents, newNotFoundBCs, bcInput);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteChild = (bcToRemove: string) => {
    const updatedStudents = foundStudents.filter(student => student.student_BC !== bcToRemove);
    setFoundStudents(updatedStudents);
    
    // Update form response with the updated students
    updateFormResponse(updatedStudents, notFoundBCs, bcInput);
  };

  const updateFormResponse = (students: StudentData[], notFound: string[], inputValue: string) => {
    onChange(JSON.stringify({
      foundStudents: students,
      notFoundBCNumbers: notFound
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLookup();
    }
  };

  
  
  return (
    <div className="space-y-6 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-3">
          <span className="text-2xl">👶</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Child Identity Verification</h3>
        <p className="text-sm text-gray-600">Enter your child's BC number to get started</p>
      </div>

      <div className="space-y-3">
        <div className="flex gap-3">
          <Input
            value={bcInput}
            onChange={(e) => setBcInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter BC No. (e.g. A1234567, B9876543)"
            className="flex-1 h-12 text-lg border-2 border-blue-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
            data-testid={`bc-input-${questionId}`}
          />
          <Button
            type="button"
            onClick={handleLookup}
            disabled={isLoading || !bcInput.trim()}
            className="px-6 h-12 text-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            data-testid={`bc-lookup-${questionId}`}
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Enter'}
          </Button>
        </div>
        
        {hasSearched && notFoundBCs.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-600">⚠️</span>
              <Label className="text-sm font-medium text-red-700">System Notice</Label>
            </div>
            <p className="text-sm text-red-700">
              System is not able to locate the BC No. <strong>{notFoundBCs.join(', ')}</strong>. Please check and re-enter.
            </p>
          </div>
        )}

        {duplicateCardBC && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-yellow-600">💡</span>
              <Label className="text-sm font-medium text-yellow-700">Already Added</Label>
            </div>
            <p className="text-sm text-yellow-700">
              BC No. <strong>{duplicateCardBC}</strong> has already been added. The existing card is highlighted below.
            </p>
          </div>
        )}
      </div>

      {foundStudents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-green-600">✅</span>
            <Label className="text-base font-semibold text-green-700">Found Children:</Label>
          </div>
          
          <div className="space-y-3">
            {foundStudents.map((student, index) => {
              const isDuplicate = duplicateCardBC === student.student_BC;
              return (
              <Card
                key={index}
                className={cn(
                  "border-2 bg-gradient-to-r hover:shadow-md transition-all duration-500",
                  isDuplicate
                    ? "border-yellow-400 from-yellow-50 to-amber-50 animate-pulse shadow-lg shadow-yellow-200/50"
                    : "border-green-200 from-green-50 to-emerald-50 transition-shadow"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">BC Number</p>
                          <p className="text-sm font-semibold text-gray-900">{student.student_BC}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Full Name</p>
                          <p className="text-sm font-semibold text-gray-900">{student.fullName}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Centre</p>
                          <p className="text-sm font-semibold text-gray-900">{student.class || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Level</p>
                          <p className="text-sm font-semibold text-gray-900">{student.level || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteChild(student.student_BC)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-100 ml-3 h-8 w-8 p-0"
                      data-testid={`delete-child-${student.student_BC}`}
                    >
                      ✕
                    </Button>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Need to add another child? Enter their BC number above.
            </p>
          </div>
        </div>
      )}

      {notSelectedStudents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-red-600">❌</span>
            <Label className="text-base font-semibold text-red-700">Not Selected for This Survey:</Label>
          </div>

          <div className="space-y-3">
            {notSelectedStudents.map((student, index) => (
              <Card
                key={index}
                className="border-2 border-red-200 bg-gradient-to-r from-red-50 to-rose-50"
              >
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">BC Number</p>
                        <p className="text-sm font-semibold text-gray-900">{student.student_BC}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Full Name</p>
                        <p className="text-sm font-semibold text-gray-900">{student.fullName}</p>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-red-100 rounded-md border border-red-200">
                      <p className="text-sm text-red-800 font-medium">
                        Sorry, <span className="font-semibold">{student.fullName}</span> is not selected for this survey.
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        Please contact the school administrator if you believe this is an error.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


interface PublicFormData {
  id: string;
  title: string;
  description?: string;
  welcomeMessage?: string;
  formType: string;
  formUrl: string;
  settings?: {
    welcomeMessage?: string;
    iconData?: string;
    iconUrl?: string;
    submissionType?: string;
    allowEditResponse?: boolean;
    submissionDeadline?: string;
    liveStatus?: string;
  };
  questions: Array<{
    questionId: string;
    questionNo: number;
    type: string;
    question: string;
    required: boolean;
    options?: string[];
    scale?: number;
    sectionId?: string;
  }>;
  sections?: Array<{
    id: string;
    title: string;
    name?: string;
    description?: string;
    order: number;
  }>;
  submissionType?: string;
  allowEditResponse?: boolean;
  submissionDeadline?: string;
  liveStatus?: string;
  createdAt: string;
}

interface PublicFormProps {
  isPreview?: boolean;
}

export default function PublicForm({ isPreview = false }: PublicFormProps) {
  const { url } = useParams<{ url: string }>();
  const [currentStep, setCurrentStep] = useState<'welcome' | 'form' | 'success'>('welcome');
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});

  // Use different API endpoint based on preview mode
  const apiEndpoint = isPreview ? '/api/forms/preview' : '/api/public/forms';
  
  const { data: form, isLoading, error } = useQuery<PublicFormData>({
    queryKey: [apiEndpoint, url],
    enabled: !!url,
  });

  const submitMutation = useMutation({
    mutationFn: async (formData: { formId: string; responses: Record<string, any> }) => {
      const response = await fetch(`/api/forms/${formData.formId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ responses: formData.responses })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit form');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setCurrentStep('success');
    },
    onError: (error) => {
      console.error('Form submission error:', error);
      // Could add toast notification here
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600">Loading form...</span>
        </div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📋</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Not Found</h1>
          <p className="text-gray-600">The form you're looking for doesn't exist or may have been removed.</p>
        </div>
      </div>
    );
  }

  const handleStartForm = () => {
    setCurrentStep('form');
  };

  const handleInputChange = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Get sections - if no sections defined, create a default one
  const sections = form?.sections && form.sections.length > 0 
    ? form.sections.sort((a, b) => a.order - b.order)
    : [{ id: 'default', title: 'Form Questions', order: 0 }];

  // Get questions for current section
  const getCurrentSectionQuestions = () => {
    if (!form) return [];
    const currentSection = sections[currentSectionIndex];
    
    // If we're using the default fallback section, show all questions that don't have a valid sectionId
    if (currentSection.id === 'default' && form.sections?.length === 0) {
      return form.questions;
    }
    
    return form.questions.filter(q => 
      q.sectionId === currentSection.id || 
      (!q.sectionId && currentSection.id === 'default')
    );
  };

  // Section navigation
  const handleNextSection = () => {
    if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
    } else {
      // Last section, submit the form
      handleSubmit();
    }
  };

  const handlePreviousSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
    }
  };

  // Check if current section is complete (all required questions answered)
  const isCurrentSectionComplete = () => {
    const currentQuestions = getCurrentSectionQuestions();
    return currentQuestions.every(question => {
      if (!question.required) return true;
      const response = responses[question.questionId];
      return response !== undefined && response !== null && response !== '';
    });
  };

  const getTotalQuestions = () => {
    return form?.questions?.length || 0;
  };

  const getAnsweredQuestions = () => {
    return Object.keys(responses).filter(key => {
      const response = responses[key];
      return response !== undefined && response !== null && response !== '';
    }).length;
  };

  const handleSubmit = () => {
    if (!form) return;
    
    submitMutation.mutate({
      formId: form.id,
      responses: responses
    });
  };

  // Helper function to detect if a question is asking for BC numbers
  const isBCQuestion = (question: any) => {
    const questionText = (question.question || question.title || '').toLowerCase();
    return questionText.includes('birth cert') || 
           questionText.includes('bc no') || 
           questionText.includes('bc number') ||
           questionText.includes('birth certificate');
  };

  const renderQuestion = (question: any, index: number) => {
    return (
      <Card key={question.questionId} className="transition-all duration-200 hover:shadow-md border-blue-100 hover:border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="mt-1">
              <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full font-medium">
                {question.questionNo}
              </span>
            </div>
            <div className="flex-1">
              <Label className="text-base font-medium text-gray-900">
                {question.question}
              </Label>
            </div>
          </div>

          <div className="ml-8">
            {(question.type === 'text' && !isBCQuestion(question)) && (
              <Input
                value={responses[question.questionId] || ''}
                onChange={(e) => handleInputChange(question.questionId, e.target.value)}
                placeholder="Enter your answer..."
                className="border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                data-testid={`input-${question.questionId}`}
              />
            )}

            {(question.type === 'bcInput' || (question.type === 'text' && isBCQuestion(question))) && (
              <BCInputComponent
                questionId={question.questionId}
                value={responses[question.questionId] || ''}
                onChange={(value) => handleInputChange(question.questionId, value)}
                formId={form?.id}
              />
            )}

            {question.type === 'email' && (
              <Input
                type="email"
                value={responses[question.questionId] || ''}
                onChange={(e) => handleInputChange(question.questionId, e.target.value)}
                placeholder="Enter your email..."
                className="border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                data-testid={`input-${question.questionId}`}
              />
            )}

            {question.type === 'phone' && (
              <Input
                type="tel"
                value={responses[question.questionId] || ''}
                onChange={(e) => handleInputChange(question.questionId, e.target.value)}
                placeholder="Enter your phone number..."
                className="border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                data-testid={`input-${question.questionId}`}
              />
            )}

            {question.type === 'number' && (
              <Input
                type="number"
                value={responses[question.questionId] || ''}
                onChange={(e) => handleInputChange(question.questionId, e.target.value)}
                placeholder="Enter a number..."
                className="border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                data-testid={`input-${question.questionId}`}
              />
            )}


            {question.type === 'textarea' && (
              <Textarea
                value={responses[question.questionId] || ''}
                onChange={(e) => handleInputChange(question.questionId, e.target.value)}
                placeholder="Enter your answer..."
                className="min-h-[100px] border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                data-testid={`textarea-${question.questionId}`}
              />
            )}

            {question.type === 'select' && (
              <Select
                value={responses[question.questionId] || ''}
                onValueChange={(value) => handleInputChange(question.questionId, value)}
              >
                <SelectTrigger className="border-blue-200 focus:border-blue-400 focus:ring-blue-400" data-testid={`select-${question.questionId}`}>
                  <SelectValue placeholder="Select an option..." />
                </SelectTrigger>
                <SelectContent>
                  {question.options?.map((option: string, idx: number) => (
                    <SelectItem key={idx} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {question.type === 'radio' && (
              <RadioGroup
                value={responses[question.questionId] || ''}
                onValueChange={(value) => handleInputChange(question.questionId, value)}
                className="space-y-2"
              >
                {question.options?.map((option: string, idx: number) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`${question.questionId}-${idx}`} data-testid={`radio-${question.questionId}-${idx}`} />
                    <Label htmlFor={`${question.questionId}-${idx}`} className="cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {(question.type === 'multipleChoice' || question.type === 'sls') && (
              <div className="grid grid-cols-2 gap-3">
                {question.options?.map((option: string, idx: number) => {
                  const isChecked = responses[question.questionId] === option;
                  
                  // Color coding for different options
                  const getOptionColors = (option: string) => {
                    const lowerOption = option.toLowerCase();
                    if (lowerOption.includes('strongly agree')) {
                      return {
                        hover: 'hover:bg-green-100 hover:border-green-400',
                        selected: 'border-green-500 bg-green-50 text-green-800',
                        default: 'border-gray-200'
                      };
                    }
                    if (lowerOption.includes('agree') && !lowerOption.includes('disagree')) {
                      return {
                        hover: 'hover:bg-green-50 hover:border-green-300',
                        selected: 'border-green-400 bg-green-100 text-green-700',
                        default: 'border-gray-200'
                      };
                    }
                    if (lowerOption.includes('strongly disagree')) {
                      return {
                        hover: 'hover:bg-red-100 hover:border-red-400',
                        selected: 'border-red-500 bg-red-50 text-red-800',
                        default: 'border-gray-200'
                      };
                    }
                    if (lowerOption.includes('disagree')) {
                      return {
                        hover: 'hover:bg-red-50 hover:border-red-300',
                        selected: 'border-red-400 bg-red-100 text-red-700',
                        default: 'border-gray-200'
                      };
                    }
                    // Default for other options
                    return {
                      hover: 'hover:bg-blue-50 hover:border-blue-300',
                      selected: 'border-blue-500 bg-blue-50 text-blue-800',
                      default: 'border-gray-200'
                    };
                  };
                  
                  const colors = getOptionColors(option);
                  
                  return (
                    <div 
                      key={idx} 
                      className={cn(
                        "relative border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
                        isChecked ? colors.selected : `${colors.default} ${colors.hover}`
                      )}
                      onClick={() => {
                        if (isChecked) {
                          // If already selected, deselect it
                          handleInputChange(question.questionId, '');
                        } else {
                          // Select this option (deselects any previous selection)
                          handleInputChange(question.questionId, option);
                          // Trigger confetti for "Strongly Agree"
                          if (option.toLowerCase().includes('strongly agree')) {
                            confetti({
                              particleCount: 100,
                              spread: 70,
                              origin: { y: 0.6 }
                            });
                          }
                        }
                      }}
                      data-testid={`mcq-option-${question.questionId}-${idx}`}
                    >
                      <div className="flex items-center justify-center">
                        <Label className="cursor-pointer font-medium text-center pointer-events-none">
                          {option}
                        </Label>
                      </div>
                      {isChecked && (
                        <div className="absolute top-2 right-2">
                          <div className="w-3 h-3 bg-current rounded-full animate-pulse"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {question.type === 'rating' && (
              <div className="flex items-center gap-2">
                {Array.from({ length: question.scale || 5 }, (_, idx) => (
                  <Button
                    key={idx}
                    variant={(responses[question.questionId] || 0) > idx ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleInputChange(question.questionId, idx + 1)}
                    className={cn(
                      "w-8 h-8 p-0 text-sm",
                      (responses[question.questionId] || 0) > idx
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "border-blue-200 hover:border-blue-400 hover:bg-blue-50"
                    )}
                    data-testid={`rating-${question.questionId}-${idx + 1}`}
                  >
                    {idx + 1}
                  </Button>
                ))}
                <span className="text-sm text-gray-600 ml-2">
                  {responses[question.questionId] ? `${responses[question.questionId]}/${question.scale || 5}` : 'Not rated'}
                </span>
              </div>
            )}

            {question.type === 'trueFalse' && (
              <RadioGroup
                value={responses[question.questionId] || ''}
                onValueChange={(value) => handleInputChange(question.questionId, value)}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id={`${question.questionId}-true`} data-testid={`radio-${question.questionId}-true`} />
                  <Label htmlFor={`${question.questionId}-true`} className="cursor-pointer">
                    True
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id={`${question.questionId}-false`} data-testid={`radio-${question.questionId}-false`} />
                  <Label htmlFor={`${question.questionId}-false`} className="cursor-pointer">
                    False
                  </Label>
                </div>
              </RadioGroup>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Show success screen
  if (currentStep === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Thank You!</h1>
              <p className="text-lg text-gray-600 mb-6">
                Your response has been submitted successfully. We appreciate your time and feedback.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 inline-block">
                <p className="text-sm text-green-800">
                  Your responses have been recorded and will be reviewed by our team.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'welcome') {
    // Get icon data and welcome message from settings
    const iconData = form.settings?.iconData;
    const welcomeMessage = form.settings?.welcomeMessage || form.welcomeMessage || '';
    
    // Safely sanitize the welcome message HTML
    const sanitizeWelcomeMessage = (html: string) => {
      if (!html) return '';
      
      // Add proper hook to enforce font-size-only styles
      DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
        if (data.attrName === 'style') {
          // Only allow font-size with safe values (10-50px)
          const fontSizeMatch = data.attrValue.match(/^\s*font-size:\s*([1-4]?\d|50)px\s*$/);
          if (fontSizeMatch) {
            data.attrValue = `font-size: ${fontSizeMatch[1]}px`;
          } else {
            data.keepAttr = false;
          }
        }
      });
      
      const sanitized = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['div', 'strong', 'em', 'br', 'p'],
        ALLOWED_ATTR: ['style'],
        ALLOW_DATA_ATTR: false,
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'link'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
        CUSTOM_ELEMENT_HANDLING: {
          tagNameCheck: null,
          attributeNameCheck: null,
          allowCustomizedBuiltInElements: false
        }
      });
      
      // Remove the hook to avoid affecting other sanitizations
      DOMPurify.removeHook('uponSanitizeAttribute');
      
      return sanitized;
    };

    const sanitizedWelcomeMessage = sanitizeWelcomeMessage(welcomeMessage);
    
    // Prepare icon source - prioritize iconUrl, fallback to iconData for legacy forms
    const iconSrc = form.settings?.iconUrl || 
      (iconData ? (iconData.startsWith('data:') ? iconData : `data:image/png;base64,${iconData}`) : null);
    
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Gradient blobs */}
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-sky-200/60 rounded-full blur-2xl opacity-30 animate-pulse"></div>
          <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-indigo-200/60 rounded-full blur-2xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          {/* Fun preschool elements */}
          <div className="absolute top-20 left-20 text-3xl opacity-20 animate-bounce" style={{ animationDelay: '2s' }}>🎈</div>
          <div className="absolute top-40 right-32 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '3s' }}>🧸</div>
          <div className="absolute bottom-40 left-32 text-2xl opacity-20 animate-bounce" style={{ animationDelay: '4s' }}>🖍️</div>
          <div className="absolute bottom-20 right-20 text-3xl opacity-20 animate-bounce" style={{ animationDelay: '1s' }}>⭐</div>
        </div>

        <div className="relative container mx-auto px-4 py-12">
          <div className="mx-auto max-w-2xl">
            {/* Central "popping" card with glass morphism */}
            <Card className="relative bg-white/70 backdrop-blur border border-white/60 rounded-3xl shadow-[0_20px_60px_rgba(56,189,248,0.35)] ring-2 ring-sky-400 ring-offset-2 ring-offset-sky-50 after:content-[''] after:absolute after:inset-0 after:rounded-3xl after:ring-1 after:ring-sky-300/30 after:pointer-events-none">
              <CardContent className="p-8 text-center">
                {/* Bright blue accent line */}
                <div className="h-1.5 w-24 bg-gradient-to-r from-sky-400 to-blue-500 rounded-full mx-auto mb-8"></div>
                
                {/* Form Icon */}
                <div className="mb-8">
                  {iconSrc ? (
                    <img 
                      src={iconSrc} 
                      alt={`${form.title} icon`} 
                      className="h-20 w-20 mx-auto rounded-2xl shadow-lg ring-2 ring-sky-300 object-cover"
                      data-testid="img-form-icon"
                    />
                  ) : (
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg ring-2 ring-sky-300" data-testid="img-form-icon">
                      <FileText className="h-10 w-10 text-white" />
                    </div>
                  )}
                </div>

                {/* Welcome Message */}
                <div className="mb-8">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-6" data-testid="text-title">
                    {form.title}
                  </h1>
                  {form.description && (
                    <p className="text-xl text-gray-600 mb-6 font-medium" data-testid="text-description">
                      {form.description}
                    </p>
                  )}
                  {sanitizedWelcomeMessage && (
                    <div 
                      className="text-gray-700 max-w-lg mx-auto leading-relaxed prose prose-sm" 
                      data-testid="text-welcome"
                      dangerouslySetInnerHTML={{ __html: sanitizedWelcomeMessage }}
                      style={{
                        /* Ensure content formatting is preserved */
                        whiteSpace: 'pre-line'
                      }}
                    />
                  )}
                </div>

                {/* Get Started Button */}
                <Button
                  onClick={handleStartForm}
                  size="lg"
                  className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white px-10 py-4 text-lg font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 ring-2 ring-sky-400/20 hover:ring-sky-400/40"
                  data-testid="button-start"
                >
                  Let's Get Started!
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const currentSection = sections[currentSectionIndex];
  const currentQuestions = getCurrentSectionQuestions();
  const isLastSection = currentSectionIndex === sections.length - 1;
  const isFirstSection = currentSectionIndex === 0;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{form.title}</h1>
            {form.description && (
              <p className="text-gray-600">{form.description}</p>
            )}
          </div>

          {/* Section Progress */}
          {sections.length > 1 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Section {currentSection.id?.startsWith('child-identity-') ? '0' : currentSectionIndex + 1}
                  {currentSection.name && `: ${currentSection.name}`}
                </h2>
                <span className="text-sm text-gray-600">
                  Section {currentSection.id?.startsWith('child-identity-') ? '0' : currentSectionIndex + 1} of {sections.length}
                </span>
              </div>
              <div className="bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentSectionIndex + 1) / sections.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Overall Progress Bar - only show if single section */}
          {sections.length <= 1 && (
            <div className="mb-8">
              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(getAnsweredQuestions() / getTotalQuestions()) * 100}%` }}
                />
              </div>
            </div>
          )}


          {/* Current Section Questions */}
          <div className="space-y-6 mb-8">
            {currentQuestions.map((question, index) => {
              const globalIndex = form.questions.findIndex(q => q.questionId === question.questionId);
              return renderQuestion(question, globalIndex);
            })}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              onClick={handlePreviousSection}
              disabled={isFirstSection}
              variant="outline"
              size="lg"
              className={cn(
                "px-6 py-3 font-medium",
                isFirstSection ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100 hover:border-gray-400 hover:text-gray-900 transition-colors"
              )}
              data-testid="previous-section-button"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            <Button
              onClick={handleNextSection}
              disabled={!isCurrentSectionComplete()}
              size="lg"
              className={cn(
                "px-8 py-3 text-lg font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200",
                isLastSection 
                  ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800" 
                  : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800",
                !isCurrentSectionComplete() && "opacity-50 cursor-not-allowed"
              )}
              data-testid={isLastSection ? "submit-form-button" : "next-section-button"}
            >
              {isLastSection ? (
                submitMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Form'
                )
              ) : (
                <>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}