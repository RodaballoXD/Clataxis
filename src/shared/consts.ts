import { ReducedJSON } from "../editor/tree";

export const exampleSentence = "El gato come pescado";

export const longReducedJSON: ReducedJSON = [
    {
        fun: null,
        cat: "O. Simple",
        cont: [
            {
                fun: "Suj",
                cat: "SN",
                cont: [
                    {
                        fun: null,
                        cat: "Det",
                        cont: [{ cont: "El" }]
                    },
                    {
                        fun: "N",
                        cat: "N",
                        cont: [{ cont: "profesor" }]
                    }
                ]
            },
            {
                fun: "PV",
                cat: "SV",
                cont: [
                    {
                        fun: "N",
                        cat: "V",
                        cont: [{ cont: "explicó" }]
                    },
                    {
                        fun: "CD",
                        cat: "SN",
                        cont: [
                            {
                                fun: null,
                                cat: "Det",
                                cont: [{ cont: "la" }]
                            },
                            {
                                fun: "N",
                                cat: "N",
                                cont: [{ cont: "lección" }]
                            }
                        ]
                    },
                    {
                        fun: "CI",
                        cat: "SP",
                        cont: [
                            {
                                fun: "E",
                                cat: "Prep",
                                cont: [{ cont: "a" }]
                            },
                            {
                                fun: "T",
                                cat: "SN",
                                cont: [
                                    {
                                        fun: null,
                                        cat: "Det",
                                        cont: [{ cont: "los" }]
                                    },
                                    {
                                        fun: "N",
                                        cat: "N",
                                        cont: [{ cont: "alumnos" }]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        fun: null,
        cat: "O. Simple",
        cont: [
            {
                fun: "Suj",
                cat: "SN",
                cont: [
                    {
                        fun: null,
                        cat: "Det",
                        cont: [{ cont: "Mi" }]
                    },
                    {
                        fun: "N",
                        cat: "N",
                        cont: [{ cont: "hermana" }]
                    },
                    {
                        fun: "CN",
                        cat: "SAdj",
                        cont: [
                            {
                                fun: "N",
                                cat: "Adj",
                                cont: [{ cont: "pequeña" }]
                            }
                        ]
                    }
                ]
            },
            {
                fun: "PV",
                cat: "SV",
                cont: [
                    {
                        fun: "N",
                        cat: "V",
                        cont: [{ cont: "lee" }]
                    },
                    {
                        fun: "CD",
                        cat: "SN",
                        cont: [
                            {
                                fun: null,
                                cat: "Det",
                                cont: [{ cont: "un" }]
                            },
                            {
                                fun: "N",
                                cat: "N",
                                cont: [{ cont: "libro" }]
                            },
                            {
                                fun: "CN",
                                cat: "SP",
                                cont: [
                                    {
                                        fun: "E",
                                        cat: "Prep",
                                        cont: [{ cont: "de" }]
                                    },
                                    {
                                        fun: "T",
                                        cat: "SN",
                                        cont: [
                                            {
                                                fun: "N",
                                                cat: "N",
                                                cont: [{ cont: "aventuras" }]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        fun: "CCL",
                        cat: "SP",
                        cont: [
                            {
                                fun: "E",
                                cat: "Prep",
                                cont: [{ cont: "en" }]
                            },
                            {
                                fun: "T",
                                cat: "SN",
                                cont: [
                                    {
                                        fun: null,
                                        cat: "Det",
                                        cont: [{ cont: "el" }]
                                    },
                                    {
                                        fun: "N",
                                        cat: "N",
                                        cont: [{ cont: "jardín" }]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        fun: null,
        cat: "O. Simple",
        cont: [
            {
                fun: "Suj",
                cat: "SN",
                cont: [
                    {
                        fun: "N",
                        cat: "Pron",
                        cont: [{ cont: "Nosotros" }]
                    }
                ]
            },
            {
                fun: "PV",
                cat: "SV",
                cont: [
                    {
                        fun: "N",
                        cat: "V",
                        cont: [{ cont: "preparamos" }]
                    },
                    {
                        fun: "CD",
                        cat: "SN",
                        cont: [
                            {
                                fun: null,
                                cat: "Det",
                                cont: [{ cont: "una" }]
                            },
                            {
                                fun: "N",
                                cat: "N",
                                cont: [{ cont: "cena" }]
                            },
                            {
                                fun: "CN",
                                cat: "SAdj",
                                cont: [
                                    {
                                        fun: "N",
                                        cat: "Adj",
                                        cont: [{ cont: "especial" }]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        fun: "CCF",
                        cat: "SP",
                        cont: [
                            {
                                fun: "E",
                                cat: "Prep",
                                cont: [{ cont: "para" }]
                            },
                            {
                                fun: "T",
                                cat: "SN",
                                cont: [
                                    {
                                        fun: null,
                                        cat: "Det",
                                        cont: [{ cont: "nuestros" }]
                                    },
                                    {
                                        fun: "N",
                                        cat: "N",
                                        cont: [{ cont: "amigos" }]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        fun: "CCT",
                        cat: "SAdv",
                        cont: [
                            {
                                fun: "N",
                                cat: "Adv",
                                cont: [{ cont: "mañana" }]
                            }
                        ]
                    }
                ]
            }
        ]
    }
];