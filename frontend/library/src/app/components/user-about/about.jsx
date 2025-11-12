'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import './about.css';

export default function AboutLayout({ children }) {
  const aboutTopRef = useRef(null);
  const [activeSection, setActiveSection] = useState('what-is-dishcovery');
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
      const sections = ['what-is-dishcovery', 'our-story', 'meet-developers', 'mission-values', 'help-center', 'careers', 'contact', 'privacy-policy', 'terms-service'];
      
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
    { id: 'what-is-dishcovery', label: 'What is DishCovery', category: 'about', href: '/user/about-us' },
    { id: 'our-story', label: 'Our Story', category: 'about', href: '/user/about-us' },
    { id: 'meet-developers', label: 'Meet the Developers', category: 'about', href: '/user/about-us' },
    { id: 'mission-values', label: 'Mission & Values', category: 'about', href: '/user/about-us' },
    { id: 'help-center', label: 'Help Center', category: 'support', href: '/user/about-support' },
    { id: 'careers', label: 'Careers', category: 'company', href: '/user/about-company' },
    { id: 'contact', label: 'Contact Us', category: 'support', href: '/user/about-support' },
    { id: 'privacy-policy', label: 'Privacy Policy', category: 'legal', href: '/user/about-legal' },
    { id: 'terms-service', label: 'Terms of Service', category: 'legal', href: '/user/about-legal' }
  ];

  return (
    <div ref={aboutTopRef} className="about-container">
      <div className="decorative-circle circle1"></div>
      <div className="decorative-circle circle2"></div>
      <div className="decorative-circle circle3"></div>

      <header className={`about-header ${isScrolled ? 'scrolled' : ''}`}>
        <button className="logo" onClick={scrollToTop}>
          <a href="/" className="logo-text">DishCovery</a>
        </button>

        <nav className="about-nav-links">
          <Link href="/" className="nav-link">Home</Link>
          <Link href="/user/pantry" className="nav-link">My Pantry</Link>
          <Link href="/user/favorites" className="nav-link">Favorites</Link>
        </nav>

        <div className="nav-actions">
          <Link href="/user/Scanning" className="scan-nav-btn">
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
        <>
          <div className="mobile-menu-overlay" onClick={() => setShowMobileMenu(false)}></div>
          <div className="mobile-menu">
            <div className="mobile-menu-content">
              <div className="mobile-nav-category">
                <h3 className="mobile-nav-category-title">About Us</h3>
                {navigationItems.filter(item => item.category === 'about').map((item) => (
                  item.href ? (
                    <Link
                      key={item.id}
                      href={`${item.href}#${item.id}`}
                      className={`mobile-nav-link ${activeSection === item.id ? 'active' : ''}`}
                      onClick={() => setShowMobileMenu(false)}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      key={item.id}
                      className={`mobile-nav-link ${activeSection === item.id ? 'active' : ''}`}
                      onClick={() => scrollToSection(item.id)}
                    >
                      {item.label}
                    </button>
                  )
                ))}
              </div>

              <div className="mobile-nav-category">
                <h3 className="mobile-nav-category-title">Support</h3>
                {navigationItems.filter(item => item.category === 'support').map((item) => (
                  item.href ? (
                    <Link
                      key={item.id}
                      href={`${item.href}#${item.id}`}
                      className={`mobile-nav-link ${activeSection === item.id ? 'active' : ''}`}
                      onClick={() => setShowMobileMenu(false)}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      key={item.id}
                      className={`mobile-nav-link ${activeSection === item.id ? 'active' : ''}`}
                      onClick={() => scrollToSection(item.id)}
                    >
                      {item.label}
                    </button>
                  )
                ))}
              </div>

              <div className="mobile-nav-category">
                <h3 className="mobile-nav-category-title">Company</h3>
                {navigationItems.filter(item => item.category === 'company').map((item) => (
                  item.href ? (
                    <Link
                      key={item.id}
                      href={`${item.href}#${item.id}`}
                      className={`mobile-nav-link ${activeSection === item.id ? 'active' : ''}`}
                      onClick={() => setShowMobileMenu(false)}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      key={item.id}
                      className={`mobile-nav-link ${activeSection === item.id ? 'active' : ''}`}
                      onClick={() => scrollToSection(item.id)}
                    >
                      {item.label}
                    </button>
                  )
                ))}
              </div>

              <div className="mobile-nav-category">
                <h3 className="mobile-nav-category-title">Legal</h3>
                {navigationItems.filter(item => item.category === 'legal').map((item) => (
                  item.href ? (
                    <Link
                      key={item.id}
                      href={`${item.href}#${item.id}`}
                      className={`mobile-nav-link ${activeSection === item.id ? 'active' : ''}`}
                      onClick={() => setShowMobileMenu(false)}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      key={item.id}
                      className={`mobile-nav-link ${activeSection === item.id ? 'active' : ''}`}
                      onClick={() => scrollToSection(item.id)}
                    >
                      {item.label}
                    </button>
                  )
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="about-layout">
        <aside className="about-sidebar">
          <nav className="about-navigation">
            <div className="nav-category">
              <h3 className="nav-category-title">About Us</h3>
              {navigationItems.filter(item => item.category === 'about').map((item) => (
                item.href ? (
                  <Link
                    key={item.id}
                    href={`${item.href}#${item.id}`}
                    className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    key={item.id}
                    className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                    onClick={() => scrollToSection(item.id)}
                  >
                    {item.label}
                  </button>
                )
              ))}
            </div>

            <div className="nav-category">
              <h3 className="nav-category-title">Support</h3>
              {navigationItems.filter(item => item.category === 'support').map((item) => (
                item.href ? (
                  <Link
                    key={item.id}
                    href={`${item.href}#${item.id}`}
                    className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    key={item.id}
                    className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                    onClick={() => scrollToSection(item.id)}
                  >
                    {item.label}
                  </button>
                )
              ))}
            </div>

            <div className="nav-category">
              <h3 className="nav-category-title">Company</h3>
              {navigationItems.filter(item => item.category === 'company').map((item) => (
                item.href ? (
                  <Link
                    key={item.id}
                    href={`${item.href}#${item.id}`}
                    className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    key={item.id}
                    className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                    onClick={() => scrollToSection(item.id)}
                  >
                    {item.label}
                  </button>
                )
              ))}
            </div>

            <div className="nav-category">
              <h3 className="nav-category-title">Legal</h3>
              {navigationItems.filter(item => item.category === 'legal').map((item) => (
                item.href ? (
                  <Link
                    key={item.id}
                    href={`${item.href}#${item.id}`}
                    className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    key={item.id}
                    className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                    onClick={() => scrollToSection(item.id)}
                  >
                    {item.label}
                  </button>
                )
              ))}
            </div>
          </nav>
        </aside>

        <main className="about-content">
          {children}
        </main>
      </div>

      <footer className="about-footer">
        <div className="footer-content">
          <div className="footer-section">
            <button className="footer-logo" onClick={scrollToTop}>
              <a href="/" className="logo-text">DishCovery</a>
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
              <li><a href="/user/about-us#what-is-dishcovery">About Us</a></li>
              <li><a href="/user/about-support#contact">Contact</a></li>
              <li><a href="/user/about-company#careers">Careers</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3 className="footer-title">Legal</h3>
            <ul className="footer-links">
              <li><a href="/user/about-legal#privacy-policy">Privacy Policy</a></li>
              <li><a href="/user/about-legal#terms-service">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} DishCovery. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}