'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import './styles.css';

export default function CareersWebApp() {
  const aboutTopRef = useRef(null);
  const [activeSection, setActiveSection] = useState('careers');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const scrollToTop = () => {
    aboutTopRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(sectionId);
    }
    setShowMobileMenu(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
      const sections = ['careers', 'what-is-dishcovery', 'our-story', 'mission-values', 'help-center', 'contact', 'privacy-policy', 'terms-service'];
      
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 100 && rect.bottom >= 100) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigationItems = [
    { id: 'what-is-dishcovery', label: 'What is DishCovery', category: 'about' },
    { id: 'our-story', label: 'Our Story', category: 'about' },
    { id: 'careers', label: 'Careers', category: 'company' },
    { id: 'mission-values', label: 'Mission & Values', category: 'about' },
    { id: 'help-center', label: 'Help Center', category: 'support' },
    { id: 'contact', label: 'Contact Us', category: 'support' },
    { id: 'privacy-policy', label: 'Privacy Policy', category: 'legal' },
    { id: 'terms-service', label: 'Terms of Service', category: 'legal' }
  ];

  const teamMembers = [
  {
    name: "Shulammite Peralta",
    role: "Project Leader & Frontend Developer",
    image: "/images/team/shulammite-peralta.png",
    social: {
      instagram: "#",
      linkedin: "#",
      portfolio: "#"
    }
  },
  {
    name: "Askia Islance Pesa",
    role: "Machine Learning Engineer & Backend Developer",
    image: "/images/team/askia-islance-pesa.png",
    social: {
      instagram: "#",
      linkedin: "#",
      portfolio: "#"
    }
  },
  {
    name: "Fatimah Sta. Romana",
    role: "Frontend Developer & UX/UI Designer",
    image: "/images/team/fatimah-sta-romana.jpeg",
    social: {
      instagram: "#",
      linkedin: "#",
      portfolio: "#"
    }
  },
  {
    name: "Samantha Nicole Boado",
    role: "Backend Developer",
    image: "/images/team/samantha-nicole-boado.png",
    social: {
      instagram: "#",
      linkedin: "#",
      portfolio: "#"
    }
  }
];

  return (
    <div ref={aboutTopRef} className="about-container">
      <div className="decorative-circle circle1"></div>
      <div className="decorative-circle circle2"></div>
      <div className="decorative-circle circle3"></div>

      <header className={`about-header ${isScrolled ? 'scrolled' : ''}`}>
        <button className="logo" onClick={scrollToTop}>
          <span className="logo-text">DishCovery</span>
        </button>

        <nav className="about-nav-links">
          <Link href="/" className="nav-link">Home</Link>
          <Link href="/user/pantry" className="nav-link">My Pantry</Link>
          <Link href="/user/favorites" className="nav-link">Favorites</Link>
        </nav>

        <div className="nav-actions">
          <Link href="/user/scanning" className="scan-nav-btn">
            <svg className="scan-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            Scan Now
          </Link>
          <button className="hamburger-btn" onClick={() => setShowMobileMenu(!showMobileMenu)}>
            <svg className="hamburger-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          </button>
        </div>
      </header>

      {showMobileMenu && (
        <div className="mobile-menu">
          <div className="mobile-menu-header">
            <span className="mobile-menu-logo">DishCovery</span>
            <button className="close-mobile-menu" onClick={() => setShowMobileMenu(false)}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="close-icon">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          <div className="mobile-menu-content">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                className={`mobile-nav-link ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => scrollToSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="about-layout">
        <aside className="about-sidebar">
          <nav className="about-navigation">
            <div className="nav-category">
              <h3 className="nav-category-title">About Us</h3>
              {navigationItems.filter(item => item.category === 'about').map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                  onClick={() => scrollToSection(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            
            <div className="nav-category">
              <h3 className="nav-category-title">Support</h3>
              {navigationItems.filter(item => item.category === 'support').map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                  onClick={() => scrollToSection(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="nav-category">
              <h3 className="nav-category-title">Company</h3>
              {navigationItems.filter(item => item.category === 'company').map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                  onClick={() => scrollToSection(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="nav-category">
              <h3 className="nav-category-title">Legal</h3>
              {navigationItems.filter(item => item.category === 'legal').map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                  onClick={() => scrollToSection(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </nav>
        </aside>

        <main className="about-content">
          <section id="careers" className="content-section">
            <div className="section-header">
              <h2 className="section-title">Our Team</h2>
            </div>
            <div className="content-body">
              <p className="lead-text">
                Meet the passionate team behind DishCovery. Our talented group of developers, designers, and engineers work together to make healthy cooking accessible to everyone.
              </p>
              
              <div className="developers-grid">
                {teamMembers.map((member, index) => (
                  <div key={index} className="developer-card">
                    <div className="developer-image">
                      <img src={member.image} alt={member.name} />
                    </div>
                    <div className="developer-info">
                      <h3 className="developer-name">{member.name}</h3>
                      <p className="developer-role">{member.role}</p>
                      <div className="contact-methods">
                        <div className="contact-method">
                          <div className="social-links">
                            <a href={member.social.instagram} className="contact-link">
                              <svg className="social-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849s-.012 3.584-.07 4.85c-.149 3.227-1.664 4.771-4.919 4.919-1.266.058-1.645.07-4.849.07s-3.584-.012-4.849-.07c-3.256-.148-4.771-1.664-4.919-4.919-.058-1.266-.07-1.645-.07-4.849s.012-3.584.07-4.849c.149-3.252 1.664-4.771 4.919-4.919 1.265-.058 1.645-.07 4.849-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948s.014 3.668.072 4.948c.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072s3.668-.014 4.948-.072c4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948s-.014-3.667-.072-4.947c-.2-4.354-2.617-6.782-6.979-6.979-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                              </svg>
                            </a>
                            <a href={member.social.linkedin} className="contact-link">
                              <svg className="social-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                              </svg>
                            </a>
                            <a href={member.social.portfolio} className="contact-link">
                              <svg className="social-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20 6h-4.5l-2-2h-7l-2 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 14H4V8h4.59l2-2h2.82l2 2H20v12zm-8-2c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0-6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/>
                              </svg>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="apply-section">
                <h4>Join Our Team</h4>
                <p>We’re looking for passionate innovators to help us grow Dishcovery. Send your resume and portfolio to <a href="mailto:careers@dishcovery.com">careers@dishcovery.com</a>.</p>
              </div>
            </div>
          </section>
        </main>
      </div>

      <footer className="about-footer">
        <div className="footer-content">
          <div className="footer-section">
            <button className="footer-logo" onClick={scrollToTop}>
              <span className="logo-text">DishCovery</span>
            </button>
            <p className="footer-description">
              Creating delicious meals with personalized recipes tailored to your ingredients and preferences.
            </p>
          </div>
          
          <div className="footer-section">
            <h3 className="footer-title">Product</h3>
            <ul className="footer-links">
              <li><a href="/scanning">Recipe Generator</a></li>
              <li><a href="/scanning">Smart Scanning</a></li>
              <li><a href="/pantry">Pantry Management</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3 className="footer-title">Company</h3>
            <ul className="footer-links">
              <li><button onClick={() => scrollToSection('what-is-dishcovery')}>About Us</button></li>
              <li><button onClick={() => scrollToSection('contact')}>Contact</button></li>
              <li><button onClick={() => scrollToSection('careers')}>Careers</button></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3 className="footer-title">Legal</h3>
            <ul className="footer-links">
              <li><button onClick={() => scrollToSection('privacy-policy')}>Privacy Policy</button></li>
              <li><button onClick={() => scrollToSection('terms-service')}>Terms of Service</button></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}