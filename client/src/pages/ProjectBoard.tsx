import { Layout } from "@/components/layout/Layout";
import { useProject, useCards, useCreateCard, useMoveCard, useSubmitCardForm } from "@/hooks/use-projects";
import { useRoute } from "wouter";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCardSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Kanban Column Component
function KanbanColumn({ title, id, cards, onAddCard, onCardClick }: any) {
  return (
    <div className="w-80 flex-shrink-0 flex flex-col bg-muted/30 rounded-xl border border-border/50 h-[calc(100vh-12rem)]">
      <div className="p-4 flex items-center justify-between border-b border-border/50 bg-muted/20 rounded-t-xl backdrop-blur-sm">
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>
        <span className="text-xs bg-background/50 px-2 py-1 rounded-full text-muted-foreground font-mono">
          {cards.length}
        </span>
      </div>
      
      <Droppable droppableId={id.toString()}>
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="flex-1 p-2 overflow-y-auto custom-scrollbar space-y-3"
          >
            {cards.map((card: any, index: number) => (
              <Draggable key={card.id} draggableId={card.id.toString()} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={() => onCardClick(card)}
                    style={{ ...provided.draggableProps.style }}
                    className={`bg-card p-4 rounded-lg border shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary/50 transition-all ${
                      snapshot.isDragging ? "shadow-xl ring-2 ring-primary/20 rotate-2" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        card.priority === 'Alta' ? 'bg-red-500/10 text-red-600' : 
                        card.priority === 'Baixa' ? 'bg-green-500/10 text-green-600' : 
                        'bg-blue-500/10 text-blue-600'
                      }`}>
                        {card.priority}
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-2">
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </div>
                    <h4 className="font-medium text-sm mb-1">{card.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{card.description}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50">
                      <div className="flex items-center gap-1">
                         <Calendar className="w-3 h-3" />
                         <span>{card.dueDate ? format(new Date(card.dueDate), 'MMM d') : '-'}</span>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                        U1
                      </div>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      
      <div className="p-3 border-t border-border/50">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={() => onAddCard(id)}>
          <Plus className="w-4 h-4 mr-2" /> Add Card
        </Button>
      </div>
    </div>
  );
}

export default function ProjectBoard() {
  const [, params] = useRoute("/projects/:id");
  const projectId = parseInt(params?.id || "0");
  const { data: project } = useProject(projectId);
  const { data: cards, refetch } = useCards(projectId);
  const moveCard = useMoveCard();
  const createCard = useCreateCard(projectId);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);

  // New card form
  const form = useForm({
    resolver: zodResolver(insertCardSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "Média",
      projectId: projectId,
      columnId: 0
    }
  });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    
    // Optimistic update could happen here, but for now we rely on mutation + invalidation
    moveCard.mutate({
      id: parseInt(draggableId),
      columnId: parseInt(destination.droppableId),
      projectId
    });
  };

  const handleAddCard = (columnId: number) => {
    setSelectedColumn(columnId);
    form.setValue("columnId", columnId);
    form.setValue("projectId", projectId);
    setIsAddOpen(true);
  };

  const onSubmit = (data: any) => {
    createCard.mutate(data, {
      onSuccess: () => {
        setIsAddOpen(false);
        form.reset();
      }
    });
  };

  if (!project || !cards) return <Layout><div className="animate-pulse h-96 bg-muted/20 rounded-2xl" /></Layout>;

  // Group cards by column
  // Note: Assuming `columns` exist on project. If not, we might need default columns.
  const columns = project.columns && project.columns.length > 0 
    ? project.columns.sort((a,b) => a.order - b.order) 
    : [{id: 1, name: "Backlog"}, {id: 2, name: "In Progress"}, {id: 3, name: "Review"}, {id: 4, name: "Done"}]; // Fallback

  const getCardsForColumn = (colId: number) => cards.filter(c => c.columnId === colId);

  return (
    <Layout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold font-display">{project.name}</h1>
            <p className="text-sm text-muted-foreground">{project.description}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Timeline View</Button>
            <Button>Project Settings</Button>
          </div>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex-1 overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max h-full">
              {columns.map(col => (
                <KanbanColumn 
                  key={col.id} 
                  id={col.id} 
                  title={col.name} 
                  cards={getCardsForColumn(col.id)} 
                  onAddCard={handleAddCard}
                  onCardClick={(card: any) => console.log('Open card', card)} // Add modal here later
                />
              ))}
            </div>
          </div>
        </DragDropContext>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Card</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Textarea {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">Create Card</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
