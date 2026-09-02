'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useExitAnimation } from '@/hooks/useExitAnimation';
import type { Task } from '@/types';
import { TaskEditor } from './TaskEditor';
import { TaskItem } from './TaskItem';
import { useTaskStore } from './task-store';

export function TaskList({ tasks, empty }: { tasks: Task[]; empty: React.ReactNode }) {
  const { today, pendingIds, setCompleted, updateTask, deleteTask } = useTaskStore();
  const router = useRouter();
  const [editing, setEditing] = useState<Task | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null);
  const { rendered, leavingIds } = useExitAnimation(tasks);

  if (rendered.length === 0) return <>{empty}</>;

  return (
    <>
      <ul className="-mx-2.5 divide-y divide-border/60">
        {rendered.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            today={today}
            pending={pendingIds.has(task.id)}
            leaving={leavingIds.has(task.id)}
            onToggle={(completed) => void setCompleted(task.id, completed)}
            onEdit={() => setEditing(task)}
            onDelete={() => setConfirmDelete(task)}
            onFocus={() => router.push(`/focus?taskId=${task.id}`)}
          />
        ))}
      </ul>

      <TaskEditor
        open={editing !== null}
        task={editing}
        onClose={() => setEditing(null)}
        onSubmit={async (input) => (editing ? updateTask(editing.id, input) : false)}
      />

      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete this task?"
        description={confirmDelete ? `“${confirmDelete.title}” will be removed for good.` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmDelete) void deleteTask(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-muted">XP you already earned from it stays yours.</p>
      </Modal>
    </>
  );
}
