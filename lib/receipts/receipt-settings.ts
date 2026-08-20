import { supabase } from "@/lib/supabase";
import {
  ReceiptBusinessSettings,
  ReceiptBookingSettings,
  ReceiptSettings,
} from "./receipt-types";

export async function loadReceiptSettings(): Promise<ReceiptSettings> {
  const [businessResult, bookingResult] =
    await Promise.all([
      supabase
        .from("business_settings")
        .select(`
          business_name,
          phone,
          whatsapp_number,
          email,
          website,
          logo_url,
          stamp_url,
          receipt_business_name,
          receipt_show_logo,
          receipt_show_stamp,
          receipt_footer,
          currency,
          payment_instructions
        `)
        .eq("id", true)
        .maybeSingle(),

      supabase
        .from("booking_settings")
        .select("address")
        .limit(1)
        .maybeSingle(),
    ]);

  if (businessResult.error) {
    throw businessResult.error;
  }

  if (bookingResult.error) {
    throw bookingResult.error;
  }

  const business =
    businessResult.data as ReceiptBusinessSettings | null;

  const booking =
    bookingResult.data as ReceiptBookingSettings | null;

  const settings: ReceiptBusinessSettings =
    business ?? {
      business_name: "Sauti Tamu Piano Center",
      phone: null,
      whatsapp_number: null,
      email: null,
      website: null,

      logo_url: null,
      stamp_url: null,

      receipt_business_name:
        "Sauti Tamu Piano Center",

      receipt_show_logo: true,
      receipt_show_stamp: true,

      receipt_footer:
        "Thank you for choosing Sauti Tamu Piano Center.",

      currency: "KES",

      payment_instructions: null,
    };

  return {
    business: settings,

    address:
      booking?.address ??
      "Junction Trade Center, 4th Floor, Room F401, Nairobi CBD",
  };
}