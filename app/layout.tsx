import "./globals.css";
import ManyChatPixelTracker from "@/components/manychat/ManyChatPixelTracker";

export const metadata = {
  title: "Sauti Tamu Piano Center",
  description:
    "Sauti Tamu Piano Center — Piano and Acoustic Guitar training in Nairobi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ManyChatPixelTracker />
        {children}
      </body>
    </html>
  );
}
