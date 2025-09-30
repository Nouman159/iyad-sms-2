import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Users, Settings, BarChart3 } from 'lucide-react';
import { Link } from 'wouter';

const operationCards = [
  {
    title: 'Student DB',
    description: 'Manage student database with import/export functionality',
    icon: Database,
    href: '/dashboards/operations/students',
    available: true,
    color: 'bg-blue-500'
  },
  {
    title: 'Staff Management',
    description: 'Manage staff records and assignments',
    icon: Users,
    href: '/dashboards/operations/staff',
    available: false,
    color: 'bg-green-500'
  },
  {
    title: 'System Settings',
    description: 'Configure operational parameters and settings',
    icon: Settings,
    href: '/dashboards/operations/settings',
    available: false,
    color: 'bg-purple-500'
  },
  {
    title: 'Operations Analytics',
    description: 'View operational metrics and performance data',
    icon: BarChart3,
    href: '/dashboards/operations/analytics',
    available: false,
    color: 'bg-orange-500'
  }
];

export default function Operations() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="page-title">Operations Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage operational systems and databases</p>
        </div>
      </div>

      {/* Operations Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {operationCards.map((card) => (
          <Card 
            key={card.href}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 relative"
            data-testid={`operation-card-${card.title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${card.color} text-white`}>
                    <card.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">{card.title}</CardTitle>
                  </div>
                </div>
                {!card.available && (
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                    Upcoming
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-muted-foreground text-sm mb-4">{card.description}</p>
              <div className="flex justify-end">
                <Link href={card.available ? card.href : '#'}>
                  <Button 
                    variant={card.available ? "default" : "secondary"}
                    disabled={!card.available}
                    data-testid={`button-access-${card.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {card.available ? 'Access' : 'Coming Soon'}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold" data-testid="stat-total-students">0</p>
              </div>
              <Database className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Records</p>
                <p className="text-2xl font-bold" data-testid="stat-active-records">0</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Grades</p>
                <p className="text-2xl font-bold" data-testid="stat-grades">0</p>
              </div>
              <BarChart3 className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Classes</p>
                <p className="text-2xl font-bold" data-testid="stat-classes">0</p>
              </div>
              <Settings className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}