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
                  The Getting Started section guides both new and returning users through their first steps with DishCovery. This includes logging in, signing up, and completing the Get Started setup form to personalize your experience.
                </p>

                <div className="feature-highlight">
                  <h3>Log In</h3>
                  <p>The Log In page allows existing users to access their DishCovery account using their email and password. Once logged in, you can view saved recipes, manage pantry ingredients, update preferences, and explore all features.</p>
                  <div className="tutorial-image-container">
                    <img src="/images/tutorial/1image.png" alt="Log In screen" />
                  </div>
                </div>

                <div className="feature-highlight">
                  <h3>Sign Up</h3>
                  <p>The Sign Up page is for new users who want to create a DishCovery account. You will provide your first name, last name, email, password, and confirm your password — or you may sign up using your Google account. After creating an account, you will be directed to the Get Started setup form.</p>
                  <div className="tutorial-image-container">
                    <img src="/images/tutorial/2image.png" alt="Sign Up form" />
                  </div>
                </div>

                <div className="feature-highlight">
                  <h3>The Get Started Form</h3>
                  <p>The Get Started form personalizes your DishCovery experience. Here, you will indicate whether you are setting up DishCovery for yourself or your household. You will then provide details about:</p>
                  <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
                    <li>Dietary restrictions</li>
                    <li>Medical conditions (allergens included)</li>
                    <li>Excluded ingredients</li>
                    <li>Meal preferences</li>
                  </ul>
                  <p>This ensures that all generated recipes match your needs and restrictions.</p>
                  <div className="tutorial-image-container">
                    <img src="/images/tutorial/3image.png" alt="Get Started personalization form" />
                  </div>
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
                  The Account & Settings section allows you to manage your profile and keep your experience accurate and personalized.
                </p>

                <div className="feature-highlight">
                  <h3>Edit Personal Information</h3>
                  <p>Update your name, email, and other personal details anytime.</p>
                </div>

                <div className="feature-highlight">
                  <h3>Update Dietary Restrictions</h3>
                  <p>Modify information that affects your meal suggestions:</p>
                  <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
                    <li>Medical conditions (with allergens included here)</li>
                    <li>Excluded ingredients</li>
                    <li>Meal preferences</li>
                  </ul>
                  <p>DishCovery uses this data to filter unsafe options and suggest meals appropriate for your needs.</p>
                </div>

                <div className="feature-highlight">
                  <h3>Manage Allergens</h3>
                  <p>Allergens are part of the Medical Conditions section. You can add or remove allergens to ensure safe and filtered recipe suggestions.</p>
                </div>

                <div className="feature-highlight">
                  <h3>Reset Your Password</h3>
                  <p>Through the User Profile page, you can use the Change Password option to update your password securely.</p>
                </div>

                <div className="feature-highlight">
                  <div className="tutorial-image-container">
                    <img src="/images/tutorial/4image.png" alt="Account settings dashboard" />
                  </div>
                </div>

                <div className="feature-highlight">
                  <h3>Favorites & Saved Recipes</h3>
                  <p>All recipes you save are stored in the Favorites page. This allows you to easily revisit meals you love or plan to cook later.</p>
                  <div className="tutorial-image-container">
                    <img src="/images/tutorial/14image.png" alt="Favorites page preview" />
                  </div>
                </div>

                <div className="feature-highlight">
                  <h3>Activity Tracking</h3>
                  <p>DishCovery records your recent actions to help you stay organized and quickly access what you need.</p>

                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2E7D32', margin: '16px 0 8px' }}>Recent Scans</h4>
                  <p>View your most recently scanned ingredients. This helps you recheck or re-add items without scanning again.</p>

                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2E7D32', margin: '16px 0 8px' }}>Last Opened Recipes</h4>
                  <p>You can also view a list of your recently opened recipes, giving you quick access to dishes you were exploring earlier.</p>

                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2E7D32', margin: '16px 0 8px' }}>Send Feedback</h4>
                  <p>Use the Feedback feature to send suggestions, report issues, or share your experience.</p>

                  <div className="tutorial-image-container">
                    <img src="/images/tutorial/15image.png" alt="Activity and recent actions interface" />
                  </div>
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
                  Using DishCovery includes adding ingredients, generating recipes, and customizing your meals. You may add ingredients manually through the Pantry, or use the Ingredient Recognition scanner with your camera.
                </p>
                <p>Once ingredients are added, DishCovery generates recipes that match your dietary restrictions, preferences, and available items. Recipes can be customized and saved to your Favorites for later use.</p>
                <div className="tutorial-image-container">
                  <img src="/images/tutorial/5image.png" alt="Pantry selection and camera scanner" />
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
                  DishCovery provides tailored recipe suggestions based on your needs. All recipes are reviewed by nutritionists and approved by dietitians to ensure health accuracy and safety.
                </p>
                <p>The app also handles allergens and food warnings, helping you maintain healthier eating habits every day.</p>
                <div className="tutorial-image-container">
                  <img src="/images/tutorial/6image.png" alt="Recipe details with nutrition info" />
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
                  If you encounter issues, DishCovery provides multiple support channels. You can send feedback, contact the team through email, or visit the Support and Contact Us sections. Troubleshooting guides are also available for common problems.
                </p>
                <div className="tutorial-image-container">
                  <img src="/images/tutorial/7image.png" alt="Support contact form" />
                </div>
              </div>
            </section>

            {/* === Full Tutorial === */}
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
                      <p>Open DishCovery and either log in or sign up. After entering your details, you are directed to the Get Started setup form.</p>
                      <div className="tutorial-image-container">
                        <img src="/images/tutorial/8image.png" alt="Login and signup screen" />
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="timeline-item">
                    <div className="timeline-marker">2</div>
                    <div className="timeline-content">
                      <h4>Complete the Get Started Form</h4>
                      <p>Provide your dietary restrictions, medical conditions (including allergens), excluded ingredients, and meal preferences to personalize your experience.</p>
                      <div className="tutorial-image-container">
                        <img src="/images/tutorial/9image.png" alt="Get Started form fields" />
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="timeline-item">
                    <div className="timeline-marker">3</div>
                    <div className="timeline-content">
                      <h4>Install DishCovery on Your Phone (PWA)</h4>
                      <p>DishCovery works on both web and mobile. On mobile browsers, tap Install App to add it to your home screen as a Progressive Web App.</p>
                      <div className="tutorial-image-container">
                        <img src="/images/tutorial/10image.png" alt="PWA install prompt" />
                      </div>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="timeline-item">
                    <div className="timeline-marker">4</div>
                    <div className="timeline-content">
                      <h4>Add Ingredients (Pantry or Scanner)</h4>
                      <p>Add ingredients manually through the Pantry or use the Ingredient Recognition scanner with your camera for fast detection.</p>
                      <div className="tutorial-image-container">
                        <img src="/images/tutorial/11image.png" alt="Pantry selection and camera scanner" />
                      </div>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="timeline-item">
                    <div className="timeline-marker">5</div>
                    <div className="timeline-content">
                      <h4>Generate Recipes</h4>
                      <p>DishCovery generates recipes based on your dietary restrictions and available ingredients. All recipes are verified by nutrition professionals.</p>
                      <div className="tutorial-image-container">
                        <img src="/images/tutorial/12image.png" alt="Generated recipe results" />
                      </div>
                    </div>
                  </div>

                  {/* Step 6 */}
                  <div className="timeline-item">
                    <div className="timeline-marker">6</div>
                    <div className="timeline-content">
                      <h4>Customize & Save Recipes</h4>
                      <p>Modify recipes to fit your personal preferences or available ingredients. Save meals to your Favorites for easy access later.</p>
                      <div className="tutorial-image-container">
                        <img src="/images/tutorial/13image.png" alt="Recipe customization and save button" />
                      </div>
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