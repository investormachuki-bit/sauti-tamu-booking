export type Student = {
  id: string;

  full_name: string;
  email: string | null;
  phone: string | null;

  instrument: string | null;
  programme: string | null;

  status: string | null;

  created_at: string;

  [key: string]: any;
};

export type Payment = {
  id: string;

  student_id: string;

  amount: number;

  payment_method: string | null;
  payment_date: string | null;

  reference: string | null;

  created_at: string;

  [key: string]: any;
};

export type StudentFormData = {
  full_name: string;
  email: string;
  phone: string;

  instrument: string;
  programme: string;

  status: string;
};

export type StudentStats = {
  total: number;
  active: number;
  inactive: number;
  totalPayments: number;
};