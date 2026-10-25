function suggestion(value, fullName, description) {
    return { value, fullName, description };
}
export const GRAMMAR = {
    categories: [
        suggestion("sust", "Sustantivo o nombre", "Léxico y variable. Posee género y número propios. Designa seres, entidades o conceptos abstractos."),
        suggestion("pron", "Pronombre", "Gramatical y variable. Ejerce funciones del sustantivo. La NGLE lo restringe a personales, neutros e indefinidos puros."),
        suggestion("adj", "Adjetivo", "Léxico y variable. Modifica al sustantivo aportando características (calificativos) o delimitándolo (relacionales)."),
        suggestion("det", "Determinante", "Gramatical y variable. Introduce y concreta al sustantivo en el discurso, delimitando su alcance."),
        suggestion("verb", "Verbo", "Léxico y variable. Núcleo del sintagma verbal. Aporta flexión de tiempo, aspecto, modo, persona y número."),
        suggestion("adv", "Adverbio", "Invariable. Modifica a verbos, adjetivos u otros adverbios. Se divide en subclases léxicas y gramaticales."),
        suggestion("prep", "Preposición", "Gramatical e invariable. Introduce de forma obligatoria un complemento denominado término."),
        suggestion("conj", "Conjunción", "Gramatical e invariable. Conecta palabras, sintagmas u oraciones de manera coordinante o subordinante."),
        suggestion("interj", "Interjección", "Invariable. Forma enunciados exclamativos autónomos por sí misma para expresar impresiones o apelaciones."),
        suggestion("SN", "Sintagma nominal (Grupo nominal)", "Estructura sintáctica cuyo núcleo es un sustantivo, pronombre o palabra sustantivada."),
        suggestion("SV", "Sintagma verbal (Grupo verbal)", "Estructura sintáctica cuyo núcleo es un verbo. Constituye el predicado de la oración."),
        suggestion("SAdj", "Sintagma adjetival (Grupo adjetival)", "Estructura sintáctica cuyo núcleo es un adjetivo que modifica a un sustantivo."),
        suggestion("SAdv", "Sintagma adverbial (Grupo adverbial)", "Estructura sintáctica cuyo núcleo es un adverbio que modifica a un verbo, adjetivo u otro adverbio."),
        suggestion("SP", "Sintagma preposicional (Grupo preposicional)", "Estructura formada por una preposición (enlace) y su término obligatorio (normalmente un GN)."),
        suggestion("SConj", "Sintagma conjuntivo (Grupo conjuntivo)", "Estructura encabezada por una conjunción, habitualmente de carácter comparativo o consecutiva (ej. 'más que ayer')."),
        suggestion("SInterj", "Sintagma interjectivo (Grupo interjectivo)", "Estructura sintáctica cuyo núcleo es una interjección y que suele llevar complementos (ej. '¡ay de mí!')."),
        suggestion("loc. nom", "Locución nominal", "Grupo de palabras fijo que funciona sintáctica y semánticamente como un solo sustantivo (ej. 'fin de semana')."),
        suggestion("loc. adj", "Locución adjetiva", "Grupo de palabras fijo que funciona sintáctica y semánticamente como un solo adjetivo (ej. 'de armas tomar')."),
        suggestion("loc. verb", "Locución verbal", "Grupo de palabras fijo que funciona sintáctica y semánticamente como un solo verbo (ej. 'echar de menos')."),
        suggestion("loc. adv", "Locución adverbial", "Grupo de palabras fijo que funciona sintáctica y semánticamente como un solo adverbio (ej. 'a menudo')."),
        suggestion("loc. prep", "Locución preposicional", "Grupo de palabras fijo que funciona sintáctica y semánticamente como una sola preposición (ej. 'a través de')."),
        suggestion("loc. conj", "Locución conjuntiva", "Grupo de palabras fijo que funciona sintáctica y semánticamente como una sola conjunción (ej. 'ya que')."),
        suggestion("loc. interj", "Locución interjectiva", "Grupo de palabras fijo que funciona sintáctica y semánticamente como una sola interjección (ej. 'cómo no')."),
        suggestion("O", "Oración", "Unidad sintáctica que contiene un predicado verbal y, normalmente, un sujeto. Puede ser simple, compuesta o compleja."),
        suggestion("O. P", "Oración principal", "Oración que no depende jerárquicamente de otra y que puede contener oraciones subordinadas."),
        suggestion("O. Simple", "Oración simple", "Estructura que consta de un único predicado verbal y, por tanto, un solo núcleo de predicación."),
        suggestion("O. Compuesta", "Oración compuesta", "Estructura sintáctica formada por dos o más oraciones que se combinan mediante nexos o yuxtaposición."),
        suggestion("O. Compleja", "Oración compleja", "Estructura sintáctica formada por dos o más oraciones que se combinan mediante nexos subordinados."),
        suggestion("O. Coordinada", "Oración coordinada", "Unión de dos o más oraciones independientes mediante nexos coordinantes sin jerarquía entre ellas."),
        suggestion("O. Subordinada", "Oración subordinada", "Oración que depende jerárquicamente de otra principal y ejerce una función sintáctica dentro de ella."),
        suggestion("O. Sub. Sust", "Oración subordinada sustantiva", "Equivale a un sustantivo o grupo nominal y cumple funciones como sujeto, CD o término."),
        suggestion("O. Sub. de Rel", "Oración subordinada de relativo", "Modifica a un antecedente sustantivo de forma especificativa o explicativa (tradicionalmente adjetiva)."),
        suggestion("O. Sub. Rel. semilibre", "Oración subordinada de relativo semilibre", "Oración subordinada de relativo que carece de antecedente explícito. Tradicionalmente adjetiva sustantivada."),
        suggestion("O. Sub. Rel. libre", "Oración subordinada de relativo libre", "Oración subordinada de relativo que carece de antecedente explícito. Tradicionalmente adjetiva sustantivada."),
        suggestion("O. Sub. Adv", "Oración subordinada adverbial / circunstancial", "Aporta información contextual o de causa, condición, concesión o consecuencia (NGLE: construcciones de la predicación)."),
        suggestion("O. Yuxtapuesta", "Oración yuxtapuesta", "Oraciones unidas directamente de forma lógica sin la presencia de un nexo gramatical (separadas por signos de puntuación)."),
        suggestion("O. Sub. Adv. Temp", "Oración subordinada adverbial temporal", "Aporta información sobre el momento o el tiempo en el que se sitúa la acción principal (ej. Siempre que viene, trae un regalo)."),
        suggestion("O. Sub. Adv. Caus", "Oración subordinada adverbial causal", "Expresa el motivo, razón o causa del predicado principal (ej. Como no hubo acuerdo, se deshizo el trato)."),
        suggestion("O. Sub. Adv. Cond", "Oración subordinada adverbial condicional", "Plantea un requisito, condición o hipótesis para que se cumpla lo enunciado en la principal (ej. Si hubiera leído el contrato, no le habrían engañado)."),
        suggestion("O. Sub. Adv. Conces", "Oración subordinada adverbial concesiva", "Expresa una dificultad o impedimento que no evita la realización de la acción de la oración principal (ej. Aunque está nevando, no hace frío)."),
        suggestion("O. Sub. Adv. Consec", "Oración subordinada adverbial consecutiva", "Muestra la consecuencia derivada de la intensificación o cuantificación de un elemento en la principal (ej. Llovía tanto que se inundó la calle)."),
        suggestion("O. Sub. Adv. Ilat", "Oración subordinada adverbial ilativa", "Introduce una consecuencia o deducción lógica que se desprende de forma natural de la oración principal (ej. Está cansado, así que ha decidido irse de vacaciones)."),
        suggestion("O. Sub. Adv. Mod", "Oración subordinada adverbial modal / de modo", "Señala la manera o el modo en que se ejecuta la acción de la oración principal mediante nexos modales como 'según'."),
        suggestion("O. Sub. Adv. Comp", "Construcción / Oración subordinada comparativa", "Establece una relación de superioridad, inferioridad o igualdad entre dos magnitudes o nociones."),
        suggestion("O. Sub. Adv. Loc", "Oración subordinada adverbial locativa / de lugar", "Aporta información espacial sobre el lugar de la acción; el GTG y la NGLE la analizan hoy frecuentemente como relativa libre.")
    ],
    functions: [
        suggestion("N", "Núcleo", "Elemento de máxima jerarquía sintáctica que determina la naturaleza y propiedades de todo el sintagma."),
        suggestion("Mod", "Modificador", "Elemento que incide sobre el núcleo de un sintagma, no es obligatorio y se sitúa al inicio de este."),
        suggestion("Det", "Determinativo", "Introduce, presenta y delimita la extensión conceptual de un sustantivo dentro de su grupo."),
        suggestion("CN", "Complemento del nombre", "Modifica, restringe o califica el significado de un sustantivo dentro de un grupo nominal."),
        suggestion("CAdj", "Complemento del adjetivo", "Sintagma (normalmente preposicional) que complementa u operacionaliza el significado de un adjetivo."),
        suggestion("CAdv", "Complemento del adverbio", "Sintagma que complementa, limita o restringe el significado espacial, temporal o modal de un adverbio."),
        suggestion("T", "Término", "Elemento introducido obligatoriamente por una preposición que constituye el núcleo del grupo preposicional."),
        suggestion("Apos", "Aposición", "Sustantivo o grupo nominal que modifica directamente a otro sustantivo sin nexos o preposiciones."),
        suggestion("Suj", "Sujeto", "Establece una relación obligatoria de concordancia en persona y número con el núcleo del verbo."),
        suggestion("PV", "Predicado verbal", "Constituido por un verbo de significación plena (transitivo o intransitivo) que funciona como núcleo de la predicación."),
        suggestion("PN", "Predicado nominal", "Constituido por un verbo copulativo o pseudocopulativo (ser, estar, parecer) junto con un atributo obligatorio."),
        suggestion("MO", "Modificador oracional", "Elemento externo que afecta, evalúa o modaliza a toda la oración en su conjunto y no solo al verbo."),
        suggestion("NP", "Núcleo del predicado", "Verbo predicativo (con significado propio) que funciona como núcleo de un predicado verbal."),
        suggestion("Cóp", "Cópula", "Verbo copulativo o semicopulativo que funciona como núcleo de un predicado nominal. Sirve para unir al sujeto con un atributo."),
        suggestion("CD", "Complemento directo", "Complemento argumental exigido por verbos transitivos. Sustituible por lo, la, los, las."),
        suggestion("CI", "Complemento indirecto", "Designa al destinatario o beneficiario de la acción. Sustituible por le, les."),
        suggestion("CRég", "Complemento de régimen", "Complemento argumental encabezado por una preposición específica exigida por la semántica del verbo."),
        suggestion("Atrib", "Atributo", "Expresa cualidades o estados del sujeto a través de verbos copulativos (ser, estar, parecer)."),
        suggestion("CPvo", "Complemento predicativo", "Modifica de forma simultánea a un verbo y a un sustantivo (ya sea el sujeto o el complemento directo)."),
        suggestion("CAg", "Complemento agente", "Aparece en las oraciones pasivas perifrásticas introducido por la preposición 'por' para designar al ejecutor."),
        suggestion("CC", "Complemento circunstancial", "Modificador adjunto opcional que aporta información sobre el contexto (tiempo, lugar, modo, causa)."),
        suggestion("CCT", "Complemento circunstancial de tiempo", "Modificador adjunto que expresa el momento o la duración en que ocurre la acción. Responde a la pregunta ¿cuándo?"),
        suggestion("CCL", "Complemento circunstancial de lugar", "Modificador adjunto que indica la ubicación o el espacio en el que se desarrolla el proceso. Responde a la pregunta ¿dónde?"),
        suggestion("CCM", "Complemento circunstancial de manera o modo", "Modificador adjunto que señala la forma en que se realiza la acción verbal. Responde a la pregunta ¿cómo?"),
        suggestion("CCCant", "Complemento circunstancial de cantidad", "Modificador adjunto que expresa grado, cuantificación o magnitud de la acción o proceso. Responde a la pregunta ¿cuánto?"),
        suggestion("CCCausa", "Complemento circunstancial de causa", "Modificador adjunto que señala el motivo o la razón por la que ocurre el proceso verbal. Responde a la pregunta ¿por qué?"),
        suggestion("CCFin", "Complemento circunstancial de finalidad", "Modificador adjunto que introduce el propósito u objetivo de la acción verbal. Responde a la pregunta ¿para qué?"),
        suggestion("CCComp", "Complemento circunstancial de compañía", "Modificador adjunto que designa a la persona o entidad que acompaña al sujeto en la realización de la acción. Responde a ¿con quién?"),
        suggestion("CCInst", "Complemento circunstancial de instrumento", "Modificador adjunto que indica el objeto, herramienta o utensilio utilizado para llevar a cabo la acción. Responde a ¿con qué?"),
        suggestion("CCMed", "Complemento circunstancial de medio", "Modificador adjunto que designa el canal físico, soporte o vía empleado para transmitir o realizar la acción."),
        suggestion("CCProv", "Complemento circunstancial de provecho, beneficio o daño", "Modificador adjunto que expresa la entidad que recibe las consecuencias positivas o negativas de la acción."),
        suggestion("Nexo", "Nexo", "Palabra o grupo de palabras que conecta oraciones, sintagmas o palabras entre sí. Puede ser coordinante o subordinante."),
        suggestion("ÍPR", "Índice de pasiva refleja", "Morfema oracional que anula al sujeto agente. El verbo concuerda en plural o singular con el sujeto paciente."),
        suggestion("ÍImp", "Índice de impersonalidad", "Morfema que convierte la oración en impersonal. El verbo se fija exclusivamente en 3.ª persona singular."),
        suggestion("ÍIntrans", "Índice de intransitividad", "Morfema que convierte un verbo en intransitivo."),
        suggestion("Dat. Ético", "Dativo ético", "Pronombre personal átono que aporta expresividad y no es obligatorio en la oración.")
    ],
    guidedSyntagmas: [
        {
            value: 'SN',
            fullName: 'Sintagma nominal',
            description: 'Analiza un sintagma nominal.',
            steps: [
                { id: 'sn-nucleus', description: 'Encuentra el núcleo del sintagma.' },
                { id: 'sn-determiner', description: 'Busca el determinante.' },
                { id: 'sn-complement', description: 'Busca los complementos del nombre.' }
            ]
        },
        {
            value: 'SV',
            fullName: 'Sintagma verbal',
            description: 'Analiza un sintagma verbal.',
            steps: [
                { id: 'sv-nucleus', description: 'Encuentra el núcleo verbal.' },
                { id: 'sv-subject', description: 'Identifica el sujeto.' },
                { id: 'sv-complements', description: 'Busca los complementos verbales.' }
            ]
        },
        {
            value: 'SAdj',
            fullName: 'Sintagma adjetival',
            description: 'Analiza un sintagma adjetival.',
            steps: [
                { id: 'sadj-nucleus', description: 'Encuentra el núcleo del sintagma.' },
                { id: 'sadj-complement', description: 'Busca los complementos del adjetivo.' }
            ]
        }
    ],
    sentenceSteps: [
        { id: 'sentence-verb', description: 'Encuentra el verbo.' },
        { id: 'sentence-subject', description: 'Identifica el sujeto.' },
        { id: 'sentence-predicate', description: 'Identifica el predicado.' }
    ]
};
//# sourceMappingURL=placeholder-grammar.js.map