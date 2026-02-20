import "./globals.css";

export const metadata = {
  title: "Project2 Community",
  description: "Auto-published hot issue community for workers, students, and job seekers"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <div className="site-bg" />
        {children}
      </body>
    </html>
  );
}
