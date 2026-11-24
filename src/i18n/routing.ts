import { defineRouting } from 'next-intl/routing';

/** Locale routing, with route names in English and localized per locale. */
export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  localePrefix: 'always',
  pathnames: {
    '/': '/',
    '/sign-up': { es: '/crear-cuenta', en: '/sign-up' },
    '/sign-in': { es: '/iniciar-sesion', en: '/sign-in' },
    '/register': { es: '/inscripcion', en: '/register' },
    '/payment': { es: '/pago', en: '/payment' },
    '/account': { es: '/cuenta', en: '/account' },
    '/account/runners/new': { es: '/cuenta/corredores/nuevo', en: '/account/runners/new' },
    '/forgot-password': { es: '/olvide-mi-contrasena', en: '/forgot-password' },
    '/reset-password': { es: '/nueva-contrasena', en: '/reset-password' },
    '/verify-email': { es: '/confirma-tu-correo', en: '/verify-email' },
    '/privacy': { es: '/aviso-de-privacidad', en: '/privacy' },
    '/terms': { es: '/terminos-y-condiciones', en: '/terms' },
    '/admin': '/admin',
    '/admin/registrations/new': {
      es: '/admin/inscripciones/nueva',
      en: '/admin/registrations/new',
    },
    '/admin/registrations/[id]': {
      es: '/admin/inscripciones/[id]',
      en: '/admin/registrations/[id]',
    },
    '/admin/payments/[id]': { es: '/admin/pagos/[id]', en: '/admin/payments/[id]' },
    '/admin/settings': { es: '/admin/configuracion', en: '/admin/settings' },
    '/admin/kit-pickup': { es: '/admin/entrega-de-kits', en: '/admin/kit-pickup' },
    '/admin/team': { es: '/admin/administradores', en: '/admin/admins' },
  },
});

/** A supported locale. */
export type AppLocale = (typeof routing.locales)[number];
