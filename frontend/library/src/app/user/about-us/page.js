'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import './styles.css';

export default function AboutWebApp() {
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

  const developers = [
    {
      name: "Shulammite Peralta",
      role: "Project Leader & Frontend Developer",
      image: "/images/team/shulammite-peralta.png",
      bio: "Oversees project management and coordinates team activities, while providing support in frontend development."
    },
    {
      name: "Askia Islance Pesa",
      role: "Machine Learning Engineer & Backend Developer",
      image: "/images/team/askia-islance-pesa.png",
      bio: "Responsible for backend development and implementing machine learning to enhance application functionality."
    },
    {
      name: "Fatimah Sta. Romana",
      role: "Frontend Developer & UX/UI Designer",
      image: "/images/team/fatimah-sta-romana.jpeg",
      bio: "Plays a central role in frontend development and contributes to interface design to ensure clarity and a user-centered experience."
    },
    {
      name: "Samantha Nicole Boado",
      role: "Backend Developer",
      image: "/images/team/samantha-nicole-boado.png",
      bio: "Focuses on backend systems and connectivity, maintaining reliable performance and efficient data flow."
    }]

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
          <section id="what-is-dishcovery" className="content-section">
            <div className="section-header">
              <h1 className="section-title">What is DishCovery?</h1>
            </div>
            <div className="content-body">
              <p className="lead-text">
                DishCovery, in the simplest terms, is a combination of "dish" and "discovery." It's a web app that allows you to generate recipes based on your dietary restrictions and the ingredients you already have at home.
              </p>
              
              <div className="feature-highlight">
                <h3>How It Works</h3>
                <p>By simply scanning or inputting your available ingredients, DishCovery instantly provides you with verified recipes created and reviewed by professionals such as dietitians, doctors, and nutritionists.</p>
              </div>

              <div className="problem-solution">
                <h3>The Problem We Solve</h3>
                <p>The main problem DishCovery solves is the difficulty of meal planning, especially for those in charge of household cooking or dealing with dietary restrictions. Dishes often become repetitive and uninspiring, making daily meals feel like a chore. With DishCovery, users can simply scan what they already have at home, and the app will suggest fresh and suitable recipes. This makes meal preparation not only easier but also healthier, more enjoyable, and more efficient.</p>
              </div>

              <div className="cultural-focus">
                <h3>Personalized Approach</h3>
                <p>We chose to focus on recipes and dietary needs that match users’ everyday lifestyles. By working with flavors that feel familiar and ingredients that are easy to find at home, the app makes healthy eating more accessible and convenient. This way, users can enjoy meals that suit their preferences while making healthier choices feel natural rather than complicated or out of reach.</p>
              </div>

              <div className="unique-value">
                <h3>What Makes Us Unique</h3>
                <p>What makes DishCovery unique compared to other recipe platforms is its real-time ingredient scanning and tailored recipe generation. While many recipe generators exist, DishCovery goes further by focusing on personalization—recipes are designed based on what you already have and what your body needs. On top of that, all suggested dishes are verified by professionals, ensuring they're not only delicious but also nutritious and safe.</p>
              </div>
            </div>
          </section>

          <section id="our-story" className="content-section">
            <div className="section-header">
              <h2 className="section-title">Our Story</h2>
            </div>
            <div className="content-body">
              <p className="lead-text">
                DishCovery was born from a simple observation: too many people struggle with the daily decision of what to cook, often leading to food waste and repetitive meals.
              </p>
              
              <div className="story-timeline">
                <div className="timeline-item">
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <h4>The Beginning (January 2025)</h4>
                    <p>Our team came together with a shared vision: to solve the daily struggle of meal planning while reducing food waste. We identified the opportunity to combine AI technology with personalized dietary needs to create something truly meaningful.</p>
                  </div>
                </div>
                
                <div className="timeline-item">
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <h4>Research Phase (February 2025)</h4>
                    <p>We began extensive research on Filipino dietary preferences, common household ingredients, and nutritional requirements. We studied user behavior patterns and identified key pain points in existing recipe platforms.</p>
                  </div>
                </div>
                
                <div className="timeline-item">
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <h4>Development Phase (March - August 2025)</h4>
                    <p>Our development team worked tirelessly to build the AI-powered ingredient recognition system, develop the user interface, and create the backend infrastructure. We focused on making the app intuitive while maintaining robust functionality.</p>
                  </div>
                </div>
                
                <div className="timeline-item">
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <h4>Professional Verification (September 2025)</h4>
                    <p>We conducted interviews with dietitians, nutritionists, and doctors to ensure our recipes meet the highest health and safety standards. This crucial step validates our commitment to providing medically-approved content.</p>
                  </div>
                </div>
                
                <div className="timeline-item">
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <h4>Launch (October 2025)</h4>
                    <p>DishCovery officially launches to serve households everywhere. We're excited to help users discover new recipes, reduce food waste, and embrace healthier eating habits through our innovative platform.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="meet-developers" className="content-section">
            <div className="section-header">
              <h2 className="section-title">Meet the Developers</h2>
            </div>
            <div className="content-body">
              <p className="lead-text">
                Meet the passionate team behind DishCovery. Our diverse group of developers, designers, and engineers work together to make healthy cooking accessible to everyone.
              </p>
              
              <div className="developers-grid">
                {developers.map((developer, index) => (
                  <div key={index} className="developer-card">
                    <div className="developer-image">
                      <img src={developer.image} alt={developer.name} />
                    </div>
                    <div className="developer-info">
                      <h3 className="developer-name">{developer.name}</h3>
                      <p className="developer-role">{developer.role}</p>
                      <p className="developer-bio">{developer.bio}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="mission-values" className="content-section">
            <div className="section-header">
              <h2 className="section-title">Mission & Values</h2>
            </div>
            <div className="content-body">
              <div className="mission-statement">
                <h3>Our Mission</h3>
                <p className="mission-text">
                  To empower families and individuals to eat healthier, reduce food waste, and discover the joy of cooking by providing personalized, culturally relevant recipe recommendations that work with what they already have at home.
                </p>
              </div>
              
              <div className="values-grid">
                <div className="value-card">
                  <div className="value-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                    </svg>
                  </div>
                  <h4>Health First</h4>
                  <p>Every recipe is reviewed by healthcare professionals to ensure nutritional value and safety.</p>
                </div>
                
                <div className="value-card">
                  <div className="value-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <h4>Cultural Relevance</h4>
                  <p>We celebrate diverse cuisines and make healthy eating feel familiar and accessible.</p>
                </div>
                
                <div className="value-card">
                  <div className="value-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.5,12A1.5,1.5 0 0,1 16,10.5A1.5,1.5 0 0,1 17.5,9A1.5,1.5 0 0,1 19,10.5A1.5,1.5 0 0,1 17.5,12M14.5,8A1.5,1.5 0 0,1 13,6.5A1.5,1.5 0 0,1 14.5,5A1.5,1.5 0 0,1 16,6.5A1.5,1.5 0 0,1 14.5,8M9.5,8A1.5,1.5 0 0,1 8,6.5A1.5,1.5 0 0,1 9.5,5A1.5,1.5 0 0,1 11,6.5A1.5,1.5 0 0,1 9.5,8M6.5,12A1.5,1.5 0 0,1 5,10.5A1.5,1.5 0 0,1 6.5,9A1.5,1.5 0 0,1 8,10.5A1.5,1.5 0 0,1 6.5,12M12,3A9,9 0 0,0 3,12A9,9 0 0,0 12,21A9,9 0 0,0 21,12A9,9 0 0,0 12,3M12,19A7,7 0 0,1 5,12A7,7 0 0,1 12,5A7,7 0 0,1 19,12A7,7 0 0,1 12,19Z"/>
                    </svg>
                  </div>
                  <h4>Sustainability</h4>
                  <p>We help reduce food waste by maximizing the use of ingredients you already have.</p>
                </div>
                
                <div className="value-card">
                  <div className="value-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                    </svg>
                  </div>
                  <h4>Innovation</h4>
                  <p>We continuously improve our AI technology to provide better, more personalized experiences.</p>
                </div>
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
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} DishCovery. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}