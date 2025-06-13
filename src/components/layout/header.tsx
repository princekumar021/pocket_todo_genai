
import { ListChecks, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onClearList: () => void;
  taskCount: number;
}

export default function Header({ onClearList, taskCount }: HeaderProps) {
  return (
    <header className="bg-card shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-headline font-bold text-foreground">
            Pocket Tasks AI
          </h1>
        </div>
        {taskCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearList} aria-label="Clear all tasks">
            <Trash2 className="h-5 w-5 mr-2" />
            Clear List
          </Button>
        )}
      </div>
    </header>
  );
}
