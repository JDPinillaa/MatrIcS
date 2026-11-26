import { BusinessValidationException } from '../../../domain/exceptions/business-validation.exception';
import { DomainNotFoundException } from '../../../domain/exceptions/domain-not-found.exception';
import type { ISiteSettingsRepository } from '../../../domain/ports/site-settings.repository.port';
import type { SiteSettings } from '../../../domain/settings/site-settings.types';
import { siteSettingsFixture } from './site-settings.fixture';
import { UpdateTariffsUseCase } from './update-tariffs.use-case';

describe('UpdateTariffsUseCase (HU-02)', () => {
  const valid = {
    carroDiurna: 10000,
    carroNocturna: 7000,
    motoDiurna: 0,
    motoNocturna: 0,
  };

  function build(found: SiteSettings | null = siteSettingsFixture) {
    const repository: jest.Mocked<ISiteSettingsRepository> = {
      findBySedeId: jest.fn().mockResolvedValue(found),
      updateTariffs: jest.fn().mockResolvedValue(undefined),
      updateTimeBands: jest.fn(),
      updateCapacities: jest.fn(),
    };
    return { useCase: new UpdateTariffsUseCase(repository), repository };
  }

  it('Caso de éxito: guarda 10.000 / 7.000 / moto $0 y devuelve la configuración', async () => {
    const { useCase, repository } = build();

    await expect(useCase.execute(1, valid)).resolves.toEqual(siteSettingsFixture);
    expect(repository.updateTariffs).toHaveBeenCalledWith(1, valid);
  });

  it('Caso de error: nocturna 11.000 con diurna 10.000 viola RN-02 y no escribe en BD', async () => {
    const { useCase, repository } = build();

    await expect(
      useCase.execute(1, { ...valid, carroNocturna: 11000 }),
    ).rejects.toBeInstanceOf(BusinessValidationException);
    expect(repository.updateTariffs).not.toHaveBeenCalled();
  });

  it('lanza 404 si la sede no existe', async () => {
    const { useCase, repository } = build(null);

    await expect(useCase.execute(99, valid)).rejects.toBeInstanceOf(
      DomainNotFoundException,
    );
    expect(repository.updateTariffs).not.toHaveBeenCalled();
  });
});