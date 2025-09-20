'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import './styles.css';

export default function LegalWebApp() {
  const legalTopRef = useRef(null);
  const [activeSection, setActiveSection] = useState('privacy-policy');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const scrollToTop = () => {
    legalTopRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      const sections = ['privacy-policy', 'terms-service'];
      
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
    <div ref={legalTopRef} className="about-container">
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
                <Link
                  key={item.id}
                  href={`/about#${item.id}`}
                  className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                  onClick={() => scrollToSection(item.id)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            
            <div className="nav-category">
              <h3 className="nav-category-title">Support</h3>
              {navigationItems.filter(item => item.category === 'support').map((item) => (
                <Link
                  key={item.id}
                  href={`/about#${item.id}`}
                  className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                  onClick={() => scrollToSection(item.id)}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="nav-category">
              <h3 className="nav-category-title">Company</h3>
              {navigationItems.filter(item => item.category === 'company').map((item) => (
                <Link
                  key={item.id}
                  href={`/about#${item.id}`}
                  className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                  onClick={() => scrollToSection(item.id)}
                >
                  {item.label}
                </Link>
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
          <section id="privacy-policy" className="content-section">
            <div className="section-header">
              <h1 className="section-title">Privacy Policy</h1>
            </div>
            <div className="content-body">
              <p className="lead-text">
                DishCovery values your privacy. This Privacy Policy explains how we collect, use, and protect your personal information in compliance with the Philippine Data Privacy Act of 2012 (RA 10173).
              </p>
              <p className="last-updated">
                Last Updated: September 20, 2025
              </p>

              <div className="policy-section">
                <h3>Introduction</h3>
                <p>
                  At DishCovery, we are committed to protecting your personal information and ensuring transparency about how your data is handled. This Privacy Policy outlines the types of data we collect, how we use it, and the measures we take to safeguard it.
                </p>
              </div>

              <div className="policy-section">
                <h3>Information We Collect</h3>
                <p>We collect the following types of information when you use our web app:</p>
                <ul>
                  <li><strong>Personal Information:</strong> Name, email address, and contact information provided during account creation or inquiries.</li>
                  <li><strong>Non-Personal Information:</strong> Usage data (e.g., recipes viewed, interactions with the app), device information (e.g., browser type, IP address), and cookies or similar tracking technologies for analytics.</li>
                </ul>
              </div>

              <div className="policy-section">
                <h3>How We Use Your Information</h3>
                <p>We use your information to:</p>
                <ul>
                  <li>Create and manage your account.</li>
                  <li>Provide personalized recipe recommendations and improve our services.</li>
                  <li>Respond to your inquiries or customer support requests.</li>
                  <li>Send optional updates, announcements, or promotional offers (you may opt out at any time).</li>
                  <li>Analyze app usage to enhance functionality and user experience.</li>
                </ul>
              </div>

              <div className="policy-section">
                <h3>Data Sharing and Disclosure</h3>
                <p>
                  We do not sell or rent your personal data. We may share your information in the following cases:
                </p>
                <ul>
                  <li><strong>Service Providers:</strong> With trusted third-party providers (e.g., analytics, hosting, or payment processors) under strict confidentiality agreements.</li>
                  <li><strong>Legal Compliance:</strong> When required by law, legal processes, or to protect our rights, safety, or property.</li>
                </ul>
              </div>

              <div className="policy-section">
                <h3>Data Retention</h3>
                <p>
                  We retain your personal information only for as long as necessary to provide our services or as required by applicable laws. You may request deletion of your account at any time, after which your data will be removed in accordance with our deletion criteria.
                </p>
              </div>

              <div className="policy-section">
                <h3>Cookies and Tracking</h3>
                <p>
                  DishCovery uses cookies and similar technologies to improve your experience and analyze app performance. You can manage cookie preferences through your browser settings or our cookie consent tool.
                </p>
              </div>

              <div className="policy-section">
                <h3>Your Rights</h3>
                <p>
                  Under the Philippine Data Privacy Act, you have the right to:
                </p>
                <ul>
                  <li>Access, correct, or update your personal information.</li>
                  <li>Withdraw consent for data processing.</li>
                  <li>Request deletion of your data.</li>
                  <li>Lodge a complaint with the National Privacy Commission (NPC).</li>
                </ul>
                <p>
                  To exercise these rights, please contact us at <a href="mailto:privacy@dishcovery.com">privacy@dishcovery.com</a>.
                </p>
              </div>

              <div className="policy-section">
                <h3>Security Measures</h3>
                <p>
                  We implement industry-standard security measures, including encryption, secure servers, and restricted access, to protect your personal data from unauthorized access, disclosure, alteration, or destruction.
                </p>
              </div>

              <div className="policy-section">
                <h3>Policy Updates</h3>
                <p>
                  We may update this Privacy Policy periodically to reflect changes in our practices or legal requirements. Significant changes will be communicated by posting the updated policy on our web app with the effective date.
                </p>
              </div>

              <div className="policy-section">
                <h3>Contact Information</h3>
                <p>
                  For questions or concerns about this Privacy Policy, please contact us at <a href="mailto:privacy@dishcovery.com">privacy@dishcovery.com</a> or through our contact form on the app.
                </p>
              </div>
            </div>
          </section>

          <section id="terms-service" className="content-section">
            <div className="section-header">
              <h1 className="section-title">Terms of Service</h1>
            </div>
            <div className="content-body">
              <p className="lead-text">
                Welcome to DishCovery! By creating an account or using our services, you agree to comply with and be bound by the following Terms of Service. Please read them carefully before using our web app.
              </p>
              <p className="last-updated">
                Last Updated: September 20, 2025
              </p>

              <div className="policy-section">
                <h3>Introduction</h3>
                <p>
                  These Terms of Service govern your use of DishCovery, including our web app and related services. By accessing or using our services, you acknowledge that you have read, understood, and agree to be bound by these terms and our Privacy Policy.
                </p>
              </div>

              <div className="policy-section">
                <h3>Acceptance of Terms</h3>
                <p>
                  By accessing or using DishCovery, you agree to these Terms of Service. You will be required to confirm your agreement by checking a box during account creation or before using certain features. If you do not agree, please do not use our services.
                </p>
              </div>

              <div className="policy-section">
                <h3>Eligibility</h3>
                <p>
                  You must be at least 18 years old or have the consent of a parent or legal guardian to use DishCovery. By using the app, you represent that you meet these eligibility requirements and have the legal capacity to enter into this agreement.
                </p>
              </div>

              <div className="policy-section">
                <h3>User Responsibilities</h3>
                <p>You agree to:</p>
                <ul>
                  <li>Provide accurate and complete information when creating your account.</li>
                  <li>Follow our community guidelines and not post, upload, or share content that is offensive, defamatory, obscene, or violates the rights of others.</li>
                  <li>Not misuse the service, including engaging in spamming, hacking, or other illegal activities.</li>
                </ul>
              </div>

              <div className="policy-section">
                <h3>Account and Security</h3>
                <p>
                  You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account. You agree not to share your account with others or use another person’s account. Notify us immediately at <a href="mailto:support@dishcovery.com">support@dishcovery.com</a> if you suspect your account has been compromised.
                </p>
              </div>

              <div className="policy-section">
                <h3>Use of the Service</h3>
                <p>
                  You may use DishCovery only for lawful purposes and in compliance with all applicable Philippine laws and regulations. Prohibited activities include:
                </p>
                <ul>
                  <li>Attempting to interfere with or disrupt the app’s functionality.</li>
                  <li>Using automated scripts or bots to access or scrape the app.</li>
                  <li>Violating the intellectual property rights of DishCovery or third parties.</li>
                </ul>
              </div>

              <div className="policy-section">
                <h3>Content Ownership and Licensing</h3>
                <p>
                  All content and materials on DishCovery, including logos, designs, text, and images, are owned by DishCovery and protected under Philippine intellectual property laws. You may not copy, reproduce, or distribute them without written permission.
                </p>
                <p>
                  By uploading or submitting content to DishCovery (e.g., user-generated recipes or comments), you grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute that content in connection with our services.
                </p>
              </div>

              <div className="policy-section">
                <h3>Payment and Subscriptions</h3>
                <p>
                  Certain features of DishCovery may require payment or subscriptions. All fees, billing terms, refunds, and cancellation policies will be clearly outlined during the subscription process. You agree to provide accurate payment information and authorize us to charge applicable fees.
                </p>
              </div>

              <div className="policy-section">
                <h3>Termination of Service</h3>
                <p>
                  We reserve the right to suspend or terminate your account if you violate these Terms of Service, engage in prohibited activities, or for any other reason at our discretion. You may terminate your account at any time by contacting us or using the account deletion feature.
                </p>
              </div>

              <div className="policy-section">
                <h3>Limitation of Liability</h3>
                <p>
                  DishCovery will not be liable for any indirect, incidental, or consequential damages arising from your use or inability to use our services, including but not limited to damages caused by misuse, downtime, or data loss, to the fullest extent permitted by law.
                </p>
              </div>

              <div className="policy-section">
                <h3>Dispute Resolution</h3>
                <p>
                  These Terms of Service are governed by the laws of the Philippines. Any disputes arising from or related to these terms will be resolved through negotiation or, if necessary, arbitration in accordance with Philippine law. You agree to submit to the jurisdiction of the courts in the Philippines for any legal proceedings.
                </p>
              </div>

              <div className="policy-section">
                <h3>Changes to Terms</h3>
                <p>
                  DishCovery may update these Terms of Service from time to time. We will notify users of significant changes by posting them on our web app. Continued use of the service after changes constitutes acceptance of the updated terms.
                </p>
              </div>

              <div className="policy-section">
                <h3>Contact Information</h3>
                <p>
                  For questions or concerns about these Terms of Service, please contact us at <a href="mailto:support@dishcovery.com">support@dishcovery.com</a> or through our contact form on the app.
                </p>
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
              <li><a href="/about">About Us</a></li>
              <li><a href="/about#contact">Contact</a></li>
              <li><a href="/about#careers">Careers</a></li>
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
          &copy; 2025 DishCovery. All rights reserved.
        </div>
      </footer>
    </div>
  );
}