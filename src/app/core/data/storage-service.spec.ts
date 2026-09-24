import { validarPortada } from './storage-service';

describe('validarPortada', () => {
  it('rechaza archivos que Storage no admite', () => {
    expect(validarPortada(new File(['svg'], 'x.svg', { type: 'image/svg+xml' }))).not.toBeNull();
    expect(validarPortada(new File([], 'x.png', { type: 'image/png' }))).not.toBeNull();
    expect(validarPortada(new File(['imagen'], 'x.png', { type: 'image/png' }))).toBeNull();
  });
});
