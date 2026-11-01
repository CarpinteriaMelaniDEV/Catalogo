const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');
const header = document.querySelector('.site-header');
const filterButtons = [...document.querySelectorAll('.filter-btn')];
const subButtons = [...document.querySelectorAll('.sub-filter')];
const cards = [...document.querySelectorAll('.product-card')];
const searchInput = document.querySelector('#searchInput');
const emptyState = document.querySelector('#emptyState');
const toast = document.querySelector('#toast');

let activeCategory = 'todos';
let activeSubcategory = 'todos';
let toastTimer;

document.querySelector('#year').textContent = new Date().getFullYear();

// Menú móvil
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  mainNav.classList.toggle('open', open);
  document.body.classList.toggle('menu-open', open);
});
mainNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  mainNav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Abrir menú');
  document.body.classList.remove('menu-open');
}));

// Encabezado compacto al desplazarse
const handleScroll = () => header.classList.toggle('scrolled', window.scrollY > 25);
window.addEventListener('scroll', handleScroll, { passive: true });
handleScroll();

// Animaciones de entrada al aparecer en pantalla
const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// Filtros por categoría, estilo y texto
function applyFilters() {
  const query = searchInput.value.trim().toLocaleLowerCase('es');
  let visibleCount = 0;

  cards.forEach(card => {
    const categoryMatch = activeCategory === 'todos' || card.dataset.category === activeCategory;
    const styleMatch = activeSubcategory === 'todos' || card.dataset.style.split(' ').includes(activeSubcategory);
    const textMatch = !query || `${card.dataset.name} ${card.innerText}`.toLocaleLowerCase('es').includes(query);
    const visible = categoryMatch && styleMatch && textMatch;
    card.classList.toggle('is-hidden', !visible);
    if (visible) {
      visibleCount++;
      card.classList.remove('visible');
      requestAnimationFrame(() => card.classList.add('visible'));
    }
  });
  emptyState.hidden = visibleCount > 0;
}
filterButtons.forEach(button => button.addEventListener('click', () => {
  activeCategory = button.dataset.filter;
  filterButtons.forEach(item => item.classList.toggle('active', item === button));
  applyFilters();
}));
subButtons.forEach(button => button.addEventListener('click', () => {
  activeSubcategory = button.dataset.sub;
  subButtons.forEach(item => item.classList.toggle('active', item === button));
  applyFilters();
}));
searchInput.addEventListener('input', applyFilters);

// Efecto de brillo sutil en pantallas con mouse
const glow = document.querySelector('.cursor-glow');
if (window.matchMedia('(pointer: fine)').matches) {
  glow.style.display = 'block';
  window.addEventListener('pointermove', event => {
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
  }, { passive: true });
}



// =========================================================
// Galería de fotografías por producto
// Convención: producto1.jpg, producto1_1.jpg, producto1_2.jpg...
// Se pueden agregar tantas fotos como se quiera. El carrusel
// muestra automáticamente las que existan y oculta las faltantes.
// =========================================================
const productImages = [...document.querySelectorAll('.product-image')];

function getGalleryCandidates(src) {
  const clean = src.split('?')[0];
  const match = clean.match(/^(.*?)(\.[a-z0-9]+)$/i);
  if (!match) return [clean];
  const base = match[1];
  const ext = match[2];
  const candidates = [clean];
  for (let i = 1; i <= 5; i++) candidates.push(`${base}_${i}${ext}`);
  return [...new Set(candidates)];
}

function setupProductGallery(container) {
  if (container.dataset.galleryReady === 'true') return;

  const firstImg = container.querySelector('img');
  if (!firstImg || !firstImg.getAttribute('src')) return;

  const candidates = getGalleryCandidates(firstImg.getAttribute('src'));
  const originalTag = container.querySelector('.image-tag');

  const carousel = document.createElement('div');
  carousel.className = 'product-carousel';
  carousel.setAttribute('role', 'region');
  carousel.setAttribute('aria-label', 'Galería de fotografías');

  const track = document.createElement('div');
  track.className = 'product-carousel-track';

  const controls = document.createElement('div');
  controls.className = 'product-carousel-controls';

  const prev = document.createElement('button');
  prev.className = 'product-carousel-btn product-carousel-prev';
  prev.type = 'button';
  prev.setAttribute('aria-label', 'Fotografía anterior');
  prev.innerHTML = '‹';

  const next = document.createElement('button');
  next.className = 'product-carousel-btn product-carousel-next';
  next.type = 'button';
  next.setAttribute('aria-label', 'Fotografía siguiente');
  next.innerHTML = '›';

  controls.append(prev, next);
  carousel.append(track, controls);

  const dots = document.createElement('div');
  dots.className = 'product-carousel-dots';
  dots.hidden = true;

  const hint = document.createElement('span');
  hint.className = 'product-carousel-hint';
  hint.textContent = 'CLIC PARA VER EN GRANDE';
  hint.hidden = true;

  // Remove original image; recreate it as slide 1.
  firstImg.remove();
  let current = 0;
  const slides = [];

  candidates.forEach((src, index) => {
    const slide = document.createElement('div');
    slide.className = 'product-carousel-slide';
    const img = document.createElement('img');
    img.src = src;
    img.alt = firstImg.alt || 'Fotografía del producto';
    img.loading = index === 0 ? 'eager' : 'lazy';
    img.decoding = 'async';

    img.addEventListener('load', () => {
      slide.classList.remove('is-broken');
      container.classList.add('has-image');
      refreshGallery();
    });
    img.addEventListener('error', () => {
      slide.classList.add('is-broken');
      refreshGallery();
    });
    img.addEventListener('click', (event) => {
      event.stopPropagation();
      openLightbox(container, getValidImages());
    });

    slide.appendChild(img);
    track.appendChild(slide);
    slides.push({ slide, img, src });
  });

  function getValidImages() {
    return slides.filter(s => !s.slide.classList.contains('is-broken')).map(s => ({
      src: s.img.currentSrc || s.img.src,
      alt: s.img.alt
    }));
  }

  function refreshGallery() {
    const valid = slides.filter(s => !s.slide.classList.contains('is-broken'));
    dots.innerHTML = '';
    dots.hidden = valid.length < 2;
    prev.hidden = valid.length < 2;
    next.hidden = valid.length < 2;
    hint.hidden = valid.length < 2;
    if (!valid.length) return;

    // Keep the current position inside the valid slide list.
    if (current >= valid.length) current = valid.length - 1;

    valid.forEach((item, index) => {
      const dot = document.createElement('button');
      dot.className = `product-carousel-dot${index === current ? ' active' : ''}`;
      dot.type = 'button';
      dot.setAttribute('aria-label', `Ver fotografía ${index + 1}`);
      dot.addEventListener('click', (event) => {
        event.stopPropagation();
        current = index;
        update();
      });
      dots.appendChild(dot);
    });
    update();
  }

  function update() {
    const valid = slides.filter(s => !s.slide.classList.contains('is-broken'));
    if (!valid.length) return;
    const target = valid[current];
    const allOffset = slides.indexOf(target);
    track.style.transform = `translateX(-${allOffset * 100}%)`;
    [...dots.children].forEach((dot, i) => dot.classList.toggle('active', i === current));
  }

  function move(direction) {
    const valid = slides.filter(s => !s.slide.classList.contains('is-broken'));
    if (valid.length < 2) return;
    current = (current + direction + valid.length) % valid.length;
    update();
  }

  prev.addEventListener('click', e => { e.stopPropagation(); move(-1); });
  next.addEventListener('click', e => { e.stopPropagation(); move(1); });

  container.insertBefore(carousel, container.firstChild);
  if (originalTag) container.appendChild(originalTag);
  container.appendChild(dots);
  container.appendChild(hint);
  container.dataset.galleryReady = 'true';

  // Also allow clicking anywhere on the image area to open the large viewer.
  container.addEventListener('click', event => {
    if (event.target.closest('button')) return;
    const valid = getValidImages();
    if (valid.length) openLightbox(container, valid);
  });

  // Swipe on touch devices.
  let startX = null;
  carousel.addEventListener('touchstart', e => {
    startX = e.changedTouches[0].clientX;
  }, { passive: true });
  carousel.addEventListener('touchend', e => {
    if (startX === null) return;
    const delta = e.changedTouches[0].clientX - startX;
    if (Math.abs(delta) > 45) move(delta < 0 ? 1 : -1);
    startX = null;
  }, { passive: true });

  refreshGallery();
}

productImages.forEach(setupProductGallery);


// =========================================================
// Visor de imagen en tamaño original
// =========================================================
const lightbox = document.querySelector('#imageLightbox');
const lightboxImage = document.querySelector('#lightboxImage');
const lightboxCounter = document.querySelector('#lightboxCounter');
const lightboxPrev = document.querySelector('.lightbox-prev');
const lightboxNext = document.querySelector('.lightbox-next');
let lightboxItems = [];
let lightboxIndex = 0;

function openLightbox(card, items) {
  if (!items.length) return;
  lightboxItems = items;
  lightboxIndex = 0;
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.classList.add('lightbox-open');
  showLightboxImage();
}

function showLightboxImage() {
  const item = lightboxItems[lightboxIndex];
  lightboxImage.src = item.src;
  lightboxImage.alt = item.alt || 'Fotografía ampliada';
  lightboxCounter.textContent = lightboxItems.length > 1
    ? `${lightboxIndex + 1} / ${lightboxItems.length}`
    : '1 / 1';
  lightboxPrev.hidden = lightboxItems.length < 2;
  lightboxNext.hidden = lightboxItems.length < 2;
}

function closeLightbox() {
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('lightbox-open');
  lightboxImage.removeAttribute('src');
  lightboxItems = [];
}

function moveLightbox(direction) {
  if (lightboxItems.length < 2) return;
  lightboxIndex = (lightboxIndex + direction + lightboxItems.length) % lightboxItems.length;
  showLightboxImage();
}

lightboxPrev.addEventListener('click', e => { e.stopPropagation(); moveLightbox(-1); });
lightboxNext.addEventListener('click', e => { e.stopPropagation(); moveLightbox(1); });

lightbox.querySelectorAll('[data-lightbox-close]').forEach(el => {
  el.addEventListener('click', closeLightbox);
});

document.addEventListener('keydown', e => {
  if (!lightbox.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') moveLightbox(-1);
  if (e.key === 'ArrowRight') moveLightbox(1);
});


document.querySelector('#quoteForm').addEventListener('submit', event => {
  event.preventDefault();

  const name = document.querySelector('#clientName').value.trim();
  const type = document.querySelector('#projectType').value;
  const details = document.querySelector('#projectDetails').value.trim();

  // Número de WhatsApp de Carpintería Melani
  const phone = '526642436999';

  const message = `Hola, soy ${name}.
Me interesa cotizar: ${type}.
${details ? `Detalles: ${details}` : ''}

¡Me gustaría recibir más información!`;

  const whatsappURL = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  window.open(whatsappURL, '_blank');
});

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4200);
}
