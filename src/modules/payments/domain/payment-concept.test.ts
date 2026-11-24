import { describe, expect, it } from 'vitest';

import { buildPaymentConcept } from './payment-concept';

describe('buildPaymentConcept', () => {
  it('uppercases the account holder name after the event prefix', () => {
    expect(buildPaymentConcept('Sofia Ramirez')).toBe('CATARINOTLON - SOFIA RAMIREZ');
  });

  it('removes accents', () => {
    expect(buildPaymentConcept('Sofía Ramírez Núñez')).toBe('CATARINOTLON - SOFIA RAMIREZ NUNEZ');
  });

  it('drops characters that are not plain ASCII letters, digits, or spaces', () => {
    expect(buildPaymentConcept("María-José O'Connor 🐞")).toBe(
      'CATARINOTLON - MARIA JOSE O CONNOR',
    );
  });

  it('collapses repeated whitespace', () => {
    expect(buildPaymentConcept('  Ana   Luz  ')).toBe('CATARINOTLON - ANA LUZ');
  });

  it('truncates to 40 characters without a trailing space', () => {
    expect(buildPaymentConcept('Maximiliano Alejandro Hernandez Gutierrez')).toBe(
      'CATARINOTLON - MAXIMILIANO ALEJANDRO HER',
    );
    expect(buildPaymentConcept('Maximiliano Alejandrina Bo')).toHaveLength(40);
    expect(buildPaymentConcept('Maximiliano Alejandro Xy Zw')).toBe(
      'CATARINOTLON - MAXIMILIANO ALEJANDRO XY',
    );
  });
});
