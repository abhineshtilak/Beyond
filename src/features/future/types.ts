export type FuturePlan = {
  id: string;
  title: string;
  description: string | null;
  plannedDate: string | null;
  imageUri: string | null;
  createdAt: number;
};

export type FuturePlanInput = {
  title: string;
  description?: string | null;
  plannedDate?: string | null;
  imageUri?: string | null;
};
