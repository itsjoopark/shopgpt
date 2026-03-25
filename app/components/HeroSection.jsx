import {useState, useEffect} from 'react';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HeroSection() {
  const [greeting, setGreeting] = useState('Welcome back');

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  return (
    <section className="hero-section">
      <div className="hero-brand">
        <h1>
          {greeting}, <span className="hero-name">Jules</span>
        </h1>
        <p className="subtitle">Shop smart. Browse less.</p>
      </div>
    </section>
  );
}
