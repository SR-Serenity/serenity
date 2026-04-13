import './global.css';

export const metadata = {
  title: 'Serenity Lark MVP',
  description: 'Multi-tenant auth and organization bootstrap',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
