import '../styles/globals.css';

export const metadata = {
  title: 'Karaoke-SASPORT',
  description: 'Znajdź najbliższe karaoke, sprawdź godziny i zamów swoją piosenkę.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body>
        <header>
          <div className="container nav">
            <div className="brand"><span className="badge">K</span> Karaoke-SASPORT</div>
            <div className="row">
              <a className="btn" href="/login">Zaloguj</a>
              <a className="btn" href="/register">Rejestracja</a>
              <a className="btn" href="/admin">Admin</a>
            </div>
          </div>
        </header>
        <main className="container" style={{paddingTop: '16px'}}>
          {children}
        </main>
      </body>
    </html>
  );
}
