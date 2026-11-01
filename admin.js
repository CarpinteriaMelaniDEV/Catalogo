(() => {
  const $ = (s) => document.querySelector(s);
  const grid = $('#productGrid');
  const overlay = $('#adminOverlay');
  const login = $('#adminLogin');
  const workspace = $('#adminWorkspace');
  const list = $('#adminProductList');
  const form = $('#productForm');
  const STORAGE_KEY = 'melani_catalog_products_v1';

  const ADMIN_PASSWORD = 'melaniinsana2472';
  const categoryLabels = {
    cocinas:'Cocinas', closets:'Closets', bano:'Muebles de baño',
    tele:'Muebles para TV', camas:'Camas', puertas:'Puertas', otros:'Otros'
  };
  let products = [];

  function slugCategory(label) {
    const value = (label || '').toLocaleLowerCase('es');
    if (value.includes('cocina')) return 'cocinas';
    if (value.includes('closet')) return 'closets';
    if (value.includes('baño') || value.includes('bano')) return 'bano';
    if (value.includes('tv') || value.includes('tele')) return 'tele';
    if (value.includes('cama')) return 'camas';
    if (value.includes('puerta')) return 'puertas';
    return 'otros';
  }
  function getInitialProducts() {
    return [...grid.querySelectorAll('.product-card')].map((card, i) => {
      const image = card.querySelector('.product-carousel-slide img, .product-image img');
      return {
        id: 'base-' + i,
        name: card.querySelector('.product-info h3')?.textContent.trim() || `Producto ${i+1}`,
        category: card.dataset.category || slugCategory(card.querySelector('.product-category')?.textContent),
        description: card.querySelector('.product-desc')?.textContent.trim() || '',
        image: image?.getAttribute('src') || '',
        number: card.querySelector('.product-number')?.textContent.trim() || String(i+1).padStart(3,'0')
      };
    });
  }
  function loadProducts() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      products = saved ? JSON.parse(saved) : getInitialProducts();
      if (!Array.isArray(products)) products = getInitialProducts();
    } catch (_) { products = getInitialProducts(); }
  }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(products)); }
    catch (_) { alert('No se pudo guardar. Revisa el almacenamiento del navegador y el tamaño de los datos.'); }
  }
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function renderCatalog() {
    grid.innerHTML = products.map((p, i) => `
      <article class="product-card reveal" data-product-id="${esc(p.id)}" data-category="${esc(p.category)}" data-style="a-medida" data-name="${esc(p.name.toLocaleLowerCase('es'))}">
        <div class="product-image admin-product-image">
          ${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">` : '<div class="admin-no-image">Agrega una imagen desde Admin</div>'}
          <span class="image-tag">${esc((categoryLabels[p.category] || 'OTROS').toUpperCase())} / ${String(i+1).padStart(3,'0')}</span>
          <span class="image-plus" aria-hidden="true">↗</span>
        </div>
        <div class="product-info"><div><p class="product-category">${esc((categoryLabels[p.category] || 'OTROS').toUpperCase())}</p><h3>${esc(p.name)}</h3></div><span class="product-number">${String(i+1).padStart(3,'0')}</span></div>
        ${p.description ? `<p class="product-desc">${esc(p.description)}</p>` : ''}
      </article>`).join('');
    [...grid.querySelectorAll('.product-card')].forEach((card) => {
      // Re-inicializa la galería también en tarjetas creadas o reconstruidas por Admin.
      // Así se conservan los carruseles con nombres como cocina1.jpg, cocina1_1.jpg,
      // cocina1_2.jpg... y el visor de pantalla completa puede recorrer sus fotos.
      const imageContainer = card.querySelector('.product-image');
      if (imageContainer && typeof setupProductGallery === 'function') {
        setupProductGallery(imageContainer);
      }
      if (window.IntersectionObserver) revealObserver.observe(card);
    });
    // Actualiza los filtros para incluir productos agregados desde Admin.
    if (typeof window.refreshCatalogFilters === 'function') window.refreshCatalogFilters();
    else {
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === 'todos'));
      const count = $('#adminProductCount');
      if (count) count.textContent = `${products.length} productos`;
    }
  }
  function renderAdminList() {
    $('#adminProductCount').textContent = `${products.length} productos`;
    list.innerHTML = products.map(p => `<div class="admin-product-row">
      <div class="admin-product-thumb">${p.image ? `<img src="${esc(p.image)}" alt="">` : '—'}</div>
      <div class="admin-product-summary"><strong>${esc(p.name)}</strong><small>${esc(categoryLabels[p.category] || 'Otros')}</small></div>
      <button type="button" class="admin-edit" data-edit="${esc(p.id)}">Editar</button>
      <button type="button" class="admin-delete" data-delete="${esc(p.id)}">Borrar</button>
    </div>`).join('');
  }
  function refresh() { persist(); renderCatalog(); renderAdminList(); }
  function resetForm() {
    form.reset(); $('#editProductId').value = '';
    $('#saveProductButton').innerHTML = 'Guardar producto <span>↗</span>';
    $('#adminSaveFeedback').textContent = '';
  }
  function openAdmin() {
    overlay.classList.add('is-open'); overlay.setAttribute('aria-hidden','false');
    document.body.classList.add('admin-open');
    login.hidden = false; workspace.hidden = true; $('#adminPassword').value = '';
    $('#adminLoginFeedback').textContent = 'Acceso de demostración. Cambia la contraseña en admin.js antes de publicar.';
  }
  function closeAdmin() {
    overlay.classList.remove('is-open'); overlay.setAttribute('aria-hidden','true');
    document.body.classList.remove('admin-open');
  }
  $('#openAdmin').addEventListener('click', openAdmin);
  $('#closeAdmin').addEventListener('click', closeAdmin);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeAdmin(); });
  $('#adminLoginButton').addEventListener('click', () => {
    if ($('#adminPassword').value === ADMIN_PASSWORD) {
      login.hidden = true; workspace.hidden = false; renderAdminList();
    } else $('#adminLoginFeedback').textContent = 'Contraseña incorrecta. Intenta de nuevo.';
  });
  $('#adminPassword').addEventListener('keydown', e => { if (e.key === 'Enter') $('#adminLoginButton').click(); });
  $('#cancelEdit').addEventListener('click', resetForm);
  form.addEventListener('submit', e => {
    e.preventDefault();
    const id = $('#editProductId').value;
    const product = {
      id: id || 'custom-' + Date.now(),
      name: $('#adminProductName').value.trim(),
      category: $('#adminProductCategory').value,
      description: $('#adminProductDescription').value.trim(),
      image: $('#adminProductImage').value.trim(),
      number: ''
    };
    if (!product.name) return;
    if (id) products = products.map(p => p.id === id ? product : p);
    else products.unshift(product);
    refresh(); resetForm();
    $('#adminSaveFeedback').textContent = id ? 'Producto actualizado.' : 'Producto agregado al catálogo.';
  });
  list.addEventListener('click', e => {
    const editId = e.target.closest('[data-edit]')?.dataset.edit;
    const deleteId = e.target.closest('[data-delete]')?.dataset.delete;
    if (editId) {
      const p = products.find(item => item.id === editId);
      if (!p) return;
      $('#editProductId').value = p.id;
      $('#adminProductName').value = p.name;
      $('#adminProductCategory').value = p.category;
      $('#adminProductDescription').value = p.description || '';
      $('#adminProductImage').value = p.image || '';
      $('#saveProductButton').innerHTML = 'Guardar cambios <span>↗</span>';
      $('#adminSaveFeedback').textContent = `Editando: ${p.name}`;
      form.scrollIntoView({behavior:'smooth', block:'start'});
    }
    if (deleteId) {
      const p = products.find(item => item.id === deleteId);
      if (p && confirm(`¿Seguro que quieres borrar "${p.name}" del catálogo?`)) {
        products = products.filter(item => item.id !== deleteId);
        refresh(); resetForm();
      }
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeAdmin(); });

  loadProducts();
  renderCatalog();
  renderAdminList();
})();
