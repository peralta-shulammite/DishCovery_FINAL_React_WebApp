'use client';
import './styles.css';
import { useState, useEffect } from 'react';
import { Menu, X, ChevronLeft, ChevronRight, XIcon } from 'lucide-react';

export default function TutorialPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('getting-started');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // All tutorial images
  const allImages = [
    { src: '/images/tutorial/1image.png', alt: 'Log In screen', section: 'Getting Started' },
    { src: '/images/tutorial/2image.png', alt: 'Sign Up form', section: 'Getting Started' },
    { src: '/images/tutorial/3image.png', alt: 'Get Started personalization form', section: 'Getting Started' },
    { src: '/images/tutorial/14image.png', alt: 'Profile settings interface', section: 'Account & Settings' },
    { src: '/images/tutorial/15image.png', alt: 'Activity and recent actions interface', section: 'Account & Settings' },
    { src: '/images/tutorial/5image.png', alt: 'Pantry selection and camera scanner', section: 'Using DishCovery' },
    { src: '/images/tutorial/6image.png', alt: 'Recipe details with nutrition info', section: 'Recipes & Nutrition' },
    { src: '/images/tutorial/7image.png', alt: 'Support contact form', section: 'Technical Support' },
    { src: '/images/tutorial/8image.png', alt: 'Login and signup screen', section: 'Full Tutorial' },
    { src: '/images/tutorial/9image.png', alt: 'Get Started form fields', section: 'Full Tutorial' },
    { src: '/images/tutorial/10image.png', alt: 'PWA install prompt', section: 'Full Tutorial' },
    { src: '/images/tutorial/11image.png', alt: 'Pantry selection and camera scanner', section: 'Full Tutorial' },
    { src: '/images/tutorial/12image.png', alt: 'Generated recipe results', section: 'Full Tutorial' },
    { src: '/images/tutorial/13image.png', alt: 'Recipe customization and save button', section: 'Full Tutorial' },
  ];

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
      const offset = window.innerWidth <= 768 ? 100 : 40;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setIsMenuOpen(false);
    }
  };

  const openLightbox = (index) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = 'auto';
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
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

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!lightboxOpen) return;
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'Escape') closeLightbox();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen]);

  return (
    <>
      {/* Sidebar Navigation */}
      <nav className="tutorial-nav">
        <div className="nav-logo" onClick={() => scrollToSection('getting-started')}>
          DishCovery
        </div>

        {/* Desktop Menu */}
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

        {/* Mobile Menu Toggle */}
        <div className="nav-container">
          <button
            className="mobile-menu-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Menu */}
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

      <div className="tutorial-container">
        <div className="tutorial-layout">
          <main className="tutorial-content">
            {/* Header */}
            <header className="tutorial-header">
              <h1>DishCovery Tutorial</h1>
              <p>Master every feature of DishCovery and start cooking healthier, smarter meals today.</p>
            </header>

            {/* Getting Started */}
            <section id="getting-started" className="content-section">
              <h2 className="section-title">Getting Started</h2>
              <p className="section-intro">
                The Getting Started section guides both new and returning users through their first steps with DishCovery. This includes logging in, signing up, and completing the Get Started setup form to personalize your experience.
              </p>

              <div className="content-block">
                <h3>Log In</h3>
                <p>The Log In page allows existing users to access their DishCovery account using their email and password. Once logged in, you can view saved recipes, manage pantry ingredients, update preferences, and explore all features.</p>
                <img 
                  src="/images/tutorial/1image.png" 
                  alt="Log In screen" 
                  className="tutorial-image"
                  onClick={() => openLightbox(0)}
                />
              </div>

              <div className="content-block">
                <h3>Sign Up</h3>
                <p>The Sign Up page is for new users who want to create a DishCovery account. You will provide your first name, last name, email, password, and confirm your password — or you may sign up using your Google account. After creating an account, you will be directed to the Get Started setup form.</p>
                <img 
                  src="/images/tutorial/2image.png" 
                  alt="Sign Up form" 
                  className="tutorial-image"
                  onClick={() => openLightbox(1)}
                />
              </div>

              <div className="content-block">
                <h3>The Get Started Form</h3>
                <p>The Get Started form personalizes your DishCovery experience. Here, you will indicate whether you are setting up DishCovery for yourself or your household. You will then provide details about:</p>
                <ul>
                  <li>Dietary restrictions</li>
                  <li>Medical conditions (allergens included)</li>
                  <li>Excluded ingredients</li>
                  <li>Meal preferences</li>
                </ul>
                <p>This ensures that all generated recipes match your needs and restrictions.</p>
                <img 
                  src="/images/tutorial/3image.png" 
                  alt="Get Started personalization form" 
                  className="tutorial-image"
                  onClick={() => openLightbox(2)}
                />
              </div>
            </section>

            {/* Account & Settings */}
            <section id="account-settings" className="content-section">
              <h2 className="section-title">Account & Settings</h2>
              <p className="section-intro">
                Manage your profile, view your favorite recipes, track your activity, and customize your DishCovery experience through Account & Settings.
              </p>

              <div className="content-block">
                <h3>Profile Settings</h3>
                <p>Update your personal information, change your password, and manage your account preferences. Keep your profile up to date to ensure the best personalized experience.</p>
                <img 
                  src="/images/tutorial/14image.png" 
                  alt="Profile settings interface" 
                  className="tutorial-image"
                  onClick={() => openLightbox(3)}
                />
              </div>

              <div className="content-block">
                <h3>My Favorites</h3>
                <p>Access all your saved recipes in one convenient location. Organize your favorites by meal type, cooking time, or dietary preferences for easy meal planning.</p>
              </div>

              <div className="content-block">
                <h3>Activity Tracking</h3>
                <p>DishCovery records your recent actions to help you stay organized and quickly access what you need.</p>

                <h4>Recent Scans</h4>
                <p>View your most recently scanned ingredients. This helps you recheck or re-add items without scanning again.</p>

                <h4>Last Opened Recipes</h4>
                <p>You can also view a list of your recently opened recipes, giving you quick access to dishes you were exploring earlier.</p>

                <h4>Send Feedback</h4>
                <p>Use the Feedback feature to send suggestions, report issues, or share your experience.</p>

                <img 
                  src="/images/tutorial/15image.png" 
                  alt="Activity and recent actions interface" 
                  className="tutorial-image"
                  onClick={() => openLightbox(4)}
                />
              </div>
            </section>

            {/* Using DishCovery */}
            <section id="using-dishcovery" className="content-section">
              <h2 className="section-title">Using DishCovery</h2>
              <p className="section-intro">
                Using DishCovery includes adding ingredients, generating recipes, and customizing your meals. You may add ingredients manually through the Pantry, or use the Ingredient Recognition scanner with your camera.
              </p>
              <p>Once ingredients are added, DishCovery generates recipes that match your dietary restrictions, preferences, and available items. Recipes can be customized and saved to your Favorites for later use.</p>
              <img 
                src="/images/tutorial/5image.png" 
                alt="Pantry selection and camera scanner" 
                className="tutorial-image"
                onClick={() => openLightbox(5)}
              />
            </section>

            {/* Recipes & Nutrition */}
            <section id="recipes-nutrition" className="content-section">
              <h2 className="section-title">Recipes & Nutrition</h2>
              <p className="section-intro">
                DishCovery provides tailored recipe suggestions based on your needs. All recipes are reviewed by nutritionists and approved by dietitians to ensure health accuracy and safety.
              </p>
              <p>The app also handles allergens and food warnings, helping you maintain healthier eating habits every day.</p>
              <img 
                src="/images/tutorial/6image.png" 
                alt="Recipe details with nutrition info" 
                className="tutorial-image"
                onClick={() => openLightbox(6)}
              />
            </section>

            {/* Technical Support */}
            <section id="technical-support" className="content-section">
              <h2 className="section-title">Technical Support</h2>
              <p className="section-intro">
                If you encounter issues, DishCovery provides multiple support channels. You can send feedback, contact the team through email, or visit the Support and Contact Us sections. Troubleshooting guides are also available for common problems.
              </p>
              <img 
                src="/images/tutorial/7image.png" 
                alt="Support contact form" 
                className="tutorial-image"
                onClick={() => openLightbox(7)}
              />
            </section>

            {/* Full Tutorial */}
            <section id="full-tutorial" className="content-section">
              <h2 className="section-title">Full DishCovery Tutorial</h2>
              
              <div className="tutorial-steps">
                <div className="step-item">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h3>Log In or Create an Account</h3>
                    <p>Open DishCovery and either log in or sign up. After entering your details, you are directed to the Get Started setup form.</p>
                    <img 
                      src="/images/tutorial/8image.png" 
                      alt="Login and signup screen" 
                      className="tutorial-image"
                      onClick={() => openLightbox(8)}
                    />
                  </div>
                </div>

                <div className="step-item">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h3>Complete the Get Started Form</h3>
                    <p>Provide your dietary restrictions, medical conditions (including allergens), excluded ingredients, and meal preferences to personalize your experience.</p>
                    <img 
                      src="/images/tutorial/9image.png" 
                      alt="Get Started form fields" 
                      className="tutorial-image"
                      onClick={() => openLightbox(9)}
                    />
                  </div>
                </div>

                <div className="step-item">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h3>Install DishCovery on Your Phone (PWA)</h3>
                    <p>DishCovery works on both web and mobile. On mobile browsers, tap Install App to add it to your home screen as a Progressive Web App.</p>
                    <img 
                      src="/images/tutorial/10image.png" 
                      alt="PWA install prompt" 
                      className="tutorial-image"
                      onClick={() => openLightbox(10)}
                    />
                  </div>
                </div>

                <div className="step-item">
                  <div className="step-number">4</div>
                  <div className="step-content">
                    <h3>Add Ingredients (Pantry or Scanner)</h3>
                    <p>Add ingredients manually through the Pantry or use the Ingredient Recognition scanner with your camera for fast detection.</p>
                    <img 
                      src="/images/tutorial/11image.png" 
                      alt="Pantry selection and camera scanner" 
                      className="tutorial-image"
                      onClick={() => openLightbox(11)}
                    />
                  </div>
                </div>

                <div className="step-item">
                  <div className="step-number">5</div>
                  <div className="step-content">
                    <h3>Generate Recipes</h3>
                    <p>DishCovery generates recipes based on your dietary restrictions and available ingredients. All recipes are verified by nutrition professionals.</p>
                    <img 
                      src="/images/tutorial/12image.png" 
                      alt="Generated recipe results" 
                      className="tutorial-image"
                      onClick={() => openLightbox(12)}
                    />
                  </div>
                </div>

                <div className="step-item">
                  <div className="step-number">6</div>
                  <div className="step-content">
                    <h3>Customize & Save Recipes</h3>
                    <p>Modify recipes to fit your personal preferences or available ingredients. Save meals to your Favorites for easy access later.</p>
                    <img 
                      src="/images/tutorial/13image.png" 
                      alt="Recipe customization and save button" 
                      className="tutorial-image"
                      onClick={() => openLightbox(13)}
                    />
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxOpen && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <button className="lightbox-close" onClick={closeLightbox} aria-label="Close">
            <X size={32} />
          </button>
          
          <button 
            className="lightbox-nav lightbox-prev" 
            onClick={(e) => { e.stopPropagation(); prevImage(); }}
            aria-label="Previous image"
          >
            <ChevronLeft size={40} />
          </button>
          
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img 
              src={allImages[currentImageIndex].src} 
              alt={allImages[currentImageIndex].alt}
              className="lightbox-image"
            />
            <div className="lightbox-caption">
              <span className="lightbox-section">{allImages[currentImageIndex].section}</span>
              <span className="lightbox-counter">{currentImageIndex + 1} / {allImages.length}</span>
            </div>
          </div>
          
          <button 
            className="lightbox-nav lightbox-next" 
            onClick={(e) => { e.stopPropagation(); nextImage(); }}
            aria-label="Next image"
          >
            <ChevronRight size={40} />
          </button>
        </div>
      )}
    </>
  );
}