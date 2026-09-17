// Quote form: client-side validation, accessible errors, submit to contact.php.

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

// Marca el instante en que quedó listo el formulario. contact.php descarta
// los envíos inmediatos, que delatan un bot rellenando por POST directo.
function stamp(form) {
  const field = form.elements.ts;
  if (field) field.value = String(Date.now());
}

export function initForm() {
  const form = document.querySelector('[data-quote-form]');
  if (!form) return;

  stamp(form);

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

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn?.classList.add('is-loading');
    submitBtn?.setAttribute('aria-busy', 'true');

    // El nombre se lee antes del reset() para el mensaje de agradecimiento.
    const name = form.elements.name?.value.trim().split(' ')[0] || '';

    try {
      const response = await fetch(form.action || 'contact.php', {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });

      // El servidor siempre responde JSON, pero si algo va mal en el hosting
      // puede llegar HTML de una página de error: no debe romper el handler.
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // 422: la validación de servidor ha rechazado campos concretos.
        // Se pintan en su sitio para que el usuario vea qué corregir.
        if (data.errores) {
          let first = null;
          Object.entries(data.errores).forEach(([field, message]) => {
            const control = form.elements[field];
            if (control) {
              showError(control, message);
              if (!first) first = control;
            }
          });
          first?.focus();
        }

        showToast({
          type: 'error',
          title: 'No se ha podido enviar',
          message:
            data.error || 'Revisa los datos e inténtalo de nuevo.',
        });
        return;
      }

      showToast({
        title: '¡Solicitud enviada!',
        message: `Gracias${name ? ', ' + name : ''}. Te responderemos en menos de 24 h.`,
      });

      form.reset();
      form.querySelectorAll('.is-valid, .is-invalid').forEach((el) =>
        el.classList.remove('is-valid', 'is-invalid')
      );
      form.querySelectorAll('.field__error').forEach((el) => (el.textContent = ''));
      stamp(form);
    } catch {
      // Sin conexión o el servidor no responde. Se ofrecen las vías directas
      // en lugar de dejar al usuario sin saber qué ha pasado.
      showToast({
        type: 'error',
        title: 'Sin conexión con el servidor',
        message: 'Llámanos al 642 898 520 o escríbenos por WhatsApp.',
      });
    } finally {
      submitBtn?.classList.remove('is-loading');
      submitBtn?.removeAttribute('aria-busy');
    }
  });
}
