import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { 
  Upload, 
  Download, 
  Search, 
  Filter, 
  Users, 
  Database,
  Plus,
  Edit,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import StudentCSVUploader from '@/components/StudentCSVUploader';
import type { Student } from '@shared/schema';

interface ColumnSort {
  column: string;
  direction: 'asc' | 'desc' | null;
}

interface ColumnFilter {
  column: string;
  values: string[];
}

interface FilterDropdownProps {
  column: string;
  values: string[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
}

function FilterDropdown({ column, values, selectedValues, onSelectionChange }: FilterDropdownProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const filteredValues = values.filter(value => 
    value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleValue = (value: string) => {
    if (selectedValues.includes(value)) {
      onSelectionChange(selectedValues.filter(v => v !== value));
    } else {
      onSelectionChange([...selectedValues, value]);
    }
  };

  const selectAll = () => {
    onSelectionChange(filteredValues);
  };

  const deselectAll = () => {
    onSelectionChange([]);
  };

  return (
    <Command className="w-full">
      <div className="flex items-center justify-between p-2 border-b">
        <span className="text-sm font-medium">Filter {column}</span>
        <div className="flex space-x-1">
          <Button variant="ghost" size="sm" onClick={selectAll}>
            All
          </Button>
          <Button variant="ghost" size="sm" onClick={deselectAll}>
            None
          </Button>
        </div>
      </div>
      <CommandInput 
        placeholder={`Search ${column}...`}
        value={searchTerm}
        onValueChange={setSearchTerm}
        className="h-8"
      />
      <CommandList className="max-h-48">
        <CommandEmpty>No values found.</CommandEmpty>
        <CommandGroup>
          {filteredValues.map((value) => (
            <CommandItem
              key={value}
              value={value}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <Checkbox 
                checked={selectedValues.includes(value)}
                onCheckedChange={() => toggleValue(value)}
              />
              <span className="flex-1">{value}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

export default function StudentDB() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<ColumnSort>({ column: '', direction: null });
  const [filters, setFilters] = useState<ColumnFilter[]>([]);
  const [showFilters, setShowFilters] = useState<{ [key: string]: boolean }>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch students
  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ['/api/students'],
    retry: false,
  });

  const handleImport = () => {
    setIsUploadOpen(true);
  };

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Student data export will begin shortly...",
    });
  };

  const handleUploadComplete = (data: any) => {
    // Refresh the students list
    queryClient.invalidateQueries({ queryKey: ['/api/students'] });
    toast({
      title: "Import Complete",
      description: `Successfully imported ${data.students?.length || 0} students`,
    });
  };

  // Sorting function
  const handleSort = (column: string) => {
    let newDirection: 'asc' | 'desc' | null = 'asc';
    
    if (sortConfig.column === column) {
      if (sortConfig.direction === 'asc') {
        newDirection = 'desc';
      } else if (sortConfig.direction === 'desc') {
        newDirection = null;
      }
    }
    
    setSortConfig({ column, direction: newDirection });
  };

  // Get unique values for a column for filtering
  const getUniqueValues = (column: keyof Student) => {
    const values = new Set<string>();
    students.forEach(student => {
      const value = student[column];
      if (value && String(value).trim()) {
        values.add(String(value));
      }
    });
    return Array.from(values).sort();
  };

  // Toggle filter dropdown
  const setFilterOpen = (column: string, open: boolean) => {
    setShowFilters(prev => ({
      ...prev,
      [column]: open
    }));
  };

  // Update filter values for a column
  const updateFilter = (column: string, values: string[]) => {
    setFilters(prev => {
      const newFilters = prev.filter(f => f.column !== column);
      if (values.length > 0) {
        newFilters.push({ column, values });
      }
      return newFilters;
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters([]);
    setShowFilters({});
  };

  // Helper function to map center names
  const mapCenterName = (center: string | null | undefined): string => {
    if (!center) return '';
    const lowerCenter = center.toLowerCase().trim();
    if (lowerCenter.includes('choa chu kang')) return 'CCK';
    if (lowerCenter.includes('jurong east')) return 'JE';
    if (lowerCenter.includes('hougang')) return 'HG';
    return center;
  };

  // Get center from student (check both section and additionalData.center)
  const getStudentCenter = (student: Student): string => {
    // Try additionalData.center first, then section
    const additionalData = student.additionalData as any;
    const center = additionalData?.center || student.centre || '';
    return mapCenterName(center);
  };

  // Apply search, filters, and sorting
  const processedStudents = (() => {
    let result = [...students];
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(student => 
        student.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.student_BC?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.level?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.class?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.centre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.gender?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.dateOfBirth?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply column filters
    filters.forEach(filter => {
      if (filter.values.length > 0) {
        result = result.filter(student => {
          const value = String(student[filter.column as keyof Student] || '');
          return filter.values.includes(value);
        });
      }
    });
    
    // Apply sorting
    if (sortConfig.column && sortConfig.direction) {
      result.sort((a, b) => {
        const aVal = String(a[sortConfig.column as keyof Student] || '').toLowerCase();
        const bVal = String(b[sortConfig.column as keyof Student] || '').toLowerCase();
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return result;
  })();

  // Calculate center statistics
  const activeStudents = students.filter(s => s.status === 'active');
  const jeStudents = students.filter(s => getStudentCenter(s) === 'JE');
  const cckStudents = students.filter(s => getStudentCenter(s) === 'CCK');
  const hgStudents = students.filter(s => getStudentCenter(s) === 'HG');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="page-title">Student Database</h1>
          <p className="text-muted-foreground mt-1">Manage student records with import/export functionality</p>
        </div>
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={handleExport}
            data-testid="button-export"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button 
            onClick={handleImport}
            data-testid="button-import"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex flex-col justify-between h-full">
                <div className="text-container">
                  <p className="text-sm font-medium text-muted-foreground">Total Active Students</p>
                </div>
                <div className="value-container">
                  <p className="text-2xl font-bold" data-testid="stat-active-students">
                    {activeStudents.length}
                  </p>
                </div>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="h-16">
              <div className="flex flex-col justify-between h-full">
                <div className="text-container">
                  <p className="text-sm font-medium text-muted-foreground">Total JE Students</p>
                </div>
                <div className="value-container">
                  <p className="text-2xl font-bold" data-testid="stat-je-students">
                    {jeStudents.length}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="h-16">
              <div className="flex flex-col justify-between h-full">
                <div className="text-container">
                  <p className="text-sm font-medium text-muted-foreground">Total CCK Students</p>
                </div>
                <div className="value-container">
                  <p className="text-2xl font-bold" data-testid="stat-cck-students">
                    {cckStudents.length}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="h-16">
              <div className="flex flex-col justify-between h-full">
                <div className="text-container">
                  <p className="text-sm font-medium text-muted-foreground">Total HG Students</p>
                </div>
                <div className="value-container">
                  <p className="text-2xl font-bold" data-testid="stat-hg-students">
                    {hgStudents.length}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5" />
            <span>Student Records</span>
            <Badge variant="secondary">{processedStudents.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search students by name, ID, email, grade, class, section, gender, or birthdate..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="search-input"
                />
              </div>
            </div>
            {filters.length > 0 && (
              <Button variant="outline" onClick={clearAllFilters} data-testid="button-clear-filters">
                <X className="w-4 h-4 mr-2" />
                Clear Filters ({filters.length})
              </Button>
            )}
            <Button variant="outline" data-testid="button-add-student">
              <Plus className="w-4 h-4 mr-2" />
              Add Student
            </Button>
          </div>

          {/* Students Table */}
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : processedStudents.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Students Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No students match your search criteria.' : 'Get started by importing your student data.'}
              </p>
              {!searchTerm && (
                <Button onClick={handleImport} data-testid="button-import-empty-state">
                  <Upload className="w-4 h-4 mr-2" />
                  Import Student Data
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      <span>BC No</span>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleSort('fullName')}
                          className="flex items-center space-x-1 hover:text-foreground" 
                          data-testid="sort-name"
                        >
                          <span>Name</span>
                          {sortConfig.column === 'fullName' && sortConfig.direction ? (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          ) : (
                            <ArrowUpDown className="w-4 h-4" />
                          )}
                        </button>
                        <Popover open={showFilters.fullName} onOpenChange={(open) => setFilterOpen('fullName', open)}>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Filter className="w-3 h-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56">
                            <FilterDropdown 
                              column="fullName" 
                              values={getUniqueValues('fullName')} 
                              selectedValues={filters.find(f => f.column === 'fullName')?.values || []} 
                              onSelectionChange={(values) => updateFilter('fullName', values)}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleSort('centre')}
                          className="flex items-center space-x-1 hover:text-foreground" 
                          data-testid="sort-center"
                        >
                          <span>Center</span>
                          {sortConfig.column === 'centre' && sortConfig.direction ? (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          ) : (
                            <ArrowUpDown className="w-4 h-4" />
                          )}
                        </button>
                        <Popover open={showFilters.centre} onOpenChange={(open) => setFilterOpen('centre', open)}>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" data-testid="filter-section">
                              <Filter className="w-3 h-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56">
                            <FilterDropdown 
                              column="centre" 
                              values={getUniqueValues('centre')} 
                              selectedValues={filters.find(f => f.column === 'centre')?.values || []} 
                              onSelectionChange={(values) => updateFilter('centre', values)}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleSort('level')}
                          className="flex items-center space-x-1 hover:text-foreground" 
                          data-testid="sort-level"
                        >
                          <span>Level</span>
                          {sortConfig.column === 'level' && sortConfig.direction ? (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          ) : (
                            <ArrowUpDown className="w-4 h-4" />
                          )}
                        </button>
                        <Popover open={showFilters.level} onOpenChange={(open) => setFilterOpen('level', open)}>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" data-testid="filter-level">
                              <Filter className="w-3 h-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56">
                            <FilterDropdown 
                              column="level" 
                              values={getUniqueValues('level')} 
                              selectedValues={filters.find(f => f.column === 'level')?.values || []} 
                              onSelectionChange={(values) => updateFilter('level', values)}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleSort('class')}
                          className="flex items-center space-x-1 hover:text-foreground" 
                          data-testid="sort-class"
                        >
                          <span>Class</span>
                          {sortConfig.column === 'class' && sortConfig.direction ? (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          ) : (
                            <ArrowUpDown className="w-4 h-4" />
                          )}
                        </button>
                        <Popover open={showFilters.class} onOpenChange={(open) => setFilterOpen('class', open)}>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Filter className="w-3 h-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56">
                            <FilterDropdown 
                              column="class" 
                              values={getUniqueValues('class')} 
                              selectedValues={filters.find(f => f.column === 'class')?.values || []} 
                              onSelectionChange={(values) => updateFilter('class', values)}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      <span>Session</span>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      <span>Admission Date</span>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      <span>Start Date</span>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      <span>End Date</span>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleSort('dateOfBirth')}
                          className="flex items-center space-x-1 hover:text-foreground" 
                          data-testid="sort-birthdate"
                        >
                          <span>Birthdate</span>
                          {sortConfig.column === 'dateOfBirth' && sortConfig.direction ? (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          ) : (
                            <ArrowUpDown className="w-4 h-4" />
                          )}
                        </button>
                        <Popover open={showFilters.dateOfBirth} onOpenChange={(open) => setFilterOpen('dateOfBirth', open)}>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Filter className="w-3 h-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56">
                            <FilterDropdown 
                              column="dateOfBirth" 
                              values={getUniqueValues('dateOfBirth')} 
                              selectedValues={filters.find(f => f.column === 'dateOfBirth')?.values || []} 
                              onSelectionChange={(values) => updateFilter('dateOfBirth', values)}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleSort('gender')}
                          className="flex items-center space-x-1 hover:text-foreground" 
                          data-testid="sort-gender"
                        >
                          <span>Gender</span>
                          {sortConfig.column === 'gender' && sortConfig.direction ? (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          ) : (
                            <ArrowUpDown className="w-4 h-4" />
                          )}
                        </button>
                        <Popover open={showFilters.gender} onOpenChange={(open) => setFilterOpen('gender', open)}>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Filter className="w-3 h-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56">
                            <FilterDropdown 
                              column="gender" 
                              values={getUniqueValues('gender')} 
                              selectedValues={filters.find(f => f.column === 'gender')?.values || []} 
                              onSelectionChange={(values) => updateFilter('gender', values)}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleSort('status')}
                          className="flex items-center space-x-1 hover:text-foreground" 
                          data-testid="sort-enrolment-status"
                        >
                          <span>Enrolment Status</span>
                          {sortConfig.column === 'status' && sortConfig.direction ? (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          ) : (
                            <ArrowUpDown className="w-4 h-4" />
                          )}
                        </button>
                        <Popover open={showFilters.status} onOpenChange={(open) => setFilterOpen('status', open)}>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" data-testid="filter-status">
                              <Filter className="w-3 h-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56">
                            <FilterDropdown 
                              column="status" 
                              values={getUniqueValues('status')} 
                              selectedValues={filters.find(f => f.column === 'status')?.values || []} 
                              onSelectionChange={(values) => updateFilter('status', values)}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {processedStudents.map((student) => {
                    const additionalData = student.additionalData as any || {};
                    
                    return (
                      <tr key={student.id} className="border-b hover:bg-muted/50" data-testid={"student-row-" + student.id}>
                        <td className="py-3 px-4" data-testid={"student-bc-no-" + student.id}>
                          {student.student_BC || additionalData.bcNo || additionalData.bc_no || '-'}
                        </td>
                        <td className="py-3 px-4" data-testid={"student-name-" + student.id}>
                          <div>
                            <div className="font-medium">
                              {student.fullName || '-'}
                            </div>
                            {/* Email field removed from schema */}
                          </div>
                        </td>
                        <td className="py-3 px-4" data-testid={"student-center-" + student.id}>
                          {student.centre || additionalData.center || '-'}
                        </td>
                        <td className="py-3 px-4" data-testid={"student-level-" + student.id}>
                          {student.level ? (
                            <Badge variant="secondary">{student.level}</Badge>
                          ) : '-'}
                        </td>
                        <td className="py-3 px-4" data-testid={"student-class-" + student.id}>
                          {student.class || '-'}
                        </td>
                        <td className="py-3 px-4" data-testid={"student-session-" + student.id}>
                          {additionalData.session || '-'}
                        </td>
                        <td className="py-3 px-4" data-testid={"student-admission-date-" + student.id}>
                          {additionalData.admissionDate || additionalData.admission_date || '-'}
                        </td>
                        <td className="py-3 px-4" data-testid={"student-start-date-" + student.id}>
                          {additionalData.startDate || additionalData.start_date || '-'}
                        </td>
                        <td className="py-3 px-4" data-testid={"student-end-date-" + student.id}>
                          {additionalData.endDate || additionalData.end_date || '-'}
                        </td>
                        <td className="py-3 px-4" data-testid={"student-birthdate-" + student.id}>
                          {student.dateOfBirth || '-'}
                        </td>
                        <td className="py-3 px-4" data-testid={"student-gender-" + student.id}>
                          {student.gender || '-'}
                        </td>
                        <td className="py-3 px-4" data-testid={"student-enrollment-" + student.id}>
                          {additionalData.enrollment || student.status || 'active'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={"button-edit-" + student.id}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={"button-delete-" + student.id}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student CSV Uploader */}
      <StudentCSVUploader
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
}