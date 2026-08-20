"use client";

import {
  Mail,
  MessageCircle,
  Phone,
  Wallet,
} from "lucide-react";

interface StudentActionsProps {
  onWhatsApp: () => void;
  onCall: () => void;
  onEmail: () => void;
  onReceivePayment: () => void;

  paymentDisabled?: boolean;
}

export default function StudentActions({
  onWhatsApp,
  onCall,
  onEmail,
  onReceivePayment,
  paymentDisabled = false,
}: StudentActionsProps) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-2">

      {/* WHATSAPP */}

      <button
        type="button"
        onClick={onWhatsApp}
        className="st-button st-button-secondary w-full"
      >
        <MessageCircle size={15} />
        WhatsApp
      </button>

      {/* CALL */}

      <button
        type="button"
        onClick={onCall}
        className="st-button st-button-secondary w-full"
      >
        <Phone size={15} />
        Call
      </button>

      {/* EMAIL */}

      <button
        type="button"
        onClick={onEmail}
        className="st-button st-button-secondary w-full"
      >
        <Mail size={15} />
        Email
      </button>

      {/* RECEIVE PAYMENT */}

      <button
        type="button"
        onClick={onReceivePayment}
        disabled={paymentDisabled}
        className="st-button st-button-primary w-full disabled:opacity-40"
      >
        <Wallet size={15} />
        Receive payment
      </button>

    </div>
  );
}