# Clataxis

[**Clataxis**](https://clataxis.vercel.app/) es una herramienta accesible desde cualquier navegador web pensada para facilitar el **análisis sintáctico** desde dispositivos como ordenadores o móviles.

## Para qué sirve
Su principal **foco** se encuentra en el **ámbito escolar**. Trata de ser fiel a la [NGLE](https://www.rae.es/gram%C3%A1tica/) y al [GTG](https://www.rae.es/gtg/), y cubre el análisis sintáctico **hasta** un nivel de **2º de Bachillerato**.   
Puedes **analizar oraciones** en su editor o **compartirlas** con su análisis mediante un enlace como [este](https://clataxis.vercel.app/?editor=O.+Simple%2F%28SN%2FSuj%28Det%22Mi%22N%22gato%22%29SV%2FPV%28N%22come%22SN%2FCD%28N%22pescado%22%29%29%29).
<!--TODO: Copiar análisis en forma de tabla para un google docs-->

## Funciones del editor y cómo usarlo
Después de escribir la frase que quieras analizar y hacer clic en "Comenzar" verás la oración que has escrito sin nada más. Para analizarla sintácticamente, haz clic y arrastra el ratón o tu dedo sobre las palabras. Al soltar se creará una caja bajo la cual podrás escribir su análisis.  

En el editor puedes:
- **Crear cajas**
- Escribir la ***categoría*** y ***función*** de una caja
- Añadir ***comentarios*** a una caja o a la oración
- **Editar** la **oración** conservando su análisis
- Eliminar cajas
- Cambiar el tamaño de una caja
- Intercambiar una caja con la de debajo
- Deshacer y rehacer cambios
- Utilizar el autocompletado para *categorías* y *funciones*

Clataxis reajusta la posición y altura de las cajas conforme editas para que se mantenga siempre una estructura limpia de ramificaciones desde abajo hasta la parte de arriba del análisis.

Utiliza el botón **?** que verás abajo a la derecha para abrir una pequeña guía de uso del editor.

## Editor de texto
Si abres el menú que se encuentra arriba a la izquierda podrás alternar entre distintos modos de edición.

El editor de texto te permite modificar el análisis de forma directa. Utiliza `Clalang`, un sistema de representación textual desarrollado específicamente para Clataxis.  
Resulta útil si necesitas compartir un análisis sintáctico en forma de texto plano. Puedes copiarlo todo y enviarlo donde necesites.

## Código
Esta aplicación está escrita en *HTML* y *TypeScript* puro.  
Si deseas colaborar o reportar un error, puedes encontrar el repositorio aquí:  
[**https://github.com/RodaballoXD/Clataxis**](https://github.com/RodaballoXD/Clataxis)  
Cualquier *pull request* es bienvenida :)
