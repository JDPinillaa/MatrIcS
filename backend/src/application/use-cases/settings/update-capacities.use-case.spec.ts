import { BusinessValidationException } from '../../../domain/exceptions/business-validation.exception';
import type { ISiteSettingsRepository } from '../../../domain/ports/site-settings.repository.port';
import { siteSettingsFixture } from './site-settings.fixture';
import { UpdateCapacitiesUseCase } from './update-capacities.use-case';

describe('UpdateCapacitiesUseCase (HU-02)', () => {
  function build() {
    const repository: jest.Mocked<ISiteSettingsRepository> = {
      findBySedeId: jest.fn().mockResolvedValue(siteSettingsFixture),
      updateTariffs: jest.fn(),
      updateTimeBands: jest.fn(),
      updateCapacities: jest.fn().mockResolvedValue(undefined),
    };
    return { useCase: new UpdateCapacitiesUseCase(repository), repository };
  }

  it('Caso de éxito: guarda 40 cupos de carros y 25 de motos de forma independiente', async () => {
    const { useCase, repository } = build();
    const input = { capacidadCarros: 40, capacidadMotos: 25 };

    await useCase.execute(1, input);

    expect(repository.updateCapacities).toHaveBeenCalledWith(1, input);
  });

  it('rechaza números negativos', async () => {
    const { useCase, repository } = build();

    await expect(
      useCase.execute(1, { capacidadCarros: -1, capacidadMotos: 25 }),
    ).rejects.toBeInstanceOf(BusinessValidationException);
    expect(repository.updateCapacities).not.toHaveBeenCalled();
  });

  it('rechaza una capacidad menor que los cupos ocupados', async () => {
    const { useCase, repository } = build();

    await expect(
      useCase.execute(1, { capacidadCarros: 5, capacidadMotos: 25 }),
    ).rejects.toThrow(/ocupados/);
    expect(repository.updateCapacities).not.toHaveBeenCalled();
  });
});