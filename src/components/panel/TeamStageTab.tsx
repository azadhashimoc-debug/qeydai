import { useState } from "react";

type TeamSection = "workspace" | "members";

interface TeamFieldDef {
  id: string;
  team: { id: string; name: string };
  fieldNameLabel: string;
  fieldNamePlaceholder: string;
}

interface TeamStageTabProps {
  section: TeamSection;
  canManageConfig: boolean;
  members: any[];
  onAddField: (fieldId: string) => void;
  onRemoveField?: (fieldId: string) => void;
  fields: TeamFieldDef[];
  newFieldName: string;
  setNewFieldName: (value: string) => void;
  handleAddField: (e: React.FormEvent) => void;
}

export const TeamStageTab = ({
  section,
  canManageConfig,
  members,
  onAddField,
  onRemoveField,
  fields,
  newFieldName,
  setNewFieldName,
  handleAddField,
}: TeamStageTabProps) => {
  const [fieldError, setFieldError] = useState<string | null>(null);

  return (
    {canManageConfig && (
      <>
        <form
          onSubmit={(e) => void handleAddField(e)}
          className="grid gap-3 border-t border-line pt-4"
          style={{ 'min-width': '0', position: 'relative', zIndex: 9999 }}
        >
          <div className="grid gap-3 sm:grid-cols-2" style={{ 'min-width': '0', position: 'relative' }}>
            <div>
              <label htmlFor={fieldNameId} className="block text-xs font-semibold text-muted">
                Field name
              </label>
              <input
                id={fieldNameId}
                type="text"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                placeholder="Exam target score"
                className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink"
              />
            </div>
          </div>
        </form>
      </>
    )}
  );
};