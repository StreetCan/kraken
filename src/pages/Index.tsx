import ModuleList from "@/components/ModuleList";
import { rick } from "@/components/made-with-dyad";

const Index = () => {
  return (
    <div className="min-h-screen bg-background py-8">
      <header className="max-w-[1700px] mx-auto px-4 mb-6">
        <div className="bg-card dark:bg-card rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Grade Tracker</h1>
              <p className="text-sm text-muted-foreground">Track modules, tasks, and semester contribution.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1700px] mx-auto px-4">
        <div className="bg-card dark:bg-card rounded-lg shadow-sm p-6">
          <ModuleList />
        </div>
      </main>

     
    </div>
  );
};

export default Index;
