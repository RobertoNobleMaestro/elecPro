// Quote form: client-side validation, accessible errors, simulated submit.

import { showToast } from './toast.js';

// --- Field validators. Each returns '' (valid) or an error message. ---
const validators = {
  name: (v) =>
    v.trim().length >= 2 ? '' : 'Indícanos tu nombre (mínimo 2 letras).',

  phone: (v) => {
    const clean = v.replace(/[\s-]/g, '');
    return /^(\+?34)?[6-9]\d{8}$/.test(clean)
      ? ''
      : 'Introduce un teléfono español válido (9 dígitos).';
  },

  email: (v) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
      ? ''
      : 'Introduce un email válido.',

  service: (v) => (v ? '' : 'Selecciona el servicio que necesitas.'),

  consent: (_v, field) =>
    field.checked ? '' : 'Debes aceptar la política de privacidad.',
};

function fieldWrap(control) {
  return control.closest('.field') || control.closest('.form__consent');
}

function showError(control, message) {
  const wrap = fieldWrap(control);
  const errorEl = wrap?.querySelector('.field__error');
  const valid = !message;

  wrap?.classList.toggle('is-invalid', !valid);
  wrap?.classList.toggle('is-valid', valid && control.value !== '');
  control.setAttribute('aria-invalid', String(!valid));
  if (errorEl) errorEl.textContent = message;
  return valid;
}

function validateField(control) {
  const rule = validators[control.name];
  if (!rule) return true;
  const value = control.type === 'checkbox' ? control.checked : control.value;
  return showError(control, rule(value, control));
}

export function initForm() {
  const form = document.querySelector('[data-quote-form]');
  if (!form) return;

  const controls = Array.from(form.elements).filter((el) => validators[el.name]);

  // Validate on blur; clear errors as the user fixes them.
  controls.forEach((control) => {
    const evt = control.type === 'checkbox' ? 'change' : 'blur';
    control.addEventListener(evt, () => validateField(control));
    control.addEventListener('input', () => {
      if (fieldWrap(control)?.classList.contains('is-invalid')) {
        validateField(control);
      }
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate everything; collect first invalid for focus.
    let firstInvalid = null;
    controls.forEach((control) => {
      if (!validateField(control) && !firstInvalid) firstInvalid = control;
    });

    if (firstInvalid) {
      firstInvalid.focus();
      showToast({
        type: 'error',
        title: 'Revisa el formulario',
        message: 'Hay campos que necesitan tu atención.',
      });
      return;
    }

    // Simulated async submit (replace with a real fetch to your backend).
    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn?.classList.add('is-loading');
    submitBtn?.setAttribute('aria-busy', 'true');

    await new Promise((res) => setTimeout(res, 1100));

    submitBtn?.classList.remove('is-loading');
    submitBtn?.removeAttribute('aria-busy');

    const name = form.elements.name?.value.trim().split(' ')[0] || '';
    showToast({
      title: '¡Solicitud enviada!',
      message: `Gracias${name ? ', ' + name : ''}. Te responderemos en menos de 24 h.`,
    });

    form.reset();
    form.querySelectorAll('.is-valid, .is-invalid').forEach((el) =>
      el.classList.remove('is-valid', 'is-invalid')
    );
    form.querySelectorAll('.field__error').forEach((el) => (el.textContent = ''));
  });
}
