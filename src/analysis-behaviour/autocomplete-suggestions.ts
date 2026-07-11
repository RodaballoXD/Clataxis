export const AUTOCOMPLETE_SUGGESTIONS: Record<AutocompleteField, AutocompleteSuggestion[]> = {
    category: [
        suggestion("sust", "Sustantivo o nombre", "Léxico y variable. Posee género y número propios. Designa seres, entidades o conceptos abstractos."),
        suggestion("adj", "Adjetivo", "Léxico y variable. Modifica al sustantivo aportando características (calificativos) o delimitándolo (relacionales)."),
        suggestion("det", "Determinante", "Gramatical y variable. Introduce y concreta al sustantivo en el discurso, delimitando su alcance."),
        suggestion("pron", "Pronombre", "Gramatical y variable. Ejerce funciones del sustantivo. La NGLE lo restringe a personales, neutros e indefinidos puros."),
        suggestion("verb", "Verbo", "Léxico y variable. Núcleo del sintagma verbal. Aporta flexión de tiempo, aspecto, modo, persona y número."),
        suggestion("adv", "Adverbio", "Invariable. Modifica a verbos, adjetivos u otros adverbios. Se divide en subclases léxicas y gramaticales."),
        suggestion("prep", "Preposición", "Gramatical e invariable. Introduce de forma obligatoria un complemento denominado término."),
        suggestion("conj", "Conjunción", "Gramatical e invariable. Conecta palabras, sintagmas u oraciones de manera coordinante o subordinante."),
        suggestion("interj", "Interjección", "Invariable. Forma enunciados exclamativos autónomos por sí misma para expresar impresiones o apelaciones."),

        suggestion("SN", "Sintagma nominal (Grupo nominal)", "Estructura sintáctica cuyo núcleo es un sustantivo, pronombre o palabra sustantivada."),
        suggestion("SV", "Sintagma verbal (Grupo verbal)", "Estructura sintáctica cuyo núcleo es un verbo. Constituye el predicado de la oración."),
        suggestion("SAdj", "Sintagma adjetival (Grupo adjetival)", "Estructura sintáctica cuyo núcleo es un adjetivo que modifica a un sustantivo."),
        suggestion("SAdv", "Sintagma adverbial (Grupo adverbial)", "Estructura sintáctica cuyo núcleo es un adverbio que modifica a un verbo, adjetivo u otro adverbio."),
        suggestion("SPrep", "Sintagma preposicional (Grupo preposicional)", "Estructura formada por una preposición (enlace) y su término obligatorio (normalmente un GN)."),
        suggestion("SInterj", "Sintagma interjectivo (Grupo interjectivo)", "Estructura sintáctica cuyo núcleo es una interjección y que suele llevar complementos (ej. '¡ay de mí!')."),
        suggestion("SConj", "Sintagma conjuntivo (Grupo conjuntivo)", "Estructura encabezada por una conjunción, habitualmente de carácter comparativo o consecutiva (ej. 'más que ayer')."),

        suggestion("loc. nom", "Locución nominal", "Grupo de palabras fijo que funciona sintáctica y semánticamente como un solo sustantivo (ej. 'fin de semana')."),
        suggestion("loc. adj", "Locución adjetiva", "Grupo de palabras fijo que funciona sintáctica y semánticamente como un solo adjetivo (ej. 'de armas tomar')."),
        suggestion("loc. verb", "Locución verbal", "Grupo de palabras fijo que funciona sintáctica y semánticamente como un solo verbo (ej. 'echar de menos')."),
        suggestion("loc. adv", "Locución adverbial", "Grupo de palabras fijo que funciona sintáctica y semánticamente como un solo adverbio (ej. 'a menudo')."),
        suggestion("loc. prep", "Locución preposicional", "Grupo de palabras fijo que funciona sintáctica y semánticamente como una sola preposición (ej. 'a través de')."),
        suggestion("loc. conj", "Locución conjuntiva", "Grupo de palabras fijo que funciona sintáctica y semánticamente como una sola conjunción (ej. 'ya que')."),

        suggestion("art", "Artículo (Clase transversal)", "Gramatical y variable. Identifica al sustantivo como conocido (definido) o nuevo (indefinido)."),
        suggestion("dem", "Demostrativo (Clase transversal)", "Gramatical y variable/invariable. Sitúa los elementos de forma deíctica en el espacio o el tiempo."),
        suggestion("pos", "Posesivo (Clase transversal)", "Gramatical y variable. Expresa la pertenencia, posesión o relación íntima con una persona gramatical."),
        suggestion("cuant", "Cuantificador (Clase transversal)", "Gramatical. Expresa cantidad, grado o número. Se divide en numerales e indefinidos o no numerales."),
        suggestion("rel", "Relativo (Clase transversal)", "Gramatical. Vincula una oración subordinada con un elemento previo llamado antecedente."),
        suggestion("interrog", "Interrogativo (Clase transversal)", "Gramatical. Introduce de forma directa o indirecta enunciados con carácter de pregunta."),
        suggestion("exclam", "Exclamativo (Clase transversal)", "Gramatical. Introduce enunciados de carácter ponderativo, valorativo o expresivo."),

        suggestion("or. simple", "Oración simple", "Estructura que consta de un único predicado verbal y, por tanto, un solo núcleo de predicación."),
        suggestion("or. compuesta", "Oración compuesta", "Estructura sintáctica formada por dos o más oraciones que se combinan mediante nexos o yuxtaposición."),
        suggestion("or. coord", "Oración coordinada", "Unión de dos o más oraciones independientes mediante nexos coordinantes sin jerarquía entre ellas."),
        suggestion("or. sub", "Oración subordinada", "Oración que depende jerárquicamente de otra principal y ejerce una función sintáctica dentro de ella."),
        suggestion("or. sub. sust", "Oración subordinada sustantiva", "Equivale a un sustantivo o grupo nominal y cumple funciones como sujeto, CD o término."),
        suggestion("or. sub. rel", "Oración subordinada de relativo", "Modifica a un antecedente sustantivo de forma especificativa o explicativa (tradicionalmente adjetiva)."),
        suggestion("or. sub. adv", "Oración subordinada adverbial / circunstancial", "Aporta información contextual o de causa, condición, concesión o consecuencia (NGLE: construcciones de la predicación)."),
        suggestion("or. yuxt", "Oración yuxtapuesta", "Oraciones unidas directamente de forma lógica sin la presencia de un nexo gramatical (separadas por signos de puntuación).")
    ],
    function: [
        suggestion("Suj", "Sujeto", "Establece una relación obligatoria de concordancia en persona y número con el núcleo del verbo."),
        suggestion("PV", "Predicado verbal", "Constituido por un verbo de significación plena (transitivo o intransitivo) que funciona como núcleo de la predicación."),
        suggestion("PN", "Predicado nominal", "Constituido por un verbo copulativo o pseudocopulativo (ser, estar, parecer) junto con un atributo obligatorio."),

        suggestion("CD", "Complemento directo", "Complemento argumental exigido por verbos transitivos. Sustituible por lo, la, los, las."),
        suggestion("CI", "Complemento indirecto", "Designa al destinatario o beneficiario de la acción. Sustituible por le, les."),
        suggestion("CRég", "Complemento de régimen", "Complemento argumental encabezado por una preposición específica exigida por la semántica del verbo."),
        suggestion("Atrib", "Atributo", "Expresa cualidades o estados del sujeto a través de verbos copulativos (ser, estar, parecer)."),
        suggestion("CPred", "Complemento predicativo", "Modifica de forma simultánea a un verbo y a un sustantivo (ya sea el sujeto o el complemento directo)."),
        suggestion("CAg", "Complemento agente", "Aparece en las oraciones pasivas perifrásticas introducido por la preposición 'por' para designar al ejecutor."),
        suggestion("CC", "Complemento circunstancial", "Modificador adjunto opcional que aporta información sobre el contexto (tiempo, lugar, modo, causa)."),
        suggestion("ModPerif", "Modificador periférico", "Elemento externo que afecta, evalúa o modaliza a toda la oración en su conjunto y no solo al verbo."),

        suggestion("N", "Núcleo", "Elemento de máxima jerarquía sintáctica que determina la naturaleza y propiedades de todo el sintagma."),
        suggestion("Det", "Determinativo", "Introduce, presenta y delimita la extensión conceptual de un sustantivo dentro de su grupo."),
        suggestion("CN", "Complemento del nombre", "Modifica, restringe o califica el significado de un sustantivo dentro de un grupo nominal."),
        suggestion("CAdj", "Complemento del adjetivo", "Sintagma (normalmente preposicional) que complementa u operacionaliza el significado de un adjetivo."),
        suggestion("CAdv", "Complemento del adverbio", "Sintagma que complementa, limita o restringe el significado espacial, temporal o modal de un adverbio."),
        suggestion("Térm", "Término", "Elemento introducido obligatoriamente por una preposición que constituye el núcleo del grupo preposicional."),
        suggestion("Apos", "Aposición", "Sustantivo o grupo nominal que modifica directamente a otro sustantivo sin nexos o preposiciones."),

        suggestion("ÍPR", "Índice de pasiva refleja", "Morfema oracional que anula al sujeto agente. El verbo concuerda en plural o singular con el sujeto paciente."),
        suggestion("ÍImp", "Índice de impersonalidad", "Morfema que bloquea la aparición de un sujeto sintáctico. El verbo se fija exclusivamente en 3.ª persona singular."),
        suggestion("MProm", "Morfema pronominal", "Componente obligatorio o alternativo que forma parte intrínseca de la estructura de los verbos pronominales."),
        suggestion("DAspec", "Dativo aspectual", "Pronombre reflexivo de valor expresivo o expletivo que enfatiza la totalidad de la acción o el interés del sujeto."),
        suggestion("FalsSe", "Falso 'se' (Variante de le/les)", "Pronombre personal de tercera persona sustituto de 'le' o 'les' por cacofonía cuando precede a 'lo, la, los, las'.")
    ]
};

export type AutocompleteField = 'category' | 'function';

export type AutocompleteSuggestion = {
    value: string;
    fullName: string;
    description: string;
};


function suggestion(value: string, fullName: string, description: string): AutocompleteSuggestion {
    return { value, fullName, description };
}