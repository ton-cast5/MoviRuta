/** Filtrado instantáneo de listas: <input data-filtro="#contenedor"> sobre elementos con data-texto. */
document.querySelectorAll('[data-filtro]').forEach((input) => {
    const contenedor = document.querySelector(input.dataset.filtro);
    const vacio = document.getElementById('sinCoincidencias');
    if (!contenedor) return;
    const normalizar = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    input.addEventListener('input', () => {
        const termino = normalizar(input.value.trim());
        let visibles = 0;
        contenedor.querySelectorAll('[data-texto]').forEach((el) => {
            const coincide = !termino || normalizar(el.dataset.texto).includes(termino);
            el.classList.toggle('d-none', !coincide);
            if (coincide) visibles++;
        });
        if (vacio) vacio.classList.toggle('d-none', visibles > 0);
    });
});
