import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}