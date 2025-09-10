import {
    SidebarProvider,
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarFooter,
    SidebarInset,
    SidebarTrigger,
  } from "@/components/ui/sidebar";
  import { MainNav } from "@/components/layout/main-nav";
  import { UserNav } from "@/components/layout/user-nav";
  import { Workflow } from "lucide-react";
  
  type AppShellProps = {
    children: React.ReactNode;
  };
  
  export function AppShell({ children }: AppShellProps) {
    return (
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2 p-2">
               <div className="p-2 bg-primary rounded-lg">
                 <Workflow className="w-6 h-6 text-primary-foreground" />
               </div>
               <h1 className="text-xl font-bold font-headline group-data-[collapsible=icon]:hidden">TaskMate</h1>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <MainNav />
          </SidebarContent>
          <SidebarFooter>
            <UserNav />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-10 flex items-center h-14 px-4 border-b bg-background/95 backdrop-blur-sm md:hidden">
              <SidebarTrigger />
              <div className="flex-1 text-center">
                  <h1 className="text-xl font-bold font-headline">TaskMate</h1>
              </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 md:p-8">
              {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }
  