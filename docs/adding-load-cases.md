# Lägg till ett beräkningsfall

Webbsidan använder ett register i `load-cases.js`. Den ursprungliga VKR-vyn
är en adapter med `view: 'catalogue'`. Nya parametriska modeller använder
den gemensamma vyn i `case-ui.js`: indataformulär, diagram, resultat,
antaganden, validering och rapportknapp. Inga externa paket behövs.

1. Lägg en ren, validerande beräkningsfunktion i en egen modul eller i
   `calculations.js`. Använd N, mm och MPa internt. Funktionen ska kasta
   `RangeError` vid ogiltiga indata och inte ändra DOM eller indataobjekt.
2. Skapa en rapportfunktion som räknar om från de aktuella indata.
   Återanvänd `.calculation-report`, `.report-page` och MathML från de
   befintliga rapporterna. Håll isär antaganden och verifierade resultat.
3. Registrera fallet i `load-cases.js`, eller i en ny registreringsfil som
   läses **före `case-ui.js`** i `index.html`.
4. Lägg till numeriska referenstester samt browser-/rapporttester.

Minsta modulkontrakt för en parametrisk vy:

```js
LoadCases.register({
  id: 'my-case', // unikt stabilt id
  title: 'Mitt beräkningsfall',
  category: 'components', // 'components' = Komponenter, 'products' = Produkter
  description: 'Beskriv geometrin och den valda modellen.',
  fields: [
    { name: 'force', label: 'Kraft F', unit: 'N',
      default: 1000, min: 1, max: 1000000 }
  ],
  assumptions: ['Skriv verkliga modellförutsättningar här.'],
  calculate: MyModel.calculate,
  diagram: input => MyDiagram.render(input),
  renderResults: (result, input) => MyResult.render(result, input),
  renderReport: ({ input, reference }) => MyReport.render(input, reference)
});
```

För valfält används `type: 'select'` och
`options: [{ value: 'key', label: 'Beskrivning' }]`.

Beräkningsfallsväljaren har två kategorier. L-/C-delar och enkla balkfall
använder `category: 'components'`. Kompletta lyftok, H-ok, ramok och
spridarok använder `category: 'products'`. Fall utan kategori placeras
under Komponenter. Kategoriindelningen påverkar inte beräkningen eller rapporten.
HTML från diagram-, resultat- och rapportfunktioner betraktas som betrodd
programkod; escape:a alltid användartext, exempelvis rapportreferenser.

`case-ui.js` bevarar respektive falls indata när användaren växlar och
blockerar rapporten vid ogiltiga data. Numeriska resultat, tillämplighet
och rapportens slutsatser är den enskilda modellens ansvar. Registrera
alltid modellens gränser och undvik generiska ”godkänd”-påståenden när
endast en delkontroll har utförts.

## Tabellprofiler i den gemensamma vyn

Ett parametriskt fall kan sätta `profileSelection: true`. Dess `calculate` ska då returnera `rows` (beräknade tabellprofiler) och `chosen` (rekommenderad profil eller null). Raderna behöver `name`, `W` i mm³, `mass` i kg/m och `utilization`. Den generiska vyn bygger jämförelsetabell, radioval och exportspärr tills en profil valts. Rapportfunktionen får även `profileName`. Se `asymmetric-beam-case.js` för en komplett adapter. Profilval och tabellens visningsläge bevaras per beräkningsfall.
