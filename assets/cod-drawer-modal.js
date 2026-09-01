document.addEventListener('DOMContentLoaded', function() {
  const overlay = document.getElementById('cod-modal-overlay');
  const modalContent = document.querySelector('.cod-modal-content');
  const closeBtn = document.getElementById('cod-modal-close');
  const form = document.getElementById('nativeCodForm');
  const submitBtn = document.getElementById('cod-submit-btn');
  const errorBanner = document.getElementById('cod-error-banner');
  const radios = document.querySelectorAll('input[name="cod_qty_selector"]');
  
  // Data de Shopify
  const productDataEl = document.getElementById('cod-product-data');
  if(!productDataEl) return;
  const basePrice = parseInt(productDataEl.getAttribute('data-base-price')) || 0;
  const productName = productDataEl.getAttribute('data-product-name');
  const productSku = productDataEl.getAttribute('data-product-sku') || 'GEN-SKU';
  const variantId = productDataEl.getAttribute('data-variant-id');
  
  let selectedQty = 2;
  let finalCalculatedTotal = 0;

  function formatMoney(cents) {
    return "$" + (cents / 100).toFixed(2);
  }

  // Lógica de Precios
  function updatePrices() {
    const selected = document.querySelector('input[name="cod_qty_selector"]:checked');
    if(!selected) return;
    
    selectedQty = parseInt(selected.value);
    const discount = parseFloat(selected.getAttribute('data-discount'));
    
    document.querySelectorAll('.cod-bundle-card').forEach(card => card.classList.remove('is-active'));
    selected.closest('.cod-bundle-card').classList.add('is-active');

    const subtotal = basePrice * selectedQty;
    const discountAmount = subtotal * discount;
    const total = subtotal - discountAmount;
    
    finalCalculatedTotal = total / 100; // Guardamos en formato decimal para la API

    document.getElementById('cod-subtotal-display').innerText = formatMoney(subtotal);
    document.getElementById('cod-total-display').innerText = formatMoney(total);
    submitBtn.innerText = "✔ COMPLETA TU COMPRA - " + formatMoney(total) + " / Paga al recibir";
  }

  radios.forEach(radio => radio.addEventListener('change', updatePrices));
  if(radios.length > 0) updatePrices();

  // Control del Modal
  window.openCodModal = function() {
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  };

  window.closeCodModal = function() {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  };

  closeBtn.addEventListener('click', closeCodModal);
  overlay.addEventListener('click', function(e) {
    if(e.target === overlay) closeCodModal();
  });

  // Utilidades para Validación
  function validateField(input) {
    const wrap = input.closest('.field-wrap');
    if (!input.value.trim()) {
      wrap.classList.add('error');
      return false;
    }
    
    if (input.id === 'cod_phone') {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(input.value.trim())) {
        wrap.classList.add('error');
        const msg = wrap.querySelector('.error-msg');
        if(msg) msg.innerText = "Debe contener 10 dígitos numéricos";
        return false;
      }
    }
    
    wrap.classList.remove('error');
    return true;
  }

  // Limpiar errores on input
  document.querySelectorAll('.field-wrap input, .field-wrap select').forEach(input => {
    input.addEventListener('input', () => {
      input.closest('.field-wrap').classList.remove('error');
    });
  });

  // Submit
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    errorBanner.classList.remove('is-visible');
    let isValid = true;
    
    const fieldsToValidate = ['cod_name', 'cod_lastname', 'cod_phone', 'cod_state', 'cod_city', 'cod_address'];
    fieldsToValidate.forEach(id => {
      const input = document.getElementById(id);
      if(!validateField(input)) isValid = false;
    });

    if(!isValid) return;

    const originalBtnText = submitBtn.innerText;
    submitBtn.disabled = true;
    submitBtn.innerText = "Procesando pedido...";

    const payload = {
      product_name: productName,
      sku: productSku,
      variant_id: variantId,
      quantity: selectedQty,
      total_price: finalCalculatedTotal,
      customer: {
        name: document.getElementById('cod_name').value.trim() + " " + document.getElementById('cod_lastname').value.trim(),
        phone: document.getElementById('cod_phone').value.trim(),
        state: document.getElementById('cod_state').value.trim(),
        city: document.getElementById('cod_city').value.trim(),
        address: document.getElementById('cod_address').value.trim() + " - Ref: " + document.getElementById('cod_reference').value.trim()
      },
      source_domain: window.location.hostname || "luxenshop.com"
    };

    try {
      const response = await fetch('https://api.luxenshop.com/v1/cod-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if(response.ok) {
        const orderId = data.order_id || 'PROCESADO';
        window.location.href = '/pages/gracias?order=' + orderId;
      } else {
        throw new Error(data.message || "Error al procesar el pedido.");
      }
    } catch(err) {
      errorBanner.innerText = err.message || "Problema de conexión. Verifica tu internet e intenta de nuevo.";
      errorBanner.classList.add('is-visible');
      submitBtn.disabled = false;
      submitBtn.innerText = originalBtnText;
    }
  });
});
