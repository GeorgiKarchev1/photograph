import './style.css'

document.addEventListener('DOMContentLoaded', () => {

  // Sticky Navbar on Scroll
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // Scroll Animations using Intersection Observer
  const scrollElements = document.querySelectorAll('.fade-in-section');

  const elementInView = (el, dividend = 1) => {
    const elementTop = el.getBoundingClientRect().top;
    return (elementTop <= (window.innerHeight || document.documentElement.clientHeight) / dividend);
  };

  const displayScrollElement = (element) => {
    element.classList.add('is-visible');
  };

  const handleScrollAnimation = () => {
    scrollElements.forEach((el) => {
      if (elementInView(el, 1.1)) {
        displayScrollElement(el);
      }
    });
  }

  // Initial check on load
  handleScrollAnimation();

  // Throttle scroll events slightly for performance
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        handleScrollAnimation();
        ticking = false;
      });
      ticking = true;
    }
  });
});
