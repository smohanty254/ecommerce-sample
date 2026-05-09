import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useCreateForm, useGetForm, useUpdateForm, useListFormSubmissions } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, GripVertical, Plus, Save, Trash2, Settings, List } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const FIELD_TYPES = [
  { type: "text", label: "Text Input" },
  { type: "textarea", label: "Text Area" },
  { type: "number", label: "Number" },
  { type: "email", label: "Email" },
  { type: "select", label: "Dropdown Select" },
  { type: "checkbox", label: "Checkbox" },
  { type: "radio", label: "Radio Buttons" },
  { type: "date", label: "Date Picker" },
  { type: "formula", label: "Calculated/Formula" },
];

const SortableField = ({ field, isActive, onSelect, onDelete }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={`border rounded-md p-3 flex items-center bg-card mb-2 ${isActive ? 'ring-2 ring-primary' : ''}`} onClick={() => onSelect(field)}>
      <div {...attributes} {...listeners} className="mr-3 cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">{field.label} <span className="text-xs text-muted-foreground ml-2">({field.type})</span></p>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(field.id); }}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default function AdminFormBuilder() {
  const params = useParams();
  const id = params.id ? parseInt(params.id) : null;
  const isNew = !id;
  const [, setLocation] = useLocation();

  const { data: form } = useGetForm(id as number, { query: { enabled: !!id } });
  const createForm = useCreateForm();
  const updateForm = useUpdateForm();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [fields, setFields] = useState<any[]>([]);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

  useEffect(() => {
    if (form) {
      setName(form.name);
      setDescription(form.description || "");
      setIsPublished(form.isPublished || false);
      setFields(form.fields || []);
    }
  }, [form]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setFields((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addField = (type: string) => {
    const newField = {
      id: `field_${Date.now()}`,
      type,
      label: `New ${type} field`,
      placeholder: "",
      required: false,
      options: type === "select" || type === "radio" ? ["Option 1"] : [],
      formula: "",
    };
    setFields([...fields, newField]);
    setActiveFieldId(newField.id);
  };

  const deleteField = (fieldId: string) => {
    setFields(fields.filter(f => f.id !== fieldId));
    if (activeFieldId === fieldId) setActiveFieldId(null);
  };

  const updateActiveField = (key: string, value: any) => {
    setFields(fields.map(f => f.id === activeFieldId ? { ...f, [key]: value } : f));
  };

  const activeField = fields.find(f => f.id === activeFieldId);

  const handleSave = () => {
    if (!name) return toast({ title: "Name required", variant: "destructive" });
    
    // Assign order based on array position
    const orderedFields = fields.map((f, i) => ({ ...f, order: i }));
    
    const data = { name, description, isPublished, fields: orderedFields };
    
    if (isNew) {
      createForm.mutate({ data }, {
        onSuccess: (res) => {
          toast({ title: "Form created" });
          setLocation(`/admin/forms/${res.id}`);
        },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
      });
    } else {
      updateForm.mutate({ id: id as number, data }, {
        onSuccess: () => toast({ title: "Form updated" }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
      });
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-4">
          <Link href="/admin/forms"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h2 className="text-xl font-bold">{isNew ? "Create Form" : "Edit Form"}</h2>
        </div>
        <Button onClick={handleSave} disabled={createForm.isPending || updateForm.isPending}>
          <Save className="mr-2 h-4 w-4" /> Save Form
        </Button>
      </div>

      <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-4 gap-6 pt-6">
        <div className="col-span-1 border-r pr-6 overflow-y-auto hidden md:block">
          <h3 className="font-semibold mb-4 text-sm uppercase text-muted-foreground">Add Fields</h3>
          <div className="grid grid-cols-1 gap-2">
            {FIELD_TYPES.map(ft => (
              <Button key={ft.type} variant="outline" className="justify-start text-sm" onClick={() => addField(ft.type)}>
                <Plus className="mr-2 h-4 w-4" /> {ft.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 overflow-y-auto px-2">
          <div className="bg-card border rounded-xl p-6 mb-6">
            <div className="space-y-4">
              <div>
                <Label>Form Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="E.g. Customer Feedback" className="font-semibold text-lg h-12 mt-1" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of this form..." className="mt-1" />
              </div>
              <div className="flex items-center space-x-2">
                <Switch checked={isPublished} onCheckedChange={setIsPublished} id="published" />
                <Label htmlFor="published">Published (Visible to users)</Label>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold text-lg">Form Fields</h3>
            <p className="text-sm text-muted-foreground">Drag to reorder, click to edit properties.</p>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
              <div className="min-h-[200px] border-2 border-dashed rounded-xl p-4 bg-muted/20">
                {fields.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm py-12">
                    Click a field type on the left to add it to your form.
                  </div>
                ) : (
                  fields.map(field => (
                    <SortableField 
                      key={field.id} 
                      field={field} 
                      isActive={activeFieldId === field.id}
                      onSelect={(f: any) => setActiveFieldId(f.id)}
                      onDelete={deleteField}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="col-span-1 border-l pl-6 overflow-y-auto bg-card rounded-lg p-4">
          <h3 className="font-semibold mb-4 text-sm uppercase text-muted-foreground flex items-center"><Settings className="mr-2 h-4 w-4"/> Field Properties</h3>
          
          {activeField ? (
            <div className="space-y-4">
              <div>
                <Label>Label</Label>
                <Input value={activeField.label} onChange={(e) => updateActiveField("label", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Field ID (Used for formulas)</Label>
                <Input value={activeField.id} disabled className="mt-1 bg-muted font-mono text-xs" />
              </div>
              {activeField.type !== 'checkbox' && activeField.type !== 'radio' && activeField.type !== 'formula' && (
                <div>
                  <Label>Placeholder</Label>
                  <Input value={activeField.placeholder || ""} onChange={(e) => updateActiveField("placeholder", e.target.value)} className="mt-1" />
                </div>
              )}
              <div className="flex items-center space-x-2 pt-2">
                <Switch checked={activeField.required} onCheckedChange={(c) => updateActiveField("required", c)} id="req" />
                <Label htmlFor="req">Required field</Label>
              </div>

              {(activeField.type === "select" || activeField.type === "radio") && (
                <div className="pt-4 border-t mt-4">
                  <Label>Options (Comma separated)</Label>
                  <Textarea 
                    value={(activeField.options || []).join(", ")} 
                    onChange={(e) => updateActiveField("options", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                    className="mt-1"
                    placeholder="Option 1, Option 2, Option 3"
                  />
                </div>
              )}

              {activeField.type === "formula" && (
                <div className="pt-4 border-t mt-4">
                  <Label>Formula Expression</Label>
                  <Textarea 
                    value={activeField.formula || ""} 
                    onChange={(e) => updateActiveField("formula", e.target.value)}
                    className="mt-1 font-mono text-sm"
                    placeholder="e.g. {field_123} * 1.2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Use field IDs wrapped in curly braces.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-12">
              Select a field to edit its properties.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
