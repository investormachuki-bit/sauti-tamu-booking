export type PaymentReceiptItem = {
  label: string;
  amount: number;
  date?: string;
  method?: string;
  reference?: string | null;
};

export type PaymentReceiptData = {
  receiptNumber: string;

  studentName: string;
  studentEmail: string;
  studentPhone: string;

  programmeName: string;
  instrument: string;

  programmeAmount: number;

  paymentHistory?: PaymentReceiptItem[];

  previousBalance: number;
  amountPaid: number;
  balanceAfterPayment: number;

  paymentMethod: string;
  paymentDate: string;

  reference?: string | null;
};

export type ReceiptBusinessSettings = {
  business_name: string;
  phone: string | null;
  whatsapp_number: string | null;
  email: string | null;
  website: string | null;

  logo_url: string | null;
  stamp_url: string | null;

  receipt_business_name: string;

  receipt_show_logo: boolean;
  receipt_show_stamp: boolean;

  receipt_footer: string;

  currency: string;

  payment_instructions: string | null;
};

export type ReceiptBookingSettings = {
  address: string | null;
};

export type ReceiptSettings = {
  business: ReceiptBusinessSettings;
  address: string;
};