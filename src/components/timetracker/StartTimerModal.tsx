"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Input";
import { BulletTextarea } from "@/components/ui/BulletTextarea";
import { WorkTypeToggle } from "@/components/ui/WorkTypeToggle";
import type { WorkType } from "@/lib/workType";
import { Button } from "@/components/ui/Button";

interface Props {
  open: boolean;
  onClose: () => void;
  onStart: (project: string, phase: string, workDone: string, workType: WorkType) => void;
  lockProject?: string;
}

export function StartTimerModal({ open, onClose, onStart, lockProject }: Props) {
  const [project, setProject] = useState(lockProject || "");
  const [phase, setPhase] = useState("");
  const [workDone, setWorkDone] = useState("");
  const [workType, setWorkType] = useState<WorkType>("project");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setProject(lockProject || "");
      // Opened from a project page, this timer is that project's by definition.
      setWorkType("project");
    }
  }, [open, lockProject]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!project.trim()) {
      setError(`Enter a ${workType === "task" ? "task" : "project"} to start the timer.`);
      return;
    }
    onStart(project.trim(), phase.trim(), workDone, workType);
    setProject(lockProject || "");
    setPhase("");
    setWorkDone("");
    setError(null);
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Start Timer">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!lockProject && (
          <div>
            <Label>Timing</Label>
            <WorkTypeToggle value={workType} onChange={setWorkType} />
          </div>
        )}
        <div>
          <Label>{workType === "task" ? "Task" : "Project"}</Label>
          <Input
            value={project}
            onChange={(e) => setProject(e.target.value)}
            placeholder={workType === "task" ? "e.g. Meetings" : "e.g. QuikSkope V2"}
            autoFocus={!lockProject}
            disabled={!!lockProject}
            required
          />
        </div>
        <div>
          <Label>Phase (optional)</Label>
          <Input value={phase} onChange={(e) => setPhase(e.target.value)} placeholder="e.g. Bug fix" autoFocus={!!lockProject} />
        </div>
        <div>
          {/* Bulleted like the other "what was done" fields — a session that runs
              all morning is rarely one thing. */}
          <Label hint="Press Enter for a new bullet">What are you working on? (optional)</Label>
          <BulletTextarea
            rows={3}
            value={workDone}
            onChange={setWorkDone}
            placeholder="You can fill this in now or before you stop the timer"
          />
        </div>

        {error && <p className="text-sm text-[#EF4444]">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit">
            <Play size={16} /> Start Timer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
