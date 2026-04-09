import './style.css';

document.addEventListener('DOMContentLoaded', async () => {
  // Navbar scroll
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });

  // Mobile menu
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      hamburger.classList.toggle('active');
      hamburger.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // Load manifest
  const grid = document.getElementById('gallery-grid');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');
  const tabs = document.getElementById('portfolio-tabs');

  let manifest;
  try {
    const res = await fetch('/api/gallery');
    manifest = await res.json();
  } catch {
    grid.innerHTML = '<p style="color:var(--text-muted)">Грешка при зареждане на галерията.</p>';
    return;
  }

  let currentCategory = 'wedding';
  let currentImages = [];
  let currentIndex = 0;

  function renderGallery(category) {
    currentCategory = category;
    currentImages = manifest[category] || [];
    grid.innerHTML = '';

    if (currentImages.length === 0) {
      grid.innerHTML = '<p class="gallery-empty">Очаквайте скоро</p>';
      return;
    }

    currentImages.forEach((img, index) => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      // Blob URLs (new uploads) are used directly; filenames use the static path
      const thumbSrc = img.startsWith('https://') ? img : `/gallery/${category}/thumb/${img}`;
      item.innerHTML = `<img src="${thumbSrc}" alt="" loading="lazy" width="400" height="500" />`;
      item.addEventListener('click', () => openLightbox(index));
      grid.appendChild(item);
    });
  }

  // Tabs
  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    tabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderGallery(btn.dataset.category);
  });

  // Initial render
  renderGallery('wedding');

  // Lightbox
  function imgSrc(img, category) {
    return img.startsWith('https://') ? img : `/gallery/${category}/full/${img}`;
  }

  function openLightbox(index) {
    currentIndex = index;
    lightboxImg.src = imgSrc(currentImages[currentIndex], currentCategory);
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
    lightboxImg.src = '';
  }

  function navigate(direction) {
    currentIndex = (currentIndex + direction + currentImages.length) % currentImages.length;
    lightboxImg.src = imgSrc(currentImages[currentIndex], currentCategory);
  }

  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrev.addEventListener('click', () => navigate(-1));
  lightboxNext.addEventListener('click', () => navigate(1));
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
  });
});
