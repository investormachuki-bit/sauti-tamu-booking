# ManyChat WhatsApp → Sauti Tamu SMS Centre

## What this integration does

ManyChat sends each WhatsApp subscriber to the Sauti Tamu integration endpoint. Sauti Tamu stores the contact in the separate `manychat_whatsapp_contacts` table and exposes it as its own SMS Centre audience.

It does not create a lead, student, trial booking, or enrollment. It does not replace Resend or change the existing manual SMS workflow.

## Required Render environment variable

Set this server-side environment variable on the Sauti Tamu Render web service:

- `MANYCHAT_WEBHOOK_SECRET`: a long, randomly generated secret (at least 32 random bytes).

Do not put this secret in client-side code, a public URL, or a repository file.

## ManyChat External Request

In the WhatsApp automation, add an **External Request** action using:

- Method: `POST`
- URL: `https://sauti-tamu-booking.onrender.com/api/integrations/manychat/whatsapp`
- Header: `x-manychat-secret: <the same MANYCHAT_WEBHOOK_SECRET>`
- Content-Type: `application/json`

Use ManyChat's variable picker for the actual system fields; do not use Contact ID as the phone number. Map the WhatsApp-specific **WhatsApp ID** system field to `whatsapp_id`, and the **Contact ID** system field to `contact_id`.

Example request body (replace the example values with the corresponding ManyChat variables):

```json
{
  "contact_id": "ManyChat Contact ID",
  "whatsapp_id": "WhatsApp ID",
  "first_name": "First Name",
  "last_name": "Last Name",
  "full_name": "Full Name",
  "tags": "Sauti Tamu Lead, Piano Interest",
  "whatsapp_opted_in": true,
  "sms_marketing_opt_in": false
}
```

If your ManyChat workspace does not expose its tag list directly in the request variable picker, create a text custom field for the Sauti Tamu tag labels and pass the comma-separated value in `tags`. The endpoint accepts either a string or an array of tag strings.

Only set `sms_marketing_opt_in` to `true` after the subscriber has explicitly agreed to receive SMS marketing. WhatsApp opt-in is not SMS consent. When a later request explicitly sends `false`, the saved SMS marketing consent is revoked. If the field is omitted, an existing consent decision is preserved.

## SMS Centre behavior

- A separate **ManyChat WhatsApp contacts** audience is available.
- Contacts can be filtered by their synced ManyChat tags.
- Only contacts with `sms_marketing_opt_in = true` are loaded as campaign recipients.
- Contacts are deduplicated by phone number when loaded.
- Existing Manual, Leads, Trials, Students, and All audiences remain separate; ManyChat contacts are not silently added to All.
- Sending still uses the existing AirTouch provider and batch limits.

## Endpoint response

A successful request returns HTTP 200 with `success: true` and the saved contact summary. Invalid payloads return HTTP 400; a missing or incorrect shared secret returns HTTP 401.

## Deployment sequence

1. Apply `supabase/migrations/202611030001_manychat_whatsapp_contacts.sql` to the existing Sauti Tamu Supabase project.
2. Set `MANYCHAT_WEBHOOK_SECRET` on the existing Sauti Tamu Render service.
3. Deploy the code.
4. Configure the ManyChat External Request action and send a test subscriber.
5. Confirm the contact appears under SMS Centre → ManyChat WhatsApp contacts. A contact without SMS consent should sync but must not be loaded for marketing sends.
