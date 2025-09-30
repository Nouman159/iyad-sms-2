import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Brain, 
  Plus, 
  Trash2, 
  Move, 
  Eye, 
  FileText, 
  CalendarIcon, 
  Phone, 
  Mail, 
  Hash, 
  AlignLeft,
  CheckSquare,
  ToggleLeft,
  Star,
  Clock,
  Copy
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const questionTypeIcons = {
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
  date: CalendarIcon,
  datetime: Clock,
  trueFalse: ToggleLeft
};

const questionTypes = [
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
  { value: 'date', label: 'Date', icon: CalendarIcon },
  { value: 'datetime', label: 'Date & Time', icon: Clock },
  { value: 'trueFalse', label: 'True/False', icon: ToggleLeft }
];

interface Question {
  id: string;
  type: string;
  question: string;
  required: boolean;
  options?: string[];
  scale?: number;
  correctAnswer?: string | boolean;
  showIf?: {
    questionId: string;
    operator: 'equals' | 'not_equals' | 'contains';
    value: string;
  };
}

interface FormBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
  initialData?: any;
}

const createFormSchema = z.object({
  name: z.string().min(1, 'Form name is required'),
  description: z.string().optional(),
  formType: z.string().min(1, 'Form type is required'),
  submissionType: z.string().optional(),
  allowEditResponse: z.boolean().optional(),
  submissionDeadline: z.date().optional(),
  liveStatus: z.string().optional(),
});

type CreateFormData = z.infer<typeof createFormSchema>;

export default function FormBuilder({ isOpen, onClose, onSave }: FormBuilderProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CreateFormData>({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      submissionType: 'one_per_child',
      allowEditResponse: false,
      liveStatus: 'open'
    }
  });


  // Create form mutation
  const createFormMutation = useMutation({
    mutationFn: async (data: CreateFormData) => {
      const formData = {
        ...data,
        questions: questions,
        settings: {
          allowAnonymous: true,
          requireLogin: false,
          showProgress: true
        }
      };
      const response = await apiRequest('POST', '/api/forms', formData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/forms'] });
      onSave(data);
      handleClose();
      toast({
        title: "Success",
        description: "Form created successfully with AI assistance",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create form",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    reset();
    setQuestions([]);
    setActiveTab('basic');
    onClose();
  };


  const addQuestion = (type?: string) => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      type: type || 'text',
      question: '',
      required: false,
      ...(type === 'multipleChoice' || type === 'checkbox' || type === 'radio' || type === 'select' ? { options: ['Option 1', 'Option 2'] } : {}),
      ...(type === 'rating' ? { scale: 5 } : {})
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, field: string, value: any) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const copyQuestion = (id: string) => {
    const questionToCopy = questions.find(q => q.id === id);
    if (questionToCopy) {
      const newQuestion = {
        ...questionToCopy,
        id: Date.now().toString(),
        question: questionToCopy.question + ' (Copy)'
      };
      const questionIndex = questions.findIndex(q => q.id === id);
      const newQuestions = [...questions];
      newQuestions.splice(questionIndex + 1, 0, newQuestion);
      setQuestions(newQuestions);
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(questions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setQuestions(items);
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

  const suggestQuestions = (formType: string) => {
    const suggestions = {
      general: [
        { type: 'text', question: 'What is your name?' },
        { type: 'email', question: 'Email Address' },
        { type: 'textarea', question: 'Any additional comments?' }
      ],
      parents_survey: [
        { type: 'text', question: 'Child\'s Full Name' },
        { type: 'select', question: 'Grade Level', options: ['Pre-K', 'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'] },
        { type: 'rating', question: 'How satisfied are you with your child\'s education?', scale: 5 },
        { type: 'multipleChoice', question: 'What areas would you like more focus on?', options: ['Academic Support', 'Social Skills', 'Arts & Creativity', 'Physical Education'] },
        { type: 'textarea', question: 'Additional comments or suggestions' }
      ]
    };

    const formTypeKey = formType as keyof typeof suggestions;
    const suggestedQuestions = suggestions[formTypeKey] || suggestions.general;
    
    const newQuestions = suggestedQuestions.map((q, index) => ({
      id: (Date.now() + index).toString(),
      required: index < 2, // Make first two questions required
      ...q
    }));
    
    setQuestions([...questions, ...newQuestions]);
    toast({
      title: "AI Suggestions Added",
      description: `Added ${newQuestions.length} suggested questions based on ${formType} type`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="form-builder-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Form Builder
          </DialogTitle>
          <DialogDescription>
            Create intelligent forms with branching logic and AI suggestions
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic" className="data-[state=active]:bg-[#01B4BA] data-[state=active]:text-white">Basic Info</TabsTrigger>
            <TabsTrigger value="questions" className="data-[state=active]:bg-[#01B4BA] data-[state=active]:text-white">Questions</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div>
              <Label htmlFor="name">Form Name</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter form name"
                data-testid="form-name-input"
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="description">Form Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Enter form description"
                data-testid="form-description-input"
              />
            </div>

            <div>
              <Label htmlFor="formType">Form Type</Label>
              <Select onValueChange={(value) => setValue('formType', value)}>
                <SelectTrigger data-testid="form-type-select">
                  <SelectValue placeholder="Select form type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="parents_survey">Parents Survey</SelectItem>
                </SelectContent>
              </Select>
              {errors.formType && (
                <p className="text-sm text-destructive mt-1">{errors.formType.message}</p>
              )}
            </div>

            {watch('formType') === 'parents_survey' && (
              <div className="space-y-6 p-4 border rounded-lg bg-muted/20">
                <h3 className="text-lg font-semibold">Settings</h3>
                
                <div>
                  <Label className="text-base font-medium">Form Submission</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="one_per_child"
                        name="submissionType"
                        value="one_per_child"
                        checked={watch('submissionType') === 'one_per_child' || !watch('submissionType')}
                        onChange={(e) => setValue('submissionType', e.target.value)}
                        className="h-4 w-4 text-primary focus:ring-primary"
                        data-testid="radio-one-per-child"
                      />
                      <Label htmlFor="one_per_child" className="text-sm font-normal cursor-pointer">
                        1 response per child
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="unlimited"
                        name="submissionType"
                        value="unlimited"
                        checked={watch('submissionType') === 'unlimited'}
                        onChange={(e) => setValue('submissionType', e.target.value)}
                        className="h-4 w-4 text-primary focus:ring-primary"
                        data-testid="radio-unlimited"
                      />
                      <Label htmlFor="unlimited" className="text-sm font-normal cursor-pointer">
                        Unlimited responses
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">After submission, user can edit response</Label>
                  </div>
                  <Switch
                    checked={watch('allowEditResponse')}
                    onCheckedChange={(checked) => setValue('allowEditResponse', checked)}
                    data-testid="toggle-edit-response"
                  />
                </div>

                <div>
                  <Label className="text-base font-medium">Submission deadline</Label>
                  <div className="mt-2 flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[200px] justify-start text-left font-normal",
                            !watch('submissionDeadline') && "text-muted-foreground"
                          )}
                          data-testid="deadline-date-picker"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {watch('submissionDeadline') ? format(watch('submissionDeadline')!, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={watch('submissionDeadline')}
                          onSelect={(date) => setValue('submissionDeadline', date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      type="time"
                      className="w-[120px]"
                      data-testid="deadline-time-picker"
                      onChange={(e) => {
                        const currentDate = watch('submissionDeadline') || new Date();
                        const [hours, minutes] = e.target.value.split(':');
                        const newDate = new Date(currentDate);
                        newDate.setHours(parseInt(hours), parseInt(minutes));
                        setValue('submissionDeadline', newDate);
                      }}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium">Live status</Label>
                  <div className="mt-2">
                    <Select 
                      value={watch('liveStatus')} 
                      onValueChange={(value) => setValue('liveStatus', value)}
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
              </div>
            )}
            
            {watch('formType') && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Get AI Suggestions</p>
                  <p className="text-sm text-muted-foreground">
                    Let AI suggest questions based on your form type
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => suggestQuestions(watch('formType'))}
                  className="flex items-center gap-2"
                  data-testid="ai-suggest-button"
                >
                  <Brain className="h-4 w-4" />
                  Suggest Questions
                </Button>
              </div>
            )}
          </TabsContent>


          <TabsContent value="questions" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Form Questions</h3>
              <div className="flex gap-2">
                <Select onValueChange={(value) => addQuestion(value)} value="">
                  <SelectTrigger className="flex h-10 items-center justify-between rounded-md border px-3 py-2 text-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 w-40 hover:bg-[#e06b60] border-[#FF8075] bg-[#e06b60] text-[#F5FEFE] data-[placeholder]:text-[#F5FEFE] [&>svg]:opacity-100 [&>svg]:text-[#F5FEFE]" data-testid="add-question-button">
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
              </div>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="questions">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                    {questions.map((question, index) => {
                      const Icon = questionTypeIcons[question.type as keyof typeof questionTypeIcons] || FileText;
                      return (
                        <Draggable key={question.id} draggableId={question.id} index={index}>
                          {(provided) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="p-4"
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
                                    <span className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded-full font-medium">
                                      Question {index + 1}
                                    </span>
                                    <Icon className="h-4 w-4" />
                                    <Badge variant="outline">{question.type}</Badge>
                                    <Switch
                                      checked={question.required}
                                      onCheckedChange={(checked) => updateQuestion(question.id, 'required', checked)}
                                    />
                                    <Label className="text-xs">Required</Label>
                                  </div>
                                  <Textarea
                                    value={question.question}
                                    onChange={(e) => updateQuestion(question.id, 'question', e.target.value)}
                                    placeholder="Enter your question..."
                                    className="font-medium resize-none min-h-[2.5rem]"
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
                                  
                                  {(question.type === 'multipleChoice' || question.type === 'checkbox' || question.type === 'radio' || question.type === 'select') && (
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">Options</Label>
                                      {question.options?.map((option, optionIndex) => (
                                        <div key={optionIndex} className="flex items-center gap-2">
                                          <Input
                                            value={option}
                                            onChange={(e) => {
                                              const newOptions = [...(question.options || [])];
                                              newOptions[optionIndex] = e.target.value;
                                              updateQuestion(question.id, 'options', newOptions);
                                            }}
                                            placeholder={`Option ${optionIndex + 1}`}
                                          />
                                          {question.options && question.options.length > 2 && (
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                const newOptions = question.options?.filter((_, i) => i !== optionIndex);
                                                updateQuestion(question.id, 'options', newOptions);
                                              }}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          )}
                                        </div>
                                      ))}
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const newOptions = [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`];
                                          updateQuestion(question.id, 'options', newOptions);
                                        }}
                                      >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Option
                                      </Button>
                                    </div>
                                  )}

                                  {question.type === 'rating' && (
                                    <div>
                                      <Label className="text-sm font-medium">Rating Scale</Label>
                                      <Select 
                                        value={question.scale?.toString()} 
                                        onValueChange={(value) => updateQuestion(question.id, 'scale', parseInt(value))}
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
                                    onClick={() => copyQuestion(question.id)}
                                    className="text-muted-foreground hover:text-foreground"
                                    data-testid={`copy-question-${question.id}`}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteQuestion(question.id)}
                                    className="text-destructive hover:text-destructive"
                                    data-testid={`delete-question-${question.id}`}
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

            {questions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No questions added yet</p>
                <p className="text-sm">Add questions using the dropdown above or AI suggestions</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit(onSubmit)}
            disabled={createFormMutation.isPending}
            data-testid="create-form-button"
          >
            {createFormMutation.isPending ? 'Creating...' : 'Create Form'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}