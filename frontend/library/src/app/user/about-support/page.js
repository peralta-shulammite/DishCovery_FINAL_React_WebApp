
'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import './styles.css';

export default function AboutWebApp() {
  const aboutTopRef = useRef(null);
  const [activeSection, setActiveSection] = useState('help-center');
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
    { id: 'what-is-dishcovery', label: 'What is DishCovery', category: 'about' },
    { id: 'our-story', label: 'Our Story', category: 'about' },
    { id: 'meet-developers', label: 'Meet the Developers', category: 'about' },
    { id: 'mission-values', label: 'Mission & Values', category: 'about' },
    { id: 'help-center', label: 'Help Center', category: 'support' },
    { id: 'careers', label: 'Careers', category: 'company' },
    { id: 'contact', label: 'Contact Us', category: 'support' },
    { id: 'privacy-policy', label: 'Privacy Policy', category: 'legal' },
    { id: 'terms-service', label: 'Terms of Service', category: 'legal' }
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
          <section id="help-center" className="content-section">
            <div className="section-header">
              <h1 className="section-title">Welcome to the Help Center</h1>
            </div>
            <div className="content-body">
              <p className="lead-text">
                We're here to help you make the most of DishCovery. Explore the sections below for guidance on using our app, troubleshooting issues, or finding answers to common questions.
              </p>

              <div className="help-categories">
                <div className="help-category">
                  <h3>Getting Started</h3>
                  <ul className="help-links">
                    <li><a href="#signup">How to Sign Up</a></li>
                    <li><a href="#scanning">Scanning Ingredients</a></li>
                    <li><a href="#recipes">Generating Recipes</a></li>
                  </ul>
                </div>

                <div className="help-category">
                  <h3>Account & Settings</h3>
                  <ul className="help-links">
                    <li><a href="#profile">Managing Your Profile</a></li>
                    <li><a href="#dietary">Setting Dietary Restrictions</a></li>
                    <li><a href="#password">Resetting Your Password</a></li>
                  </ul>
                </div>

                <div className="help-category">
                  <h3>Using DishCovery</h3>
                  <ul className="help-links">
                    <li><a href="#ingredient-recognition">Ingredient Recognition</a></li>
                    <li><a href="#meal-customization">Customizing Meals</a></li>
                    <li><a href="#saving-recipes">Saving Recipes</a></li>
                  </ul>
                </div>

                <div className="help-category">
                  <h3>Recipes & Nutrition</h3>
                  <ul className="help-links">
                    <li><a href="#verification">Recipe Verification Process</a></li>
                    <li><a href="#allergens">Managing Allergens</a></li>
                    <li><a href="#diet-tips">Healthy Diet Tips</a></li>
                  </ul>
                </div>

                <div className="help-category">
                  <h3>Technical Support</h3>
                  <ul className="help-links">
                    <li><a href="#errors">Common Errors</a></li>
                    <li><a href="#troubleshooting">Troubleshooting Guide</a></li>
                  </ul>
                </div>
              </div>

              <div className="feature-highlight">
                <h3>Frequently Asked Questions (FAQs)</h3>
                <ul>
                  <li><strong>How do I scan ingredients?</strong> Use the "Scan Now" feature to take a photo or manually input ingredients from your pantry.</li>
                  <li><strong>Can I customize recipes?</strong> Yes, adjust recipes based on dietary preferences or available ingredients in the customization menu.</li>
                  <li><strong>What if the app doesn’t recognize an ingredient?</strong> Try re-scanning or manually entering the ingredient name for better accuracy.</li>
                  <li><strong>Are the recipes verified?</strong> All recipes are reviewed by dietitians and nutritionists for safety and nutritional value.</li>
                  <li><strong>How do I contact support?</strong> Reach out via <a href="mailto:support@dishcovery.com">support@dishcovery.com</a> or use the contact form below.</li>
                </ul>
              </div>

              <div className="contact-support">
                <h3>Still Need Help?</h3>
                <p>Reach out to our support team at <a href="mailto:support@dishcovery.com">support@dishcovery.com</a> or use the contact form in the Contact Us section.</p>
              </div>
            </div>
          </section>

          <section id="contact" className="content-section">
            <div className="section-header">
              <h2 className="section-title">Get in Touch</h2>
            </div>
            <div className="content-body">
              <p className="lead-text">
                We’d love to hear from you! Whether you have a question, feedback, or want to explore partnership opportunities, here’s how you can reach us.
              </p>

              <div className="contact-methods">
                <div className="contact-method">
                  <div className="contact-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                  </div>
                  <h3>Email Support</h3>
                  <p>Have a question or need assistance? Our support team is here to help.</p>
                  <a href="mailto:support@dishcovery.com" className="contact-link">support@dishcovery.com</a>
                </div>

                <div className="contact-method">
                  <div className="contact-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21 8V7l-3 2-3-2v1l3 2 3-2zm1-5H2C.9 3 0 3.9 0 5v14c0 1.1.9 2 2 2h20c1.1 0 1.99-.9 1.99-2L24 5c0-1.1-.9-2-2-2zM8 6c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm9 8H7v-2h10v2zm0-4H7V8h10v2z"/>
                    </svg>
                  </div>
                  <h3>Business Inquiries</h3>
                  <p>Interested in partnering with us? Reach out to discuss opportunities.</p>
                  <a href="mailto:partnerships@dishcovery.com" className="contact-link">partnerships@dishcovery.com</a>
                </div>

                <div className="contact-method">
                  <div className="contact-icon">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 14v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                  </div>
                  <h3>Social Media</h3>
                  <p>Connect with us on social media for updates and tips!</p>
                  <div>
                    <a href="https://facebook.com/dishcovery" className="contact-link">Facebook</a> | 
                    <a href="https://instagram.com/dishcovery" className="contact-link"> Instagram</a> | 
                    <a href="https://twitter.com/dishcovery" className="contact-link"> Twitter</a>
                  </div>
                </div>
              </div>

              <div className="contact-form-section">
                <h3>Feedback & Suggestions</h3>
                <form className="contact-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="name">Name</label>
                      <input type="text" id="name" placeholder="Your Name" required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="email">Email</label>
                      <input type="email" id="email" placeholder="Your Email" required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="message">Your Feedback</label>
                    <textarea id="message" rows="5" placeholder="Share your thoughts..." required></textarea>
                  </div>
                  <button type="submit" className="submit-btn">Submit Feedback</button>
                </form>
              </div>

              <div className="contact-form-section">
                <h3>Report an Issue</h3>
                <form className="contact-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="issue-name">Name</label>
                      <input type="text" id="issue-name" placeholder="Your Name" required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="issue-email">Email</label>
                      <input type="email" id="issue-email" placeholder="Your Email" required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="issue-type">Issue Type</label>
                    <select id="issue-type" required>
                      <option value="">Select an issue type</option>
                      <option value="technical">Technical Issue</option>
                      <option value="account">Account Issue</option>
                      <option value="recipe">Recipe Issue</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="issue-description">Describe the Issue</label>
                    <textarea id="issue-description" rows="5" placeholder="Please describe the issue..." required></textarea>
                  </div>
                  <button type="submit" className="submit-btn">Report Issue</button>
                </form>
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
