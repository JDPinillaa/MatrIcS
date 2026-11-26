import {BusinessValidationException} from '../exceptions/business-validation.exception';
import {assertValidTariffs} from './tariff.policy';


describe ('Politica de tarifas', () =>{
    const base={
        carroDiurna: 10000,
        carroNocturna: 7000,
        motoDiurna: 0,
        motoNocturna: 0,
    };

    it('acepta carro 10.000/7.000 y moto exenta en $0', ()=>{
        expect(()=> assertValidTariffs(base)).not.toThrow();
    });

    it('acepta moto con valor positivo si la nocturna es menor', ()=>{
        expect(()=>
            assertValidTariffs({...base, motoDiurna: 1000, motoNocturna:500}),
        ).not.toThrow();
    });

    it.each([11000, 10000])('rechaza carro con nocturna %i>= diurna 10.000',
        (nocturna) =>{
            const input = {...base, carroNocturna: nocturna};
            expect(() => assertValidTariffs(input)).toThrow(BusinessValidationException);
            expect(()=> assertValidTariffs(input)).toThrow(/RN-02/);
        },
    );

    it('rechaza moto positiva con nocturna >=diurna y moto 0/500', ()=>{
        expect(()=>
            assertValidTariffs({...base, motoDiurna:1000, motoNocturna:1000})
        ).toThrow(/RN-02/);
        expect(()=>
            assertValidTariffs({...base, motoDiurna: 0, motoNocturna:500}),

        ).toThrow(/RN-02/);
    });

    it('rechaza tarifas negativas', ()=>{
        expect(()=> assertValidTariffs({...base, carroDiurna: -1})).toThrow(BusinessValidationException,
        );

    });


});
