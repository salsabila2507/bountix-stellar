export type PaymentType = "regular" | "escrow";
export type TaskType = "task" | "service";
export type WorkStatus =
  | "open"
  | "reviewing"
  | "in_progress"
  | "submitted"
  | "completed";

export type Task = {
  id: string;
  title: string;
  summary: string;
  budget: string;
  paymentType: PaymentType;
  status: WorkStatus;
  category: string;
  postedBy: string;
  location: string;
  applicants: number;
  submissions: number;
  skills: string[];
  timeline: string;
  negotiable: boolean;
  accessLevel: "early_contributor";
};

export type Creator = {
  id: string;
  name: string;
  handle: string;
  title: string;
  summary: string;
  reputation: number;
  completedTasks: number;
  approvalRate: string;
  responseTime: string;
  specialties: string[];
  services: string[];
  availableForEscrow: boolean;
};

export type Service = {
  id: string;
  creatorId: string;
  title: string;
  summary: string;
  startingAt: string;
  category: string;
  delivery: string;
  negotiable: boolean;
  paymentType: PaymentType;
};

export const tasks: Task[] = [];

export const creators: Creator[] = [];

export const services: Service[] = [];

export const dashboardStats = [
  { label: "Open tasks", value: "8" },
  { label: "Active deals", value: "3" },
  { label: "Pending submissions", value: "5" },
  { label: "Escrow ready", value: "2" },
];

export function getTask(id: string) {
  return tasks.find((task) => task.id === id);
}

export function getCreator(id: string) {
  return creators.find((creator) => creator.id === id);
}

export function getCreatorServices(creatorId: string) {
  return services.filter((service) => service.creatorId === creatorId);
}
