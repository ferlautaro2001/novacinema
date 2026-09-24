import { FiltroPipe } from './filtro-pipe';

describe('FiltroPipe', () => {
  const usuarios = [
    { email: 'ana@mail.com', apellido: 'Pérez' },
    { email: 'pablo@novacinema.com', apellido: 'Ruiz' },
  ];
  const filtro = new FiltroPipe();

  it('busca sin distinguir mayúsculas ni tildes (AC-02.07.02)', () => {
    expect(filtro.transform(usuarios, 'ruiz', ['email', 'apellido'])).toEqual([usuarios[1]]);
    expect(filtro.transform(usuarios, 'PEREZ', ['email', 'apellido'])).toEqual([usuarios[0]]);
  });

  it('busca en cualquiera de los campos indicados', () => {
    expect(filtro.transform(usuarios, 'novacinema', ['email', 'apellido'])).toEqual([usuarios[1]]);
    expect(filtro.transform(usuarios, 'novacinema', ['apellido'])).toEqual([]);
  });

  it('con el texto vacío devuelve todo', () => {
    expect(filtro.transform(usuarios, '  ', ['email'])).toEqual(usuarios);
    expect(filtro.transform(null, 'ana', ['email'])).toEqual([]);
  });
});
