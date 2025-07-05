'use client';
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBars, 
  faSearch, 
  faStar,
  faStarHalfStroke
} from '@fortawesome/free-solid-svg-icons';
import { 
  faHeart, 
  faComment,
  faStar as faStarRegular
} from '@fortawesome/free-regular-svg-icons';
import {
  faInstagram,
  faFacebook,
  faTwitter,
  faLinkedin
} from '@fortawesome/free-brands-svg-icons';
import { faLeaf } from '@fortawesome/free-solid-svg-icons';
import './style.css';

const RecipePage = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const recipes = Array(15).fill(null).map((_, index) => ({
    id: index + 1,
    title: 'Russian Salad',
    time: '40 min',
    likes: 0,
    comments: 0,
    image: index % 3 === 0 ? 
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=200&fit=crop' :
      index % 3 === 1 ?
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=300&h=200&fit=crop' :
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=200&fit=crop',
    rating: 4.5
  }));

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <FontAwesomeIcon 
          key={i} 
          icon={faStar} 
          className="star filled" 
        />
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <FontAwesomeIcon 
          key="half" 
          icon={faStarHalfStroke} 
          className="star half" 
        />
      );
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <FontAwesomeIcon 
          key={`empty-${i}`} 
          icon={faStarRegular} 
          className="star empty" 
        />
      );
    }
    
    return stars;
  };

  return (
    <div className="recipe-page">
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <div className="header-left">
            <button className="menu-btn">
              <FontAwesomeIcon icon={faBars} />
            </button>
            <div className="logo">
              <div className="logo-container" aria-label="DishCovery Logo"></div>
            </div>
          </div>
          
          <div className="header-center">
            <div className="search-container">
              <FontAwesomeIcon icon={faSearch} className="search-icon" />
              <input
                type="text"
                placeholder="Search meals (e.g. Full Meal, Dessert, Snack, Drink)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="header-right">
            <nav className="nav-links">
              <a href="#home" className="nav-link">Home</a>
              <a href="#recipes" className="nav-link active">Recipes</a>
              <a href="#scan" className="nav-link">Scan</a>
            </nav>
            <div className="user-profile">
              <img 
                src="https://via.placeholder.com/32x32?text=U" 
                alt="User Profile" 
                className="profile-img"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="main-container">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="filters-section">
            <h3 className="filters-title">Filters</h3>
            
            <div className="filter-group">
              <h4 className="filter-category">Meal Type</h4>
              <label className="filter-item">
                <input type="checkbox" defaultChecked />
                <span className="filter-text">Breakfast</span>
              </label>
              <label className="filter-item">
                <input type="checkbox" />
                <span className="filter-text">Dinner</span>
              </label>
              <label className="filter-item">
                <input type="checkbox" />
                <span className="filter-text">Light Meal</span>
              </label>
              <label className="filter-item">
                <input type="checkbox" />
                <span className="filter-text">Lunch</span>
              </label>
              <label className="filter-item">
                <input type="checkbox" />
                <span className="filter-text">Snack</span>
              </label>
              <label className="filter-item">
                <input type="checkbox" />
                <span className="filter-text">Dessert</span>
              </label>
            </div>

            <div className="filter-group">
              <h4 className="filter-category">Dish Type</h4>
              <label className="filter-item">
                <input type="checkbox" defaultChecked />
                <span className="filter-text">Bread</span>
              </label>
              <label className="filter-item">
                <input type="checkbox" />
                <span className="filter-text">Grilled</span>
              </label>
              <label className="filter-item">
                <input type="checkbox" />
                <span className="filter-text">Pasta</span>
              </label>
              <label className="filter-item">
                <input type="checkbox" />
                <span className="filter-text">Salad</span>
              </label>
              <label className="filter-item">
                <input type="checkbox" />
                <span className="filter-text">Sandwich</span>
              </label>
              <label className="filter-item">
                <input type="checkbox" />
                <span className="filter-text">Soup</span>
              </label>
              <label className="filter-item">
                <input type="checkbox" />
                <span className="filter-text">Stew/Stir</span>
              </label>
              <label className="filter-item">
                <input type="checkbox" />
                <span className="filter-text">Smoothie</span>
              </label>
              <label className="filter-item">
                <input type="checkbox" />
                <span className="filter-text">Drinks</span>
              </label>
              <label className="filter-item">
                <input type="checkbox" />
                <span className="filter-text">Noodles</span>
              </label>
              <label className="filter-item">
                <input type="checkbox" />
                <span className="filter-text">Rice</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="main-content">
          <div className="content-header">
            <h2 className="page-title">Recommended Recipes</h2>
          </div>
          
          <div className="recipes-grid">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="recipe-card">
                <div className="recipe-image-container">
                  <img 
                    src={recipe.image} 
                    alt={recipe.title}
                    className="recipe-image"
                  />
                </div>
                <div className="recipe-content">
                  <div className="recipe-rating">
                    {renderStars(recipe.rating)}
                  </div>
                  <h3 className="recipe-title">{recipe.title}</h3>
                  <div className="recipe-meta">
                    <span className="recipe-time">{recipe.time}</span>
                    <div className="recipe-actions">
                      <button className="action-btn like-btn">
                        <FontAwesomeIcon icon={faHeart} />
                        <span>{recipe.likes}</span>
                      </button>
                      <button className="action-btn comment-btn">
                        <FontAwesomeIcon icon={faComment} />
                        <span>{recipe.comments}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="load-more-container">
            <button className="load-more-btn">Load More</button>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-left">
          <div className="footer-logo">
            <div className="footer-logo-container" aria-label="DishCovery Logo"></div>
          </div>
          <p className="footer-description">
            Creating delicious meals with AI-powered personalized recipes tailored to your ingredients and preferences.
          </p>
        </div>
        <div className="footer-middle">
          <div className="quick-links">
            <h3 className="footer-title">Quick Links</h3>
            <ul className="footer-links">
              <li><a href="#home">Home</a></li>
              <li><a href="#about">About Us</a></li>
              <li><a href="#create">Create Recipe</a></li>
              <li><a href="#myrecipes">My Recipes</a></li>
            </ul>
          </div>
          <div className="support-links">
            <h3 className="footer-title">Support</h3>
            <ul className="footer-links">
              <li><a href="#help">Help Center</a></li>
              <li><a href="#faqs">FAQs</a></li>
              <li><a href="#contact">Contact Us</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-right">
          <h3 className="footer-title">Contact Us</h3>
          <form className="contact-form">
            <input type="email" placeholder="Your Email" className="contact-input" />
            <button type="submit" className="subscribe-btn">Subscribe</button>
          </form>
        </div>
        <div className="footer-social">
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon icon={faInstagram} />
          </a>
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon icon={faFacebook} />
          </a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon icon={faTwitter} />
          </a>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
            <FontAwesomeIcon icon={faLinkedin} />
          </a>
        </div>
        <div className="footer-bottom">
          <p>© 2025 DishCovery. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default RecipePage;