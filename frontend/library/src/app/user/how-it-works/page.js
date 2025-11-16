'use client';
import './styles.css';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

export default function TutorialPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('getting-started');

  const navItems = [
    { id: 'getting-started', label: 'Getting Started' },
    { id: 'account-settings', label: 'Account & Settings' },
    { id: 'using-dishcovery', label: 'Using DishCovery' },
    { id: 'recipes-nutrition', label: 'Recipes & Nutrition' },
    { id: 'technical-support', label: 'Technical Support' },
    { id: 'full-tutorial', label: 'Full Tutorial' },
  ];

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setIsMenuOpen(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = navItems.map(item => document.getElementById(item.id));
      const scrollPosition = window.scrollY + 150;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(navItems[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* === NAVIGATION BAR === */}
      <nav className="tutorial-nav">
        <div className="nav-container">
          <div className="nav-logo" onClick={() => scrollToSection('getting-started')}>
            <span style={{ fontWeight: 800, color: '#2E7D32', fontFamily: 'Poppins, sans-serif' }}>
              DishCovery
            </span>
          </div>

          <ul className="nav-menu desktop">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => scrollToSection(item.id)}
                  className={`nav-link ${activeSection === item.id ? 'active' : ''}`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          <button
            className="mobile-menu-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
          <ul>
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => scrollToSection(item.id)}
                  className={`mobile-nav-link ${activeSection === item.id ? 'active' : ''}`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="about-container">
        {/* Decorative Circles */}
        <div className="decorative-circle circle1"></div>
        <div className="decorative-circle circle2"></div>
        <div className="decorative-circle circle3"></div>

        <div className="about-layout">
          <main className="about-content">
            {/* Header */}
            <header className="tutorial-header" style={{ textAlign: 'center', marginBottom: '60px', marginTop: '80px' }}>
              <h1 style={{ fontSize: '2.8rem', fontWeight: 800, color: '#2E7D32', fontFamily: 'Poppins, sans-serif', letterSpacing: '-1px' }}>
                DishCovery Tutorial
              </h1>
              <p style={{ fontSize: '1.1rem', color: '#2E7D32', maxWidth: '700px', margin: '16px auto 0' }}>
                Master every feature of DishCovery and start cooking healthier, smarter meals today.
              </p>
            </header>

            {/* === Getting Started === */}
            <section id="getting-started" className="content-section">
              <div className="section-header">
                <h2 className="section-title">Getting Started</h2>
              </div>
              <div className="content-body">
                <p className="lead-text">
                  The Getting Started section guides new and returning users through the first steps of using DishCovery. It includes logging in, signing up, and completing the Get Started setup form to personalize your experience.
                </p>

                <div className="feature-highlight">
                  <h3>Log In</h3>
                  <p>Log In allows existing users to access their DishCovery account using their email and password. Once logged in, users can view their saved recipes, manage their pantry ingredients, update their preferences, and continue exploring all DishCovery features.</p>
                  <img src="/images/tutorial/1image.png" alt="Log In screen" className="tutorial-image" />
                </div>

                <div className="feature-highlight">
                  <h3>Sign Up</h3>
                  <p>Sign Up is for new users who want to create a DishCovery account. You will need to provide your first name, last name, email, password, and confirm your password — or you can sign up using your Google account. After signing up, you will be directed to the Get Started setup page to answer a few questions that help personalize your DishCovery experience.</p>
                  <img src="/images/tutorial/2image.png" alt="Sign Up form" className="tutorial-image" />
                </div>

                <div className="feature-highlight">
                  <h3>The Get Started Form</h3>
                  <p>The Get Started form is the next step for new users. In this form, you choose whether you are setting up DishCovery for yourself or for your household. You then provide your dietary restrictions, allergens, meal preferences, and any cultural food considerations. Completing this form allows DishCovery to generate personalized recipe suggestions that meet your specific needs.</p>
                  <img src="/images/tutorial/3image.png" alt="Get Started personalization form" className="tutorial-image" />
                </div>
              </div>
            </section>

            {/* === Account & Settings === */}
            <section id="account-settings" className="content-section">
              <div className="section-header">
                <h2 className="section-title">Account & Settings</h2>
              </div>
              <div className="content-body">
                <p className="lead-text">
                  The Account & Settings section allows you to manage your profile and keep it up to date. You can update personal information, adjust dietary restrictions, manage allergens, and set meal preferences or cultural considerations. You can also reset your password or modify other account settings at any time. Keeping your account information current ensures that DishCovery continues to provide the most accurate and personalized recommendations.
                </p>
                <div className="feature-highlight">
                  <img src="/images/tutorial/4image.png" alt="Account settings dashboard" className="tutorial-image" />
                </div>
              </div>
            </section>

            {/* === Using DishCovery === */}
            <section id="using-dishcovery" className="content-section">
              <div className="section-header">
                <h2 className="section-title">Using DishCovery</h2>
              </div>
              <div className="content-body">
                <p className="lead-text">
                  Using DishCovery involves adding ingredients, generating recipes, and customizing meals. Ingredients can be added either manually by way of your pantry or quickly using the Ingredient Recognition scanner with your camera. Once your ingredients are added, you can generate recipes that match your dietary needs and available items. You can also modify recipes according to your preferences and save your favorites for easy access in the future.
                </p>
                <div className="feature-highlight">
                  <img src="/images/tutorial/5image.png" alt="Adding ingredients via pantry and scanner" className="tutorial-image" />
                </div>
              </div>
            </section>

            {/* === Recipes & Nutrition === */}
            <section id="recipes-nutrition" className="content-section">
              <div className="section-header">
                <h2 className="section-title">Recipes & Nutrition</h2>
              </div>
              <div className="content-body">
                <p className="lead-text">
                  DishCovery provides recipes that are tailored to your dietary restrictions and preferences. All recipes are carefully reviewed and approved by professional nutritionists and dietitians to ensure accuracy, health standards, and nutritional value. The app also manages allergens and provides food warnings to keep your meals safe. In addition, DishCovery includes nutrition-focused tips and guidance to help you make healthier food choices every day.
                </p>
                <div className="feature-highlight">
                  <img src="/images/tutorial/6image.png" alt="Recipe details with nutrition info" className="tutorial-image" />
                </div>
              </div>
            </section>

            {/* === Technical Support === */}
            <section id="technical-support" className="content-section">
              <div className="section-header">
                <h2 className="section-title">Technical Support</h2>
              </div>
              <div className="content-body">
                <p className="lead-text">
                  If you encounter any issues while using DishCovery, you can get support through multiple channels. Users can submit feedback or send emails through the app. The Support and Contact Us sections provide additional guidance, and step-by-step troubleshooting guides are available to help resolve common problems efficiently. This ensures that your experience with the app remains smooth and hassle-free.
                </p>
                <div className="feature-highlight">
                  <img src="/images/tutorial/7image.png" alt="Support contact form" className="tutorial-image" />
                </div>
              </div>
            </section>

            {/* === Full Tutorial Steps === */}
            <section id="full-tutorial" className="content-section">
              <div className="section-header">
                <h2 className="section-title">Full DishCovery Tutorial</h2>
              </div>
              <div className="content-body">
                <div className="story-timeline" style={{ counterReset: 'step' }}>
                  {/* Step 1 */}
                  <div className="timeline-item">
                    <div className="timeline-marker">1</div>
                    <div className="timeline-content">
                      <h4>Log In or Create an Account</h4>
                      <p>When you open DishCovery for the first time, you can either log in to an existing account or sign up for a new one. Signing up requires entering your first name, last name, email, password, and confirming your password, or you can sign up with Google. After logging in or signing up, you are directed to the Get Started setup form.</p>
                      <img src="/images/tutorial/8image.png" alt="Login and signup screen" className="tutorial-image" />
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="timeline-item">
                    <div className="timeline-marker">2</div>
                    <div className="timeline-content">
                      <h4>Complete the Get Started Form</h4>
                      <p>The Get Started form is where you personalize your DishCovery experience. You choose whether you are setting up the app for yourself or your household, and provide dietary restrictions, allergens, meal preferences, and any cultural considerations. Completing this form ensures that all recipe suggestions and recommendations are tailored to your needs.</p>
                      <img src="/images/tutorial/9image.png" alt="Get Started form fields" className="tutorial-image" />
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="timeline-item">
                    <div className="timeline-marker">3</div>
                    <div className="timeline-content">
                      <h4>Install DishCovery on Your Phone (PWA)</h4>
                      <p>DishCovery works on both web and mobile. If you are using a mobile device, you can install the Progressive Web App by tapping the “Install App” button, usually in your browser menu. Once installed, DishCovery will appear on your home screen like a normal app, making it easy to access anytime. You can also log in from any device using your account.</p>
                      <img src="/images/tutorial/10image.png" alt="PWA install prompt" className="tutorial-image" />
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="timeline-item">
                    <div className="timeline-marker">4</div>
                    <div className="timeline-content">
                      <h4>Add Ingredients (Pantry or Scanner)</h4>
                      <p>Ingredients can be added to your account in two ways. You can browse your pantry inside the app and select the items manually, or you can use the Ingredient Recognition scanner to quickly add items using your camera. This ensures your ingredients are ready for recipe generation.</p>
                      <img src="/images/tutorial/11image.png" alt="Pantry selection and camera scanner" className="tutorial-image" />
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="timeline-item">
                    <div className="timeline-marker">5</div>
                    <div className="timeline-content">
                      <h4>Generate Recipes</h4>
                      <p>After adding ingredients, DishCovery generates recipes that match your dietary restrictions, preferences, and available items. All recipes are nutritionist-verified and dietitian-approved for accuracy and health.</p>
                      <img src="/images/tutorial/12image.png" alt="Generated recipe results" className="tutorial-image" />
                    </div>
                  </div>

                  {/* Step 6 */}
                  <div className="timeline-item">
                    <div className="timeline-marker">6</div>
                    <div className="timeline-content">
                      <h4>Customize & Save Recipes</h4>
                      <p>DishCovery allows you to modify recipes based on the ingredients you have and your meal preferences. You can save recipes to your collection for easy access later, making meal planning efficient while maintaining a personalized and healthy diet.</p>
                      <img src="/images/tutorial/13image.png" alt="Recipe customization and save button" className="tutorial-image" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </>
  );
}