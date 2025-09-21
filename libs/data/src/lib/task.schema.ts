import { z } from 'zod';

export const TaskStatusEnum = z.enum(['todo', 'in-progress', 'done']);
export const TaskTypeEnum = z.enum(['personal', 'work']);
export const TaskPriorityEnum = z.enum(['low', 'medium', 'high']);

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters'),
  content: z.string(),
  type: TaskTypeEnum,
  priority: TaskPriorityEnum,
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  status: TaskStatusEnum.optional(),
});

export const taskSchema = z.object({
  id: z.string(),
  title: z.string().min(3).max(100),
  content: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  status: TaskStatusEnum,
  type: TaskTypeEnum,
  priority: TaskPriorityEnum,
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const orgQuerySchema = z.object({
  orgId: z.string().uuid().optional(),
});

export type CreateTask = z.infer<typeof createTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type Task = z.infer<typeof taskSchema>;
export type orgQuery = z.infer<typeof orgQuerySchema>;
